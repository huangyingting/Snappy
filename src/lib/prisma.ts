import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as typeof globalThis & { prisma?: ReturnType<typeof createClient> };

function createClient() {
  const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const postgres = /^postgres(ql)?:\/\//.test(url);
  if (!postgres && !url.startsWith("file:")) {
    throw new Error("Unsupported DATABASE_URL.");
  }
  const adapter = postgres
    ? new PrismaPg({ connectionString: url, max: 10 }, { schema: new URL(url).searchParams.get("schema") || "public" })
    : new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter, log: ["error"] }).$extends({
    query: {
      $allOperations({ args, query }) {
        if (process.env.NODE_ENV === "production" && !postgres) {
          throw new Error("Production requires a PostgreSQL DATABASE_URL.");
        }
        return query(args);
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
