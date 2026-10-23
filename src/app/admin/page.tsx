"use client";

import { Disclosure } from "@/components/Disclosure";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Package,
  DollarSign,
  RotateCcw,
  HeartHandshake,
  Activity,
  CheckCircle2,
  Ban,
  Plus,
  Tag,
  Truck,
} from "lucide-react";
import { BUDGET_TIERS, formatCurrency } from "@/lib/constants";
import { LogisticsTimeline, type ShipmentCheckpoint } from "@/components/LogisticsTimeline";

interface AdminDashboardData {
  companies: {
    id: string;
    name: string;
    primaryRegion: string;
    walletBalanceCents: number;
    escrowBalanceCents: number;
    _count: { campaigns: number; giftSends: number };
  }[];
  vendors: {
    id: string;
    businessName: string;
    taxId: string;
    status: string;
    hqCountry: string;
    supportedRegions: string;
    commissionRateBps: number;
    payoutBalanceCents: number;
    _count: { products: number; giftOrders: number };
  }[];
  giftCategories: {
    id: string;
    slug: string;
    name: string;
    headline?: string;
    tagline?: string;
    description: string;
    accentColor: string;
    displayOrder?: number;
    _count: { products: number };
  }[];
  products: {
    id: string;
    sku: string;
    title: string;
    category: string;
    priceCents: number;
    supportedRegions: string;
    vendor: { businessName: string; status: string };
  }[];
  collections: {
    id: string;
    title: string;
    occasion: string;
    budgetTierCents: number;
    _count: { collectionProducts: number; campaigns: number };
  }[];
  charities: {
    id: string;
    name: string;
    category: string;
    description: string;
    totalDonatedCents: number;
  }[];
  giftOrders: {
    id: string;
    orderType: string;
    fulfillmentStatus: string;
    recipientRegion: string;
    selectedVariant: string;
    shippingName: string;
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
    shipmentEvents: ShipmentCheckpoint[];
    product?: { title: string; sku: string; imageUrl: string; category: string } | null;
    vendor?: { businessName: string } | null;
    giftSend: { recipientName: string; claimCode: string; company: { name: string } };
  }[];
  expiredUnclaimedGifts: {
    id: string;
    recipientName: string;
    recipientEmail: string;
    claimCode: string;
    budgetCents: number;
    expiresAt: string;
    company: { name: string };
  }[];
  auditLogs: {
    id: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    metadataJson: string;
    createdAt: string;
  }[];
  metrics: {
    totalGmvCents: number;
    platformRevenueCents: number;
    totalVendorPayoutsCents: number;
    totalCorporateWalletCents: number;
    totalCorporateEscrowCents: number;
    totalCharityDonationsCents: number;
    pendingVendorsCount: number;
    reclaimableEscrowCents: number;
    expiredUnclaimedCount: number;
  };
}

export default function AdminPortalPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "vendors" | "categories" | "logistics" | "collections" | "charities" | "audit"
  >("vendors");
  const [banner, setBanner] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // New Gift Category form
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catTagline, setCatTagline] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catColor, setCatColor] = useState("#C85A32");

  // New Global Collection form
  const [colTitle, setColTitle] = useState("");
  const [colDescription, setColDescription] = useState("");
  const [colBudgetCents, setColBudgetCents] = useState(10000);
  const [colProductIds, setColProductIds] = useState<string[]>([]);

  // New Charity form
  const [charityName, setCharityName] = useState("");
  const [charityCategory, setCharityCategory] = useState("Climate & Water");
  const [charityDescription, setCharityDescription] = useState("");

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        setData(null);
      } else {
        const json = await res.json();
        if (res.ok) {
          setUnauthorized(false);
          setData(json);
        } else {
          setErrorMsg(json.error || "Unable to load platform operations.");
        }
      }
    } catch {
      setErrorMsg("Unable to connect to platform operations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setErrorMsg("");
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, amountCents: Math.round(Number(fields.amount) * 100) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Payment reconciliation failed.");
      form.reset();
      setBanner("Settled payment recorded in the company ledger.");
      await loadAdmin();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Unable to connect.");
    }
  }

  async function settleDonation(event: React.FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    setErrorMsg("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/admin/donations/${orderId}/settle`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Donation settlement failed.");
      setBanner("Donation settlement recorded.");
      await loadAdmin();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Unable to connect.");
    }
  }

  async function handleVendorStatus(
    vendorId: string,
    status: "APPROVED" | "SUSPENDED"
  ) {
    const res = await fetch(`/api/admin/vendors/${vendorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setBanner(`Vendor status updated to ${status}.`);
      await loadAdmin();
    } else {
      setErrorMsg((await res.json()).error || "Unable to update vendor.");
    }
  }

  async function handleReclaimExpired() {
    const res = await fetch("/api/admin/reclaim-expired", {
      method: "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setBanner(
        `Reclaimed ${json.reclaimedCount} expired gift(s) and refunded ${formatCurrency(
          json.totalReclaimedCents
        )} from Escrow back to Corporate Wallets!`
      );
      await loadAdmin();
    } else {
      setErrorMsg(json.error || "Unable to reclaim expired gifts.");
    }
  }

  async function handleUpsertCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: catName,
        slug: catSlug || catName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        tagline: catTagline,
        description: catDescription,
        accentColor: catColor,
      }),
    });
    if (res.ok) {
      setCatName("");
      setCatSlug("");
      setCatTagline("");
      setCatDescription("");
      setBanner("Saved Gift Category to Global Marketplace Taxonomy.");
      await loadAdmin();
    } else {
      setErrorMsg((await res.json()).error || "Unable to save category.");
    }
  }

  async function handleCreateGlobalCollection(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: colTitle,
        description: colDescription,
        occasion: "All Occasions",
        budgetTierCents: Number(colBudgetCents),
        productIds: colProductIds,
      }),
    });
    if (res.ok) {
      setColTitle("");
      setColDescription("");
      setColProductIds([]);
      setBanner("Published new official Global Snappy Collection.");
      await loadAdmin();
    } else {
      setErrorMsg((await res.json()).error || "Unable to create collection.");
    }
  }

  async function handleCreateCharity(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/charities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: charityName,
        category: charityCategory,
        description: charityDescription,
      }),
    });
    if (res.ok) {
      setCharityName("");
      setCharityDescription("");
      setBanner("Added new verified Charity Partner.");
      await loadAdmin();
    } else {
      setErrorMsg((await res.json()).error || "Unable to create charity partner.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-[#6E665E]">
        Loading Platform Governance Console...
      </div>
    );
  }

  if (unauthorized || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141210] text-[#FAF8F5]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-[#141210]">
            Snappy Platform Control Tower
          </h1>
          <p className="mt-2 text-xs text-[#6E665E]">
            Restricted to authorized platform operators.
          </p>
          <Link
            href="/auth/admin"
            className="mt-4 rounded-full bg-[#141210] px-6 py-3 text-xs font-bold text-[#FAF8F5] hover:bg-[#C85A32]"
          >
            Sign in as an administrator →
          </Link>
        </div>
      </div>
    );
  }

  const {
    vendors,
    giftCategories,
    products,
    collections,
    charities,
    giftOrders,
    expiredUnclaimedGifts,
    auditLogs,
    metrics,
  } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E6E0D6] bg-[#141210] p-4 text-[#FAF8F5] shadow-md sm:flex-row sm:items-center">
        <div>
          <span className="rounded-full bg-[#C85A32] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            Administration
          </span>
          <h1 className="mt-2 font-serif text-2xl font-semibold">
            Platform operations
          </h1>
          <p className="text-xs text-[#E8DFD1]/80">
            {metrics.pendingVendorsCount} vendors awaiting review
          </p>
        </div>

        {metrics.expiredUnclaimedCount > 0 && <button
          onClick={handleReclaimExpired}
          className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#b24d28]"
        >
          <RotateCcw className="h-4 w-4" />
          <span>
            Reclaim expired gifts ({metrics.expiredUnclaimedCount} ·{" "}
            {formatCurrency(metrics.reclaimableEscrowCents)})
          </span>
        </button>}
      </div>

      {banner && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900">
          {banner}
        </div>
      )}
      {errorMsg && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{errorMsg}</p>}

      <Disclosure title="Reconcile a settled payment" className="mt-3">
        <form onSubmit={recordPayment} className="flex flex-wrap items-end gap-3">
          <div className="w-full">
            <p className="text-xs text-stone-600">Record funds already received. A unique settlement reference prevents duplicate credit.</p>
          </div>
          <label className="min-w-0 text-xs">Company<select name="companyId" required className="mt-1 block w-full rounded-lg border p-2">{data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="min-w-0 text-xs">Amount (USD)<input name="amount" type="number" min="10" max="1000000" step="0.01" required className="mt-1 block w-full rounded-lg border p-2" /></label>
          <label className="min-w-0 text-xs">Settlement reference<input name="settlementReference" required maxLength={150} className="mt-1 block w-full rounded-lg border p-2" /></label>
          <button disabled={!data.companies.length} className="rounded-full bg-[#141210] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">Record payment</button>
        </form>
      </Disclosure>

      {/* KPIs */}
      <Disclosure title="Platform balances & performance" className="mt-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
              <span>Platform Commission Revenue</span>
              <DollarSign className="h-4 w-4 text-[#1F4D3A]" />
            </div>
            <div className="mt-2 font-serif text-2xl font-semibold text-[#141210]">
              {formatCurrency(metrics.platformRevenueCents)}
            </div>
            <div className="mt-1 text-[11px] text-[#6E665E]">
              Total GMV: {formatCurrency(metrics.totalGmvCents)}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
              <span>Corporate Wallet + Escrow Pool</span>
              <ShieldCheck className="h-4 w-4 text-[#C85A32]" />
            </div>
            <div className="mt-2 font-serif text-2xl font-semibold text-[#141210]">
              {formatCurrency(
                metrics.totalCorporateWalletCents + metrics.totalCorporateEscrowCents
              )}
            </div>
            <div className="mt-1 text-[11px] text-[#6E665E]">
              Escrow Held: {formatCurrency(metrics.totalCorporateEscrowCents)}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
              <span>Regional Suppliers & Categories</span>
              <Package className="h-4 w-4 text-[#141210]" />
            </div>
            <div className="mt-2 font-serif text-2xl font-semibold text-[#141210]">
              {vendors.length} Partners • {giftCategories?.length || 0} Cats
            </div>
            <div className="mt-1 text-[11px] font-semibold text-[#C85A32]">
              {metrics.pendingVendorsCount} pending approval review
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
              <span>Total Charitable Impact</span>
              <HeartHandshake className="h-4 w-4 text-[#1F4D3A]" />
            </div>
            <div className="mt-2 font-serif text-2xl font-semibold text-[#141210]">
              {formatCurrency(metrics.totalCharityDonationsCents)}
            </div>
            <div className="mt-1 text-[11px] text-[#6E665E]">
              Across {charities.length} verified charities
            </div>
          </div>
        </div>
      </Disclosure>

      {/* Tabs */}
      <WorkspaceTabs<typeof activeTab>
        activeTab={activeTab}
        onChange={setActiveTab}
        primary={[
          { id: "vendors", label: `Vendors (${vendors.length})` },
          { id: "logistics", label: `Orders & donations (${giftOrders?.length || 0})` },
        ]}
        secondary={[
          { id: "categories", label: `Categories (${giftCategories?.length || 0})` },
          { id: "collections", label: `Collections (${collections.length})` },
          { id: "charities", label: `Charities (${charities.length})` },
          { id: "audit", label: `Audit log (${auditLogs.length})` },
        ]}
      />

      {/* TAB 1: Vendors */}
      {activeTab === "vendors" && (
        <div className="mt-4 space-y-3">
          {vendors.length === 0 && <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500">New vendor registrations will appear here for review.</p>}
          {vendors.map((v) => (
            <div
              key={v.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${v.status === "APPROVED"
                      ? "bg-[#1F4D3A]/15 text-[#1F4D3A]"
                      : v.status === "PENDING"
                        ? "bg-[#C85A32]/15 text-[#C85A32]"
                        : "bg-rose-100 text-rose-800"
                      }`}
                  >
                    {v.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#141210]">
                    Regions: {v.supportedRegions}
                  </span>
                  <span className="text-xs text-[#6E665E]">
                    HQ: {v.hqCountry} • Tax ID: {v.taxId}
                  </span>
                </div>
                <h3 className="mt-1.5 font-serif text-lg font-semibold text-[#141210]">
                  {v.businessName}
                </h3>
                <p className="text-xs text-[#6E665E]">
                  Products: {v._count.products} • Orders Fulfilled: {v._count.giftOrders} •
                  Commission: {v.commissionRateBps / 100}% • Payout Balance:{" "}
                  {formatCurrency(v.payoutBalanceCents)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {v.status !== "APPROVED" && (
                  <button
                    onClick={() => handleVendorStatus(v.id, "APPROVED")}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1F4D3A] px-4 py-2 text-xs font-bold text-white hover:bg-[#173a2c]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve Partner
                  </button>
                )}
                {v.status !== "SUSPENDED" && (
                  <button
                    onClick={() => handleVendorStatus(v.id, "SUSPENDED")}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}

          {expiredUnclaimedGifts.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#C85A32]/30 bg-[#C85A32]/10 p-5">
              <h4 className="text-sm font-bold text-[#141210]">
                Expired Unclaimed Gifts Eligible for Escrow Reclaim ({expiredUnclaimedGifts.length})
              </h4>
              <div className="mt-2 space-y-1.5 text-xs text-[#575049]">
                {expiredUnclaimedGifts.map((eg) => (
                  <div key={eg.id}>
                    • {eg.claimCode} — {eg.recipientName} ({eg.recipientEmail}) from{" "}
                    <strong>{eg.company.name}</strong> ({formatCurrency(eg.budgetCents)})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Gift Category Taxonomy */}
      {activeTab === "categories" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleUpsertCategory}
              className="space-y-3.5 rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs"
            >
              <div className="flex items-center gap-2 font-serif text-lg font-semibold text-[#141210]">
                <Tag className="h-4 w-4 text-[#C85A32]" />
                <span>Create / Update Gift Category</span>
              </div>
              <input
                type="text"
                required
                placeholder="Category Name (e.g. Executive Desk)"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Slug (auto if blank)"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 font-mono text-xs"
                />
                <input
                  type="text"
                  placeholder="Accent Hex (#C85A32)"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 font-mono text-xs"
                />
              </div>
              <input
                type="text"
                required
                placeholder="Editorial Tagline *"
                value={catTagline}
                onChange={(e) => setCatTagline(e.target.value)}
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />
              <textarea
                rows={2}
                placeholder="Category curation description..."
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-[#141210] py-3 text-xs font-bold text-[#FAF8F5] hover:bg-[#C85A32]"
              >
                Save Gift Category
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
            {giftCategories?.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-3 py-0.5 text-[11px] font-bold text-white"
                    style={{ backgroundColor: cat.accentColor || "#141210" }}
                  >
                    {cat.name}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#6E665E]">
                    {cat._count.products} SKUs
                  </span>
                </div>
                <div className="mt-2 font-serif text-base font-semibold text-[#141210]">
                  {cat.headline || cat.tagline}
                </div>
                <p className="mt-1 text-xs text-[#6E665E]">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Global Carrier Logistics Monitor */}
      {activeTab === "logistics" && (
        <div className="mt-4 space-y-5">
          {giftOrders?.map((ord) => (
            <div
              key={ord.id}
              className="rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {ord.product?.imageUrl && (
                    <img
                      src={ord.product.imageUrl}
                      alt={ord.product.title}
                      className="h-14 w-14 rounded-2xl border border-[#E6E0D6] object-cover"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-[#141210] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#FAF8F5]">
                        {ord.recipientRegion}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#C85A32]">
                        {ord.giftSend.claimCode}
                      </span>
                      <span className="text-[#6E665E]">
                        • Sender: <strong>{ord.giftSend.company.name}</strong>
                      </span>
                    </div>
                    <h3 className="mt-1 font-serif text-lg font-semibold text-[#141210]">
                      {ord.product?.title || "Charitable Donation"} →{" "}
                      {ord.shippingName || ord.giftSend.recipientName}
                    </h3>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#575049]">
                  <Truck className="h-4 w-4 text-[#C85A32]" />
                  <span>Partner: {ord.vendor?.businessName || "Direct"}</span>
                </div>
              </div>

              {ord.orderType === "CHARITY_DONATION" && (
                <div className="mt-4 text-sm">
                  <p>Status: {ord.fulfillmentStatus}</p>
                  {ord.fulfillmentStatus === "PENDING_SETTLEMENT" && (
                    <form onSubmit={(event) => settleDonation(event, ord.id)} className="mt-3 flex flex-wrap gap-3">
                      <label className="text-xs">Completed transfer reference<input name="settlementReference" required maxLength={150} className="ml-3 rounded-xl border p-3" /></label>
                      <button className="rounded-full bg-[#141210] px-4 py-2 text-xs font-semibold text-white">Record actual donation transfer</button>
                    </form>
                  )}
                </div>
              )}
              {ord.orderType === "PHYSICAL_GIFT" && (
                <div className="mt-4">
                  <LogisticsTimeline
                    fulfillmentStatus={ord.fulfillmentStatus}
                    trackingCarrier={ord.trackingCarrier}
                    trackingNumber={ord.trackingNumber}
                    trackingUrl={ord.trackingUrl}
                    serviceLevel={ord.serviceLevel}
                    fulfillmentWarehouse={ord.fulfillmentWarehouse}
                    packageWeightGrams={ord.packageWeightGrams}
                    estimatedDeliveryAt={ord.estimatedDeliveryAt}
                    addressLocked={ord.addressLocked}
                    exceptionNote={ord.exceptionNote}
                    swapCount={ord.swapCount}
                    selectedVariant={ord.selectedVariant}
                    shipmentEvents={ord.shipmentEvents || []}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Global Collections */}
      {activeTab === "collections" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateGlobalCollection}
              className="space-y-4 rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs"
            >
              <div className="flex items-center gap-2 font-serif text-lg font-semibold text-[#141210]">
                <Plus className="h-4 w-4 text-[#C85A32]" />
                <span>Curate New Global Snappy Collection</span>
              </div>
              <input
                type="text"
                required
                placeholder="Collection Title"
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />
              <select
                value={colBudgetCents}
                onChange={(e) => setColBudgetCents(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold"
              >
                {BUDGET_TIERS.map((t) => (
                  <option key={t.cents} value={t.cents}>
                    {t.label} ({formatCurrency(t.cents)})
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                placeholder="Description"
                value={colDescription}
                onChange={(e) => setColDescription(e.target.value)}
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-2 text-xs">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center justify-between px-2 py-1">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={colProductIds.includes(p.id)}
                        onChange={() =>
                          setColProductIds((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((x) => x !== p.id)
                              : [...prev, p.id]
                          )
                        }
                      />
                      <span>{p.title}</span>
                    </span>
                    <span className="font-mono text-[#6E665E]">
                      {formatCurrency(p.priceCents)}
                    </span>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-[#141210] py-3 text-xs font-bold text-[#FAF8F5]"
              >
                Publish Global Collection
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {collections.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs"
              >
                <div className="flex justify-between text-xs font-bold text-[#C85A32]">
                  <span>{c.occasion}</span>
                  <span>{formatCurrency(c.budgetTierCents)} Tier</span>
                </div>
                <h3 className="mt-1 font-serif text-lg font-semibold text-[#141210]">
                  {c.title}
                </h3>
                <p className="mt-1 text-xs text-[#6E665E]">
                  {c._count.collectionProducts} Products • Used in {c._count.campaigns} Campaigns
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Charities */}
      {activeTab === "charities" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateCharity}
              className="space-y-4 rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs"
            >
              <h3 className="font-serif text-lg font-semibold text-[#141210]">
                Onboard Verified Charity Partner
              </h3>
              <input
                type="text"
                required
                placeholder="Charity Organization Name"
                value={charityName}
                onChange={(e) => setCharityName(e.target.value)}
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Impact Category"
                value={charityCategory}
                onChange={(e) => setCharityCategory(e.target.value)}
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />
              <textarea
                rows={3}
                required
                placeholder="Mission statement & impact metrics..."
                value={charityDescription}
                onChange={(e) => setCharityDescription(e.target.value)}
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-[#1F4D3A] py-3 text-xs font-bold text-white"
              >
                Add Charity Partner
              </button>
            </form>
          </div>
          <div className="lg:col-span-7 space-y-3">
            {charities.map((ch) => (
              <div
                key={ch.id}
                className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs"
              >
                <div className="flex justify-between text-xs font-bold text-[#1F4D3A]">
                  <span>{ch.category}</span>
                  <span>Total Donated: {formatCurrency(ch.totalDonatedCents)}</span>
                </div>
                <h3 className="mt-1 font-serif text-lg font-semibold text-[#141210]">
                  {ch.name}
                </h3>
                <p className="mt-1 text-xs text-[#6E665E]">{ch.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Audit Log */}
      {activeTab === "audit" && (
        <div className="mt-4 space-y-2">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col justify-between gap-2 rounded-2xl border border-[#E6E0D6] bg-white px-4 py-3 text-xs sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-[#C85A32]" />
                <span className="rounded-md bg-[#141210] px-2 py-0.5 font-mono text-[10px] font-bold text-[#FAF8F5]">
                  {log.actorRole}
                </span>
                <span className="font-bold text-[#141210]">{log.action}</span>
                <span className="text-[#6E665E]">
                  ({log.entityType}: {log.entityId})
                </span>
              </div>
              <code className="font-mono text-[11px] text-[#6E665E]">
                {log.metadataJson}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
