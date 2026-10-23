"use client";

import { Disclosure } from "@/components/Disclosure";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Gift,
  Truck,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Plus,
  Trash2,
  Star,
} from "lucide-react";
import { LogisticsTimeline, type ShipmentCheckpoint } from "@/components/LogisticsTimeline";
import { REGIONS, type RegionCode } from "@/lib/constants";

interface SavedAddressItem {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  region: string;
  deliveryInstructions: string;
  isDefault: boolean;
}

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
  savedAddresses: SavedAddressItem[];
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
      id: string;
      orderType: string;
      fulfillmentStatus: string;
      selectedVariant: string;
      shippingName: string;
      shippingAddressLine1: string;
      shippingCity: string;
      shippingCountry: string;
      deliveryInstructions: string;
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
      product?: {
        id: string;
        sku: string;
        title: string;
        imageUrl: string;
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
  const [activeTab, setActiveTab] = useState<"gifts" | "addresses">("gifts");
  const [claimCode, setClaimCode] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [banner, setBanner] = useState("");

  // New Address Book Entry Form
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrName, setAddrName] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPostalCode, setAddrPostalCode] = useState("");
  const [addrCountry, setAddrCountry] = useState("US");
  const [addrRegion, setAddrRegion] = useState<RegionCode>("NA");
  const [addrInstructions, setAddrInstructions] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(true);

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
          if (json.user?.name) setAddrName((name) => name || json.user.name);
        } else {
          setLookupError(json.error || "Unable to load your gifts.");
        }
      }
    } catch {
      setLookupError("Unable to connect to your recipient workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipientPortal();
  }, [loadRecipientPortal]);

  async function handleClaimLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError("");
    const res = await fetch("/api/auth/claim-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimCode, email: data?.user.email }),
    });
    const json = await res.json();
    if (!res.ok) {
      setLookupError(json.error || "No gift found with that code.");
    } else {
      router.push(json.redirectTo);
    }
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setBanner("");
    const res = await fetch("/api/recipient/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: addrLabel,
        recipientName: addrName,
        phone: addrPhone,
        addressLine1: addrLine1,
        addressLine2: addrLine2,
        city: addrCity,
        state: addrState,
        postalCode: addrPostalCode,
        country: addrCountry,
        region: addrRegion,
        deliveryInstructions: addrInstructions,
        isDefault: addrIsDefault,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setBanner("✓ Saved destination added to your Recipient Address Book.");
      setAddrLine1("");
      setAddrLine2("");
      setAddrCity("");
      setAddrState("");
      setAddrPostalCode("");
      setAddrInstructions("");
      await loadRecipientPortal();
    } else {
      setLookupError(json.error || "Could not save address.");
    }
  }

  async function handleDeleteAddress(addressId: string) {
    const res = await fetch(`/api/recipient/addresses?id=${encodeURIComponent(addressId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setBanner("Address removed from your Address Book.");
      await loadRecipientPortal();
    } else {
      const result = await res.json();
      setLookupError(result.error || "Unable to remove address.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-[#6E665E]">
        Loading Snappy Atelier Recipient Gift & Delivery Suite...
      </div>
    );
  }

  if (unauthorized || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C85A32]/15 text-[#C85A32]">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-[#141210]">
            Recipient workspace
          </h1>
          <p className="mt-2 text-xs text-[#6E665E]">
            Sign in to view your gifts and saved delivery details, or open an invitation with its code and recipient email.
          </p>

          <Link href="/auth/recipient" className="mt-4 inline-block rounded-full bg-[#C85A32] px-6 py-3 text-sm font-semibold text-white">Sign in or redeem an invitation</Link>
          {lookupError && (
            <p className="mt-2 text-xs font-semibold text-rose-600">{lookupError}</p>
          )}

        </div>
      </div>
    );
  }

  const { user, savedAddresses, gifts, metrics } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs lg:flex-row lg:items-center">
        <div>
          <span className="rounded-full bg-[#C85A32]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#C85A32]">
            Recipient workspace
          </span>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-[#141210]">
            Your gifts
          </h1>
          <p className="mt-1 text-xs text-[#6E665E]">
            {user.name} · {metrics.actionRequired} ready to choose · {metrics.inTransit} in transit
          </p>
        </div>

        <Disclosure title="Redeem another invitation" defaultOpen={gifts.length === 0} className="w-full lg:w-80">
          <form onSubmit={handleClaimLookup} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              required
              aria-label="Invitation code"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              placeholder="Redeem another code (SNPY-...)"
              className="min-w-0 flex-1 rounded-lg border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 font-mono text-xs uppercase"
            />
            <button
              type="submit"
              className="rounded-full bg-[#141210] px-5 py-2 text-xs font-bold text-[#FAF8F5] hover:bg-[#C85A32]"
            >
              Unwrap Code
            </button>
          </form>
        </Disclosure>
      </div>

      {banner && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900">
          {banner}
        </div>
      )}
      {lookupError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{lookupError}</p>}

      {/* KPIs */}
      <Disclosure title="Gift activity overview" className="mt-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
              <span>Ready to Unwrap & Claim</span>
              <Gift className="h-4 w-4 text-[#C85A32]" />
            </div>
            <div className="mt-2 font-serif text-2xl font-semibold text-[#141210]">
              {metrics.actionRequired}
            </div>
          </div>
          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
              <span>In Carrier Fulfillment</span>
              <Truck className="h-4 w-4 text-[#141210]" />
            </div>
            <div className="mt-2 font-serif text-2xl font-semibold text-[#141210]">
              {metrics.inTransit}
            </div>
          </div>
          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6E665E]">
              <span>Delivered / Donated</span>
              <CheckCircle2 className="h-4 w-4 text-[#1F4D3A]" />
            </div>
            <div className="mt-2 font-serif text-2xl font-semibold text-[#141210]">
              {metrics.completed}
            </div>
          </div>
        </div>
      </Disclosure>

      {/* Sub-navigation Tabs */}
      <WorkspaceTabs<typeof activeTab>
        activeTab={activeTab}
        onChange={setActiveTab}
        primary={[{ id: "gifts", label: `My gifts (${gifts.length})`, icon: Gift }]}
        secondary={[{ id: "addresses", label: `Addresses (${savedAddresses?.length || 0})`, icon: BookOpen }]}
      />

      {/* TAB 1: GIFTS & CARRIER LOGISTICS */}
      {activeTab === "gifts" && (
        <div className="mt-4 space-y-4">
          {gifts.length === 0 && <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500">No gifts yet. Redeem an invitation above using the code sent to your email.</p>}
          {gifts.map((g) => {
            const isUnclaimed = ["SENT", "OPENED"].includes(g.status);
            return (
              <div
                key={g.id}
                className="rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex items-start gap-4">
                    {g.giftOrder?.product?.imageUrl && (
                      <img
                        src={g.giftOrder.product.imageUrl}
                        alt={g.giftOrder.product.title}
                        className="h-20 w-20 rounded-2xl border border-[#E6E0D6] object-cover"
                      />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#FAF8F5] border border-[#E6E0D6] px-3 py-0.5 text-xs font-bold text-[#141210]">
                          {g.company.name} • {g.campaign.occasion}
                        </span>
                        <span
                          className={`rounded-full px-3 py-0.5 text-xs font-bold ${isUnclaimed
                            ? "bg-[#C85A32]/15 text-[#C85A32]"
                            : "bg-[#1F4D3A]/15 text-[#1F4D3A]"
                            }`}
                        >
                          {g.status}
                        </span>
                      </div>

                      {g.giftOrder && (
                        <h2 className="mt-2 font-serif text-lg font-semibold text-[#141210]">
                          {g.giftOrder.product?.title || (g.giftOrder.charity ? `Donation to ${g.giftOrder.charity.name}` : "Your gift")}
                        </h2>
                      )}
                      <Disclosure title="Gift message & delivery details" className="mt-2">
                        <p className="break-all font-mono text-xs text-stone-500">Code: {g.claimCode}</p>
                        <p className="mt-2 font-serif text-sm italic text-[#141210]">&ldquo;{g.personalMessage}&rdquo;</p>
                        {g.giftOrder && (
                          <p className="mt-2 text-xs text-[#6E665E]">
                            {g.giftOrder.selectedVariant}
                            {g.giftOrder.shippingCity && (
                              <span> · {g.giftOrder.shippingAddressLine1}, {g.giftOrder.shippingCity}, {g.giftOrder.shippingCountry}</span>
                            )}
                          </p>
                        )}
                      </Disclosure>
                    </div>
                  </div>

                  <div>
                    <Link
                      href={`/claim/${g.claimToken}`}
                      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition ${isUnclaimed
                        ? "bg-[#C85A32] text-white hover:bg-[#b24d28]"
                        : "border border-[#E6E0D6] bg-[#FAF8F5] text-[#141210] hover:border-[#141210]"
                        }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {isUnclaimed
                          ? "Unwrap & Choose Gift"
                          : g.giftOrder?.addressLocked
                            ? "View Live Tracking & Gratitude"
                            : "Edit Delivery / Swap Gift / Track"}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Live 5-Stage Carrier Timeline for Claimed Physical Orders */}
                {g.giftOrder && g.giftOrder.orderType === "PHYSICAL_GIFT" && (
                  <div className="mt-5">
                    <LogisticsTimeline
                      fulfillmentStatus={g.giftOrder.fulfillmentStatus}
                      trackingCarrier={g.giftOrder.trackingCarrier}
                      trackingNumber={g.giftOrder.trackingNumber}
                      trackingUrl={g.giftOrder.trackingUrl}
                      serviceLevel={g.giftOrder.serviceLevel}
                      fulfillmentWarehouse={g.giftOrder.fulfillmentWarehouse}
                      packageWeightGrams={g.giftOrder.packageWeightGrams}
                      estimatedDeliveryAt={g.giftOrder.estimatedDeliveryAt}
                      addressLocked={g.giftOrder.addressLocked}
                      exceptionNote={g.giftOrder.exceptionNote}
                      swapCount={g.giftOrder.swapCount}
                      selectedVariant={g.giftOrder.selectedVariant}
                      shipmentEvents={g.giftOrder.shipmentEvents || []}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: SAVED DELIVERY ADDRESS BOOK */}
      {activeTab === "addresses" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSaveAddress}
              className="space-y-3.5 rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs"
            >
              <div className="flex items-center gap-2 font-serif text-xl font-semibold text-[#141210]">
                <Plus className="h-5 w-5 text-[#C85A32]" />
                <span>Add Saved Delivery Destination</span>
              </div>
              <p className="text-xs text-[#6E665E]">
                Store your Home, Office, or Travel addresses for 1-click autofill when unwrapping future gifts.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#575049]">
                    Address Label
                  </label>
                  <select
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Studio">Studio</option>
                    <option value="Travel">Travel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575049]">
                    Global Territory
                  </label>
                  <select
                    value={addrRegion}
                    onChange={(e) => setAddrRegion(e.target.value as RegionCode)}
                    className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} — {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  placeholder="Recipient Full Name *"
                  className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  placeholder="Mobile Phone (+1...)"
                  className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
                />
              </div>

              <input
                type="text"
                required
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.target.value)}
                placeholder="Street Address Line 1 *"
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  placeholder="City *"
                  className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={addrPostalCode}
                  onChange={(e) => setAddrPostalCode(e.target.value)}
                  placeholder="Postal Code *"
                  className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={addrCountry}
                  onChange={(e) => setAddrCountry(e.target.value.toUpperCase())}
                  placeholder="Country (US)"
                  className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs uppercase"
                />
              </div>

              <input
                type="text"
                value={addrInstructions}
                onChange={(e) => setAddrInstructions(e.target.value)}
                placeholder="Courier drop-off or concierge instructions"
                className="w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
              />

              <label className="flex items-center gap-2 text-xs font-semibold text-[#141210]">
                <input
                  type="checkbox"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                />
                <span>Set as my default delivery destination</span>
              </label>

              <button
                type="submit"
                className="w-full rounded-full bg-[#141210] py-3 text-xs font-bold text-[#FAF8F5] hover:bg-[#C85A32]"
              >
                Save Destination to Address Book
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {savedAddresses?.map((addr) => (
              <div
                key={addr.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#141210] px-3 py-0.5 text-xs font-bold text-[#FAF8F5]">
                      {addr.label}
                    </span>
                    <span className="rounded-full border border-[#E6E0D6] bg-[#FAF8F5] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#575049]">
                      {addr.region} • {addr.country}
                    </span>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#1F4D3A]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#1F4D3A]">
                        <Star className="h-3 w-3" /> Default
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-bold text-[#141210]">
                    {addr.recipientName}{" "}
                    {addr.recipientPhone && (
                      <span className="font-normal text-xs text-[#6E665E]">
                        ({addr.recipientPhone})
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#575049]">
                    {addr.addressLine1}
                    {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, {addr.city}
                    {addr.state ? `, ${addr.state}` : ""} {addr.postalCode}, {addr.country}
                  </p>
                  {addr.deliveryInstructions && (
                    <p className="mt-1 text-[11px] italic text-[#6E665E]">
                      Courier note: &ldquo;{addr.deliveryInstructions}&rdquo;
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
