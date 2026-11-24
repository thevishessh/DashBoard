import { NextResponse, type NextRequest } from "next/server";

// On the public site (PUBLIC_SITE_ONLY=true) only the student pages exist.
// Everything else (dashboard, inbox, QR poster, staff API) answers 404, so there is nothing to find or sign in to.
const STUDENT_PATHS = [/^\/request(\/|$)/, /^\/api\/requests$/];

export default function proxy(req: NextRequest) {
  if (process.env.PUBLIC_SITE_ONLY !== "true") return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (path === "/") return NextResponse.redirect(new URL("/request", req.url));
  if (STUDENT_PATHS.some((re) => re.test(path))) return NextResponse.next();
  return new NextResponse("Not found", { status: 404 });
}

export const config = {
  // Static assets and Next internals pass straight through.
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)"],
};
