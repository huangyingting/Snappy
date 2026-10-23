"use client";

import React, { useEffect, useState, useCallback, useRef, use } from "react";
import Link from "next/link";
import {
  Gift,
  Sparkles,
  Globe,
  HeartHandshake,
  ShieldCheck,
  MapPin,
  Clock,
  Tag,
  Repeat,
  PencilLine,
  BookOpen,
} from "lucide-react";
import { REGIONS, formatCurrency, type RegionCode } from "@/lib/constants";
import { LogisticsTimeline, type ShipmentCheckpoint } from "@/components/LogisticsTimeline";
import { Disclosure } from "@/components/Disclosure";

interface ClaimProduct {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: string;
  badgeText?: string;
  priceCents: number;
  imageUrl: string;
  stockQuantity: number;
  supportedRegions: string;
  variantsJson: string;
  tagsJson: string;
  specsJson: string;
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

interface SavedRecipientAddress {
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
      selectedVariant: string;
      shippingName: string;
      shippingPhone: string;
      shippingAddressLine1: string;
      shippingAddressLine2: string;
      shippingCity: string;
      shippingState: string;
      shippingPostalCode: string;
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
  canSaveAddress: boolean;
  eligibleProducts: ClaimProduct[];
  giftCategories: {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    accentColor: string;
  }[];
  charities: ClaimCharity[];
  savedAddresses: SavedRecipientAddress[];
}

function parseList(raw?: string): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: string[] = [];
    for (const item of arr) {
      if (typeof item === "string") {
        out.push(item);
      } else if (item && typeof item === "object") {
        const groupName = typeof item.name === "string" ? item.name.trim() : "";
        if (Array.isArray(item.options)) {
          for (const opt of item.options) {
            const optText = String(opt).trim();
            if (optText) {
              out.push(groupName ? `${groupName}: ${optText}` : optText);
            }
          }
        } else if (typeof item.label === "string") {
          out.push(item.label);
        } else if (groupName) {
          out.push(groupName);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
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

  // Unwrapping & Catalog State
  const [unwrapped, setUnwrapped] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>("NA");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [choiceMode, setChoiceMode] = useState<"physical" | "charity">("physical");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedCharityId, setSelectedCharityId] = useState<string>("");

  // Shipping & Address State
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddressLine1, setShippingAddressLine1] = useState("");
  const [shippingAddressLine2, setShippingAddressLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("US");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [saveToAddressBook, setSaveToAddressBook] = useState(true);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [thankYouNote, setThankYouNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Post-Claim Self-Service Edit & Swap State
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [swappingGift, setSwappingGift] = useState(false);
  const initializedToken = useRef<string | null>(null);
  const [swapProductId, setSwapProductId] = useState("");
  const [swapVariant, setSwapVariant] = useState("");

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
          const initializing = initializedToken.current !== token;
          if (initializing && json.giftSend?.recipientName) {
            setShippingName(json.giftSend.recipientName);
          }
          if (json.giftSend?.thankYouNote) {
            setThankYouNote(json.giftSend.thankYouNote);
          }
          if (json.isAlreadyClaimed) {
            setUnwrapped(true);
            const ord = json.giftSend?.giftOrder;
            if (ord) {
              setShippingName(ord.shippingName || json.giftSend.recipientName);
              setShippingPhone(ord.shippingPhone || "");
              setShippingAddressLine1(ord.shippingAddressLine1 || "");
              setShippingAddressLine2(ord.shippingAddressLine2 || "");
              setShippingCity(ord.shippingCity || "");
              setShippingState(ord.shippingState || "");
              setShippingPostalCode(ord.shippingPostalCode || "");
              setShippingCountry(ord.shippingCountry || "US");
              setDeliveryInstructions(ord.deliveryInstructions || "");
            }
          } else if (initializing && json.savedAddresses?.length > 0) {
            const def =
              json.savedAddresses.find((a: SavedRecipientAddress) => a.isDefault) ||
              json.savedAddresses[0];
            if (def) {
              setShippingName(def.recipientName || json.giftSend.recipientName);
              setShippingPhone(def.recipientPhone || "");
              setShippingAddressLine1(def.addressLine1);
              setShippingAddressLine2(def.addressLine2 || "");
              setShippingCity(def.city);
              setShippingState(def.state || "");
              setShippingPostalCode(def.postalCode);
              setShippingCountry(def.country);
              setDeliveryInstructions(def.deliveryInstructions || "");
            }
          }
          if (json.eligibleProducts?.length > 0) {
            const firstProd = json.eligibleProducts[0];
            setSelectedProductId(firstProd.id);
            const variants = parseList(firstProd.variantsJson);
            setSelectedVariant(variants[0] || "Standard Edition");
            setSwapProductId(firstProd.id);
            setSwapVariant(variants[0] || "Standard Edition");
          } else {
            setSelectedProductId("");
          }
          if (json.charities?.length > 0) {
            setSelectedCharityId(json.charities[0].id);
          }
          initializedToken.current = token;
        }
      } catch {
        setErrorMsg("Network error loading gift experience.");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadClaimData();
  }, [loadClaimData]);

  function applySavedAddress(addr: SavedRecipientAddress) {
    setShippingName(addr.recipientName);
    setShippingPhone(addr.recipientPhone || "");
    setShippingAddressLine1(addr.addressLine1);
    setShippingAddressLine2(addr.addressLine2 || "");
    setShippingCity(addr.city);
    setShippingState(addr.state || "");
    setShippingPostalCode(addr.postalCode);
    setShippingCountry(addr.country);
    setDeliveryInstructions(addr.deliveryInstructions || "");
    setAddressLabel(addr.label);
  }

  async function handleRegionSwitch(newRegion: RegionCode) {
    setSelectedRegion(newRegion);
    setSelectedCategory("ALL");
    const defaultCountryMap: Record<RegionCode, string> = {
      NA: "US",
      EMEA: "NL",
      APAC: "JP",
      LATAM: "BR",
    };
    setShippingCountry(defaultCountryMap[newRegion]);
    await loadClaimData(newRegion);
  }

  function handleSelectProduct(prod: ClaimProduct) {
    setSelectedProductId(prod.id);
    const variants = parseList(prod.variantsJson);
    setSelectedVariant(variants[0] || "Standard Edition");
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
              selectedVariant,
              recipientRegion: selectedRegion,
              shippingName,
              shippingPhone,
              shippingAddressLine1,
              shippingAddressLine2,
              shippingCity,
              shippingState,
              shippingPostalCode,
              shippingCountry,
              deliveryInstructions,
              saveToAddressBook: data?.canSaveAddress && saveToAddressBook,
              addressLabel,
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
        setBanner(choiceMode === "charity"
          ? "Donation requested. Your sender will arrange and record the transfer."
          : "Gift selected. Your vendor will arrange shipment and add tracking details.");
        await loadClaimData(selectedRegion);
      }
    } catch {
      setErrorMsg("Network error submitting gift claim.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePreShipmentDeliveryUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.giftSend.giftOrder) return;
    setErrorMsg("");
    setBanner("");
    const res = await fetch(`/api/recipient/orders/${data.giftSend.giftOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_delivery",
        claimToken: token,
        shippingName,
        shippingPhone,
        shippingAddressLine1,
        shippingAddressLine2,
        shippingCity,
        shippingState,
        shippingPostalCode,
        shippingCountry,
        deliveryInstructions,
        selectedVariant: data.giftSend.giftOrder.selectedVariant,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Failed to update delivery address.");
    } else {
      setBanner("✓ Pre-shipment delivery destination & courier instructions updated.");
      setEditingDelivery(false);
      await loadClaimData(selectedRegion);
    }
  }

  async function handlePreShipmentGiftSwap(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.giftSend.giftOrder || !swapProductId) return;
    setErrorMsg("");
    setBanner("");
    const res = await fetch(`/api/recipient/orders/${data.giftSend.giftOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "swap_gift",
        claimToken: token,
        newProductId: swapProductId,
        selectedVariant: swapVariant || "Standard Edition",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Failed to swap gift.");
    } else {
      setBanner("✓ Pre-shipment gift swapped! Inventory and supplier routing updated automatically.");
      setSwappingGift(false);
      await loadClaimData(selectedRegion);
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
      setBanner("Thank-you note posted to " + data?.giftSend.company.name + "'s Gratitude Wall!");
      await loadClaimData(selectedRegion);
    }
  }

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-[#6E665E]">
        Preparing your bespoke Snappy Atelier gift unwrapping experience...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 text-center">
        <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
          <h1 className="font-serif text-2xl font-semibold text-[#141210]">
            Gift Invitation Not Found
          </h1>
          <p className="mt-2 text-xs text-[#6E665E]">{errorMsg}</p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-full bg-[#141210] px-6 py-2.5 text-xs font-bold text-[#FAF8F5]"
          >
            Return to Atelier
          </Link>
        </div>
      </div>
    );
  }

  const {
    giftSend,
    isExpired,
    isAlreadyClaimed,
    eligibleProducts,
    giftCategories,
    charities,
    savedAddresses,
  } = data;

  const filteredProducts = eligibleProducts.filter(
    (p) => selectedCategory === "ALL" || p.category === selectedCategory
  );
  const selectedProduct =
    eligibleProducts.find((p) => p.id === selectedProductId) || filteredProducts[0];
  const selectedProductVariants = parseList(selectedProduct?.variantsJson);
  const selectedCharity = charities.find((c) => c.id === selectedCharityId);
  const swapTargetProduct = eligibleProducts.find((p) => p.id === swapProductId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {/* Luxury Atelier Invitation Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E6E0D6] bg-[#141210] p-5 text-[#FAF8F5] shadow-sm">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#C85A32]/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-4 py-1.5 text-xs font-bold text-[#F3E5AB]">
            <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>
              {giftSend.company.name} • {giftSend.campaign.occasion}
            </span>
          </div>
        </div>

        <h1 className="mt-3 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
          {isAlreadyClaimed
            ? `Your gift, ${giftSend.recipientName}.`
            : `Choose your gift, ${giftSend.recipientName}.`}
        </h1>

        <Disclosure title={`Message from ${giftSend.company.name}`} className="relative mt-3">
          <blockquote className="font-serif text-sm italic leading-relaxed text-stone-700">
            &ldquo;{giftSend.personalMessage}&rdquo;
          </blockquote>
          <p className="mt-2 break-all font-mono text-xs text-stone-500">Invitation: {giftSend.claimCode}</p>
        </Disclosure>
        {!unwrapped && !isExpired && !isAlreadyClaimed && (
          <div className="mt-7">
            <button
              onClick={() => setUnwrapped(true)}
              className="inline-flex items-center gap-2.5 rounded-full bg-[#C85A32] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#b24d28]"
            >
              <Gift className="h-5 w-5" />
              <span>Unwrap & Explore My Curated Collection</span>
            </button>
          </div>
        )}

        {isExpired && !isAlreadyClaimed && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-950/50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-rose-200">
              <Clock className="h-4 w-4" />
              <span>This Gift Invitation Has Expired</span>
            </div>
            <p className="mt-1 text-xs text-rose-200/80">
              The redemption window closed on{" "}
              {new Date(giftSend.expiresAt).toLocaleDateString()}. Unclaimed escrow funds were automatically returned to {giftSend.company.name}.
            </p>
          </div>
        )}
      </div>

      {banner && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-xs font-bold text-emerald-900">
          {banner}
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-xs font-bold text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* ALREADY CLAIMED VIEW: Multi-Checkpoint Carrier Logistics + Self-Service Pre-Shipment Controls */}
      {isAlreadyClaimed && giftSend.giftOrder && (
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-[#1F4D3A]/10 px-3 py-1 text-xs font-bold text-[#1F4D3A]">
                  Status: {giftSend.giftOrder.fulfillmentStatus}
                </span>
                <span className="font-mono text-xs font-semibold text-[#6E665E]">
                  Region: {giftSend.giftOrder.recipientRegion}
                </span>
              </div>

              {giftSend.giftOrder.orderType === "CHARITY_DONATION" ? (
                <div className="mt-4">
                  <h2 className="font-serif text-2xl font-semibold text-[#141210]">
                    {giftSend.giftOrder.fulfillmentStatus === "COMPLETED" ? "Donation confirmed" : "Donation requested"}
                  </h2>
                  <p className="mt-1 text-xs text-[#6E665E]">
                    You allocated {formatCurrency(giftSend.budgetCents)} on behalf of{" "}
                    <strong>{giftSend.company.name}</strong> to{" "}
                    <strong>{giftSend.giftOrder.charity?.name}</strong>. {giftSend.giftOrder.fulfillmentStatus !== "COMPLETED" && "The platform operator will arrange and confirm the transfer."}
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex items-start gap-4">
                    {giftSend.giftOrder.product?.imageUrl && (
                      <img
                        src={giftSend.giftOrder.product.imageUrl}
                        alt={giftSend.giftOrder.product.title}
                        className="h-24 w-24 rounded-2xl border border-[#E6E0D6] object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#C85A32]">
                        {giftSend.giftOrder.product?.category} •{" "}
                        {giftSend.giftOrder.selectedVariant || "Standard Edition"}
                      </span>
                      <h2 className="mt-0.5 font-serif text-2xl font-semibold text-[#141210]">
                        {giftSend.giftOrder.product?.title}
                      </h2>
                      <p className="mt-1 text-xs text-[#6E665E]">
                        Fulfilled by{" "}
                        <strong>{giftSend.giftOrder.product?.vendor.businessName}</strong> •
                        Destination: {giftSend.giftOrder.shippingName},{" "}
                        {giftSend.giftOrder.shippingAddressLine1},{" "}
                        {giftSend.giftOrder.shippingCity},{" "}
                        {giftSend.giftOrder.shippingCountry}
                      </p>
                      {giftSend.giftOrder.deliveryInstructions && (
                        <p className="mt-1 text-[11px] text-[#6E665E]">
                          Courier Note: &ldquo;{giftSend.giftOrder.deliveryInstructions}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pre-Shipment Self-Service Controls (Edit Address / Swap Gift) */}
                  {!giftSend.giftOrder.addressLocked && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-4">
                      <div>
                        <div className="text-xs font-bold text-[#141210]">
                          Pre-Shipment Recipient Controls Unlocked
                        </div>
                        <p className="text-[11px] text-[#6E665E]">
                          Need to change your delivery address or swap to another gift before the carrier label prints?
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDelivery(!editingDelivery);
                            setSwappingGift(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D6] bg-white px-3.5 py-1.5 text-xs font-bold text-[#141210] hover:border-[#141210]"
                        >
                          <PencilLine className="h-3.5 w-3.5 text-[#C85A32]" />
                          <span>Edit Delivery Address</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSwappingGift(!swappingGift);
                            setEditingDelivery(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#141210] px-3.5 py-1.5 text-xs font-bold text-[#FAF8F5] hover:bg-[#C85A32]"
                        >
                          <Repeat className="h-3.5 w-3.5" />
                          <span>Swap Gift</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Pre-Shipment Delivery Editor */}
                  {editingDelivery && !giftSend.giftOrder.addressLocked && (
                    <form
                      onSubmit={handlePreShipmentDeliveryUpdate}
                      className="mt-4 space-y-3 rounded-2xl border border-[#C85A32]/40 bg-[#FAF8F5] p-5"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-[#C85A32]">
                        Update Pre-Shipment Delivery Address & Instructions
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          required
                          value={shippingName}
                          onChange={(e) => setShippingName(e.target.value)}
                          placeholder="Recipient Full Name"
                          className="rounded-xl border border-[#E6E0D6] bg-white px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          value={shippingPhone}
                          onChange={(e) => setShippingPhone(e.target.value)}
                          placeholder="Mobile Phone for Courier SMS"
                          className="rounded-xl border border-[#E6E0D6] bg-white px-3 py-2 text-xs"
                        />
                      </div>
                      <input
                        type="text"
                        required
                        value={shippingAddressLine1}
                        onChange={(e) => setShippingAddressLine1(e.target.value)}
                        placeholder="Street Address Line 1"
                        className="w-full rounded-xl border border-[#E6E0D6] bg-white px-3 py-2 text-xs"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          placeholder="City"
                          className="rounded-xl border border-[#E6E0D6] bg-white px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          required
                          value={shippingPostalCode}
                          onChange={(e) => setShippingPostalCode(e.target.value)}
                          placeholder="Postal Code"
                          className="rounded-xl border border-[#E6E0D6] bg-white px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          required
                          maxLength={2}
                          value={shippingCountry}
                          onChange={(e) => setShippingCountry(e.target.value.toUpperCase())}
                          placeholder="Country"
                          className="rounded-xl border border-[#E6E0D6] bg-white px-3 py-2 text-xs uppercase"
                        />
                      </div>
                      <input
                        type="text"
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        placeholder="Gate code, concierge desk, or drop-off instructions"
                        className="w-full rounded-xl border border-[#E6E0D6] bg-white px-3 py-2 text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingDelivery(false)}
                          className="rounded-full border border-[#E6E0D6] bg-white px-4 py-1.5 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-full bg-[#1F4D3A] px-5 py-1.5 text-xs font-bold text-white"
                        >
                          Save Updated Destination
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Inline Pre-Shipment Gift Swap Panel */}
                  {swappingGift && !giftSend.giftOrder.addressLocked && (
                    <form
                      onSubmit={handlePreShipmentGiftSwap}
                      className="mt-4 space-y-3 rounded-2xl border border-[#141210]/30 bg-[#FAF8F5] p-5"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-[#141210]">
                        Pre-Shipment Gift Exchange ({eligibleProducts.length} regional options)
                      </div>
                      <select
                        value={swapProductId}
                        onChange={(e) => {
                          setSwapProductId(e.target.value);
                          const target = eligibleProducts.find(
                            (p) => p.id === e.target.value
                          );
                          const vars = parseList(target?.variantsJson);
                          setSwapVariant(vars[0] || "Standard Edition");
                        }}
                        className="w-full rounded-xl border border-[#E6E0D6] bg-white px-3 py-2 text-xs font-semibold"
                      >
                        {eligibleProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.category} • Partner: {p.vendor.businessName})
                          </option>
                        ))}
                      </select>

                      {swapTargetProduct &&
                        parseList(swapTargetProduct.variantsJson).length > 0 && (
                          <div>
                            <label className="block text-[11px] font-bold text-[#6E665E]">
                              Select Variant / Edition
                            </label>
                            <select
                              value={swapVariant}
                              onChange={(e) => setSwapVariant(e.target.value)}
                              className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-white px-3 py-2 text-xs"
                            >
                              {parseList(swapTargetProduct.variantsJson).map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSwappingGift(false)}
                          className="rounded-full border border-[#E6E0D6] bg-white px-4 py-1.5 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-full bg-[#C85A32] px-5 py-1.5 text-xs font-bold text-white"
                        >
                          Confirm Gift Exchange
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Full 5-Stage Carrier Logistics Timeline */}
                  <div className="mt-4">
                    <LogisticsTimeline
                      fulfillmentStatus={giftSend.giftOrder.fulfillmentStatus}
                      trackingCarrier={giftSend.giftOrder.trackingCarrier}
                      trackingNumber={giftSend.giftOrder.trackingNumber}
                      trackingUrl={giftSend.giftOrder.trackingUrl}
                      serviceLevel={giftSend.giftOrder.serviceLevel}
                      fulfillmentWarehouse={giftSend.giftOrder.fulfillmentWarehouse}
                      packageWeightGrams={giftSend.giftOrder.packageWeightGrams}
                      estimatedDeliveryAt={giftSend.giftOrder.estimatedDeliveryAt}
                      addressLocked={giftSend.giftOrder.addressLocked}
                      exceptionNote={giftSend.giftOrder.exceptionNote}
                      swapCount={giftSend.giftOrder.swapCount}
                      selectedVariant={giftSend.giftOrder.selectedVariant}
                      shipmentEvents={giftSend.giftOrder.shipmentEvents || []}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <Disclosure title="Send a thank-you note">
              <form onSubmit={handleSavePostClaimThankYou} className="space-y-3">
                <textarea
                  rows={2}
                  aria-label="Thank-you note"
                  value={thankYouNote}
                  onChange={(e) => setThankYouNote(e.target.value)}
                  placeholder="Share a note of appreciation with your sender..."
                  className="w-full rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-3.5 text-xs"
                />
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#141210] py-3 text-xs font-bold text-[#FAF8F5] hover:bg-[#C85A32]"
                >
                  Post to {giftSend.company.name} Gratitude Wall
                </button>
              </form>
            </Disclosure>
          </div>
        </div>
      )}

      {/* ACTIVE UNWRAPPED SELECTION VIEW */}
      {unwrapped && !isExpired && !isAlreadyClaimed && (
        <div className="mt-4 space-y-4">
          {/* Step 1: Delivery Region & Gift Category Filter Bar */}
          <div className="rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C85A32]">
                  <Globe className="h-4 w-4" />
                  <span>Delivery region</span>
                </div>
                <p className="mt-1 text-xs text-[#6E665E]">
                  Choose where your gift will be delivered.
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
                      className={`rounded-full px-4 py-2 text-xs font-bold transition ${active
                        ? "bg-[#141210] text-[#FAF8F5] shadow-xs"
                        : "border border-[#E6E0D6] bg-[#FAF8F5] text-[#575049] hover:border-[#141210]"
                        }`}
                    >
                      {r.code}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter Pills & Physical vs Charity Mode */}
            <Disclosure title={choiceMode === "charity" ? "Charity choices" : `Categories & charity choices${selectedCategory !== "ALL" ? ` · ${selectedCategory}` : ""}`} className="mt-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag className="mr-1 h-3.5 w-3.5 text-[#C85A32]" />
                  <button
                    type="button"
                    onClick={() => {
                      setChoiceMode("physical");
                      setSelectedCategory("ALL");
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${choiceMode === "physical" && selectedCategory === "ALL"
                      ? "bg-[#C85A32] text-white"
                      : "bg-[#FAF8F5] text-[#575049] hover:bg-[#EFECE6]"
                      }`}
                  >
                    All Categories ({eligibleProducts.length})
                  </button>
                  {giftCategories?.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setChoiceMode("physical");
                        setSelectedCategory(cat.name);
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${choiceMode === "physical" && selectedCategory === cat.name
                        ? "bg-[#C85A32] text-white"
                        : "bg-[#FAF8F5] text-[#575049] hover:bg-[#EFECE6]"
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {giftSend.campaign.allowCharity && (
                  <button
                    type="button"
                    onClick={() => setChoiceMode("charity")}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition ${choiceMode === "charity"
                      ? "bg-[#1F4D3A] text-white"
                      : "border border-[#E6E0D6] bg-[#FAF8F5] text-[#1F4D3A] hover:border-[#1F4D3A]"
                      }`}
                  >
                    <HeartHandshake className="h-3.5 w-3.5" />
                    <span>Choose a charity ({charities.length})</span>
                  </button>
                )}
              </div>
            </Disclosure>
          </div>

          <a href="#gift-delivery" className="inline-flex min-h-11 items-center rounded-lg bg-[#141210] px-3 py-2 text-xs font-semibold text-white lg:hidden">Continue to delivery</a>

          <div className="grid gap-4 lg:grid-cols-12">
            {/* Left 7 Columns: Editorial Gift Cards or Charity Impact Cards */}
            <div className="lg:col-span-7">
              {choiceMode === "physical" ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map((product) => {
                    const isSelected = product.id === selectedProduct?.id;
                    return (
                      <div
                        key={product.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Choose ${product.title}`}
                        aria-pressed={isSelected}
                        onClick={() => handleSelectProduct(product)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSelectProduct(product);
                          }
                        }}
                        className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C85A32] ${isSelected
                          ? "border-[#C85A32] ring-2 ring-[#C85A32]/25 shadow-md"
                          : "border-[#E6E0D6] hover:border-[#141210]/40"
                          }`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F1EA]">
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          {product.badgeText && (
                            <span className="absolute top-3 left-3 rounded-full bg-[#141210]/85 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FAF8F5] backdrop-blur-md">
                              {product.badgeText}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold uppercase tracking-wider text-[#C85A32]">
                              {product.category}
                            </span>
                            <span className="font-semibold text-[#1F4D3A]">
                              Ships in {product.vendor.slaDays}d ({selectedRegion})
                            </span>
                          </div>
                          <h3 className="mt-1.5 font-serif text-lg font-semibold text-[#141210]">
                            {product.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-[#6E665E]">
                            {product.description}
                          </p>
                          <div className="mt-4 flex items-center justify-between border-t border-[#EFECE6] pt-3 text-xs">
                            <span className="text-[#6E665E]">
                              Atelier: {product.vendor.businessName}
                            </span>
                            <span className="font-bold text-[#C85A32]">
                              {isSelected ? "✓ Selected" : "Choose Gift →"}
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
                        role="button"
                        tabIndex={0}
                        aria-label={`Choose ${charity.name}`}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedCharityId(charity.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedCharityId(charity.id);
                          }
                        }}
                        className={`cursor-pointer rounded-2xl border bg-white p-4 transition ${isSelected
                          ? "border-[#1F4D3A] ring-2 ring-[#1F4D3A]/20 shadow-md"
                          : "border-[#E6E0D6] hover:border-[#1F4D3A]"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-[#1F4D3A]/10 px-3 py-1 text-xs font-bold text-[#1F4D3A]">
                            {charity.category}
                          </span>
                          <span className="text-xs font-bold text-[#1F4D3A]">
                            Full gift budget allocated
                          </span>
                        </div>
                        <h3 className="mt-2 font-serif text-xl font-semibold text-[#141210]">
                          {charity.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#6E665E]">{charity.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right 5 Columns: Variant Selector, Saved Address Book & Privacy-First Checkout */}
            <div className="lg:col-span-5">
              <form
                id="gift-delivery"
                onSubmit={handleRedeemSubmit}
                className="scroll-mt-32 space-y-3 rounded-2xl border border-[#E6E0D6] bg-white p-4 shadow-xs lg:sticky lg:top-20"
              >
                <div className="border-b border-[#EFECE6] pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C85A32]">
                    Your selection
                  </span>
                  <h3 className="mt-1 font-serif text-xl font-semibold text-[#141210]">
                    {choiceMode === "charity"
                      ? selectedCharity?.name || "Select a Charity"
                      : selectedProduct?.title || "Select a Gift"}
                  </h3>
                </div>

                {choiceMode === "physical" && (
                  <>
                    {/* Variant Selector */}
                    {selectedProductVariants.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-[#141210]">
                          Select Edition / Variant
                        </label>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {selectedProductVariants.map((variant) => (
                            <button
                              key={variant}
                              type="button"
                              onClick={() => setSelectedVariant(variant)}
                              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${selectedVariant === variant
                                ? "bg-[#141210] text-[#FAF8F5]"
                                : "border border-[#E6E0D6] bg-[#FAF8F5] text-[#575049]"
                                }`}
                            >
                              {variant}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Saved Address Book Quick Autofill */}
                    {savedAddresses && savedAddresses.length > 0 && (
                      <div className="rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-3.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#141210]">
                          <BookOpen className="h-3.5 w-3.5 text-[#C85A32]" />
                          <span>Autofill from Your Saved Address Book</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {savedAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => applySavedAddress(addr)}
                              className="rounded-full border border-[#E6E0D6] bg-white px-3 py-1 text-[11px] font-semibold text-[#141210] hover:border-[#C85A32]"
                            >
                              {addr.label}: {addr.city}, {addr.country}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2 rounded-2xl border border-[#1F4D3A]/20 bg-[#1F4D3A]/5 p-3 text-[11px] text-[#1F4D3A]">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <strong>Delivery address access:</strong>{" "}
                        {giftSend.company.hideRecipientAddress
                          ? `Your street address is shared with ${selectedProduct?.vendor.businessName || "the fulfilling vendor"}, but hidden from ${giftSend.company.name}.`
                          : `Your delivery address is shared with the fulfilling vendor and ${giftSend.company.name}.`}
                      </span>
                    </div>

                    <div className="grid gap-3">
                      <div>
                        <label htmlFor="shipping-name" className="block text-xs font-semibold text-[#575049]">
                          Recipient Full Name *
                        </label>
                        <input
                          id="shipping-name"
                          type="text"
                          required
                          value={shippingName}
                          onChange={(e) => setShippingName(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="shipping-street" className="block text-xs font-semibold text-[#575049]">
                        Street Address *
                      </label>
                      <input
                        id="shipping-street"
                        type="text"
                        required
                        value={shippingAddressLine1}
                        onChange={(e) => setShippingAddressLine1(e.target.value)}
                        placeholder="Street address and unit"
                        className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="shipping-city" className="block text-xs font-semibold text-[#575049]">
                          City *
                        </label>
                        <input
                          id="shipping-city"
                          type="text"
                          required
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          placeholder="Austin / Amsterdam / Tokyo"
                          className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label htmlFor="shipping-postal" className="block text-xs font-semibold text-[#575049]">
                          Postal / ZIP Code *
                        </label>
                        <input
                          id="shipping-postal"
                          type="text"
                          required
                          value={shippingPostalCode}
                          onChange={(e) => setShippingPostalCode(e.target.value)}
                          placeholder="78701"
                          className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <div>
                        <label htmlFor="shipping-country" className="block text-xs font-semibold text-[#575049]">
                          Country Code *
                        </label>
                        <input
                          id="shipping-country"
                          type="text"
                          required
                          maxLength={2}
                          value={shippingCountry}
                          onChange={(e) => setShippingCountry(e.target.value.toUpperCase())}
                          className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs uppercase"
                        />
                      </div>
                    </div>

                    <Disclosure title="Phone, state & delivery instructions">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs">Phone<input type="tel" value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2" /></label>
                        <label className="text-xs">State / province<input value={shippingState} onChange={(e) => setShippingState(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2" /></label>
                        <label className="text-xs sm:col-span-2">Address line 2<input value={shippingAddressLine2} onChange={(e) => setShippingAddressLine2(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2" /></label>
                        <label className="text-xs sm:col-span-2">Delivery instructions<input value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2" /></label>
                      </div>
                    </Disclosure>

                    {data.canSaveAddress && <div className="flex items-center justify-between rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs">
                      <label className="flex items-center gap-2 font-medium text-[#141210]">
                        <input
                          type="checkbox"
                          checked={saveToAddressBook}
                          onChange={(e) => setSaveToAddressBook(e.target.checked)}
                        />
                        <span>Save to my Recipient Address Book as:</span>
                      </label>
                      <select
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        className="rounded-lg border border-[#E6E0D6] bg-white px-2 py-1 text-xs font-semibold"
                      >
                        <option value="Home">Home</option>
                        <option value="Office">Office</option>
                        <option value="Studio">Studio</option>
                        <option value="Travel">Travel</option>
                      </select>
                    </div>}
                  </>
                )}

                <Disclosure title="Add a thank-you note">
                  <label className="block text-xs font-semibold text-[#575049]">
                    Gratitude Note to {giftSend.company.name} (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={thankYouNote}
                    onChange={(e) => setThankYouNote(e.target.value)}
                    placeholder="Thank you so much for this thoughtful milestone gift!"
                    className="mt-1 w-full rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] px-3 py-2 text-xs"
                  />
                </Disclosure>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (choiceMode === "physical" && !selectedProduct) ||
                    (choiceMode === "charity" && !selectedCharityId)
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#C85A32] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#b24d28] disabled:opacity-50"
                >
                  <MapPin className="h-4 w-4" />
                  <span>
                    {submitting
                      ? "Confirming Redemption..."
                      : choiceMode === "charity"
                        ? "Request donation"
                        : "Confirm gift selection"}
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
