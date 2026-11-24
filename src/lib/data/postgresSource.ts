import "server-only";
import { getSql } from "@/lib/db/client";
import type { DataSource, LoadAudit, LoadResult, StudentRow } from "./types";

/** Reads the students imported by scripts/import-students.ts (allow-listed columns only). */
export class PostgresSource implements DataSource {
  async load(): Promise<LoadResult> {
    const sql = getSql();
    const rows = await sql`
      SELECT uid, name, program, short_program, institute, cluster, semester, raw_status, fee_status, residence
      FROM students ORDER BY uid`;
    const [meta] = await sql`SELECT audit, imported_at FROM import_meta WHERE id = 1`;
    const students: StudentRow[] = rows.map((r) => ({
      uid: String(r.uid),
      name: String(r.name),
      program: String(r.program),
      shortProgram: String(r.short_program),
      institute: String(r.institute),
      cluster: String(r.cluster),
      semester: String(r.semester),
      rawStatus: String(r.raw_status),
      feeStatus: String(r.fee_status),
      residence: String(r.residence),
    }));
    const saved = (meta?.audit ?? {}) as Partial<LoadAudit>;
    return {
      rows: students,
      audit: {
        source: saved.source ?? "database",
        sheetCount: saved.sheetCount ?? 0,
        programTabCount: saved.programTabCount ?? 0,
        rowCount: students.length,
        staleCacheRows: saved.staleCacheRows ?? 0,
        rowsWithoutProgramTab: saved.rowsWithoutProgramTab ?? 0,
        loadedAt: meta ? new Date(meta.imported_at).toISOString() : new Date().toISOString(),
      },
    };
  }
}
