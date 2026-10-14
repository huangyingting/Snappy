# Product Requirements Document (PRD) & Implementation Plan

## 1. Product Vision
Build a complete, production-ready, multi-role corporate gifting platform inspired by **Snappy**, engineered with **Next.js (App Router + TypeScript)**, **Prisma ORM**, **SQLite** for zero-config local development & CI testing, and **PostgreSQL** for production deployment.

---

## 2. Multi-Role Matrix & Distinct Onboarding/Auth Flows

| Role | Enrollment / Onboarding Flow | Authentication Mechanism | Primary Workspace Route | Key Authorization Boundaries |
| :--- | :--- | :--- | :--- | :--- |
| **Corporate (`CORPORATE`)** | Company Workspace registration: work email, company name, employee count, billing region, brand color, initial wallet credit | Email + Password session + Role Guard (`CORPORATE`) | `/corporate` | Can only view/manage own company's wallet, campaigns, gift sends, and anonymized recipient status (no raw recipient home address when privacy mode is enabled). |
| **Regional Vendor (`VENDOR`)** | Partner Supplier application: business name, tax ID, primary HQ, supported fulfillment regions (`NA`, `EMEA`, `APAC`, `LATAM`), shipping SLA | Email + Password session + Role Guard (`VENDOR`) | `/vendor` | Can only manage own SKU catalog, inventory, and fulfillment orders explicitly assigned to their vendor account. |
| **Recipient (`RECIPIENT`)** | Frictionless magic token / claim code verification OR email account registration with default region & shipping preferences | Magic Claim Token (`/claim/[token]`) + Email/Code lookup OR Email + Password session (`RECIPIENT`) | `/recipient` & `/claim/[token]` | Can only view/claim gifts addressed to their email or claim token, submit shipping address & thank-you note, and track own orders. |
| **Platform Admin (`ADMIN`)** | Seeded / internal admin provisioning with security clearance | Email + Password session + Strict Role Guard (`ADMIN`) | `/admin` | Full governance over vendor approval, curated collections, charity catalog, expired gift sweeps, and platform-wide audit/financial metrics. |

---

## 3. Domain & Data Model Overview

### Core Entities
1. **`User`**: Authenticated identity (`id`, `email`, `passwordHash`, `name`, `role` [`ADMIN`, `CORPORATE`, `VENDOR`, `RECIPIENT`], `avatarUrl`, `createdAt`).
2. **`Company`** (Corporate tenant): Linked to `CORPORATE` users (`id`, `name`, `slug`, `domain`, `industry`, `sizeBand`, `primaryRegion`, `logoUrl`, `brandColor`, `walletBalanceCents`, `escrowBalanceCents`, `hideRecipientAddress`).
3. **`WalletTransaction`**: Immutable ledger for corporate deposits, campaign escrow holds, gift claim captures, and expired-gift refunds.
4. **`Vendor`** (Regional gift supplier): Linked to `VENDOR` users (`id`, `businessName`, `slug`, `taxId`, `status` [`PENDING`, `APPROVED`, `SUSPENDED`], `hqCountry`, `supportedRegions` [CSV/JSON of `NA`, `EMEA`, `APAC`, `LATAM`], `commissionRateBps`, `slaDays`, `payoutBalanceCents`, `rating`).
5. **`Product`** (Gift SKU): Belongs to `Vendor` (`id`, `vendorId`, `title`, `description`, `category`, `priceCents`, `wholesaleCostCents`, `imageUrl`, `stockQuantity`, `supportedRegions`, `isFeatured`, `active`).
6. **`Collection`** (Gift Collection): Curated by Admin (`isGlobal = true`) or customized by a Company (`companyId`) (`id`, `title`, `description`, `occasion`, `budgetTierCents`, `coverImageUrl`, `isGlobal`, `companyId`).
7. **`CollectionProduct`**: Many-to-many join between `Collection` and `Product`.
8. **`Charity`**: Verified charitable donation options (`id`, `name`, `category`, `description`, `logoUrl`, `totalDonatedCents`, `active`).
9. **`Campaign`**: Created by a `Company` (`id`, `companyId`, `createdByUserId`, `title`, `occasion`, `messageTemplate`, `budgetCents`, `collectionId`, `status` [`ACTIVE`, `PAUSED`, `COMPLETED`], `triggerType` [`MANUAL`, `BULK_CSV`, `AUTOMATED_MILESTONE`], `allowCharity`, `expiresInDays`).
10. **`GiftSend`**: Individual gift invitation dispatched to a recipient (`id`, `campaignId`, `companyId`, `recipientEmail`, `recipientName`, `recipientUserId`, `preferredRegion`, `claimToken`, `claimCode`, `budgetCents`, `status` [`SENT`, `OPENED`, `CLAIMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `DONATED`, `EXPIRED`], `personalMessage`, `thankYouNote`, `expiresAt`, `claimedAt`).
11. **`GiftOrder`**: Created when a `GiftSend` is claimed for a physical product or charity (`id`, `giftSendId`, `productId`, `vendorId`, `charityId`, `orderType` [`PHYSICAL_GIFT`, `CHARITY_DONATION`], `retailAmountCents`, `vendorPayoutCents`, `platformFeeCents`, `recipientRegion`, `shippingName`, `shippingAddressLine1`, `shippingCity`, `shippingState`, `shippingPostalCode`, `shippingCountry`, `trackingCarrier`, `trackingNumber`, `fulfillmentStatus` [`PENDING_VENDOR`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `COMPLETED`], `shippedAt`, `deliveredAt`).
12. **`AuditLog`**: Tracks critical actions across all roles (`id`, `actorUserId`, `actorRole`, `action`, `entityType`, `entityId`, `metadataJson`, `createdAt`).

---

## 4. Implementation Waves & Milestones

### Wave 1: Foundation, Dual-DB Prisma Architecture & Multi-Role Auth
- Next.js App Router + TypeScript + Tailwind CSS setup.
- Prisma schema & dual database switcher (`prisma/schema.prisma` for local SQLite + `prisma/schema.postgres.prisma` and automated sync/migration scripts for PostgreSQL production).
- Comprehensive seed script (`prisma/seed.ts`) populating realistic data across all 4 regions (`NA`, `EMEA`, `APAC`, `LATAM`), 4 roles, multiple vendors, 16+ regional gifts across budget tiers ($25, $50, $100, $250), curated collections, charities, corporate campaigns, and gift sends in every lifecycle state.
- Role-specific enrollment/registration and login flows (`/auth/corporate`, `/auth/vendor`, `/auth/recipient`, `/auth/admin`) plus session cookie management & RBAC API protection.

### Wave 2: Regional Gift Vendor Portal (`/vendor`)
- Vendor onboarding & regional coverage configuration (`NA`, `EMEA`, `APAC`, `LATAM`).
- SKU catalog creation, pricing & wholesale margin visibility, regional availability tags, and real-time stock management.
- Fulfillment queue: process incoming orders (`PENDING_VENDOR` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`), attach carrier & tracking numbers, and view vendor payout ledger.

### Wave 3: Corporate Gifting Portal (`/corporate`)
- Corporate workspace onboarding, brand customization (company color, logo, address-privacy setting).
- Wallet & Escrow ledger: add funds, view escrow reserved for active unclaimed gifts, and transaction history.
- Collection explorer & custom collection builder filtered by budget tier and region coverage.
- Campaign launcher: single send, bulk recipient batch creation, milestone automation templates, and custom gift reveal preview.
- Live campaign analytics & Gratitude Wall displaying recipient thank-you notes.

### Wave 4: Recipient Claim Experience (`/claim/[token]`) & Recipient Portal (`/recipient`) + Platform Admin Portal (`/admin`)
- Interactive digital gift reveal screen with sender branding and occasion celebration.
- Region switcher (`NA`, `EMEA`, `APAC`, `LATAM`) dynamically filtering eligible in-stock gifts within the campaign's budget tier.
- Physical gift redemption with privacy-protected shipping form OR instant 100% Charity Donation alternative.
- Post-claim thank-you note composer and real-time order shipment tracker.
- Recipient dashboard (`/recipient`) to look up gifts by claim code/email or logged-in account.
- Platform Admin Portal (`/admin`) for vendor approval/suspension, global collection curation, charity management, expired-gift escrow refund sweeps, and audit log inspection.

### Wave 5: Automated Testing, Verification & GitHub Actions CI/CD
- Unit and integration tests (Vitest) covering role enrollment/auth, corporate wallet escrow math, regional gift filtering, recipient claim & charity donation, vendor fulfillment state machine, and admin expired-gift reclaim.
- End-to-end HTTP/UI verification against running production/dev build.
- Production `Dockerfile`, `docker-compose.postgres.yml`, and GitHub Actions workflows (`.github/workflows/ci.yml` for lint, typecheck, SQLite + Postgres schema validation, unit/integration tests, and Next.js build; `.github/workflows/deploy.yml` for production PostgreSQL migration & container release).
