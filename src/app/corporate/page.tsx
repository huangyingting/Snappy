"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Gift,
  Wallet,
  Sparkles,
  Send,
  Shield,
  MessageSquareHeart,
  Layers,
  ExternalLink,
  Plus,
  Tag,
} from "lucide-react";
import {
  BUDGET_TIERS,
  OCCASIONS,
  REGIONS,
  formatCurrency,
  type RegionCode,
} from "@/lib/constants";
import { LogisticsTimeline, type ShipmentCheckpoint } from "@/components/LogisticsTimeline";

interface CorporateDashboardData {
  company: {
    id: string;
    name: string;
    domain: string;
    industry: string;
    sizeBand: string;
    primaryRegion: string;
    brandColor: string;
    walletBalanceCents: number;
    escrowBalanceCents: number;
    hideRecipientAddress: boolean;
    walletTransactions: {
      id: string;
      type: string;
      amountCents: number;
      balanceAfter: number;
      escrowAfter: number;
      note: string;
      referenceId: string;
      createdAt: string;
    }[];
    campaigns: {
      id: string;
      title: string;
      occasion: string;
      budgetCents: number;
      triggerType: string;
      allowCharity: boolean;
      status: string;
      collection?: { id: string; title: string } | null;
      giftSends: { id: string; status: string }[];
    }[];
  };
  collections: {
    id: string;
    title: string;
    description: string;
    occasion: string;
    budgetTierCents: number;
    isGlobal: boolean;
    collectionProducts: {
      product: {
        id: string;
        title: string;
        priceCents: number;
        category: string;
        imageUrl?: string;
        supportedRegions: string;
      };
    }[];
  }[];
  giftCategories: {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    accentColor: string;
  }[];
  allActiveProducts: {
    id: string;
    sku: string;
    title: string;
    category: string;
    priceCents: number;
    imageUrl: string;
    supportedRegions: string;
    vendor: { businessName: string };
  }[];
  allGiftSends: {
    id: string;
    campaignTitle: string;
    occasion: string;
    recipientName: string;
    recipientEmail: string;
    preferredRegion: string;
    claimToken: string;
    claimCode: string;
    budgetCents: number;
    status: string;
    thankYouNote: string;
    giftOrder?: {
      id: string;
      orderType: string;
      fulfillmentStatus: string;
      selectedVariant: string;
      shippingAddressLine1: string;
      shippingCity: string;
      shippingCountry: string;
      addressLocked: boolean;
      swapCount: number;
      trackingCarrier: string;
      trackingNumber: string;
      trackingUrl: string;
      serviceLevel: string;
      fulfillmentWarehouse: string;
      packageWeightGrams: number;
      estimatedDeliveryAt?: string | null;
      exceptionNote?: string;
      shipmentEvents?: ShipmentCheckpoint[];
      product?: { title: string; imageUrl?: string; category?: string } | null;
      charity?: { name: string } | null;
    } | null;
  }[];
  thankYouWall: {
    id: string;
    recipientName: string;
    preferredRegion: string;
    campaignTitle: string;
    occasion: string;
    thankYouNote: string;
    giftTitle: string;
  }[];
  metrics: {
    walletBalanceCents: number;
    escrowBalanceCents: number;
    totalCampaigns: number;
    totalSent: number;
    totalClaimed: number;
    totalDelivered: number;
    claimRatePercent: number;
  };
}

export default function CorporatePortalPage() {
  const [data, setData] = useState<CorporateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "campaigns" | "sends" | "collections" | "wallet" | "gratitude"
  >("campaigns");
  const [banner, setBanner] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Campaign Launcher State
  const [campTitle, setCampTitle] = useState("");
  const [campOccasion, setCampOccasion] = useState(OCCASIONS[0]);
  const [campBudgetCents, setCampBudgetCents] = useState(10000);
  const [campCollectionId, setCampCollectionId] = useState("");
  const [campTriggerType, setCampTriggerType] = useState<
    "MANUAL" | "BULK_CSV" | "AUTOMATED_MILESTONE"
  >("MANUAL");
  const [campAllowCharity, setCampAllowCharity] = useState(true);
  const [campMessage, setCampMessage] = useState(
    "Thank you for your extraordinary craftsmanship and impact this quarter! Unwrap your curated Snappy Atelier gift and select whatever inspires you."
  );
  const [recipients, setRecipients] = useState<
    { recipientName: string; recipientEmail: string; preferredRegion: RegionCode }[]
  >([
    {
      recipientName: "Taylor Brooks",
      recipientEmail: "taylor.brooks@acmecloud.io",
      preferredRegion: "NA",
    },
  ]);

  // Wallet Deposit State
  const [depositDollars, setDepositDollars] = useState(1500);
  const [depositNote, setDepositNote] = useState("Quarterly People Ops Recognition Top-Up");

  // Custom Collection State
  const [colTitle, setColTitle] = useState("");
  const [colDescription, setColDescription] = useState("");
  const [colBudgetCents, setColBudgetCents] = useState(10000);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [colCategoryFilter, setColCategoryFilter] = useState<string>("ALL");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/corporate/dashboard");
      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        setData(null);
      } else {
        const json = await res.json();
        if (res.ok) {
          setUnauthorized(false);
          setData(json);
          if (json.collections?.length > 0 && !campCollectionId) {
            setCampCollectionId(json.collections[0].id);
          }
        } else {
          setErrorMsg(json.error || "Failed to load corporate workspace.");
        }
      }
    } catch {
      setErrorMsg("Network error loading corporate portal.");
    } finally {
      setLoading(false);
    }
  }, [campCollectionId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function quickSignInCorporate(email: string) {
    await fetch("/api/auth/demo-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    await loadDashboard();
  }

  function addRecipientRow() {
    setRecipients((prev) => [
      ...prev,
      { recipientName: "", recipientEmail: "", preferredRegion: "EMEA" },
    ]);
  }

  function populateGlobalTeamSample() {
    setRecipients([
      {
        recipientName: "Hannah Abbott (New York)",
        recipientEmail: "hannah.na@acmecloud.io",
        preferredRegion: "NA",
      },
      {
        recipientName: "Lukas Weber (Berlin)",
        recipientEmail: "lukas.emea@acmecloud.io",
        preferredRegion: "EMEA",
      },
      {
        recipientName: "Mei Lin (Singapore)",
        recipientEmail: "mei.apac@acmecloud.io",
        preferredRegion: "APAC",
      },
      {
        recipientName: "Camila Rojas (Bogotá)",
        recipientEmail: "camila.latam@acmecloud.io",
        preferredRegion: "LATAM",
      },
    ]);
  }

  async function handleLaunchCampaign(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setBanner("");

    const validRecipients = recipients.filter(
      (r) => r.recipientName.trim() && r.recipientEmail.trim()
    );

    const res = await fetch("/api/corporate/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: campTitle,
        occasion: campOccasion,
        messageTemplate: campMessage,
        budgetCents: Number(campBudgetCents),
        collectionId: campCollectionId || null,
        triggerType: campTriggerType,
        allowCharity: campAllowCharity,
        recipients: validRecipients,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Could not launch campaign.");
    } else {
      setCampTitle("");
      setBanner(
        `Launched "${json.campaign.title}" and dispatched ${json.giftSends.length} magic claim link(s)! Funds reserved in Escrow.`
      );
      setActiveTab("sends");
      await loadDashboard();
    }
  }

  async function handleWalletDeposit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setBanner("");
    const res = await fetch("/api/corporate/wallet/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: Math.round(Number(depositDollars) * 100),
        note: depositNote,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Deposit failed.");
    } else {
      setBanner(
        `Added ${formatCurrency(Math.round(Number(depositDollars) * 100))} to corporate wallet.`
      );
      await loadDashboard();
    }
  }

  async function handleToggleAddressPrivacy(hide: boolean) {
    await fetch("/api/corporate/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hideRecipientAddress: hide }),
    });
    await loadDashboard();
  }

  async function handleCreateCustomCollection(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setBanner("");
    const res = await fetch("/api/corporate/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: colTitle,
        description: colDescription,
        occasion: "Custom Branded",
        budgetTierCents: Number(colBudgetCents),
        productIds: selectedProductIds,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Failed to create custom collection.");
    } else {
      setColTitle("");
      setColDescription("");
      setSelectedProductIds([]);
      setBanner(`Created custom company collection "${json.collection.title}".`);
      await loadDashboard();
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[#6E665E]">
        Loading Corporate Gifting Studio...
      </div>
    );
  }

  if (unauthorized || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="rounded-3xl border border-[#E6E0D6] bg-white p-8 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141210] text-[#FAF8F5]">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#141210]">
            Corporate Gifting Studio
          </h1>
          <p className="mt-2 text-xs text-[#6E665E]">
            Sign in to a seeded corporate workspace with 1 click or enroll a new enterprise organization.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => quickSignInCorporate("sarah.chen@acmecloud.io")}
              className="flex items-center justify-between rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-4 text-left transition hover:border-[#C85A32]"
            >
              <div>
                <div className="text-xs font-bold text-[#141210]">Acme Cloud Corp</div>
                <div className="text-[11px] text-[#6E665E]">
                  Sarah Chen • $12,450 Wallet Balance
                </div>
              </div>
              <span className="rounded-full bg-[#141210] px-3 py-1 text-[11px] font-semibold text-[#FAF8F5]">
                Enter →
              </span>
            </button>
            <button
              onClick={() => quickSignInCorporate("marcus.vance@novafintech.com")}
              className="flex items-center justify-between rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-4 text-left transition hover:border-[#1F4D3A]"
            >
              <div>
                <div className="text-xs font-bold text-[#141210]">Nova FinTech Global</div>
                <div className="text-[11px] text-[#6E665E]">
                  Marcus Vance • EMEA HQ
                </div>
              </div>
              <span className="rounded-full bg-[#1F4D3A] px-3 py-1 text-[11px] font-semibold text-white">
                Enter →
              </span>
            </button>
          </div>
          <div className="mt-6 border-t border-[#EFECE6] pt-4">
            <Link
              href="/auth/corporate"
              className="text-xs font-semibold text-[#C85A32] hover:underline"
            >
              Or enroll a new Corporate Customer organization →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const {
    company,
    collections,
    giftCategories,
    allActiveProducts,
    allGiftSends,
    thankYouWall,
    metrics,
  } = data;

  const filteredMarketplaceProducts = allActiveProducts.filter(
    (p) => colCategoryFilter === "ALL" || p.category === colCategoryFilter
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Workspace Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#E6E0D6] bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div
            className="flex h-13 w-13 items-center justify-center rounded-2xl font-serif text-xl font-bold text-white shadow-xs"
            style={{ backgroundColor: company.brandColor || "#141210" }}
          >
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#141210] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#FAF8F5]">
                Corporate Gifting Studio
              </span>
              <span className="rounded-full border border-[#E6E0D6] bg-[#FAF8F5] px-2.5 py-0.5 text-xs font-semibold text-[#575049]">
                Primary Region: {company.primaryRegion} • {company.sizeBand} Employees
              </span>
            </div>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-[#141210]">
              {company.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleToggleAddressPrivacy(!company.hideRecipientAddress)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${
              company.hideRecipientAddress
                ? "border-[#1F4D3A]/30 bg-[#1F4D3A]/10 text-[#1F4D3A]"
                : "border-[#E6E0D6] bg-[#FAF8F5] text-[#575049]"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>
              Address Privacy Shield: {company.hideRecipientAddress ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      </div>

      {banner && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900">
          {banner}
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* KPI Metrics */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
            <span>Available Wallet Balance</span>
            <Wallet className="h-4 w-4 text-[#C85A32]" />
          </div>
          <div className="mt-2 font-serif text-3xl font-semibold text-[#141210]">
            {formatCurrency(metrics.walletBalanceCents)}
          </div>
          <div className="mt-1 text-[11px] text-[#6E665E]">
            Ready for immediate campaign sends
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
            <span>Escrow Held (Pending Claims)</span>
            <Shield className="h-4 w-4 text-[#1F4D3A]" />
          </div>
          <div className="mt-2 font-serif text-3xl font-semibold text-[#141210]">
            {formatCurrency(metrics.escrowBalanceCents)}
          </div>
          <div className="mt-1 text-[11px] text-[#6E665E]">
            Auto-refunded on lower-price choice or expiry
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
            <span>Gifts Dispatched / Claimed</span>
            <Gift className="h-4 w-4 text-[#C85A32]" />
          </div>
          <div className="mt-2 font-serif text-3xl font-semibold text-[#141210]">
            {metrics.totalClaimed} / {metrics.totalSent}
          </div>
          <div className="mt-1 text-[11px] text-[#6E665E]">
            {metrics.claimRatePercent}% recipient claim conversion rate
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
            <span>Gratitude Wall Notes</span>
            <MessageSquareHeart className="h-4 w-4 text-[#C85A32]" />
          </div>
          <div className="mt-2 font-serif text-3xl font-semibold text-[#141210]">
            {thankYouWall.length}
          </div>
          <div className="mt-1 text-[11px] text-[#6E665E]">
            Direct recipient thank-you messages
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#E6E0D6] pb-3">
        {[
          { id: "campaigns", label: "Launch Campaign & Send Gifts", icon: Send },
          {
            id: "sends",
            label: `Sent Gifts & Live Logistics (${allGiftSends.length})`,
            icon: Gift,
          },
          {
            id: "collections",
            label: `Gift Collections (${collections.length})`,
            icon: Layers,
          },
          { id: "wallet", label: "Wallet & Escrow Ledger", icon: Wallet },
          {
            id: "gratitude",
            label: `Gratitude Wall (${thankYouWall.length})`,
            icon: MessageSquareHeart,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id as "campaigns" | "sends" | "collections" | "wallet" | "gratitude"
                )
              }
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition ${
                active
                  ? "bg-[#141210] text-[#FAF8F5] shadow-xs"
                  : "bg-white text-[#575049] hover:bg-[#EFECE6]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Campaign Launcher */}
      {activeTab === "campaigns" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <form
              onSubmit={handleLaunchCampaign}
              className="space-y-4 rounded-3xl border border-[#E6E0D6] bg-white p-6 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold text-[#141210]">
                  Create Gifting Campaign & Dispatch Magic Links
                </h2>
                <span className="rounded-full bg-[#1F4D3A]/10 px-3 py-1 text-[11px] font-bold text-[#1F4D3A]">
                  No Recipient Address Required
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#575049]">
                    Campaign Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={campTitle}
                    onChange={(e) => setCampTitle(e.target.value)}
                    placeholder="Q4 Global Engineering Recognition"
                    className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575049]">
                    Occasion
                  </label>
                  <select
                    value={campOccasion}
                    onChange={(e) => setCampOccasion(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold"
                  >
                    {OCCASIONS.map((occ) => (
                      <option key={occ} value={occ}>
                        {occ}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-[#575049]">
                    Budget Tier per Recipient
                  </label>
                  <select
                    value={campBudgetCents}
                    onChange={(e) => setCampBudgetCents(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold"
                  >
                    {BUDGET_TIERS.map((t) => (
                      <option key={t.cents} value={t.cents}>
                        {t.label} ({formatCurrency(t.cents)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575049]">
                    Curated Gift Collection
                  </label>
                  <select
                    value={campCollectionId}
                    onChange={(e) => setCampCollectionId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575049]">
                    Workflow Mode
                  </label>
                  <select
                    value={campTriggerType}
                    onChange={(e) =>
                      setCampTriggerType(
                        e.target.value as "MANUAL" | "BULK_CSV" | "AUTOMATED_MILESTONE"
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold"
                  >
                    <option value="MANUAL">Direct Send</option>
                    <option value="BULK_CSV">Bulk Team Drop</option>
                    <option value="AUTOMATED_MILESTONE">HRIS Milestone Trigger</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#575049]">
                  Personalized Greeting Card Message *
                </label>
                <textarea
                  rows={2}
                  required
                  value={campMessage}
                  onChange={(e) => setCampMessage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3.5 py-2 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-[#141210]">
                <input
                  type="checkbox"
                  checked={campAllowCharity}
                  onChange={(e) => setCampAllowCharity(e.target.checked)}
                />
                <span>
                  Allow recipients to donate 100% of their gift allowance to verified charities
                </span>
              </label>

              {/* Recipients List */}
              <div className="rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#141210]">
                    Recipients ({recipients.length}) • Escrow Required:{" "}
                    <span className="text-[#C85A32]">
                      {formatCurrency(recipients.length * campBudgetCents)}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={populateGlobalTeamSample}
                      className="rounded-full border border-[#C85A32]/30 bg-[#C85A32]/10 px-3 py-1 text-[11px] font-bold text-[#C85A32] hover:bg-[#C85A32]/20"
                    >
                      + Load 4-Region Team (NA/EMEA/APAC/LATAM)
                    </button>
                    <button
                      type="button"
                      onClick={addRecipientRow}
                      className="rounded-full border border-[#E6E0D6] bg-white px-3 py-1 text-[11px] font-semibold text-[#141210] hover:border-[#141210]"
                    >
                      + Add Row
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {recipients.map((rec, idx) => (
                    <div key={idx} className="grid gap-2 sm:grid-cols-12">
                      <input
                        type="text"
                        required
                        placeholder="Recipient Name"
                        value={rec.recipientName}
                        onChange={(e) => {
                          const next = [...recipients];
                          next[idx] = { ...next[idx], recipientName: e.target.value };
                          setRecipients(next);
                        }}
                        className="sm:col-span-4 rounded-xl border border-[#E6E0D6] bg-white px-3 py-1.5 text-xs"
                      />
                      <input
                        type="email"
                        required
                        placeholder="recipient@company.com"
                        value={rec.recipientEmail}
                        onChange={(e) => {
                          const next = [...recipients];
                          next[idx] = { ...next[idx], recipientEmail: e.target.value };
                          setRecipients(next);
                        }}
                        className="sm:col-span-5 rounded-xl border border-[#E6E0D6] bg-white px-3 py-1.5 text-xs"
                      />
                      <select
                        value={rec.preferredRegion}
                        onChange={(e) => {
                          const next = [...recipients];
                          next[idx] = {
                            ...next[idx],
                            preferredRegion: e.target.value as RegionCode,
                          };
                          setRecipients(next);
                        }}
                        className="sm:col-span-3 rounded-xl border border-[#E6E0D6] bg-white px-2 py-1.5 text-xs font-semibold"
                      >
                        {REGIONS.map((r) => (
                          <option key={r.code} value={r.code}>
                            Region: {r.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#141210] px-6 py-3.5 text-xs font-bold text-[#FAF8F5] shadow-sm transition hover:bg-[#C85A32]"
              >
                <Send className="h-4 w-4" />
                <span>
                  Launch Campaign & Reserve {formatCurrency(recipients.length * campBudgetCents)} in Escrow
                </span>
              </button>
            </form>
          </div>

          {/* Right Column: Active Campaigns */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-serif text-lg font-semibold text-[#141210]">
              Active Corporate Gifting Programs ({company.campaigns.length})
            </h3>
            {company.campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-3xl border border-[#E6E0D6] bg-white p-5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#FAF8F5] border border-[#E6E0D6] px-3 py-0.5 text-[11px] font-bold text-[#C85A32]">
                    {c.occasion}
                  </span>
                  <span className="font-serif text-lg font-semibold text-[#141210]">
                    {formatCurrency(c.budgetCents)} / gift
                  </span>
                </div>
                <h4 className="mt-2 font-serif text-lg font-semibold text-[#141210]">
                  {c.title}
                </h4>
                <p className="mt-1 text-xs text-[#6E665E]">
                  Collection: {c.collection?.title || "All Regional Curated Items"} • Mode:{" "}
                  {c.triggerType}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-[#EFECE6] pt-3 text-xs">
                  <span className="text-[#575049]">
                    Total Sent: <strong>{c.giftSends.length}</strong>
                  </span>
                  <button
                    onClick={() => setActiveTab("sends")}
                    className="font-bold text-[#C85A32] hover:underline"
                  >
                    View Claim Links & Tracking →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Sent Gifts & Live Carrier Logistics */}
      {activeTab === "sends" && (
        <div className="mt-6 space-y-5">
          {allGiftSends.map((gs) => (
            <div
              key={gs.id}
              className="rounded-3xl border border-[#E6E0D6] bg-white p-6 shadow-xs"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex items-start gap-4">
                  {gs.giftOrder?.product?.imageUrl && (
                    <img
                      src={gs.giftOrder.product.imageUrl}
                      alt={gs.giftOrder.product.title}
                      className="h-18 w-18 rounded-2xl border border-[#E6E0D6] object-cover"
                    />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#141210] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#FAF8F5]">
                        {gs.preferredRegion}
                      </span>
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                          ["DELIVERED", "DONATED"].includes(gs.status)
                            ? "bg-[#1F4D3A]/15 text-[#1F4D3A]"
                            : ["CLAIMED", "PROCESSING", "SHIPPED"].includes(gs.status)
                            ? "bg-[#C85A32]/15 text-[#C85A32]"
                            : gs.status === "EXPIRED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {gs.status}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#575049]">
                        Code: {gs.claimCode}
                      </span>
                      <span className="text-xs font-semibold text-[#6E665E]">
                        • Budget: {formatCurrency(gs.budgetCents)}
                      </span>
                    </div>

                    <h3 className="mt-1.5 font-serif text-lg font-semibold text-[#141210]">
                      {gs.recipientName} ({gs.recipientEmail}) —{" "}
                      <span className="font-sans text-xs font-normal text-[#6E665E]">
                        {gs.campaignTitle}
                      </span>
                    </h3>

                    {gs.giftOrder && (
                      <div className="mt-1 text-xs text-[#575049]">
                        <span>
                          Redeemed:{" "}
                          <strong className="text-[#141210]">
                            {gs.giftOrder.product?.title ||
                              (gs.giftOrder.charity
                                ? `Charitable Donation (${gs.giftOrder.charity.name})`
                                : "Gift")}
                          </strong>
                        </span>
                        {gs.giftOrder.orderType === "PHYSICAL_GIFT" && (
                          <span className="ml-2 text-[#6E665E]">
                            • Destination: {gs.giftOrder.shippingAddressLine1},{" "}
                            {gs.giftOrder.shippingCity} ({gs.giftOrder.shippingCountry})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/claim/${gs.claimToken}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D6] bg-[#FAF8F5] px-4 py-2 text-xs font-bold text-[#141210] transition hover:border-[#141210]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#C85A32]" />
                    <span>Open Recipient Claim Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {gs.giftOrder && gs.giftOrder.orderType === "PHYSICAL_GIFT" && (
                <div className="mt-4">
                  <LogisticsTimeline
                    fulfillmentStatus={gs.giftOrder.fulfillmentStatus}
                    trackingCarrier={gs.giftOrder.trackingCarrier}
                    trackingNumber={gs.giftOrder.trackingNumber}
                    trackingUrl={gs.giftOrder.trackingUrl}
                    serviceLevel={gs.giftOrder.serviceLevel}
                    fulfillmentWarehouse={gs.giftOrder.fulfillmentWarehouse}
                    packageWeightGrams={gs.giftOrder.packageWeightGrams}
                    estimatedDeliveryAt={gs.giftOrder.estimatedDeliveryAt}
                    addressLocked={gs.giftOrder.addressLocked}
                    exceptionNote={gs.giftOrder.exceptionNote}
                    swapCount={gs.giftOrder.swapCount}
                    selectedVariant={gs.giftOrder.selectedVariant}
                    shipmentEvents={gs.giftOrder.shipmentEvents || []}
                    compact
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Curated & Custom Collections */}
      {activeTab === "collections" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateCustomCollection}
              className="space-y-4 rounded-3xl border border-[#E6E0D6] bg-white p-6 shadow-xs"
            >
              <div className="flex items-center gap-2 font-serif text-lg font-semibold text-[#141210]">
                <Plus className="h-4 w-4 text-[#C85A32]" />
                <span>Build Custom Company Collection</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#575049]">
                  Collection Name *
                </label>
                <input
                  type="text"
                  required
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  placeholder="Acme President's Club Selection"
                  className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#575049]">
                  Budget Ceiling Tier
                </label>
                <select
                  value={colBudgetCents}
                  onChange={(e) => setColBudgetCents(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold"
                >
                  {BUDGET_TIERS.map((t) => (
                    <option key={t.cents} value={t.cents}>
                      {t.label} ({formatCurrency(t.cents)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#575049]">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={colDescription}
                  onChange={(e) => setColDescription(e.target.value)}
                  placeholder="Handpicked items for our global engineering & sales teams"
                  className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3.5 py-2 text-xs"
                />
              </div>

              {/* Category Filter inside Collection Builder */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#575049]">
                    Filter by Category ({selectedProductIds.length} chosen) *
                  </span>
                </div>
                <div className="mb-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setColCategoryFilter("ALL")}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      colCategoryFilter === "ALL"
                        ? "bg-[#141210] text-[#FAF8F5]"
                        : "bg-[#FAF8F5] text-[#575049]"
                    }`}
                  >
                    All
                  </button>
                  {giftCategories?.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setColCategoryFilter(cat.name)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        colCategoryFilter === cat.name
                          ? "bg-[#C85A32] text-white"
                          : "bg-[#FAF8F5] text-[#575049]"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-2.5">
                  {filteredMarketplaceProducts.map((p) => {
                    const checked = selectedProductIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-1.5 text-xs hover:bg-white"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedProductIds((prev) =>
                                prev.includes(p.id)
                                  ? prev.filter((id) => id !== p.id)
                                  : [...prev, p.id]
                              )
                            }
                          />
                          <span className="font-semibold text-[#141210]">{p.title}</span>
                          <span className="text-[10px] text-[#C85A32]">({p.category})</span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-[#6E665E]">
                          {formatCurrency(p.priceCents)} • {p.supportedRegions}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#141210] py-3 text-xs font-bold text-[#FAF8F5] hover:bg-[#C85A32]"
              >
                Save Custom Collection
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {collections.map((col) => (
              <div
                key={col.id}
                className="rounded-3xl border border-[#E6E0D6] bg-white p-6 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-0.5 text-[11px] font-bold ${
                      col.isGlobal
                        ? "bg-[#141210] text-[#FAF8F5]"
                        : "bg-[#C85A32]/15 text-[#C85A32]"
                    }`}
                  >
                    {col.isGlobal ? "Snappy Atelier Collection" : "Custom Company Collection"}
                  </span>
                  <span className="font-serif text-lg font-semibold text-[#141210]">
                    Up to {formatCurrency(col.budgetTierCents)}
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-xl font-semibold text-[#141210]">
                  {col.title}
                </h3>
                <p className="mt-1 text-xs text-[#6E665E]">{col.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {col.collectionProducts.map((cp) => (
                    <span
                      key={cp.product.id}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-1 text-[11px] font-medium text-[#141210]"
                    >
                      <Tag className="h-3 w-3 text-[#C85A32]" />
                      {cp.product.title} ({formatCurrency(cp.product.priceCents)} •{" "}
                      {cp.product.supportedRegions})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Wallet & Escrow Ledger */}
      {activeTab === "wallet" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleWalletDeposit}
              className="space-y-4 rounded-3xl border border-[#E6E0D6] bg-white p-6 shadow-xs"
            >
              <h3 className="font-serif text-xl font-semibold text-[#141210]">
                Fund Corporate Gifting Balance
              </h3>
              <p className="text-xs text-[#6E665E]">
                Funds are held in your corporate wallet and moved to escrow when gifts are sent. Unused balances from lower-priced selections or expired links automatically return here.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#575049]">
                  Deposit Amount (USD $)
                </label>
                <input
                  type="number"
                  min={10}
                  step={50}
                  required
                  value={depositDollars}
                  onChange={(e) => setDepositDollars(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3.5 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#575049]">
                  Cost Center / Accounting Note
                </label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3.5 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#141210] py-3 text-xs font-bold text-[#FAF8F5] hover:bg-[#C85A32]"
              >
                Add {formatCurrency(Math.round(Number(depositDollars) * 100))} to Wallet
              </button>
            </form>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-[#E6E0D6] bg-white p-6 shadow-xs">
              <h3 className="font-serif text-xl font-semibold text-[#141210]">
                Wallet & Escrow Ledger History
              </h3>
              <div className="mt-4 space-y-2.5">
                {company.walletTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-3.5 text-xs"
                  >
                    <div>
                      <span className="rounded-md bg-[#141210] px-2 py-0.5 font-mono text-[10px] font-bold text-[#FAF8F5]">
                        {tx.type}
                      </span>
                      <p className="mt-1 font-semibold text-[#141210]">{tx.note}</p>
                      <p className="font-mono text-[11px] text-[#6E665E]">
                        Ref: {tx.referenceId}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-serif text-base font-bold ${
                          tx.amountCents >= 0 ? "text-[#1F4D3A]" : "text-[#C85A32]"
                        }`}
                      >
                        {tx.amountCents >= 0 ? "+" : ""}
                        {formatCurrency(tx.amountCents)}
                      </div>
                      <div className="text-[11px] text-[#6E665E]">
                        Wallet: {formatCurrency(tx.balanceAfter)} • Escrow:{" "}
                        {formatCurrency(tx.escrowAfter)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Gratitude Wall */}
      {activeTab === "gratitude" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {thankYouWall.map((note) => (
            <div
              key={note.id}
              className="flex flex-col justify-between rounded-3xl border border-[#E6E0D6] bg-white p-6 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#C85A32]/15 px-3 py-0.5 text-[11px] font-bold text-[#C85A32]">
                    {note.occasion}
                  </span>
                  <span className="rounded-full bg-[#FAF8F5] border border-[#E6E0D6] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#575049]">
                    {note.preferredRegion}
                  </span>
                </div>
                <p className="mt-3 font-serif text-base italic leading-relaxed text-[#141210]">
                  &ldquo;{note.thankYouNote}&rdquo;
                </p>
              </div>
              <div className="mt-4 border-t border-[#EFECE6] pt-3 text-xs">
                <div className="font-bold text-[#141210]">{note.recipientName}</div>
                <div className="text-[11px] text-[#6E665E]">
                  Chose: {note.giftTitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
