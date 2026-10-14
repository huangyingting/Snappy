"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Package,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Globe,
  KeyRound,
} from "lucide-react";
import { REGIONS, type RegionCode, type RoleCode } from "@/lib/constants";

const ROLE_META: Record<
  string,
  {
    code: RoleCode;
    title: string;
    subtitle: string;
    demoEmail: string;
    demoLabel: string;
    accentClass: string;
  }
> = {
  corporate: {
    code: "CORPORATE",
    title: "Corporate Gifting Workspace",
    subtitle:
      "Enroll your organization, configure recipient address privacy, fund your escrow wallet, and launch global campaigns.",
    demoEmail: "sarah.chen@acmecloud.io",
    demoLabel: "Sarah Chen — Head of People @ Acme Cloud",
    accentClass: "bg-indigo-600 hover:bg-indigo-700",
  },
  vendor: {
    code: "VENDOR",
    title: "Regional Gift Vendor Partner",
    subtitle:
      "Onboard your brand or regional warehouse across NA, EMEA, APAC, or LATAM to fulfill corporate gifts at scale.",
    demoEmail: "partner@apextech.io",
    demoLabel: "Devon Brooks — Apex Tech & Audio (NA/EMEA)",
    accentClass: "bg-emerald-600 hover:bg-emerald-700",
  },
  recipient: {
    code: "RECIPIENT",
    title: "Gift Recipient Portal & Claim Lookup",
    subtitle:
      "Redeem a gift immediately with your Snappy Claim Code, or sign in to track all your gifts and saved shipping details.",
    demoEmail: "alex.rivera@acmecloud.io",
    demoLabel: "Alex Rivera — Staff Engineer (Austin, NA)",
    accentClass: "bg-amber-600 hover:bg-amber-700",
  },
  admin: {
    code: "ADMIN",
    title: "Platform Governance & Operations",
    subtitle:
      "Authorized Snappy operators only. Approve regional vendors, curate global collections, and run expired-gift escrow sweeps.",
    demoEmail: "admin@snappy.com",
    demoLabel: "Claire Admin — VP of Marketplace & Trust",
    accentClass: "bg-slate-900 hover:bg-slate-800",
  },
};

export default function RoleAuthPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const resolved = use(params);
  const roleSlug = resolved.role.toLowerCase();
  const meta = ROLE_META[roleSlug] || ROLE_META.corporate;
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "enroll" | "claim">(
    roleSlug === "recipient" ? "claim" : "enroll"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login state
  const [loginEmail, setLoginEmail] = useState(meta.demoEmail);
  const [loginPassword, setLoginPassword] = useState("SnappyPass123!");

  // Recipient Claim Code state
  const [claimCode, setClaimCode] = useState("SNPY-NA100A");
  const [claimEmail, setClaimEmail] = useState("");

  // Shared enrollment fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("SnappyPass123!");

  // Corporate enrollment fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("Cloud & AI Software");
  const [sizeBand, setSizeBand] = useState("201-1000");
  const [primaryRegion, setPrimaryRegion] = useState<RegionCode>("NA");
  const [brandColor, setBrandColor] = useState("#4F46E5");
  const [hideRecipientAddress, setHideRecipientAddress] = useState(true);
  const [initialDepositDollars, setInitialDepositDollars] = useState(2500);

  // Vendor enrollment fields
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("US-EIN-92-4018291");
  const [hqCountry, setHqCountry] = useState("US");
  const [supportedRegions, setSupportedRegions] = useState<RegionCode[]>(["NA", "EMEA"]);
  const [slaDays, setSlaDays] = useState(3);

  // Recipient enrollment fields
  const [preferredRegion, setPreferredRegion] = useState<RegionCode>("NA");
  const [defaultAddressLine1, setDefaultAddressLine1] = useState("");
  const [defaultCity, setDefaultCity] = useState("");
  const [defaultState, setDefaultState] = useState("");
  const [defaultPostalCode, setDefaultPostalCode] = useState("");
  const [defaultCountry, setDefaultCountry] = useState("US");

  function toggleVendorRegion(code: RegionCode) {
    setSupportedRegions((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]
    );
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          expectedRole: meta.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
      } else {
        router.push(data.redirectTo);
        router.refresh();
      }
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/claim-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimCode, email: claimEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No gift found for that code.");
      } else {
        router.push(data.redirectTo);
      }
    } catch {
      setError("Network error looking up claim code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let endpoint = `/api/auth/enroll/${roleSlug}`;
      let payload: Record<string, unknown> = {};

      if (roleSlug === "corporate") {
        payload = {
          name,
          email,
          password,
          companyName,
          industry,
          sizeBand,
          primaryRegion,
          brandColor,
          hideRecipientAddress,
          initialDepositCents: Math.round(Number(initialDepositDollars) * 100),
        };
      } else if (roleSlug === "vendor") {
        payload = {
          name,
          email,
          password,
          businessName,
          taxId,
          hqCountry,
          supportedRegions,
          slaDays: Number(slaDays),
        };
      } else {
        endpoint = "/api/auth/enroll/recipient";
        payload = {
          name,
          email,
          password,
          preferredRegion,
          defaultAddressLine1,
          defaultCity,
          defaultState,
          defaultPostalCode,
          defaultCountry,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Enrollment failed.");
      } else {
        router.push(data.redirectTo);
        router.refresh();
      }
    } catch {
      setError("Network error during enrollment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Role Selector Tabs */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {[
          { slug: "corporate", label: "1. Corporate Customer", icon: Building2 },
          { slug: "vendor", label: "2. Regional Gift Vendor", icon: Package },
          { slug: "recipient", label: "3. Gift Recipient", icon: Sparkles },
          { slug: "admin", label: "4. Platform Admin", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = roleSlug === tab.slug;
          return (
            <Link
              key={tab.slug}
              href={`/auth/${tab.slug}`}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Role Context & Fast Demo Access */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
              {meta.code} PORTAL
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
              {meta.title}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {meta.subtitle}
            </p>

            {/* Pre-configured Demo Credentials Box */}
            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <KeyRound className="h-4 w-4 text-indigo-600" />
                <span>Seeded Demo Account Ready</span>
              </div>
              <p className="mt-1 text-xs text-indigo-800">{meta.demoLabel}</p>
              <div className="mt-2 rounded-lg bg-white p-2.5 font-mono text-xs text-slate-700 border border-indigo-100">
                <div>Email: {meta.demoEmail}</div>
                <div>Pass: SnappyPass123!</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setLoginEmail(meta.demoEmail);
                  setLoginPassword("SnappyPass123!");
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                <span>Use Demo Credentials in Sign-In Form</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {roleSlug === "vendor" && (
              <div className="mt-4 space-y-1.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs">
                <div className="font-bold text-emerald-900">
                  Other Regional Vendor Accounts:
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setLoginEmail("oliver@nordichome.eu");
                  }}
                  className="block text-left text-emerald-800 hover:underline"
                >
                  • EMEA: oliver@nordichome.eu (Nordic Botanicals)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setLoginEmail("kenji@kyotoroasters.jp");
                  }}
                  className="block text-left text-emerald-800 hover:underline"
                >
                  • APAC: kenji@kyotoroasters.jp (Kyoto Artisan)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setLoginEmail("sofia@andesverde.br");
                  }}
                  className="block text-left text-emerald-800 hover:underline"
                >
                  • LATAM: sofia@andesverde.br (Andes Verde)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Role-Specific Enrollment / Login / Magic Claim Form */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            {/* Mode Switcher */}
            <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
              {roleSlug === "recipient" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("claim");
                    setError("");
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                    mode === "claim"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Magic Claim Code
                </button>
              )}
              {roleSlug !== "admin" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("enroll");
                    setError("");
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                    mode === "enroll"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {roleSlug === "corporate"
                    ? "Enroll Company Workspace"
                    : roleSlug === "vendor"
                    ? "Vendor Partner Onboarding"
                    : "Create Recipient Account"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                  mode === "login" || roleSlug === "admin"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign In to Existing Account
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            {/* 1. Recipient Magic Claim Code Lookup */}
            {mode === "claim" && roleSlug === "recipient" && (
              <form onSubmit={handleClaimCodeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Snappy Gift Claim Code or Token
                  </label>
                  <input
                    type="text"
                    required
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    placeholder="e.g. SNPY-NA100A"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono uppercase focus:border-amber-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Try seeded codes: <code className="font-bold">SNPY-NA100A</code> (NA),{" "}
                    <code className="font-bold">SNPY-EU100B</code> (EMEA),{" "}
                    <code className="font-bold">SNPY-AP50C1</code> (APAC), or{" "}
                    <code className="font-bold">SNPY-LA50D2</code> (LATAM)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Confirm Recipient Email (Optional verification)
                  </label>
                  <input
                    type="email"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    placeholder="Leave blank or enter recipient email"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{loading ? "Verifying Gift..." : "Open Personalized Gift Experience"}</span>
                </button>
              </form>
            )}

            {/* 2. Role-Specific Enrollment Form */}
            {mode === "enroll" && roleSlug !== "admin" && (
              <form onSubmit={handleEnroll} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Lee"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {roleSlug === "corporate" ? "Work Email *" : "Email Address *"}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jordan@company.com"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Corporate-Specific Enrollment Fields */}
                {roleSlug === "corporate" && (
                  <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Corporate Gifting Program Setup
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Stripe / Linear / Horizon AI"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Industry
                        </label>
                        <input
                          type="text"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Headcount Band
                        </label>
                        <select
                          value={sizeBand}
                          onChange={(e) => setSizeBand(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="1-50">1–50 employees</option>
                          <option value="51-200">51–200 employees</option>
                          <option value="201-1000">201–1,000 employees</option>
                          <option value="1001-5000">1,001–5,000 employees</option>
                          <option value="5000+">5,000+ enterprise</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Primary HQ Region
                        </label>
                        <select
                          value={primaryRegion}
                          onChange={(e) => setPrimaryRegion(e.target.value as RegionCode)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          {REGIONS.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.code} — {r.label.split(" ")[0]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Starter Wallet Credit ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={initialDepositDollars}
                          onChange={(e) => setInitialDepositDollars(Number(e.target.value))}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={hideRecipientAddress}
                          onChange={(e) => setHideRecipientAddress(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span>Enable Recipient Home Address Privacy Shield</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">Brand Accent:</span>
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="h-7 w-12 cursor-pointer rounded border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Vendor-Specific Enrollment Fields */}
                {roleSlug === "vendor" && (
                  <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Regional Supplier & Warehouse Configuration
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Legal Business / Brand Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Artisan Roasters GmbH"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Tax / VAT Registration ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Primary HQ Country ISO
                        </label>
                        <input
                          type="text"
                          maxLength={2}
                          value={hqCountry}
                          onChange={(e) => setHqCountry(e.target.value.toUpperCase())}
                          placeholder="US, DE, JP, BR..."
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Dispatch SLA (Business Days)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={14}
                          value={slaDays}
                          onChange={(e) => setSlaDays(Number(e.target.value))}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Supported Fulfillment Regions (Select all territories you ship to) *
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {REGIONS.map((r) => {
                          const checked = supportedRegions.includes(r.code);
                          return (
                            <button
                              key={r.code}
                              type="button"
                              onClick={() => toggleVendorRegion(r.code)}
                              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                checked
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <Globe className="h-3.5 w-3.5" />
                              <span>{r.code}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recipient-Specific Enrollment Fields */}
                {roleSlug === "recipient" && (
                  <div className="space-y-4 rounded-xl border border-amber-100 bg-amber-50/30 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Recipient Delivery Region & Saved Address (Optional)
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Preferred Delivery Region
                        </label>
                        <select
                          value={preferredRegion}
                          onChange={(e) => setPreferredRegion(e.target.value as RegionCode)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          {REGIONS.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Country Code
                        </label>
                        <input
                          type="text"
                          value={defaultCountry}
                          onChange={(e) => setDefaultCountry(e.target.value.toUpperCase())}
                          placeholder="US"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Default Street Address
                      </label>
                      <input
                        type="text"
                        value={defaultAddressLine1}
                        onChange={(e) => setDefaultAddressLine1(e.target.value)}
                        placeholder="123 Main St, Suite 4B"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        value={defaultCity}
                        onChange={(e) => setDefaultCity(e.target.value)}
                        placeholder="City"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={defaultState}
                        onChange={(e) => setDefaultState(e.target.value)}
                        placeholder="State / Province"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={defaultPostalCode}
                        onChange={(e) => setDefaultPostalCode(e.target.value)}
                        placeholder="Postal Code"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${meta.accentClass}`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {loading
                      ? "Provisioning Workspace..."
                      : `Complete ${meta.code} Enrollment`}
                  </span>
                </button>
              </form>
            )}

            {/* 3. Sign In Form */}
            {(mode === "login" || roleSlug === "admin") && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${meta.accentClass}`}
                >
                  <span>{loading ? "Signing In..." : `Sign In to ${meta.code} Workspace`}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
