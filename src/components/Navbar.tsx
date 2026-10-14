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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      {/* Top Demo Role Switcher Ribbon */}
      <div className="border-b border-slate-100 bg-slate-900 px-4 py-1.5 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-0.5 font-medium text-indigo-300">
              <Globe className="h-3 w-3" /> Multi-Role & Regional Sandbox
            </span>
            <span className="hidden text-slate-400 sm:inline">
              Instant role switch (1-click sign-in):
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
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="rounded bg-black/25 px-1 text-[10px] opacity-80">
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
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Snappy
              </span>
              <span className="ml-1.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-600">
                Global Gifting
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/corporate"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                pathname?.startsWith("/corporate")
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Building2 className="h-4 w-4" />
              Corporate Hub
            </Link>
            <Link
              href="/vendor"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                pathname?.startsWith("/vendor")
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Package className="h-4 w-4" />
              Vendor Portal
            </Link>
            <Link
              href="/recipient"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                pathname?.startsWith("/recipient") || pathname?.startsWith("/claim")
                  ? "bg-amber-50 text-amber-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Recipient Hub
            </Link>
            <Link
              href="/admin"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                pathname?.startsWith("/admin")
                  ? "bg-rose-50 text-rose-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Platform Admin
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden text-right sm:block">
                <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-900">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{user.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                    {user.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {user.company?.name || user.vendor?.businessName || user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/recipient"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Claim a Gift
              </Link>
              <Link
                href="/auth/corporate"
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
              >
                Enroll / Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
