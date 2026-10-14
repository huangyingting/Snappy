# Snappy Atelier (V2) — Global Corporate Gifting, AI Studio Catalog & Curated Logistics Platform

A production-grade, multi-role corporate gifting and global fulfillment platform inspired by **Snappy**, **Goody**, **Reachdesk**, and **Sendoso**—crafted with the **Snappy Atelier** editorial luxury aesthetic and built with **Next.js 15 (App Router + TypeScript)**, **Tailwind CSS v4**, and **Prisma ORM** supporting **SQLite** for instant local development/CI and **PostgreSQL** for production deployment.

---

## What's New in V2 ("Snappy Atelier" Upgrade)

1. **Snappy Atelier Editorial Luxury UI System**:
   - Designed with a bespoke **Warm Alabaster (`#FAF8F5`)**, **Deep Obsidian (`#141210`)**, **Terracotta Vermilion (`#C85A32`)**, and **Champagne Gold (`#D4AF37`)** palette paired with **Fraunces** editorial serif headings, **Plus Jakarta Sans** UI typography, and **JetBrains Mono** financial/logistics telemetry.
2. **Photorealistic AI Studio Product Photography (`MAI-Image-2.6-Flash`)**:
   - All **16 regional catalog products** feature custom 1024×1024 studio product photography (`public/images/products/*.png`) generated via the `MAI-Image-2.6-Flash` API (`scripts/generate-gift-images.mjs`), plus an interactive **AI Studio Image Generator** inside the Vendor Portal (`POST /api/ai/generate-product-image`).
3. **Structured Gift Categories & Custom Collection Builder**:
   - 6 first-class `GiftCategory` verticals (**Tech & Workspace**, **Artisanal Gourmet**, **Botanical Wellness**, **Architectural Home**, **Bespoke Apparel & Travel**, and **Eco & Social Impact**) with interactive category filtering across the Landing Hub, Recipient Claim Suite, Vendor Catalog Studio, and Admin Governance Portal, plus a **Custom Collection Builder** for Corporate Senders.
4. **Full Vendor Product Lifecycle & Inventory Management**:
   - Regional vendors can create, edit, restock, and archive/restore SKUs (`PATCH / DELETE /api/vendor/products/[id]`), configure structured **product variants** (e.g., wood/metal finishes, roast profiles, sizes), technical specifications, sustainability tags, and regional routing (`NA`, `EMEA`, `APAC`, `LATAM`).
5. **5-Stage Carrier Logistics Tracking & `<LogisticsTimeline />`**:
   - End-to-end shipment visibility (`Order Routed → Atelier QA & Pack → Carrier Transit → Out for Delivery → Delivered`) backed by chronological `ShipmentEvent` checkpoints, carrier waybills (`DHL Express`, `FedEx Priority`, `UPS Worldwide`, `Yamato Transport`), regional origin hubs, service levels, package weights, and exception logging.
6. **Recipient Self-Service Delivery Hub & Pre-Shipment Gift Swapping**:
   - Recipients manage a reusable **Multi-Region Address Book** (`RecipientAddress`), autofill checkout addresses with 1 click, **edit their shipping address & courier instructions** after claiming (until carrier manifest lock), and **swap their claimed gift** for an alternative regional SKU with automatic stock reconciliation and escrow surplus adjustment.

---

## Visual Walkthrough & Multi-Role Architecture

### 1. Snappy Atelier Landing Hub & Interactive Catalog Showcase (`/`)
The landing hub introduces the four-role ecosystem—**Corporate Studio**, **Vendor Catalog & Logistics**, **Recipient Suite**, and **Admin Control Tower**—complete with a 1-click **Atelier Sandbox Persona Switcher**, interactive category tabs showcasing the 16 AI-photographed studio gifts, and instant recipient unboxing links.

![Snappy Atelier Landing Hub & Interactive Catalog Showcase](docs/screenshots/01-home-hub.png)

---

### 2. Role-Based Onboarding, Authentication & KYB Enrollment (`/auth/[role]`)
Each role has its own purpose-built authentication and onboarding workflow (`/auth/corporate`, `/auth/vendor`, `/auth/recipient`, `/auth/admin`):
- **Corporate Onboarding**: Sets up a company workspace, billing contact, default currency, and welcome escrow credit (`$2,500.00`).
- **Regional Vendor KYB Onboarding**: Registers a merchant with primary and multi-region fulfillment coverage (`NA`, `EMEA`, `APAC`, `LATAM`), merchant category, and wholesale margin tier.
- **Recipient Claim Lookup & Sign-In**: Supports zero-account claim code lookup (`SNPY-NA100A`) or recipient portal registration to manage saved addresses and track deliveries across employers.

![Role-Based Onboarding & Regional Vendor KYB Enrollment](docs/screenshots/02-role-onboarding.png)

---

### 3. Corporate Gifting Studio, Custom Collection Builder & Escrow FinOps (`/corporate`)
Designed for HR, People Ops, and Sales teams (e.g., *Sarah Chen @ Acme Cloud Corp*):
- **Escrow Wallet & FinOps Ledger**: Real-time breakdown of **Available Balance**, **Escrow Reserved** (active pending gifts), **Net Redeemed Spend**, and **Auto-Saved Surplus** (savings from lower-cost gift selections and reclaimed expired invitations), plus instant wallet top-ups.
- **Custom Collection Builder & Campaign Dispatch**: Curate custom collections from approved regional SKUs, launch budget-tiered campaigns (`$25` / `$50` / `$100` / `$250`), and dispatch single or batch gift invitations with regional routing (`NA`, `EMEA`, `APAC`, `LATAM`).
- **Recipient Privacy Shield & Gratitude Wall**: Senders see gift status (`SENT`, `OPENED`, `CLAIMED`, `SHIPPED`, `DELIVERED`, `DONATED`), carrier progress, and recipient thank-you notes, while street addresses remain strictly redacted (`🔒 Redacted for Recipient Privacy`).

![Corporate Gifting Studio & Escrow FinOps Portal](docs/screenshots/03-corporate-portal.png)

---

### 4. Recipient "Power of Choice" Unwrapping & Variant Personalization (`/claim/[token]`)
When a recipient opens their personalized claim link or code (`/claim/SNPY-NA100A` or `/claim/snappy_demo_na_100`):
- **Luxury Atelier Invitation & Dynamic Regional Routing**: Branded greeting card from the sender with instant region switching (`NA`, `EMEA`, `APAC`, `LATAM`) and category filtering (`Tech`, `Gourmet`, `Wellness`, `Home & Living`, `Apparel & Swag`, `Eco & Impact`)—with **all dollar prices hidden** so the experience feels like a genuine gift.
- **Edition / Variant Selection & 1-Click Address Book Autofill**: Recipients pick their preferred product finish/edition, autofill their shipping destination from their saved address book, or donate 100% of their gift allowance to a verified charity partner.

![Recipient Unwrapped Gift & Regional Choice Catalog](docs/screenshots/04-recipient-claim.png)

---

### 5. Regional Gift Vendor Catalog Studio, AI Image Generator & Carrier Dispatch (`/vendor`)
Built for regional merchants and fulfillment partners (e.g., *Apex Tech & Audio Co.* covering `NA` & `EMEA`):
- **SKU Lifecycle, Variant & Inventory Studio**: Publish new catalog items with AI-generated studio product imagery (`MAI-Image-2.6-Flash`), edit prices/stock/variants/regions inline, restock low-inventory items with 1 click, or archive/restore SKUs.
- **Carrier Manifest & Multi-Checkpoint Fulfillment Queue**: View recipient shipping details (visible only to the fulfilling vendor), assign carrier waybills (`DHL Express`, `FedEx Priority`, `UPS Worldwide`, `Yamato Transport`), log custom checkpoint scans with facility locations, and advance orders through `PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED`.

![Regional Gift Vendor Catalog Studio & Carrier Fulfillment Portal](docs/screenshots/05-vendor-portal.png)

---

### 6. Platform Administrator Control Tower & Taxonomy Governance (`/admin`)
Provides full operational oversight across the global marketplace:
- **GMV, Platform Spread & Escrow Analytics**: Tracks total corporate deposits, active escrow liability, fulfilled GMV, wholesale vendor payouts, platform margin spread, and charitable donations.
- **Expired Gift Escrow Reclamation**: 1-click batch sweep (`reclaimExpiredGifts`) that transitions expired invitations to `EXPIRED` and refunds 100% of their locked escrow back to each corporate customer's wallet with `ESCROW_EXPIRED_REFUND` ledger entries.
- **Vendor KYB, Gift Category Taxonomy & Global Collections**: Approve/suspend vendors, tune commission rates, create and manage `GiftCategory` verticals, curate global collections, and onboard verified charity partners.

![Platform Administrator Governance & FinOps Control Plane](docs/screenshots/06-admin-portal.png)

---

### 7. Recipient Delivery Management Hub, Live Carrier Telemetry & Pre-Shipment Controls (`/recipient`)
A dedicated self-service delivery and address command center for gift recipients (e.g., *Alex Rivera*):
- **Live 5-Stage `<LogisticsTimeline />` & Carrier Checkpoint Logs**: Real-time visual progress stepper (`Order Routed → Atelier QA & Pack → Carrier Transit → Out for Delivery → Delivered`) with waybill numbers, origin fulfillment hubs, service levels, package weights, and timestamped scan events.
- **Pre-Shipment Self-Service Address Edit & Gift Swap**: Recipients can modify their street address, courier drop-off instructions, or even swap their selected gift for another eligible regional item while the order is in `PENDING_VENDOR` or `PROCESSING` status—before carrier manifest lock.
- **Multi-Region Address Book**: Save, edit, delete, and set default delivery addresses across `NA`, `EMEA`, `APAC`, and `LATAM` for instant 1-click checkout on future gifts.

![Recipient Delivery Management Hub & Live Carrier Telemetry](docs/screenshots/07-recipient-delivery-hub.png)

---

## Documentation Index

- **Domain Research**: [`docs/research/snappy-features.md`](docs/research/snappy-features.md)
- **Product Requirements & Wave Plans**: [`docs/prd/product-requirements.md`](docs/prd/product-requirements.md)
- **Architecture Decision Records (ADRs)**:
  - [`ADR 0001`: Tech Stack & Full-Stack Architecture](docs/adr/0001-tech-stack-and-architecture.md)
  - [`ADR 0002`: Dual-Database Strategy with Prisma (SQLite Local / PostgreSQL Prod)](docs/adr/0002-dual-database-prisma-strategy.md)
  - [`ADR 0003`: Multi-Role Onboarding, Authentication & RBAC](docs/adr/0003-multi-role-auth-and-enrollment.md)
  - [`ADR 0004`: Regional Gift Fulfillment Routing & Corporate Escrow Ledger](docs/adr/0004-regional-fulfillment-and-escrow-ledger.md)
  - [`ADR 0005`: Catalog Taxonomy, Multi-Checkpoint Logistics & AI Studio Imagery](docs/adr/0005-catalog-taxonomy-logistics-and-ai-imagery.md)
- **Feature Specifications**:
  - [`Spec 01`: Multi-Role Onboarding, Enrollment & Auth](docs/specs/01-multi-role-auth-and-onboarding.md)
  - [`Spec 02`: Regional Gift Vendor Portal & Catalog Fulfillment](docs/specs/02-vendor-portal-and-regional-catalog.md)
  - [`Spec 03`: Corporate Gifting Portal, Campaigns & Escrow Wallet](docs/specs/03-corporate-gifting-and-escrow-wallet.md)
  - [`Spec 04`: Recipient Claim Experience & Recipient Portal](docs/specs/04-recipient-claim-and-portal.md)
  - [`Spec 05`: Platform Admin Portal & GitHub Actions CI/CD](docs/specs/05-platform-admin-and-cicd.md)
  - [`Spec 06`: V2 Snappy Atelier UI, Catalog Lifecycle, Carrier Logistics & Delivery Management](docs/specs/06-v2-ui-catalog-logistics-delivery.md)

---

## Four Role Experiences & Seeded Demo Credentials

All seeded accounts share the password `SnappyPass123!` (and can also be switched with **1 click** using the top **Atelier Sandbox** ribbon in the UI):

| Role | Workspace Route | Enroll / Login Route | Seeded Demo Accounts |
| :--- | :--- | :--- | :--- |
| **1. Corporate Customer (`CORPORATE`)** | `/corporate` | `/auth/corporate` | `sarah.chen@acmecloud.io` (Acme Cloud Corp)<br/>`marcus.vance@novafintech.com` (Nova FinTech) |
| **2. Regional Gift Vendor (`VENDOR`)** | `/vendor` | `/auth/vendor` | `partner@apextech.io` (NA, EMEA)<br/>`oliver@nordichome.eu` (EMEA, NA)<br/>`kenji@kyotoroasters.jp` (APAC, NA)<br/>`sofia@andesverde.br` (LATAM, NA) |
| **3. Gift Recipient (`RECIPIENT`)** | `/recipient` & `/claim/[token]` | `/auth/recipient` | `alex.rivera@acmecloud.io` (Codes: `SNPY-NA100A`, `SNPY-EU100B`, `SNPY-AP50C1`)<br/>`elena.rostova@acmecloud.io` (`SNPY-EU100B`)<br/>`yuki.tanaka@acmecloud.io` (`SNPY-AP50C1`) |
| **4. Platform Admin (`ADMIN`)** | `/admin` | `/auth/admin` | `admin@snappy.com` |

---

## Local Development (SQLite)

```bash
npm install
npm run setup     # Generates Prisma Client, pushes SQLite schema, and seeds V2 multi-region data
npm run dev       # Starts Next.js on http://localhost:3000
```

### Regenerating AI Studio Product Images (Optional)
All 16 studio images are pre-generated and committed under `public/images/products/*.png`. To regenerate or create new product images using `MAI-Image-2.6-Flash`, set `MAI_API_KEY` in `.env` and run:
```bash
node scripts/generate-gift-images.mjs
```

## Verification & Testing

```bash
npm run lint              # ESLint static analysis
npm run db:validate:all   # Validates both SQLite and PostgreSQL Prisma schemas
npm test                  # Runs 11 end-to-end Vitest integration suites across V1 & V2 workflows
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
