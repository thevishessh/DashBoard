// Copies the allow-listed student columns from the configured source (local xlsx or the Drive file) into the database.
// Run: npm run db:import   (or with DATA_SOURCE=drive to pull from Google Drive)
import { getSql } from "../src/lib/db/client";
import { syncStudents } from "../src/lib/db/students";
import { DriveXlsxSource } from "../src/lib/data/driveSource";
import { XlsxSource } from "../src/lib/data/xlsxSource";

async function main() {
  const source = process.env.DATA_SOURCE === "drive" ? new DriveXlsxSource() : new XlsxSource();
  const result = await source.load();
  const written = await syncStudents(result);
  const [{ n }] = await getSql()`SELECT count(*)::int AS n FROM students`;
  console.log(`Imported ${written} students from ${result.audit.source}; the students table now holds ${n}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
