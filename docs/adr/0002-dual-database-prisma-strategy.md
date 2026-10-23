# ADR 0002: SQLite development, PostgreSQL production

Accepted. Keep portable models in `prisma/schema.prisma`. Generate the PostgreSQL mirror at `prisma/postgresql/schema.prisma`; never mutate the canonical provider to switch environments.

Prisma 7 reads the connection URL and migration path from `prisma.config.ts`. Runtime uses the matching better-sqlite3 or node-postgres adapter. SQLite file URLs resolve relative to the repository root. Production requires PostgreSQL.

Maintain independent versioned migration histories for each provider. Apply with `npm run db:deploy`, not destructive schema pushes. CI runs domain integration tests on both actual database engines. Monetary amounts use integer cents.
