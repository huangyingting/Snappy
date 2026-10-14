"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Gift,
  Building2,
  Package,
  Sparkles,
  ShieldCheck,
  LogOut,
  Globe,
  UserCheck,
} from "lucide-react";

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: "CORPORATE" | "VENDOR" | "RECIPIENT" | "ADMIN";
  company?: { name: string; brandColor: string } | null;
  vendor?: { businessName: string; supportedRegions: string } | null;
}

const DEMO_PERSONAS = [
  {
    label: "Corporate (Acme Cloud)",
    email: "sarah.chen@acmecloud.io",
    role: "CORPORATE",
    badge: "HR & Gifting",
  },
  {
    label: "Vendor NA/EMEA (Apex Tech)",
    email: "partner@apextech.io",
    role: "VENDOR",
    badge: "NA,EMEA",
  },
  {
    label: "Vendor APAC (Kyoto Artisan)",
    email: "kenji@kyotoroasters.jp",
    role: "VENDOR",
    badge: "APAC,NA",
  },
  {
    label: "Recipient (Alex Rivera)",
    email: "alex.rivera@acmecloud.io",
    role: "RECIPIENT",
    badge: "End User",
  },
  {
    label: "Platform Admin",
    email: "admin@snappy.com",
    role: "ADMIN",
    badge: "Governance",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
        else setUser(null);
      })
      .catch(() => setUser(null));
  }, [pathname]);

  async function handleDemoSwitch(email: string) {
    setSwitching(email);
    try {
      const res = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.redirectTo) {
        setUser(data.user);
        router.push(data.redirectTo);
        router.refresh();
      }
    } finally {
      setSwitching(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#141210]/10 bg-[#FAF8F5]/90 backdrop-blur-xl">
      {/* Top Demo Role Switcher Ribbon */}
      <div className="border-b border-white/10 bg-[#141210] px-4 py-1.5 text-xs text-stone-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C89D54]/40 bg-[#C89D54]/15 px-2.5 py-0.5 font-semibold tracking-wide text-[#F3D9A4]">
              <Globe className="h-3 w-3 text-[#C89D54]" /> ATELIER SANDBOX
            </span>
            <span className="hidden text-stone-400 sm:inline">
              1-click persona switch:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {DEMO_PERSONAS.map((p) => {
              const isActive = user?.email === p.email;
              return (
                <button
                  key={p.email}
                  onClick={() => handleDemoSwitch(p.email)}
                  disabled={switching !== null}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-[#D95D39] text-white shadow-xs"
                      : "bg-white/8 text-stone-300 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="rounded-full bg-black/30 px-1.5 py-0.2 font-mono-code text-[10px] opacity-85">
                    {switching === p.email ? "..." : p.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-7">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#141210] text-[#F3D9A4] shadow-sm transition group-hover:bg-[#D95D39] group-hover:text-white">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-semibold tracking-tight text-[#141210]">
                  Snappy
                </span>
                <span className="rounded-full border border-[#D95D39]/30 bg-[#D95D39]/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#B84322] uppercase">
                  Atelier V2
                </span>
              </div>
              <p className="text-[11px] font-medium text-stone-500">
                Global Gifting & Curated Logistics
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-[#141210]/10 bg-white/80 p-1 shadow-2xs md:flex">
            <Link
              href="/corporate"
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                pathname?.startsWith("/corporate")
                  ? "bg-[#141210] text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-100 hover:text-[#141210]"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Corporate Studio
            </Link>
            <Link
              href="/vendor"
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                pathname?.startsWith("/vendor")
                  ? "bg-[#0F5338] text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-100 hover:text-[#141210]"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              Vendor Catalog & Logistics
            </Link>
            <Link
              href="/recipient"
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                pathname?.startsWith("/recipient") || pathname?.startsWith("/claim")
                  ? "bg-[#D95D39] text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-100 hover:text-[#141210]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Recipient Suite
            </Link>
            <Link
              href="/admin"
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                pathname?.startsWith("/admin")
                  ? "bg-[#7C2D12] text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-100 hover:text-[#141210]"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Control Tower
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-[#141210]">
                  <UserCheck className="h-3.5 w-3.5 text-[#D95D39]" />
                  <span>{user.name}</span>
                  <span className="rounded-full bg-[#F3EFE6] px-2 py-0.5 font-mono-code text-[10px] font-bold text-[#141210]">
                    {user.role}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  {user.company?.name || user.vendor?.businessName || user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#141210]/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#141210] shadow-2xs transition hover:bg-stone-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/recipient"
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200/60"
              >
                Redeem Invitation
              </Link>
              <Link
                href="/auth/corporate"
                className="rounded-full bg-[#141210] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#D95D39]"
              >
                Access Workspaces
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
