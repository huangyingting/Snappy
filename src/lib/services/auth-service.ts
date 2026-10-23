import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { appUrl, queueEmail } from "@/lib/email";
import type { RoleCode } from "@/lib/constants";
import { transaction, type TransactionClient } from "@/lib/transaction";

const region = z.enum(["NA", "EMEA", "APAC", "LATAM"]);
const identity = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(12, "Use at least 12 characters for your password.").max(128),
});
const corporateSchema = identity.extend({
  companyName: z.string().trim().min(1).max(150),
  industry: z.string().trim().max(100).default(""),
  sizeBand: z.string().max(30).default("1-50"),
  primaryRegion: region.default("NA"),
  brandColor: z.string().regex(/^#[a-fA-F0-9]{6}$/).default("#4F46E5"),
  hideRecipientAddress: z.boolean().default(true),
});
const vendorSchema = identity.extend({
  businessName: z.string().trim().min(1).max(150),
  taxId: z.string().trim().min(1).max(100),
  hqCountry: z.string().regex(/^[A-Z]{2}$/),
  supportedRegions: z.array(region).min(1).max(4),
  slaDays: z.number().int().min(1).max(14).default(3),
});
const recipientSchema = identity.extend({
  preferredRegion: region.default("NA"),
});

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function verificationEmail(tx: TransactionClient, user: { id: string; email: string }, purpose: "verify" | "reset") {
  const token = randomBytes(32).toString("base64url");
  await tx.authToken.deleteMany({ where: { userId: user.id, purpose } });
  await tx.authToken.create({
    data: {
      tokenHash: tokenHash(token),
      userId: user.id,
      purpose,
      expiresAt: new Date(Date.now() + (purpose === "verify" ? 24 : 1) * 60 * 60 * 1000),
    },
  });
  const action = purpose === "verify" ? "Verify your email" : "Reset your password";
  await queueEmail(tx, user.email, `${action} — Snappy`, `${action}:\n${appUrl()}/auth/${purpose}?token=${token}\n\nIf you did not request this, ignore this email.`);
}

async function checkNewAccount(email: string) {
  await rateLimit(`enroll:${email}`, 5);
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new AppError("An account already exists. Sign in or reset your password.", 409);
  }
}

export async function enrollCorporate(raw: unknown) {
  const input = corporateSchema.parse(raw);
  await checkNewAccount(input.email);
  const passwordHash = await hashPassword(input.password);
  return transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.companyName,
        slug: randomUUID(),
        domain: input.email.split("@")[1],
        industry: input.industry,
        sizeBand: input.sizeBand,
        primaryRegion: input.primaryRegion,
        brandColor: input.brandColor,
        hideRecipientAddress: input.hideRecipientAddress,
      },
    });
    const user = await tx.user.create({
      data: {
        name: input.name, email: input.email, passwordHash, role: "CORPORATE",
        companyId: company.id, preferredRegion: input.primaryRegion,
      },
      omit: { passwordHash: true },
    });
    await verificationEmail(tx, user, "verify");
    await tx.auditLog.create({
      data: { actorUserId: user.id, actorRole: user.role, action: "CORPORATE_ENROLLED", entityType: "Company", entityId: company.id },
    });
    return { user, company, redirectTo: "/auth/corporate", verificationRequired: true };
  });
}

export async function enrollVendor(raw: unknown) {
  const input = vendorSchema.parse(raw);
  await checkNewAccount(input.email);
  const passwordHash = await hashPassword(input.password);
  return transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        businessName: input.businessName, slug: randomUUID(), taxId: input.taxId,
        hqCountry: input.hqCountry, supportedRegions: [...new Set(input.supportedRegions)].join(","),
        slaDays: input.slaDays, status: "PENDING",
      },
    });
    const user = await tx.user.create({
      data: {
        name: input.name, email: input.email, passwordHash, role: "VENDOR",
        vendorId: vendor.id, preferredRegion: input.supportedRegions[0],
      },
      omit: { passwordHash: true },
    });
    await verificationEmail(tx, user, "verify");
    await tx.auditLog.create({
      data: { actorUserId: user.id, actorRole: user.role, action: "VENDOR_ENROLLED", entityType: "Vendor", entityId: vendor.id },
    });
    return { user, vendor, redirectTo: "/auth/vendor", verificationRequired: true };
  });
}

export async function enrollRecipient(raw: unknown) {
  const input = recipientSchema.parse(raw);
  await checkNewAccount(input.email);
  const passwordHash = await hashPassword(input.password);
  return transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: "RECIPIENT", preferredRegion: input.preferredRegion },
      omit: { passwordHash: true },
    });
    await verificationEmail(tx, user, "verify");
    return { user, redirectTo: "/auth/recipient", verificationRequired: true };
  });
}

export async function authenticateUser(emailInput: string, password: string, expectedRole: RoleCode) {
  const email = emailInput.trim().toLowerCase();
  await rateLimit(`login:${email}`, 10);
  const user = await prisma.user.findUnique({ where: { email } });
  // A fixed dummy hash keeps unknown users on the same password derivation path.
  const dummy = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
  const valid = await verifyPassword(password, user?.passwordHash || dummy);
  if (!user || !valid || user.role !== expectedRole || !user.emailVerified) return null;
  return {
    id: user.id, email: user.email, name: user.name,
    role: user.role, sessionVersion: user.sessionVersion,
  };
}

export async function requestAccountEmail(emailInput: unknown, purpose: "verify" | "reset") {
  const email = z.string().trim().email().max(254).parse(emailInput).toLowerCase();
  await rateLimit(`account-email:${email}`, 3);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && (purpose === "reset" || !user.emailVerified)) {
    await transaction((tx) => verificationEmail(tx, user, purpose));
  }
}

export async function consumeAccountToken(rawToken: unknown, purpose: "verify" | "reset", password?: unknown) {
  const token = z.string().min(40).max(100).parse(rawToken);
  const passwordHash = purpose === "reset" ? await hashPassword(identity.shape.password.parse(password)) : undefined;
  return transaction(async (tx) => {
    const record = await tx.authToken.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!record || record.purpose !== purpose || record.expiresAt < new Date()) {
      throw new AppError("This link is invalid or expired. Request a new one.");
    }
    const deleted = await tx.authToken.deleteMany({ where: { tokenHash: record.tokenHash } });
    if (!deleted.count) throw new AppError("This link has already been used.");
    const user = await tx.user.update({
      where: { id: record.userId },
      data: purpose === "verify" ? { emailVerified: new Date() } : { passwordHash, sessionVersion: { increment: 1 } },
      omit: { passwordHash: true },
    });
    if (purpose === "verify" && user.role === "RECIPIENT") {
      await tx.giftSend.updateMany({
        where: { recipientEmail: user.email, recipientUserId: null },
        data: { recipientUserId: user.id },
      });
      await tx.recipientAddress.updateMany({
        where: { recipientEmail: user.email, userId: null },
        data: { userId: user.id },
      });
    }
    return { redirectTo: `/auth/${user.role.toLowerCase()}` };
  });
}

export async function lookupClaimByCode(codeInput: unknown, emailInput: unknown) {
  const code = z.string().trim().min(1).max(100).parse(codeInput);
  const email = z.string().trim().email("Enter the email address on your invitation.").max(254).parse(emailInput).toLowerCase();
  await rateLimit(`claim:${email}`, 10);
  const gift = await prisma.giftSend.findFirst({
    where: { recipientEmail: email, OR: [{ claimCode: code.toUpperCase() }, { claimToken: code }] },
    select: { claimToken: true },
  });
  if (!gift) throw new AppError("No gift matches that code and recipient email.", 404);
  return { redirectTo: `/claim/${gift.claimToken}` };
}
