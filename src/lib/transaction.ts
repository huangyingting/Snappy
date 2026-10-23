import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function transaction<T>(operation: (tx: TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
    }
  }
}
