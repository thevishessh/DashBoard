import "server-only";

export interface Staff {
  id: string;
  name: string;
}

/**
 * The online deployment is the student request form only (PUBLIC_SITE_ONLY=true).
 * The dashboard runs on the Registrar's computer and is never served from the public site.
 */
export function isPublicSite(): boolean {
  return process.env.PUBLIC_SITE_ONLY === "true";
}

/** The Registrar on their own computer; nobody on the public site. */
export async function getStaff(): Promise<Staff | null> {
  return isPublicSite() ? null : { id: "registrar", name: "Registrar" };
}
