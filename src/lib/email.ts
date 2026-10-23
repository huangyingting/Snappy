import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import type { TransactionClient } from "./transaction";

export function appUrl() {
  const value = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXTAUTH_URL must use HTTPS in production.");
  }
  return url.origin;
}

export async function queueEmail(tx: TransactionClient, to: string, subject: string, text: string) {
  return tx.emailMessage.create({ data: { to, subject, text } });
}

export async function deliverEmails() {
  if (!process.env.SMTP_URL || !process.env.EMAIL_FROM) {
    throw new Error("SMTP_URL and EMAIL_FROM are required to deliver email.");
  }
  const transport = nodemailer.createTransport(process.env.SMTP_URL);
  const retryBefore = new Date(Date.now() - 10 * 60 * 1000);
  const messages = await prisma.emailMessage.findMany({
    where: { sentAt: null, OR: [{ lockedAt: null }, { lockedAt: { lt: retryBefore } }] },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  let sent = 0;
  let failed = 0;
  try {
    for (const message of messages) {
      const lock = new Date();
      const claimed = await prisma.emailMessage.updateMany({
        where: { id: message.id, sentAt: null, OR: [{ lockedAt: null }, { lockedAt: { lt: retryBefore } }] },
        data: { lockedAt: lock, attempts: { increment: 1 } },
      });
      if (!claimed.count) continue;
      try {
        const info = await transport.sendMail({
          from: process.env.EMAIL_FROM,
          to: message.to,
          subject: message.subject,
          text: message.text,
          messageId: `<${message.id}@${new URL(appUrl()).hostname}>`,
        });
        if (!info.accepted?.length) throw new Error("SMTP did not accept the recipient.");
        await prisma.emailMessage.update({
          where: { id: message.id },
          data: { sentAt: new Date(), lockedAt: null, lastError: "", text: "" },
        });
        sent++;
      } catch (error) {
        console.error(`Email delivery failed for message ${message.id}:`, error);
        await prisma.emailMessage.update({
          where: { id: message.id },
          data: { lockedAt: null, lastError: "Delivery failed; inspect mail worker logs." },
        });
        failed++;
      }
    }
  } finally {
    transport.close();
  }
  await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.authToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return { sent, failed };
}
