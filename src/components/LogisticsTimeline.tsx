"use client";

import React from "react";
import { Disclosure } from "./Disclosure";
import {
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  Package,
  ShieldAlert,
  Truck,
  Unlock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

export interface ShipmentCheckpointItem {
  id: string;
  stage: string;
  title: string;
  description: string;
  location: string;
  actorRole: string;
  occurredAt: string | Date;
}

export type ShipmentCheckpoint = ShipmentCheckpointItem;

interface LogisticsTimelineProps {
  fulfillmentStatus: string;
  trackingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  serviceLevel?: string;
  fulfillmentWarehouse?: string;
  packageWeightGrams?: number;
  estimatedDeliveryAt?: string | Date | null;
  addressLocked?: boolean;
  exceptionNote?: string;
  swapCount?: number;
  selectedVariant?: string;
  shipmentEvents?: ShipmentCheckpointItem[];
  compact?: boolean;
}

const PIPELINE_STEPS = [
  { key: "PENDING_VENDOR", label: "Order Routed" },
  { key: "PROCESSING", label: "Atelier QA & Pack" },
  { key: "SHIPPED", label: "Carrier Transit" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

function resolveStepIndex(fulfillmentStatus: string): number {
  switch (fulfillmentStatus) {
    case "PENDING_VENDOR":
      return 0;
    case "PROCESSING":
      return 1;
    case "SHIPPED":
    case "EXCEPTION":
      return 2;
    case "OUT_FOR_DELIVERY":
      return 3;
    case "DELIVERED":
    case "COMPLETED":
      return 4;
    default:
      return 0;
  }
}

export function LogisticsTimeline({
  fulfillmentStatus,
  trackingCarrier,
  trackingNumber,
  trackingUrl,
  serviceLevel,
  fulfillmentWarehouse,
  packageWeightGrams,
  estimatedDeliveryAt,
  addressLocked,
  exceptionNote,
  swapCount,
  selectedVariant,
  shipmentEvents = [],
  compact = false,
}: LogisticsTimelineProps) {
  const currentStepIdx = resolveStepIndex(fulfillmentStatus);
  const isException = fulfillmentStatus === "EXCEPTION";

  return (
    <div className="rounded-xl border border-[#141210]/10 bg-[#FAF8F5] p-3">
      {/* Top Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141210]/8 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${isException
              ? "bg-rose-100 text-rose-800"
              : fulfillmentStatus === "DELIVERED" || fulfillmentStatus === "COMPLETED"
                ? "bg-emerald-100 text-emerald-800"
                : fulfillmentStatus === "SHIPPED" || fulfillmentStatus === "OUT_FOR_DELIVERY"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-stone-200/80 text-stone-800"
              }`}
          >
            <Truck className="h-3.5 w-3.5" />
            {fulfillmentStatus.replace(/_/g, " ")}
          </span>

          {addressLocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-200/70 px-2.5 py-1 text-[11px] font-medium text-stone-700">
              <Lock className="h-3 w-3" /> Manifest Locked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              <Unlock className="h-3 w-3" /> Address & Gift Editable
            </span>
          )}

          {swapCount && swapCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D95D39]/12 px-2.5 py-1 text-[11px] font-semibold text-[#B84322]">
              <RefreshCw className="h-3 w-3" /> Exchanged ({swapCount}x)
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
          {trackingCarrier && trackingNumber ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 border border-[#141210]/10">
              <span className="font-semibold text-[#141210]">{trackingCarrier}:</span>
              <span className="font-mono-code text-xs font-bold text-[#D95D39]">
                {trackingNumber}
              </span>
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-stone-400 hover:text-[#141210]"
                  title="Open Carrier Tracking"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-stone-500">
              Awaiting carrier waybill assignment
            </span>
          )}
        </div>
      </div>

      {/* 5-Stage Horizontal Progress Stepper */}
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {PIPELINE_STEPS.map((step, idx) => {
          const isCompleted = idx <= currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          return (
            <div key={step.key} className="flex flex-col">
              <div
                className={`h-1.5 w-full rounded-full transition-all ${isException && isCurrent
                  ? "bg-rose-600"
                  : isCompleted
                    ? "bg-[#0F5338]"
                    : "bg-stone-200"
                  }`}
              />
              <span
                className={`mt-1.5 text-[10px] font-semibold leading-tight sm:text-[11px] ${isCurrent
                  ? "text-[#141210] font-bold"
                  : isCompleted
                    ? "text-[#0F5338]"
                    : "text-stone-400"
                  }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Exception Banner if flagged */}
      {isException && exceptionNote && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <span className="font-bold">Carrier / Customs Alert: </span>
            <span>{exceptionNote}</span>
          </div>
        </div>
      )}

      {/* Metadata Pills (Warehouse, Service Level, Weight, Variant, ETA) */}
      {(shipmentEvents.length > 0 || (!compact && (fulfillmentWarehouse || serviceLevel || packageWeightGrams || selectedVariant || estimatedDeliveryAt))) && (
        <Disclosure title={`Shipment details & history (${shipmentEvents.length})`} className="mt-3">
          {!compact && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-600">
              {fulfillmentWarehouse && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 border border-[#141210]/8">
                  <MapPin className="h-3 w-3 text-[#D95D39]" />
                  <strong className="text-[#141210]">Hub:</strong> {fulfillmentWarehouse}
                </span>
              )}
              {serviceLevel && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 border border-[#141210]/8">
                  <Package className="h-3 w-3 text-[#0F5338]" />
                  <strong className="text-[#141210]">Service:</strong> {serviceLevel}
                </span>
              )}
              {packageWeightGrams ? (
                <span className="rounded-lg bg-white px-2.5 py-1 border border-[#141210]/8 font-mono-code">
                  {(packageWeightGrams / 1000).toFixed(2)} kg
                </span>
              ) : null}
              {selectedVariant && (
                <span className="rounded-lg bg-[#F3EFE6] px-2.5 py-1 font-medium text-[#141210]">
                  {selectedVariant}
                </span>
              )}
              {estimatedDeliveryAt && fulfillmentStatus !== "DELIVERED" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 font-semibold text-amber-900">
                  <Clock className="h-3 w-3" />
                  Est. Delivery: {new Date(estimatedDeliveryAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Chronological Carrier Scan Log */}
          {shipmentEvents.length > 0 && (
            <div className="mt-4 border-t border-[#141210]/8 pt-3.5">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Live Carrier & Atelier Checkpoint Log ({shipmentEvents.length})
              </p>
              <div className="space-y-2.5">
                {shipmentEvents.map((ev, index) => {
                  const isLatest = index === shipmentEvents.length - 1;
                  return (
                    <div
                      key={ev.id || `${ev.stage}-${index}`}
                      className="flex items-start gap-2.5 text-xs"
                    >
                      <div className="mt-0.5 flex flex-col items-center">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full ${isLatest
                            ? "bg-[#0F5338] text-white ring-4 ring-[#0F5338]/15"
                            : "bg-stone-300 text-stone-700"
                            }`}
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span
                            className={`font-semibold ${isLatest ? "text-[#141210]" : "text-stone-700"
                              }`}
                          >
                            {ev.title}
                          </span>
                          <span className="font-mono-code text-[10px] text-stone-500">
                            {ev.location ? `${ev.location} • ` : ""}
                            {new Date(ev.occurredAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="mt-0.5 text-[11px] text-stone-600">{ev.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Disclosure>
      )}
    </div>
  );
}
