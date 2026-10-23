import Link from "next/link";
import { ArrowRight, Gift, ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Disclosure } from "@/components/Disclosure";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true, status: "ACTIVE", stockQuantity: { gt: 0 }, vendor: { status: "APPROVED" } },
    select: { id: true, title: true, category: true, imageUrl: true, supportedRegions: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 12,
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <section className="grid items-center gap-6 py-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-[#C85A32]">Thoughtfully given. Freely chosen.</p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Make every gift<br />feel personal.</h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-600">Send thoughtful gifts. Let your people choose what they love.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
            <Link href="/auth/corporate" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#141210] px-4 py-2.5 text-white">Start gifting <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/auth/recipient" className="min-h-10 rounded-lg border border-stone-300 px-4 py-2.5">I received a gift</Link>
          </div>
        </div>
        <Disclosure title="How gifting works">
          <div className="space-y-3 text-sm text-stone-600">
            <p className="flex items-center gap-3"><Gift className="h-5 w-5 shrink-0 text-[#C85A32]" /> Send an invitation. Your recipient chooses a gift.</p>
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" /> Private recipient delivery details</p>
            <p className="flex items-center gap-3"><Truck className="h-5 w-5" /> Vendor-managed fulfillment and tracking</p>
          </div>
        </Disclosure>
      </section>
      <section className="mt-6 border-t border-stone-200 pt-5">
        <h2 className="font-display text-2xl">Discover the catalog</h2>
        {products.length === 0 ? (
          <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            <p>The catalog is being curated. Approved vendor products will appear here as they become available.</p>
            <Link href="/auth/vendor" className="mt-4 inline-block font-semibold text-[#C85A32]">Become a vendor partner →</Link>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                <img src={product.imageUrl} alt={product.title} className="aspect-[4/3] w-full object-cover" />
                <div className="p-3">
                  <p className="text-xs text-[#C85A32]">{product.category} · {product.supportedRegions}</p>
                  <h3 className="mt-1 font-display text-lg">{product.title}</h3>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
