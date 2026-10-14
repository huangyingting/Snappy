# Spec 04: End-User Recipient Claim Experience & Recipient Portal

## 1. Overview
Delivers Snappy's signature interactive gift reveal, regional catalog filtering, physical gift or charity redemption, privacy-first shipping submission, thank-you note composition, and multi-gift recipient dashboard.

## 2. API Endpoints & Workflows

### 2.1 Inspect Claim Token (`GET /api/claim/[token]?region=NA`)
- Public/token-authenticated endpoint.
- Transitions `GiftSend.status` from `SENT` -> `OPENED` on first view.
- Checks if `expiresAt < now()` and status is still unclaimed; if expired, reports expired state.
- Filters eligible products:
  - If the campaign is linked to a `Collection`, starts with products in that collection (plus falls back to all approved products within `budgetCents` if a collection has no items for that specific region, ensuring recipients in any region always have great choices).
  - Filters by `product.active == true`, `product.stockQuantity > 0`, `vendor.status == 'APPROVED'`, `product.priceCents <= giftSend.budgetCents`, and `product.supportedRegions` containing the selected `region` (`NA`, `EMEA`, `APAC`, `LATAM`).
- Returns sender company branding (`name`, `brandColor`, `logoUrl`), personal message, occasion, eligible regional products, and verified `Charity` options (if `campaign.allowCharity == true`).

### 2.2 Redeem Gift or Donate (`POST /api/claim/[token]/redeem`)
- **Mode A: Physical Gift (`orderType = 'PHYSICAL_GIFT'`)**:
  - Inputs: `productId`, `recipientRegion` (`NA` | `EMEA` | `APAC` | `LATAM`), `shippingName`, `shippingAddressLine1`, `shippingCity`, `shippingState`, `shippingPostalCode`, `shippingCountry`, `thankYouNote` (optional).
  - Validations: GiftSend is in `SENT` or `OPENED` state and not expired; Product is active, in stock (`stockQuantity > 0`), ships to `recipientRegion`, and `priceCents <= giftSend.budgetCents`.
  - Atomic Transaction:
    1. Decrements `product.stockQuantity` by 1.
    2. Calculates `retailAmountCents = product.priceCents`, `platformFeeCents = Math.round(retailAmountCents * vendor.commissionRateBps / 10000)`, `vendorPayoutCents = retailAmountCents - platformFeeCents`, and `surplusRefundCents = giftSend.budgetCents - retailAmountCents`.
    3. Releases `giftSend.budgetCents` from `company.escrowBalanceCents`.
    4. If `surplusRefundCents > 0`, credits `surplusRefundCents` back to `company.walletBalanceCents` and creates a `WalletTransaction` (`ESCROW_SURPLUS_REFUND`).
    5. Credits `vendorPayoutCents` to `vendor.payoutBalanceCents`.
    6. Creates `GiftOrder` (`fulfillmentStatus = 'PENDING_VENDOR'`) and updates `GiftSend` (`status = 'CLAIMED'`, `claimedAt = now()`, `thankYouNote`).
- **Mode B: Charity Donation (`orderType = 'CHARITY_DONATION'`)**:
  - Inputs: `charityId`, `recipientRegion`, `thankYouNote` (optional).
  - Atomic Transaction:
    1. Releases `giftSend.budgetCents` from `company.escrowBalanceCents`.
    2. Increments `charity.totalDonatedCents` by `giftSend.budgetCents`.
    3. Creates `GiftOrder` (`orderType = 'CHARITY_DONATION'`, `retailAmountCents = giftSend.budgetCents`, `fulfillmentStatus = 'COMPLETED'`) and updates `GiftSend` (`status = 'DONATED'`, `claimedAt = now()`, `thankYouNote`).

### 2.3 Submit / Update Thank-You Note (`POST /api/claim/[token]/thank-you`)
- Allows a recipient who already claimed their gift to add or update their thank-you message to the corporate sender.

### 2.4 Recipient Portal (`GET /api/recipient/gifts`)
- Returns all `GiftSend`s associated with the logged-in recipient's email or `recipientUserId`, including order status, tracking carrier/number, and quick links to claim pending gifts.
