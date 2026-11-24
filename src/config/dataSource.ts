// The ONE switch for where student data comes from.
//   xlsx      read the workbook in this folder (local use)
//   postgres  read the students imported into the database (online deployment; the workbook is never uploaded)
//   drive     the .xlsx in Google Drive that the office edits in Sheets (needs DRIVE_FILE_ID and GOOGLE_SERVICE_ACCOUNT_JSON)
//   gsheet    a native Google Sheet (not wired yet)
// Set DATA_SOURCE in the environment; locally it defaults to xlsx.
import path from "node:path";

export type DataSourceKind = "xlsx" | "drive" | "postgres" | "gsheet";

export const DATA_SOURCE: DataSourceKind =
  (process.env.DATA_SOURCE as DataSourceKind | undefined) ?? "xlsx";

export const XLSX_CONFIG = {
  filePath: process.env.XLSX_PATH ?? path.join(process.cwd(), "Verification Student 2026.xlsx"),
};

export const GSHEET_CONFIG = {
  spreadsheetId: process.env.GSHEET_ID ?? "",
  // Service account credentials (JSON) – supplied via env when Google Sheets is enabled.
  credentialsJson: process.env.GSHEET_CREDENTIALS ?? "",
};

export const DRIVE_CONFIG = {
  fileId: process.env.DRIVE_FILE_ID ?? "",
  /** How often to ask Drive whether the file changed. */
  checkEveryMs: 120_000,
};
