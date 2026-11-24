"use client";
import { useMemo, useState } from "react";
import { verifiedRate, type GroupRow } from "@/lib/metrics";
import StatusBar from "./StatusBar";

type SortKey = "group" | "total" | "Verified" | "Pending" | "Not Verified" | "review" | "rate";

const COLS: { key: SortKey; label: string; num?: boolean; hideSm?: boolean }[] = [
  { key: "total", label: "Students", num: true },
  { key: "Verified", label: "Verified", num: true },
  { key: "Pending", label: "Pending", num: true, hideSm: true },
  { key: "Not Verified", label: "Not verified", num: true, hideSm: true },
  { key: "review", label: "Needs review", num: true, hideSm: true },
];

const value = (r: GroupRow, k: SortKey): number | string =>
  k === "group" ? r.group : k === "rate" ? verifiedRate(r) : k === "review" ? r.Unknown + r.Blank : r[k];

/**
 * A ledger of groups (schools, programs, fee status...) with their status split.
 * Clicking a row applies it as a filter; the parent decides what the next level is.
 */
export default function VerificationRegister({
  id,
  title,
  groupLabel,
  rows,
  onSelect,
  selected,
  compact = false,
  children,
}: {
  id: string;
  title: string;
  groupLabel: string;
  rows: GroupRow[];
  onSelect?: (group: string) => void;
  selected?: string;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "total", dir: -1 });
  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const x = value(a, sort.key);
      const y = value(b, sort.key);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return c * sort.dir || b.total - a.total;
    });
    return out;
  }, [rows, sort]);

  const cols = compact ? COLS.filter((c) => c.key === "total" || c.key === "Verified") : COLS;

  const Head = ({ k, children: label, num, className = "" }: { k: SortKey; children: React.ReactNode; num?: boolean; className?: string }) => {
    const on = sort.key === k;
    return (
      <th scope="col" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`whitespace-nowrap py-2 font-medium ${num ? "text-right" : "text-left"} ${className}`}>
        <button
          type="button"
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : k === "group" ? 1 : -1 }))}
          className={`rounded-[4px] px-1 hover:text-ink ${on ? "text-ink" : ""}`}
        >
          {label}
          <span aria-hidden className="ml-1 inline-block w-2 text-accent">{on ? (sort.dir === 1 ? "↑" : "↓") : ""}</span>
        </button>
      </th>
    );
  };

  return (
    <section aria-labelledby={`${id}-head`} className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id={`${id}-head`} className={compact ? "text-title" : "text-section"}>
          {title}
        </h2>
        {children}
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No students match these filters.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-rule">
                <Head k="group" className="sticky left-0 bg-paper pr-4">{groupLabel}</Head>
                {cols.map((c) => (
                  <Head key={c.key} k={c.key} num className={`px-3 ${c.hideSm ? "max-lg:hidden" : ""}`}>
                    {c.label}
                  </Head>
                ))}
                <th scope="col" className={`whitespace-nowrap py-2 pl-4 text-left font-medium ${compact ? "w-[28%]" : "w-[22%]"}`}>
                  Split
                </th>
                <Head k="rate" num className="pl-3">Verified %</Head>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const on = r.group === selected;
                return (
                  <tr
                    key={r.group}
                    data-group={r.group}
                    className={`border-b border-rule/70 ${onSelect ? "row-link" : ""} ${on ? "bg-accent-soft/50" : ""}`}
                    onClick={onSelect ? () => onSelect(on ? "" : r.group) : undefined}
                  >
                    <th scope="row" className="sticky left-0 bg-inherit py-2.5 pr-4 text-left font-normal">
                      {onSelect ? (
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(on ? "" : r.group);
                          }}
                          className={`max-w-[16ch] truncate rounded-[4px] sm:max-w-[34ch] text-left hover:underline ${on ? "font-medium text-accent-deep" : "text-ink"}`}
                          title={r.group}
                        >
                          {r.group}
                        </button>
                      ) : (
                        r.group
                      )}
                    </th>
                    {cols.map((c) => (
                      <td key={c.key} className={`px-3 text-right tabular-nums ${c.key === "total" ? "text-ink" : "text-ink-2"} ${c.hideSm ? "max-lg:hidden" : ""}`}>
                        {Number(value(r, c.key)).toLocaleString("en-IN")}
                      </td>
                    ))}
                    <td className="pl-4">
                      <StatusBar counts={r} total={r.total} />
                    </td>
                    <td className="pl-3 text-right font-medium tabular-nums text-ink">{verifiedRate(r)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
