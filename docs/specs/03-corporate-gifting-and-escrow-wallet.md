# Spec 03: Corporate Gifting Portal, Campaigns & Escrow Wallet

## 1. Overview
Empowers corporate teams (HR, Sales, Marketing, Ops) to fund their company wallet, curate or select themed gift collections, launch individual/bulk/automated gifting campaigns without needing recipient home addresses upfront, and track engagement & ROI.

## 2. API Endpoints & Workflows

### 2.1 Corporate Dashboard (`GET /api/corporate/dashboard`)
- Returns company profile (`walletBalanceCents`, `escrowBalanceCents`, `brandColor`, `hideRecipientAddress`), wallet ledger history (`WalletTransaction`), available global & custom `Collection`s, active `Campaign`s, all dispatched `GiftSend`s (with privacy-redacted recipient shipping addresses when `hideRecipientAddress == true`), and recipient thank-you notes.

### 2.2 Wallet Funding (`POST /api/corporate/wallet/deposit`)
- Inputs: `amountCents` (min `1000` = $10.00), `note` (e.g., `"Q4 Employee Recognition Budget"`).
- Atomically increments `company.walletBalanceCents` and creates a `WalletTransaction` (`type = 'DEPOSIT'`).

### 2.3 Custom Collection Builder (`POST /api/corporate/collections`)
- Inputs: `title`, `description`, `occasion`, `budgetTierCents`, `productIds` (array of active product IDs).
- Creates a company-scoped `Collection` (`isGlobal = false`, `companyId = company.id`) and links `CollectionProduct` rows.

### 2.4 Campaign Creation & Gift Dispatch (`POST /api/corporate/campaigns` & `POST /api/corporate/campaigns/[id]/send`)
- **Create Campaign (`POST /api/corporate/campaigns`)**:
  - Inputs: `title`, `occasion` (`Birthday`, `Work Anniversary`, `Onboarding`, `Client Appreciation`, `Holiday`, `Spot Recognition`), `messageTemplate`, `budgetCents`, `collectionId`, `triggerType` (`MANUAL`, `BULK_CSV`, `AUTOMATED_MILESTONE`), `allowCharity` (boolean), `expiresInDays` (default 30), and optional initial `recipients` list (`[{ name, email, preferredRegion, personalMessage }]`).
- **Send Gifts (`POST /api/corporate/campaigns/[id]/send`)**:
  - Accepts one or many recipients (`[{ name, email, preferredRegion, personalMessage }]`).
  - Calculates `totalRequiredCents = recipients.length * campaign.budgetCents`.
  - Verifies `company.walletBalanceCents >= totalRequiredCents` (returns HTTP `400` if insufficient balance).
  - In a single Prisma transaction:
    1. Deducts `totalRequiredCents` from `company.walletBalanceCents` and adds to `company.escrowBalanceCents`.
    2. Logs `WalletTransaction` (`type = 'ESCROW_HOLD'`, `amountCents = -totalRequiredCents`).
    3. Creates a `GiftSend` per recipient with a unique `claimToken` (`snappy_...`) and short `claimCode` (`SNPY-XXXX`).

### 2.5 Company Branding & Privacy Settings (`PATCH /api/corporate/settings`)
- Updates `name`, `brandColor`, `primaryRegion`, and `hideRecipientAddress`.

## 3. Acceptance Criteria
- Dispatched gifts reserve exact funds in `escrowBalanceCents`.
- Corporate dashboard hides street/postal shipping details when `hideRecipientAddress` is active, showing only region/country and delivery status.
- Gratitude Wall renders all recipient thank-you notes in real time.
