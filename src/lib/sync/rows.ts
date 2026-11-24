// Live edits from the Google Sheet: validation of the row payload the Sheet's script sends. Pure; unit-tested.
import { UID_PATTERN } from "@/config/columns";

/** The only student fields a live edit may change (the same allow-list the workbook import uses). */
export const LIVE_FIELDS = [
  "rawStatus",
  "name",
  "program",
  "shortProgram",
  "institute",
  "cluster",
  "semester",
  "feeStatus",
  "residence",
  "pendingDocs",
  "verifiedOn",
  "pendingDue",
] as const;
export type LiveField = (typeof LIVE_FIELDS)[number];
export type LiveRow = { uid: string; fields: Partial<Record<LiveField, string>> };

export const MAX_ROWS = 2000;
// Fields a staff member may legitimately empty (a cleared status, notes or dates are real data).
const CLEARABLE = new Set<LiveField>(["rawStatus", "pendingDocs", "verifiedOn", "pendingDue"]);
const MAX_LEN = 300;

export function validateRowsPayload(body: unknown): { ok: true; rows: LiveRow[] } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || !Array.isArray((body as { rows?: unknown }).rows))
    return { ok: false, error: "Expected { rows: [...] }." };
  const input = (body as { rows: unknown[] }).rows;
  if (input.length === 0) return { ok: false, error: "No rows." };
  if (input.length > MAX_ROWS) return { ok: false, error: `At most ${MAX_ROWS} rows at a time.` };

  const byUid = new Map<string, LiveRow>();
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const { uid, fields } = item as { uid?: unknown; fields?: unknown };
    const id = typeof uid === "string" ? uid.trim().toUpperCase() : "";
    if (!UID_PATTERN.test(id) || !fields || typeof fields !== "object") continue;
    const clean: LiveRow["fields"] = {};
    for (const k of LIVE_FIELDS) {
      const v = (fields as Record<string, unknown>)[k];
      if (v === undefined || v === null) continue;
      const s = (typeof v === "number" ? String(v) : typeof v === "string" ? v : "").replace(/\s+/g, " ").trim();
      if (s.length > MAX_LEN) continue;
      // Identity fields may not be blanked by a stray edit; the status may (a cleared status is real data).
      if (s === "" && !CLEARABLE.has(k)) continue;
      clean[k] = s;
    }
    if (Object.keys(clean).length === 0) continue;
    const prev = byUid.get(id);
    byUid.set(id, { uid: id, fields: { ...prev?.fields, ...clean } }); // later rows win
  }
  if (byUid.size === 0) return { ok: false, error: "No valid rows (UID and at least one known field)." };
  return { ok: true, rows: [...byUid.values()] };
}
