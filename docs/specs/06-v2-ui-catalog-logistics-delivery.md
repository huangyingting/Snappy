# Specification 06: V2 Snappy Atelier UI, Gift Categories, Product Studio, Carrier Logistics & Recipient Delivery Management

## 1. "Snappy Atelier" Design System & Layout Architecture
- **Typography**:
  - Display Headings: `Fraunces` (editorial serif for unboxing moments, hero headlines, and collection titles)
  - UI & Body: `Plus Jakarta Sans` (crisp modern sans-serif)
  - Financial & Logistics Telemetry: `JetBrains Mono` (SKUs, tracking numbers, escrow ledger figures)
- **Workspace Navigation Pattern**:
  - Replace long multi-form scrolling pages with **Segmented Workspace Tabs** and **Slide-Over Drawers / Modals** so each view is focused, scannable, and high-craft.

## 2. Gift Categories & Product Catalog Management
- **`GiftCategory` Entity**:
  - `id`, `slug`, `name`, `description`, `icon`, `accentColor`, `heroImageUrl`, `displayOrder`, `featured`, `active`.
- **Enhanced `Product` Entity**:
  - `categoryId` (relation to `GiftCategory`), `category` (display name), `sku`, `merchandisingBadge`, `tagsJson` (dietary, sustainability, occasion tags), `variantsJson` (selectable options such as Colorway, Size, Roast), `specificationsJson` (weightGrams, originCountry, leadTimeDays, sustainabilityNote), `featured` flag, and `status` (`ACTIVE`, `OUT_OF_STOCK`, `ARCHIVED`).
- **Vendor & Admin Product Studio**:
  - Full CRUD: Create SKU, Edit SKU via slide-over drawer, Duplicate/Clone SKU, Quick Restock (`+10`, `+50`), Archive/Activate toggle, and **AI Studio Image Generator** (`POST /api/ai/generate-product-image`) powered by the `.env` Azure MAI-Image model.

## 3. Multi-Checkpoint Carrier Logistics (`Order` + `ShipmentEvent`)
- **Carrier & Hub Telemetry on `Order`**:
  - `carrier` (`FedEx`, `UPS`, `DHL Express`, `Yamato Transport`, `Royal Mail`)
  - `serviceLevel` (`International Priority`, `2-Day Air`, `Carbon-Neutral Ground`, `White-Glove Express`)
  - `fulfillmentWarehouse` (`Newark, NJ (NA-East Hub)`, `Rotterdam, NL (EMEA Hub)`, `Osaka, JP (APAC Hub)`, `São Paulo, BR (LATAM Hub)`)
  - `trackingNumber`, `trackingUrl`, `packageWeightGrams`, `estimatedDeliveryAt`, `shippedAt`, `deliveredAt`, `selectedVariant`, `deliveryInstructions`, `addressLocked`, `exceptionNote`.
- **Chronological `ShipmentEvent` Checkpoints**:
  - Stages: `ORDER_CONFIRMED`, `WAREHOUSE_ALLOCATED`, `PACKED_QA`, `CARRIER_PICKED_UP`, `IN_TRANSIT_HUB`, `CUSTOMS_CLEARED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `EXCEPTION`.
  - When a checkpoint reaches `CARRIER_PICKED_UP` or beyond, `Order.addressLocked` automatically becomes `true`.

## 4. User Delivery Management & Self-Service Gift Swap
- **Recipient Saved Address Book (`RecipientAddress`)**:
  - Recipients can save, edit, delete, and set default shipping addresses (`Home`, `Office`, `Studio`, etc.) with regional routing (`NA`, `EMEA`, `APAC`, `LATAM`) and default delivery instructions.
  - One-click address autofill during `/claim/[token]`.
- **Pre-Shipment Delivery Address & Instructions Edit**:
  - While `Order.addressLocked === false` (`PROCESSING`), recipients can update the shipping address, recipient phone, selected variant, or delivery instructions on an already-claimed order.
- **Pre-Shipment Self-Service Gift Swap (`POST /api/recipient/orders/[orderId]/swap`)**:
  - While `Order.addressLocked === false`, recipients can swap their claimed gift for another eligible regional product within `invitation.budgetCents`, automatically reconciling corporate escrow surplus and vendor wholesale balances.
