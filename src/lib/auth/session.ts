// Password gate for the hosted dashboard: one shared password, a signed cookie, nothing stored server-side.
// Uses Web Crypto so the same code runs in the proxy and in server components.

export const SESSION_COOKIE = "rd_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(sig).toString("base64url");
}

/** Constant-time comparison of two strings. */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** "<expiry ms>.<signature>" */
export async function createSession(secret: string, now = Date.now()): Promise<string> {
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `${exp}.${await hmac(secret, exp)}`;
}

export async function verifySession(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(sig, await hmac(secret, exp));
}

/** The secret that signs sessions: AUTH_SECRET, else derived from the password so changing it signs everyone out. */
export function sessionSecret(env: { AUTH_SECRET?: string; DASHBOARD_PASSWORD?: string } = { AUTH_SECRET: process.env.AUTH_SECRET, DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD }): string {
  return env.AUTH_SECRET || (env.DASHBOARD_PASSWORD ? `pw:${env.DASHBOARD_PASSWORD}` : "");
}
