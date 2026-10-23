import "dotenv/config";
import { z } from "zod";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/passwords";

async function main() {
  const input = z.object({
    BOOTSTRAP_ADMIN_EMAIL: z.string().email().transform((email) => email.toLowerCase()),
    BOOTSTRAP_ADMIN_NAME: z.string().trim().min(1),
    BOOTSTRAP_ADMIN_PASSWORD: z.string().min(16).max(128),
  }).parse(process.env);
  const passwordHash = await hashPassword(input.BOOTSTRAP_ADMIN_PASSWORD);
  await prisma.$transaction(async (tx) => {
    if (await tx.user.findFirst({ where: { role: "ADMIN" } })) {
      throw new Error("An administrator already exists. Bootstrap will not overwrite accounts.");
    }
    const user = await tx.user.create({
      data: {
        email: input.BOOTSTRAP_ADMIN_EMAIL, name: input.BOOTSTRAP_ADMIN_NAME,
        passwordHash, role: "ADMIN", emailVerified: new Date(),
      },
    });
    await tx.auditLog.create({
      data: { actorUserId: user.id, actorRole: "ADMIN", action: "ADMIN_BOOTSTRAPPED", entityType: "User", entityId: user.id },
    });
  }, { isolationLevel: "Serializable" });
  console.log("Administrator created. Remove BOOTSTRAP_ADMIN_* values from the environment.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Bootstrap failed.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
