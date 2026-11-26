import { describe, expect, it } from "vitest";
import { validateRowsPayload } from "./rows";

describe("validateRowsPayload", () => {
  it("keeps a valid editor email and drops anything else", () => {
    const ok = validateRowsPayload({ by: " OSD.Registrar@culko.in ", rows: [{ uid: "26ABCD1234", fields: { rawStatus: "Verified" } }] });
    expect(ok.ok && ok.by).toBe("osd.registrar@culko.in");
    const bad = validateRowsPayload({ by: "<script>", rows: [{ uid: "26ABCD1234", fields: { rawStatus: "Verified" } }] });
    expect(bad.ok && bad.by).toBe("");
  });

  it("accepts status edits and normalises UID and spacing", () => {
    const r = validateRowsPayload({ rows: [{ uid: " 26abcd1234 ", fields: { rawStatus: "  Verified " } }] });
    expect(r).toEqual({ ok: true, by: "", rows: [{ uid: "26ABCD1234", fields: { rawStatus: "Verified" } }] });
  });

  it("keeps only allow-listed fields", () => {
    const r = validateRowsPayload({ rows: [{ uid: "26ABCD1234", fields: { feeStatus: "Active", caste: "X", address: "Y" } }] });
    expect(r).toEqual({ ok: true, by: "", rows: [{ uid: "26ABCD1234", fields: { feeStatus: "Active" } }] });
  });

  it("lets the status be cleared but never blanks identity fields", () => {
    const r = validateRowsPayload({ rows: [{ uid: "26ABCD1234", fields: { rawStatus: "", name: "  " } }] });
    expect(r).toEqual({ ok: true, by: "", rows: [{ uid: "26ABCD1234", fields: { rawStatus: "" } }] });
  });

  it("merges repeated UIDs, later values winning", () => {
    const r = validateRowsPayload({
      rows: [
        { uid: "26ABCD1234", fields: { rawStatus: "Pending", feeStatus: "Active" } },
        { uid: "26abcd1234", fields: { rawStatus: "Verified" } },
      ],
    });
    expect(r).toEqual({ ok: true, by: "", rows: [{ uid: "26ABCD1234", fields: { rawStatus: "Verified", feeStatus: "Active" } }] });
  });

  it("drops header rows, bad UIDs and over-long values", () => {
    const r = validateRowsPayload({
      rows: [
        { uid: "UID", fields: { rawStatus: "Verification Status" } },
        { uid: "26ABCD1234", fields: { name: "x".repeat(301) } },
        { uid: "26ABCD9999", fields: { semester: 2 } },
      ],
    });
    expect(r).toEqual({ ok: true, by: "", rows: [{ uid: "26ABCD9999", fields: { semester: "2" } }] });
  });

  it("rejects malformed, empty or oversized payloads", () => {
    expect(validateRowsPayload(null).ok).toBe(false);
    expect(validateRowsPayload({ rows: [] }).ok).toBe(false);
    expect(validateRowsPayload({ rows: [{ uid: "bad", fields: { rawStatus: "Verified" } }] }).ok).toBe(false);
    expect(validateRowsPayload({ rows: Array.from({ length: 2001 }, () => ({ uid: "26ABCD1234", fields: { rawStatus: "x" } })) }).ok).toBe(false);
  });
});
