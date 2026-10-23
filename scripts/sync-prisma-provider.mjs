import fs from "node:fs";

const source = fs.readFileSync("prisma/schema.prisma", "utf8");
const target = "prisma/postgresql/schema.prisma";
const postgres = source.replace('provider = "sqlite"', 'provider = "postgresql"');
if (postgres === source) throw new Error("Canonical schema must use SQLite.");

if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== postgres) {
    throw new Error("PostgreSQL schema is out of sync. Run npm run db:generate.");
  }
} else {
  fs.mkdirSync("prisma/postgresql", { recursive: true });
  fs.writeFileSync(target, postgres);
}
