"use client";
import { useMemo } from "react";
import { parsePendingDocs } from "@/lib/data/parse";
import type { StudentRow } from "@/lib/data/types";
import { missingDocuments, normalizeStatus } from "@/lib/metrics";

/** Which documents are holding students back, from the sheet's "Pending Documents" column. */
export default function PendingDocuments({ rows, onShowStudents }: { rows: StudentRow[]; onShowStudents: () => void }) {
  const docs = useMemo(() => missingDocuments(rows), [rows]);
  const waiting = useMemo(
    () => rows.filter((r) => normalizeStatus(r.rawStatus) !== "Verified" && parsePendingDocs(r.pendingDocs).length > 0).length,
    [rows],
  );
  const notVerified = useMemo(() => rows.filter((r) => normalizeStatus(r.rawStatus) !== "Verified").length, [rows]);
  const max = Math.max(1, ...docs.map((d) => d.students));

  return (
    <section aria-labelledby="docs-head" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="docs-head" className="text-section">
          Pending documents
        </h2>
        <p className="text-sm text-muted">
          {waiting.toLocaleString("en-IN")} of {notVerified.toLocaleString("en-IN")} unverified students have a pending document noted
        </p>
      </div>

      {docs.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No pending documents are noted for these filters.</p>
      ) : (
        <table className="mt-3 w-full border-collapse text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-rule">
              <th scope="col" className="py-2 text-left font-medium">Document</th>
              <th scope="col" className="py-2 text-right font-medium">Students</th>
              <th scope="col" className="w-[40%] py-2 pl-4 text-left font-medium">
                <span className="visually-hidden">Share</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {docs.slice(0, 10).map((d) => (
              <tr key={d.doc} className="border-b border-rule/70" data-doc={d.doc}>
                <th scope="row" className="py-2 text-left font-normal text-ink">{d.doc}</th>
                <td className="py-2 text-right font-medium tabular-nums">{d.students}</td>
                <td className="py-2 pl-4">
                  <div className="h-2 rounded-[2px] bg-paper-3">
                    <div className="h-full rounded-[2px] bg-status-pending" style={{ width: `${(d.students / max) * 100}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {docs.length > 10 && <p className="mt-2 text-xs text-muted">{docs.length - 10} more documents appear less often.</p>}
      {waiting > 0 && (
        <button type="button" className="mt-4 rounded-[4px] text-sm text-accent-deep underline underline-offset-2 hover:text-ink" onClick={onShowStudents}>
          See these students in Student records
        </button>
      )}
    </section>
  );
}
