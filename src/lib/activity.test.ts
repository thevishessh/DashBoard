import { describe, expect, it } from "vitest";
import { dailyActivity, istDate, staffActivity, staffName, type StatusEvent } from "./activity";
import type { StudentRow } from "./data/types";

let n = 0;
const row = (p: Partial<StudentRow>): StudentRow => ({
  uid: `26TEST${String(++n).padStart(4, "0")}`, name: "", program: "", shortProgram: "", institute: "", cluster: "",
  semester: "", rawStatus: "", feeStatus: "", residence: "", pendingDocs: "", verifiedOn: "", pendingDue: "", ...p,
});

describe("dailyActivity", () => {
  it("splits each day's checked files by status", () => {
    const rows = [
      row({ rawStatus: "Verified", verifiedOn: "2026-11-26" }),
      row({ rawStatus: "PENDING", verifiedOn: "2026-11-26" }),
      row({ rawStatus: "Not Verified", verifiedOn: "2026-11-26" }),
      row({ rawStatus: "Verified", verifiedOn: "2026-11-25" }),
      row({ rawStatus: "Verified", verifiedOn: "2026-10-01" }), // outside the window
      row({ rawStatus: "Pending", verifiedOn: "" }), // no date
    ];
    const days = dailyActivity(rows, 2, "2026-11-26");
    expect(days).toEqual([
      { date: "2026-11-25", verified: 1, pending: 0, notVerified: 0, total: 1 },
      { date: "2026-11-26", verified: 1, pending: 1, notVerified: 1, total: 3 },
    ]);
  });
});

describe("staffActivity", () => {
  const ev = (p: Partial<StatusEvent>): StatusEvent => ({ uid: "26ABCD0001", from: "Not Verified", to: "Verified", actor: "a@culko.in", source: "live edit", at: "2026-11-26T05:00:00Z", ...p });
  const events = [
    ev({}),
    ev({ uid: "26ABCD0002", to: "Pending" }),
    ev({ uid: "26ABCD0003", actor: "b@culko.in", at: "2026-11-26T09:00:00Z" }),
    ev({ uid: "26ABCD0004", actor: "", source: "full sync" }),
    ev({ uid: "26ABCD0005", at: "2026-11-20T05:00:00Z" }), // before the range
    ev({ uid: "26ABCD0006", to: "" }), // cleared
  ];

  it("counts each person's changes by the status they set", () => {
    const { staff, unattributed } = staffActivity(events, "2026-11-26");
    expect(staff).toEqual([
      { actor: "a@culko.in", verified: 1, pending: 1, notVerified: 0, other: 1, total: 3, last: "2026-11-26T05:00:00Z" },
      { actor: "b@culko.in", verified: 1, pending: 0, notVerified: 0, other: 0, total: 1, last: "2026-11-26T09:00:00Z" },
    ]);
    expect(unattributed).toBe(1);
  });

  it("can be limited to the students in the current filters", () => {
    const { staff } = staffActivity(events, "2026-11-01", new Set(["26ABCD0003"]));
    expect(staff.map((s) => s.actor)).toEqual(["b@culko.in"]);
  });

  it("uses the India date and shows the name part of an email", () => {
    expect(istDate("2026-11-25T20:00:00Z")).toBe("2026-11-26");
    expect(staffName("osd.registrar@culko.in")).toBe("osd.registrar");
  });
});
