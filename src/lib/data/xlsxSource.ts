import "server-only";
import ExcelJS from "exceljs";
import { stat } from "node:fs/promises";
import { XLSX_CONFIG } from "@/config/dataSource";
import {
  MASTER_COLUMNS,
  MASTER_SHEET,
  NON_PROGRAM_SHEETS,
  PROGRAM_TAB_HEADERS,
  UID_PATTERN,
  type MasterField,
} from "@/config/columns";
import { parseSheetDate } from "./parse";
import type { DataSource, LoadResult, StudentRow } from "./types";

/** Plain text of any exceljs cell value (formula results, rich text, numbers...). */
export function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("").trim();
    if ("result" in value) return cellText((value.result ?? null) as ExcelJS.CellValue);
    if ("formula" in value || "sharedFormula" in value) return "";
    if ("text" in value) return String(value.text).trim();
    if ("error" in value) return String(value.error);
  }
  return "";
}

/** Program-tab name referenced by an XLOOKUP formula, e.g. XLOOKUP(C2,'BTech CSE'!C:C,...) */
function tabFromFormula(formula: string | undefined): string | undefined {
  if (!formula) return undefined;
  const m = /XLOOKUP\(\s*\$?C\$?\d+\s*,\s*'?([^'!]+)'?!/i.exec(formula);
  return m?.[1];
}

function formulaOf(cell: ExcelJS.Cell): string | undefined {
  const v = cell.value as { formula?: string; sharedFormula?: string } | null;
  if (v && typeof v === "object" && "formula" in v && v.formula) return v.formula;
  return undefined;
}

export class XlsxSource implements DataSource {
  constructor(private filePath = XLSX_CONFIG.filePath) {}

  async load(): Promise<LoadResult> {
    await stat(this.filePath); // clear error if the file is missing
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(this.filePath);
    return parseWorkbook(wb, "xlsx: " + this.filePath.split(/[\\/]/).pop());
  }
}

interface TabEntry {
  status: string;
  pendingDocs: string;
  verifiedOn: string;
  pendingDue: string;
}

/** A cell's underlying value (formula results unwrapped), for date parsing. */
function rawValue(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === "object" && !(v instanceof Date) && "result" in v) return (v as { result?: unknown }).result;
  if (v && typeof v === "object" && "richText" in v) return cellText(v);
  return v;
}

/** Header row (the one with "UID" in column C) and the columns this dashboard reads, by header text. */
export function findTabColumns(ws: ExcelJS.Worksheet) {
  let headerRow = 0;
  for (let r = 1; r <= 25 && !headerRow; r++) if (/^uid$/i.test(cellText(ws.getRow(r).getCell("C").value))) headerRow = r;
  const cols = { headerRow, status: 0, pendingDocs: 0, verifiedOn: 0, pendingDue: 0 };
  if (headerRow) {
    ws.getRow(headerRow).eachCell((cell, i) => {
      const t = cellText(cell.value);
      for (const [key, re] of Object.entries(PROGRAM_TAB_HEADERS) as [keyof typeof PROGRAM_TAB_HEADERS, RegExp][])
        if (!cols[key] && re.test(t)) cols[key] = i;
    });
  }
  // The master sheet's XLOOKUP reads column AD; fall back to it when no header is found.
  if (!cols.status) cols.status = 30;
  return cols;
}

/** Reads the allow-listed data out of a loaded workbook (local file or a copy downloaded from Drive). */
export function parseWorkbook(wb: ExcelJS.Workbook, sourceLabel: string): LoadResult {
  {

    // 1. Program tabs: per-tab UID -> status, pending documents and dates. Columns are found by their
    //    header text (the status is in AD in most tabs but AC or AE in a few). First match wins, like XLOOKUP.
    const tabStatus = new Map<string, Map<string, TabEntry>>();
    const anyTab = new Map<string, TabEntry>();
    for (const ws of wb.worksheets) {
      if (NON_PROGRAM_SHEETS.includes(ws.name)) continue;
      const cols = findTabColumns(ws);
      const map = new Map<string, TabEntry>();
      ws.eachRow({ includeEmpty: false }, (row, r) => {
        if (r <= cols.headerRow) return;
        const uid = cellText(row.getCell("C").value).toUpperCase();
        if (!UID_PATTERN.test(uid) || map.has(uid)) return;
        const entry: TabEntry = {
          status: cellText(row.getCell(cols.status).value),
          pendingDocs: cols.pendingDocs ? cellText(row.getCell(cols.pendingDocs).value) : "",
          verifiedOn: cols.verifiedOn ? parseSheetDate(rawValue(row.getCell(cols.verifiedOn).value)) : "",
          pendingDue: cols.pendingDue ? parseSheetDate(rawValue(row.getCell(cols.pendingDue).value)) : "",
        };
        map.set(uid, entry);
        if (!anyTab.has(uid)) anyTab.set(uid, entry);
      });
      tabStatus.set(ws.name, map);
    }

    // 2. Master sheet: only allow-listed columns, found by header text.
    const master = wb.getWorksheet(MASTER_SHEET);
    if (!master) throw new Error(`Sheet "${MASTER_SHEET}" not found in ${sourceLabel}`);
    const colOf = {} as Record<MasterField, number>;
    const header = master.getRow(1);
    for (const [field, label] of Object.entries(MASTER_COLUMNS) as [MasterField, string][]) {
      let found = 0;
      header.eachCell((cell, col) => {
        if (!found && cellText(cell.value).toLowerCase() === label.toLowerCase()) found = col;
      });
      if (!found) throw new Error(`Column "${label}" not found in "${MASTER_SHEET}"`);
      colOf[field] = found;
    }

    // Shared formulas only carry the formula on their master cell; remember tab per formula.
    const rows: StudentRow[] = [];
    let staleCacheRows = 0;
    let rowsWithoutProgramTab = 0;
    master.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const get = (f: MasterField) => cellText(row.getCell(colOf[f]).value);
      const uid = get("uid").toUpperCase();
      if (!uid) return;

      const statusCell = row.getCell(colOf.cachedStatus);
      const sharedMaster = (statusCell.value as { sharedFormula?: string } | null)?.sharedFormula;
      const formula =
        formulaOf(statusCell) ?? (sharedMaster ? formulaOf(master.getCell(sharedMaster)) : undefined);
      const tab = tabFromFormula(formula);

      const tabMap = tab ? tabStatus.get(tab) : undefined;
      const entry = tabMap?.get(uid) ?? anyTab.get(uid);
      if (!entry) rowsWithoutProgramTab++;
      let rawStatus = entry?.status ?? "";

      if (rawStatus !== get("cachedStatus")) staleCacheRows++;
      // XLOOKUP of an empty cell yields 0 in Excel; treat that as blank.
      if (rawStatus === "0") rawStatus = "";

      rows.push({
        uid,
        name: get("name"),
        program: get("program"),
        shortProgram: get("shortProgram"),
        institute: get("institute"),
        cluster: get("cluster"),
        semester: get("semester"),
        rawStatus,
        feeStatus: get("feeStatus"),
        residence: get("residence"),
        pendingDocs: entry?.pendingDocs ?? "",
        verifiedOn: entry?.verifiedOn ?? "",
        pendingDue: entry?.pendingDue ?? "",
      });
    });

    return {
      rows,
      audit: {
        source: sourceLabel,
        sheetCount: wb.worksheets.length,
        programTabCount: tabStatus.size,
        rowCount: rows.length,
        staleCacheRows,
        rowsWithoutProgramTab,
        loadedAt: new Date().toISOString(),
      },
    };
  }
}
