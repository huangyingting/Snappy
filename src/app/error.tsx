"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="mt-4 text-stone-600">We could not load this page. Please try again.</p>
      <button onClick={reset} className="mt-6 rounded-full bg-[#141210] px-6 py-3 text-white">Try again</button>
    </div>
  );
}
