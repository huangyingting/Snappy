# Spec 05: Platform Administrator Portal & GitHub Actions CI/CD

## 1. Platform Administrator Portal (`/admin`)

### 1.1 Overview
Provides Snappy platform operators (`ADMIN`) with centralized control over vendor approval, global collection merchandising, charity partners, expired gift escrow sweeps, and platform-wide financial/audit observability.

### 1.2 Endpoints & Capabilities
- `GET /api/admin/dashboard`:
  - Returns platform-wide KPIs: Total GMV, Total Platform Commission Revenue, Active Corporate Escrow, Total Charitable Donations, vendor list, global collections, charity list, expired unclaimed gifts eligible for sweep, and recent `AuditLog` entries.
- `PATCH /api/admin/vendors/[id]`:
  - Approve (`APPROVED`), suspend (`SUSPENDED`), or adjust `commissionRateBps` for any regional vendor.
- `POST /api/admin/collections`:
  - Create a new global curated Snappy collection (`isGlobal = true`) across regions and budget tiers.
- `POST /api/admin/charities`:
  - Add or toggle verified charity partners.
- `POST /api/admin/reclaim-expired`:
  - Scans all `GiftSend` records where `status IN ('SENT', 'OPENED')` and `expiresAt < now()`.
  - Atomically transitions each to `EXPIRED`, refunds `budgetCents` from `company.escrowBalanceCents` back to `company.walletBalanceCents`, creates a `WalletTransaction` (`EXPIRED_GIFT_REFUND`), and logs an `AuditLog` event.

---

## 2. CI/CD Workflows & Production Deployment

### 2.1 Continuous Integration (`.github/workflows/ci.yml`)
Triggered on `push` and `pull_request` to `main`:
1. **Quality & SQLite Verification Job**:
   - Install Node.js 22 & npm dependencies (`npm ci`).
   - Validate both SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/schema.postgres.prisma`) schemas.
   - Generate Prisma client, push SQLite schema (`npm run db:push`), and seed test data (`npm run db:seed`).
   - Run ESLint & TypeScript typecheck (`npm run lint && npm run typecheck`).
   - Run full Vitest unit & integration test suite (`npm test`).
   - Build production Next.js bundle (`npm run build`).
2. **PostgreSQL Production Parity Job**:
   - Spins up a live `postgres:16-alpine` service container in GitHub Actions.
   - Switches Prisma schema to PostgreSQL (`npm run db:use:postgres`).
   - Applies schema to PostgreSQL (`npx prisma db push`) and runs the seed & integration test suite against real PostgreSQL.

### 2.2 Continuous Deployment (`.github/workflows/deploy.yml`)
Triggered on release tags (`v*`) or `workflow_dispatch`:
1. Validates tests and builds multi-stage production Docker image (`Dockerfile`).
2. Runs production PostgreSQL migrations (`npx prisma migrate deploy` / `db push`).
3. Publishes container artifact and executes post-deploy healthcheck against `/api/health`.
