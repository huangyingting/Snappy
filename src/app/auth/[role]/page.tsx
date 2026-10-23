"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { REGIONS } from "@/lib/constants";
import { Disclosure } from "@/components/Disclosure";

const roles = {
  corporate: { title: "Your gifting workspace", description: "Create a company workspace or sign in to manage campaigns and funding." },
  vendor: { title: "Vendor partner studio", description: "Manage your products and fulfill gifts. New partners require administrator approval." },
  recipient: { title: "Something just for you", description: "Open your invitation or sign in to manage your gifts and saved addresses." },
  admin: { title: "Platform operations", description: "Restricted to authorized administrators. Accounts are provisioned by the deployment operator." },
};

export default function RoleAuthPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = use(params);
  if (!(role in roles)) notFound();
  const roleSlug = role as keyof typeof roles;
  const meta = roles[roleSlug];
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "enroll" | "claim">(roleSlug === "recipient" ? "claim" : "login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [regions, setRegions] = useState(["NA"]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    try {
      if (mode === "login") {
        const result = await signIn("credentials", { email, password, expectedRole: roleSlug.toUpperCase(), redirect: false });
        if (!result?.ok) throw new Error("Sign in failed. Check your credentials, portal, and email verification.");
        router.push(`/${roleSlug}`);
        router.refresh();
      } else {
        const response = await fetch(mode === "claim" ? "/api/auth/claim-lookup" : `/api/auth/enroll/${roleSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...Object.fromEntries(form),
            supportedRegions: regions,
            slaDays: Number(form.get("slaDays") || 3),
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Request failed.");
        if (mode === "claim") router.push(result.redirectTo);
        else {
          formElement.reset();
          setMode("login");
          setMessage("Account created. Check your email to verify your address before signing in.");
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-stone-200 bg-[#FAF8F5] px-3 py-2.5 text-sm";
  return (
    <div className="mx-auto grid max-w-4xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#C85A32]">Snappy Atelier</p>
        <h1 className="mt-3 font-display text-3xl">{meta.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{meta.description}</p>
        <Disclosure title="Other workspaces" className="mt-3">
          <nav aria-label="Choose a portal" className="flex flex-wrap gap-2 text-xs font-semibold">
            {Object.keys(roles).map((key) => <Link key={key} href={`/auth/${key}`} className="rounded-full border border-stone-300 px-3 py-2 capitalize">{key}</Link>)}
          </nav>
        </Disclosure>
        {roleSlug === "corporate" && <p className="mt-4 text-sm text-stone-500">Workspaces start with a zero balance. Contact your platform administrator to reconcile a real payment before sending gifts.</p>}
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
          {(["login", ...(roleSlug !== "admin" ? ["enroll"] : []), ...(roleSlug === "recipient" ? ["claim"] : [])] as const).map((value) => (
            <button key={value} type="button" onClick={() => { setMode(value as typeof mode); setError(""); setMessage(""); }} className={`rounded-full px-4 py-2 ${mode === value ? "bg-[#141210] text-white" : "bg-stone-100"}`}>
              {value === "login" ? "Sign in" : value === "enroll" ? "Create account" : "Redeem invitation"}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        <form key={mode} onSubmit={submit} className="space-y-4">
          {mode === "enroll" && <label className="block text-sm">Full name<input name="name" required maxLength={100} autoComplete="name" className={inputClass} /></label>}
          <label className="block text-sm">{mode === "claim" ? "Recipient email" : "Email"}<input name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} /></label>
          {mode !== "claim" && <label className="block text-sm">Password<input name="password" type="password" required minLength={mode === "enroll" ? 12 : 1} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} className={inputClass} /></label>}
          {mode === "claim" && <label className="block text-sm">Invitation code<input name="claimCode" required maxLength={100} autoComplete="off" className={inputClass} /></label>}
          {mode === "enroll" && roleSlug === "corporate" && (
            <>
              <label className="block text-sm">Company name<input name="companyName" required maxLength={150} className={inputClass} /></label>
              <label className="block text-sm">Primary region<select name="primaryRegion" className={inputClass}>{REGIONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}</select></label>
            </>
          )}
          {mode === "enroll" && roleSlug === "vendor" && (
            <>
              <label className="block text-sm">Legal business name<input name="businessName" required maxLength={150} className={inputClass} /></label>
              <label className="block text-sm">Tax / VAT ID<input name="taxId" required maxLength={100} className={inputClass} /></label>
              <label className="block text-sm">Country (two-letter ISO code)<input name="hqCountry" required pattern="[A-Z]{2}" maxLength={2} className={inputClass} /></label>
              <label className="block text-sm">Dispatch SLA (days)<input name="slaDays" type="number" min={1} max={14} defaultValue={3} className={inputClass} /></label>
              <fieldset><legend className="mb-2 text-sm">Fulfillment regions</legend><div className="flex flex-wrap gap-4">{REGIONS.map((r) => <label key={r.code} className="text-xs"><input type="checkbox" checked={regions.includes(r.code)} onChange={(e) => setRegions(e.target.checked ? [...regions, r.code] : regions.filter((v) => v !== r.code))} /> {r.code}</label>)}</div></fieldset>
            </>
          )}
          <button disabled={loading} className="w-full rounded-full bg-[#141210] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Please wait…" : mode === "login" ? "Sign in" : mode === "enroll" ? "Create account" : "Open my gift"}</button>
        </form>
        {mode === "login" && <div className="mt-5 flex flex-wrap gap-4 text-xs text-[#C85A32]"><Link href="/auth/reset">Forgot password?</Link><Link href="/auth/verify">Resend verification email</Link></div>}
      </div>
    </div>
  );
}
