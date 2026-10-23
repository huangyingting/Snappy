"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";

interface WorkspaceTab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

export function WorkspaceTabs<T extends string>({
  activeTab,
  onChange,
  primary,
  secondary = [],
}: {
  activeTab: T;
  onChange: (tab: T) => void;
  primary: WorkspaceTab<T>[];
  secondary?: WorkspaceTab<T>[];
}) {
  const selectedSecondary = secondary.find((tab) => tab.id === activeTab);
  function button(tab: WorkspaceTab<T>) {
    const Icon = tab.icon;
    return (
      <button
        key={tab.id}
        type="button"
        aria-pressed={activeTab === tab.id}
        onClick={() => onChange(tab.id)}
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeTab === tab.id ? "bg-[#141210] text-white" : "text-stone-600 hover:bg-stone-100"
          }`}
      >
        {Icon && <Icon aria-hidden="true" className="h-4 w-4" />}
        {tab.label}
      </button>
    );
  }
  return (
    <nav aria-label="Workspace navigation" className="mt-3 flex flex-wrap items-start gap-1 border-b border-stone-200 pb-2">
      {primary.map(button)}
      {secondary.length > 0 && (
        <details className="group/tools min-w-0">
          <summary className={`flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-stone-100 ${selectedSecondary ? "bg-stone-100 text-stone-900" : "text-stone-600"}`}>
            {selectedSecondary ? `More tools · ${selectedSecondary.label}` : "More tools"}
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 transition-transform group-open/tools:rotate-180" />
          </summary>
          <div className="mt-1 flex flex-wrap gap-1">{secondary.map(button)}</div>
        </details>
      )}
    </nav>
  );
}
