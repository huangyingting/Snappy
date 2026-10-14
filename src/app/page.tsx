"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gift,
  Building2,
  Package,
  Sparkles,
  ShieldCheck,
  Globe,
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  Lock,
  Truck,
  Layers,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { REGIONS, BUDGET_TIERS, formatCurrency } from "@/lib/constants";

const DEMO_CLAIM_LINKS = [
  {
    region: "NA",
    code: "SNPY-NA100A",
    token: "snappy_demo_na_100",
    budget: "$100 Milestone",
    recipient: "Alex Rivera (Austin)",
    stateLabel: "Ready to Unwrap",
  },
  {
    region: "EMEA",
    code: "SNPY-EU100B",
    token: "snappy_demo_emea_100",
    budget: "$100 Milestone",
    recipient: "Elena Rostova (Amsterdam)",
    stateLabel: "Ready to Unwrap",
  },
  {
    region: "APAC",
    code: "SNPY-AP50C1",
    token: "snappy_demo_apac_50",
    budget: "$50 Welcome",
    recipient: "Yuki Tanaka (Tokyo)",
    stateLabel: "Ready to Unwrap",
  },
  {
    region: "LATAM",
    code: "SNPY-LA50D2",
    token: "snappy_demo_latam_50",
    budget: "$50 Welcome",
    recipient: "Mateo Silva (São Paulo)",
    stateLabel: "Ready to Unwrap",
  },
  {
    region: "NA",
    code: "SNPY-CLM001",
    token: "snappy_claimed_pending_1",
    budget: "Pre-Ship Editable",
    recipient: "Alex Rivera",
    stateLabel: "Address & Swap Open",
  },
  {
    region: "EMEA",
    code: "SNPY-SHP002",
    token: "snappy_claimed_shipped_2",
    budget: "DHL Express Live",
    recipient: "Elena Rostova",
    stateLabel: "4-Step Transit",
  },
];

const SHOWCASE_CATEGORIES = [
  {
    id: "ALL",
    name: "All Curations",
    headline: "16 Studio-Crafted Regional Gifts",
    count: 8,
  },
  {
    id: "Tech",
    name: "Tech",
    headline: "Acoustic Studio & Workspace Engineering",
    count: 4,
  },
  {
    id: "Gourmet",
    name: "Gourmet",
    headline: "Artisanal Tea, Pour-Over & Single-Origin Cacao",
    count: 2,
  },
  {
    id: "Wellness",
    name: "Wellness",
    headline: "Botanical Apothecary & Restorative Rituals",
    count: 2,
  },
  {
    id: "Home & Living",
    name: "Home & Living",
    headline: "Nordic Architecture, Lighting & Culinary Craft",
    count: 3,
  },
  {
    id: "Apparel & Swag",
    name: "Apparel & Swag",
    headline: "Executive Weekenders & Alpaca Travel Goods",
    count: 2,
  },
  {
    id: "Eco & Impact",
    name: "Eco & Impact",
    headline: "Carbon-Neutral & Upcycled Ocean Goods",
    count: 1,
  },
];

const SHOWCASE_PRODUCTS = [
  {
    sku: "APX-ANC-240",
    title: "Zenith Studio ANC Wireless Over-Ear Headphones",
    category: "Tech",
    badge: "Flagship VIP",
    priceCents: 24000,
    regions: ["NA", "EMEA", "APAC", "LATAM"],
    origin: "Austin, US",
    variants: "3 Luxury Finishes",
    imageUrl: "/images/gifts/apex-anc-headphones.png",
  },
  {
    sku: "NRD-ESP-250",
    title: "Nordic Architectural Espresso Bar & Walnut Portafilter",
    category: "Home & Living",
    badge: "President's Club",
    priceCents: 25000,
    regions: ["EMEA", "NA", "APAC"],
    origin: "Rotterdam, NL",
    variants: "110V / 230V + 2 Finishes",
    imageUrl: "/images/gifts/nordic-espresso-bar.png",
  },
  {
    sku: "APX-KBD-185",
    title: "Atelier 75% CNC Aluminum Wireless Mechanical Keyboard",
    category: "Tech",
    badge: "Engineer's Choice",
    priceCents: 18500,
    regions: ["NA", "EMEA", "APAC"],
    origin: "San Francisco, US",
    variants: "3 Switch Types • ANSI/ISO",
    imageUrl: "/images/gifts/apex-mechanical-keyboard.png",
  },
  {
    sku: "KYO-KET-100",
    title: "Hammered Matte Black Gooseneck Kettle & Origami Pour-Over",
    category: "Gourmet",
    badge: "Barista Favorite",
    priceCents: 10000,
    regions: ["APAC", "NA", "EMEA"],
    origin: "Kyoto & Gifu, JP",
    variants: "3 Porcelain Dripper Glazes",
    imageUrl: "/images/gifts/kyoto-pourover-kettle.png",
  },
  {
    sku: "NRD-MRN-100",
    title: "Merino & Gotland Wool Architectural Throw",
    category: "Home & Living",
    badge: "Editor's Pick",
    priceCents: 10000,
    regions: ["EMEA", "NA"],
    origin: "Stockholm, SE",
    variants: "3 Nordic Weave Patterns",
    imageUrl: "/images/gifts/nordic-merino-throw.png",
  },
  {
    sku: "AND-WKD-100",
    title: "Hand-Stitched Full-Grain Leather & Canvas Weekender",
    category: "Apparel & Swag",
    badge: "Executive Favorite",
    priceCents: 10000,
    regions: ["LATAM", "NA", "EMEA"],
    origin: "São Paulo, BR",
    variants: "3 Saddle Leather Colorways",
    imageUrl: "/images/gifts/andes-weekender-duffel.png",
  },
  {
    sku: "NRD-LMP-098",
    title: "Cordless Architectural Brass & Pleated Opal Table Lamp",
    category: "Home & Living",
    badge: "New Arrival",
    priceCents: 9800,
    regions: ["EMEA", "NA", "APAC"],
    origin: "Malmö, SE",
    variants: "Brushed Brass / Smoked Bronze",
    imageUrl: "/images/gifts/nordic-sculptural-lamp.png",
  },
  {
    sku: "APX-ECO-095",
    title: "Upcycled Ocean-Canvas Commuter Pack & Solar Power Bank",
    category: "Eco & Impact",
    badge: "Carbon Neutral",
    priceCents: 9500,
    regions: ["NA", "EMEA", "APAC", "LATAM"],
    origin: "Lisbon & Austin",
    variants: "3 Coastal Colorways",
    imageUrl: "/images/gifts/pacifica-solar-pack.png",
  },
  {
    sku: "APX-MUG-095",
    title: "Aura Pro Smart Temperature Control Ceramic Mug",
    category: "Tech",
    badge: "Top Redeemed",
    priceCents: 9500,
    regions: ["NA", "EMEA", "APAC", "LATAM"],
    origin: "Austin, US",
    variants: "Charcoal + Copper / Chalk + Gold",
    imageUrl: "/images/gifts/apex-smart-mug.png",
  },
  {
    sku: "NRD-SPA-050",
    title: "Scandinavian Botanical Apothecary & Spa Ritual Box",
    category: "Wellness",
    badge: "Editor's Pick",
    priceCents: 5000,
    regions: ["EMEA", "NA", "APAC"],
    origin: "Amsterdam, NL",
    variants: "3 Botanical Scent Profiles",
    imageUrl: "/images/gifts/pacifica-botanical-spa.png",
  },
  {
    sku: "NRD-DIF-048",
    title: "Stoneware Ultrasonic Essential Oil Diffuser & Botanical Oils",
    category: "Wellness",
    badge: "Calm Workspace",
    priceCents: 4800,
    regions: ["EMEA", "NA", "APAC"],
    origin: "Copenhagen, DK",
    variants: "Travertine / Slate / Chalk",
    imageUrl: "/images/gifts/nordic-aroma-diffuser.png",
  },
  {
    sku: "KYO-MTC-025",
    title: "Uji Ceremonial Matcha & Bamboo Whisk Set",
    category: "Gourmet",
    badge: "Artisan Crafted",
    priceCents: 2500,
    regions: ["APAC", "NA", "EMEA"],
    origin: "Uji, Kyoto, JP",
    variants: "Oribe Emerald / Kuro Raku",
    imageUrl: "/images/gifts/kyoto-matcha-set.png",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [claimCodeInput, setClaimCodeInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeRegionFilter, setActiveRegionFilter] = useState("ALL");

  async function handleClaimLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError("");
    setLookupLoading(true);
    try {
      const res = await fetch("/api/auth/claim-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimCode: claimCodeInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "Could not find a gift with that code.");
      } else {
        router.push(data.redirectTo);
      }
    } catch {
      setLookupError("Network error while looking up gift code.");
    } finally {
      setLookupLoading(false);
    }
  }

  const filteredProducts = SHOWCASE_PRODUCTS.filter((item) => {
    const matchesCat = activeCategory === "ALL" || item.category === activeCategory;
    const matchesReg =
      activeRegionFilter === "ALL" || item.regions.includes(activeRegionFilter);
    return matchesCat && matchesReg;
  });

  return (
    <div className="pb-24">
      {/* Editorial Asymmetric Hero Section */}
      <section className="relative overflow-hidden border-b border-[#141210]/10 pt-10 pb-16 lg:pt-14 lg:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left Column: Editorial Headline + Instant Gift Unwrap */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#141210]/15 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[#141210] shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-[#D95D39]" />
                <span>SNAPPY ATELIER V2 • TAXONOMY, AI STUDIO & LIVE CARRIER LOGISTICS</span>
              </div>

              <h1 className="font-display mt-5 text-4xl font-semibold tracking-tight text-[#141210] sm:text-5xl lg:text-[56px] lg:leading-[1.06]">
                Corporate gifting curated like a{" "}
                <span className="italic text-[#D95D39]">design house</span>, fulfilled like a global logistics cloud.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
                Dispatch curated gift collections in seconds without asking for shipping addresses upfront.
                Recipients unwrap a bespoke digital experience, choose their exact variant or swap items pre-shipment,
                and track multi-checkpoint courier delivery across NA, EMEA, APAC, and LATAM.
              </p>

              {/* Instant Gift Unwrap Console */}
              <div className="atelier-card mt-8 rounded-3xl p-4 sm:p-5">
                <div className="mb-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-stone-500">
                    Recipient Magic Claim & Tracking Lookup
                  </span>
                  <span className="font-mono-code text-[11px] text-[#0F5338]">
                    Zero-Address Privacy Shield Active
                  </span>
                </div>
                <form onSubmit={handleClaimLookup} className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    type="text"
                    value={claimCodeInput}
                    onChange={(e) => setClaimCodeInput(e.target.value)}
                    placeholder="Enter gift code (e.g. SNPY-NA100A, SNPY-CLM001, SNPY-SHP002)..."
                    className="flex-1 rounded-2xl border border-[#141210]/15 bg-[#FAF8F5] px-4 py-3.5 text-sm font-medium text-[#141210] placeholder:text-stone-400 focus:border-[#D95D39] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#141210] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D95D39] disabled:opacity-50"
                  >
                    <Gift className="h-4 w-4 text-[#F3D9A4]" />
                    <span>{lookupLoading ? "Opening..." : "Unwrap / Track Gift"}</span>
                  </button>
                </form>
                {lookupError && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">{lookupError}</p>
                )}

                {/* 1-Click Live Sandbox Tokens */}
                <div className="mt-4 border-t border-[#141210]/8 pt-3.5">
                  <p className="mb-2 text-[11px] font-semibold text-stone-500">
                    1-Click Interactive Claim & Live Logistics Demos:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DEMO_CLAIM_LINKS.map((item) => (
                      <Link
                        key={item.token}
                        href={`/claim/${item.token}`}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-[#141210]/12 bg-[#FAF8F5] px-3 py-1 text-xs font-medium text-[#141210] transition hover:border-[#D95D39] hover:bg-[#D95D39]/8"
                      >
                        <span className="rounded-full bg-[#141210] px-1.5 py-0.2 font-mono-code text-[10px] font-bold text-[#F3D9A4]">
                          {item.region}
                        </span>
                        <span className="font-mono-code font-bold">{item.code}</span>
                        <span className="text-[11px] text-stone-500 group-hover:text-[#141210]">
                          • {item.stateLabel}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Studio Product Photography Bento Collage */}
            <div className="lg:col-span-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="group relative overflow-hidden rounded-3xl border border-[#141210]/10 bg-white shadow-md">
                    <img
                      src="/images/gifts/apex-anc-headphones.png"
                      alt="Zenith Studio ANC Headphones"
                      className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
                      <span className="rounded-full bg-[#D95D39] px-2 py-0.5 text-[10px] font-bold uppercase">
                        Tech • $240
                      </span>
                      <p className="mt-1 font-display text-sm font-semibold">
                        Zenith Studio ANC Headphones
                      </p>
                    </div>
                  </div>

                  <div className="atelier-dark-card rounded-3xl p-4 text-white shadow-md">
                    <div className="flex items-center justify-between text-[11px] text-[#F3D9A4]">
                      <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider">
                        <Truck className="h-3.5 w-3.5" /> Live Carrier Telemetry
                      </span>
                      <span className="font-mono-code">DHL-NL-994820174</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-stone-100">
                      Rotterdam Atelier Hub → Amsterdam, NL
                    </p>
                    <div className="mt-2.5 grid grid-cols-5 gap-1">
                      <div className="h-1.5 rounded-full bg-emerald-400" />
                      <div className="h-1.5 rounded-full bg-emerald-400" />
                      <div className="h-1.5 rounded-full bg-emerald-400" />
                      <div className="h-1.5 rounded-full bg-amber-400" />
                      <div className="h-1.5 rounded-full bg-white/20" />
                    </div>
                    <p className="mt-2 text-[11px] text-stone-400">
                      Zero-customs regional routing • Pre-shipment gift swap enabled
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <div className="atelier-card rounded-3xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900">
                        RECIPIENT CONTROL
                      </span>
                      <RefreshCw className="h-3.5 w-3.5 text-[#D95D39]" />
                    </div>
                    <p className="mt-2 font-display text-sm font-semibold text-[#141210]">
                      Self-Service Delivery & Pre-Shipment Gift Swap
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                      Recipients manage saved addresses, courier drop-off instructions, or exchange gifts before label lock.
                    </p>
                  </div>

                  <div className="group relative overflow-hidden rounded-3xl border border-[#141210]/10 bg-white shadow-md">
                    <img
                      src="/images/gifts/nordic-espresso-bar.png"
                      alt="Nordic Architectural Espresso Bar"
                      className="h-60 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
                      <span className="rounded-full bg-[#0F5338] px-2 py-0.5 text-[10px] font-bold uppercase">
                        Home & Living • $250
                      </span>
                      <p className="mt-1 font-display text-sm font-semibold">
                        Nordic Architectural Espresso Bar
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Gift Categories & AI Studio Merchandising Showcase */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#D95D39]">
              <Layers className="h-3.5 w-3.5" />
              <span>First-Class Gift Taxonomy & AI Studio Catalog</span>
            </div>
            <h2 className="font-display mt-1 text-3xl font-semibold text-[#141210]">
              Explore Curated Gift Categories Across 4 Global Regions
            </h2>
          </div>

          {/* Regional Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-[#141210]/10 bg-white p-1">
            {["ALL", "NA", "EMEA", "APAC", "LATAM"].map((reg) => (
              <button
                key={reg}
                onClick={() => setActiveRegionFilter(reg)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  activeRegionFilter === reg
                    ? "bg-[#141210] text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {reg === "ALL" ? "All Regions" : reg}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pill Bar */}
        <div className="mt-6 flex flex-wrap gap-2">
          {SHOWCASE_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`group flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-left transition ${
                  isSelected
                    ? "border-[#141210] bg-[#141210] text-white shadow-sm"
                    : "border-[#141210]/10 bg-white text-[#141210] hover:border-[#D95D39]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{cat.name}</span>
                  </div>
                  <p
                    className={`text-[11px] ${
                      isSelected ? "text-stone-300" : "text-stone-500"
                    }`}
                  >
                    {cat.headline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Studio Product Lookbook Grid */}
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <div
              key={product.sku}
              className="atelier-card group flex flex-col justify-between overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div>
                <div className="relative h-56 overflow-hidden bg-[#F3EFE6]">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#141210]/85 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#F3D9A4] uppercase backdrop-blur-xs">
                      {product.category}
                    </span>
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#B84322] shadow-2xs">
                      {product.badge}
                    </span>
                  </div>
                  <div className="absolute right-3 bottom-3 rounded-full bg-white/95 px-3 py-1 font-mono-code text-xs font-extrabold text-[#141210] shadow-xs">
                    {formatCurrency(product.priceCents)}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span className="font-mono-code font-semibold">{product.sku}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#D95D39]" /> {product.origin}
                    </span>
                  </div>
                  <h3 className="font-display mt-1.5 text-base font-semibold text-[#141210] line-clamp-2">
                    {product.title}
                  </h3>
                  <p className="mt-1.5 text-xs font-medium text-stone-600">
                    Variants: <span className="text-[#141210]">{product.variants}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#141210]/8 bg-[#FAF8F5]/70 px-4 py-2.5 text-[11px]">
                <div className="flex flex-wrap gap-1">
                  {product.regions.map((r) => (
                    <span
                      key={r}
                      className="rounded bg-[#141210]/8 px-1.5 py-0.5 font-mono-code text-[10px] font-bold text-[#141210]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
                <Link
                  href="/claim/snappy_demo_na_100"
                  className="font-semibold text-[#D95D39] hover:underline"
                >
                  Preview in Claim →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Four Tailored Role Portals */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F5338]">
              Multi-Actor Architecture
            </span>
            <h2 className="font-display mt-1 text-3xl font-semibold text-[#141210]">
              Four Specialized Portals & End-to-End Workflows
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-stone-600">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-[#0F5338]" /> Escrow-Protected Wallets
            </span>
            <span className="inline-flex items-center gap-1">
              <HeartHandshake className="h-3.5 w-3.5 text-[#D95D39]" /> 100% Charity Option
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Role 1: Corporate */}
          <div className="atelier-card flex flex-col justify-between rounded-3xl p-6 transition hover:border-[#141210]/30">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#141210] text-[#F3D9A4]">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-stone-200/80 px-2.5 py-0.5 font-mono-code text-[10px] font-bold text-[#141210]">
                01 • CORPORATE SENDER
              </span>
              <h3 className="font-display mt-2.5 text-xl font-semibold text-[#141210]">
                Corporate Studio
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Fund escrow-backed budgets, filter gifts by category & region, build custom collections, launch campaigns, and inspect live shipment timelines.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#D95D39]" />
                  Category-filtered Collection Builder
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#D95D39]" />
                  Automatic surplus & swap reconciliation
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#D95D39]" />
                  Live Gratitude Wall & carrier status
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2 border-t border-[#141210]/8 pt-4">
              <Link
                href="/corporate"
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#141210] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#D95D39]"
              >
                <span>Open Corporate Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/auth/corporate"
                className="text-center text-xs font-medium text-stone-600 hover:text-[#141210]"
              >
                Corporate Enroll / Sign In →
              </Link>
            </div>
          </div>

          {/* Role 2: Regional Vendor */}
          <div className="atelier-card flex flex-col justify-between rounded-3xl p-6 transition hover:border-[#0F5338]/40">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F5338] text-white">
                <Package className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono-code text-[10px] font-bold text-[#0F5338]">
                02 • VENDOR & LOGISTICS
              </span>
              <h3 className="font-display mt-2.5 text-xl font-semibold text-[#141210]">
                Vendor Catalog & Dispatch
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Manage SKUs, variants, tags, specs, and stock. Generate AI studio imagery via MAI-Image, and dispatch orders with multi-checkpoint carrier scans.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0F5338]" />
                  Full SKU CRUD, Clone, Archive & Variants
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0F5338]" />
                  Live MAI-Image AI Studio Photo Generator
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0F5338]" />
                  Multi-stage carrier manifest & scan log
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2 border-t border-[#141210]/8 pt-4">
              <Link
                href="/vendor"
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#0F5338] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#141210]"
              >
                <span>Open Vendor Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/auth/vendor"
                className="text-center text-xs font-medium text-stone-600 hover:text-[#141210]"
              >
                Vendor Partner Application →
              </Link>
            </div>
          </div>

          {/* Role 3: Recipient */}
          <div className="atelier-card flex flex-col justify-between rounded-3xl p-6 transition hover:border-[#D95D39]/40">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D95D39] text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#D95D39]/15 px-2.5 py-0.5 font-mono-code text-[10px] font-bold text-[#B84322]">
                03 • RECIPIENT DELIVERY SUITE
              </span>
              <h3 className="font-display mt-2.5 text-xl font-semibold text-[#141210]">
                Recipient Unwrap & Delivery
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Browse regional gifts by category, choose variants, autofill from your Saved Address Book, edit delivery instructions, or swap gifts pre-shipment.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#D95D39]" />
                  Saved Multi-Address Book (Home / Office)
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#D95D39]" />
                  Pre-shipment address & instruction edits
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#D95D39]" />
                  1-click Pre-Shipment Gift Exchange
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2 border-t border-[#141210]/8 pt-4">
              <Link
                href="/recipient"
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#D95D39] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#141210]"
              >
                <span>Open Recipient Suite</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/claim/snappy_demo_na_100"
                className="text-center text-xs font-medium text-[#B84322] hover:underline"
              >
                Try Live Unwrap Experience →
              </Link>
            </div>
          </div>

          {/* Role 4: Platform Admin */}
          <div className="atelier-card flex flex-col justify-between rounded-3xl p-6 transition hover:border-[#7C2D12]/40">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7C2D12] text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono-code text-[10px] font-bold text-[#7C2D12]">
                04 • MARKETPLACE GOVERNANCE
              </span>
              <h3 className="font-display mt-2.5 text-xl font-semibold text-[#141210]">
                Platform Control Tower
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Govern gift categories & taxonomy, approve regional vendors, monitor global carrier shipments, manage charities, and sweep expired escrow.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#7C2D12]" />
                  Gift Category Taxonomy CRUD
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#7C2D12]" />
                  Global Carrier & Logistics Monitor
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#7C2D12]" />
                  Automated Expired Escrow Reclaim
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2 border-t border-[#141210]/8 pt-4">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#7C2D12] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#141210]"
              >
                <span>Open Control Tower</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/auth/admin"
                className="text-center text-xs font-medium text-stone-600 hover:text-[#141210]"
              >
                Platform Operator Sign In →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Fulfillment Matrix & Budget Tiers */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="atelier-card rounded-3xl p-6 sm:p-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F5338]">
              <Globe className="h-4 w-4" />
              <span>Domestic Regional Hubs • Zero Customs Friction</span>
            </div>
            <h3 className="font-display mt-1 text-2xl font-semibold text-[#141210]">
              4 Global Fulfillment Zones
            </h3>
            <p className="mt-1 text-xs text-stone-600">
              Every claimed gift is routed to a domestic regional warehouse in NA, EMEA, APAC, or LATAM with localized voltage, carrier integration, and SLA guarantees.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {REGIONS.map((r) => (
                <div
                  key={r.code}
                  className="rounded-2xl border border-[#141210]/8 bg-[#FAF8F5] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#141210] px-2.5 py-0.5 font-mono-code text-xs font-bold text-[#F3D9A4]">
                      {r.code}
                    </span>
                    <span className="text-[11px] font-semibold text-[#0F5338]">
                      {r.currencyNote}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-[#141210]">{r.label}</p>
                  <p className="mt-0.5 text-[11px] text-stone-600">{r.countries}</p>
                  <p className="mt-1 font-mono-code text-[10px] text-stone-500">
                    Hubs: {r.hubs}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="atelier-card rounded-3xl p-6 sm:p-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D95D39]">
              <Gift className="h-4 w-4" />
              <span>Escrow-Backed Budget Ceilings</span>
            </div>
            <h3 className="font-display mt-1 text-2xl font-semibold text-[#141210]">
              Curated Collections by Budget Tier
            </h3>
            <p className="mt-1 text-xs text-stone-600">
              Set a maximum allowance per recipient. When a recipient claims or swaps a lower-cost item, the unused difference is automatically credited back to your corporate wallet.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {BUDGET_TIERS.map((tier) => (
                <div
                  key={tier.cents}
                  className="rounded-2xl border border-[#141210]/8 bg-[#FAF8F5] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-bold text-[#141210]">
                      {formatCurrency(tier.cents)}
                    </span>
                    <span className="rounded-full bg-[#D95D39]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#B84322]">
                      {tier.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-stone-600">{tier.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
