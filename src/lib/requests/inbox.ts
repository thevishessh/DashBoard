// Pure helpers for the staff inbox: filtering and counting. Unit-tested.
import { REQUEST_STATUSES, type RequestStatus } from "@/config/requests";

export interface InboxItem {
  ref: string;
  uid: string;
  studentName: string;
  institute: string;
  category: string;
  subject: string;
  status: RequestStatus;
  createdAt: string;
}

export interface InboxFilters {
  status?: RequestStatus | "";
  category?: string;
  institute?: string;
  search?: string;
}

export function filterInbox<T extends InboxItem>(items: T[], f: InboxFilters): T[] {
  const q = (f.search ?? "").trim().toLowerCase();
  return items.filter(
    (r) =>
      (!f.status || r.status === f.status) &&
      (!f.category || r.category === f.category) &&
      (!f.institute || r.institute === f.institute) &&
      (!q ||
        r.ref.toLowerCase().includes(q) ||
        r.uid.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q)),
  );
}

export function countByRequestStatus(items: InboxItem[]): Record<RequestStatus, number> {
  const c = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0])) as Record<RequestStatus, number>;
  for (const r of items) if (r.status in c) c[r.status]++;
  return c;
}

export interface ComplaintStats {
  total: number;
  byStatus: Record<RequestStatus, number>;
  /** Requests raised in the last 7 days. */
  lastWeek: number;
  /** Open or in progress for more than 3 days. */
  waitingOver3Days: number;
  /** Age in days of the oldest request still open or in progress; null when none. */
  oldestOpenDays: number | null;
  /** Categories by number of requests, largest first. */
  byCategory: { category: string; total: number; open: number }[];
}

const isOpen = (s: RequestStatus) => s === "Open" || s === "In progress";

/** Headline numbers for the Overview. */
export function complaintStats(items: InboxItem[], now = Date.now()): ComplaintStats {
  const byStatus = countByRequestStatus(items);
  let lastWeek = 0;
  let waitingOver3Days = 0;
  let oldestOpenDays: number | null = null;
  const cats = new Map<string, { total: number; open: number }>();
  for (const r of items) {
    const age = ageInDays(r.createdAt, now);
    if (now - new Date(r.createdAt).getTime() <= 7 * 86_400_000) lastWeek++;
    const c = cats.get(r.category) ?? { total: 0, open: 0 };
    c.total++;
    if (isOpen(r.status)) {
      c.open++;
      if (age > 3) waitingOver3Days++;
      oldestOpenDays = Math.max(oldestOpenDays ?? 0, age);
    }
    cats.set(r.category, c);
  }
  const byCategory = [...cats.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
  return { total: items.length, byStatus, lastWeek, waitingOver3Days, oldestOpenDays, byCategory };
}

/** Whole days a request has been waiting, for open work only. */
export function ageInDays(createdAt: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 86_400_000));
}
