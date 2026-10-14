# Spec 02: Regional Gift Vendor Portal & Catalog Fulfillment

## 1. Overview
Enables gift suppliers across global regions (`NA`, `EMEA`, `APAC`, `LATAM`) to manage their regional coverage, list products across Snappy budget tiers ($25, $50, $100, $250+), control stock inventory, and fulfill recipient-claimed gift orders.

## 2. API Endpoints & Workflows

### 2.1 Vendor Dashboard Summary (`GET /api/vendor/dashboard`)
- Returns vendor profile (`status`, `supportedRegions`, `commissionRateBps`, `payoutBalanceCents`, `slaDays`), catalog products, incoming fulfillment orders (`GiftOrder`), and KPI metrics (total revenue, pending shipments, delivered orders, average margin).

### 2.2 Regional Profile Update (`PATCH /api/vendor/profile`)
- Allows vendor to update `businessName`, `hqCountry`, `supportedRegions` (`NA`, `EMEA`, `APAC`, `LATAM`), and `slaDays`.

### 2.3 Product Catalog CRUD (`POST /api/vendor/products`, `PATCH /api/vendor/products/[id]`)
- **Create Product**:
  - Inputs: `title`, `description`, `category` (`Tech`, `Wellness`, `Gourmet`, `Home & Living`, `Apparel & Swag`, `Experiences`), `priceCents`, `wholesaleCostCents`, `imageUrl`, `stockQuantity`, `supportedRegions` (must be subset of or valid regions `NA`, `EMEA`, `APAC`, `LATAM`), `collectionIds` (optional global collections to attach to).
- **Update Product**:
  - Allows adjusting `stockQuantity`, `priceCents`, `supportedRegions`, and `active` flag.

### 2.4 Order Fulfillment State Machine (`PATCH /api/vendor/orders/[id]/fulfill`)
- **Valid Transitions**:
  - `PENDING_VENDOR` -> `PROCESSING`
  - `PENDING_VENDOR` or `PROCESSING` -> `SHIPPED` (requires `trackingCarrier` and `trackingNumber`; sets `shippedAt`)
  - `SHIPPED` -> `DELIVERED` (sets `deliveredAt`)
- **Synchronized GiftSend Status**:
  - Updating `GiftOrder.fulfillmentStatus` atomically updates the parent `GiftSend.status` (`PROCESSING`, `SHIPPED`, `DELIVERED`) so both the Corporate Sender and the Recipient see real-time progress.

## 3. Acceptance Criteria
- Vendors can only view and fulfill orders belonging to their `vendorId`.
- Creating or editing a product immediately affects regional recipient claim eligibility.
- Transitioning an order to `SHIPPED` stores carrier and tracking number visible on the recipient's claim tracking page.
