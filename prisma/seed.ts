import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = "snappy_salt_v1";
  const derived = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
  return `pbkdf2_v1$${derived}`;
}

export function makeProductSvgDataUri(title: string, category: string, bgHex: string, accentHex: string): string {
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
  await prisma.shipmentEvent.deleteMany();
  await prisma.giftOrder.deleteMany();
  await prisma.giftSend.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.collectionProduct.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.product.deleteMany();
  await prisma.giftCategory.deleteMany();
  await prisma.recipientAddress.deleteMany();
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

  // 4. First-Class Gift Categories (Taxonomy)
  const catTech = await prisma.giftCategory.create({
    data: {
      slug: "tech-workspace",
      name: "Tech",
      headline: "Acoustic Studio & Workspace Engineering",
      description: "Precision audio, tactile mechanical keyboards, and CNC-machined desk architecture.",
      icon: "Cpu",
      accentColor: "#4F46E5",
      heroImageUrl: "/images/gifts/apex-anc-headphones.png",
      displayOrder: 1,
      isFeatured: true,
    },
  });

  const catGourmet = await prisma.giftCategory.create({
    data: {
      slug: "coffee-gourmet",
      name: "Gourmet",
      headline: "Artisanal Tea, Single-Origin Coffee & Cacao",
      description: "First-harvest Kyoto matcha, micro-lot South American cacao, and sommelier tasting boxes.",
      icon: "Coffee",
      accentColor: "#D97706",
      heroImageUrl: "/images/gifts/kyoto-matcha-set.png",
      displayOrder: 2,
      isFeatured: true,
    },
  });

  const catWellness = await prisma.giftCategory.create({
    data: {
      slug: "wellness-rituals",
      name: "Wellness",
      headline: "Botanical Apothecary & Restorative Rituals",
      description: "Ultrasonic stoneware diffusers, cold-pressed botanical bath oils, and sensory sanctuary kits.",
      icon: "Sparkles",
      accentColor: "#0D9488",
      heroImageUrl: "/images/gifts/pacifica-botanical-spa.png",
      displayOrder: 3,
      isFeatured: true,
    },
  });

  const catHome = await prisma.giftCategory.create({
    data: {
      slug: "home-living",
      name: "Home & Living",
      headline: "Nordic Architecture, Lighting & Culinary Craft",
      description: "Traceable Scandinavian wool throws, cordless brass table lamps, and precision espresso bars.",
      icon: "Home",
      accentColor: "#8B5CF6",
      heroImageUrl: "/images/gifts/nordic-merino-throw.png",
      displayOrder: 4,
      isFeatured: true,
    },
  });

  const catTravel = await prisma.giftCategory.create({
    data: {
      slug: "apparel-travel",
      name: "Apparel & Swag",
      headline: "Executive Weekenders & Alpaca Travel Goods",
      description: "Full-grain saddle leather duffels, Peruvian baby alpaca travel sets, and titanium drinkware.",
      icon: "Briefcase",
      accentColor: "#B45309",
      heroImageUrl: "/images/gifts/andes-weekender-duffel.png",
      displayOrder: 5,
      isFeatured: true,
    },
  });

  const catEco = await prisma.giftCategory.create({
    data: {
      slug: "eco-impact",
      name: "Eco & Impact",
      headline: "Carbon-Neutral & Upcycled Ocean Goods",
      description: "Certified climate-positive gear crafted from reclaimed ocean canvas and solar tech.",
      icon: "Leaf",
      accentColor: "#059669",
      heroImageUrl: "/images/gifts/pacifica-solar-pack.png",
      displayOrder: 6,
      isFeatured: true,
    },
  });

  // 4b. 16 Studio-Photographed Products across $25, $50, $100, $250 tiers & regions
  const p1 = await prisma.product.create({
    data: {
      vendorId: vendorKyoto.id,
      categoryId: catGourmet.id,
      sku: "KYO-MTC-025",
      title: "Uji Ceremonial Matcha & Bamboo Whisk Set",
      description: "First-harvest stone-ground Uji matcha paired with a handcrafted 100-prong bamboo chasen, scoop, and glazed chawan tea bowl.",
      category: "Gourmet",
      merchandisingBadge: "Artisan Crafted",
      tagsJson: JSON.stringify(["Ceremonial Grade", "Organic", "Kyoto Origin", "Vegan"]),
      variantsJson: JSON.stringify([
        { name: "Chawan Glaze", options: ["Oribe Emerald", "Kuro Raku Charcoal", "Warm Shino Ivory"] },
        { name: "Harvest Cultivar", options: ["Samidori Ceremonial", "Okumidori Reserve"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Japan (Uji, Kyoto)",
        weightGrams: 540,
        leadTimeDays: 2,
        sustainability: "100% Biodegradable Bamboo & Recyclable Tin",
      }),
      priceCents: 2500,
      wholesaleCostCents: 1800,
      imageUrl: "/images/gifts/kyoto-matcha-set.png",
      stockQuantity: 120,
      supportedRegions: "APAC,NA,EMEA",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p2 = await prisma.product.create({
    data: {
      vendorId: vendorAndes.id,
      categoryId: catGourmet.id,
      sku: "AND-CAC-025",
      title: "Single-Origin Cacao & Specialty Coffee Tasting Box",
      description: "Micro-lot Arabica roasts from Minas Gerais & Huila paired with 75% Ecuadorian Arriba Nacional dark chocolate bars in a linen presentation box.",
      category: "Gourmet",
      merchandisingBadge: "Small Batch",
      tagsJson: JSON.stringify(["Single-Origin", "Fair Trade", "Direct Trade", "Gluten-Free"]),
      variantsJson: JSON.stringify([
        { name: "Roast Profile", options: ["Medium-Dark Espresso & Cacao", "Light Filter & Floral Cacao", "Decaf Swiss Water & Dark Cacao"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Brazil & Colombia",
        weightGrams: 680,
        leadTimeDays: 3,
        sustainability: "Rainforest Alliance & Direct Farm Trade",
      }),
      priceCents: 2500,
      wholesaleCostCents: 1750,
      imageUrl: "/images/gifts/andes-cacao-tasting-box.png",
      stockQuantity: 95,
      supportedRegions: "LATAM,NA,EMEA",
      isFeatured: false,
      status: "ACTIVE",
    },
  });

  const p3 = await prisma.product.create({
    data: {
      vendorId: vendorApex.id,
      categoryId: catTech.id,
      sku: "APX-MAG-045",
      title: "Walnut & Aerospace Aluminum MagSafe Desk Valet",
      description: "Solid American walnut and CNC-machined space-gray aluminum 3-in-1 magnetic wireless charging station for phone, watch, and earbuds.",
      category: "Tech",
      merchandisingBadge: "Bestseller",
      tagsJson: JSON.stringify(["Qi2 15W Fast Charge", "FSC Walnut", "Workspace", "USB-C PD"]),
      variantsJson: JSON.stringify([
        { name: "Wood & Metal Finish", options: ["American Walnut + Space Gray", "Nordic White Oak + Silver", "Smoked Ash + Obsidian"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "United States",
        weightGrams: 620,
        leadTimeDays: 2,
        sustainability: "FSC-Certified Hardwood & Recycled Aluminum",
      }),
      priceCents: 4500,
      wholesaleCostCents: 3100,
      imageUrl: "/images/gifts/apex-magsafe-valet.png",
      stockQuantity: 85,
      supportedRegions: "NA,EMEA,APAC",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p4 = await prisma.product.create({
    data: {
      vendorId: vendorNordic.id,
      categoryId: catWellness.id,
      sku: "NRD-SPA-050",
      title: "Scandinavian Botanical Apothecary & Spa Ritual Box",
      description: "Cold-pressed sea buckthorn bath oil, volcanic mineral clay mask, cedarwood soy candle, and organic linen bath ritual accessories on travertine.",
      category: "Wellness",
      merchandisingBadge: "Editor's Pick",
      tagsJson: JSON.stringify(["Organic Botanicals", "Cruelty-Free", "Paraben-Free", "Mindfulness"]),
      variantsJson: JSON.stringify([
        { name: "Botanical Scent Profile", options: ["Nordic Cedar & Bergamot", "Wild Lavender & Eucalyptus", "Unscented Sensitive Ritual"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Netherlands & Sweden",
        weightGrams: 890,
        leadTimeDays: 2,
        sustainability: "Refillable Amber Apothecary Glass",
      }),
      priceCents: 5000,
      wholesaleCostCents: 3600,
      imageUrl: "/images/gifts/pacifica-botanical-spa.png",
      stockQuantity: 70,
      supportedRegions: "EMEA,NA,APAC",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p5 = await prisma.product.create({
    data: {
      vendorId: vendorAndes.id,
      categoryId: catTravel.id,
      sku: "AND-ALP-050",
      title: "Peruvian Baby Alpaca Travel Scarf & Lounge Set",
      description: "Featherlight, hypoallergenic 100% Peruvian baby alpaca woven travel wrap and contoured silk-lined sleep mask in a linen keepsake case.",
      category: "Apparel & Swag",
      merchandisingBadge: "Artisan Made",
      tagsJson: JSON.stringify(["100% Baby Alpaca", "Fair Trade Weaver Co-op", "Travel Essential"]),
      variantsJson: JSON.stringify([
        { name: "Colorway", options: ["Warm Caramel & Ivory", "Andean Charcoal & Slate", "Terracotta & Sand"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Peru & Brazil",
        weightGrams: 410,
        leadTimeDays: 3,
        sustainability: "Cruelty-Free Shearing & Natural Dyes",
      }),
      priceCents: 5000,
      wholesaleCostCents: 3500,
      imageUrl: "/images/gifts/andes-alpaca-travel-set.png",
      stockQuantity: 64,
      supportedRegions: "LATAM,NA,EMEA",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p6 = await prisma.product.create({
    data: {
      vendorId: vendorApex.id,
      categoryId: catTech.id,
      sku: "APX-MUG-095",
      title: "Aura Pro Smart Temperature Control Ceramic Mug",
      description: "Matte architectural ceramic smart mug with brushed copper charging coaster that holds coffee or tea at your exact degree (120°F–145°F).",
      category: "Tech",
      merchandisingBadge: "Top Redeemed",
      tagsJson: JSON.stringify(["App Controlled", "3-Hour Battery", "Auto-Sleep Sensor", "IPX7 Waterproof"]),
      variantsJson: JSON.stringify([
        { name: "Finish & Capacity", options: ["Matte Charcoal + Copper Base (14 oz)", "Warm Chalk White + Gold Base (14 oz)", "Obsidian Black (12 oz)"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "United States",
        weightGrams: 740,
        leadTimeDays: 2,
        sustainability: "Modular Replaceable Battery Core",
      }),
      priceCents: 9500,
      wholesaleCostCents: 7200,
      imageUrl: "/images/gifts/apex-smart-mug.png",
      stockQuantity: 52,
      supportedRegions: "NA,EMEA,APAC,LATAM",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p7 = await prisma.product.create({
    data: {
      vendorId: vendorNordic.id,
      categoryId: catHome.id,
      sku: "NRD-MRN-100",
      title: "Merino & Gotland Wool Architectural Throw",
      description: "Loom-woven in Scandinavia from 100% traceable merino and Gotland wool in an oatmeal and sage herringbone pattern.",
      category: "Home & Living",
      merchandisingBadge: "Editor's Pick",
      tagsJson: JSON.stringify(["100% Traceable Wool", "OEKO-TEX Certified", "Nordic Design"]),
      variantsJson: JSON.stringify([
        { name: "Weave Pattern", options: ["Oatmeal & Sage Herringbone", "Birch & Charcoal Check", "Fjord Slate & Cream"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Sweden",
        weightGrams: 920,
        leadTimeDays: 3,
        sustainability: "Regenerative Pasture Certified Wool",
      }),
      priceCents: 10000,
      wholesaleCostCents: 7400,
      imageUrl: "/images/gifts/nordic-merino-throw.png",
      stockQuantity: 45,
      supportedRegions: "EMEA,NA",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p8 = await prisma.product.create({
    data: {
      vendorId: vendorKyoto.id,
      categoryId: catGourmet.id,
      sku: "KYO-ket-100",
      title: "Hammered Matte Black Gooseneck Kettle & Origami Pour-Over",
      description: "Precision counterweight gooseneck kettle with brass finial, porcelain origami dripper, and walnut-collared glass server carafe.",
      category: "Gourmet",
      merchandisingBadge: "Barista Favorite",
      tagsJson: JSON.stringify(["Precision Flow", "Mino Ware Porcelain", "Specialty Coffee"]),
      variantsJson: JSON.stringify([
        { name: "Dripper Color", options: ["Matte Ivory Porcelain", "Terracotta Clay", "Kyoto Indigo"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Japan (Gifu & Tsubame)",
        weightGrams: 1120,
        leadTimeDays: 3,
        sustainability: "Lifetime Repairable Stainless & Ceramic",
      }),
      priceCents: 10000,
      wholesaleCostCents: 7500,
      imageUrl: "/images/gifts/kyoto-pourover-kettle.png",
      stockQuantity: 40,
      supportedRegions: "APAC,NA,EMEA",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p9 = await prisma.product.create({
    data: {
      vendorId: vendorAndes.id,
      categoryId: catTravel.id,
      sku: "AND-WKD-100",
      title: "Hand-Stitched Full-Grain Leather & Canvas Weekender",
      description: "Vegetable-tanned saddle leather and heavy waxed olive canvas overnighter with solid brass hardware and dedicated 16-inch laptop sleeve.",
      category: "Apparel & Swag",
      merchandisingBadge: "Executive Favorite",
      tagsJson: JSON.stringify(["Full-Grain Leather", "Carry-On Compliant", "Solid Brass Hardware"]),
      variantsJson: JSON.stringify([
        { name: "Color Combination", options: ["Saddle Tan & Olive Canvas", "Espresso Leather & Charcoal Canvas", "Cognac All-Leather"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Brazil & Argentina",
        weightGrams: 1450,
        leadTimeDays: 3,
        sustainability: "Vegetable-Tanned Chrome-Free Leather",
      }),
      priceCents: 10000,
      wholesaleCostCents: 7300,
      imageUrl: "/images/gifts/andes-weekender-duffel.png",
      stockQuantity: 35,
      supportedRegions: "LATAM,NA,EMEA",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p10 = await prisma.product.create({
    data: {
      vendorId: vendorApex.id,
      categoryId: catTech.id,
      sku: "APX-ANC-240",
      title: "Zenith Studio ANC Wireless Over-Ear Headphones",
      description: "Brushed obsidian aluminum and cognac lambskin acoustic earcups with adaptive 48dB hybrid ANC, spatial audio, and 45-hour battery life.",
      category: "Tech",
      merchandisingBadge: "Flagship VIP",
      tagsJson: JSON.stringify(["48dB Hybrid ANC", "Lossless USB-C Audio", "Multipoint Bluetooth 5.4"]),
      variantsJson: JSON.stringify([
        { name: "Colorway", options: ["Obsidian Aluminum & Cognac Leather", "Champagne Titanium & Warm Ivory", "Matte Graphite & Black"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "United States",
        weightGrams: 820,
        leadTimeDays: 2,
        sustainability: "Recycled Aluminum Frame & Replaceable Ear Cushions",
      }),
      priceCents: 24000,
      wholesaleCostCents: 18500,
      imageUrl: "/images/gifts/apex-anc-headphones.png",
      stockQuantity: 30,
      supportedRegions: "NA,EMEA,APAC,LATAM",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p11 = await prisma.product.create({
    data: {
      vendorId: vendorNordic.id,
      categoryId: catHome.id,
      sku: "NRD-ESP-250",
      title: "Nordic Architectural Espresso Bar & Walnut Portafilter",
      description: "Compact brushed stainless and matte black PID-controlled espresso station with Italian walnut bottomless portafilter and double-wall glasses.",
      category: "Home & Living",
      merchandisingBadge: "President's Club",
      tagsJson: JSON.stringify(["PID Temp Control", "9-Bar Italian Pump", "Walnut Accents"]),
      variantsJson: JSON.stringify([
        { name: "Voltage & Plug", options: ["110V North America / Japan", "230V Europe / UK", "220V APAC / Global"] },
        { name: "Body Finish", options: ["Brushed Steel & Matte Black", "All-Matte Alabaster White"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Netherlands & Italy",
        weightGrams: 4200,
        leadTimeDays: 4,
        sustainability: "Commercial-Grade Brass Boiler Built for 15+ Years",
      }),
      priceCents: 25000,
      wholesaleCostCents: 19000,
      imageUrl: "/images/gifts/nordic-espresso-bar.png",
      stockQuantity: 25,
      supportedRegions: "EMEA,NA,APAC",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p12 = await prisma.product.create({
    data: {
      vendorId: vendorApex.id,
      categoryId: catTech.id,
      sku: "APX-KBD-185",
      title: "Atelier 75% CNC Aluminum Wireless Mechanical Keyboard",
      description: "Gasket-mounted CNC bead-blasted aluminum mechanical keyboard with warm ivory & terracotta PBT keycaps, hot-swap switches, and brass weight.",
      category: "Tech",
      merchandisingBadge: "Engineer's Choice",
      tagsJson: JSON.stringify(["QMK/VIA Programmable", "Tri-Mode Wireless", "Gasket Mount"]),
      variantsJson: JSON.stringify([
        { name: "Switch Feel", options: ["Tactile Pomelo Silent", "Linear Silk Cream", "Clicky Jade"] },
        { name: "Layout", options: ["ANSI US", "ISO Europe/UK", "JIS Japan"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "United States",
        weightGrams: 1680,
        leadTimeDays: 2,
        sustainability: "CNC Recycled 6063 Aluminum Chassis",
      }),
      priceCents: 18500,
      wholesaleCostCents: 14200,
      imageUrl: "/images/gifts/apex-mechanical-keyboard.png",
      stockQuantity: 28,
      supportedRegions: "NA,EMEA,APAC",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p13 = await prisma.product.create({
    data: {
      vendorId: vendorNordic.id,
      categoryId: catWellness.id,
      sku: "NRD-DIF-048",
      title: "Stoneware Ultrasonic Essential Oil Diffuser & Botanical Oils",
      description: "Hand-thrown matte sandstone ceramic diffuser with whisper-quiet ultrasonic mist and two organic Scandinavian forest essential oil blends.",
      category: "Wellness",
      merchandisingBadge: "Calm Workspace",
      tagsJson: JSON.stringify(["Hand-Thrown Stoneware", "Auto Shut-Off", "100% Pure Essential Oils"]),
      variantsJson: JSON.stringify([
        { name: "Ceramic Finish", options: ["Warm Travertine Sand", "Raw Slate Gray", "Chalk White"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Denmark",
        weightGrams: 710,
        leadTimeDays: 2,
        sustainability: "Plastic-Free Ceramic Cover & Organic Oils",
      }),
      priceCents: 4800,
      wholesaleCostCents: 3400,
      imageUrl: "/images/gifts/nordic-aroma-diffuser.png",
      stockQuantity: 62,
      supportedRegions: "EMEA,NA,APAC",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p14 = await prisma.product.create({
    data: {
      vendorId: vendorNordic.id,
      categoryId: catHome.id,
      sku: "NRD-LMP-098",
      title: "Cordless Architectural Brass & Pleated Opal Table Lamp",
      description: "Rechargeable solid brushed brass and mouth-blown pleated opal glass table lamp with 3-stage touch dimming and 24-hour warm glow.",
      category: "Home & Living",
      merchandisingBadge: "New Arrival",
      tagsJson: JSON.stringify(["2700K Warm Candlelight", "USB-C Rechargeable", "Mouth-Blown Glass"]),
      variantsJson: JSON.stringify([
        { name: "Base Finish", options: ["Unlacquered Brushed Brass", "Smoked Bronze", "Satin Nickel"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Sweden",
        weightGrams: 980,
        leadTimeDays: 3,
        sustainability: "Replaceable Li-Ion Cell & Solid Brass",
      }),
      priceCents: 9800,
      wholesaleCostCents: 7100,
      imageUrl: "/images/gifts/nordic-sculptural-lamp.png",
      stockQuantity: 38,
      supportedRegions: "EMEA,NA,APAC",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p15 = await prisma.product.create({
    data: {
      vendorId: vendorKyoto.id,
      categoryId: catTravel.id,
      sku: "KYO-TIT-048",
      title: "Anodized Pure Titanium Vacuum Travel Tumbler",
      description: "Ultralight double-wall pure Grade-1 titanium insulated tumbler crafted in Niigata with an iridescent indigo-bronze finish and hinoki wood lid.",
      category: "Apparel & Swag",
      merchandisingBadge: "Ultralight Craft",
      tagsJson: JSON.stringify(["Pure Grade-1 Titanium", "Zero Metallic Taste", "Niigata Craft"]),
      variantsJson: JSON.stringify([
        { name: "Anodized Finish", options: ["Aurora Indigo-Bronze", "Raw Brushed Titanium", "Kyoto Moss Green"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "Japan (Tsubame-Sanjo)",
        weightGrams: 240,
        leadTimeDays: 2,
        sustainability: "100% Recyclable Pure Titanium for Life",
      }),
      priceCents: 4800,
      wholesaleCostCents: 3450,
      imageUrl: "/images/gifts/kyoto-titanium-tumbler.png",
      stockQuantity: 75,
      supportedRegions: "APAC,NA,EMEA,LATAM",
      isFeatured: true,
      status: "ACTIVE",
    },
  });

  const p16 = await prisma.product.create({
    data: {
      vendorId: vendorApex.id,
      categoryId: catEco.id,
      sku: "APX-ECO-095",
      title: "Upcycled Ocean-Canvas Commuter Pack & Solar Power Bank",
      description: "Weatherproof commuter backpack woven from 38 reclaimed ocean-bound plastic bottles, paired with a 10,000mAh magnetic solar-assist power bank.",
      category: "Eco & Impact",
      merchandisingBadge: "Carbon Neutral",
      tagsJson: JSON.stringify(["38 Ocean Bottles Recycled", "Climate Partner Certified", "16-inch Laptop"]),
      variantsJson: JSON.stringify([
        { name: "Colorway", options: ["Deep Forest & Saddle Tan", "Fjord Navy & Slate", "Dune Sand & Olive"] },
      ]),
      specificationsJson: JSON.stringify({
        originCountry: "United States & Portugal",
        weightGrams: 1050,
        leadTimeDays: 2,
        sustainability: "Removes 1.4kg of Marine Plastic per Gift",
      }),
      priceCents: 9500,
      wholesaleCostCents: 6900,
      imageUrl: "/images/gifts/pacifica-solar-pack.png",
      stockQuantity: 48,
      supportedRegions: "NA,EMEA,APAC,LATAM",
      isFeatured: true,
      status: "ACTIVE",
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
      { collectionId: col50.id, productId: p13.id },
      { collectionId: col50.id, productId: p15.id },
      { collectionId: col100.id, productId: p3.id },
      { collectionId: col100.id, productId: p4.id },
      { collectionId: col100.id, productId: p5.id },
      { collectionId: col100.id, productId: p6.id },
      { collectionId: col100.id, productId: p7.id },
      { collectionId: col100.id, productId: p8.id },
      { collectionId: col100.id, productId: p9.id },
      { collectionId: col100.id, productId: p13.id },
      { collectionId: col100.id, productId: p14.id },
      { collectionId: col100.id, productId: p15.id },
      { collectionId: col100.id, productId: p16.id },
      { collectionId: col250.id, productId: p6.id },
      { collectionId: col250.id, productId: p7.id },
      { collectionId: col250.id, productId: p8.id },
      { collectionId: col250.id, productId: p10.id },
      { collectionId: col250.id, productId: p11.id },
      { collectionId: col250.id, productId: p12.id },
      { collectionId: col250.id, productId: p14.id },
      { collectionId: col250.id, productId: p16.id },
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

  // 7b. Recipient Saved Address Book (Multi-Address Delivery Profiles)
  await prisma.recipientAddress.createMany({
    data: [
      {
        recipientEmail: recipientAlex.email,
        userId: recipientAlex.id,
        label: "Home Studio (Austin)",
        recipientName: "Alex Rivera",
        phone: "+1 (512) 555-0194",
        addressLine1: "742 Evergreen Terrace",
        addressLine2: "Apt 4B",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "US",
        region: "NA",
        deliveryInstructions: "Leave with front desk concierge or in Parcel Pending locker #14.",
        isDefault: true,
      },
      {
        recipientEmail: recipientAlex.email,
        userId: recipientAlex.id,
        label: "Acme Cloud HQ Office",
        recipientName: "Alex Rivera",
        phone: "+1 (415) 555-0148",
        addressLine1: "500 Howard Street",
        addressLine2: "Floor 18, Reliability Eng",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "US",
        region: "NA",
        deliveryInstructions: "Deliver to 18th floor mailroom before 5:00 PM.",
        isDefault: false,
      },
      {
        recipientEmail: recipientElena.email,
        userId: recipientElena.id,
        label: "Canal Residence (Amsterdam)",
        recipientName: "Elena Rostova",
        phone: "+31 20 794 0821",
        addressLine1: "Keizersgracht 482",
        addressLine2: "Unit 3A",
        city: "Amsterdam",
        state: "NH",
        postalCode: "1017 EG",
        country: "NL",
        region: "EMEA",
        deliveryInstructions: "Ring bell 3A; if away, leave with ground-floor café neighbour.",
        isDefault: true,
      },
      {
        recipientEmail: recipientYuki.email,
        userId: recipientYuki.id,
        label: "Shibuya Residence",
        recipientName: "Yuki Tanaka",
        phone: "+81 3-5555-0182",
        addressLine1: "1-2-3 Shibuya, Shibuya-ku",
        addressLine2: "Tower West 1904",
        city: "Tokyo",
        state: "Tokyo",
        postalCode: "150-0002",
        country: "JP",
        region: "APAC",
        deliveryInstructions: "Use Takkyubin delivery box (不在票) at lobby entrance.",
        isDefault: true,
      },
    ],
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

  // (F) Claimed Gift #1 -> Pending Vendor Fulfillment (Apex Tech) - Eligible for Address Edit or Gift Swap!
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

  const orderPendingVendor = await prisma.giftOrder.create({
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
      shippingPhone: "+1 (512) 555-0194",
      shippingAddressLine1: "742 Evergreen Terrace",
      shippingAddressLine2: "Apt 4B",
      shippingCity: "Austin",
      shippingState: "TX",
      shippingPostalCode: "78701",
      shippingCountry: "US",
      deliveryInstructions: "Leave with front desk concierge or in Parcel Pending locker #14.",
      selectedVariant: "Finish & Capacity: Matte Charcoal + Copper Base (14 oz)",
      serviceLevel: "FedEx Priority Express (2-Day)",
      fulfillmentWarehouse: "Austin NA Fulfillment Hub (ATX-01)",
      packageWeightGrams: 740,
      estimatedDeliveryAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      addressLocked: false,
      fulfillmentStatus: "PENDING_VENDOR",
    },
  });

  await prisma.shipmentEvent.createMany({
    data: [
      {
        giftOrderId: orderPendingVendor.id,
        stage: "ORDER_CONFIRMED",
        title: "Gift Claimed & Routed to Local Regional Hub",
        description: "Order verified and routed to Apex Tech Studio (Austin NA Hub ATX-01). Address & gift selection unlocked until label creation.",
        location: "Austin, TX (NA Hub)",
        actorRole: "SYSTEM",
        occurredAt: recentClaimDate,
      },
    ],
  });

  // (G) Claimed Gift #2 -> Shipped with Multi-Checkpoint Carrier Tracking (Nordic Botanicals)
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

  const orderShipped = await prisma.giftOrder.create({
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
      shippingPhone: "+31 20 794 0821",
      shippingAddressLine1: "Keizersgracht 482",
      shippingAddressLine2: "Unit 3A",
      shippingCity: "Amsterdam",
      shippingState: "NH",
      shippingPostalCode: "1017 EG",
      shippingCountry: "NL",
      deliveryInstructions: "Ring bell 3A; if away, leave with ground-floor café neighbour.",
      selectedVariant: "Weave Pattern: Oatmeal & Sage Herringbone",
      trackingCarrier: "DHL Express Europe",
      trackingNumber: "DHL-NL-994820174",
      trackingUrl: "https://www.dhl.com/nl-en/home/tracking.html?tracking-id=DHL-NL-994820174",
      serviceLevel: "DHL Express EuroPlus Carbon-Neutral",
      fulfillmentWarehouse: "Rotterdam EMEA Atelier Hub (RTM-02)",
      packageWeightGrams: 920,
      estimatedDeliveryAt: new Date(Date.now() + 1000 * 60 * 60 * 18),
      addressLocked: true,
      fulfillmentStatus: "SHIPPED",
      shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
  });

  await prisma.shipmentEvent.createMany({
    data: [
      {
        giftOrderId: orderShipped.id,
        stage: "ORDER_CONFIRMED",
        title: "Gift Claimed & Routed to EMEA Hub",
        description: "Zero-customs intra-EU fulfillment assigned to Nordic Home & Botanicals.",
        location: "Rotterdam, NL",
        actorRole: "SYSTEM",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 32),
      },
      {
        giftOrderId: orderShipped.id,
        stage: "PACKED_QA",
        title: "Quality Inspected & Gift-Wrapped at Atelier",
        description: "Loom-woven Merino throw inspected, wrapped in signature linen paper with printed sender note.",
        location: "Rotterdam EMEA Atelier Hub (RTM-02)",
        actorRole: "VENDOR",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 22),
      },
      {
        giftOrderId: orderShipped.id,
        stage: "CARRIER_PICKED_UP",
        title: "Shipping Manifest & Waybill Generated",
        description: "DHL Express Europe waybill #DHL-NL-994820174 generated; recipient address locked.",
        location: "Rotterdam, NL",
        actorRole: "VENDOR",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 16),
      },
      {
        giftOrderId: orderShipped.id,
        stage: "IN_TRANSIT_HUB",
        title: "Departed DHL Sortation Facility",
        description: "Linehaul parcel scanned and en route to Amsterdam distribution hub.",
        location: "Utrecht Hub, NL",
        actorRole: "CARRIER",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      },
    ],
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
      addressLocked: true,
      fulfillmentStatus: "COMPLETED",
      deliveredAt: recentClaimDate,
    },
  });

  // (I) Claimed Gift #4 -> Delivered with Full 5-Step Carrier History (Kyoto Artisan Tea & Craft)
  const sendDelivered = await prisma.giftSend.create({
    data: {
      campaignId: campaignOnboarding.id,
      companyId: acmeCompany.id,
      recipientEmail: recipientYuki.email,
      recipientName: recipientYuki.name,
      recipientUserId: recipientYuki.id,
      preferredRegion: "APAC",
      claimToken: "snappy_claimed_delivered_4",
      claimCode: "SNPY-DLV004",
      budgetCents: 5000,
      status: "DELIVERED",
      personalMessage: "Congrats on passing your Principal Cloud Architect certification, Yuki!",
      thankYouNote: "Arigato! The Uji Matcha & Chawan set arrived in pristine condition in Shibuya.",
      expiresAt: futureDate,
      claimedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    },
  });

  const orderDelivered = await prisma.giftOrder.create({
    data: {
      giftSendId: sendDelivered.id,
      productId: p1.id,
      vendorId: vendorKyoto.id,
      orderType: "PHYSICAL_GIFT",
      retailAmountCents: 2500,
      vendorPayoutCents: 2125,
      platformFeeCents: 375,
      recipientRegion: "APAC",
      shippingName: "Yuki Tanaka",
      shippingPhone: "+81 3-5555-0182",
      shippingAddressLine1: "1-2-3 Shibuya, Shibuya-ku",
      shippingAddressLine2: "Tower West 1904",
      shippingCity: "Tokyo",
      shippingState: "Tokyo",
      shippingPostalCode: "150-0002",
      shippingCountry: "JP",
      deliveryInstructions: "Use Takkyubin delivery box (不在票) at lobby entrance.",
      selectedVariant: "Chawan Glaze: Oribe Emerald | Harvest Cultivar: Samidori Ceremonial",
      trackingCarrier: "Yamato Transport (Kuroneko)",
      trackingNumber: "YMT-JP-449182031",
      trackingUrl: "https://toi.kuronekoyamato.co.jp/cgi-bin/tneko",
      serviceLevel: "TA-Q-BIN Cool & Precision Parcel",
      fulfillmentWarehouse: "Kyoto Uji Artisan Roastery Hub (KYO-01)",
      packageWeightGrams: 540,
      estimatedDeliveryAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
      addressLocked: true,
      fulfillmentStatus: "DELIVERED",
      shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 30),
      deliveredAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    },
  });

  await prisma.shipmentEvent.createMany({
    data: [
      {
        giftOrderId: orderDelivered.id,
        stage: "ORDER_CONFIRMED",
        title: "Gift Claimed & Routed to Kyoto APAC Hub",
        description: "Assigned to Kyoto Artisan Tea & Craft domestic APAC fulfillment.",
        location: "Kyoto, JP",
        actorRole: "SYSTEM",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 70),
      },
      {
        giftOrderId: orderDelivered.id,
        stage: "PACKED_QA",
        title: "Fresh Matcha Sealed & Gift Wrapped",
        description: "Stone-ground Samidori matcha nitrogen-sealed with Oribe chawan and 100-prong bamboo whisk.",
        location: "Kyoto Uji Artisan Roastery Hub (KYO-01)",
        actorRole: "VENDOR",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      },
      {
        giftOrderId: orderDelivered.id,
        stage: "IN_TRANSIT_HUB",
        title: "Departed Kansai Sortation Hub",
        description: "Dispatched via Yamato Transport Shinkansen express freight to Tokyo.",
        location: "Osaka / Kansai Hub, JP",
        actorRole: "CARRIER",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 28),
      },
      {
        giftOrderId: orderDelivered.id,
        stage: "OUT_FOR_DELIVERY",
        title: "Out for Delivery with Local Courier",
        description: "Loaded onto Shibuya-ku electric courier van for final delivery.",
        location: "Shibuya Depot, Tokyo, JP",
        actorRole: "CARRIER",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 10),
      },
      {
        giftOrderId: orderDelivered.id,
        stage: "DELIVERED",
        title: "Delivered to Recipient Parcel Locker",
        description: "Signed & secured in Tower West lobby Takkyubin locker #08.",
        location: "Shibuya, Tokyo, JP",
        actorRole: "CARRIER",
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      },
    ],
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
