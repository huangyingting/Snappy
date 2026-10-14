#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const targetProvider = process.argv[2] || "postgresql";
const applyToPrimary = process.argv.includes("--apply");

if (!["sqlite", "postgresql"].includes(targetProvider)) {
  console.error(`Unsupported Prisma provider: ${targetProvider}. Expected "sqlite" or "postgresql".`);
  process.exit(1);
}

const rootDir = process.cwd();
const primarySchemaPath = path.join(rootDir, "prisma", "schema.prisma");
const postgresSchemaPath = path.join(rootDir, "prisma", "schema.postgres.prisma");

const rawSchema = fs.readFileSync(primarySchemaPath, "utf8");

function replaceProvider(schemaText, provider) {
  return schemaText.replace(
    /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*")(?:sqlite|postgresql)("[\s\S]*?\})/,
    `$1${provider}$2`
  );
}

// Always keep schema.postgres.prisma synchronized with postgresql provider
const postgresSchemaText = replaceProvider(rawSchema, "postgresql");
fs.writeFileSync(postgresSchemaPath, postgresSchemaText, "utf8");

if (applyToPrimary) {
  const updatedPrimary = replaceProvider(rawSchema, targetProvider);
  fs.writeFileSync(primarySchemaPath, updatedPrimary, "utf8");
  console.log(`Updated prisma/schema.prisma provider to "${targetProvider}" and synced prisma/schema.postgres.prisma.`);
} else {
  console.log(`Synced prisma/schema.postgres.prisma with provider "postgresql".`);
}
