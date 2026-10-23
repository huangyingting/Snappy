import { randomBytes } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { prisma } from "./prisma";
import type { RoleCode } from "./constants";

export async function getSessionFromCookies() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.emailVerified || user.sessionVersion !== session.user.sessionVersion || !isRole(user.role)) {
    return null;
  }
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    vendorId: user.vendorId,
  };
}

export function isRole(value: string): value is RoleCode {
  return ["ADMIN", "CORPORATE", "VENDOR", "RECIPIENT"].includes(value);
}

export async function getCurrentUserWithContext() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    include: { company: true, vendor: true },
    omit: { passwordHash: true },
  });
}

export function generateClaimToken() {
  return randomBytes(32).toString("base64url");
}

export function generateClaimCode() {
  return `SNPY-${randomBytes(12).toString("hex").toUpperCase()}`;
}
