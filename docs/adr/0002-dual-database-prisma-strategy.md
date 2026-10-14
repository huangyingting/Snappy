# ADR 0002: Dual-Database Strategy with Prisma (SQLite Local Dev & PostgreSQL Production)

## Status
Accepted

## Context
The platform must run effortlessly in local development and automated CI using **SQLite** (zero external daemon required) while supporting **PostgreSQL** in production deployments without code divergence.

## Decision
1. **Primary Schema Compatibility**: Design all Prisma models in `prisma/schema.prisma` using portable data types supported identically by both SQLite and PostgreSQL (`String`, `Int`, `Boolean`, `DateTime`).
2. **Monetary Values in Integer Cents**: Store all currency amounts (`walletBalanceCents`, `escrowBalanceCents`, `priceCents`, `budgetCents`, `retailAmountCents`, `vendorPayoutCents`, `platformFeeCents`) as `Int` (cents) to avoid floating-point rounding bugs and decimal provider differences between SQLite and PostgreSQL.
3. **Automated Provider Switcher**:
   - Maintain `prisma/schema.prisma` (defaulting to `sqlite` for local development) and `prisma/schema.postgres.prisma` (configured for `postgresql`), synchronized via `scripts/sync-prisma-postgres.mjs`.
   - Provide `npm run db:use:sqlite` and `npm run db:use:postgres` scripts so CI/CD and production builds can validate and deploy against either database engine seamlessly.
4. **Singleton Prisma Client**: Instantiate `PrismaClient` in `src/lib/prisma.ts` with hot-reload caching in development.

## Consequences
- **Positive**: Instant `npm run setup` locally with SQLite (`file:./dev.db`); production readiness with PostgreSQL (`DATABASE_URL=postgresql://...`); zero floating-point financial discrepancies.
- **Negative**: Multi-value tags (such as `supportedRegions`) are stored as normalized comma-delimited strings (`"NA,EMEA"`) or join tables rather than Postgres-only native scalar arrays, ensuring 100% SQLite/Postgres parity.
