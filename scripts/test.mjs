import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import pg from "pg";

const directory = mkdtempSync(join(tmpdir(), "snappy-test-"));
let url = process.env.TEST_DATABASE_URL || `file:${join(directory, "test.db")}`;
if (process.env.TEST_DATABASE_URL && !/^postgres(ql)?:\/\//.test(url)) {
  throw new Error("TEST_DATABASE_URL must refer to a dedicated PostgreSQL test database.");
}
if (process.env.TEST_DATABASE_URL && !/^snappy_test(?:_|$)/.test(new URL(url).pathname.slice(1))) {
  throw new Error("Refusing a PostgreSQL database whose name does not start with snappy_test.");
}
let schema;
if (process.env.TEST_DATABASE_URL) {
  schema = `snappy_test_${randomBytes(8).toString("hex")}`;
  const parsed = new URL(url);
  parsed.searchParams.set("schema", schema);
  url = parsed.toString();
}
const e2e = process.argv.includes("--e2e");
const env = { ...process.env, DATABASE_URL: url, NODE_ENV: "test", SNAPPY_TEST_RUN: "1", AUTH_SECRET: randomBytes(32).toString("hex"), NEXTAUTH_URL: e2e ? "http://127.0.0.1:3127" : "http://localhost:3000" };
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}).`);
}
try {
  run("npm", ["run", "db:generate"]);
  run("npm", ["run", "db:deploy"]);
  run("npx", ["prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", schema ? "prisma/postgresql/schema.prisma" : "prisma/schema.prisma", "--exit-code"]);
  run("npx", e2e ? ["playwright", "test"] : ["vitest", "run"]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (schema) {
    const pool = new pg.Pool({ connectionString: url });
    try {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await pool.end();
    }
  }
  rmSync(directory, { recursive: true, force: true });
}
