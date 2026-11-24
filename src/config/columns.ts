// Allow-list of columns. Loaders read ONLY these headers (matched by header text, case-insensitive).
// Anything not listed here (Caste, Religion, Address, DateofBirth, BloodGroup, FatherName,
// Mothername, ...) is never read into memory and so can never reach the browser.

export const MASTER_SHEET = "Student As on 04.11.2026";

/** field name in StudentRow -> header text in the master sheet */
export const MASTER_COLUMNS = {
  uid: "UID",
  name: "Name",
  program: "Program",
  shortProgram: "ShortProgramName",
  institute: "Institute",
  cluster: "Cluster",
  semester: "semester",
  cachedStatus: "Verification Status", // used only to report stale-cache rows
  feeStatus: "StatusID",
  residence: "FilterStatus",
} as const;

export type MasterField = keyof typeof MASTER_COLUMNS;

/** Program tabs: the columns read, found by header text in the header row (the row with "UID" in column C). */
export const PROGRAM_TAB_HEADERS = {
  status: /^verification status/i, // AD in most tabs, AC or AE in a few
  pendingDocs: /^pending documents$/i,
  verifiedOn: /^date of verification$/i,
  pendingDue: /^date of pending documents/i,
} as const;

/** Tabs that are not program tabs and must be skipped when building the status map. */
export const NON_PROGRAM_SHEETS = [MASTER_SHEET, "Pivot Table 2", "Summery", "Student Data Feed"];

/** UID shape seen in the file (e.g. 26ABCD1234); rows without it are titles/headers. */
export const UID_PATTERN = /^\d{2}[A-Z]{4}\d{4}$/i;
