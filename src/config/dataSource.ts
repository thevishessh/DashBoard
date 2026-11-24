// The ONE switch for where student data comes from.
//   xlsx      read the workbook in this folder (local use)
//   postgres  read the students imported into the database (online deployment; the workbook is never uploaded)
//   gsheet    Google Sheets (not wired yet)
// Set DATA_SOURCE in the environment; locally it defaults to xlsx.
import path from "node:path";

export type DataSourceKind = "xlsx" | "postgres" | "gsheet";

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
