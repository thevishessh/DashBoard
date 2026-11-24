import "server-only";
import ExcelJS from "exceljs";
import { stat } from "node:fs/promises";
import { XLSX_CONFIG } from "@/config/dataSource";
import {
  MASTER_COLUMNS,
  MASTER_SHEET,
  NON_PROGRAM_SHEETS,
  PROGRAM_TAB_COLUMNS,
  UID_PATTERN,
  type MasterField,
} from "@/config/columns";
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

    // 1. Program tabs: per-tab UID -> status (col AD). First match wins, like XLOOKUP.
    const tabStatus = new Map<string, Map<string, string>>();
    const anyTab = new Map<string, string>();
    for (const ws of wb.worksheets) {
      if (NON_PROGRAM_SHEETS.includes(ws.name)) continue;
      const map = new Map<string, string>();
      ws.eachRow({ includeEmpty: false }, (row) => {
        const uid = cellText(row.getCell("C").value).toUpperCase();
        if (!UID_PATTERN.test(uid) || map.has(uid)) return;
        const status = cellText(row.getCell(PROGRAM_TAB_COLUMNS.status).value);
        map.set(uid, status);
        if (!anyTab.has(uid)) anyTab.set(uid, status);
      });
      tabStatus.set(ws.name, map);
    }

    // 2. Master sheet: only allow-listed columns, found by header text.
    const master = wb.getWorksheet(MASTER_SHEET);
    if (!master) throw new Error(`Sheet "${MASTER_SHEET}" not found in ${this.filePath}`);
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

      let rawStatus = "";
      const tabMap = tab ? tabStatus.get(tab) : undefined;
      if (tabMap?.has(uid)) rawStatus = tabMap.get(uid)!;
      else if (anyTab.has(uid)) rawStatus = anyTab.get(uid)!;
      else rowsWithoutProgramTab++;

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
      });
    });

    return {
      rows,
      audit: {
        source: "xlsx: " + this.filePath.split(/[\\/]/).pop(),
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
