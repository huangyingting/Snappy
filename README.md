# Snappy — Choice-Driven Global Corporate Gifting Platform

A full-stack, multi-role corporate gifting platform inspired by **Snappy**, built with **Next.js (App Router + TypeScript)**, **Tailwind CSS**, and **Prisma ORM** supporting **SQLite** for instant local development and **PostgreSQL** for production deployment.

---

## Documentation Index

- **Domain Research**: [`docs/research/snappy-features.md`](docs/research/snappy-features.md)
- **Product Requirements & Wave Plan**: [`docs/prd/product-requirements.md`](docs/prd/product-requirements.md)
- **Architecture Decision Records (ADRs)**:
  - [`ADR 0001`: Tech Stack & Full-Stack Architecture](docs/adr/0001-tech-stack-and-architecture.md)
  - [`ADR 0002`: Dual-Database Strategy with Prisma (SQLite Local / PostgreSQL Prod)](docs/adr/0002-dual-database-prisma-strategy.md)
  - [`ADR 0003`: Multi-Role Onboarding, Authentication & RBAC](docs/adr/0003-multi-role-auth-and-enrollment.md)
  - [`ADR 0004`: Regional Gift Fulfillment Routing & Corporate Escrow Ledger](docs/adr/0004-regional-fulfillment-and-escrow-ledger.md)
- **Feature Specifications**:
  - [`Spec 01`: Multi-Role Onboarding, Enrollment & Auth](docs/specs/01-multi-role-auth-and-onboarding.md)
  - [`Spec 02`: Regional Gift Vendor Portal & Catalog Fulfillment](docs/specs/02-vendor-portal-and-regional-catalog.md)
  - [`Spec 03`: Corporate Gifting Portal, Campaigns & Escrow Wallet](docs/specs/03-corporate-gifting-and-escrow-wallet.md)
  - [`Spec 04`: Recipient Claim Experience & Recipient Portal](docs/specs/04-recipient-claim-and-portal.md)
  - [`Spec 05`: Platform Admin Portal & GitHub Actions CI/CD](docs/specs/05-platform-admin-and-cicd.md)

---

## Four Role Experiences & Seeded Demo Credentials

All seeded accounts share the password `SnappyPass123!` (and can also be switched with **1 click** using the top Role Sandbox ribbon in the UI):

| Role | Workspace Route | Enroll / Login Route | Seeded Demo Accounts |
| :--- | :--- | :--- | :--- |
| **1. Corporate Customer (`CORPORATE`)** | `/corporate` | `/auth/corporate` | `sarah.chen@acmecloud.io` (Acme Cloud Corp)<br/>`marcus.vance@novafintech.com` (Nova FinTech) |
| **2. Regional Gift Vendor (`VENDOR`)** | `/vendor` | `/auth/vendor` | `partner@apextech.io` (NA, EMEA)<br/>`oliver@nordichome.eu` (EMEA, NA)<br/>`kenji@kyotoroasters.jp` (APAC, NA)<br/>`sofia@andesverde.br` (LATAM, NA) |
| **3. Gift Recipient (`RECIPIENT`)** | `/recipient` & `/claim/[token]` | `/auth/recipient` | `alex.rivera@acmecloud.io` (NA — Code `SNPY-NA100A`)<br/>`elena.rostova@acmecloud.io` (EMEA — Code `SNPY-EU100B`)<br/>`yuki.tanaka@acmecloud.io` (APAC — Code `SNPY-AP50C1`) |
| **4. Platform Admin (`ADMIN`)** | `/admin` | `/auth/admin` | `admin@snappy.com` |

---

## Local Development (SQLite)

```bash
npm install
npm run setup     # Generates Prisma Client, pushes SQLite schema, and seeds multi-region data
npm run dev       # Starts Next.js on http://localhost:3000
```

## Production Deployment (PostgreSQL)

```bash
# Switch Prisma provider to PostgreSQL and sync schema
npm run db:use:postgres
export DATABASE_URL="postgresql://snappy:snappy_secret@localhost:5432/snappy_prod?schema=public"
npx prisma generate
npx prisma db push
npm run build
npm start
```

Or deploy via Docker Compose with PostgreSQL 16:
```bash
docker compose -f docker-compose.postgres.yml up --build
```
