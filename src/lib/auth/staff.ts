import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionSecret, verifySession } from "./session";

export interface Staff {
  id: string;
  name: string;
}

/** Student-form-only deployment (PUBLIC_SITE_ONLY=true): no dashboard at all. */
export function isPublicSite(): boolean {
  return process.env.PUBLIC_SITE_ONLY === "true";
}

/** The dashboard asks for a password when DASHBOARD_PASSWORD is set (the hosted site). */
export function passwordRequired(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

/** The Registrar's office: on the hosted site only with a valid password session. */
export async function getStaff(): Promise<Staff | null> {
  if (isPublicSite()) return null;
  if (!passwordRequired()) return { id: "registrar", name: "Registrar Office" };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return (await verifySession(token, sessionSecret())) ? { id: "office", name: "Registrar Office" } : null;
}
