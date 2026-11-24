import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionSecret, verifySession } from "@/lib/auth/session";

// Student pages are always open: the QR form, its status check and its API.
const STUDENT_PATHS = [/^\/request(\/|$)/, /^\/api\/requests$/];
// The Apps Script sync carries its own token (SYNC_TOKEN), checked by the route itself.
const TOKEN_PATHS = [/^\/api\/sync(\/rows)?$/];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isStudent = STUDENT_PATHS.some((re) => re.test(path));
  if (TOKEN_PATHS.some((re) => re.test(path))) return NextResponse.next();

  // Student-only deployment: nothing but the form exists.
  if (process.env.PUBLIC_SITE_ONLY === "true") {
    if (path === "/") return NextResponse.redirect(new URL("/request", req.url));
    return isStudent ? NextResponse.next() : new NextResponse("Not found", { status: 404 });
  }

  // Hosted dashboard: one shared password (DASHBOARD_PASSWORD). Without it set, the app runs open (the Registrar's own computer).
  if (!process.env.DASHBOARD_PASSWORD || isStudent || path === "/login") return NextResponse.next();
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, sessionSecret());
  if (ok) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Enter the dashboard password first." }, { status: 401 });
  const login = new URL("/login", req.url);
  if (path !== "/") login.searchParams.set("next", path + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  // Static assets and Next internals pass straight through.
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)"],
};
