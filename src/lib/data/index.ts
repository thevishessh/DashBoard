import "server-only";
import { stat } from "node:fs/promises";
import { DATA_SOURCE, DRIVE_CONFIG, XLSX_CONFIG } from "@/config/dataSource";
import { syncStudents } from "@/lib/db/students";
import { getSql, hasDatabase } from "@/lib/db/client";
import { DriveXlsxSource } from "./driveSource";
import { GSheetSource } from "./gsheetSource";
import { PostgresSource } from "./postgresSource";
import { XlsxSource } from "./xlsxSource";
import type { DataSource, LoadResult } from "./types";

export function getDataSource(): DataSource {
  if (DATA_SOURCE === "postgres") return new PostgresSource();
  if (DATA_SOURCE === "gsheet") return new GSheetSource();
  if (DATA_SOURCE === "drive") return new DriveXlsxSource();
  return new XlsxSource();
}

// Parsing the workbook takes a few seconds; reuse it until the file changes.
// Kept on globalThis so dev-mode module reloads don't throw it away.
const store = globalThis as unknown as { __registrarCache?: { key: string; result: Promise<LoadResult> } };

/** When the student data was last synced into the database (ISO string); one tiny query. */
export async function lastSyncTime(): Promise<string> {
  const [m] = await getSql()`SELECT imported_at FROM import_meta WHERE id = 1`;
  return m ? new Date(m.imported_at as string).toISOString() : "never";
}

/** Forget the cached copy so the next page load reads fresh data (after "Sync now" or an incoming sync). */
export function invalidateData(): void {
  store.__registrarCache = undefined;
}

export async function loadData(): Promise<LoadResult> {
  let key: string = DATA_SOURCE;
  if (DATA_SOURCE === "xlsx") key += ":" + (await stat(XLSX_CONFIG.filePath)).mtimeMs;
  // Drive: ask whether the file changed every two minutes.
  else if (DATA_SOURCE === "drive") key += ":" + Math.floor(Date.now() / DRIVE_CONFIG.checkEveryMs);
  // Database: keyed by the time of the last sync, so a new sync is read on the very next request (every server instance).
  else if (DATA_SOURCE === "postgres") key += ":" + (await lastSyncTime());
  else key += ":" + Math.floor(Date.now() / 60_000);
  const hit = store.__registrarCache;
  if (hit?.key === key) return hit.result;
  const result = getDataSource().load();
  store.__registrarCache = { key, result };
  // Keep the online student list (used by the QR form to check UIDs) in step with Drive.
  if (DATA_SOURCE === "drive" && hasDatabase()) result.then(syncStudents).catch((e) => console.error("student sync failed", e));
  result.catch(() => {
    if (store.__registrarCache?.result === result) store.__registrarCache = undefined;
  });
  return result;
}
