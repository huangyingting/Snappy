"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function Disclosure({
  title,
  children,
  className = "",
  defaultOpen = false,
  open,
  onOpenChange,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <details
      className={`group/disclosure min-w-0 rounded-xl border border-stone-200 bg-white text-stone-800 ${className}`}
      open={open ?? defaultOpen}
      onToggle={onOpenChange ? (event) => onOpenChange(event.currentTarget.open) : undefined}
    >
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C85A32]">
        <span>{title}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open/disclosure:rotate-180" />
      </summary>
      <div className="border-t border-stone-100 p-3">{children}</div>
    </details>
  );
}
