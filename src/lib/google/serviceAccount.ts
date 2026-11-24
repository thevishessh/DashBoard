import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Minimal Google service-account sign-in (OAuth 2.0 JWT bearer flow), no SDK needed.
// The key JSON comes from GOOGLE_SERVICE_ACCOUNT_JSON; it is only ever used on the server.

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export function parseServiceAccount(json: string | undefined): ServiceAccountKey {
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set.");
  let key: ServiceAccountKey;
  try {
    key = JSON.parse(json);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the whole key file as one line.");
  }
  if (!key.client_email || !key.private_key) throw new Error("The service account key is missing client_email or private_key.");
  return { ...key, private_key: key.private_key.replace(/\\n/g, "\n") };
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** Signed assertion for the token endpoint (exported for tests). */
export function buildAssertion(key: ServiceAccountKey, scope: string, now = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: key.client_email, scope, aud: key.token_uri ?? "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${b64url(signer.sign(key.private_key))}`;
}

/**
 * The key as JSON text: GOOGLE_SERVICE_ACCOUNT_JSON (hosting), or the downloaded key file itself,
 * GOOGLE_SERVICE_ACCOUNT_FILE (default: google-service-account.json in the project folder; never committed or uploaded).
 */
function readKeyJson(): string | undefined {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_FILE ?? join(process.cwd(), "google-service-account.json");
  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
}

let cached: { token: string; expires: number; scope: string } | null = null;

export async function getAccessToken(scope: string): Promise<string> {
  if (cached && cached.scope === scope && cached.expires > Date.now() + 60_000) return cached.token;
  const key = parseServiceAccount(readKeyJson());
  const res = await fetch(key.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: buildAssertion(key, scope) }),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token) throw new Error(`Google sign-in for the service account failed: ${body.error_description ?? res.status}`);
  cached = { token: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000, scope };
  return body.access_token;
}
