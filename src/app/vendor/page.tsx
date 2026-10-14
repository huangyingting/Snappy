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
  Sparkles,
  Copy,
  Edit3,
  Archive,
  Layers,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import {
  REGIONS,
  PRODUCT_CATEGORIES,
  formatCurrency,
  parseRegions,
  type RegionCode,
} from "@/lib/constants";
import {
  LogisticsTimeline,
  type ShipmentCheckpointItem,
} from "@/components/LogisticsTimeline";

interface GiftCategoryItem {
  id: string;
  slug: string;
  name: string;
  headline: string;
  accentColor: string;
}

interface VendorProduct {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: string;
  categoryId?: string | null;
  merchandisingBadge: string;
  tagsJson: string;
  variantsJson: string;
  specificationsJson: string;
  priceCents: number;
  wholesaleCostCents: number;
  imageUrl: string;
  stockQuantity: number;
  supportedRegions: string;
  isFeatured: boolean;
  status: string;
  active: boolean;
  giftCategory?: GiftCategoryItem | null;
}

interface VendorOrder {
  id: string;
  retailAmountCents: number;
  vendorPayoutCents: number;
  platformFeeCents: number;
  recipientRegion: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  deliveryInstructions: string;
  selectedVariant: string;
  trackingCarrier: string;
  trackingNumber: string;
  trackingUrl: string;
  serviceLevel: string;
  fulfillmentWarehouse: string;
  packageWeightGrams: number;
  estimatedDeliveryAt: string | null;
  addressLocked: boolean;
  exceptionNote: string;
  swapCount: number;
  fulfillmentStatus: string;
  createdAt: string;
  shipmentEvents: ShipmentCheckpointItem[];
  product?: {
    id: string;
    sku: string;
    title: string;
    category: string;
    imageUrl: string;
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
  giftCategories: GiftCategoryItem[];
  metrics: {
    totalProducts: number;
    activeProducts: number;
    lowStockProductsCount: number;
    totalOrders: number;
    pendingFulfillmentCount: number;
    shippedOrDeliveredCount: number;
    exceptionOrdersCount: number;
    grossSalesCents: number;
    netEarnedCents: number;
    payoutBalanceCents: number;
  };
}

const STUDIO_GALLERY_PRESETS = [
  { label: "ANC Studio Headphones", url: "/images/gifts/apex-anc-headphones.png" },
  { label: "Walnut MagSafe Valet", url: "/images/gifts/apex-magsafe-valet.png" },
  { label: "CNC Mechanical Keyboard", url: "/images/gifts/apex-mechanical-keyboard.png" },
  { label: "Smart Temp Ceramic Mug", url: "/images/gifts/apex-smart-mug.png" },
  { label: "Nordic Merino Throw", url: "/images/gifts/nordic-merino-throw.png" },
  { label: "Architectural Espresso Bar", url: "/images/gifts/nordic-espresso-bar.png" },
  { label: "Stoneware Oil Diffuser", url: "/images/gifts/nordic-aroma-diffuser.png" },
  { label: "Brass & Opal Table Lamp", url: "/images/gifts/nordic-sculptural-lamp.png" },
  { label: "Kyoto Gooseneck Kettle", url: "/images/gifts/kyoto-pourover-kettle.png" },
  { label: "Uji Ceremonial Matcha", url: "/images/gifts/kyoto-matcha-set.png" },
  { label: "Anodized Titanium Tumbler", url: "/images/gifts/kyoto-titanium-tumbler.png" },
  { label: "Leather Weekender Duffel", url: "/images/gifts/andes-weekender-duffel.png" },
  { label: "Cacao & Coffee Box", url: "/images/gifts/andes-cacao-tasting-box.png" },
  { label: "Baby Alpaca Travel Set", url: "/images/gifts/andes-alpaca-travel-set.png" },
  { label: "Botanical Apothecary Box", url: "/images/gifts/pacifica-botanical-spa.png" },
  { label: "Ocean-Canvas Solar Pack", url: "/images/gifts/pacifica-solar-pack.png" },
];

export default function VendorPortalPage() {
  const [data, setData] = useState<VendorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "orders" | "settings">("catalog");
  const [banner, setBanner] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Catalog filters
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>("ALL");
  const [catalogSearch, setCatalogSearch] = useState<string>("");

  // Order shipping inputs keyed by orderId
  const [carrierInputs, setCarrierInputs] = useState<Record<string, string>>({});
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [serviceInputs, setServiceInputs] = useState<Record<string, string>>({});
  const [warehouseInputs] = useState<Record<string, string>>({});
  const [checkpointTitleInputs, setCheckpointTitleInputs] = useState<Record<string, string>>({});
  const [checkpointLocationInputs, setCheckpointLocationInputs] = useState<Record<string, string>>(
    {}
  );

  // SKU Studio Form (supports Create & Edit)
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [skuCode, setSkuCode] = useState("");
  const [skuTitle, setSkuTitle] = useState("");
  const [skuCategory, setSkuCategory] = useState("Tech");
  const [skuBadge, setSkuBadge] = useState("Artisan Crafted");
  const [skuPriceDollars, setSkuPriceDollars] = useState(85);
  const [skuWholesaleDollars, setSkuWholesaleDollars] = useState(62);
  const [skuStock, setSkuStock] = useState(40);
  const [skuDescription, setSkuDescription] = useState("");
  const [skuImageUrl, setSkuImageUrl] = useState("/images/gifts/apex-magsafe-valet.png");
  const [skuTagsText, setSkuTagsText] = useState("Sustainable, Studio Edition, Fast Dispatch");
  const [skuVariantName, setSkuVariantName] = useState("Finish / Colorway");
  const [skuVariantOptions, setSkuVariantOptions] = useState(
    "Obsidian Matte, Warm Travertine, Brushed Brass"
  );
  const [skuOriginCountry, setSkuOriginCountry] = useState("US");
  const [skuWeightGrams, setSkuWeightGrams] = useState(780);
  const [skuRegions, setSkuRegions] = useState<RegionCode[]>(["NA", "EMEA"]);
  const [generatingAiImage, setGeneratingAiImage] = useState(false);

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
          setSkuOriginCountry(json.vendor.hqCountry);
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

  function loadProductIntoEditor(product: VendorProduct) {
    setEditingProductId(product.id);
    setSkuCode(product.sku || "");
    setSkuTitle(product.title);
    setSkuCategory(product.category);
    setSkuBadge(product.merchandisingBadge || "Editor's Pick");
    setSkuPriceDollars(Math.round(product.priceCents / 100));
    setSkuWholesaleDollars(Math.round(product.wholesaleCostCents / 100));
    setSkuStock(product.stockQuantity);
    setSkuDescription(product.description);
    setSkuImageUrl(product.imageUrl);
    setSkuRegions(parseRegions(product.supportedRegions));

    try {
      const tags = JSON.parse(product.tagsJson || "[]");
      if (Array.isArray(tags)) setSkuTagsText(tags.join(", "));
    } catch {
      setSkuTagsText("");
    }

    try {
      const variants = JSON.parse(product.variantsJson || "[]");
      if (Array.isArray(variants) && variants[0]) {
        setSkuVariantName(variants[0].name || "Finish");
        setSkuVariantOptions(
          Array.isArray(variants[0].options) ? variants[0].options.join(", ") : ""
        );
      }
    } catch {
      // ignore
    }

    try {
      const specs = JSON.parse(product.specificationsJson || "{}");
      if (specs.originCountry) setSkuOriginCountry(String(specs.originCountry));
      if (specs.weightGrams) setSkuWeightGrams(Number(specs.weightGrams));
    } catch {
      // ignore
    }

    setBanner(`Loaded "${product.title}" into Atelier SKU Editor.`);
  }

  function resetEditor() {
    setEditingProductId(null);
    setSkuCode("");
    setSkuTitle("");
    setSkuDescription("");
    setSkuBadge("Artisan Crafted");
    setSkuPriceDollars(85);
    setSkuWholesaleDollars(62);
    setSkuStock(40);
  }

  async function handleGenerateAiStudioImage() {
    if (!skuTitle.trim()) {
      setErrorMsg("Enter a Product Title first so MAI-Image can compose your studio shot.");
      return;
    }
    setGeneratingAiImage(true);
    setErrorMsg("");
    setBanner("");
    try {
      const res = await fetch("/api/ai/generate-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: skuTitle,
          category: skuCategory,
          description: skuDescription,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Could not generate AI studio image.");
      } else {
        setSkuImageUrl(json.imageUrl);
        setBanner(
          `✨ Generated studio product photograph via Azure ${json.model} (${json.imageUrl}).`
        );
      }
    } catch {
      setErrorMsg("Network error while calling AI studio image generator.");
    } finally {
      setGeneratingAiImage(false);
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setBanner("");
    const priceCents = Math.round(Number(skuPriceDollars) * 100);
    const wholesaleCostCents = Math.round(Number(skuWholesaleDollars) * 100);
    const tags = skuTagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const variantOptions = skuVariantOptions
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    const variants =
      skuVariantName.trim() && variantOptions.length > 0
        ? [{ name: skuVariantName.trim(), options: variantOptions }]
        : [];
    const specifications = {
      originCountry: skuOriginCountry.trim() || "US",
      weightGrams: Number(skuWeightGrams) || 650,
      leadTimeDays: profileSla,
    };

    if (editingProductId) {
      const res = await fetch(`/api/vendor/products/${editingProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: skuCode || undefined,
          title: skuTitle,
          description: skuDescription,
          category: skuCategory,
          merchandisingBadge: skuBadge,
          tags,
          variants,
          specifications,
          priceCents,
          wholesaleCostCents,
          imageUrl: skuImageUrl,
          stockQuantity: Number(skuStock),
          supportedRegions: skuRegions,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Failed to update SKU.");
      } else {
        setBanner(`Updated SKU "${json.product.title}" (${json.product.sku}).`);
        resetEditor();
        await loadDashboard();
      }
      return;
    }

    const res = await fetch("/api/vendor/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: skuCode || undefined,
        title: skuTitle,
        description: skuDescription,
        category: skuCategory,
        merchandisingBadge: skuBadge,
        tags,
        variants,
        specifications,
        priceCents,
        wholesaleCostCents,
        imageUrl: skuImageUrl,
        stockQuantity: Number(skuStock),
        supportedRegions: skuRegions,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Failed to publish product.");
    } else {
      resetEditor();
      setBanner(
        `Published "${json.product.title}" (${json.product.sku}) to regional catalog (${json.product.supportedRegions}).`
      );
      await loadDashboard();
    }
  }

  async function handleCloneProduct(productId: string) {
    setErrorMsg("");
    setBanner("");
    const res = await fetch(`/api/vendor/products/${productId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clone" }),
    });
    const json = await res.json();
    if (res.ok) {
      setBanner(`Cloned SKU "${json.product.title}" (${json.product.sku}).`);
      await loadDashboard();
    } else {
      setErrorMsg(json.error || "Failed to clone product.");
    }
  }

  async function handleArchiveProduct(productId: string) {
    setErrorMsg("");
    setBanner("");
    const res = await fetch(`/api/vendor/products/${productId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setBanner("Product archived / removed from active marketplace.");
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

  async function handleOrderFulfill(
    orderId: string,
    fulfillmentStatus:
      | "PROCESSING"
      | "SHIPPED"
      | "OUT_FOR_DELIVERY"
      | "DELIVERED"
      | "EXCEPTION",
    defaultRegion = "NA"
  ) {
    setErrorMsg("");
    setBanner("");
    const trackingCarrier = carrierInputs[orderId] || "DHL Global Express";
    const trackingNumber =
      trackingInputs[orderId] ||
      `DHL-${defaultRegion}-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const serviceLevel = serviceInputs[orderId] || "Express Priority Carbon-Neutral";
    const fulfillmentWarehouse = warehouseInputs[orderId];

    const res = await fetch(`/api/vendor/orders/${orderId}/fulfill`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fulfillmentStatus,
        trackingCarrier: fulfillmentStatus === "SHIPPED" ? trackingCarrier : undefined,
        trackingNumber: fulfillmentStatus === "SHIPPED" ? trackingNumber : undefined,
        serviceLevel,
        fulfillmentWarehouse,
        exceptionNote:
          fulfillmentStatus === "EXCEPTION"
            ? "Temporary customs / weather hold at regional hub; courier re-routing."
            : undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error || "Could not update order.");
    } else {
      setBanner(
        `Order advanced to ${fulfillmentStatus}. Carrier checkpoint appended and recipient notified.`
      );
      await loadDashboard();
    }
  }

  async function handleAppendCheckpoint(orderId: string) {
    const title = checkpointTitleInputs[orderId]?.trim();
    const location = checkpointLocationInputs[orderId]?.trim();
    if (!title) {
      setErrorMsg("Enter a scan checkpoint title before logging.");
      return;
    }
    setErrorMsg("");
    const res = await fetch(`/api/vendor/orders/${orderId}/fulfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: "IN_TRANSIT_HUB",
        title,
        location: location || "Regional Sortation Hub",
        description: "Live carrier scan logged via Vendor Logistics Console.",
      }),
    });
    if (res.ok) {
      setCheckpointTitleInputs((prev) => ({ ...prev, [orderId]: "" }));
      setCheckpointLocationInputs((prev) => ({ ...prev, [orderId]: "" }));
      setBanner("Logged live carrier transit checkpoint.");
      await loadDashboard();
    }
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
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-stone-500">
        Loading Atelier Vendor Catalog & Logistics Studio...
      </div>
    );
  }

  if (unauthorized || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="atelier-card rounded-3xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F5338] text-white">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-[#141210]">
            Vendor Catalog & Carrier Logistics Portal
          </h1>
          <p className="mt-2 text-xs text-stone-600">
            Select a seeded regional supplier below for instant 1-click access, or enroll a new vendor partner.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              {
                name: "Apex Tech & Audio Co.",
                regions: "NA, EMEA, APAC",
                email: "partner@apextech.io",
              },
              {
                name: "Nordic Botanicals & Home",
                regions: "EMEA, NA, APAC",
                email: "oliver@nordichome.eu",
              },
              {
                name: "Kyoto Artisan & Roasters",
                regions: "APAC, NA, EMEA",
                email: "kenji@kyotoroasters.jp",
              },
              {
                name: "Andes Verde Gourmet & Craft",
                regions: "LATAM, NA, EMEA",
                email: "sofia@andesverde.br",
              },
            ].map((v) => (
              <button
                key={v.email}
                onClick={() => quickSignInVendor(v.email)}
                className="flex items-center justify-between rounded-2xl border border-[#141210]/12 bg-[#FAF8F5] p-4 text-left transition hover:border-[#0F5338] hover:bg-white"
              >
                <div>
                  <div className="text-xs font-bold text-[#141210]">{v.name}</div>
                  <div className="font-mono-code text-[11px] text-[#0F5338]">
                    Regions: {v.regions}
                  </div>
                </div>
                <span className="rounded-full bg-[#0F5338] px-3 py-1 text-[11px] font-semibold text-white">
                  Enter →
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 border-t border-[#141210]/10 pt-4">
            <Link
              href="/auth/vendor"
              className="text-xs font-semibold text-[#0F5338] hover:underline"
            >
              Or register a new Regional Gift Vendor Partner account →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { vendor, metrics } = data;

  const filteredProducts = vendor.products.filter((p) => {
    const matchesCat =
      catalogCategoryFilter === "ALL" || p.category === catalogCategoryFilter;
    const matchesSearch =
      !catalogSearch.trim() ||
      p.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(catalogSearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="atelier-card flex flex-col justify-between gap-4 rounded-3xl p-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#0F5338] px-3 py-0.5 font-mono-code text-[11px] font-bold text-white">
              ATELIER VENDOR STUDIO
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                vendor.status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {vendor.status}
            </span>
            <span className="rounded-full bg-[#F3EFE6] px-2.5 py-0.5 font-mono-code text-xs font-semibold text-[#141210]">
              HQ: {vendor.hqCountry} • SLA: {vendor.slaDays}d
            </span>
          </div>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[#141210]">
            {vendor.businessName}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
            <span>Active Fulfillment Hubs:</span>
            {parseRegions(vendor.supportedRegions).map((r) => (
              <span
                key={r}
                className="rounded-md bg-[#141210] px-2 py-0.5 font-mono-code text-[10px] font-bold text-[#F3D9A4]"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Apex (NA)", email: "partner@apextech.io" },
            { label: "Nordic (EMEA)", email: "oliver@nordichome.eu" },
            { label: "Kyoto (APAC)", email: "kenji@kyotoroasters.jp" },
            { label: "Andes (LATAM)", email: "sofia@andesverde.br" },
          ].map((v) => (
            <button
              key={v.email}
              onClick={() => quickSignInVendor(v.email)}
              className="rounded-full border border-[#141210]/12 bg-[#FAF8F5] px-3 py-1.5 text-xs font-semibold text-[#141210] hover:bg-stone-200/70"
            >
              {v.label}
            </button>
          ))}
          <button
            onClick={() => loadDashboard()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#141210] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0F5338]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync
          </button>
        </div>
      </div>

      {banner && (
        <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          {banner}
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="atelier-card rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Settled Payout Balance</span>
            <DollarSign className="h-4 w-4 text-[#0F5338]" />
          </div>
          <div className="font-display mt-2 text-2xl font-bold text-[#141210]">
            {formatCurrency(metrics.payoutBalanceCents)}
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            Net after {vendor.commissionRateBps / 100}% marketplace commission
          </div>
        </div>

        <div className="atelier-card rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Active Regional SKUs</span>
            <Layers className="h-4 w-4 text-[#D95D39]" />
          </div>
          <div className="font-display mt-2 text-2xl font-bold text-[#141210]">
            {metrics.activeProducts} / {metrics.totalProducts}
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            {metrics.lowStockProductsCount > 0
              ? `${metrics.lowStockProductsCount} SKU(s) near restock threshold`
              : "All SKUs healthy inventory"}
          </div>
        </div>

        <div className="atelier-card rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Awaiting Atelier Dispatch</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="font-display mt-2 text-2xl font-bold text-[#141210]">
            {metrics.pendingFulfillmentCount}
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            Committed SLA: {vendor.slaDays} business days
          </div>
        </div>

        <div className="atelier-card rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>In-Transit & Delivered</span>
            <Truck className="h-4 w-4 text-[#0F5338]" />
          </div>
          <div className="font-display mt-2 text-2xl font-bold text-[#141210]">
            {metrics.shippedOrDeliveredCount}
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            Gross GMV: {formatCurrency(metrics.grossSalesCents)}
          </div>
        </div>
      </div>

      {/* Segmented Workspace Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#141210]/10 pb-3">
        {[
          {
            id: "catalog",
            label: `Product & Gift Catalog Studio (${vendor.products.length})`,
            icon: Package,
          },
          {
            id: "orders",
            label: `Carrier Logistics & Fulfillment Queue (${vendor.giftOrders.length})`,
            icon: Truck,
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
              onClick={() => setActiveTab(t.id as "catalog" | "orders" | "settings")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                active
                  ? "bg-[#141210] text-white shadow-xs"
                  : "bg-white text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Product & Gift Catalog Studio */}
      {activeTab === "catalog" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          {/* Left Column: Full SKU Merchandising & AI Studio Image Editor */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSaveProduct}
              className="atelier-card space-y-4 rounded-3xl p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-[#141210]">
                  <Sparkles className="h-4 w-4 text-[#D95D39]" />
                  <span>
                    {editingProductId
                      ? "Edit SKU & Merchandising"
                      : "Publish New Regional Gift SKU"}
                  </span>
                </div>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetEditor}
                    className="rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-300"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={skuTitle}
                    onChange={(e) => setSkuTitle(e.target.value)}
                    placeholder="Hand-Hammered Copper Pour-Over Set"
                    className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2 text-sm focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={skuCode}
                    onChange={(e) => setSkuCode(e.target.value.toUpperCase())}
                    placeholder="Auto-SKU"
                    className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2 font-mono-code text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Gift Category Taxonomy
                  </label>
                  <select
                    value={skuCategory}
                    onChange={(e) => setSkuCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-2.5 py-2 text-xs font-semibold"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Merchandising Badge
                  </label>
                  <input
                    type="text"
                    value={skuBadge}
                    onChange={(e) => setSkuBadge(e.target.value)}
                    placeholder="Editor's Pick / Bestseller"
                    className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Retail Price ($) *
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    required
                    value={skuPriceDollars}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSkuPriceDollars(val);
                      setSkuWholesaleDollars(Math.round(val * 0.74));
                    }}
                    className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Wholesale ($)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    value={skuWholesaleDollars}
                    onChange={(e) => setSkuWholesaleDollars(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Stock Units *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={skuStock}
                    onChange={(e) => setSkuStock(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Variants & Tags */}
              <div className="rounded-2xl border border-[#141210]/10 bg-[#FAF8F5] p-3.5 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Recipient Choice Variants & Dietary/Feature Tags
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600">
                      Option Group
                    </label>
                    <input
                      type="text"
                      value={skuVariantName}
                      onChange={(e) => setSkuVariantName(e.target.value)}
                      placeholder="Colorway / Size"
                      className="mt-1 w-full rounded-lg border border-[#141210]/15 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-stone-600">
                      Choices (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={skuVariantOptions}
                      onChange={(e) => setSkuVariantOptions(e.target.value)}
                      placeholder="Obsidian Matte, Brushed Brass, Warm Ivory"
                      className="mt-1 w-full rounded-lg border border-[#141210]/15 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-stone-600">
                      Merchandising Tags
                    </label>
                    <input
                      type="text"
                      value={skuTagsText}
                      onChange={(e) => setSkuTagsText(e.target.value)}
                      placeholder="Carbon Neutral, Artisan Made, Organic"
                      className="mt-1 w-full rounded-lg border border-[#141210]/15 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600">
                      Weight (grams)
                    </label>
                    <input
                      type="number"
                      value={skuWeightGrams}
                      onChange={(e) => setSkuWeightGrams(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-[#141210]/15 bg-white px-2.5 py-1.5 font-mono-code text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* AI Studio Image Generator + Preset Picker */}
              <div className="rounded-2xl border border-[#D95D39]/25 bg-[#FAF8F5] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#B84322]">
                    AI Studio Photography (MAI-Image)
                  </span>
                  <button
                    type="button"
                    disabled={generatingAiImage}
                    onClick={handleGenerateAiStudioImage}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#D95D39] px-3 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-[#141210] disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>
                      {generatingAiImage
                        ? "Rendering Studio Photo..."
                        : "Generate AI Studio Photo"}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={skuImageUrl}
                    alt="SKU Preview"
                    className="h-16 w-16 rounded-xl object-cover border border-[#141210]/15 bg-white shrink-0"
                  />
                  <div className="flex-1 space-y-1.5">
                    <select
                      value={skuImageUrl}
                      onChange={(e) => setSkuImageUrl(e.target.value)}
                      className="w-full rounded-lg border border-[#141210]/15 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {STUDIO_GALLERY_PRESETS.map((preset) => (
                        <option key={preset.url} value={preset.url}>
                          Studio Preset: {preset.label}
                        </option>
                      ))}
                      {!STUDIO_GALLERY_PRESETS.some((p) => p.url === skuImageUrl) && (
                        <option value={skuImageUrl}>Custom AI Studio Shot ({skuImageUrl})</option>
                      )}
                    </select>
                    <input
                      type="text"
                      value={skuImageUrl}
                      onChange={(e) => setSkuImageUrl(e.target.value)}
                      placeholder="/images/gifts/..."
                      className="w-full rounded-lg border border-[#141210]/15 bg-white px-2.5 py-1 font-mono-code text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Supported Shipping Territories
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
                        className={`rounded-xl border py-1.5 font-mono-code text-xs font-bold transition ${
                          checked
                            ? "border-[#0F5338] bg-[#0F5338] text-white"
                            : "border-[#141210]/15 bg-[#FAF8F5] text-stone-600"
                        }`}
                      >
                        {r.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Craftsmanship & Storytelling Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={skuDescription}
                  onChange={(e) => setSkuDescription(e.target.value)}
                  placeholder="Describe the materials, provenance, and unboxing experience..."
                  className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#141210] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#0F5338]"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {editingProductId
                    ? "Save SKU Merchandising Updates"
                    : "Publish SKU to Global Marketplace"}
                </span>
              </button>
            </form>
          </div>

          {/* Right Column: Filterable SKU Grid with Variants, Badges, Clone & Archive */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filter Bar */}
            <div className="atelier-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5">
              <div className="flex flex-wrap gap-1.5">
                {["ALL", ...PRODUCT_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCatalogCategoryFilter(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      catalogCategoryFilter === cat
                        ? "bg-[#141210] text-white"
                        : "bg-[#FAF8F5] text-stone-600 hover:bg-stone-200/70"
                    }`}
                  >
                    {cat === "ALL" ? "All Categories" : cat}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search SKU or title..."
                className="rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-1.5 text-xs focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {filteredProducts.map((product) => {
                let parsedTags: string[] = [];
                let parsedVariants: Array<{ name: string; options: string[] }> = [];
                try {
                  parsedTags = JSON.parse(product.tagsJson || "[]");
                } catch {
                  parsedTags = [];
                }
                try {
                  parsedVariants = JSON.parse(product.variantsJson || "[]");
                } catch {
                  parsedVariants = [];
                }

                return (
                  <div
                    key={product.id}
                    className="atelier-card flex flex-col justify-between overflow-hidden rounded-3xl"
                  >
                    <div>
                      <div className="relative h-48 overflow-hidden bg-[#F3EFE6]">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-[#141210]/85 px-2.5 py-0.5 text-[10px] font-bold text-[#F3D9A4]">
                            {product.category}
                          </span>
                          {product.merchandisingBadge && (
                            <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-[#B84322]">
                              {product.merchandisingBadge}
                            </span>
                          )}
                        </div>
                        <div className="absolute right-3 bottom-3 rounded-full bg-white/95 px-3 py-1 font-mono-code text-xs font-extrabold text-[#141210] shadow-xs">
                          {formatCurrency(product.priceCents)}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span className="font-mono-code font-bold text-[#141210]">
                            {product.sku || "SKU-STD"}
                          </span>
                          <span>
                            Wholesale:{" "}
                            <strong className="font-mono-code text-[#0F5338]">
                              {formatCurrency(product.wholesaleCostCents)}
                            </strong>
                          </span>
                        </div>

                        <h3 className="font-display mt-1 text-base font-semibold text-[#141210]">
                          {product.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-stone-600">
                          {product.description}
                        </p>

                        {parsedVariants.length > 0 && (
                          <div className="mt-2.5 rounded-xl bg-[#FAF8F5] px-2.5 py-1.5 text-[11px] text-stone-700">
                            <strong className="text-[#141210]">
                              {parsedVariants[0].name}:
                            </strong>{" "}
                            {parsedVariants[0].options.join(" • ")}
                          </div>
                        )}

                        {parsedTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {parsedTags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-[#F3EFE6] px-2 py-0.5 text-[10px] font-semibold text-stone-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {parseRegions(product.supportedRegions).map((r) => (
                              <span
                                key={r}
                                className="rounded bg-[#0F5338]/10 px-1.5 py-0.5 font-mono-code text-[10px] font-bold text-[#0F5338]"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-stone-700">
                            Stock: <strong className="font-mono-code">{product.stockQuantity}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-[#141210]/8 bg-[#FAF8F5] px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => loadProductIntoEditor(product)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#141210]/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#141210] hover:bg-stone-100"
                        >
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleCloneProduct(product.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#141210]/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#141210] hover:bg-stone-100"
                          title="Duplicate as Atelier Edition"
                        >
                          <Copy className="h-3 w-3" /> Clone
                        </button>
                        <button
                          onClick={() =>
                            handleAdjustStock(
                              product.id,
                              product.stockQuantity + 15,
                              product.active
                            )
                          }
                          className="rounded-lg border border-[#141210]/15 bg-white px-2 py-1 text-[11px] font-semibold text-[#0F5338] hover:bg-emerald-50"
                        >
                          +15
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleAdjustStock(
                              product.id,
                              product.stockQuantity,
                              !product.active
                            )
                          }
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                            product.active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-stone-200 text-stone-600"
                          }`}
                        >
                          {product.active ? "Active" : "Archived"}
                        </button>
                        <button
                          onClick={() => handleArchiveProduct(product.id)}
                          className="rounded-lg p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                          title="Archive / Delete SKU"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Multi-Checkpoint Carrier Logistics & Fulfillment Queue */}
      {activeTab === "orders" && (
        <div className="mt-6 space-y-5">
          {vendor.giftOrders.length === 0 ? (
            <div className="atelier-card rounded-3xl p-8 text-center text-xs text-stone-500">
              No claimed gift orders routed to this vendor yet. Claim a gift in{" "}
              <Link
                href="/claim/snappy_demo_na_100"
                className="font-bold text-[#D95D39] underline"
              >
                the live recipient experience
              </Link>{" "}
              to see it routed here immediately!
            </div>
          ) : (
            vendor.giftOrders.map((order) => (
              <div key={order.id} className="atelier-card rounded-3xl p-6 space-y-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="flex items-start gap-4">
                    {order.product?.imageUrl && (
                      <img
                        src={order.product.imageUrl}
                        alt={order.product.title}
                        className="h-20 w-20 rounded-2xl object-cover border border-[#141210]/10 shrink-0"
                      />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#141210] px-2.5 py-0.5 font-mono-code text-[11px] font-bold text-[#F3D9A4]">
                          {order.recipientRegion} HUB
                        </span>
                        {order.product?.sku && (
                          <span className="font-mono-code text-xs font-bold text-stone-500">
                            {order.product.sku}
                          </span>
                        )}
                        <span className="text-xs text-stone-500">
                          Sender: <strong>{order.giftSend.company.name}</strong> (
                          {order.giftSend.campaign.occasion})
                        </span>
                      </div>

                      <h3 className="font-display mt-1.5 text-xl font-semibold text-[#141210]">
                        {order.product?.title || "Physical Gift Item"}
                      </h3>
                      {order.selectedVariant && (
                        <p className="mt-0.5 text-xs font-semibold text-[#D95D39]">
                          Selected Variant: {order.selectedVariant}
                        </p>
                      )}

                      <div className="mt-2 rounded-2xl bg-[#FAF8F5] p-3 text-xs text-stone-700 border border-[#141210]/8">
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-[#0F5338]" />
                          <strong>Ship To:</strong> {order.shippingName}
                          {order.shippingPhone ? ` (${order.shippingPhone})` : ""} —{" "}
                          {order.shippingAddressLine1}
                          {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""},{" "}
                          {order.shippingCity}, {order.shippingState} {order.shippingPostalCode},{" "}
                          {order.shippingCountry}
                        </div>
                        {order.deliveryInstructions && (
                          <p className="mt-1 text-[11px] text-stone-600">
                            <strong>Courier Drop-Off Note:</strong> &ldquo;
                            {order.deliveryInstructions}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <div className="rounded-2xl bg-[#F3EFE6] px-3.5 py-2 text-xs">
                      <span className="text-stone-600">Retail: </span>
                      <strong className="font-mono-code text-[#141210]">
                        {formatCurrency(order.retailAmountCents)}
                      </strong>
                      <span className="mx-2 text-stone-300">|</span>
                      <span className="font-mono-code font-bold text-[#0F5338]">
                        Vendor Net: {formatCurrency(order.vendorPayoutCents)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Multi-Checkpoint Logistics Timeline */}
                <LogisticsTimeline
                  fulfillmentStatus={order.fulfillmentStatus}
                  trackingCarrier={order.trackingCarrier}
                  trackingNumber={order.trackingNumber}
                  trackingUrl={order.trackingUrl}
                  serviceLevel={order.serviceLevel}
                  fulfillmentWarehouse={order.fulfillmentWarehouse}
                  packageWeightGrams={order.packageWeightGrams}
                  estimatedDeliveryAt={order.estimatedDeliveryAt}
                  addressLocked={order.addressLocked}
                  exceptionNote={order.exceptionNote}
                  swapCount={order.swapCount}
                  selectedVariant={order.selectedVariant}
                  shipmentEvents={order.shipmentEvents}
                />

                {/* Vendor Carrier Dispatch & Checkpoint Action Bar */}
                {order.fulfillmentStatus !== "DELIVERED" && (
                  <div className="rounded-2xl border border-[#141210]/10 bg-white p-4 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      Carrier Manifest & Checkpoint Controls
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {order.fulfillmentStatus === "PENDING_VENDOR" && (
                        <button
                          onClick={() =>
                            handleOrderFulfill(order.id, "PROCESSING", order.recipientRegion)
                          }
                          className="rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3.5 py-2 text-xs font-bold text-[#141210] hover:bg-stone-200/70"
                        >
                          1. Inspect & Pack at Atelier
                        </button>
                      )}

                      {(order.fulfillmentStatus === "PENDING_VENDOR" ||
                        order.fulfillmentStatus === "PROCESSING") && (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            placeholder="Carrier (DHL / FedEx / Yamato)"
                            value={carrierInputs[order.id] ?? "DHL Express"}
                            onChange={(e) =>
                              setCarrierInputs((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            className="w-36 rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Waybill / Tracking #"
                            value={
                              trackingInputs[order.id] ??
                              `DHL-${order.recipientRegion}-884920`
                            }
                            onChange={(e) =>
                              setTrackingInputs((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            className="w-40 rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-1.5 font-mono-code text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Service Level"
                            value={
                              serviceInputs[order.id] ??
                              order.serviceLevel ??
                              "Express Priority (2-Day)"
                            }
                            onChange={(e) =>
                              setServiceInputs((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            className="w-44 rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-1.5 text-xs"
                          />
                          <button
                            onClick={() =>
                              handleOrderFulfill(order.id, "SHIPPED", order.recipientRegion)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#141210] px-4 py-2 text-xs font-bold text-white hover:bg-[#D95D39]"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            Dispatch & Lock Address
                          </button>
                        </div>
                      )}

                      {(order.fulfillmentStatus === "SHIPPED" ||
                        order.fulfillmentStatus === "EXCEPTION") && (
                        <button
                          onClick={() =>
                            handleOrderFulfill(
                              order.id,
                              "OUT_FOR_DELIVERY",
                              order.recipientRegion
                            )
                          }
                          className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
                        >
                          Mark Out for Delivery
                        </button>
                      )}

                      {(order.fulfillmentStatus === "SHIPPED" ||
                        order.fulfillmentStatus === "OUT_FOR_DELIVERY" ||
                        order.fulfillmentStatus === "EXCEPTION") && (
                        <>
                          <button
                            onClick={() =>
                              handleOrderFulfill(order.id, "DELIVERED", order.recipientRegion)
                            }
                            className="inline-flex items-center gap-1 rounded-xl bg-[#0F5338] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirm Delivered
                          </button>
                          <button
                            onClick={() =>
                              handleOrderFulfill(order.id, "EXCEPTION", order.recipientRegion)
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Flag Exception
                          </button>
                        </>
                      )}
                    </div>

                    {/* Append Custom Transit Scan */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-[#141210]/8 pt-3">
                      <input
                        type="text"
                        placeholder="Add custom carrier scan (e.g. Cleared Customs / Arrived at Local Hub)"
                        value={checkpointTitleInputs[order.id] ?? ""}
                        onChange={(e) =>
                          setCheckpointTitleInputs((prev) => ({
                            ...prev,
                            [order.id]: e.target.value,
                          }))
                        }
                        className="flex-1 min-w-[220px] rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="City / Hub Location"
                        value={checkpointLocationInputs[order.id] ?? ""}
                        onChange={(e) =>
                          setCheckpointLocationInputs((prev) => ({
                            ...prev,
                            [order.id]: e.target.value,
                          }))
                        }
                        className="w-40 rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAppendCheckpoint(order.id)}
                        className="rounded-xl border border-[#141210]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#141210] hover:bg-stone-100"
                      >
                        + Log Scan Checkpoint
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Regional Settings */}
      {activeTab === "settings" && (
        <div className="atelier-card mt-6 max-w-2xl rounded-3xl p-6">
          <h3 className="font-display text-xl font-semibold text-[#141210]">
            Regional Warehouse & Territory Configuration
          </h3>
          <p className="mt-1 text-xs text-stone-600">
            Control which global regions (`NA`, `EMEA`, `APAC`, `LATAM`) your warehouse network serves.
          </p>

          <form onSubmit={handleSaveRegionalProfile} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Primary Dispatch Country ISO
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={profileHq}
                  onChange={(e) => setProfileHq(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2 font-mono-code text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Committed SLA (Business Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={profileSla}
                  onChange={(e) => setProfileSla(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">
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
                      className={`flex items-center justify-between rounded-2xl border p-3.5 text-left text-xs transition ${
                        checked
                          ? "border-[#0F5338] bg-[#0F5338]/10 text-[#141210]"
                          : "border-[#141210]/12 bg-white text-stone-600"
                      }`}
                    >
                      <div>
                        <div className="font-bold">{r.label}</div>
                        <div className="text-[11px] opacity-80">{r.countries}</div>
                      </div>
                      <Globe className="h-4 w-4 shrink-0 text-[#0F5338]" />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-[#0F5338] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#141210]"
            >
              Save Territory Configuration
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
