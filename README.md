# Snappy — Choice-Driven Global Corporate Gifting Platform

A full-stack, multi-role corporate gifting platform inspired by **Snappy**, built with **Next.js 15 (App Router + TypeScript)**, **Tailwind CSS**, and **Prisma ORM** supporting **SQLite** for instant local development/CI and **PostgreSQL** for production deployment.

Instead of shipping unwanted corporate swag to potentially outdated addresses, **Snappy** decouples **corporate budget allocation** from **recipient item selection & regional vendor fulfillment**:
1. **Corporate Senders** fund an escrow wallet, choose a per-recipient budget tier (`$25` / `$50` / `$100` / `$250`) and curated collection, and dispatch personalized gift links by email and region (`NA`, `EMEA`, `APAC`, `LATAM`).
2. **Gift Recipients** unwrap a branded digital reveal, switch their delivery region if needed, and choose their favorite gift from a **price-hidden catalog** (or donate 100% of their gift budget to a verified charity).
3. **Automatic Escrow Surplus Refund**: If a recipient selects an `$88` item from a `$100` gift invitation, the **`$12` surplus is automatically refunded** to the corporate customer's available wallet balance in the same database transaction—and if an invitation expires unclaimed, **100% of the reserved escrow** is reclaimed back to the company.
4. **Regional Gift Vendors** receive fulfilled orders routed to their supported regions (`NA`, `EMEA`, `APAC`, `LATAM`), earn instant wholesale payouts (`wholesaleCostCents`), and update shipment tracking while recipient home addresses stay shielded from corporate senders.
5. **Platform Administrators** govern vendor KYB approvals, platform spread (`retailPriceCents - wholesaleCostCents`), global curated collections, charity partners, and expired escrow reclamation.

---

## Visual Walkthrough & Multi-Role Architecture

### 1. Landing Hub & Interactive Multi-Role Sandbox (`/`)
The landing page introduces the four-pillar ecosystem—**Corporate Customers**, **Regional Gift Vendors**, **Gift Recipients**, and **Platform Administrators**—with a 1-click **Multi-Role Demo Switcher** in the header and live claim links to test the recipient unboxing flow immediately.

![Snappy Landing Hub & Multi-Role Sandbox](docs/screenshots/01-home-hub.png)

---

### 2. Role-Based Onboarding, Authentication & KYB Enrollment (`/auth/[role]`)
Each role has its own purpose-built authentication and onboarding workflow (`/auth/corporate`, `/auth/vendor`, `/auth/recipient`, `/auth/admin`):
- **Corporate Onboarding**: Sets up a company workspace, billing contact, default currency, and welcome escrow credit (`$2,500.00`).
- **Regional Vendor KYB Onboarding**: Registers a merchant with primary and multi-region fulfillment coverage (`NA`, `EMEA`, `APAC`, `LATAM`), merchant category, and wholesale margin tier.
- **Recipient Claim Lookup & Sign-In**: Supports zero-account claim code lookup (`SNPY-NA100A`) or recipient portal registration to track deliveries across employers.

![Role-Based Onboarding & Regional Vendor KYB Enrollment](docs/screenshots/02-role-onboarding.png)

---

### 3. Corporate Gifting & Escrow FinOps Portal (`/corporate`)
Designed for HR, People Ops, and Sales teams (e.g., *Sarah Chen @ Acme Cloud Corp*):
- **Escrow Wallet & FinOps Ledger**: Real-time breakdown of **Available Balance**, **Escrow Reserved** (active pending gifts), **Net Redeemed Spend**, and **Auto-Saved Surplus** (savings from lower-cost gift selections and reclaimed expired invitations), plus instant wallet top-ups.
- **Campaign Builder & Gift Dispatch**: Create campaigns linked to curated or custom collections and send single or batch gift invitations with regional routing (`NA`, `EMEA`, `APAC`, `LATAM`).
- **Recipient Privacy Shield**: Senders see gift status (`SENT`, `OPENED`, `CLAIMED`, `SHIPPED`, `DELIVERED`, `DONATED`) and thank-you notes, while recipient street addresses remain strictly redacted (`🔒 Redacted for Recipient Privacy`).

![Corporate Gifting & Escrow FinOps Portal](docs/screenshots/03-corporate-portal.png)

---

### 4. Recipient "Power of Choice" Unwrapping & Price-Hidden Claim Experience (`/claim/[token]`)
When a recipient opens their personalized claim link (e.g., `/claim/snappy_demo_na_100`):
- **Interactive Gift Unwrapping**: Branded greeting card from the sender with company colors, sender message, and celebratory reveal.
- **Dynamic Regional & Budget Filtering**: Displays only in-stock products from `APPROVED` vendors that ship to the recipient's selected region (`NA`, `EMEA`, `APAC`, `LATAM`) and whose retail price is `<= budgetCents`—with **all dollar prices hidden** so the experience feels like a genuine gift.
- **Physical Redemption or 100% Charity Donation**: Recipients either enter their private shipping address for regional vendor fulfillment or donate 100% of the gift budget to a verified impact partner (*Trees for the Future*, *Girls Who Code*, *World Central Kitchen*), then send a thank-you note back to their sender.

![Recipient Unwrapped Gift & Regional Choice Catalog](docs/screenshots/04-recipient-claim.png)

---

### 5. Regional Gift Vendor Catalog & Fulfillment Portal (`/vendor`)
Built for regional merchants and fulfillment partners (e.g., *Apex Tech & Audio Co.* covering `NA` & `EMEA`):
- **Multi-Region Coverage Controls**: Configure which global regions (`NA`, `EMEA`, `APAC`, `LATAM`) the vendor fulfills without cross-border customs friction.
- **SKU & Wholesale Margin Management**: Publish new catalog items with retail budget eligibility, wholesale payout automatically calculated from the vendor's commission tier, and live inventory stock controls.
- **Order Fulfillment Queue**: View recipient shipping details (visible only to the fulfilling vendor), enter carrier tracking numbers, and advance orders through `PROCESSING → SHIPPED → DELIVERED`.

![Regional Gift Vendor Catalog & Fulfillment Portal](docs/screenshots/05-vendor-portal.png)

---

### 6. Platform Administrator Governance & FinOps Control Plane (`/admin`)
Provides full operational oversight across the marketplace:
- **GMV, Platform Spread & Escrow Analytics**: Tracks total corporate deposits, active escrow liability, fulfilled GMV, wholesale vendor payouts, platform margin spread, and charitable donations.
- **Expired Gift Escrow Reclamation**: 1-click batch sweep (`reclaimExpiredGifts`) that transitions expired invitations to `EXPIRED` and refunds 100% of their locked escrow back to each corporate customer's wallet with `ESCROW_EXPIRED_REFUND` ledger entries.
- **Vendor KYB Governance & Global Catalog Curation**: Approve/suspend vendors, tune commission rates, create global curated collections, and onboard verified charity partners.

![Platform Administrator Governance & FinOps Control Plane](docs/screenshots/06-admin-portal.png)

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

## Verification & Testing

```bash
npm run lint              # ESLint static analysis
npm run db:validate:all   # Validates both SQLite and PostgreSQL Prisma schemas
npm test                  # Runs end-to-end Vitest integration suite across all 4 roles
npm run build             # Production Next.js build
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
