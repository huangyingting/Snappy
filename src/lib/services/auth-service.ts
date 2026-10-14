import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, signSessionToken } from "@/lib/auth";
import { serializeRegions, type RoleCode } from "@/lib/constants";

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "org"}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface EnrollCorporateInput {
  name: string;
  email: string;
  password: string;
  jobTitle?: string;
  companyName: string;
  domain?: string;
  industry?: string;
  sizeBand?: string;
  primaryRegion?: string;
  brandColor?: string;
  hideRecipientAddress?: boolean;
  initialDepositCents?: number;
}

export async function enrollCorporate(input: EnrollCorporateInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const depositCents =
    typeof input.initialDepositCents === "number" && input.initialDepositCents >= 0
      ? Math.round(input.initialDepositCents)
      : 250000; // Default $2,500 starter credit

  const domain =
    input.domain?.trim() ||
    (email.includes("@") ? email.split("@")[1] : "company.com");

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.companyName.trim(),
        slug: slugify(input.companyName),
        domain,
        industry: input.industry?.trim() || "Technology",
        sizeBand: input.sizeBand?.trim() || "201-1000",
        primaryRegion: input.primaryRegion?.trim().toUpperCase() || "NA",
        brandColor: input.brandColor?.trim() || "#4F46E5",
        walletBalanceCents: depositCents,
        escrowBalanceCents: 0,
        hideRecipientAddress: input.hideRecipientAddress ?? true,
      },
    });

    if (depositCents > 0) {
      await tx.walletTransaction.create({
        data: {
          companyId: company.id,
          type: "DEPOSIT",
          amountCents: depositCents,
          balanceAfter: depositCents,
          escrowAfter: 0,
          note: "Initial Corporate Workspace Onboarding Deposit",
          referenceId: `ONBOARD-${company.slug.toUpperCase()}`,
        },
      });
    }

    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashPassword(input.password),
        name: input.name.trim(),
        role: "CORPORATE",
        jobTitle: input.jobTitle?.trim() || "Gifting Program Admin",
        preferredRegion: company.primaryRegion,
        companyId: company.id,
      },
      include: { company: true, vendor: true },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: "CORPORATE",
        action: "CORPORATE_ENROLLED",
        entityType: "Company",
        entityId: company.id,
        metadataJson: JSON.stringify({
          companyName: company.name,
          primaryRegion: company.primaryRegion,
          initialDepositCents: depositCents,
        }),
      },
    });

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: "CORPORATE",
      companyId: company.id,
      vendorId: null,
    });

    return { user, company, token, redirectTo: "/corporate" };
  });
}

export interface EnrollVendorInput {
  name: string;
  email: string;
  password: string;
  jobTitle?: string;
  businessName: string;
  taxId: string;
  hqCountry: string;
  supportedRegions: string[];
  slaDays?: number;
  requireReview?: boolean;
}

export async function enrollVendor(input: EnrollVendorInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const regionsCsv = serializeRegions(input.supportedRegions);
  const status = input.requireReview ? "PENDING" : "APPROVED";

  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        businessName: input.businessName.trim(),
        slug: slugify(input.businessName),
        taxId: input.taxId.trim(),
        status,
        hqCountry: input.hqCountry.trim().toUpperCase() || "US",
        supportedRegions: regionsCsv,
        commissionRateBps: 1500,
        slaDays: input.slaDays && input.slaDays > 0 ? Math.min(input.slaDays, 14) : 3,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashPassword(input.password),
        name: input.name.trim(),
        role: "VENDOR",
        jobTitle: input.jobTitle?.trim() || "Partner Fulfillment Lead",
        preferredRegion: regionsCsv.split(",")[0] || "NA",
        vendorId: vendor.id,
      },
      include: { company: true, vendor: true },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: "VENDOR",
        action: "VENDOR_ENROLLED",
        entityType: "Vendor",
        entityId: vendor.id,
        metadataJson: JSON.stringify({
          businessName: vendor.businessName,
          supportedRegions: vendor.supportedRegions,
          status: vendor.status,
        }),
      },
    });

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: "VENDOR",
      companyId: null,
      vendorId: vendor.id,
    });

    return { user, vendor, token, redirectTo: "/vendor" };
  });
}

export interface EnrollRecipientInput {
  name: string;
  email: string;
  password: string;
  preferredRegion?: string;
  defaultAddressLine1?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultPostalCode?: string;
  defaultCountry?: string;
}

export async function enrollRecipient(input: EnrollRecipientInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashPassword(input.password),
        name: input.name.trim(),
        role: "RECIPIENT",
        preferredRegion: input.preferredRegion?.trim().toUpperCase() || "NA",
        defaultAddressLine1: input.defaultAddressLine1?.trim() || "",
        defaultCity: input.defaultCity?.trim() || "",
        defaultState: input.defaultState?.trim() || "",
        defaultPostalCode: input.defaultPostalCode?.trim() || "",
        defaultCountry: input.defaultCountry?.trim() || "US",
      },
      include: { company: true, vendor: true },
    });

    // Link any previously sent gifts addressed to this email
    await tx.giftSend.updateMany({
      where: { recipientEmail: email, recipientUserId: null },
      data: { recipientUserId: user.id },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: "RECIPIENT",
        action: "RECIPIENT_ENROLLED",
        entityType: "User",
        entityId: user.id,
        metadataJson: JSON.stringify({ preferredRegion: user.preferredRegion }),
      },
    });

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: "RECIPIENT",
      companyId: null,
      vendorId: null,
    });

    return { user, token, redirectTo: "/recipient" };
  });
}

export async function authenticateUser(emailInput: string, passwordInput: string, expectedRole?: RoleCode) {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true, vendor: true },
  });

  if (!user || !verifyPassword(passwordInput, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  if (expectedRole && user.role !== expectedRole) {
    throw new Error(`This account is registered as ${user.role}, not ${expectedRole}.`);
  }

  const role = user.role as RoleCode;
  const token = signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role,
    companyId: user.companyId,
    vendorId: user.vendorId,
  });

  const redirectMap: Record<RoleCode, string> = {
    CORPORATE: "/corporate",
    VENDOR: "/vendor",
    RECIPIENT: "/recipient",
    ADMIN: "/admin",
  };

  return { user, token, redirectTo: redirectMap[role] || "/" };
}

export async function switchDemoPersona(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true, vendor: true },
  });

  if (!user) {
    throw new Error(`Demo persona ${email} not found.`);
  }

  const role = user.role as RoleCode;
  const token = signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role,
    companyId: user.companyId,
    vendorId: user.vendorId,
  });

  const redirectMap: Record<RoleCode, string> = {
    CORPORATE: "/corporate",
    VENDOR: "/vendor",
    RECIPIENT: "/recipient",
    ADMIN: "/admin",
  };

  return { user, token, redirectTo: redirectMap[role] || "/" };
}

export async function lookupClaimByCode(codeOrToken: string, email?: string) {
  const cleaned = codeOrToken.trim();
  if (!cleaned) {
    throw new Error("Please enter a valid Snappy claim code or token.");
  }

  const giftSend = await prisma.giftSend.findFirst({
    where: {
      OR: [
        { claimCode: cleaned.toUpperCase() },
        { claimToken: cleaned },
      ],
    },
    include: {
      company: true,
      campaign: true,
    },
  });

  if (!giftSend) {
    throw new Error("No gift found matching that claim code.");
  }

  if (email && email.trim()) {
    if (giftSend.recipientEmail.toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error("The email provided does not match the recipient for this claim code.");
    }
  }

  return {
    claimToken: giftSend.claimToken,
    claimCode: giftSend.claimCode,
    recipientName: giftSend.recipientName,
    companyName: giftSend.company.name,
    redirectTo: `/claim/${giftSend.claimToken}`,
  };
}
