"use client";
import { STATUS_LABELS, type StatusBucket } from "@/config/status";
import type { FacetKey, Facets, Filters } from "@/lib/metrics";

const SELECTS: { key: FacetKey; label: string; wide?: boolean }[] = [
  { key: "institute", label: "School", wide: true },
  { key: "program", label: "Program", wide: true },
  { key: "cluster", label: "Cluster" },
  { key: "semester", label: "Semester" },
  { key: "feeStatus", label: "Fee status" },
  { key: "residence", label: "Residence" },
];

/** Every list is narrowed by the other filters; School narrows Program, Cluster narrows School. */
export default function FilterBar({
  filters,
  facets,
  onChange,
}: {
  filters: Filters;
  facets: Facets;
  onChange: (f: Filters, changed: keyof Filters) => void;
}) {
  const set = (k: keyof Filters, v: string) => onChange({ ...filters, [k]: v }, k);
  const active = Object.values(filters).some(Boolean);

  return (
    <form role="search" aria-label="Filter students" onSubmit={(e) => e.preventDefault()} className="grid grid-cols-2 gap-x-3 gap-y-3 md:grid-cols-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)_repeat(4,minmax(0,1fr))_minmax(0,1.1fr)]">
      {SELECTS.map(({ key, label, wide }) => (
        <label key={key} className={`min-w-0 text-xs text-muted ${wide ? "col-span-2 md:col-span-2 xl:col-span-1" : ""}`}>
          {label}
          <select
            name={key}
            className="control mt-1 block w-full truncate pl-2.5 pr-7"
            value={filters[key] ?? ""}
            onChange={(e) => set(key, e.target.value)}
          >
            <option value="">All</option>
            {facets[key].map((o) => (
              <option key={o.value} value={o.value}>
                {o.value} ({o.count.toLocaleString("en-IN")})
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="min-w-0 text-xs text-muted max-md:col-span-2">
        Status
        <select name="status" className="control mt-1 block w-full pl-2.5 pr-7" value={filters.status ?? ""} onChange={(e) => set("status", e.target.value)}>
          <option value="">All</option>
          {facets.status.map((o) => (
            <option key={o.value} value={o.value}>
              {STATUS_LABELS[o.value as StatusBucket]} ({o.count.toLocaleString("en-IN")})
            </option>
          ))}
        </select>
      </label>

      <label className="col-span-2 min-w-0 text-xs text-muted md:col-span-3 xl:col-span-6">
        Search by UID or name
        <input
          name="search"
          type="search"
          autoComplete="off"
          spellCheck={false}
          className="control mt-1 block w-full px-3"
          value={filters.search ?? ""}
          onChange={(e) => set("search", e.target.value)}
        />
      </label>
      <div className="flex items-end max-md:col-span-2">
        <button type="button" className="btn btn--quiet w-full justify-center" disabled={!active} onClick={() => onChange({}, "search")}>
          Clear filters
        </button>
      </div>
    </form>
  );
}
