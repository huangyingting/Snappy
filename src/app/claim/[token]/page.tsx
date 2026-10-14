"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  Gift,
  Sparkles,
  Globe,
  HeartHandshake,
  ShieldCheck,
  Truck,
  CheckCircle2,
  MapPin,
  MessageSquareHeart,
  Clock,
} from "lucide-react";
import { REGIONS, formatCurrency, type RegionCode } from "@/lib/constants";

interface ClaimProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  imageUrl: string;
  stockQuantity: number;
  supportedRegions: string;
  vendor: {
    id: string;
    businessName: string;
    hqCountry: string;
    slaDays: number;
    supportedRegions: string;
  };
}

interface ClaimCharity {
  id: string;
  name: string;
  category: string;
  description: string;
  totalDonatedCents: number;
}

interface ClaimExperienceData {
  giftSend: {
    id: string;
    recipientName: string;
    recipientEmail: string;
    preferredRegion: string;
    claimToken: string;
    claimCode: string;
    budgetCents: number;
    status: string;
    personalMessage: string;
    thankYouNote: string;
    expiresAt: string;
    claimedAt?: string | null;
    company: {
      id: string;
      name: string;
      brandColor: string;
      hideRecipientAddress: boolean;
    };
    campaign: {
      id: string;
      title: string;
      occasion: string;
      allowCharity: boolean;
    };
    giftOrder?: {
      id: string;
      orderType: string;
      fulfillmentStatus: string;
      recipientRegion: string;
      shippingName: string;
      shippingCity: string;
      shippingCountry: string;
      trackingCarrier: string;
      trackingNumber: string;
      product?: {
        title: string;
        imageUrl: string;
        category: string;
        vendor: { businessName: string; hqCountry: string; slaDays: number };
      } | null;
      charity?: {
        name: string;
        category: string;
        description: string;
      } | null;
    } | null;
  };
  activeRegion: RegionCode;
  isExpired: boolean;
  isAlreadyClaimed: boolean;
  eligibleProducts: ClaimProduct[];
  charities: ClaimCharity[];
}

export default function RecipientClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<ClaimExperienceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [banner, setBanner] = useState("");

  // Interactive unwrapping state
  const [unwrapped, setUnwrapped] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>("NA");
  const [choiceMode, setChoiceMode] = useState<"physical" | "charity">("physical");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedCharityId, setSelectedCharityId] = useState<string>("");

  // Shipping & Thank You Form State
  const [shippingName, setShippingName] = useState("");
  const [shippingAddressLine1, setShippingAddressLine1] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("US");
  const [thankYouNote, setThankYouNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadClaimData = useCallback(
    async (regionOverride?: RegionCode) => {
      setLoading(true);
      setErrorMsg("");
      try {
        const query = regionOverride ? `?region=${regionOverride}` : "";
        const res = await fetch(`/api/claim/${token}${query}`);
        const json = await res.json();
        if (!res.ok) {
          setErrorMsg(json.error || "Gift link not found.");
        } else {
          setData(json);
          setSelectedRegion(json.activeRegion);
          if (!shippingName && json.giftSend?.recipientName) {
            setShippingName(json.giftSend.recipientName);
          }
          if (json.giftSend?.thankYouNote) {
            setThankYouNote(json.giftSend.thankYouNote);
          }
          if (json.isAlreadyClaimed) {
            setUnwrapped(true);
          }
          if (json.eligibleProducts?.length > 0) {
            setSelectedProductId(json.eligibleProducts[0].id);
          } else {
            setSelectedProductId("");
          }
          if (json.charities?.length > 0) {
            setSelectedCharityId(json.charities[0].id);
          }
        }
      } catch {
        setErrorMsg("Network error loading gift experience.");
      } finally {
        setLoading(false);
      }
    },
    [token, shippingName]
  );

  useEffect(() => {
    loadClaimData();
  }, [loadClaimData]);

  async function handleRegionSwitch(newRegion: RegionCode) {
    setSelectedRegion(newRegion);
    const defaultCountryMap: Record<RegionCode, string> = {
      NA: "US",
      EMEA: "NL",
      APAC: "JP",
      LATAM: "BR",
    };
    setShippingCountry(defaultCountryMap[newRegion]);
    await loadClaimData(newRegion);
  }

  async function handleRedeemSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setBanner("");
    setSubmitting(true);
    try {
      const payload =
        choiceMode === "charity"
          ? {
              orderType: "CHARITY_DONATION",
              charityId: selectedCharityId,
              recipientRegion: selectedRegion,
              thankYouNote,
            }
          : {
              orderType: "PHYSICAL_GIFT",
              productId: selectedProductId,
              recipientRegion: selectedRegion,
              shippingName,
              shippingAddressLine1,
              shippingCity,
              shippingState,
              shippingPostalCode,
              shippingCountry,
              thankYouNote,
            };

      const res = await fetch(`/api/claim/${token}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Redemption failed.");
      } else {
        setBanner("🎉 Your gift has been claimed! Tracking details are live below.");
        await loadClaimData(selectedRegion);
      }
    } catch {
      setErrorMsg("Network error submitting gift claim.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSavePostClaimThankYou(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/claim/${token}/thank-you`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thankYouNote }),
    });
    if (res.ok) {
      setBanner("Thank-you note sent to " + data?.giftSend.company.name + "'s Gratitude Wall!");
      await loadClaimData(selectedRegion);
    }
  }

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-slate-500">
        Preparing your personalized gift experience...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-2xs">
          <h1 className="text-xl font-bold text-slate-900">Gift Link Not Found</h1>
          <p className="mt-2 text-xs text-slate-600">{errorMsg}</p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const { giftSend, isExpired, isAlreadyClaimed, eligibleProducts, charities } = data;
  const brandColor = giftSend.company.brandColor || "#4F46E5";
  const selectedProduct = eligibleProducts.find((p) => p.id === selectedProductId);
  const selectedCharity = charities.find((c) => c.id === selectedCharityId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Branded Gift Invitation Header Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div
          className="px-6 py-8 text-white sm:px-10"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, #1E1B4B 100%)`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {giftSend.company.name} • {giftSend.campaign.occasion}
              </span>
            </div>
            <span className="rounded-lg bg-black/25 px-3 py-1 font-mono text-xs font-bold">
              Code: {giftSend.claimCode}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {isAlreadyClaimed
              ? `Enjoy your gift, ${giftSend.recipientName}!`
              : `A special gift for you, ${giftSend.recipientName}!`}
          </h1>

          <blockquote className="mt-4 max-w-3xl rounded-2xl bg-white/10 p-4 text-sm leading-relaxed text-white/95 backdrop-blur-xs">
            &ldquo;{giftSend.personalMessage}&rdquo;
          </blockquote>

          {!unwrapped && !isExpired && !isAlreadyClaimed && (
            <div className="mt-6">
              <button
                onClick={() => setUnwrapped(true)}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-white px-7 py-3.5 text-sm font-extrabold text-slate-900 shadow-lg transition hover:scale-[1.01]"
              >
                <Gift className="h-5 w-5 text-indigo-600" />
                <span>Unwrap & Choose My Gift Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Expired State */}
        {isExpired && !isAlreadyClaimed && (
          <div className="p-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-rose-500" />
            <h2 className="mt-3 text-lg font-bold text-slate-900">
              This Gift Invitation Has Expired
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              The redemption window for this gift closed on{" "}
              {new Date(giftSend.expiresAt).toLocaleDateString()}. The unused escrow budget is returned to {giftSend.company.name}.
            </p>
          </div>
        )}
      </div>

      {banner && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-xs font-bold text-emerald-900">
          {banner}
        </div>
      )}
      {errorMsg && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-bold text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* ALREADY CLAIMED VIEW: Real-time Order Tracker & Thank-You Note */}
      {isAlreadyClaimed && giftSend.giftOrder && (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                Status: {giftSend.status}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Region: {giftSend.giftOrder.recipientRegion}
              </span>
            </div>

            {giftSend.giftOrder.orderType === "CHARITY_DONATION" ? (
              <div className="mt-4">
                <h2 className="text-xl font-bold text-slate-900">
                  100% Charitable Donation Completed
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  You donated {formatCurrency(giftSend.budgetCents)} on behalf of{" "}
                  <strong>{giftSend.company.name}</strong> to{" "}
                  <strong>{giftSend.giftOrder.charity?.name}</strong>.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {giftSend.giftOrder.product?.title}
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Fulfilled locally by{" "}
                  <strong>{giftSend.giftOrder.product?.vendor.businessName}</strong> • Destination:{" "}
                  {giftSend.giftOrder.shippingCity}, {giftSend.giftOrder.shippingCountry}
                </p>

                {/* Step Progress Bar */}
                <div className="mt-6 grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                  {["CLAIMED", "PROCESSING", "SHIPPED", "DELIVERED"].map((step, i) => {
                    const orderRank: Record<string, number> = {
                      CLAIMED: 0,
                      PENDING_VENDOR: 0,
                      PROCESSING: 1,
                      SHIPPED: 2,
                      DELIVERED: 3,
                    };
                    const currentRank = orderRank[giftSend.status] ?? 0;
                    const reached = currentRank >= i;
                    return (
                      <div
                        key={step}
                        className={`rounded-xl border py-2.5 ${
                          reached
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <CheckCircle2 className="mx-auto mb-1 h-4 w-4" />
                        {step}
                      </div>
                    );
                  })}
                </div>

                {giftSend.giftOrder.trackingNumber && (
                  <div className="mt-5 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-indigo-950">
                      <Truck className="h-4 w-4 text-indigo-600" />
                      <span>Carrier: {giftSend.giftOrder.trackingCarrier}</span>
                    </div>
                    <span className="font-mono font-bold text-indigo-700">
                      Tracking #: {giftSend.giftOrder.trackingNumber}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MessageSquareHeart className="h-4 w-4 text-rose-500" />
              <span>Your Thank-You Note to {giftSend.company.name}</span>
            </div>
            <form onSubmit={handleSavePostClaimThankYou} className="mt-3 space-y-3">
              <textarea
                rows={4}
                value={thankYouNote}
                onChange={(e) => setThankYouNote(e.target.value)}
                placeholder="Write a note of appreciation to your sender..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Update Thank-You Note on Gratitude Wall
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVE UNWRAPPED SELECTION VIEW */}
      {unwrapped && !isExpired && !isAlreadyClaimed && (
        <div className="mt-8 space-y-8">
          {/* Step 1: Confirm Delivery Region & Mode */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
                <Globe className="h-4 w-4" />
                <span>Step 1 • Select Your Delivery Region</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                Catalog automatically updates to show gifts stocked by local regional suppliers in your territory.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => {
                const active = selectedRegion === r.code;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => handleRegionSwitch(r.code)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                      active
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-2xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {r.code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Toggle: Physical Gift vs Charity Donation */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setChoiceMode("physical")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                  choiceMode === "physical"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Gift className="h-4 w-4" />
                <span>
                  Choose a Physical Gift ({eligibleProducts.length} available in {selectedRegion})
                </span>
              </button>
              {giftSend.campaign.allowCharity && (
                <button
                  type="button"
                  onClick={() => setChoiceMode("charity")}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                    choiceMode === "charity"
                      ? "bg-rose-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <HeartHandshake className="h-4 w-4" />
                  <span>Donate Gift Value to Charity ({charities.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left 7 Columns: Gift Catalog or Charity Cards */}
            <div className="lg:col-span-7">
              {choiceMode === "physical" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {eligibleProducts.map((product) => {
                    const isSelected = product.id === selectedProductId;
                    return (
                      <div
                        key={product.id}
                        onClick={() => setSelectedProductId(product.id)}
                        className={`cursor-pointer overflow-hidden rounded-2xl border bg-white transition ${
                          isSelected
                            ? "border-indigo-600 ring-2 ring-indigo-600/20 shadow-md"
                            : "border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="h-40 w-full object-cover"
                        />
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                              {product.category}
                            </span>
                            <span className="text-[11px] font-medium text-emerald-700">
                              Ships in {product.vendor.slaDays}d ({selectedRegion})
                            </span>
                          </div>
                          <h3 className="mt-2 text-sm font-bold text-slate-900">
                            {product.title}
                          </h3>
                          <p className="mt-1 text-xs text-slate-600">
                            {product.description}
                          </p>
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                            <span>Partner: {product.vendor.businessName}</span>
                            <span className="font-bold text-indigo-600">
                              {isSelected ? "✓ Selected" : "Select Gift"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {charities.map((charity) => {
                    const isSelected = charity.id === selectedCharityId;
                    return (
                      <div
                        key={charity.id}
                        onClick={() => setSelectedCharityId(charity.id)}
                        className={`cursor-pointer rounded-2xl border bg-white p-5 transition ${
                          isSelected
                            ? "border-rose-600 ring-2 ring-rose-600/20 shadow-md"
                            : "border-slate-200 hover:border-rose-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                            {charity.category}
                          </span>
                          <span className="text-xs font-bold text-rose-600">
                            100% Impact Donation
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-bold text-slate-900">
                          {charity.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600">{charity.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right 5 Columns: Privacy-First Checkout & Thank-You Note */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleRedeemSubmit}
                className="sticky top-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
              >
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                    Step 2 • Confirm Your Selection
                  </span>
                  <h3 className="mt-1 text-base font-extrabold text-slate-900">
                    {choiceMode === "charity"
                      ? selectedCharity?.name || "Select a Charity"
                      : selectedProduct?.title || "Select a Gift"}
                  </h3>
                </div>

                {choiceMode === "physical" && (
                  <>
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] text-emerald-900">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span>
                        <strong>Snappy Address Privacy Shield:</strong> Your shipping address is only used by{" "}
                        {selectedProduct?.vendor.businessName || "our fulfillment partner"} to deliver your package and is kept private from {giftSend.company.name}.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Recipient Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddressLine1}
                        onChange={(e) => setShippingAddressLine1(e.target.value)}
                        placeholder="742 Evergreen Terrace, Apt 4B"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          placeholder="Austin / Amsterdam / Tokyo"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          State / Province
                        </label>
                        <input
                          type="text"
                          value={shippingState}
                          onChange={(e) => setShippingState(e.target.value)}
                          placeholder="TX / NH"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Postal / ZIP Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingPostalCode}
                          onChange={(e) => setShippingPostalCode(e.target.value)}
                          placeholder="78701"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Country Code *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={2}
                          value={shippingCountry}
                          onChange={(e) => setShippingCountry(e.target.value.toUpperCase())}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Send a Thank-You Note to {giftSend.company.name} (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={thankYouNote}
                    onChange={(e) => setThankYouNote(e.target.value)}
                    placeholder="Thank you so much for this thoughtful milestone gift!"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (choiceMode === "physical" && !selectedProductId) ||
                    (choiceMode === "charity" && !selectedCharityId)
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <MapPin className="h-4 w-4" />
                  <span>
                    {submitting
                      ? "Confirming Redemption..."
                      : choiceMode === "charity"
                      ? "Complete 100% Charity Donation"
                      : "Claim My Gift & Ship Free"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
