"use server";
import { UID_PATTERN } from "@/config/columns";
import { getPublicStatus } from "@/lib/requests/repo";
import { normaliseRef } from "@/lib/requests/validate";

export type LookupState =
  | { kind: "idle" }
  | { kind: "problem"; message: string }
  | { kind: "found"; ref: string; subject: string; category: string; status: string; createdAt: string; updatedAt: string };

// The UID is posted, never put in a URL, so it stays out of history and server logs.
export async function lookupStatus(_prev: LookupState, form: FormData): Promise<LookupState> {
  const ref = normaliseRef(String(form.get("ref") ?? ""));
  const uid = String(form.get("uid") ?? "").trim().toUpperCase();
  if (!ref || !UID_PATTERN.test(uid)) return { kind: "problem", message: "Check the reference and the UID. Both are needed." };
  try {
    const r = await getPublicStatus(ref, uid);
    if (!r) return { kind: "problem", message: "No request matches this reference and UID." };
    return { kind: "found", ...r };
  } catch (e) {
    console.error("getPublicStatus failed", e);
    return { kind: "problem", message: "The status could not be loaded. Try again in a few minutes." };
  }
}
