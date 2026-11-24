"use client";
import { STATUS_BUCKETS, STATUS_COLORS, STATUS_LABELS, type StatusBucket } from "@/config/status";
import type { Kpis } from "@/lib/metrics";
import StatusBar from "./StatusBar";

/** The headline figure (verified of total) and the whole split as one bar; each key filters by its status. */
export default function StatusSummary({
  k,
  activeStatus,
  onStatus,
}: {
  k: Kpis;
  activeStatus?: string;
  onStatus: (s: StatusBucket | "") => void;
}) {
  return (
    <section aria-labelledby="summary-head" className="border-b border-rule pb-8">
      <h2 id="summary-head" className="visually-hidden">
        Verification summary
      </h2>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="text-sm text-muted">Verified</p>
          <p className="font-display text-[3rem] leading-none tracking-[-0.03em] tabular-nums" data-kpi="Verified">
            <span className="kpi-value">{k.counts.Verified.toLocaleString("en-IN")}</span>
          </p>
        </div>
        <p className="pb-1 text-md text-ink-2">
          of <b className="font-medium tabular-nums text-ink" data-kpi="Total"><span className="kpi-value">{k.total.toLocaleString("en-IN")}</span></b> students,{" "}
          <span className="tabular-nums">{k.percent.Verified}%</span>
        </p>
      </div>

      <div className="mt-6">
        <StatusBar counts={k.counts} total={k.total} thick />
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-2" aria-label="Filter by status">
        {STATUS_BUCKETS.map((b) => {
          const on = activeStatus === b;
          return (
            <li key={b}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onStatus(on ? "" : b)}
                data-kpi={b === "Verified" ? undefined : b}
                className={`row-link flex h-9 items-center gap-2 rounded-input border px-3 text-sm ${
                  on ? "border-accent bg-accent-soft" : "border-transparent"
                }`}
              >
                <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: STATUS_COLORS[b] }} />
                <span className="text-ink-2">{STATUS_LABELS[b]}</span>
                <span className="kpi-value font-medium tabular-nums text-ink">{k.counts[b].toLocaleString("en-IN")}</span>
                <span className="tabular-nums text-muted">{k.percent[b]}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
