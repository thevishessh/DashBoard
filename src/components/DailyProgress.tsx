"use client";
import { useMemo, useState } from "react";
import { dailyActivity, staffActivity, staffName, type StatusEvent } from "@/lib/activity";
import type { StudentRow } from "@/lib/data/types";
import { addDays, istToday, weeklyVerified } from "@/lib/metrics";

const DAYS = 30;
const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const SEGMENTS = [
  { key: "verified", label: "Verified", color: "var(--color-status-verified)" },
  { key: "pending", label: "Pending", color: "var(--color-status-pending)" },
  { key: "notVerified", label: "Not verified", color: "var(--color-status-not-verified)" },
] as const;

const RANGES = [
  { id: "today", label: "Today", days: 0 },
  { id: "week", label: "Last 7 days", days: 6 },
  { id: "month", label: "Last 30 days", days: 29 },
] as const;

/** The office's daily work: files checked per day by outcome, and who changed how many statuses. */
export default function DailyProgress({ rows, events }: { rows: StudentRow[]; events: StatusEvent[] }) {
  const days = useMemo(() => dailyActivity(rows, DAYS), [rows]);
  const week = useMemo(() => weeklyVerified(rows), [rows]);
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("today");
  const uids = useMemo(() => new Set(rows.map((r) => r.uid)), [rows]);
  const from = addDays(istToday(), -RANGES.find((r) => r.id === range)!.days);
  const { staff, unattributed } = useMemo(() => staffActivity(events, from, uids), [events, from, uids]);
  const tracking = events.some((e) => e.actor);

  const max = Math.max(1, ...days.map((d) => d.total));
  const week7 = days.slice(-7).reduce((s, d) => ({ v: s.v + d.verified, p: s.p + d.pending, n: s.n + d.notVerified }), { v: 0, p: 0, n: 0 });

  return (
    <section aria-labelledby="progress-head" className="min-w-0 space-y-8">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="progress-head" className="text-section">
            Daily activity
          </h2>
          <p className="text-sm text-muted">Files checked per day (Date of Verification), by outcome</p>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <dt className="text-sm text-muted">Verified this week</dt>
            <dd className="font-display text-[2rem] leading-none tracking-[-0.02em]" data-progress="week">
              {week.thisWeek}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Pending this week</dt>
            <dd className="font-display text-[2rem] leading-none tracking-[-0.02em]">{week7.p}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Checked this week</dt>
            <dd className="font-display text-[2rem] leading-none tracking-[-0.02em] text-ink-2">{week7.v + week7.p + week7.n}</dd>
          </div>
          <div className="self-end pb-1 text-sm text-ink-2">Verified last week: {week.lastWeek}</div>
        </dl>

        <figure className="mt-6">
          <div
            role="img"
            aria-label={`Files checked per day over the last ${DAYS} days, split into verified, pending and not verified.`}
            className="flex h-44 items-end gap-[2px] border-b border-rule"
          >
            {days.map((d) => (
              <div
                key={d.date}
                className="flex h-full min-w-0 flex-1 flex-col justify-end"
                title={`${fmt(d.date)}: ${d.verified} verified, ${d.pending} pending, ${d.notVerified} not verified`}
              >
                {d.total > 0 && <span className="mb-1 text-center text-[11px] tabular-nums text-muted max-sm:hidden">{d.total}</span>}
                <div className="flex flex-col-reverse gap-px overflow-hidden rounded-t-[2px]" style={{ height: `${(d.total / max) * 100}%` }}>
                  {SEGMENTS.map((s) =>
                    d[s.key] > 0 ? <div key={s.key} style={{ flexGrow: d[s.key], flexBasis: 0, minHeight: 2, backgroundColor: s.color }} /> : null,
                  )}
                </div>
              </div>
            ))}
          </div>
          <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{fmt(days[0].date)}</span>
            <span className="flex flex-wrap gap-x-4">
              {SEGMENTS.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </span>
            <span>Today</span>
          </figcaption>
        </figure>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h3 className="text-title">Who did what</h3>
          <div role="group" aria-label="Period" className="ml-auto flex rounded-input bg-paper-3 p-0.5 text-xs">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={range === r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-[8px] px-2.5 py-1 ${range === r.id ? "bg-paper font-medium text-ink" : "text-ink-2"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {!tracking ? (
          <p className="mt-3 text-sm text-muted">
            Staff activity is recorded from the first status change made in the Google Sheet after the latest sync script was installed.
          </p>
        ) : staff.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No status changes by staff in this period.</p>
        ) : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-rule">
                <th scope="col" className="py-2 text-left font-medium">Staff</th>
                <th scope="col" className="py-2 text-right font-medium">Verified</th>
                <th scope="col" className="py-2 text-right font-medium">Pending</th>
                <th scope="col" className="py-2 text-right font-medium">Not verified</th>
                <th scope="col" className="py-2 text-right font-medium">Total</th>
                <th scope="col" className="py-2 pl-4 text-left font-medium max-sm:hidden">Last change</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.actor} className="border-b border-rule/70" data-staff={staffName(s.actor)}>
                  <th scope="row" className="py-2 text-left font-normal text-ink" title={s.actor}>
                    {staffName(s.actor)}
                  </th>
                  <td className="py-2 text-right font-medium tabular-nums">{s.verified}</td>
                  <td className="py-2 text-right tabular-nums text-ink-2">{s.pending}</td>
                  <td className="py-2 text-right tabular-nums text-ink-2">{s.notVerified}</td>
                  <td className="py-2 text-right tabular-nums text-ink">{s.total}</td>
                  <td className="py-2 pl-4 text-ink-2 max-sm:hidden">{when(s.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {unattributed > 0 && <p className="mt-2 text-xs text-muted">{unattributed} changes arrived through a full sync, where the editor is not known.</p>}
      </div>
    </section>
  );
}
