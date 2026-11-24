import { describe, expect, it } from "vitest";
import { readUrlState, toQuery } from "./urlState";

const parse = (q: string) => Object.fromEntries(new URLSearchParams(q.slice(1)));

describe("url state", () => {
  it("round-trips filters, view and tab", () => {
    const f = { institute: "School of Legal Studies", program: "Bachelor of Law", status: "Pending" as const, search: "26" };
    const q = toQuery("verification", f, "records");
    expect(readUrlState(parse(q))).toEqual({ view: "verification", filters: f, tab: "records" });
  });

  it("is empty for the default view with no filters", () => {
    expect(toQuery("overview", {})).toBe("");
  });

  it("only keeps the tab inside Document verification", () => {
    expect(toQuery("complaints", {}, "records")).toBe("?view=complaints");
    expect(readUrlState({ view: "verification" }).tab).toBe("summary");
  });

  it("ignores unknown statuses and disabled or unknown views", () => {
    expect(readUrlState({ status: "Done", view: "id-cards", tab: "x" })).toEqual({ view: "overview", filters: {}, tab: "summary" });
  });
});
