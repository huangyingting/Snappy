"use client";

import { useState } from "react";
import Link from "next/link";

export function AccountRecovery({ purpose, token }: { purpose: "verify" | "reset"; token?: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [redirectTo, setRedirectTo] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/account", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, purpose, token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed.");
      setMessage(result.message || (purpose === "verify" ? "Email verified. You can now sign in." : "Password updated. Sign in with your new password."));
      setRedirectTo(result.redirectTo || "");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mx-auto my-16 max-w-md rounded-2xl border border-stone-200 bg-white p-5">
      <h1 className="font-display text-2xl">{purpose === "verify" ? "Verify your email" : "Reset your password"}</h1>
      {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm text-emerald-800">{message}</p>}
      {redirectTo ? <Link href={redirectTo} className="mt-4 inline-block font-semibold">Continue to sign in →</Link> : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          {!token && <label className="block text-sm">Email<input name="email" type="email" required className="mt-2 w-full rounded-xl border p-3" /></label>}
          {token && purpose === "reset" && <label className="block text-sm">New password<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="mt-2 w-full rounded-xl border p-3" /></label>}
          <button disabled={loading} className="w-full rounded-full bg-[#141210] p-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Please wait…" : token ? "Confirm" : "Send email"}</button>
        </form>
      )}
    </div>
  );
}
