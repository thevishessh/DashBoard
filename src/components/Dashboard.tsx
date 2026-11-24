"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ModuleId } from "@/config/modules";
import type { RequestStatus } from "@/config/requests";
import type { StatusBucket } from "@/config/status";
import type { LoadAudit, StudentRow } from "@/lib/data/types";
import {
  applyFilters,
  byFeeStatus,
  bySchool,
  facetedOptions,
  groupByStatus,
  kpis,
  pruneFilters,
  unrecognisedWords,
  type Filters,
} from "@/lib/metrics";
import { toQuery, type VerificationTab } from "@/lib/urlState";
import ComplaintsInbox from "./requests/ComplaintsInbox";
import DailyProgress from "./DailyProgress";
import DataQualityNote from "./DataQualityNote";
import PendingDocuments from "./PendingDocuments";
import FilterBar from "./FilterBar";
import OverviewHome from "./OverviewHome";
import LiveUpdates from "./LiveUpdates";
import Sidebar from "./Sidebar";
import SyncNowButton from "./SyncNowButton";
import StatusSummary from "./StatusSummary";
import StudentTable, { downloadCsv } from "./StudentTable";
import VerificationRegister from "./VerificationRegister";

const TITLES: Record<ModuleId, string> = {
  overview: "Overview",
  verification: "Document verification",
  complaints: "Complaints and requests",
  "id-cards": "ID cards",
};

export default function Dashboard({
  rows,
  audit,
  initialView,
  initialFilters,
  initialTab,
  canSignOut = false,
  canSync = false,
}: {
  rows: StudentRow[];
  audit: LoadAudit;
  initialView: ModuleId;
  initialFilters: Filters;
  initialTab: VerificationTab;
  canSignOut?: boolean;
  canSync?: boolean;
}) {
  const [view, setView] = useState<ModuleId>(initialView);
  const [tab, setTab] = useState<VerificationTab>(initialTab);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [inboxStatus, setInboxStatus] = useState<RequestStatus | "">("Open");
  const [filters, setFilters] = useState<Filters>(() => pruneFilters(rows, initialFilters));
  const deferred = useDeferredValue(filters);

  useEffect(() => {
    document.title = `${TITLES[view]} | Registrar Office`;
  }, [view]);

  // Keep the URL in step so a view can be bookmarked.
  useEffect(() => {
    const q = toQuery(view, view === "verification" ? filters : {}, tab);
    if (q !== window.location.search) window.history.replaceState(null, "", q || window.location.pathname);
  }, [view, filters, tab]);

  // Every change re-checks the other lists, e.g. a new School clears a Program from another School.
  const update = (next: Filters, changed: keyof Filters) => setFilters(pruneFilters(rows, next, changed));
  const setOne = (k: keyof Filters, v: string) => update({ ...filters, [k]: v }, k);

  const facets = useMemo(() => facetedOptions(rows, filters), [rows, filters]);
  const filtered = useMemo(() => applyFilters(rows, deferred), [rows, deferred]);
  const k = useMemo(() => kpis(filtered), [filtered]);
  const fees = useMemo(() => byFeeStatus(filtered), [filtered]);
  const residence = useMemo(() => groupByStatus(filtered, "residence"), [filtered]);
  const unknown = useMemo(() => unrecognisedWords(rows), [rows]);

  // The register drills down: schools, then the chosen school's programs.
  const drill = filters.institute ? "program" : "institute";
  const register = useMemo(
    () => (drill === "program" ? groupByStatus(filtered, "program") : bySchool(filtered)),
    [filtered, drill],
  );

  const open = (v: "verification" | "complaints", status?: string) => {
    if (v === "complaints") setInboxStatus((status as RequestStatus) ?? "Open");
    setView(v);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="lg:flex">
      <LiveUpdates since={audit.loadedAt} />
      <Sidebar active={view} onSelect={setView} canSignOut={canSignOut} />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[var(--container)] px-5 pt-6 pb-16 md:px-10 md:pt-8">
          {view === "overview" && (
            <>
              <header>
                <h1>Overview</h1>
                <p className="mt-1 text-sm text-muted">Every module at a glance. Open a module for the details.</p>
                <div className="mt-3">
                  <SyncNowButton lastSync={audit.loadedAt} canSync={canSync} />
                </div>
              </header>
              <div className="mt-8">
                <OverviewHome students={rows} onOpen={open} />
              </div>
            </>
          )}

          {view === "complaints" && (
            <>
              <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <h1>Complaints and requests</h1>
                  <p className="mt-1 text-sm text-muted">Raised by students through the QR form</p>
                </div>
                <a href="/qr" className="btn btn--primary ml-auto">
                  QR poster
                </a>
              </header>
              <div className="mt-8">
                <ComplaintsInbox key={inboxStatus} initialStatus={inboxStatus} />
              </div>
            </>
          )}

          {view === "verification" && (
            <>
              <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <h1>Document verification</h1>
                  <div className="mt-2">
                    <SyncNowButton lastSync={audit.loadedAt} canSync={canSync} />
                  </div>
                </div>
                <button type="button" className="btn btn--primary ml-auto" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0}>
                  Export CSV
                </button>
              </header>

              <div role="tablist" aria-label="Document verification" className="mt-6 flex gap-1 border-b border-rule">
                {(
                  [
                    ["summary", "Summary"],
                    ["records", "Student records"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                      tab === id ? "border-accent font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-card border border-rule bg-paper-2 p-4 md:p-5">
                <FilterBar filters={filters} facets={facets} onChange={update} />
              </div>

              <div className="mt-8">
                <StatusSummary k={k} activeStatus={filters.status} onStatus={(s: StatusBucket | "") => setOne("status", s)} />
              </div>

              {tab === "summary" ? (
                <div className="mt-10 space-y-12">
                  <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
                    <DailyProgress rows={filtered} />
                    <PendingDocuments
                      rows={filtered}
                      onShowStudents={() => {
                        setPendingOnly(true);
                        setTab("records");
                        window.scrollTo({ top: 0 });
                      }}
                    />
                  </div>
                  <VerificationRegister
                    id="register"
                    title={drill === "program" ? "Verification by program" : "Verification by school"}
                    groupLabel={drill === "program" ? "Program" : "School"}
                    rows={register}
                    onSelect={(g) => setOne(drill, g)}
                    selected={drill === "program" ? filters.program : filters.institute}
                  >
                    {drill === "program" ? (
                      <p className="text-sm text-muted">
                        In {filters.institute}.{" "}
                        <button
                          type="button"
                          className="rounded-[4px] text-accent-deep underline underline-offset-2 hover:text-ink"
                          onClick={() => update({ ...filters, institute: "", program: "" }, "institute")}
                        >
                          Back to all schools
                        </button>
                      </p>
                    ) : (
                      <p className="text-sm text-muted">Select a school to see its programs.</p>
                    )}
                  </VerificationRegister>

                  <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
                    <VerificationRegister id="fee" title="By fee status" groupLabel="Fee status" rows={fees} compact onSelect={(g) => setOne("feeStatus", g)} selected={filters.feeStatus} />
                    <VerificationRegister id="residence" title="By residence" groupLabel="Residence" rows={residence} compact onSelect={(g) => setOne("residence", g)} selected={filters.residence} />
                  </div>

                  <DataQualityNote audit={audit} unknownWords={unknown} />
                </div>
              ) : (
                <div className="mt-10">
                  <StudentTable rows={filtered} onClear={() => update({}, "search")} pendingOnly={pendingOnly} onPendingOnly={setPendingOnly} />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
