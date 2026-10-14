import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { RoleCode } from "./constants";

export const SESSION_COOKIE_NAME = "snappy_session";

function getSecret(): string {
  return process.env.AUTH_SECRET || "snappy-super-secret-signing-key-2026-production-ready";
}

export function hashPassword(password: string): string {
  const salt = "snappy_salt_v1";
  const derived = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
  return `pbkdf2_v1$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const computed = hashPassword(password);
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: RoleCode;
  companyId?: string | null;
  vendorId?: string | null;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionPayload, "exp">, ttlSeconds = 60 * 60 * 24 * 7): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!valid) return null;
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUserWithContext() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      company: true,
      vendor: true,
    },
  });
  return user;
}

export function generateClaimToken(): string {
  return `snappy_${crypto.randomBytes(12).toString("hex")}`;
}

export function generateClaimCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `SNPY-${code}`;
}
