# ADR 0005: V2 Gift Taxonomy, Product Studio, Multi-Checkpoint Logistics & AI Studio Imagery

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

While V1 established the core four-role gifting lifecycle (Corporate escrow wallets, Regional Vendor SKUs, Recipient choice/donation claims, and Admin governance), production corporate gifting platforms such as **Snappy**, **Goody**, **Reachdesk**, and **Sendoso** require deeper operational capabilities and a distinctive visual identity:

1. **Editorial Luxury & Modern GenAI UI**: Corporate gifting is an emotional, high-trust touchpoint. A generic utility dashboard fails to convey the delight of gifting. The platform needs a bespoke design language (**"Snappy Atelier"**) combining editorial serif display typography (`Fraunces`), geometric UI precision (`Plus Jakarta Sans`), and monospace financial/logistics telemetry (`JetBrains Mono`), paired with segmented workspace tabs and slide-over drawers to eliminate visual clutter.
2. **Structured Gift Categories & Faceted Product Management**: Vendors and Admins need first-class `GiftCategory` taxonomy management, full product lifecycle CRUD (create, edit, duplicate/clone, restock, archive), selectable product variants (colorways, sizes, roasts), merchandising badges, sustainability/dietary tags, and technical specifications.
3. **AI Studio Product Photography (`MAI-Image-2.6-Flash` / `MAI-Image-2`)**: Rather than flat placeholder icons, catalog items should feature photorealistic editorial studio photography generated via Azure AI Foundry's `MAI-Image-2.6-Flash` / `MAI-Image-2` models (`/mai/v1/images/generations`), both pre-generated in `public/images/gifts/` and available on-demand in the Vendor/Admin Product Studio.
4. **Multi-Checkpoint Carrier Logistics (`ShipmentEvent`)**: Real-world fulfillment progresses through distinct carrier milestones (`ORDER_CONFIRMED` → `WAREHOUSE_ALLOCATED` → `PACKED_QA` → `CARRIER_PICKED_UP` → `IN_TRANSIT_HUB` → `CUSTOMS_CLEARED` → `OUT_FOR_DELIVERY` → `DELIVERED` / `EXCEPTION`) with regional warehouse hubs, carrier service levels, package weights, and estimated delivery dates.
5. **Recipient Delivery Management & Self-Service Gift Swap**: Recipients need a saved `RecipientAddress` book for 1-click checkout, the ability to edit their delivery address or drop-off instructions while an order is still in `PROCESSING` (prior to carrier pickup lock), and the ability to **Swap Gift** for another item in their collection/budget tier with automatic transactional corporate escrow surplus reconciliation.

## Decisions

1. **First-Class `GiftCategory`, `ShipmentEvent`, and `RecipientAddress` Models**:
   - Introduce `GiftCategory` linked one-to-many with `Product` while preserving backward-compatible `category` slug/label fields.
   - Introduce `ShipmentEvent` linked one-to-many with `Order` to record chronological carrier checkpoints with timestamps, locations, and status codes.
   - Introduce `RecipientAddress` linked to `User` (or matched by recipient email) to store reusable regional delivery profiles (`Home`, `Office`, etc.) with default selection and delivery notes.
2. **Transactional Pre-Shipment Gift Swap**:
   - While `Order.status === "PROCESSING"` and `Order.addressLocked === false`, a recipient may swap their selected product for another eligible product (`retailPriceCents <= invitation.budgetCents`, matching region and stock).
   - Inside a single Prisma `$transaction`, the system restores stock on the previous product, decrements stock on the new product, computes `escrowDeltaCents = oldProduct.retailPriceCents - newProduct.retailPriceCents`, credits/debits the corporate `Company.walletBalanceCents` accordingly, adjusts old and new `Vendor.balanceCents` wholesale payouts, writes a `WalletTransaction` audit entry, and appends a `ShipmentEvent`.
3. **Azure AI Foundry `MAI-Image` Integration**:
   - Read the API key from `.env` (`MAI_IMAGE_API_KEY` or raw key string) and call `https://icsuaaieus.services.ai.azure.com/mai/v1/images/generations` to generate 1024×1024 studio product PNGs saved to `public/images/gifts/`.
