import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = "snappy_salt_v1";
  const derived = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
  return `pbkdf2_v1$${derived}`;
}

function makeProductSvgDataUri(title: string, category: string, bgHex: string, accentHex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgHex}" />
        <stop offset="100%" stop-color="${accentHex}" />
      </linearGradient>
    </defs>
    <rect width="640" height="440" rx="28" fill="url(#g)" />
    <circle cx="530" cy="90" r="110" fill="rgba(255,255,255,0.12)" />
    <circle cx="110" cy="360" r="140" fill="rgba(255,255,255,0.08)" />
    <rect x="44" y="40" width="150" height="36" rx="18" fill="rgba(255,255,255,0.2)" />
    <text x="119" y="64" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">${category.toUpperCase()}</text>
    <text x="48" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="800" fill="#ffffff">${title.replace(/&/g, "&amp;")}</text>
    <text x="48" y="272" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="rgba(255,255,255,0.85)">Curated Snappy Marketplace Selection</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function seedDatabase() {
  const defaultPasswordHash = hashPassword("SnappyPass123!");

  // Clear existing data in dependency order
  await prisma.auditLog.deleteMany();
  await prisma.giftOrder.deleteMany();
  await prisma.giftSend.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.collectionProduct.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.product.deleteMany();
  await prisma.charity.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.company.deleteMany();

  // 1. Platform Admin
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@snappy.com",
      passwordHash: defaultPasswordHash,
      name: "claire.admin (Platform Ops)",
      role: "ADMIN",
      jobTitle: "VP of Marketplace & Trust",
      preferredRegion: "NA",
    },
  });

  // 2. Corporate Customers
  const acmeCompany = await prisma.company.create({
    data: {
      name: "Acme Cloud Corp",
      slug: "acme-cloud",
      domain: "acmecloud.io",
      industry: "Cloud Infrastructure & AI",
      sizeBand: "1001-5000",
      primaryRegion: "NA",
      brandColor: "#4F46E5",
      walletBalanceCents: 1245000, // $12,450.00 available
      escrowBalanceCents: 35000,   // $350.00 held in escrow for active unclaimed gifts
      hideRecipientAddress: true,
    },
  });

  const acmeUser = await prisma.user.create({
    data: {
      email: "sarah.chen@acmecloud.io",
      passwordHash: defaultPasswordHash,
      name: "Sarah Chen",
      role: "CORPORATE",
      jobTitle: "Head of People & Culture",
      preferredRegion: "NA",
      companyId: acmeCompany.id,
    },
  });

  const novaCompany = await prisma.company.create({
    data: {
      name: "Nova FinTech Global",
      slug: "nova-fintech",
      domain: "novafintech.com",
      industry: "Financial Services",
      sizeBand: "201-1000",
      primaryRegion: "EMEA",
      brandColor: "#0D9488",
      walletBalanceCents: 820000,
      escrowBalanceCents: 0,
      hideRecipientAddress: true,
    },
  });

  await prisma.user.create({
    data: {
      email: "marcus.vance@novafintech.com",
      passwordHash: defaultPasswordHash,
      name: "Marcus Vance",
      role: "CORPORATE",
      jobTitle: "Director of Enterprise Gifting",
      preferredRegion: "EMEA",
      companyId: novaCompany.id,
    },
  });

  // Wallet transactions for Acme Cloud Corp
  await prisma.walletTransaction.createMany({
    data: [
      {
        companyId: acmeCompany.id,
        type: "DEPOSIT",
        amountCents: 1500000,
        balanceAfter: 1500000,
        escrowAfter: 0,
        note: "Annual People & Culture Gifting Budget Deposit",
        referenceId: "INV-2026-001",
      },
      {
        companyId: acmeCompany.id,
        type: "ESCROW_HOLD",
        amountCents: -255000,
        balanceAfter: 1245000,
        escrowAfter: 35000,
        note: "Q4 Global Milestone & Recognition Campaign Sends",
        referenceId: "CMP-GLOBAL-Q4",
      },
    ],
  });

  // 3. Regional Gift Vendors across NA, EMEA, APAC, LATAM
  const vendorApex = await prisma.vendor.create({
    data: {
      businessName: "Apex Tech & Audio Co.",
      slug: "apex-tech-audio",
      taxId: "US-EIN-84-2910482",
      status: "APPROVED",
      hqCountry: "US",
      supportedRegions: "NA,EMEA",
      commissionRateBps: 1500,
      slaDays: 2,
      payoutBalanceCents: 24225,
      rating: 4.95,
    },
  });

  await prisma.user.create({
    data: {
      email: "partner@apextech.io",
      passwordHash: defaultPasswordHash,
      name: "Devon Brooks (Apex Tech NA/EMEA)",
      role: "VENDOR",
      jobTitle: "Global Fulfillment Director",
      preferredRegion: "NA",
      vendorId: vendorApex.id,
    },
  });

  const vendorNordic = await prisma.vendor.create({
    data: {
      businessName: "Nordic Botanicals & Home",
      slug: "nordic-botanicals-home",
      taxId: "NL-VAT-88291041B01",
      status: "APPROVED",
      hqCountry: "NL",
      supportedRegions: "EMEA,NA",
      commissionRateBps: 1500,
      slaDays: 3,
      payoutBalanceCents: 8500,
      rating: 4.92,
    },
  });

  await prisma.user.create({
    data: {
      email: "oliver@nordichome.eu",
      passwordHash: defaultPasswordHash,
      name: "Oliver Lindqvist (Nordic EMEA)",
      role: "VENDOR",
      jobTitle: "Partner Operations Lead",
      preferredRegion: "EMEA",
      vendorId: vendorNordic.id,
    },
  });

  const vendorKyoto = await prisma.vendor.create({
    data: {
      businessName: "Kyoto Artisan & Roasters",
      slug: "kyoto-artisan-roasters",
      taxId: "JP-CORP-9011-44821",
      status: "APPROVED",
      hqCountry: "JP",
      supportedRegions: "APAC,NA",
      commissionRateBps: 1400,
      slaDays: 3,
      payoutBalanceCents: 12900,
      rating: 4.98,
    },
  });

  await prisma.user.create({
    data: {
      email: "kenji@kyotoroasters.jp",
      passwordHash: defaultPasswordHash,
      name: "Kenji Sato (Kyoto APAC)",
      role: "VENDOR",
      jobTitle: "APAC Merchandising Head",
      preferredRegion: "APAC",
      vendorId: vendorKyoto.id,
    },
  });

  const vendorAndes = await prisma.vendor.create({
    data: {
      businessName: "Andes Verde Gourmet & Craft",
      slug: "andes-verde-craft",
      taxId: "BR-CNPJ-41.892.103/0001-90",
      status: "APPROVED",
      hqCountry: "BR",
      supportedRegions: "LATAM,NA",
      commissionRateBps: 1500,
      slaDays: 4,
      payoutBalanceCents: 6375,
      rating: 4.88,
    },
  });

  await prisma.user.create({
    data: {
      email: "sofia@andesverde.br",
      passwordHash: defaultPasswordHash,
      name: "Sofia Mendoza (Andes LATAM)",
      role: "VENDOR",
      jobTitle: "LATAM Logistics Manager",
      preferredRegion: "LATAM",
      vendorId: vendorAndes.id,
    },
  });

  const vendorPending = await prisma.vendor.create({
    data: {
      businessName: "Alpine Bespoke Experiences",
      slug: "alpine-bespoke-experiences",
      taxId: "CH-CHE-219.481.902",
      status: "PENDING",
      hqCountry: "CH",
      supportedRegions: "EMEA",
      commissionRateBps: 1800,
      slaDays: 2,
      payoutBalanceCents: 0,
      rating: 4.8,
    },
  });

  await prisma.user.create({
    data: {
      email: "lukas@alpine-exp.ch",
      passwordHash: defaultPasswordHash,
      name: "Lukas Meier (Pending Vendor)",
      role: "VENDOR",
      jobTitle: "Founder",
      preferredRegion: "EMEA",
      vendorId: vendorPending.id,
    },
  });

  // 4. Products across $25, $50, $100, $250 tiers & regions
  const p1 = await prisma.product.create({
    data: {
      vendorId: vendorKyoto.id,
      title: "Uji Ceremonial Matcha & Bamboo Whisk Set",
      description: "First-harvest stone-ground Uji matcha paired with a handcrafted 100-prong bamboo chasen and ceramic scoop.",
      category: "Gourmet",
      priceCents: 2500,
      wholesaleCostCents: 1800,
      imageUrl: makeProductSvgDataUri("Uji Ceremonial Matcha Set", "Gourmet", "#065F46", "#10B981"),
      stockQuantity: 120,
      supportedRegions: "APAC,NA,EMEA",
      isFeatured: true,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      vendorId: vendorAndes.id,
      title: "Single-Origin Specialty Coffee Trio",
      description: "Three 250g bags of micro-lot Arabica beans from Minas Gerais, Huila, and Tarrazú roasted to order.",
      category: "Gourmet",
      priceCents: 2500,
      wholesaleCostCents: 1750,
      imageUrl: makeProductSvgDataUri("Single-Origin Coffee Trio", "Gourmet", "#78350F", "#D97706"),
      stockQuantity: 95,
      supportedRegions: "LATAM,NA,EMEA",
      isFeatured: false,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      vendorId: vendorApex.id,
      title: "MagSafe Aluminum Desk Charging Dock",
      description: "CNC-machined aerospace aluminum 2-in-1 fast wireless charger for phone and earbuds with braided USB-C cable.",
      category: "Tech",
      priceCents: 4500,
      wholesaleCostCents: 3100,
      imageUrl: makeProductSvgDataUri("MagSafe Desk Dock", "Tech", "#1E1B4B", "#6366F1"),
      stockQuantity: 85,
      supportedRegions: "NA,EMEA,APAC",
      isFeatured: true,
    },
  });

  const p4 = await prisma.product.create({
    data: {
      vendorId: vendorNordic.id,
      title: "Scandinavian Botanical Spa & Candle Ritual Box",
      description: "Soy-beeswax birchwood candle, cold-pressed sea buckthorn bath oil, and organic linen eye pillow.",
      category: "Wellness",
      priceCents: 5000,
      wholesaleCostCents: 3600,
      imageUrl: makeProductSvgDataUri("Nordic Spa Ritual Box", "Wellness", "#134E4A", "#14B8A6"),
      stockQuantity: 70,
      supportedRegions: "EMEA,NA,APAC",
      isFeatured: true,
    },
  });

  const p5 = await prisma.product.create({
    data: {
      vendorId: vendorAndes.id,
      title: "Artisanal Cacao & Dulce Reserve Hamper",
      description: "Hand-tempered 70% dark Ecuadorian chocolate bars, Mendoza olive oil, and roasted marcona almonds.",
      category: "Gourmet",
      priceCents: 5000,
      wholesaleCostCents: 3500,
      imageUrl: makeProductSvgDataUri("Artisanal Cacao Hamper", "Gourmet", "#7C2D12", "#EA580C"),
      stockQuantity: 64,
      supportedRegions: "LATAM,NA",
      isFeatured: true,
    },
  });

  const p6 = await prisma.product.create({
    data: {
      vendorId: vendorApex.id,
      title: "Aura Pro Smart Temperature Control Mug",
      description: "Keeps coffee or tea at your exact preferred degree (120°F–145°F) for 3 hours with coaster charging base.",
      category: "Tech",
      priceCents: 9500,
      wholesaleCostCents: 7200,
      imageUrl: makeProductSvgDataUri("Smart Temp Control Mug", "Tech", "#0F172A", "#3B82F6"),
      stockQuantity: 52,
      supportedRegions: "NA,EMEA,APAC,LATAM",
      isFeatured: true,
    },
  });

  const p7 = await prisma.product.create({
    data: {
      vendorId: vendorNordic.id,
      title: "Merino & Gotland Wool Architectural Throw",
      description: "Loom-woven in Sweden from 100% traceable Nordic wool. Ultra-soft warmth for home studio or living room.",
      category: "Home & Living",
      priceCents: 10000,
      wholesaleCostCents: 7400,
      imageUrl: makeProductSvgDataUri("Nordic Wool Throw", "Home & Living", "#312E81", "#8B5CF6"),
      stockQuantity: 45,
      supportedRegions: "EMEA,NA",
      isFeatured: true,
    },
  });

  const p8 = await prisma.product.create({
    data: {
      vendorId: vendorKyoto.id,
      title: "Cast-Iron Tetsubin Teapot & Pour-Over Brewer",
      description: "Enameled Nambu Tekki cast-iron teapot with copper drip kettle and porcelain tasting cups.",
      category: "Home & Living",
      priceCents: 10000,
      wholesaleCostCents: 7500,
      imageUrl: makeProductSvgDataUri("Cast-Iron Tetsubin Set", "Home & Living", "#1E293B", "#0EA5E9"),
      stockQuantity: 40,
      supportedRegions: "APAC,NA,EMEA",
      isFeatured: true,
    },
  });

  const p9 = await prisma.product.create({
    data: {
      vendorId: vendorAndes.id,
      title: "Hand-Stitched Argentine Full-Grain Weekender",
      description: "Vegetable-tanned leather overnight duffle with padded laptop compartment and solid brass hardware.",
      category: "Apparel & Swag",
      priceCents: 10000,
      wholesaleCostCents: 7300,
      imageUrl: makeProductSvgDataUri("Argentine Leather Weekender", "Apparel & Swag", "#451A03", "#B45309"),
      stockQuantity: 35,
      supportedRegions: "LATAM,NA,EMEA",
      isFeatured: false,
    },
  });

  const p10 = await prisma.product.create({
    data: {
      vendorId: vendorApex.id,
      title: "Zenith ANC Studio Wireless Headphones",
      description: "Adaptive hybrid active noise cancellation, 45-hour battery life, spatial audio, and vegan leather travel case.",
      category: "Tech",
      priceCents: 24000,
      wholesaleCostCents: 18500,
      imageUrl: makeProductSvgDataUri("Zenith ANC Headphones", "Tech", "#111827", "#4F46E5"),
      stockQuantity: 30,
      supportedRegions: "NA,EMEA,APAC,LATAM",
      isFeatured: true,
    },
  });

  const p11 = await prisma.product.create({
    data: {
      vendorId: vendorNordic.id,
      title: "Barista Precision Conical Burr Espresso Station",
      description: "30-grind micro-step stainless conical burr grinder with digital scale and Italian walnut tamper.",
      category: "Home & Living",
      priceCents: 25000,
      wholesaleCostCents: 19000,
      imageUrl: makeProductSvgDataUri("Barista Espresso Station", "Home & Living", "#3F3F46", "#EC4899"),
      stockQuantity: 25,
      supportedRegions: "EMEA,NA,APAC",
      isFeatured: true,
    },
  });

  const p12 = await prisma.product.create({
    data: {
      vendorId: vendorKyoto.id,
      title: "Omakase Culinary Knife & Hinoki Board Set",
      description: "67-layer Damascus VG10 chef gyuto knife forged in Seki with a self-healing Japanese Hinoki cypress cutting board.",
      category: "Home & Living",
      priceCents: 25000,
      wholesaleCostCents: 18800,
      imageUrl: makeProductSvgDataUri("Damascus Knife & Hinoki Set", "Home & Living", "#0F172A", "#F43F5E"),
      stockQuantity: 22,
      supportedRegions: "APAC,NA,EMEA",
      isFeatured: true,
    },
  });

  // 5. Global Curated Snappy Collections
  const col25 = await prisma.collection.create({
    data: {
      title: "Everyday Gratitude & Coffee Break ($25)",
      description: "Perfect for spot recognition, thank-yous, and virtual coffee chats across global teams.",
      occasion: "Spot Recognition",
      budgetTierCents: 2500,
      isGlobal: true,
    },
  });

  const col50 = await prisma.collection.create({
    data: {
      title: "Remote Workspace & Wellness Essentials ($50)",
      description: "Curated desk upgrades, botanical spa rituals, and gourmet hampers for onboarding and birthdays.",
      occasion: "New Hire Onboarding",
      budgetTierCents: 5000,
      isGlobal: true,
    },
  });

  const col100 = await prisma.collection.create({
    data: {
      title: "Milestone Anniversary & Culture Collection ($100)",
      description: "Our #1 most popular collection for 1–5 year work anniversaries, promotions, and key client wins.",
      occasion: "Work Anniversary",
      budgetTierCents: 10000,
      isGlobal: true,
    },
  });

  const col250 = await prisma.collection.create({
    data: {
      title: "Executive VIP & President's Club Collection ($250)",
      description: "Flagship headphones, espresso stations, and Japanese culinary craftsmanship for top achievements.",
      occasion: "Client VIP Appreciation",
      budgetTierCents: 25000,
      isGlobal: true,
    },
  });

  await prisma.collectionProduct.createMany({
    data: [
      { collectionId: col25.id, productId: p1.id },
      { collectionId: col25.id, productId: p2.id },
      { collectionId: col50.id, productId: p1.id },
      { collectionId: col50.id, productId: p2.id },
      { collectionId: col50.id, productId: p3.id },
      { collectionId: col50.id, productId: p4.id },
      { collectionId: col50.id, productId: p5.id },
      { collectionId: col100.id, productId: p3.id },
      { collectionId: col100.id, productId: p4.id },
      { collectionId: col100.id, productId: p5.id },
      { collectionId: col100.id, productId: p6.id },
      { collectionId: col100.id, productId: p7.id },
      { collectionId: col100.id, productId: p8.id },
      { collectionId: col100.id, productId: p9.id },
      { collectionId: col250.id, productId: p6.id },
      { collectionId: col250.id, productId: p7.id },
      { collectionId: col250.id, productId: p8.id },
      { collectionId: col250.id, productId: p10.id },
      { collectionId: col250.id, productId: p11.id },
      { collectionId: col250.id, productId: p12.id },
    ],
  });

  // 6. Verified Charity Partners
  const charityOcean = await prisma.charity.create({
    data: {
      name: "Ocean Cleanse Foundation",
      category: "Environment & Climate",
      description: "Removes ocean plastic and restores coastal coral ecosystems across 14 countries.",
      totalDonatedCents: 185000,
      active: true,
    },
  });

  const charityForest = await prisma.charity.create({
    data: {
      name: "Global Reforestation Alliance",
      category: "Reforestation",
      description: "Plants native biodiversity corridors in the Amazon, Borneo, and Sub-Saharan Africa.",
      totalDonatedCents: 240000,
      active: true,
    },
  });

  await prisma.charity.create({
    data: {
      name: "Girls Who Build STEM",
      category: "Education & Equity",
      description: "Funds laptops, robotics labs, and coding scholarships for underrepresented students worldwide.",
      totalDonatedCents: 310000,
      active: true,
    },
  });

  // 7. Recipient Users
  const recipientAlex = await prisma.user.create({
    data: {
      email: "alex.rivera@acmecloud.io",
      passwordHash: defaultPasswordHash,
      name: "Alex Rivera",
      role: "RECIPIENT",
      jobTitle: "Staff Distributed Systems Engineer",
      preferredRegion: "NA",
      defaultAddressLine1: "742 Evergreen Terrace, Apt 4B",
      defaultCity: "Austin",
      defaultState: "TX",
      defaultPostalCode: "78701",
      defaultCountry: "US",
    },
  });

  const recipientElena = await prisma.user.create({
    data: {
      email: "elena.rostova@acmecloud.io",
      passwordHash: defaultPasswordHash,
      name: "Elena Rostova",
      role: "RECIPIENT",
      jobTitle: "Principal Product Designer",
      preferredRegion: "EMEA",
      defaultAddressLine1: "Keizersgracht 482",
      defaultCity: "Amsterdam",
      defaultState: "NH",
      defaultPostalCode: "1017 EG",
      defaultCountry: "NL",
    },
  });

  const recipientYuki = await prisma.user.create({
    data: {
      email: "yuki.tanaka@acmecloud.io",
      passwordHash: defaultPasswordHash,
      name: "Yuki Tanaka",
      role: "RECIPIENT",
      jobTitle: "Regional Solutions Architect",
      preferredRegion: "APAC",
      defaultAddressLine1: "1-2-3 Shibuya, Shibuya-ku",
      defaultCity: "Tokyo",
      defaultState: "Tokyo",
      defaultPostalCode: "150-0002",
      defaultCountry: "JP",
    },
  });

  // 8. Corporate Campaigns
  const campaignAnniversary = await prisma.campaign.create({
    data: {
      companyId: acmeCompany.id,
      createdByUserId: acmeUser.id,
      title: "Global Work Anniversary Milestones",
      occasion: "Work Anniversary",
      messageTemplate: "Happy Work Anniversary! Thank you for building the future of Acme Cloud with us. Pick something you love!",
      budgetCents: 10000,
      collectionId: col100.id,
      status: "ACTIVE",
      triggerType: "AUTOMATED_MILESTONE",
      allowCharity: true,
      expiresInDays: 30,
    },
  });

  const campaignOnboarding = await prisma.campaign.create({
    data: {
      companyId: acmeCompany.id,
      createdByUserId: acmeUser.id,
      title: "New Hire Welcome & Remote Setup",
      occasion: "New Hire Onboarding",
      messageTemplate: "Welcome to the team! Choose a welcome gift for your home workspace.",
      budgetCents: 5000,
      collectionId: col50.id,
      status: "ACTIVE",
      triggerType: "BULK_CSV",
      allowCharity: true,
      expiresInDays: 30,
    },
  });

  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 25);
  const pastExpiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5);
  const recentClaimDate = new Date(Date.now() - 1000 * 60 * 60 * 36);

  // 9. GiftSends across lifecycle states
  // (A) Ready to claim in NA ($100 budget)
  await prisma.giftSend.create({
    data: {
      campaignId: campaignAnniversary.id,
      companyId: acmeCompany.id,
      recipientEmail: recipientAlex.email,
      recipientName: recipientAlex.name,
      recipientUserId: recipientAlex.id,
      preferredRegion: "NA",
      claimToken: "snappy_demo_na_100",
      claimCode: "SNPY-NA100A",
      budgetCents: 10000,
      status: "SENT",
      personalMessage: "Happy 3-Year Anniversary at Acme Cloud, Alex! Your reliability engineering leadership has been phenomenal. Pick your favorite milestone gift!",
      expiresAt: futureDate,
    },
  });

  // (B) Ready to claim in EMEA ($100 budget)
  await prisma.giftSend.create({
    data: {
      campaignId: campaignAnniversary.id,
      companyId: acmeCompany.id,
      recipientEmail: recipientElena.email,
      recipientName: recipientElena.name,
      recipientUserId: recipientElena.id,
      preferredRegion: "EMEA",
      claimToken: "snappy_demo_emea_100",
      claimCode: "SNPY-EU100B",
      budgetCents: 10000,
      status: "OPENED",
      personalMessage: "Congratulations on 2 years with Acme EMEA in Amsterdam, Elena! Enjoy choosing a gift from our European partner collection.",
      expiresAt: futureDate,
    },
  });

  // (C) Ready to claim in APAC ($50 budget)
  await prisma.giftSend.create({
    data: {
      campaignId: campaignOnboarding.id,
      companyId: acmeCompany.id,
      recipientEmail: recipientYuki.email,
      recipientName: recipientYuki.name,
      recipientUserId: recipientYuki.id,
      preferredRegion: "APAC",
      claimToken: "snappy_demo_apac_50",
      claimCode: "SNPY-AP50C1",
      budgetCents: 5000,
      status: "SENT",
      personalMessage: "Welcome to Acme APAC in Tokyo, Yuki! Select a welcome treat to kick off your onboarding week.",
      expiresAt: futureDate,
    },
  });

  // (D) Ready to claim in LATAM ($50 budget)
  await prisma.giftSend.create({
    data: {
      campaignId: campaignOnboarding.id,
      companyId: acmeCompany.id,
      recipientEmail: "mateo.silva@acmecloud.io",
      recipientName: "Mateo Silva",
      preferredRegion: "LATAM",
      claimToken: "snappy_demo_latam_50",
      claimCode: "SNPY-LA50D2",
      budgetCents: 5000,
      status: "SENT",
      personalMessage: "Bem-vindo ao time Acme LATAM, Mateo! Pick a gift delivered locally from our São Paulo & LATAM artisans.",
      expiresAt: futureDate,
    },
  });

  // (E) Past-Expiration Unclaimed Gift ($50 in escrow, ready for Admin Reclaim Sweep!)
  await prisma.giftSend.create({
    data: {
      campaignId: campaignOnboarding.id,
      companyId: acmeCompany.id,
      recipientEmail: "unclaimed.guest@external.org",
      recipientName: "Jordan Taylor",
      preferredRegion: "NA",
      claimToken: "snappy_demo_expired_50",
      claimCode: "SNPY-EXP50Z",
      budgetCents: 5000,
      status: "OPENED",
      personalMessage: "Thanks for joining our webinar panel, Jordan!",
      expiresAt: pastExpiredDate,
    },
  });

  // (F) Claimed Gift #1 -> Pending Vendor Fulfillment (Apex Tech)
  const sendPendingVendor = await prisma.giftSend.create({
    data: {
      campaignId: campaignAnniversary.id,
      companyId: acmeCompany.id,
      recipientEmail: recipientAlex.email,
      recipientName: recipientAlex.name,
      recipientUserId: recipientAlex.id,
      preferredRegion: "NA",
      claimToken: "snappy_claimed_pending_1",
      claimCode: "SNPY-CLM001",
      budgetCents: 10000,
      status: "CLAIMED",
      personalMessage: "Thank you for leading the zero-downtime database migration!",
      thankYouNote: "Thank you so much Sarah! The Aura Smart Mug is going to save my morning espresso during on-call shifts!",
      expiresAt: futureDate,
      claimedAt: recentClaimDate,
    },
  });

  await prisma.giftOrder.create({
    data: {
      giftSendId: sendPendingVendor.id,
      productId: p6.id,
      vendorId: vendorApex.id,
      orderType: "PHYSICAL_GIFT",
      retailAmountCents: 9500,
      vendorPayoutCents: 8075,
      platformFeeCents: 1425,
      recipientRegion: "NA",
      shippingName: "Alex Rivera",
      shippingAddressLine1: "742 Evergreen Terrace, Apt 4B",
      shippingCity: "Austin",
      shippingState: "TX",
      shippingPostalCode: "78701",
      shippingCountry: "US",
      fulfillmentStatus: "PENDING_VENDOR",
    },
  });

  // (G) Claimed Gift #2 -> Shipped with Tracking (Nordic Botanicals)
  const sendShipped = await prisma.giftSend.create({
    data: {
      campaignId: campaignAnniversary.id,
      companyId: acmeCompany.id,
      recipientEmail: recipientElena.email,
      recipientName: recipientElena.name,
      recipientUserId: recipientElena.id,
      preferredRegion: "EMEA",
      claimToken: "snappy_claimed_shipped_2",
      claimCode: "SNPY-SHP002",
      budgetCents: 10000,
      status: "SHIPPED",
      personalMessage: "Bravo on launching the new Design System 3.0 across all teams!",
      thankYouNote: "What a wonderful surprise! I picked the Swedish Merino Wool Throw—can't wait for it to arrive in Amsterdam!",
      expiresAt: futureDate,
      claimedAt: recentClaimDate,
    },
  });

  await prisma.giftOrder.create({
    data: {
      giftSendId: sendShipped.id,
      productId: p7.id,
      vendorId: vendorNordic.id,
      orderType: "PHYSICAL_GIFT",
      retailAmountCents: 10000,
      vendorPayoutCents: 8500,
      platformFeeCents: 1500,
      recipientRegion: "EMEA",
      shippingName: "Elena Rostova",
      shippingAddressLine1: "Keizersgracht 482",
      shippingCity: "Amsterdam",
      shippingState: "NH",
      shippingPostalCode: "1017 EG",
      shippingCountry: "NL",
      trackingCarrier: "DHL Express Europe",
      trackingNumber: "DHL-NL-994820174",
      fulfillmentStatus: "SHIPPED",
      shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
  });

  // (H) Claimed Gift #3 -> Donated to Charity (Ocean Cleanse Foundation)
  const sendDonated = await prisma.giftSend.create({
    data: {
      campaignId: campaignOnboarding.id,
      companyId: acmeCompany.id,
      recipientEmail: recipientYuki.email,
      recipientName: recipientYuki.name,
      recipientUserId: recipientYuki.id,
      preferredRegion: "APAC",
      claimToken: "snappy_claimed_donated_3",
      claimCode: "SNPY-DON003",
      budgetCents: 5000,
      status: "DONATED",
      personalMessage: "Thank you for mentoring our APAC summer engineering interns!",
      thankYouNote: "So proud that Acme supports charitable giving! I donated my gift to the Ocean Cleanse Foundation.",
      expiresAt: futureDate,
      claimedAt: recentClaimDate,
    },
  });

  await prisma.giftOrder.create({
    data: {
      giftSendId: sendDonated.id,
      charityId: charityOcean.id,
      orderType: "CHARITY_DONATION",
      retailAmountCents: 5000,
      vendorPayoutCents: 0,
      platformFeeCents: 0,
      recipientRegion: "APAC",
      fulfillmentStatus: "COMPLETED",
      deliveredAt: recentClaimDate,
    },
  });

  // 10. Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: adminUser.id,
        actorRole: "ADMIN",
        action: "PLATFORM_SEEDED",
        entityType: "System",
        entityId: "seed-v1",
        metadataJson: JSON.stringify({ regions: ["NA", "EMEA", "APAC", "LATAM"], vendors: 5, products: 12 }),
      },
      {
        actorUserId: acmeUser.id,
        actorRole: "CORPORATE",
        action: "CAMPAIGN_CREATED",
        entityType: "Campaign",
        entityId: campaignAnniversary.id,
        metadataJson: JSON.stringify({ title: campaignAnniversary.title, budgetCents: 10000 }),
      },
    ],
  });

  return {
    adminUser,
    acmeCompany,
    vendorApex,
    vendorNordic,
    vendorKyoto,
    vendorAndes,
    vendorPending,
    charityOcean,
    charityForest,
  };
}

if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then(async () => {
      console.log("✅ Snappy database seeded with multi-role & multi-region data.");
      await prisma.$disconnect();
    })
    .catch(async (err) => {
      console.error("❌ Failed to seed database:", err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
