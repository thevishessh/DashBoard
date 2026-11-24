import { describe, expect, it } from "vitest";
import { parsePendingDocs, parseSheetDate } from "./parse";

describe("parseSheetDate", () => {
  it("reads Indian day/month/year text", () => {
    expect(parseSheetDate("05/08/2026")).toBe("2026-08-05");
    expect(parseSheetDate("5-8-26")).toBe("2026-08-05");
    expect(parseSheetDate(" 21.10.2026 ")).toBe("2026-10-21");
  });

  it("reads real dates, Excel serial days and ISO text", () => {
    expect(parseSheetDate(new Date(Date.UTC(2026, 7, 5)))).toBe("2026-08-05");
    expect(parseSheetDate(46239)).toBe("2026-08-05");
    expect(parseSheetDate("2026-08-05")).toBe("2026-08-05");
  });

  it("swaps a month-first date that would otherwise be in the future", () => {
    expect(parseSheetDate("11/12/2026", "2026-11-24")).toBe("2026-11-12");
    expect(parseSheetDate("11/12/2026", "2026-12-20")).toBe("2026-12-11");
    expect(parseSheetDate("25/12/2026", "2026-11-24")).toBe("2026-12-25");
    expect(parseSheetDate(new Date(Date.UTC(2026, 11, 11)), "2026-11-24")).toBe("2026-11-12");
  });

  it("rejects things that are not dates", () => {
    for (const v of ["", "pending", "31/02/2026", "12/13/2026", null, undefined, 5, "1/1/1990"]) expect(parseSheetDate(v)).toBe("");
  });
});

describe("parsePendingDocs", () => {
  it("treats 'all submitted' notes and fillers as nothing pending", () => {
    for (const v of ["All Documents Submitted", "ALL DOCUMENTS SUBMITTED", "All Documents is Submitted", "All documents are submitted", "All Documetns Submitted", "All Document Submitted", "-", "NO", "No", "NA", "", null])
      expect(parsePendingDocs(v)).toEqual([]);
  });

  it("splits lists and unifies spellings", () => {
    expect(parsePendingDocs("CHARACTER CERTIFICATE, TRANSFER CERTIFICATE, ANTI -RAGGING FORM")).toEqual([
      "Character certificate",
      "Transfer certificate",
      "Anti-ragging form",
    ]);
    expect(parsePendingDocs("Graduation Marksheet,")).toEqual(["Graduation marksheet"]);
    expect(parsePendingDocs("MIGRATION CERTIFICATE")).toEqual(["Migration certificate"]);
    expect(parsePendingDocs("10th marksheet & 12th Marksheet")).toEqual(["10th marksheet", "12th marksheet"]);
  });

  it("keeps unknown documents, tidied, without duplicates", () => {
    expect(parsePendingDocs("Bonafide letter, bonafide letter")).toEqual(["Bonafide letter"]);
  });
});
