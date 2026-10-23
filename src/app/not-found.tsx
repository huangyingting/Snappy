import Link from "next/link";

export default function NotFound() {
  return <div className="mx-auto max-w-lg px-6 py-20 text-center"><h1 className="font-display text-3xl">Page not found</h1><Link href="/" className="mt-6 inline-block text-[#C85A32]">Return home →</Link></div>;
}
