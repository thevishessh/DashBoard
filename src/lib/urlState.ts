// Filters and the open module live in the URL so a view can be bookmarked or shared.
import type { ModuleId } from "@/config/modules";
import { MODULES } from "@/config/modules";
import { STATUS_BUCKETS, type StatusBucket } from "@/config/status";
import type { Filters } from "./metrics";

const KEYS: (keyof Filters)[] = ["institute", "program", "cluster", "semester", "status", "feeStatus", "residence", "search"];
const PARAM: Record<keyof Filters, string> = {
  institute: "school",
  program: "program",
  cluster: "cluster",
  semester: "semester",
  status: "status",
  feeStatus: "fee",
  residence: "residence",
  search: "q",
};

type Params = Record<string, string | string[] | undefined>;

/** Tabs inside the Document verification module. */
export type VerificationTab = "summary" | "records";

export function readUrlState(params: Params): { view: ModuleId; filters: Filters; tab: VerificationTab } {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const filters: Filters = {};
  for (const k of KEYS) {
    const v = one(PARAM[k]).trim();
    if (!v) continue;
    if (k === "status" && !STATUS_BUCKETS.includes(v as StatusBucket)) continue;
    (filters as Record<string, string>)[k] = v;
  }
  const v = one("view");
  const view = (MODULES.find((m) => m.id === v && m.enabled)?.id ?? "overview") as ModuleId;
  const tab: VerificationTab = one("tab") === "records" ? "records" : "summary";
  return { view, filters, tab };
}

export function toQuery(view: ModuleId, f: Filters, tab: VerificationTab = "summary"): string {
  const p = new URLSearchParams();
  if (view !== "overview") p.set("view", view);
  if (view === "verification" && tab === "records") p.set("tab", "records");
  for (const k of KEYS) if (f[k]) p.set(PARAM[k], String(f[k]));
  const s = p.toString();
  return s ? `?${s}` : "";
}
