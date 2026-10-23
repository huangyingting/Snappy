import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { AppError } from "./errors";

export async function rateLimit(identifier: string, max: number, seconds = 900) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = createHash("sha256").update(`${identifier}:${bucket}`).digest("hex");
  const entry = await prisma.rateLimit.upsert({
    where: { key },
    create: { key, expiresAt: new Date((bucket + 1) * seconds * 1000) },
    update: { count: { increment: 1 } },
  });
  if (entry.count > max) {
    throw new AppError("Too many attempts. Please try again later.", 429);
  }
}
