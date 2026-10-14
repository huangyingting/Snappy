# ADR 0003: Multi-Role Onboarding, Authentication, and Authorization

## Status
Accepted

## Context
A Snappy clone has four fundamentally different actors:
1. **Corporate Customers (`CORPORATE`)** who onboard a company workspace, fund budgets, and launch gifting campaigns.
2. **Regional Gift Vendors (`VENDOR`)** who onboard a business entity, declare regional fulfillment capabilities (`NA`, `EMEA`, `APAC`, `LATAM`), list products, and fulfill orders.
3. **Gift Recipients (`RECIPIENT`)** who either arrive via a frictionless magic claim link (`/claim/[token]`), enter a 6-character claim code, or sign in to a recipient profile to track gifts across senders.
4. **Platform Administrators (`ADMIN`)** who vet vendors, curate global collections, and oversee platform financials.

Using a single generic registration form fails to capture role-specific domain entities (`Company`, `Vendor`, recipient preferences) and obscures role boundaries.

## Decision
1. **Role-Specific Enrollment Flows**:
   - `/auth/corporate`: Enrolls user + provisions a `Company` workspace (with domain, industry, size band, primary region, brand color, and optional starter wallet deposit).
   - `/auth/vendor`: Enrolls user + provisions a `Vendor` profile (with legal business name, tax ID, HQ country, supported fulfillment regions `NA`/`EMEA`/`APAC`/`LATAM`, and shipping SLA).
   - `/auth/recipient`: Allows instant lookup by **Magic Claim Code + Email** OR full recipient account enrollment/login to manage all received gifts in one place.
   - `/auth/admin`: Dedicated platform operator sign-in with quick demo-role switcher support for evaluation and testing.
2. **Signed Stateless HMAC Session Token**:
   - Issue an HTTP-only signed session token cookie (`snappy_session`) containing `{ userId, email, role, companyId, vendorId, exp }` signed with HMAC-SHA256 (`AUTH_SECRET`).
3. **Strict Role Authorization Guards**:
   - Server helpers `requireAuth(allowedRoles)` validate both the session signature and role membership on every protected API route and portal page.
   - Recipient magic claim endpoints (`/api/claim/[token]`) authorize via the cryptographic `claimToken` and verify gift expiration/state before permitting redemption.

## Consequences
- **Positive**: Every role experiences a tailored onboarding flow that creates the exact domain records required; zero external OAuth service dependencies required to run locally or in CI.
- **Negative**: Session cookie signing secret (`AUTH_SECRET`) must be configured in production environment variables.
