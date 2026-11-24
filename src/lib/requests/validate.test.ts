import { describe, expect, it } from "vitest";
import { normaliseRef, validateNewRequest, validateStaffUpdate } from "./validate";

const good = {
  uid: " 26abcd1234 ",
  category: "ID card",
  subject: "ID card not received",
  details: "I joined in July and have not received my ID card yet.",
  contactPhone: "98765 43210",
  contactEmail: "",
};

describe("validateNewRequest", () => {
  it("accepts a valid request and normalises fields", () => {
    const r = validateNewRequest(good);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.uid).toBe("26ABCD1234");
      expect(r.value.contactPhone).toBe("9876543210");
    }
  });

  it("rejects a malformed UID, unknown category and short text", () => {
    const r = validateNewRequest({ ...good, uid: "12345", category: "Parking", subject: "hi", details: "short" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["category", "details", "subject", "uid"]);
  });

  it("needs at least one way to contact the student", () => {
    const r = validateNewRequest({ ...good, contactPhone: "", contactEmail: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.contactPhone).toMatch(/mobile number or an email/);
  });

  it("checks phone and email formats", () => {
    const r = validateNewRequest({ ...good, contactPhone: "12ab", contactEmail: "not-an-email" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["contactEmail", "contactPhone"]);
  });

  it("enforces length limits", () => {
    const r = validateNewRequest({ ...good, subject: "x".repeat(121), details: "y".repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["details", "subject"]);
  });

  it("ignores fields that are not strings", () => {
    const r = validateNewRequest({ ...good, subject: { $gt: "" } as unknown as string });
    expect(r.ok).toBe(false);
  });
});

describe("validateStaffUpdate", () => {
  it("accepts a status change, a note, or both", () => {
    expect(validateStaffUpdate({ status: "Resolved" })).toEqual({ ok: true, value: { status: "Resolved", note: "" } });
    expect(validateStaffUpdate({ note: "Called the student" })).toEqual({ ok: true, value: { status: undefined, note: "Called the student" } });
  });

  it("rejects unknown statuses and empty updates", () => {
    expect(validateStaffUpdate({ status: "Done" }).ok).toBe(false);
    expect(validateStaffUpdate({}).ok).toBe(false);
  });
});

describe("normaliseRef", () => {
  it("accepts the common ways a reference is typed", () => {
    expect(normaliseRef("REQ-000012")).toBe("REQ-000012");
    expect(normaliseRef("req 12")).toBe("REQ-000012");
    expect(normaliseRef("12")).toBe("REQ-000012");
  });

  it("rejects anything else", () => {
    expect(normaliseRef("ABC-12")).toBeNull();
    expect(normaliseRef("")).toBeNull();
  });
});
