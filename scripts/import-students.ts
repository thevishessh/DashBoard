// Copies the allow-listed student columns from the workbook into the database.
// The workbook itself never leaves this computer. Run: npm run db:import
import { getSql } from "../src/lib/db/client";
import { XlsxSource } from "../src/lib/data/xlsxSource";

async function main() {
  const { rows, audit } = await new XlsxSource().load();
  const sql = getSql();
  const col = <K extends keyof (typeof rows)[number]>(k: K) => rows.map((r) => r[k]);

  // One statement for every row: arrays are sent as parameters and unnested by Postgres.
  await sql`
    INSERT INTO students (uid, name, program, short_program, institute, cluster, semester, raw_status, fee_status, residence, imported_at)
    SELECT *, now() FROM unnest(
      ${col("uid")}::text[], ${col("name")}::text[], ${col("program")}::text[], ${col("shortProgram")}::text[],
      ${col("institute")}::text[], ${col("cluster")}::text[], ${col("semester")}::text[], ${col("rawStatus")}::text[],
      ${col("feeStatus")}::text[], ${col("residence")}::text[])
    ON CONFLICT (uid) DO UPDATE SET
      name = EXCLUDED.name, program = EXCLUDED.program, short_program = EXCLUDED.short_program,
      institute = EXCLUDED.institute, cluster = EXCLUDED.cluster, semester = EXCLUDED.semester,
      raw_status = EXCLUDED.raw_status, fee_status = EXCLUDED.fee_status, residence = EXCLUDED.residence,
      imported_at = now()`;

  const meta = { ...audit, source: audit.source.replace(/^xlsx: /, "") };
  await sql`
    INSERT INTO import_meta (id, audit, imported_at) VALUES (1, ${JSON.stringify(meta)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET audit = EXCLUDED.audit, imported_at = now()`;

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM students`;
  console.log(`Imported ${rows.length} students from the workbook; the students table now holds ${n}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
