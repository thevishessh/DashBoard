import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

/** The sender's network, hashed with a server secret: enough to rate-limit, without storing the IP address. */
function networkHash(req: Request): string {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  if (!ip) return "";
  const salt = process.env.AUTH_SECRET || process.env.SYNC_TOKEN || "registrar";
  return createHash("sha256").update(`${salt}:${ip}`).digest("base64url").slice(0, 32);
}
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
    const r = await createRequest(v.value, networkHash(req));
    if (!r.ok) {
      const message =
        r.reason === "too_many_network"
          ? "Too many requests from this network right now. Try again in a few minutes."
          : "You have already raised 2 requests today. Wait for the office to respond, or visit the Registrar Office.";
      return NextResponse.json({ error: message }, { status: 429 });
    }
    return NextResponse.json({ ref: r.ref }, { status: 201 });
  } catch (e) {
    console.error("createRequest failed", e);
    return NextResponse.json({ error: "Your request could not be saved. Try again in a few minutes." }, { status: 503 });
  }
}
