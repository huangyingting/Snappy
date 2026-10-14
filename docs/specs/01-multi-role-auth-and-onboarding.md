# Spec 01: Multi-Role Onboarding, Enrollment & Authentication

## 1. Overview
Provides tailored registration, onboarding, login, and role-based access control for all four Snappy platform actors:
- **Corporate Customers (`CORPORATE`)**
- **Regional Gift Vendors (`VENDOR`)**
- **Gift Recipients (`RECIPIENT`)**
- **Platform Administrators (`ADMIN`)**

## 2. User Flows & Endpoints

### 2.1 Corporate Enrollment (`POST /api/auth/enroll/corporate`)
- **Inputs**: `name`, `email`, `password`, `companyName`, `domain`, `industry`, `sizeBand`, `primaryRegion` (`NA` | `EMEA` | `APAC` | `LATAM`), `brandColor`, `hideRecipientAddress` (boolean), `initialDepositCents` (optional, default `$2,500.00` = `250000`).
- **Behavior**:
  1. Validates uniqueness of `email`.
  2. Creates `Company` with `walletBalanceCents = initialDepositCents`, `escrowBalanceCents = 0`.
  3. Creates initial `WalletTransaction` (`DEPOSIT`) if `initialDepositCents > 0`.
  4. Creates `User` with `role = 'CORPORATE'`, linked to `company.id`.
  5. Records `AuditLog` (`CORPORATE_ENROLLED`) and sets signed `snappy_session` cookie.

### 2.2 Regional Vendor Enrollment (`POST /api/auth/enroll/vendor`)
- **Inputs**: `name`, `email`, `password`, `businessName`, `taxId`, `hqCountry`, `supportedRegions` (non-empty subset of `['NA', 'EMEA', 'APAC', 'LATAM']`), `slaDays` (1–14).
- **Behavior**:
  1. Validates uniqueness of `email` and non-empty `supportedRegions`.
  2. Creates `Vendor` with `status = 'APPROVED'` (or `PENDING` if require-review flag passed, defaults to `APPROVED` for instant onboarding with admin override), `commissionRateBps = 1500` (15%).
  3. Creates `User` with `role = 'VENDOR'`, linked to `vendor.id`.
  4. Records `AuditLog` (`VENDOR_ENROLLED`) and sets signed `snappy_session` cookie.

### 2.3 Recipient Enrollment & Magic Claim Lookup (`POST /api/auth/enroll/recipient` & `POST /api/auth/claim-lookup`)
- **Recipient Account Registration**:
  - **Inputs**: `name`, `email`, `password`, `preferredRegion` (`NA` | `EMEA` | `APAC` | `LATAM`), optional default shipping address fields.
  - **Behavior**: Creates `User` (`role = 'RECIPIENT'`) and automatically links any existing `GiftSend` records matching `recipientEmail == email`.
- **Magic Claim Code / Email Lookup (`POST /api/auth/claim-lookup`)**:
  - **Inputs**: `claimCode` (e.g. `SNPY-8842` or token) and optional `email`.
  - **Behavior**: Resolves the matching `GiftSend` and returns its `claimToken` redirect URL (`/claim/[claimToken]`).

### 2.4 Unified Login, Quick Demo Switcher & Logout
- `POST /api/auth/login`: Authenticates `email` + `password` (with optional expected `role` check), issues `snappy_session` cookie, and returns role-specific redirect path (`/corporate`, `/vendor`, `/recipient`, `/admin`).
- `POST /api/auth/demo-switch`: Allows instant switching between seeded demo personas (`CORPORATE`, `VENDOR` NA/EMEA/APAC, `RECIPIENT`, `ADMIN`) for rapid evaluation and E2E testing.
- `POST /api/auth/logout`: Clears `snappy_session` cookie.
- `GET /api/auth/me`: Returns current authenticated user alongside their `company` or `vendor` entity.

## 3. Acceptance Criteria
- Each role has a dedicated enrollment/login UI at `/auth/corporate`, `/auth/vendor`, `/auth/recipient`, and `/auth/admin`.
- Unauthorized access to `/api/corporate/*`, `/api/vendor/*`, `/api/recipient/*`, or `/api/admin/*` returns HTTP `401` or `403`.
