// Daily activity and who did it. Pure; unit-tested in activity.test.ts.
import type { StudentRow } from "@/lib/data/types";
import { addDays, istToday, normalizeStatus } from "@/lib/metrics";

export interface StatusEvent {
  uid: string;
  from: string;
  to: string;
  actor: string; // editor's email, "" when unknown (full sync)
  source: string; // "live edit" | "full sync"
  at: string; // ISO timestamp
}

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  verified: number;
  pending: number;
  notVerified: number;
  total: number;
}

/**
 * Files checked per day, by the sheet's "Date of Verification", split by each student's current status.
 * The date is filled in for pending students too, so this is the office's daily work, not only verifications.
 */
export function dailyActivity(rows: StudentRow[], days = 30, today = istToday()): ActivityDay[] {
  const start = addDays(today, -(days - 1));
  const byDay = new Map<string, ActivityDay>();
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    byDay.set(date, { date, verified: 0, pending: 0, notVerified: 0, total: 0 });
  }
  for (const r of rows) {
    const d = r.verifiedOn ? byDay.get(r.verifiedOn) : undefined;
    if (!d) continue;
    const s = normalizeStatus(r.rawStatus);
    if (s === "Verified") d.verified++;
    else if (s === "Pending") d.pending++;
    else d.notVerified++;
    d.total++;
  }
  return [...byDay.values()];
}

export interface StaffActivity {
  actor: string; // email
  verified: number;
  pending: number;
  notVerified: number;
  other: number; // cleared or unrecognised statuses
  total: number;
  last: string; // ISO timestamp of the latest change
}

/** India date (YYYY-MM-DD) of an ISO timestamp. */
export const istDate = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/**
 * Status changes per staff member, for events on or after `fromDate` (India date).
 * Only changes with a known editor count; full-sync changes have no name and are reported separately.
 */
export function staffActivity(events: StatusEvent[], fromDate: string, uids?: Set<string>): { staff: StaffActivity[]; unattributed: number } {
  const m = new Map<string, StaffActivity>();
  let unattributed = 0;
  for (const e of events) {
    if (istDate(e.at) < fromDate) continue;
    if (uids && !uids.has(e.uid)) continue;
    if (!e.actor) {
      unattributed++;
      continue;
    }
    const a = m.get(e.actor) ?? { actor: e.actor, verified: 0, pending: 0, notVerified: 0, other: 0, total: 0, last: e.at };
    const s = normalizeStatus(e.to);
    if (s === "Verified") a.verified++;
    else if (s === "Pending") a.pending++;
    else if (s === "Not Verified") a.notVerified++;
    else a.other++;
    a.total++;
    if (e.at > a.last) a.last = e.at;
    m.set(e.actor, a);
  }
  const staff = [...m.values()].sort((x, y) => y.total - x.total || x.actor.localeCompare(y.actor));
  return { staff, unattributed };
}

/** "osd.registrar@culko.in" -> "osd.registrar" for display. */
export const staffName = (email: string) => email.split("@")[0];
