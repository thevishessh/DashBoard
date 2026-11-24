// Creates the tables (idempotent). Run: npm run db:setup
import { readFileSync } from "node:fs";
import path from "node:path";
import { getSql } from "../src/lib/db/client";

async function main() {
  const sql = getSql();
  const file = readFileSync(path.join(process.cwd(), "src/lib/db/schema.sql"), "utf8");
  const statements = file
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
  for (const s of statements) await sql.query(s);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`;
  console.log(`Schema ready (${statements.length} statements). Tables: ${tables.map((t) => t.table_name).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
