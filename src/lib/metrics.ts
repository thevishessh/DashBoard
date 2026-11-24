// All counting logic lives here: pure functions, no I/O, unit-tested in metrics.test.ts.
import { STATUS_ALIASES, STATUS_BUCKETS, type StatusBucket } from "@/config/status";
import { parsePendingDocs } from "@/lib/data/parse";
import type { StudentRow } from "@/lib/data/types";

/** Case/space-insensitive status match. Empty -> Blank; unrecognised -> Unknown (never dropped). */
export function normalizeStatus(raw: string | null | undefined): StatusBucket {
  const key = (raw ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (key === "") return "Blank";
  return STATUS_ALIASES[key] ?? "Unknown";
}

export interface Filters {
  institute?: string;
  program?: string;
  cluster?: string;
  semester?: string;
  status?: StatusBucket | "";
  feeStatus?: string;
  residence?: string;
  search?: string; // UID or name, case-insensitive substring
}

export function applyFilters(rows: StudentRow[], f: Filters): StudentRow[] {
  const q = (f.search ?? "").trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!f.institute || r.institute === f.institute) &&
      (!f.program || r.program === f.program) &&
      (!f.cluster || r.cluster === f.cluster) &&
      (!f.semester || r.semester === f.semester) &&
      (!f.status || normalizeStatus(r.rawStatus) === f.status) &&
      (!f.feeStatus || r.feeStatus === f.feeStatus) &&
      (!f.residence || r.residence === f.residence) &&
      (!q || r.uid.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)),
  );
}

export type StatusCounts = Record<StatusBucket, number>;

export function emptyCounts(): StatusCounts {
  return Object.fromEntries(STATUS_BUCKETS.map((b) => [b, 0])) as StatusCounts;
}

export function countByStatus(rows: StudentRow[]): StatusCounts {
  const c = emptyCounts();
  for (const r of rows) c[normalizeStatus(r.rawStatus)]++;
  return c;
}

/** Percentage of total with one decimal; 0 when total is 0. */
export function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

export interface Kpis {
  total: number;
  counts: StatusCounts;
  percent: Record<StatusBucket, number>;
}

export function kpis(rows: StudentRow[]): Kpis {
  const counts = countByStatus(rows);
  const total = rows.length;
  const percent = Object.fromEntries(
    STATUS_BUCKETS.map((b) => [b, pct(counts[b], total)]),
  ) as Record<StatusBucket, number>;
  return { total, counts, percent };
}

export type GroupRow = { group: string; total: number } & StatusCounts;

/** Status counts grouped by any field, sorted by total desc then name. */
export function groupByStatus(rows: StudentRow[], field: keyof StudentRow): GroupRow[] {
  const groups = new Map<string, GroupRow>();
  for (const r of rows) {
    const g = r[field] || "(blank)";
    let row = groups.get(g);
    if (!row) {
      row = { group: g, total: 0, ...emptyCounts() };
      groups.set(g, row);
    }
    row.total++;
    row[normalizeStatus(r.rawStatus)]++;
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.group.localeCompare(b.group));
}

export const bySchool = (rows: StudentRow[]) => groupByStatus(rows, "institute");
export const byFeeStatus = (rows: StudentRow[]) => groupByStatus(rows, "feeStatus");

/** Raw words that fell into Unknown, with counts, so nothing is silently miscounted. */
export function unrecognisedWords(rows: StudentRow[]): { word: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (normalizeStatus(r.rawStatus) === "Unknown") m.set(r.rawStatus, (m.get(r.rawStatus) ?? 0) + 1);
  }
  return [...m.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
}

export interface FilterOptions {
  institute: string[];
  program: string[];
  cluster: string[];
  semester: string[];
  feeStatus: string[];
  residence: string[];
}

export function filterOptions(rows: StudentRow[]): FilterOptions {
  const uniq = (f: keyof StudentRow) =>
    [...new Set(rows.map((r) => r[f]).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  return {
    institute: uniq("institute"),
    program: uniq("program"),
    cluster: uniq("cluster"),
    semester: uniq("semester"),
    feeStatus: uniq("feeStatus"),
    residence: uniq("residence"),
  };
}

// ---------- Cascading (faceted) filters ----------

export const FACET_KEYS = ["institute", "program", "cluster", "semester", "feeStatus", "residence"] as const;
export type FacetKey = (typeof FACET_KEYS)[number];
export type FacetOption = { value: string; count: number };
export type Facets = Record<FacetKey, FacetOption[]> & { status: FacetOption[] };

/**
 * Options for each dropdown, limited by every OTHER active filter.
 * E.g. with School = "School of Legal Studies", the Program list holds only that school's programs.
 * Each option carries the number of students it would show.
 */
// Hierarchy Cluster > School > Program: a parent list is never narrowed by its children,
// so the user can always switch School while a Program is selected (the Program is then cleared).
const IGNORE_FOR: Partial<Record<FacetKey, FacetKey[]>> = {
  cluster: ["institute", "program"],
  institute: ["program"],
};

export function facetedOptions(rows: StudentRow[], f: Filters): Facets {
  const out = {} as Facets;
  for (const k of FACET_KEYS) {
    const m = new Map<string, number>();
    const ignore = Object.fromEntries([k, ...(IGNORE_FOR[k] ?? [])].map((x) => [x, ""]));
    for (const r of applyFilters(rows, { ...f, ...ignore })) {
      if (r[k]) m.set(r[k], (m.get(r[k]) ?? 0) + 1);
    }
    out[k] = [...m.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  }
  const sc = countByStatus(applyFilters(rows, { ...f, status: "" }));
  out.status = STATUS_BUCKETS.map((b) => ({ value: b, count: sc[b] }));
  return out;
}

/**
 * After the user changes `changed`, clear any other selection that no longer fits
 * (e.g. a Program from another School). The field the user just changed is never cleared.
 */
export function pruneFilters(rows: StudentRow[], f: Filters, changed?: keyof Filters): Filters {
  let cur: Filters = { ...f };
  for (let i = 0; i <= FACET_KEYS.length; i++) {
    const facets = facetedOptions(rows, cur);
    const bad = FACET_KEYS.find(
      (k) => k !== changed && cur[k] && !facets[k].some((o) => o.value === cur[k]),
    );
    if (!bad) return cur;
    cur = { ...cur, [bad]: "" };
  }
  return cur;
}

/** Share of rows that are Verified, 0–100 with one decimal. */
export function verifiedRate(g: { total: number; Verified: number }): number {
  return pct(g.Verified, g.total);
}

// ---------- Daily progress and pending documents ----------

export interface DayPoint {
  date: string; // YYYY-MM-DD
  verified: number; // newly verified that day
  total: number; // verified so far, up to and including that day
}

/** Day-by-day verifications from the "Date of Verification" column, ending today (IST), `days` long. */
export function dailyVerified(rows: StudentRow[], days = 30, today = istToday()): { series: DayPoint[]; undated: number } {
  const perDay = new Map<string, number>();
  let undated = 0;
  for (const r of rows) {
    if (normalizeStatus(r.rawStatus) !== "Verified") continue;
    if (!r.verifiedOn) {
      undated++;
      continue;
    }
    perDay.set(r.verifiedOn, (perDay.get(r.verifiedOn) ?? 0) + 1);
  }
  const start = addDays(today, -(days - 1));
  let running = 0;
  for (const [d, n] of perDay) if (d < start) running += n;
  const series: DayPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const n = perDay.get(date) ?? 0;
    running += n;
    series.push({ date, verified: n, total: running });
  }
  return { series, undated };
}

/** Newly verified in the 7 days ending today, and in the 7 days before that. */
export function weeklyVerified(rows: StudentRow[], today = istToday()): { thisWeek: number; lastWeek: number } {
  const { series } = dailyVerified(rows, 14, today);
  const sum = (a: DayPoint[]) => a.reduce((s, p) => s + p.verified, 0);
  return { thisWeek: sum(series.slice(7)), lastWeek: sum(series.slice(0, 7)) };
}

/** Documents still pending across students who are not yet verified, most common first. */
export function missingDocuments(rows: StudentRow[]): { doc: string; students: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (normalizeStatus(r.rawStatus) === "Verified") continue;
    for (const d of parsePendingDocs(r.pendingDocs)) m.set(d, (m.get(d) ?? 0) + 1);
  }
  return [...m.entries()].map(([doc, students]) => ({ doc, students })).sort((a, b) => b.students - a.students || a.doc.localeCompare(b.doc));
}

/** Today's date in India (YYYY-MM-DD). */
export function istToday(now = Date.now()): string {
  return new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Quote a CSV cell; neutralise spreadsheet formula injection (= + - @ tab CR). */
export function csvCell(value: string): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return /[",\r\n]/.test(v) || v !== value ? `"${v.replace(/"/g, '""')}"` : v;
}

export const CSV_COLUMNS: { header: string; get: (r: StudentRow) => string }[] = [
  { header: "UID", get: (r) => r.uid },
  { header: "Name", get: (r) => r.name },
  { header: "Program", get: (r) => r.program },
  { header: "School", get: (r) => r.institute },
  { header: "Verification Status", get: (r) => normalizeStatus(r.rawStatus) },
  { header: "Raw Status", get: (r) => r.rawStatus },
  { header: "Verified On", get: (r) => r.verifiedOn },
  { header: "Pending Documents", get: (r) => parsePendingDocs(r.pendingDocs).join("; ") },
  { header: "Pending Documents Due", get: (r) => r.pendingDue },
  { header: "Fee Status", get: (r) => r.feeStatus },
  { header: "Residence", get: (r) => r.residence },
];

export function toCsv(rows: StudentRow[]): string {
  const lines = [CSV_COLUMNS.map((c) => csvCell(c.header)).join(",")];
  for (const r of rows) lines.push(CSV_COLUMNS.map((c) => csvCell(c.get(r))).join(","));
  return lines.join("\r\n") + "\r\n";
}
