import { describe, expect, it } from "vitest";
import {
  applyFilters,
  byFeeStatus,
  bySchool,
  countByStatus,
  csvCell,
  facetedOptions,
  filterOptions,
  pruneFilters,
  verifiedRate,
  kpis,
  normalizeStatus,
  pct,
  toCsv,
  unrecognisedWords,
} from "./metrics";
import type { StudentRow } from "./data/types";

let n = 0;
function row(p: Partial<StudentRow> = {}): StudentRow {
  n++;
  return {
    uid: `26TEST${String(n).padStart(4, "0")}`,
    name: `Student ${n}`,
    program: "BCA",
    shortProgram: "BCA",
    institute: "School A",
    cluster: "Engineering",
    semester: "1",
    rawStatus: "Verified",
    feeStatus: "Active",
    residence: "Day Scholar",
    ...p,
  };
}

describe("normalizeStatus", () => {
  it("treats case and spacing variants as the same bucket", () => {
    for (const s of ["Verified", "VERIFIED", "verified", "  Verified ", "VeRiFiEd"]) {
      expect(normalizeStatus(s)).toBe("Verified");
    }
    expect(normalizeStatus("PENDING")).toBe("Pending");
    expect(normalizeStatus("Not  Verified")).toBe("Not Verified");
    expect(normalizeStatus("not verified\t")).toBe("Not Verified");
  });

  it("puts empty values in Blank, not Unknown", () => {
    for (const s of ["", "   ", null, undefined]) expect(normalizeStatus(s)).toBe("Blank");
  });

  it("puts unrecognised words in Unknown instead of dropping them", () => {
    for (const s of ["Yes", "Y", "XX", "Done", "0"]) expect(normalizeStatus(s)).toBe("Unknown");
  });
});

describe("kpis", () => {
  it("counts every row exactly once", () => {
    const rows = [
      row({ rawStatus: "Verified" }),
      row({ rawStatus: "VERIFIED" }),
      row({ rawStatus: "Pending" }),
      row({ rawStatus: "Not Verified" }),
      row({ rawStatus: "Yes" }),
      row({ rawStatus: "" }),
    ];
    const k = kpis(rows);
    expect(k.total).toBe(6);
    expect(k.counts).toEqual({ Verified: 2, Pending: 1, "Not Verified": 1, Unknown: 1, Blank: 1 });
    const sum = Object.values(k.counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(k.total);
    expect(k.percent.Verified).toBe(33.3);
  });

  it("percentages add up to ~100", () => {
    const rows = [row(), row({ rawStatus: "Pending" }), row({ rawStatus: "x" })];
    const p = Object.values(kpis(rows).percent).reduce((a, b) => a + b, 0);
    expect(p).toBeGreaterThan(99.8);
    expect(p).toBeLessThan(100.2);
  });

  it("handles an empty dataset", () => {
    const k = kpis([]);
    expect(k.total).toBe(0);
    expect(k.percent.Verified).toBe(0);
    expect(bySchool([])).toEqual([]);
    expect(pct(0, 0)).toBe(0);
  });
});

describe("applyFilters", () => {
  const rows = [
    row({ uid: "26ABCD0001", name: "Asha Rao", institute: "School A", feeStatus: "Active" }),
    row({ uid: "26ABCD0002", name: "Ravi Kumar", institute: "School B", rawStatus: "pending" }),
    row({ uid: "26WXYZ0003", name: "Meera", institute: "School A", feeStatus: "Pending Dues", semester: "2" }),
  ];

  it("combines filters with AND", () => {
    expect(applyFilters(rows, { institute: "School A" })).toHaveLength(2);
    expect(applyFilters(rows, { institute: "School A", feeStatus: "Pending Dues" })).toHaveLength(1);
    expect(applyFilters(rows, { institute: "School B", semester: "2" })).toHaveLength(0);
  });

  it("filters by normalised status", () => {
    expect(applyFilters(rows, { status: "Pending" }).map((r) => r.uid)).toEqual(["26ABCD0002"]);
  });

  it("searches UID and name case-insensitively", () => {
    expect(applyFilters(rows, { search: "26abcd" })).toHaveLength(2);
    expect(applyFilters(rows, { search: "RAVI" })).toHaveLength(1);
    expect(applyFilters(rows, { search: "  meera " })).toHaveLength(1);
  });

  it("returns all rows with empty filters", () => {
    expect(applyFilters(rows, {})).toHaveLength(3);
    expect(applyFilters(rows, { institute: "", status: "" })).toHaveLength(3);
  });
});

describe("grouping", () => {
  it("bySchool splits statuses per school and sorts by size", () => {
    const rows = [
      row({ institute: "B", rawStatus: "Pending" }),
      row({ institute: "A" }),
      row({ institute: "B", rawStatus: "NOT VERIFIED" }),
      row({ institute: "B" }),
    ];
    const g = bySchool(rows);
    expect(g[0]).toMatchObject({ group: "B", total: 3, Verified: 1, Pending: 1, "Not Verified": 1 });
    expect(g[1]).toMatchObject({ group: "A", total: 1, Verified: 1 });
  });

  it("byFeeStatus groups by StatusID", () => {
    const rows = [row({ feeStatus: "Active" }), row({ feeStatus: "Pending Dues", rawStatus: "" })];
    const g = byFeeStatus(rows);
    expect(g.map((x) => x.group).sort()).toEqual(["Active", "Pending Dues"]);
    expect(g.find((x) => x.group === "Pending Dues")!.Blank).toBe(1);
  });

  it("countByStatus and unrecognisedWords agree", () => {
    const rows = [row({ rawStatus: "Yes" }), row({ rawStatus: "Yes" }), row({ rawStatus: "Y" })];
    expect(countByStatus(rows).Unknown).toBe(3);
    expect(unrecognisedWords(rows)).toEqual([
      { word: "Yes", count: 2 },
      { word: "Y", count: 1 },
    ]);
  });

  it("filterOptions returns sorted distinct values", () => {
    const rows = [row({ semester: "2" }), row({ semester: "10" }), row({ semester: "2" })];
    expect(filterOptions(rows).semester).toEqual(["2", "10"]);
  });
});

describe("cascading filters", () => {
  const rows = [
    row({ institute: "School of Legal Studies", cluster: "Management", program: "BA LLB" }),
    row({ institute: "School of Legal Studies", cluster: "Management", program: "LLB", rawStatus: "Pending" }),
    row({ institute: "School of Legal Studies", cluster: "Management", program: "LLB" }),
    row({ institute: "School of Business", cluster: "Management", program: "MBA" }),
    row({ institute: "School of Computing", cluster: "Engineering", program: "BCA", semester: "2" }),
  ];

  it("shows only the selected school's programs", () => {
    const f = facetedOptions(rows, { institute: "School of Legal Studies" });
    expect(f.program).toEqual([
      { value: "BA LLB", count: 1 },
      { value: "LLB", count: 2 },
    ]);
  });

  it("does not narrow a dropdown by its own selection", () => {
    const f = facetedOptions(rows, { institute: "School of Legal Studies" });
    expect(f.institute.map((o) => o.value)).toEqual([
      "School of Business",
      "School of Computing",
      "School of Legal Studies",
    ]);
  });

  it("narrows schools by cluster and status counts by other filters", () => {
    const f = facetedOptions(rows, { cluster: "Engineering" });
    expect(f.institute).toEqual([{ value: "School of Computing", count: 1 }]);
    const g = facetedOptions(rows, { program: "LLB" });
    expect(g.status.find((s) => s.value === "Pending")!.count).toBe(1);
    expect(g.status.find((s) => s.value === "Verified")!.count).toBe(1);
  });

  it("keeps the full School list while a Program is selected (parents not narrowed by children)", () => {
    const f = facetedOptions(rows, { institute: "School of Legal Studies", program: "LLB" });
    expect(f.institute).toHaveLength(3);
    expect(f.cluster).toHaveLength(2);
    expect(f.program.map((o) => o.value)).toEqual(["BA LLB", "LLB"]);
  });

  it("clears a program that does not belong to the newly chosen school", () => {
    const next = pruneFilters(rows, { program: "MBA", institute: "School of Legal Studies" }, "institute");
    expect(next).toEqual({ program: "", institute: "School of Legal Studies" });
  });

  it("keeps selections that still fit", () => {
    const f = { institute: "School of Legal Studies", program: "LLB" };
    expect(pruneFilters(rows, f, "program")).toEqual(f);
  });

  it("verifiedRate is Verified / total", () => {
    expect(verifiedRate({ total: 8, Verified: 2 })).toBe(25);
    expect(verifiedRate({ total: 0, Verified: 0 })).toBe(0);
  });
});

describe("CSV", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralises formula injection", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("+1")).toBe(`"'+1"`);
    expect(csvCell("@cmd")).toBe(`"'@cmd"`);
  });

  it("writes a header plus one line per row with normalised status", () => {
    const csv = toCsv([row({ uid: "26ABCD0009", rawStatus: "VERIFIED" })]);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("UID,Name,Program,School,Verification Status,Raw Status,Fee Status,Residence");
    expect(lines[1]).toContain("26ABCD0009");
    expect(lines[1]).toContain(",Verified,VERIFIED,");
  });
});
