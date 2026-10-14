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
} from "lucide-react";
import {
  BUDGET_TIERS,
  OCCASIONS,
  REGIONS,
  formatCurrency,
  type RegionCode,
} from "@/lib/constants";

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
        supportedRegions: string;
      };
    }[];
  }[];
  allActiveProducts: {
    id: string;
    title: string;
    category: string;
    priceCents: number;
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
      orderType: string;
      fulfillmentStatus: string;
      shippingAddressLine1: string;
      shippingCity: string;
      shippingCountry: string;
      trackingCarrier: string;
      trackingNumber: string;
      product?: { title: string } | null;
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
    "Thank you for your incredible impact this quarter! Unwrap your gift and pick whatever brings you joy."
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
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-500">
        Loading Corporate Gifting Workspace...
      </div>
    );
  }

  if (unauthorized || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Corporate Gifting Hub
          </h1>
          <p className="mt-2 text-xs text-slate-600">
            Sign in to a seeded corporate workspace with 1 click or enroll a new company.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => quickSignInCorporate("sarah.chen@acmecloud.io")}
              className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-left transition hover:bg-indigo-100/70"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">Acme Cloud Corp</div>
                <div className="text-[11px] text-indigo-700">
                  Sarah Chen • $12,450 Wallet Balance
                </div>
              </div>
              <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                Enter →
              </span>
            </button>
            <button
              onClick={() => quickSignInCorporate("marcus.vance@novafintech.com")}
              className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-left transition hover:bg-teal-100/70"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">Nova FinTech Global</div>
                <div className="text-[11px] text-teal-700">
                  Marcus Vance • EMEA HQ
                </div>
              </div>
              <span className="rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                Enter →
              </span>
            </button>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <Link
              href="/auth/corporate"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Or enroll a new Corporate Customer organization →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { company, collections, allActiveProducts, allGiftSends, thankYouWall, metrics } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Workspace Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-extrabold text-lg shadow-xs"
            style={{ backgroundColor: company.brandColor || "#4F46E5" }}
          >
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">
                CORPORATE WORKSPACE
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                Primary Region: {company.primaryRegion} • {company.sizeBand} Employees
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
              {company.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleToggleAddressPrivacy(!company.hideRecipientAddress)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              company.hideRecipientAddress
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-50 text-slate-600"
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
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-900">
          {banner}
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* KPI Metrics */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Available Wallet Balance</span>
            <Wallet className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.walletBalanceCents)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Ready for immediate campaign sends
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Escrow Held (Pending Claims)</span>
            <Shield className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.escrowBalanceCents)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Auto-refunded if expired or lower-priced item chosen
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Gifts Dispatched / Claimed</span>
            <Gift className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.totalClaimed} / {metrics.totalSent}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {metrics.claimRatePercent}% recipient claim conversion rate
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Gratitude Wall Notes</span>
            <MessageSquareHeart className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {thankYouWall.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Direct recipient thank-you messages
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "campaigns", label: "Launch Campaign & Send Gifts", icon: Send },
          {
            id: "sends",
            label: `Sent Gifts & Claim Links (${allGiftSends.length})`,
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
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                active
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
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
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Create Gifting Campaign & Dispatch Magic Links
                </h2>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                  No Recipient Address Required
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Campaign Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={campTitle}
                    onChange={(e) => setCampTitle(e.target.value)}
                    placeholder="Q4 Global Engineering Recognition"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Occasion
                  </label>
                  <select
                    value={campOccasion}
                    onChange={(e) => setCampOccasion(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                  <label className="block text-xs font-semibold text-slate-700">
                    Budget Tier per Recipient
                  </label>
                  <select
                    value={campBudgetCents}
                    onChange={(e) => setCampBudgetCents(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                  >
                    {BUDGET_TIERS.map((t) => (
                      <option key={t.cents} value={t.cents}>
                        {t.label} ({formatCurrency(t.cents)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Curated Gift Collection
                  </label>
                  <select
                    value={campCollectionId}
                    onChange={(e) => setCampCollectionId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Workflow Mode
                  </label>
                  <select
                    value={campTriggerType}
                    onChange={(e) =>
                      setCampTriggerType(
                        e.target.value as "MANUAL" | "BULK_CSV" | "AUTOMATED_MILESTONE"
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="MANUAL">Direct Send</option>
                    <option value="BULK_CSV">Bulk Team Drop</option>
                    <option value="AUTOMATED_MILESTONE">HRIS Milestone Trigger</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Personalized Greeting Card Message *
                </label>
                <textarea
                  rows={2}
                  required
                  value={campMessage}
                  onChange={(e) => setCampMessage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={campAllowCharity}
                  onChange={(e) => setCampAllowCharity(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>
                  Allow recipients to donate 100% of their gift allowance to verified charities
                </span>
              </label>

              {/* Recipients List */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Recipients ({recipients.length}) • Escrow Required:{" "}
                    <span className="text-indigo-700">
                      {formatCurrency(recipients.length * campBudgetCents)}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={populateGlobalTeamSample}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      + Load 4-Region Team (NA/EMEA/APAC/LATAM)
                    </button>
                    <button
                      type="button"
                      onClick={addRecipientRow}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
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
                        className="sm:col-span-4 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
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
                        className="sm:col-span-5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
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
                        className="sm:col-span-3 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
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
            <h3 className="text-sm font-bold text-slate-900">
              Active Corporate Gifting Programs ({company.campaigns.length})
            </h3>
            {company.campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                    {c.occasion}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {formatCurrency(c.budgetCents)} / gift
                  </span>
                </div>
                <h4 className="mt-2 text-base font-bold text-slate-900">{c.title}</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Collection: {c.collection?.title || "All Regional Curated Items"} • Mode:{" "}
                  {c.triggerType}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-600">
                    Total Sent: <strong>{c.giftSends.length}</strong>
                  </span>
                  <button
                    onClick={() => setActiveTab("sends")}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    View Claim Links →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Sent Gifts & Magic Claim Links */}
      {activeTab === "sends" && (
        <div className="mt-6 space-y-3">
          {allGiftSends.map((gs) => (
            <div
              key={gs.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:flex-row lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                    {gs.preferredRegion}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      ["DELIVERED", "DONATED"].includes(gs.status)
                        ? "bg-emerald-100 text-emerald-800"
                        : ["CLAIMED", "PROCESSING", "SHIPPED"].includes(gs.status)
                        ? "bg-indigo-100 text-indigo-800"
                        : gs.status === "EXPIRED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {gs.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700">
                    Code: {gs.claimCode}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-600">
                    Budget: {formatCurrency(gs.budgetCents)}
                  </span>
                </div>

                <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                  {gs.recipientName} ({gs.recipientEmail}) —{" "}
                  <span className="font-normal text-slate-600">{gs.campaignTitle}</span>
                </h3>

                {gs.giftOrder && (
                  <div className="mt-1 text-xs text-slate-600">
                    <span>
                      Redeemed:{" "}
                      <strong>
                        {gs.giftOrder.product?.title ||
                          (gs.giftOrder.charity
                            ? `Charitable Donation (${gs.giftOrder.charity.name})`
                            : "Gift")}
                      </strong>
                    </span>
                    {gs.giftOrder.orderType === "PHYSICAL_GIFT" && (
                      <span className="ml-2 text-slate-500">
                        • Destination: {gs.giftOrder.shippingAddressLine1},{" "}
                        {gs.giftOrder.shippingCity} ({gs.giftOrder.shippingCountry})
                      </span>
                    )}
                    {gs.giftOrder.trackingNumber && (
                      <span className="ml-2 font-mono text-indigo-700">
                        • Tracking: {gs.giftOrder.trackingCarrier} {gs.giftOrder.trackingNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/claim/${gs.claimToken}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open Recipient Claim Link</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
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
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Plus className="h-4 w-4 text-indigo-600" />
                <span>Build Custom Company Collection</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Collection Name *
                </label>
                <input
                  type="text"
                  required
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  placeholder="Acme President's Club Selection"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Budget Ceiling Tier
                </label>
                <select
                  value={colBudgetCents}
                  onChange={(e) => setColBudgetCents(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {BUDGET_TIERS.map((t) => (
                    <option key={t.cents} value={t.cents}>
                      {t.label} ({formatCurrency(t.cents)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={colDescription}
                  onChange={(e) => setColDescription(e.target.value)}
                  placeholder="Handpicked items for our global engineering & sales teams"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Marketplace Products ({selectedProductIds.length} chosen) *
                </label>
                <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2.5">
                  {allActiveProducts.map((p) => {
                    const checked = selectedProductIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
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
                          <span className="font-medium text-slate-800">{p.title}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">
                          {formatCurrency(p.priceCents)} • {p.supportedRegions}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Save Custom Collection
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {collections.map((col) => (
              <div
                key={col.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      col.isGlobal
                        ? "bg-violet-50 text-violet-700"
                        : "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    {col.isGlobal ? "Snappy Curated Collection" : "Custom Company Collection"}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    Up to {formatCurrency(col.budgetTierCents)}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">{col.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{col.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {col.collectionProducts.map((cp) => (
                    <span
                      key={cp.product.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
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
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
            >
              <h3 className="text-base font-bold text-slate-900">
                Fund Corporate Gifting Balance
              </h3>
              <p className="text-xs text-slate-600">
                Funds are held in your corporate wallet and moved to escrow when gifts are sent. Unused balances from lower-priced selections or expired links automatically return here.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Deposit Amount (USD $)
                </label>
                <input
                  type="number"
                  min={10}
                  step={50}
                  required
                  value={depositDollars}
                  onChange={(e) => setDepositDollars(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Cost Center / Accounting Note
                </label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Add {formatCurrency(Math.round(Number(depositDollars) * 100))} to Wallet
              </button>
            </form>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <h3 className="text-base font-bold text-slate-900">
                Wallet & Escrow Ledger History
              </h3>
              <div className="mt-4 space-y-2.5">
                {company.walletTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs"
                  >
                    <div>
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                        {tx.type}
                      </span>
                      <p className="mt-1 font-semibold text-slate-900">{tx.note}</p>
                      <p className="text-[11px] text-slate-400">Ref: {tx.referenceId}</p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-extrabold ${
                          tx.amountCents >= 0 ? "text-emerald-600" : "text-amber-700"
                        }`}
                      >
                        {tx.amountCents >= 0 ? "+" : ""}
                        {formatCurrency(tx.amountCents)}
                      </div>
                      <div className="text-[11px] text-slate-500">
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
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                    {note.occasion}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {note.preferredRegion}
                  </span>
                </div>
                <p className="mt-3 text-sm italic leading-relaxed text-slate-800">
                  &ldquo;{note.thankYouNote}&rdquo;
                </p>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
                <div className="font-bold text-slate-900">{note.recipientName}</div>
                <div className="text-[11px] text-slate-500">
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
