"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Truck,
  Globe,
  Plus,
  CheckCircle2,
  Clock,
  DollarSign,
  Sliders,
  RefreshCw,
} from "lucide-react";
import {
  REGIONS,
  PRODUCT_CATEGORIES,
  formatCurrency,
  parseRegions,
  type RegionCode,
} from "@/lib/constants";

interface VendorProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  wholesaleCostCents: number;
  imageUrl: string;
  stockQuantity: number;
  supportedRegions: string;
  active: boolean;
}

interface VendorOrder {
  id: string;
  retailAmountCents: number;
  vendorPayoutCents: number;
  platformFeeCents: number;
  recipientRegion: string;
  shippingName: string;
  shippingAddressLine1: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  trackingCarrier: string;
  trackingNumber: string;
  fulfillmentStatus: string;
  createdAt: string;
  product?: {
    id: string;
    title: string;
    category: string;
  } | null;
  giftSend: {
    recipientName: string;
    recipientEmail: string;
    company: { name: string; brandColor: string };
    campaign: { title: string; occasion: string };
  };
}

interface VendorDashboardData {
  vendor: {
    id: string;
    businessName: string;
    taxId: string;
    status: string;
    hqCountry: string;
    supportedRegions: string;
    commissionRateBps: number;
    slaDays: number;
    payoutBalanceCents: number;
    rating: number;
    products: VendorProduct[];
    giftOrders: VendorOrder[];
  };
  metrics: {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingFulfillmentCount: number;
    shippedOrDeliveredCount: number;
    grossSalesCents: number;
    netEarnedCents: number;
    payoutBalanceCents: number;
  };
}

export default function VendorPortalPage() {
  const [data, setData] = useState<VendorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "catalog" | "settings">("orders");
  const [banner, setBanner] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Order shipping inputs keyed by orderId
  const [carrierInputs, setCarrierInputs] = useState<Record<string, string>>({});
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  // New SKU state
  const [skuTitle, setSkuTitle] = useState("");
  const [skuCategory, setSkuCategory] = useState("Tech");
  const [skuPriceDollars, setSkuPriceDollars] = useState(50);
  const [skuStock, setSkuStock] = useState(40);
  const [skuDescription, setSkuDescription] = useState("");
  const [skuRegions, setSkuRegions] = useState<RegionCode[]>(["NA", "EMEA"]);

  // Regional Settings state
  const [profileRegions, setProfileRegions] = useState<RegionCode[]>(["NA"]);
  const [profileHq, setProfileHq] = useState("US");
  const [profileSla, setProfileSla] = useState(3);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/vendor/dashboard");
      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        setData(null);
      } else {
        const json = await res.json();
        if (res.ok) {
          setUnauthorized(false);
          setData(json);
          const parsed = parseRegions(json.vendor.supportedRegions);
          setProfileRegions(parsed);
          setSkuRegions(parsed);
          setProfileHq(json.vendor.hqCountry);
          setProfileSla(json.vendor.slaDays);
        } else {
          setErrorMsg(json.error || "Failed to load vendor dashboard.");
        }
      }
    } catch {
      setErrorMsg("Network error loading vendor portal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function quickSignInVendor(email: string) {
    await fetch("/api/auth/demo-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    await loadDashboard();
  }

  async function handleOrderFulfill(
    orderId: string,
    fulfillmentStatus: "PROCESSING" | "SHIPPED" | "DELIVERED"
  ) {
    setErrorMsg("");
    setBanner("");
    const trackingCarrier = carrierInputs[orderId] || "DHL Global Express";
    const trackingNumber =
      trackingInputs[orderId] || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const res = await fetch(`/api/vendor/orders/${orderId}/fulfill`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fulfillmentStatus,
        trackingCarrier: fulfillmentStatus === "SHIPPED" ? trackingCarrier : undefined,
        trackingNumber: fulfillmentStatus === "SHIPPED" ? trackingNumber : undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Could not update order.");
    } else {
      setBanner(`Order updated to ${fulfillmentStatus}. Recipient tracking updated automatically.`);
      await loadDashboard();
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setBanner("");
    const priceCents = Math.round(Number(skuPriceDollars) * 100);
    const res = await fetch("/api/vendor/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: skuTitle,
        description: skuDescription,
        category: skuCategory,
        priceCents,
        wholesaleCostCents: Math.round(priceCents * 0.75),
        stockQuantity: Number(skuStock),
        supportedRegions: skuRegions,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Failed to publish product.");
    } else {
      setSkuTitle("");
      setSkuDescription("");
      setBanner(`Published "${json.product.title}" to regional catalog (${json.product.supportedRegions}).`);
      await loadDashboard();
    }
  }

  async function handleAdjustStock(productId: string, newStock: number, active: boolean) {
    await fetch(`/api/vendor/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockQuantity: newStock, active }),
    });
    await loadDashboard();
  }

  async function handleSaveRegionalProfile(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setBanner("");
    const res = await fetch("/api/vendor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hqCountry: profileHq,
        supportedRegions: profileRegions,
        slaDays: Number(profileSla),
      }),
    });
    if (res.ok) {
      setBanner("Updated regional fulfillment coverage and shipping SLA.");
      await loadDashboard();
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-500">
        Loading Regional Vendor Portal...
      </div>
    );
  }

  if (unauthorized || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Regional Gift Vendor Portal
          </h1>
          <p className="mt-2 text-xs text-slate-600">
            Select a seeded regional supplier below for instant 1-click access, or enroll a new vendor partner.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              {
                name: "Apex Tech & Audio Co.",
                regions: "NA, EMEA",
                email: "partner@apextech.io",
              },
              {
                name: "Nordic Botanicals & Home",
                regions: "EMEA, NA",
                email: "oliver@nordichome.eu",
              },
              {
                name: "Kyoto Artisan & Roasters",
                regions: "APAC, NA",
                email: "kenji@kyotoroasters.jp",
              },
              {
                name: "Andes Verde Gourmet & Craft",
                regions: "LATAM, NA",
                email: "sofia@andesverde.br",
              },
            ].map((v) => (
              <button
                key={v.email}
                onClick={() => quickSignInVendor(v.email)}
                className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-left transition hover:bg-emerald-100/70"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{v.name}</div>
                  <div className="text-[11px] text-emerald-700">Regions: {v.regions}</div>
                </div>
                <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                  Enter →
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <Link
              href="/auth/vendor"
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Or register a new Regional Gift Vendor Partner account →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { vendor, metrics } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
              VENDOR PARTNER
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                vendor.status === "APPROVED"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              Status: {vendor.status}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              HQ: {vendor.hqCountry} • SLA: {vendor.slaDays}d
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
            {vendor.businessName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            <span>Active Fulfillment Territories:</span>
            {parseRegions(vendor.supportedRegions).map((r) => (
              <span
                key={r}
                className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Switch between regional vendors right inside the header */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadDashboard()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {banner && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          {banner}
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Available Payout Balance</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.payoutBalanceCents)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Net after {vendor.commissionRateBps / 100}% platform marketplace fee
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Pending Fulfillment Queue</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.pendingFulfillmentCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Target dispatch SLA: {vendor.slaDays} business days
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Shipped / Delivered Orders</span>
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.shippedOrDeliveredCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Gross retail volume: {formatCurrency(metrics.grossSalesCents)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Active Regional SKUs</span>
            <Package className="h-4 w-4 text-violet-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.activeProducts} / {metrics.totalProducts}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Regions: {vendor.supportedRegions}
          </div>
        </div>
      </div>

      {/* Segmented Workspace Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          {
            id: "orders",
            label: `Fulfillment Orders (${vendor.giftOrders.length})`,
            icon: Truck,
          },
          {
            id: "catalog",
            label: `Regional Product Catalog (${vendor.products.length})`,
            icon: Package,
          },
          {
            id: "settings",
            label: "Territory Coverage & SLA",
            icon: Sliders,
          },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as "orders" | "catalog" | "settings")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                active
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Fulfillment Queue */}
      {activeTab === "orders" && (
        <div className="mt-6 space-y-4">
          {vendor.giftOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No claimed gift orders routed to this vendor yet. Claim a gift in{" "}
              <Link href="/claim/snappy_demo_na_100" className="font-bold text-indigo-600 underline">
                the live recipient experience
              </Link>{" "}
              to see it appear here immediately!
            </div>
          ) : (
            vendor.giftOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                        Region: {order.recipientRegion}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          order.fulfillmentStatus === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800"
                            : order.fulfillmentStatus === "SHIPPED"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {order.fulfillmentStatus}
                      </span>
                      <span className="text-xs text-slate-500">
                        From <strong>{order.giftSend.company.name}</strong> (
                        {order.giftSend.campaign.occasion})
                      </span>
                    </div>

                    <h3 className="mt-2 text-base font-bold text-slate-900">
                      {order.product?.title || "Physical Gift Item"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      <strong>Ship To:</strong> {order.shippingName} — {order.shippingAddressLine1},{" "}
                      {order.shippingCity}, {order.shippingState} {order.shippingPostalCode},{" "}
                      {order.shippingCountry}
                    </p>
                    {order.trackingNumber && (
                      <p className="mt-1 text-xs font-medium text-indigo-700">
                        Carrier: {order.trackingCarrier} • Tracking #:{" "}
                        <code className="font-mono font-bold">{order.trackingNumber}</code>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="text-right text-xs">
                      <span className="text-slate-500">Retail: </span>
                      <strong className="text-slate-900">
                        {formatCurrency(order.retailAmountCents)}
                      </strong>
                      <span className="mx-1.5 text-slate-300">|</span>
                      <span className="text-emerald-700 font-bold">
                        Net Payout: {formatCurrency(order.vendorPayoutCents)}
                      </span>
                    </div>

                    {order.fulfillmentStatus !== "DELIVERED" && (
                      <div className="flex flex-wrap items-center gap-2">
                        {order.fulfillmentStatus === "PENDING_VENDOR" && (
                          <button
                            onClick={() => handleOrderFulfill(order.id, "PROCESSING")}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Acknowledge & Process
                          </button>
                        )}

                        {(order.fulfillmentStatus === "PENDING_VENDOR" ||
                          order.fulfillmentStatus === "PROCESSING") && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Carrier (e.g. FedEx / DHL)"
                              value={carrierInputs[order.id] ?? "DHL Express"}
                              onChange={(e) =>
                                setCarrierInputs((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              className="w-36 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Tracking Number"
                              value={trackingInputs[order.id] ?? `DHL-${order.recipientRegion}-884920`}
                              onChange={(e) =>
                                setTrackingInputs((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs"
                            />
                            <button
                              onClick={() => handleOrderFulfill(order.id, "SHIPPED")}
                              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              Mark Shipped
                            </button>
                          </div>
                        )}

                        {order.fulfillmentStatus === "SHIPPED" && (
                          <button
                            onClick={() => handleOrderFulfill(order.id, "DELIVERED")}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirm Delivered
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Regional Product Catalog */}
      {activeTab === "catalog" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          {/* Publish New SKU Form */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateProduct}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Plus className="h-4 w-4 text-emerald-600" />
                <span>Publish New Regional Gift SKU</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={skuTitle}
                  onChange={(e) => setSkuTitle(e.target.value)}
                  placeholder="Artisan Pour-Over Coffee Kettle"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Category
                  </label>
                  <select
                    value={skuCategory}
                    onChange={(e) => setSkuCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    required
                    value={skuPriceDollars}
                    onChange={(e) => setSkuPriceDollars(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={skuStock}
                    onChange={(e) => setSkuStock(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Supported Shipping Regions
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {REGIONS.map((r) => {
                    const checked = skuRegions.includes(r.code);
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() =>
                          setSkuRegions((prev) =>
                            prev.includes(r.code)
                              ? prev.filter((x) => x !== r.code)
                              : [...prev, r.code]
                          )
                        }
                        className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                          checked
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {r.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Product Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={skuDescription}
                  onChange={(e) => setSkuDescription(e.target.value)}
                  placeholder="Describe the craftsmanship, contents, and regional shipping details..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add SKU to Snappy Marketplace</span>
              </button>
            </form>
          </div>

          {/* Existing SKU Cards */}
          <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
            {vendor.products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
              >
                <div>
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-36 w-full object-cover"
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {product.category}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatCurrency(product.priceCents)}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                      {product.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {product.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      {parseRegions(product.supportedRegions).map((r) => (
                        <span
                          key={r}
                          className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs">
                  <span className="font-semibold text-slate-700">
                    Stock: <strong>{product.stockQuantity}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        handleAdjustStock(
                          product.id,
                          product.stockQuantity + 10,
                          product.active
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      +10 Stock
                    </button>
                    <button
                      onClick={() =>
                        handleAdjustStock(
                          product.id,
                          product.stockQuantity,
                          !product.active
                        )
                      }
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        product.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {product.active ? "Active" : "Paused"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Regional Settings */}
      {activeTab === "settings" && (
        <div className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900">
            Regional Warehouse & Territory Configuration
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Control which global regions (`NA`, `EMEA`, `APAC`, `LATAM`) your warehouse network serves.
          </p>

          <form onSubmit={handleSaveRegionalProfile} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Primary Dispatch Country ISO
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={profileHq}
                  onChange={(e) => setProfileHq(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Committed SLA (Business Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={profileSla}
                  onChange={(e) => setProfileSla(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Supported Fulfillment Territories
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {REGIONS.map((r) => {
                  const checked = profileRegions.includes(r.code);
                  return (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() =>
                        setProfileRegions((prev) =>
                          prev.includes(r.code)
                            ? prev.filter((x) => x !== r.code)
                            : [...prev, r.code]
                        )
                      }
                      className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs transition ${
                        checked
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <div>
                        <div className="font-bold">{r.label}</div>
                        <div className="text-[11px] opacity-80">{r.countries}</div>
                      </div>
                      <Globe className="h-4 w-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Save Territory Configuration
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
