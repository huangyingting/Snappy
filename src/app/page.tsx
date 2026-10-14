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
} from "lucide-react";
import { REGIONS, BUDGET_TIERS, formatCurrency } from "@/lib/constants";

const DEMO_CLAIM_LINKS = [
  {
    region: "NA",
    code: "SNPY-NA100A",
    token: "snappy_demo_na_100",
    budget: "$100 Milestone",
    recipient: "Alex Rivera (Austin, US)",
    occasion: "3-Year Work Anniversary",
  },
  {
    region: "EMEA",
    code: "SNPY-EU100B",
    token: "snappy_demo_emea_100",
    budget: "$100 Milestone",
    recipient: "Elena Rostova (Amsterdam, NL)",
    occasion: "2-Year Work Anniversary",
  },
  {
    region: "APAC",
    code: "SNPY-AP50C1",
    token: "snappy_demo_apac_50",
    budget: "$50 Welcome",
    recipient: "Yuki Tanaka (Tokyo, JP)",
    occasion: "New Hire Onboarding",
  },
  {
    region: "LATAM",
    code: "SNPY-LA50D2",
    token: "snappy_demo_latam_50",
    budget: "$50 Welcome",
    recipient: "Mateo Silva (São Paulo, BR)",
    occasion: "New Hire Onboarding",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [claimCodeInput, setClaimCodeInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

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

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-indigo-50/40 to-slate-50 pt-12 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Choice-Driven Corporate Gifting • 4 Global Fulfillment Regions</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Delight every employee & client with{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                gifts they actually choose
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              Send curated gift collections in seconds—no shipping address needed upfront.
              Recipients unwrap a personalized digital experience, pick their favorite regional gift
              or donate to charity, and our regional vendor network handles local fulfillment.
            </p>
          </div>

          {/* Instant Gift Claim Bar */}
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form onSubmit={handleClaimLookup} className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={claimCodeInput}
                  onChange={(e) => setClaimCodeInput(e.target.value)}
                  placeholder="Have a Snappy Gift Code? Try SNPY-NA100A or SNPY-EU100B..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={lookupLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Gift className="h-4 w-4" />
                <span>{lookupLoading ? "Opening..." : "Unwrap My Gift"}</span>
              </button>
            </form>
            {lookupError && (
              <p className="mt-2 text-xs font-medium text-rose-600">{lookupError}</p>
            )}

            {/* Quick 1-click Demo Unwrap Pills */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-500">
                Live Interactive Gift Links:
              </span>
              {DEMO_CLAIM_LINKS.map((item) => (
                <Link
                  key={item.token}
                  href={`/claim/${item.token}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/70 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                >
                  <span className="font-bold">{item.region}</span>
                  <span className="text-indigo-400">•</span>
                  <span>{item.code}</span>
                  <span className="text-[11px] text-indigo-600/80">({item.budget})</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Portals & Distinct Enrollment Flows */}
      <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Four Tailored Role Experiences
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Each actor has a dedicated enrollment workflow, authentication guard, and specialized workspace.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-emerald-600" /> Escrow-Protected Budgets
            </span>
            <span className="inline-flex items-center gap-1">
              <HeartHandshake className="h-3.5 w-3.5 text-indigo-600" /> 100% Charity Option
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Role 1: Corporate */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition hover:border-indigo-300 hover:shadow-md">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Building2 className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                ROLE 1 • CORPORATE SENDER
              </span>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                Corporate Gifting Hub
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Onboard your company brand, fund escrow-backed budgets, curate collections, send bulk or automated milestone campaigns, and read recipient thank-you notes.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                  No upfront recipient address needed
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                  Automatic refund on lower-cost or expired gifts
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                  Live Gratitude Wall & campaign ROI
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-slate-100">
              <Link
                href="/auth/corporate"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                <span>Corporate Enroll / Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/corporate"
                className="text-center text-xs font-medium text-indigo-600 hover:underline"
              >
                Open Corporate Workspace →
              </Link>
            </div>
          </div>

          {/* Role 2: Regional Vendor */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition hover:border-emerald-300 hover:shadow-md">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Package className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                ROLE 2 • REGIONAL SUPPLIER
              </span>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                Regional Gift Vendor
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Enroll your brand or regional warehouse across NA, EMEA, APAC, or LATAM. Publish SKUs by budget tier, sync stock, ship claimed gifts, and earn payouts.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Territory routing (NA, EMEA, APAC, LATAM)
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Real-time SKU stock & wholesale margin
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Carrier tracking & automated settlement
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-slate-100">
              <Link
                href="/auth/vendor"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                <span>Vendor Partner Application</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/vendor"
                className="text-center text-xs font-medium text-emerald-600 hover:underline"
              >
                Open Vendor Portal →
              </Link>
            </div>
          </div>

          {/* Role 3: End-User Recipient */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition hover:border-amber-300 hover:shadow-md">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                ROLE 3 • GIFT RECIPIENT
              </span>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                Recipient Experience
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Redeem via magic claim link or claim code—or create a Recipient Portal account to track all received gifts, manage private addresses, and send thank-you notes.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                  Interactive branded gift reveal
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                  Dynamic regional catalog or 100% Charity
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                  Address privacy shield from employer
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-slate-100">
              <Link
                href="/auth/recipient"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-700"
              >
                <span>Recipient Claim / Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/claim/snappy_demo_na_100"
                className="text-center text-xs font-medium text-amber-700 hover:underline"
              >
                Try Live Unwrap Experience →
              </Link>
            </div>
          </div>

          {/* Role 4: Platform Admin */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition hover:border-rose-300 hover:shadow-md">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                ROLE 4 • PLATFORM OPERATOR
              </span>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                Platform Admin Ops
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Review and approve regional vendors, configure marketplace commission rates, curate global collections, manage charities, and sweep expired gift escrow.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-rose-600" />
                  Vendor vetting & commission governance
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-rose-600" />
                  Expired gift escrow reclaim engine
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-rose-600" />
                  Full cross-role security audit trail
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-slate-100">
              <Link
                href="/auth/admin"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                <span>Platform Operator Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/admin"
                className="text-center text-xs font-medium text-slate-700 hover:underline"
              >
                Open Admin Console →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Global Fulfillment Regions & Curated Budget Tiers */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Regional Fulfillment Engine */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <Globe className="h-4 w-4" />
              <span>Local Sourcing, Zero Customs Headaches</span>
            </div>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              4 Regional Vendor Fulfillment Zones
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              When a recipient opens their link, Snappy filters the catalog to vendors that ship locally within their region.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {REGIONS.map((r) => (
                <div
                  key={r.code}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                      {r.code}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700">
                      {r.currencyNote}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-900">{r.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">{r.countries}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Hubs: {r.hubs}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Tiers */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-600">
              <Gift className="h-4 w-4" />
              <span>Predictable Budget Ceilings</span>
            </div>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              Curated Collections by Budget Tier
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Set your maximum allowance per recipient. If a recipient selects a lower-cost item, the difference is automatically credited back to your corporate wallet.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {BUDGET_TIERS.map((tier) => (
                <div
                  key={tier.cents}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold text-slate-900">
                      {formatCurrency(tier.cents)}
                    </span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                      {tier.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{tier.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
