import { describe, expect, it } from "vitest";
import { ageInDays, complaintStats, countByRequestStatus, filterInbox, type InboxItem } from "./inbox";

const item = (p: Partial<InboxItem>): InboxItem => ({
  ref: "REQ-000001",
  uid: "26ABCD0001",
  studentName: "Asha Rao",
  institute: "School of Business",
  category: "ID card",
  subject: "ID card not received",
  status: "Open",
  createdAt: "2026-11-20T10:00:00.000Z",
  ...p,
});

const items = [
  item({}),
  item({ ref: "REQ-000002", uid: "26WXYZ0002", studentName: "Ravi", category: "Fees and receipts", status: "In progress", institute: "School of Legal Studies" }),
  item({ ref: "REQ-000003", status: "Resolved", subject: "Bonafide letter" }),
];

describe("filterInbox", () => {
  it("filters by status, category and school together", () => {
    expect(filterInbox(items, { status: "Open" }).map((r) => r.ref)).toEqual(["REQ-000001"]);
    expect(filterInbox(items, { category: "ID card", status: "Resolved" }).map((r) => r.ref)).toEqual(["REQ-000003"]);
    expect(filterInbox(items, { institute: "School of Legal Studies" })).toHaveLength(1);
  });

  it("searches reference, UID, name and subject without case", () => {
    expect(filterInbox(items, { search: "req-000002" })).toHaveLength(1);
    expect(filterInbox(items, { search: "26wxyz" })).toHaveLength(1);
    expect(filterInbox(items, { search: "ASHA" })).toHaveLength(2);
    expect(filterInbox(items, { search: "bonafide" })).toHaveLength(1);
  });

  it("returns everything with no filters", () => {
    expect(filterInbox(items, {})).toHaveLength(3);
  });
});

describe("countByRequestStatus", () => {
  it("counts every status, including ones with none", () => {
    expect(countByRequestStatus(items)).toEqual({ Open: 1, "In progress": 1, Resolved: 1, Closed: 0 });
  });
});

describe("complaintStats", () => {
  const now = new Date("2026-11-24T09:00:00.000Z").getTime();
  const s = complaintStats(
    [
      item({ status: "Open", createdAt: "2026-11-23T09:00:00.000Z" }),
      item({ status: "In progress", createdAt: "2026-11-15T09:00:00.000Z", category: "Fees and receipts" }),
      item({ status: "Resolved", createdAt: "2026-11-01T09:00:00.000Z", category: "Fees and receipts" }),
      item({ status: "Open", createdAt: "2026-11-19T09:00:00.000Z", category: "Fees and receipts" }),
    ],
    now,
  );

  it("counts statuses, the last week and long waits", () => {
    expect(s.total).toBe(4);
    expect(s.byStatus).toEqual({ Open: 2, "In progress": 1, Resolved: 1, Closed: 0 });
    expect(s.lastWeek).toBe(2);
    expect(s.waitingOver3Days).toBe(2);
    expect(s.oldestOpenDays).toBe(9);
  });

  it("ranks categories with their open share", () => {
    expect(s.byCategory).toEqual([
      { category: "Fees and receipts", total: 3, open: 2 },
      { category: "ID card", total: 1, open: 1 },
    ]);
  });

  it("handles no requests", () => {
    const e = complaintStats([], now);
    expect(e.total).toBe(0);
    expect(e.oldestOpenDays).toBeNull();
    expect(e.byCategory).toEqual([]);
  });
});

describe("ageInDays", () => {
  it("counts whole days and never goes negative", () => {
    const now = new Date("2026-11-24T09:00:00.000Z").getTime();
    expect(ageInDays("2026-11-20T10:00:00.000Z", now)).toBe(3);
    expect(ageInDays("2026-11-25T10:00:00.000Z", now)).toBe(0);
  });
});
