"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Gift,
  Truck,
  CheckCircle2,
  ExternalLink,
  Search,
} from "lucide-react";

interface RecipientPortalData {
  user: {
    id: string;
    name: string;
    email: string;
    preferredRegion: string;
    defaultAddressLine1: string;
    defaultCity: string;
    defaultState: string;
    defaultPostalCode: string;
    defaultCountry: string;
  };
  gifts: {
    id: string;
    claimToken: string;
    claimCode: string;
    preferredRegion: string;
    status: string;
    personalMessage: string;
    thankYouNote: string;
    expiresAt: string;
    company: { name: string; brandColor: string };
    campaign: { title: string; occasion: string };
    giftOrder?: {
      orderType: string;
      fulfillmentStatus: string;
      trackingCarrier: string;
      trackingNumber: string;
      product?: {
        title: string;
        category: string;
        vendor: { businessName: string };
      } | null;
      charity?: { name: string } | null;
    } | null;
  }[];
  metrics: {
    totalReceived: number;
    actionRequired: number;
    inTransit: number;
    completed: number;
  };
}

export default function RecipientPortalPage() {
  const router = useRouter();
  const [data, setData] = useState<RecipientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [lookupError, setLookupError] = useState("");

  const loadRecipientPortal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recipient/gifts");
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
    loadRecipientPortal();
  }, [loadRecipientPortal]);

  async function quickSignInRecipient(email: string) {
    await fetch("/api/auth/demo-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    await loadRecipientPortal();
  }

  async function handleClaimLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError("");
    const res = await fetch("/api/auth/claim-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimCode }),
    });
    const json = await res.json();
    if (!res.ok) {
      setLookupError(json.error || "No gift found with that code.");
    } else {
      router.push(json.redirectTo);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-slate-500">
        Loading Recipient Gift Hub...
      </div>
    );
  }

  if (unauthorized || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Recipient Gift Hub & Claim Portal
          </h1>
          <p className="mt-2 text-xs text-slate-600">
            Enter a Snappy Gift Claim Code below, or sign in with 1 click as a seeded global recipient.
          </p>

          <form onSubmit={handleClaimLookup} className="mx-auto mt-6 flex max-w-md gap-2">
            <input
              type="text"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              placeholder="Enter code (e.g. SNPY-NA100A)"
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-xs uppercase"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-700"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Unwrap</span>
            </button>
          </form>
          {lookupError && (
            <p className="mt-2 text-xs font-semibold text-rose-600">{lookupError}</p>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-3 text-left">
            {[
              {
                name: "Alex Rivera (NA)",
                city: "Austin, US",
                email: "alex.rivera@acmecloud.io",
              },
              {
                name: "Elena Rostova (EMEA)",
                city: "Amsterdam, NL",
                email: "elena.rostova@acmecloud.io",
              },
              {
                name: "Yuki Tanaka (APAC)",
                city: "Tokyo, JP",
                email: "yuki.tanaka@acmecloud.io",
              },
            ].map((rec) => (
              <button
                key={rec.email}
                onClick={() => quickSignInRecipient(rec.email)}
                className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 transition hover:bg-amber-100/70"
              >
                <div className="text-xs font-bold text-slate-900">{rec.name}</div>
                <div className="text-[11px] text-amber-800">{rec.city}</div>
                <div className="mt-2 text-[11px] font-semibold text-amber-700">
                  Open My Gifts →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { user, gifts, metrics } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="rounded-md bg-amber-600 px-2.5 py-0.5 text-xs font-bold text-white">
            RECIPIENT PORTAL
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-slate-600">
            Default Delivery Region: <strong>{user.preferredRegion}</strong> • Saved City:{" "}
            {user.defaultCity || "Not set"}, {user.defaultCountry}
          </p>
        </div>

        <form onSubmit={handleClaimLookup} className="flex items-center gap-2">
          <input
            type="text"
            value={claimCode}
            onChange={(e) => setClaimCode(e.target.value)}
            placeholder="Have another claim code?"
            className="rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs uppercase"
          />
          <button
            type="submit"
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
          >
            Redeem Code
          </button>
        </form>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Ready to Unwrap & Claim</span>
            <Gift className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.actionRequired}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Claimed & In Fulfillment</span>
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.inTransit}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Delivered / Donated</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.completed}
          </div>
        </div>
      </div>

      {/* Gifts List */}
      <div className="mt-6 space-y-4">
        {gifts.map((g) => {
          const isUnclaimed = ["SENT", "OPENED"].includes(g.status);
          return (
            <div
              key={g.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs lg:flex-row lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    {g.company.name} • {g.campaign.occasion}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isUnclaimed
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {g.status}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    Code: {g.claimCode}
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium text-slate-800">
                  &ldquo;{g.personalMessage}&rdquo;
                </p>

                {g.giftOrder && (
                  <p className="mt-1.5 text-xs text-slate-600">
                    Selected:{" "}
                    <strong>
                      {g.giftOrder.product?.title ||
                        (g.giftOrder.charity
                          ? `Donated to ${g.giftOrder.charity.name}`
                          : "Gift")}
                    </strong>
                    {g.giftOrder.trackingNumber && (
                      <span className="ml-2 font-mono text-indigo-700">
                        • Tracking: {g.giftOrder.trackingCarrier} {g.giftOrder.trackingNumber}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <Link
                  href={`/claim/${g.claimToken}`}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                    isUnclaimed
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {isUnclaimed ? "Unwrap & Choose Gift" : "View Tracking & Thank-You Note"}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
