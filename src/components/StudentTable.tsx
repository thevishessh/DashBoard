"use client";
import { useEffect, useMemo, useState } from "react";
import { STATUS_BUCKETS, STATUS_LABELS } from "@/config/status";
import type { StudentRow } from "@/lib/data/types";
import { normalizeStatus, toCsv } from "@/lib/metrics";

const PAGE_SIZES = [25, 50, 100];
type SortKey = "uid" | "name" | "program" | "institute" | "status";

export function downloadCsv(rows: StudentRow[]) {
  // BOM so Excel opens UTF-8 names correctly.
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `verification-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Verified is the one state that earns colour; the rest are words. */
export function StatusText({ raw }: { raw: string }) {
  const s = normalizeStatus(raw);
  if (s === "Verified")
    return <span className="inline-flex h-6 items-center rounded-pill bg-accent-soft px-2.5 text-xs font-medium text-accent-deep">Verified</span>;
  if (s === "Unknown")
    return (
      <span className="text-ink-2" title="Value in the sheet that is not a known status">
        Unrecognised <span className="text-muted">(&ldquo;{raw}&rdquo;)</span>
      </span>
    );
  return <span className={s === "Pending" ? "font-medium text-ink" : "text-muted"}>{STATUS_LABELS[s]}</span>;
}

export default function StudentTable({ rows, onClear }: { rows: StudentRow[]; onClear: () => void }) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "uid", dir: 1 });
  useEffect(() => setPage(0), [rows, size, sort]);

  const sorted = useMemo(() => {
    const val = (r: StudentRow) =>
      sort.key === "status" ? String(STATUS_BUCKETS.indexOf(normalizeStatus(r.rawStatus))) : r[sort.key];
    return [...rows].sort((a, b) => val(a).localeCompare(val(b), undefined, { numeric: true }) * sort.dir);
  }, [rows, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const slice = sorted.slice(page * size, page * size + size);
  const from = sorted.length === 0 ? 0 : page * size + 1;
  const to = Math.min(sorted.length, (page + 1) * size);

  const Th = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => {
    const on = sort.key === k;
    return (
      <th scope="col" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`whitespace-nowrap py-2 pr-4 text-left font-medium ${className}`}>
        <button
          type="button"
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : 1 }))}
          className={`rounded-[4px] hover:text-ink ${on ? "text-ink" : ""}`}
        >
          {children}
          <span aria-hidden className="ml-1 inline-block w-2 text-accent">{on ? (sort.dir === 1 ? "↑" : "↓") : ""}</span>
        </button>
      </th>
    );
  };

  return (
    <section aria-labelledby="records-head" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="records-head" className="text-section">
          Student records
        </h2>
        <p className="text-sm text-muted" data-table-count={rows.length}>
          {rows.length.toLocaleString("en-IN")} match the current filters
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 border-y border-rule py-12 text-center">
          <p className="text-ink">No students match these filters.</p>
          <button type="button" className="btn btn--quiet mt-3" onClick={onClear}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-rule">
                  <Th k="uid" className="sticky left-0 bg-paper">UID</Th>
                  <Th k="name">Name</Th>
                  <Th k="program">Program</Th>
                  <Th k="institute">School</Th>
                  <Th k="status">Status</Th>
                </tr>
              </thead>
              <tbody>
                {slice.map((r) => (
                  <tr key={r.uid} className="border-b border-rule/70">
                    <th scope="row" className="uid sticky left-0 bg-paper py-2.5 pr-4 text-left font-normal text-ink-2">
                      {r.uid}
                    </th>
                    <td className="py-2.5 pr-4 font-medium text-ink">{r.name}</td>
                    <td className="py-2.5 pr-4 text-ink-2">{r.program}</td>
                    <td className="py-2.5 pr-4 text-ink-2">{r.institute}</td>
                    <td className="py-2.5 pr-4">
                      <StatusText raw={r.rawStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              Rows per page
              <select name="pageSize" value={size} onChange={(e) => setSize(Number(e.target.value))} className="control w-[72px] px-2">
                {PAGE_SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <span className="tabular-nums">
              {from.toLocaleString("en-IN")} to {to.toLocaleString("en-IN")} of {sorted.length.toLocaleString("en-IN")}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" className="btn btn--quiet" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span className="px-2 tabular-nums">
                Page {page + 1} of {pages}
              </span>
              <button type="button" className="btn btn--quiet" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
