// Copies the allow-listed student columns into the database (used by the QR form's UID check).
import type { LoadResult } from "../data/types";
import { getSql } from "./client";

let lastSynced: LoadResult | null = null;

/** Upserts every student and records the import; skips a result it has already written. */
export async function syncStudents(result: LoadResult): Promise<number> {
  if (result === lastSynced) return 0;
  const { rows, audit } = result;
  const sql = getSql();
  const col = <K extends keyof (typeof rows)[number]>(k: K) => rows.map((r) => r[k]);

  // One statement for every row: arrays are sent as parameters and unnested by Postgres.
  await sql`
    INSERT INTO students (uid, name, program, short_program, institute, cluster, semester, raw_status, fee_status, residence, pending_docs, verified_on, pending_due, imported_at)
    SELECT *, now() FROM unnest(
      ${col("uid")}::text[], ${col("name")}::text[], ${col("program")}::text[], ${col("shortProgram")}::text[],
      ${col("institute")}::text[], ${col("cluster")}::text[], ${col("semester")}::text[], ${col("rawStatus")}::text[],
      ${col("feeStatus")}::text[], ${col("residence")}::text[], ${col("pendingDocs")}::text[], ${col("verifiedOn")}::text[],
      ${col("pendingDue")}::text[])
    ON CONFLICT (uid) DO UPDATE SET
      name = EXCLUDED.name, program = EXCLUDED.program, short_program = EXCLUDED.short_program,
      institute = EXCLUDED.institute, cluster = EXCLUDED.cluster, semester = EXCLUDED.semester,
      raw_status = EXCLUDED.raw_status, fee_status = EXCLUDED.fee_status, residence = EXCLUDED.residence,
      pending_docs = EXCLUDED.pending_docs, verified_on = EXCLUDED.verified_on, pending_due = EXCLUDED.pending_due,
      imported_at = now()`;

  const meta = { ...audit, source: audit.source.replace(/^xlsx: /, "") };
  await sql`
    INSERT INTO import_meta (id, audit, imported_at) VALUES (1, ${JSON.stringify(meta)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET audit = EXCLUDED.audit, imported_at = now()`;

  lastSynced = result;
  return rows.length;
}
