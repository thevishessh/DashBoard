import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth/session";
import { parseWorkbook } from "@/lib/data/xlsxSource";
import { syncStudents } from "@/lib/db/students";
import { invalidateData } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The Google Apps Script in the office's Drive posts the latest .xlsx here whenever the file changes.
// Guarded by SYNC_TOKEN; only the allow-listed columns are read from it and written to the database.
export async function POST(req: Request) {
  const expected = process.env.SYNC_TOKEN;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || !given || !safeEqual(given, expected)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });

  const size = Number(req.headers.get("content-length") ?? 0);
  if (size > 50_000_000) return NextResponse.json({ error: "The workbook is too large." }, { status: 413 });

  try {
    const bytes = Buffer.from(await req.arrayBuffer());
    if (bytes.length < 100 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      return NextResponse.json({ error: "That is not an .xlsx file." }, { status: 400 });
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);
    const modified = req.headers.get("x-file-modified");
    const label = `Google Drive${modified ? `, edited ${new Date(modified).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : ""}`;
    const result = parseWorkbook(wb, label);
    const written = await syncStudents(result);
    invalidateData();
    return NextResponse.json({ ok: true, students: written });
  } catch (e) {
    console.error("sync failed", e);
    return NextResponse.json({ error: `The workbook could not be read: ${(e as Error).message}` }, { status: 422 });
  }
}
