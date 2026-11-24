import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth/staff";
import { getRequestEvents, updateRequest } from "@/lib/requests/repo";
import { validateStaffUpdate } from "@/lib/requests/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const parseId = (raw: string) => (/^\d{1,12}$/.test(raw) ? Number(raw) : null);

// Staff only: the history of one request.
export async function GET(_req: Request, { params }: Ctx) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Sign in to see requests." }, { status: 401 });
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Unknown request." }, { status: 404 });
  try {
    return NextResponse.json({ events: await getRequestEvents(id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("getRequestEvents failed", e);
    return NextResponse.json({ error: "History could not be loaded." }, { status: 503 });
  }
}

// Staff only: change the status and/or add a note; the change is recorded with the staff member's name.
export async function PATCH(req: Request, { params }: Ctx) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Sign in to update requests." }, { status: 401 });
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Unknown request." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "The update could not be read." }, { status: 400 });
  }
  const v = validateStaffUpdate(body ?? {});
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });

  try {
    const row = await updateRequest(id, v.value, staff.name);
    if (!row) return NextResponse.json({ error: "Unknown request." }, { status: 404 });
    return NextResponse.json({ request: row });
  } catch (e) {
    console.error("updateRequest failed", e);
    return NextResponse.json({ error: "The update could not be saved. Try again." }, { status: 503 });
  }
}
