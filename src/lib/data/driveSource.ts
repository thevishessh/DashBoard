import "server-only";
import ExcelJS from "exceljs";
import { DRIVE_CONFIG } from "@/config/dataSource";
import { getAccessToken } from "@/lib/google/serviceAccount";
import { parseWorkbook } from "./xlsxSource";
import type { DataSource, LoadResult } from "./types";

const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const API = "https://www.googleapis.com/drive/v3/files";

// The last parsed copy, kept across requests: the file is downloaded again only when Drive says it changed.
const store = globalThis as unknown as { __driveCopy?: { modifiedTime: string; result: LoadResult } };

/**
 * The verification workbook as it lives in Google Drive (an .xlsx edited in Sheets).
 * Needs DRIVE_FILE_ID and GOOGLE_SERVICE_ACCOUNT_JSON; the file must be shared with the service account as Viewer.
 */
export class DriveXlsxSource implements DataSource {
  constructor(private fileId = DRIVE_CONFIG.fileId) {}

  async modifiedTime(): Promise<{ modifiedTime: string; name: string }> {
    if (!this.fileId) throw new Error("DRIVE_FILE_ID is not set.");
    const token = await getAccessToken(SCOPE);
    const res = await fetch(`${API}/${encodeURIComponent(this.fileId)}?fields=modifiedTime,name&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404)
      throw new Error("The Drive file was not found. Share it with the service account email as Viewer, and check DRIVE_FILE_ID.");
    if (!res.ok) throw new Error(`Google Drive answered ${res.status} for the workbook details.`);
    return res.json();
  }

  async load(): Promise<LoadResult> {
    const meta = await this.modifiedTime();
    const prev = store.__driveCopy;
    if (prev && prev.modifiedTime === meta.modifiedTime) return prev.result;

    const token = await getAccessToken(SCOPE);
    const res = await fetch(`${API}/${encodeURIComponent(this.fileId)}?alt=media&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Downloading the workbook from Google Drive failed (${res.status}).`);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as unknown as ArrayBuffer);
    const result = parseWorkbook(wb, `Google Drive: ${meta.name}, edited ${new Date(meta.modifiedTime).toLocaleString("en-IN")}`);
    store.__driveCopy = { modifiedTime: meta.modifiedTime, result };
    return result;
  }
}
