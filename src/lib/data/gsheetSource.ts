import "server-only";
import { GSHEET_CONFIG } from "@/config/dataSource";
import type { DataSource, LoadResult } from "./types";

/**
 * Google Sheets source (future). Must return the same LoadResult as XlsxSource:
 * read MASTER_COLUMNS from the master tab (by header text) and column AD from the
 * program tabs via the Sheets API `values.batchGet`, using GSHEET_CONFIG credentials.
 * Only allow-listed columns may be requested.
 */
export class GSheetSource implements DataSource {
  async load(): Promise<LoadResult> {
    if (!GSHEET_CONFIG.spreadsheetId || !GSHEET_CONFIG.credentialsJson) {
      throw new Error(
        "Google Sheets source is not configured. Set GSHEET_ID and GSHEET_CREDENTIALS, or use DATA_SOURCE=xlsx.",
      );
    }
    throw new Error("Google Sheets source is not implemented yet.");
  }
}
