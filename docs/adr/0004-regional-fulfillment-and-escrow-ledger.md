# ADR 0004: Regional Gift Fulfillment Routing & Corporate Escrow Ledger

## Status
Accepted

## Context
Corporate gifting spans international recipients (`NA`, `EMEA`, `APAC`, `LATAM`) and asynchronous redemption times (recipients may claim gifts hours or weeks after a campaign is sent, or never claim them at all).

Two critical domain problems must be solved:
1. **Regional Availability**: A recipient in `EMEA` or `APAC` must not select a physical product from a vendor that only ships within `NA`.
2. **Escrow Accounting**: Corporate senders should not lose funds for unclaimed gifts, nor should a recipient be able to claim a gift if the corporate budget is unbacked.

## Decision
1. **Four Canonical Fulfillment Regions**:
   - Standardize regions as `NA` (North America), `EMEA` (Europe, Middle East & Africa), `APAC` (Asia-Pacific), and `LATAM` (Latin America), alongside country ISO codes.
   - Both `Vendor` and `Product` define `supportedRegions`.
   - During the `/claim/[token]` flow, when a recipient selects their delivery region, the eligible gift catalog is filtered by:
     - `product.active == true && product.stockQuantity > 0`
     - `vendor.status == 'APPROVED'`
     - `product.priceCents <= giftSend.budgetCents`
     - `product.supportedRegions` includes `recipientRegion`
2. **Two-Phase Corporate Wallet & Escrow Ledger**:
   - **Send Phase (`SENT`)**: When a corporate user dispatches a `GiftSend` of `budgetCents`, `company.walletBalanceCents` is decremented by `budgetCents` and `company.escrowBalanceCents` is incremented by `budgetCents` (recorded as an `ESCROW_HOLD` wallet transaction).
   - **Claim Phase (`CLAIMED` / `DONATED`)**: When the recipient claims a product (or donates to charity), `company.escrowBalanceCents` is decremented by `budgetCents`. If the selected product costs less than `budgetCents`, the unused difference (`budgetCents - retailAmountCents`) is automatically credited back to `company.walletBalanceCents` (`ESCROW_SURPLUS_REFUND`)!
   - **Vendor Settlement**: For physical gifts, `platformFeeCents` (based on `vendor.commissionRateBps`) is retained by the platform, and `vendorPayoutCents = retailAmountCents - platformFeeCents` is credited to `vendor.payoutBalanceCents`.
   - **Expiration Sweep (`EXPIRED`)**: If a `GiftSend` passes `expiresAt` without being claimed, the reclaim job transitions it to `EXPIRED`, releases `budgetCents` from `escrowBalanceCents` back to `walletBalanceCents` (`EXPIRED_GIFT_REFUND`), and logs an audit entry.

## Consequences
- **Positive**: Mathematically sound double-entry-style corporate balance tracking; automatic savings when recipients pick lower-cost items or let gifts expire; zero cross-region unfulfillable orders.
- **Negative**: All send, claim, and expiration operations must execute inside atomic `prisma.$transaction` blocks.
