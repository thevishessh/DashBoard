"use client";
import { useMemo } from "react";
import type { StudentRow } from "@/lib/data/types";
import { dailyVerified, weeklyVerified } from "@/lib/metrics";

const DAYS = 30;
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });

/** Newly verified students per day (from "Date of Verification"), last 30 days, for the current filters. */
export default function DailyProgress({ rows }: { rows: StudentRow[] }) {
  const { series, undated } = useMemo(() => dailyVerified(rows, DAYS), [rows]);
  const week = useMemo(() => weeklyVerified(rows), [rows]);
  const max = Math.max(1, ...series.map((p) => p.verified));
  const total30 = series.reduce((s, p) => s + p.verified, 0);
  const diff = week.thisWeek - week.lastWeek;

  return (
    <section aria-labelledby="progress-head" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="progress-head" className="text-section">
          Daily progress
        </h2>
        <p className="text-sm text-muted">Newly verified per day, last {DAYS} days</p>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <dt className="text-sm text-muted">This week</dt>
          <dd className="font-display text-[2rem] leading-none tracking-[-0.02em]" data-progress="week">
            {week.thisWeek}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Last week</dt>
          <dd className="font-display text-[2rem] leading-none tracking-[-0.02em] text-ink-2">{week.lastWeek}</dd>
        </div>
        <div className="self-end pb-1 text-sm text-ink-2">
          {diff === 0 ? "Same pace as last week." : diff > 0 ? `${diff} more than last week.` : `${-diff} fewer than last week.`}
        </div>
      </dl>

      {total30 === 0 ? (
        <p className="mt-6 text-sm text-muted">No verifications dated in the last {DAYS} days for these filters.</p>
      ) : (
        <figure className="mt-6">
          <div
            role="img"
            aria-label={`Newly verified per day over the last ${DAYS} days: ${total30} in total, at most ${max} in a day.`}
            className="flex h-40 items-end gap-[2px] border-b border-rule"
          >
            {series.map((p) => (
              <div key={p.date} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${fmt(p.date)}: ${p.verified} verified, ${p.total} so far`}>
                {p.verified > 0 && <span className="mb-1 text-center text-[11px] tabular-nums text-muted max-sm:hidden">{p.verified}</span>}
                <div
                  className="rounded-t-[2px] bg-accent"
                  style={{ height: `${(p.verified / max) * 100}%`, minHeight: p.verified ? 3 : 0 }}
                />
              </div>
            ))}
          </div>
          <figcaption className="mt-2 flex justify-between text-xs text-muted">
            <span>{fmt(series[0].date)}</span>
            <span>{fmt(series[Math.floor(DAYS / 2)].date)}</span>
            <span>Today</span>
          </figcaption>
        </figure>
      )}
      {undated > 0 && <p className="mt-2 text-xs text-muted">{undated} verified students have no verification date in the sheet and are not shown by day.</p>}
    </section>
  );
}
