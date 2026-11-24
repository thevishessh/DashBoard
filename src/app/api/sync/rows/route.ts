import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth/session";
import { invalidateData } from "@/lib/data";
import { getSql } from "@/lib/db/client";
import { parseSheetDate } from "@/lib/data/parse";
import { validateRowsPayload, type LiveField } from "@/lib/sync/rows";

export const dynamic = "force-dynamic";

const COLUMN: Record<LiveField, string> = {
  rawStatus: "raw_status",
  name: "name",
  program: "program",
  shortProgram: "short_program",
  institute: "institute",
  cluster: "cluster",
  semester: "semester",
  feeStatus: "fee_status",
  residence: "residence",
  pendingDocs: "pending_docs",
  verifiedOn: "verified_on",
  pendingDue: "pending_due",
};

// Live edits from the Google Sheet's script: only the rows that changed, applied in one statement.
// Students not yet in the database are left for the next full sync (which adds new students).
export async function POST(req: Request) {
  const expected = process.env.SYNC_TOKEN;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || !given || !safeEqual(given, expected)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  if (Number(req.headers.get("content-length") ?? 0) > 2_000_000) return NextResponse.json({ error: "Too large." }, { status: 413 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Not JSON." }, { status: 400 });
  }
  const v = validateRowsPayload(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });

  // Dates may arrive as dd/mm/yyyy or ISO; store them as YYYY-MM-DD like the full sync does.
  const asDate = new Set<LiveField>(["verifiedOn", "pendingDue"]);
  const col = (k: LiveField) =>
    v.rows.map((r) => {
      if (!(k in r.fields)) return null;
      const val = r.fields[k] as string;
      return asDate.has(k) && val ? parseSheetDate(val) : val;
    });
  try {
    const sql = getSql();
    const updated = await sql`
      UPDATE students s SET
        raw_status    = COALESCE(v.raw_status, s.raw_status),
        name          = COALESCE(v.name, s.name),
        program       = COALESCE(v.program, s.program),
        short_program = COALESCE(v.short_program, s.short_program),
        institute     = COALESCE(v.institute, s.institute),
        cluster       = COALESCE(v.cluster, s.cluster),
        semester      = COALESCE(v.semester, s.semester),
        fee_status    = COALESCE(v.fee_status, s.fee_status),
        residence     = COALESCE(v.residence, s.residence),
        pending_docs  = COALESCE(v.pending_docs, s.pending_docs),
        verified_on   = COALESCE(v.verified_on, s.verified_on),
        pending_due   = COALESCE(v.pending_due, s.pending_due),
        imported_at   = now()
      FROM unnest(
        ${v.rows.map((r) => r.uid)}::text[],
        ${col("rawStatus")}::text[], ${col("name")}::text[], ${col("program")}::text[], ${col("shortProgram")}::text[],
        ${col("institute")}::text[], ${col("cluster")}::text[], ${col("semester")}::text[], ${col("feeStatus")}::text[],
        ${col("residence")}::text[], ${col("pendingDocs")}::text[], ${col("verifiedOn")}::text[], ${col("pendingDue")}::text[]
      ) AS v(uid, ${sql.unsafe(Object.values(COLUMN).join(", "))})
      WHERE s.uid = v.uid
      RETURNING s.uid`;
    const label = `Google Sheet, live edit ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
    await sql`
      UPDATE import_meta SET imported_at = now(), audit = jsonb_set(audit, '{source}', to_jsonb(${label}::text))
      WHERE id = 1`;
    invalidateData();
    return NextResponse.json({ ok: true, updated: updated.length, unknown: v.rows.length - updated.length });
  } catch (e) {
    console.error("live sync failed", e);
    return NextResponse.json({ error: "Could not save the edit." }, { status: 503 });
  }
}
