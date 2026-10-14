"use client";

import React, { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { BUDGET_TIERS, formatCurrency } from "@/lib/constants";

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
  products: {
    id: string;
    title: string;
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
    "vendors" | "collections" | "charities" | "audit"
  >("vendors");
  const [banner, setBanner] = useState("");

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
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  async function quickSignInAdmin() {
    await fetch("/api/auth/demo-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@snappy.com" }),
    });
    await loadAdmin();
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
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-500">
        Loading Platform Governance Console...
      </div>
    );
  }

  if (unauthorized || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Snappy Platform Admin Console
          </h1>
          <p className="mt-2 text-xs text-slate-600">
            Restricted to Platform Operators (`ADMIN` role). Click below to sign in with the seeded Platform Operator account.
          </p>
          <button
            onClick={quickSignInAdmin}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white hover:bg-slate-800"
          >
            Sign In as Platform Admin (admin@snappy.com) →
          </button>
        </div>
      </div>
    );
  }

  const { vendors, products, collections, charities, expiredUnclaimedGifts, auditLogs, metrics } =
    data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="rounded-md bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">
            PLATFORM GOVERNANCE & FINOPS
          </span>
          <h1 className="mt-2 text-2xl font-extrabold">
            Snappy Global Marketplace Control Plane
          </h1>
          <p className="text-xs text-slate-300">
            Oversee regional suppliers, marketplace commission revenue, curated collections, and automated escrow reclaim sweeps.
          </p>
        </div>

        <button
          onClick={handleReclaimExpired}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-600"
        >
          <RotateCcw className="h-4 w-4" />
          <span>
            Sweep Expired Escrow ({metrics.expiredUnclaimedCount} •{" "}
            {formatCurrency(metrics.reclaimableEscrowCents)})
          </span>
        </button>
      </div>

      {banner && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900">
          {banner}
        </div>
      )}

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Platform Commission Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.platformRevenueCents)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Total GMV: {formatCurrency(metrics.totalGmvCents)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Corporate Wallet + Escrow Pool</span>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(
              metrics.totalCorporateWalletCents + metrics.totalCorporateEscrowCents
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Escrow Held: {formatCurrency(metrics.totalCorporateEscrowCents)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Regional Suppliers</span>
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {vendors.length}
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-semibold">
            {metrics.pendingVendorsCount} pending approval review
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Charitable Impact</span>
            <HeartHandshake className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.totalCharityDonationsCents)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across {charities.length} verified charities
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "vendors", label: `Vendor Governance (${vendors.length})` },
          { id: "collections", label: `Global Collections (${collections.length})` },
          { id: "charities", label: `Charity Partners (${charities.length})` },
          { id: "audit", label: `System Audit Trail (${auditLogs.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() =>
              setActiveTab(
                t.id as "vendors" | "collections" | "charities" | "audit"
              )
            }
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === t.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Vendors */}
      {activeTab === "vendors" && (
        <div className="mt-6 space-y-3">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      v.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : v.status === "PENDING"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {v.status}
                  </span>
                  <span className="text-xs font-bold text-indigo-700">
                    Regions: {v.supportedRegions}
                  </span>
                  <span className="text-xs text-slate-500">
                    HQ: {v.hqCountry} • Tax ID: {v.taxId}
                  </span>
                </div>
                <h3 className="mt-1.5 text-base font-bold text-slate-900">
                  {v.businessName}
                </h3>
                <p className="text-xs text-slate-500">
                  Products: {v._count.products} • Orders Fulfilled: {v._count.giftOrders} •
                  Commission: {v.commissionRateBps / 100}% • Payout Balance:{" "}
                  {formatCurrency(v.payoutBalanceCents)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {v.status !== "APPROVED" && (
                  <button
                    onClick={() => handleVendorStatus(v.id, "APPROVED")}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve Partner
                  </button>
                )}
                {v.status !== "SUSPENDED" && (
                  <button
                    onClick={() => handleVendorStatus(v.id, "SUSPENDED")}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}

          {expiredUnclaimedGifts.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <h4 className="text-sm font-bold text-amber-950">
                Expired Unclaimed Gifts Eligible for Escrow Reclaim ({expiredUnclaimedGifts.length})
              </h4>
              <div className="mt-2 space-y-1.5 text-xs text-amber-900">
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

      {/* TAB 2: Global Collections */}
      {activeTab === "collections" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateGlobalCollection}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Plus className="h-4 w-4 text-indigo-600" />
                <span>Curate New Global Snappy Collection</span>
              </div>
              <input
                type="text"
                required
                placeholder="Collection Title"
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={colBudgetCents}
                onChange={(e) => setColBudgetCents(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2 text-xs space-y-1">
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
                    <span className="text-slate-500">{formatCurrency(p.priceCents)}</span>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white"
              >
                Publish Global Collection
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {collections.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
              >
                <div className="flex justify-between text-xs font-bold text-indigo-600">
                  <span>{c.occasion}</span>
                  <span>{formatCurrency(c.budgetTierCents)} Tier</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">{c.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {c._count.collectionProducts} Products • Used in {c._count.campaigns} Campaigns
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Charities */}
      {activeTab === "charities" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateCharity}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
            >
              <h3 className="text-sm font-bold text-slate-900">
                Onboard Verified Charity Partner
              </h3>
              <input
                type="text"
                required
                placeholder="Charity Organization Name"
                value={charityName}
                onChange={(e) => setCharityName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Impact Category"
                value={charityCategory}
                onChange={(e) => setCharityCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <textarea
                rows={3}
                required
                placeholder="Mission statement & impact metrics..."
                value={charityDescription}
                onChange={(e) => setCharityDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white"
              >
                Add Charity Partner
              </button>
            </form>
          </div>
          <div className="lg:col-span-7 space-y-3">
            {charities.map((ch) => (
              <div
                key={ch.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
              >
                <div className="flex justify-between text-xs font-bold text-rose-600">
                  <span>{ch.category}</span>
                  <span>Total Donated: {formatCurrency(ch.totalDonatedCents)}</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">{ch.name}</h3>
                <p className="mt-1 text-xs text-slate-600">{ch.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Audit Log */}
      {activeTab === "audit" && (
        <div className="mt-6 space-y-2">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-indigo-600" />
                <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-800">
                  {log.actorRole}
                </span>
                <span className="font-bold text-slate-900">{log.action}</span>
                <span className="text-slate-500">
                  ({log.entityType}: {log.entityId})
                </span>
              </div>
              <code className="text-[11px] text-slate-500">{log.metadataJson}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
