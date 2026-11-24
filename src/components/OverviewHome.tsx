"use client";
import { useEffect, useMemo, useState } from "react";
import { STATUS_LABELS } from "@/config/status";
import type { StudentRow } from "@/lib/data/types";
import { bySchool, kpis, weeklyVerified } from "@/lib/metrics";
import type { RequestRow } from "@/lib/requests/repo";
import { complaintStats } from "@/lib/requests/inbox";
import StatusBar from "./StatusBar";

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; rows: RequestRow[] };

/** The home screen: one panel per module with the numbers that need attention. Details live inside each module. */
export default function OverviewHome({
  students,
  onOpen,
}: {
  students: StudentRow[];
  onOpen: (view: "verification" | "complaints", status?: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-2 xl:gap-12">
      <VerificationPanel students={students} onOpen={onOpen} />
      <ComplaintsPanel onOpen={onOpen} />
    </div>
  );
}

function Panel({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-head`} className="min-w-0 rounded-card border border-rule bg-paper p-5 md:p-6">
      <h2 id={`${id}-head`} className="text-section">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Figure({ value, label, kpi }: { value: number; label: string; kpi?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-display text-[1.75rem] leading-tight tracking-[-0.02em]" data-kpi={kpi}>
        <span className="kpi-value">{value.toLocaleString("en-IN")}</span>
      </dd>
    </div>
  );
}

function VerificationPanel({ students, onOpen }: { students: StudentRow[]; onOpen: (v: "verification", s?: string) => void }) {
  const k = useMemo(() => kpis(students), [students]);
  const week = useMemo(() => weeklyVerified(students), [students]);
  const mostPending = useMemo(
    () =>
      bySchool(students)
        .filter((s) => s.Pending > 0)
        .sort((a, b) => b.Pending - a.Pending)
        .slice(0, 3),
    [students],
  );

  return (
    <Panel id="ov-verification" title="Document verification">
      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
        <p className="font-display text-[3rem] leading-none tracking-[-0.03em] tabular-nums" data-kpi="Verified">
          <span className="kpi-value">{k.counts.Verified.toLocaleString("en-IN")}</span>
        </p>
        <p className="pb-1 text-ink-2">
          verified of <b className="font-medium tabular-nums text-ink" data-kpi="Total"><span className="kpi-value">{k.total.toLocaleString("en-IN")}</span></b> students,{" "}
          <span className="tabular-nums">{k.percent.Verified}%</span>
        </p>
      </div>
      <p className="mt-2 text-sm text-ink-2" data-week={week.thisWeek}>
        <b className="font-medium text-ink">{week.thisWeek}</b> newly verified this week (last week {week.lastWeek})
      </p>
      <div className="mt-5">
        <StatusBar counts={k.counts} total={k.total} thick />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4">
        <Figure value={k.counts.Pending} label={STATUS_LABELS.Pending} kpi="Pending" />
        <Figure value={k.counts["Not Verified"]} label={STATUS_LABELS["Not Verified"]} kpi="Not Verified" />
        <Figure value={k.counts.Unknown + k.counts.Blank} label="Needs review" kpi="Needs review" />
      </dl>

      {mostPending.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-ink">Most pending, by school</h3>
          <ul className="mt-2 divide-y divide-rule/70 border-y border-rule/70 text-sm">
            {mostPending.map((s) => (
              <li key={s.group} className="flex items-baseline gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-ink-2" title={s.group}>
                  {s.group}
                </span>
                <span className="font-medium tabular-nums text-ink">{s.Pending}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="btn btn--primary mt-6 whitespace-nowrap" onClick={() => onOpen("verification")}>
        Open document verification
      </button>
    </Panel>
  );
}

function ComplaintsPanel({ onOpen }: { onOpen: (v: "complaints", s?: string) => void }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    fetch("/api/staff/requests", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!live) return;
        if (!res.ok) setLoad({ kind: "error", message: body.error ?? "Requests could not be loaded." });
        else setLoad({ kind: "ready", rows: body.requests });
      })
      .catch(() => live && setLoad({ kind: "error", message: "No connection to the requests database." }));
    return () => {
      live = false;
    };
  }, []);

  const s = useMemo(() => (load.kind === "ready" ? complaintStats(load.rows) : null), [load]);
  const awaiting = s ? s.byStatus.Open + s.byStatus["In progress"] : 0;

  return (
    <Panel id="ov-complaints" title="Complaints and requests">
      {load.kind === "loading" && (
        <div aria-busy="true" className="mt-4 space-y-3">
          <div className="h-12 w-32 rounded-input bg-paper-2" />
          <div className="h-5 rounded-[3px] bg-paper-2" />
          <div className="h-24 rounded-input bg-paper-2" />
        </div>
      )}

      {load.kind === "error" && (
        <p role="alert" className="mt-4 text-sm text-error">
          {load.message}
        </p>
      )}

      {s && s.total === 0 && (
        <div className="mt-4">
          <p className="text-ink">No requests yet.</p>
          <p className="mt-1 text-sm text-muted">Print the QR poster and put it where students can scan it.</p>
          <a href="/qr" className="btn btn--quiet mt-4">
            Open the QR poster
          </a>
        </div>
      )}

      {s && s.total > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="font-display text-[3rem] leading-none tracking-[-0.03em] tabular-nums" data-complaints="awaiting">
              {awaiting.toLocaleString("en-IN")}
            </p>
            <p className="pb-1 text-ink-2">
              awaiting action, <span className="tabular-nums">{s.lastWeek}</span> raised in the last 7 days
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(["Open", "In progress", "Resolved", "Closed"] as const).map((st) => (
              <div key={st} className="min-w-0">
                <dt className="text-sm text-muted">{st}</dt>
                <dd>
                  <button
                    type="button"
                    onClick={() => onOpen("complaints", st)}
                    className="font-display text-[1.75rem] leading-tight tracking-[-0.02em] tabular-nums hover:text-accent-deep"
                    data-complaints={st}
                    aria-label={`${st}: ${s.byStatus[st]} requests. Open the list`}
                  >
                    {s.byStatus[st].toLocaleString("en-IN")}
                  </button>
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 text-sm text-ink-2">
            {s.waitingOver3Days > 0 ? (
              <>
                <b className="font-medium text-ink">{s.waitingOver3Days}</b> waiting more than 3 days, the oldest for{" "}
                <b className="font-medium text-ink">{s.oldestOpenDays} days</b>.
              </>
            ) : awaiting > 0 ? (
              "Nothing has waited more than 3 days."
            ) : (
              "Every request has been answered."
            )}
          </p>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-ink">By category</h3>
            <table className="mt-2 w-full border-collapse text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-rule">
                  <th scope="col" className="py-1.5 text-left font-medium">Category</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Awaiting</th>
                  <th scope="col" className="py-1.5 pl-4 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {s.byCategory.slice(0, 5).map((c) => (
                  <tr key={c.category} className="border-b border-rule/70">
                    <th scope="row" className="py-2 text-left font-normal text-ink-2">{c.category}</th>
                    <td className="py-2 text-right font-medium tabular-nums text-ink">{c.open}</td>
                    <td className="py-2 pl-4 text-right tabular-nums text-ink-2">{c.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {load.kind !== "loading" && !(s && s.total === 0) && (
        <button type="button" className="btn btn--primary mt-6 whitespace-nowrap" onClick={() => onOpen("complaints")}>
          Open complaints and requests
        </button>
      )}
    </Panel>
  );
}
