import Link from "next/link";
import { ArrowRight, Gift, ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true, status: "ACTIVE", stockQuantity: { gt: 0 }, vendor: { status: "APPROVED" } },
    select: { id: true, title: true, category: true, imageUrl: true, supportedRegions: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 12,
  });
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <section className="grid items-center gap-12 py-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-[#C85A32]">Thoughtfully given. Freely chosen.</p>
          <h1 className="mt-6 font-display text-6xl leading-tight">Make every gift<br />feel personal.</h1>
          <p className="mt-6 max-w-lg text-lg text-stone-600">Bring your people together with gifts they choose themselves. One workspace for your catalog, campaigns, and deliveries.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/auth/corporate" className="inline-flex items-center gap-3 rounded-full bg-[#141210] px-6 py-3 text-white">Start gifting <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/auth/recipient" className="rounded-full border border-stone-300 px-6 py-3">I received a gift</Link>
          </div>
        </div>
        <div className="rounded-[2rem] bg-[#141210] p-10 text-[#FAF8F5]">
          <Gift className="h-14 w-14 text-[#D4AF37]" />
          <h2 className="mt-8 font-display text-4xl">A little choice.<br />A lot of appreciation.</h2>
          <div className="mt-8 space-y-4 text-sm text-stone-300">
            <p className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" /> Private recipient delivery details</p>
            <p className="flex items-center gap-3"><Truck className="h-5 w-5" /> Vendor-managed fulfillment and tracking</p>
          </div>
        </div>
      </section>
      <section className="mt-16 border-t border-stone-200 pt-12">
        <h2 className="font-display text-3xl">Discover the catalog</h2>
        {products.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-10 text-stone-600">
            <p>The catalog is being curated. Approved vendor products will appear here as they become available.</p>
            <Link href="/auth/vendor" className="mt-4 inline-block font-semibold text-[#C85A32]">Become a vendor partner →</Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
                <img src={product.imageUrl} alt={product.title} className="aspect-square w-full object-cover" />
                <div className="p-5">
                  <p className="text-xs text-[#C85A32]">{product.category} · {product.supportedRegions}</p>
                  <h3 className="mt-2 font-display text-xl">{product.title}</h3>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
