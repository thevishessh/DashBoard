import { NextResponse } from "next/server";
import { createRequest } from "@/lib/requests/repo";
import { validateNewRequest } from "@/lib/requests/validate";

export const dynamic = "force-dynamic";

// Public: students raise a request from the QR form. Responds with a reference only,
// never with anything about the student.
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 16_000)
    return NextResponse.json({ error: "The request is too large." }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "The form could not be read. Reload the page and try again." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return NextResponse.json({ error: "The form could not be read." }, { status: 400 });

  const v = validateNewRequest(body);
  if (!v.ok) return NextResponse.json({ errors: v.errors }, { status: 422 });

  try {
    const r = await createRequest(v.value);
    if (!r.ok && r.reason === "unknown_uid")
      return NextResponse.json(
        { errors: { uid: "This UID is not in the 2026 admission list. Check it against your ID card, or visit the Registrar Office." } },
        { status: 422 },
      );
    if (!r.ok)
      return NextResponse.json(
        { error: "You have raised several requests today. Wait for the office to respond, or visit the Registrar Office." },
        { status: 429 },
      );
    return NextResponse.json({ ref: r.ref }, { status: 201 });
  } catch (e) {
    console.error("createRequest failed", e);
    return NextResponse.json({ error: "Your request could not be saved. Try again in a few minutes." }, { status: 503 });
  }
}
