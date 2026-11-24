import "server-only";
import { stat } from "node:fs/promises";
import { DATA_SOURCE, XLSX_CONFIG } from "@/config/dataSource";
import { GSheetSource } from "./gsheetSource";
import { PostgresSource } from "./postgresSource";
import { XlsxSource } from "./xlsxSource";
import type { DataSource, LoadResult } from "./types";

export function getDataSource(): DataSource {
  if (DATA_SOURCE === "postgres") return new PostgresSource();
  if (DATA_SOURCE === "gsheet") return new GSheetSource();
  return new XlsxSource();
}

// Parsing the workbook takes a few seconds; reuse it until the file changes.
// Kept on globalThis so dev-mode module reloads don't throw it away.
const store = globalThis as unknown as { __registrarCache?: { key: string; result: Promise<LoadResult> } };

export async function loadData(): Promise<LoadResult> {
  let key: string = DATA_SOURCE;
  if (DATA_SOURCE === "xlsx") key += ":" + (await stat(XLSX_CONFIG.filePath)).mtimeMs;
  // A re-import shows up within five minutes.
  else key += ":" + Math.floor(Date.now() / 300_000);
  const hit = store.__registrarCache;
  if (hit?.key === key) return hit.result;
  const result = getDataSource().load();
  store.__registrarCache = { key, result };
  result.catch(() => {
    if (store.__registrarCache?.result === result) store.__registrarCache = undefined;
  });
  return result;
}
