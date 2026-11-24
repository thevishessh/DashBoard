import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth/staff";
import { lastSyncTime } from "@/lib/data";
import { hasDatabase } from "@/lib/db/client";

export const dynamic = "force-dynamic";

// Staff only: the time of the last Google Drive sync. The dashboard polls this to refresh itself when new data lands.
export async function GET() {
  if (!(await getStaff())) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ at: null }, { headers: { "Cache-Control": "no-store" } });
  try {
    return NextResponse.json({ at: await lastSyncTime() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ at: null }, { status: 503 });
  }
}
