# Snappy Gifting Platform: Domain Research & Analysis

## 1. Executive Summary & Business Model

**Snappy** is an enterprise-grade, choice-driven corporate gifting and recognition platform. Unlike traditional corporate gifting where a sender guesses what item to ship and manually collects home addresses upfront, Snappy inverts the flow using the **"Power of Choice"**:

1. **Sender sets budget & theme**: A corporate customer selects a budget tier ($25, $50, $100, $250, $500+), a curated or custom gift collection, and custom branding (logo, greeting message, reveal theme).
2. **Digital delivery without upfront address**: Gifts are dispatched via email, SMS, Slack/Teams, or shareable magic claim links. No recipient shipping address is needed by the corporate sender.
3. **Interactive unwrapping & localized choice**: The recipient opens an interactive digital gift experience, selects their region/country, and chooses the exact item they want from a region-available curated collection—or opts to donate the gift value to a verified charity.
4. **Privacy-first fulfillment**: The recipient enters their shipping address directly into the claim portal (kept private from the corporate sender if configured) and optionally sends a thank-you note back to the sender.
5. **Regional Vendor Routing & Escrow Settlement**: Once claimed, the order is routed to the appropriate regional vendor/supplier covering that territory (`NA`, `EMEA`, `APAC`, `LATAM`). Corporate funds are only finalized/captured upon claim (or held in corporate wallet escrow, with unclaimed gifts automatically refunded upon expiration). Platform revenue comes from vendor marketplace margins (typically 15–25% wholesale-to-retail spread) and enterprise SaaS/swag tier features.

---

## 2. Core Roles & User Journeys

### 2.1 Role 1: Corporate Customer (`CORPORATE`)
**Personas**: HR Leaders, People Ops, Sales Account Executives, Marketing Campaign Managers, Department Heads.

#### Enrollment & Authentication Flow
- **Corporate Workspace Enrollment**:
  - Work email verification (`name@company.com`), company name, industry, employee headcount, primary billing region, and initial brand kit (company logo mark, primary accent color, default sender signature).
  - Supports multi-member workspaces (`COMPANY_ADMIN`, `CAMPAIGN_MANAGER`, `SENDER`) and SSO/password authentication.
- **Core Capabilities**:
  - **Budget & Wallet Ledger**: Deposit funds into corporate balance, configure department budgets, view escrow holds for pending unclaimed gifts, automatic credit release when gifts expire unclaimed, and itemized invoice history.
  - **Collection Selection & Custom Curation**: Choose platform-curated collections (e.g., *Tech & Home Office*, *Wellness & Self-Care*, *Gourmet & Treats*, *Milestone Luxury*) filtered by budget ceiling ($25, $50, $100, $250+) and destination regions, or assemble custom company collections.
  - **Campaign Creation & Automation**:
    - *One-Off & Bulk Send*: Add individual recipients or bulk import CSV lists with custom delivery schedules and expiration windows.
    - *Automated Milestone Triggers*: Rules for birthdays, work anniversaries, and new-hire onboarding.
    - *Branded Experience*: Custom digital card message, banner styling, and reveal animation style.
  - **Analytics & Engagement Wall**: Track sent -> opened -> claimed -> shipped -> delivered conversion funnel, budget utilization, regional breakdown, and a live "Gratitude Wall" of recipient thank-you notes.

---

### 2.2 Role 2: Regional Gift Vendor / Provider (`VENDOR`)
**Personas**: Brand Partners, Regional Fulfillment Warehouses, Artisanal Makers, Electronics Distributors, Experience Providers.

#### Enrollment & Authentication Flow
- **Vendor Partner Application & Onboarding**:
  - Business registration details (legal entity name, tax/VAT ID, support contact), headquarters country, **Supported Fulfillment Regions** (`NA` - North America, `EMEA` - Europe/Middle East/Africa, `APAC` - Asia-Pacific, `LATAM` - Latin America), SLA shipping lead time, and payout bank/Stripe Connect details.
  - Vendors start in `PENDING_REVIEW` or `APPROVED` status (managed by Platform Administrators) and log in via the dedicated Vendor Partner Portal.
- **Core Capabilities**:
  - **Regional Catalog & SKU Management**: Create and manage gift products with wholesale cost, retail budget tier price, category, high-resolution imagery, stock quantity, and supported shipping regions (`NA`, `EMEA`, `APAC`, `LATAM`) plus specific country ISO codes.
  - **Inventory & Region Availability Control**: Real-time stock adjustments, active/paused SKU toggles, and regional SLA settings.
  - **Fulfillment Queue & Order Processing**: View incoming claimed gift orders routed to the vendor, inspect recipient shipping destination, transition order states (`PROCESSING` -> `SHIPPED` -> `DELIVERED`), attach carrier & tracking number, and trigger automated recipient tracking notifications.
  - **Settlement & Payout Ledger**: Track gross retail value, platform commission fee, net vendor payout, and fulfillment SLA metrics.

---

### 2.3 Role 3: End-User Gift Recipient (`RECIPIENT`)
**Personas**: Employees celebrating milestones, Sales prospects, VIP clients, Event attendees.

#### Enrollment & Authentication Flow
- **Frictionless Claim Token + Optional Recipient Account**:
  - **Magic Claim Link / Claim Code Access**: Recipients can immediately access their gift via a unique cryptographic claim token (`/claim/[token]`) or enter a 6-character claim code + email verification without mandatory password creation.
  - **Recipient Portal Login**: Recipients can also sign in/enroll with their email to view all past and active gifts across multiple employers/senders, track shipments, manage saved shipping addresses, and set dietary/size preferences.
- **Core Capabilities**:
  - **Interactive Gift Reveal**: Personalized digital unwrapping experience displaying the sender's name, company logo, occasion badge, and personal message.
  - **Region-Aware Choice Catalog**: Recipients confirm their delivery region (`NA`, `EMEA`, `APAC`, `LATAM`) and country; the catalog dynamically filters to only show in-stock products from approved vendors that ship to that region within the campaign's budget ceiling.
  - **Charity Donation Alternative**: Recipients who prefer not to receive a physical item can choose to donate 100% of their gift budget value to a verified global charity (e.g., * Clean Water Initiative*, *Global Reforestation Fund*, *STEM Education Alliance*).
  - **Privacy-Preserving Address & Thank-You Note**: Submit shipping details (street, city, state/province, postal code, country, phone) with address privacy guarantees, write a thank-you note to the sender, and track real-time shipment status (`CLAIMED` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`).

---

### 2.4 Role 4: Platform Administrator (`ADMIN`)
**Personas**: Snappy Operations Team, Merchandising Curators, Trust & Safety / Finance Ops.

#### Enrollment & Authentication Flow
- **Privileged Admin Authentication**:
  - Restricted `@snappy.internal` / platform admin credentials with role guard (`ADMIN`) and audit logging on every state-mutating action.
- **Core Capabilities**:
  - **Vendor Vetting & Governance**: Review vendor applications, approve/suspend regional vendors, verify SLA compliance, and set platform commission rates.
  - **Global Merchandising & Curated Collections**: Assemble official Snappy Collections across budget tiers ($25, $50, $100, $250+) by combining top-rated vendor products across all regions (`NA`, `EMEA`, `APAC`, `LATAM`).
  - **Charity Partner Management**: Manage verified charitable organizations available in the recipient claim flow.
  - **Platform Financials, Escrow & Reclaim Engine**: Monitor global GMV, corporate wallet escrow, vendor payouts, platform net commission revenue, and execute expired gift budget reclaim sweeps.
  - **System Audit Log**: Full visibility into cross-role security and operational events.
