import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth/staff";
import { listRequests } from "@/lib/requests/repo";

export const dynamic = "force-dynamic";

// Staff only: every request with the student's allow-listed details.
export async function GET() {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Sign in to see requests." }, { status: 401 });
  try {
    return NextResponse.json({ requests: await listRequests() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("listRequests failed", e);
    return NextResponse.json({ error: "Requests could not be loaded." }, { status: 503 });
  }
}
