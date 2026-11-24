"use server";
import { getStaff } from "@/lib/auth/staff";
import { invalidateData } from "@/lib/data";

export type SyncNowResult = { ok: boolean; message: string };

/**
 * "Sync now": asks the Apps Script web app to send the Drive workbook straight away.
 * APPS_SCRIPT_URL and SYNC_TOKEN stay on the server; the browser never sees them.
 */
export async function syncNow(): Promise<SyncNowResult> {
  if (!(await getStaff())) return { ok: false, message: "Sign in first." };
  const url = process.env.APPS_SCRIPT_URL;
  const token = process.env.SYNC_TOKEN;
  if (!url || !token) return { ok: false, message: "Sync now is not set up yet (APPS_SCRIPT_URL missing)." };
  try {
    const res = await fetch(`${url}?key=${encodeURIComponent(token)}`, { cache: "no-store", redirect: "follow" });
    const text = (await res.text()).trim();
    if (!res.ok) return { ok: false, message: `Google answered ${res.status}. Try again in a minute.` };
    invalidateData();
    if (text === "sent") return { ok: true, message: "Updated from Google Drive." };
    if (text === "failed") return { ok: false, message: "The script could not send the file. Check its log in Apps Script." };
    if (text === "not allowed") return { ok: false, message: "The script refused the token. Paste the latest script again." };
    return { ok: true, message: "Checked Google Drive." };
  } catch {
    return { ok: false, message: "Could not reach Google. Check the connection and try again." };
  }
}
