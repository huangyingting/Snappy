"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Gift, LogOut } from "lucide-react";

interface CurrentUser {
  name: string;
  role: string;
}

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load your session.");
        const data = await response.json();
        setUser(data.user);
        setError("");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#141210]/10 bg-[#FAF8F5]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3 font-display text-2xl font-semibold">
          <Gift className="h-8 w-8 text-[#C85A32]" /> Snappy Atelier
        </Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          {user ? (
            <>
              <Link href={`/${user.role.toLowerCase()}`}>My workspace</Link>
              <span className="text-stone-500">{user.name}</span>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="inline-flex items-center gap-2 rounded-full border px-4 py-2">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/recipient">Redeem a gift</Link>
              <Link href="/auth/vendor">Vendor partners</Link>
              <Link href="/auth/corporate" className="rounded-full bg-[#141210] px-4 py-2 text-white">Sign in</Link>
            </>
          )}
          {error && <span role="alert" className="text-rose-700">{error}</span>}
        </nav>
      </div>
    </header>
  );
}
