"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { REQUEST_CATEGORIES, REQUEST_STATUSES, LIMITS, type RequestStatus } from "@/config/requests";
import type { RequestEvent, RequestRow } from "@/lib/requests/repo";
import { ageInDays, countByRequestStatus, filterInbox, type InboxFilters } from "@/lib/requests/inbox";

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; rows: RequestRow[] };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function ComplaintsInbox({ initialStatus = "Open" }: { initialStatus?: RequestStatus | "" }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [filters, setFilters] = useState<InboxFilters>({ status: initialStatus });
  const [openId, setOpenId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/requests", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setLoad({ kind: "error", message: body.error ?? "Requests could not be loaded." });
      setLoad({ kind: "ready", rows: body.requests });
    } catch {
      setLoad({ kind: "error", message: "No connection. Check the network and try again." });
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const rows = load.kind === "ready" ? load.rows : [];
  const counts = useMemo(() => countByRequestStatus(rows), [rows]);
  const shown = useMemo(() => filterInbox(rows, filters), [rows, filters]);
  const schools = useMemo(() => [...new Set(rows.map((r) => r.institute))].sort(), [rows]);
  const set = (k: keyof InboxFilters, v: string) => {
    setOpenId(null);
    setFilters((f) => ({ ...f, [k]: v }));
  };

  const replaceRow = (row: RequestRow) =>
    setLoad((l) => (l.kind === "ready" ? { kind: "ready", rows: l.rows.map((r) => (r.id === row.id ? row : r)) } : l));

  return (
    <div className="space-y-8">
      <section aria-labelledby="queue-head" className="border-b border-rule pb-8">
        <h2 id="queue-head" className="visually-hidden">
          Requests by status
        </h2>
        <ul className="flex flex-wrap gap-x-10 gap-y-4" aria-label="Filter by status">
          {REQUEST_STATUSES.map((s) => {
            const on = filters.status === s;
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`${s}: ${load.kind === "ready" ? counts[s] : 0} requests`}
                  onClick={() => set("status", on ? "" : s)}
                  className={`row-link -mx-2 rounded-input px-2 py-1 text-left ${on ? "bg-accent-soft" : ""}`}
                >
                  <span className="block text-sm text-muted">{s}</span>
                  <span className="block font-display text-[2.25rem] leading-none tracking-[-0.03em] tabular-nums" data-count={s}>
                    {load.kind === "ready" ? counts[s].toLocaleString("en-IN") : "0"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <form role="search" aria-label="Filter requests" onSubmit={(e) => e.preventDefault()} className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)]">
        <label className="min-w-0 text-xs text-muted">
          Status
          <select className="control mt-1 block w-full pl-2.5 pr-7" value={filters.status ?? ""} onChange={(e) => set("status", e.target.value)}>
            <option value="">All</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-xs text-muted">
          Category
          <select className="control mt-1 block w-full pl-2.5 pr-7" value={filters.category ?? ""} onChange={(e) => set("category", e.target.value)}>
            <option value="">All</option>
            {REQUEST_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2 min-w-0 text-xs text-muted md:col-span-1">
          School
          <select className="control mt-1 block w-full truncate pl-2.5 pr-7" value={filters.institute ?? ""} onChange={(e) => set("institute", e.target.value)}>
            <option value="">All</option>
            {schools.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2 min-w-0 text-xs text-muted md:col-span-1">
          Search by reference, UID, name or subject
          <input type="search" className="control mt-1 block w-full px-3" value={filters.search ?? ""} onChange={(e) => set("search", e.target.value)} />
        </label>
      </form>

      {load.kind === "loading" && (
        <div aria-busy="true" className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-10 rounded-[4px] bg-paper-2" />
          ))}
        </div>
      )}

      {load.kind === "error" && (
        <div role="alert" className="border-y border-rule py-10 text-center">
          <p className="text-ink">{load.message}</p>
          <button type="button" className="btn btn--quiet mt-3" onClick={() => { setLoad({ kind: "loading" }); fetchAll(); }}>
            Try again
          </button>
        </div>
      )}

      {load.kind === "ready" && rows.length === 0 && (
        <div className="border-y border-rule py-12 text-center">
          <p className="text-ink">No requests yet.</p>
          <p className="mt-1 text-sm text-muted">Print the QR poster and put it up where students can scan it.</p>
          <a href="/qr" className="btn btn--quiet mt-3">
            Open the QR poster
          </a>
        </div>
      )}

      {load.kind === "ready" && rows.length > 0 && (
        <section aria-labelledby="inbox-head" className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="inbox-head" className="text-section">
              Requests
            </h2>
            <p className="text-sm text-muted" data-inbox-count={shown.length}>
              {shown.length.toLocaleString("en-IN")} of {rows.length.toLocaleString("en-IN")} shown, newest first
            </p>
          </div>

          {shown.length === 0 ? (
            <div className="mt-6 border-y border-rule py-10 text-center">
              <p className="text-ink">No requests match these filters.</p>
              <button type="button" className="btn btn--quiet mt-3" onClick={() => { setOpenId(null); setFilters({}); }}>
                Show all requests
              </button>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b border-rule">
                    <th scope="col" className="whitespace-nowrap py-2 pr-4 text-left font-medium">Reference</th>
                    <th scope="col" className="whitespace-nowrap py-2 pr-4 text-left font-medium">Raised</th>
                    <th scope="col" className="whitespace-nowrap py-2 pr-4 text-left font-medium">Student</th>
                    <th scope="col" className="whitespace-nowrap py-2 pr-4 text-left font-medium">Category</th>
                    <th scope="col" className="whitespace-nowrap py-2 pr-4 text-left font-medium">Subject</th>
                    <th scope="col" className="whitespace-nowrap py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const open = openId === r.id;
                    const waiting = r.status === "Open" || r.status === "In progress" ? ageInDays(r.createdAt) : 0;
                    return (
                      <Fragment key={r.id}>
                        <tr className={`row-link border-b border-rule/70 ${open ? "bg-paper-2" : ""}`} onClick={() => setOpenId(open ? null : r.id)}>
                          <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-controls={`req-${r.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenId(open ? null : r.id);
                              }}
                              className="uid rounded-[4px] text-accent-deep hover:underline"
                            >
                              {r.ref}
                            </button>
                          </th>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-ink-2">
                            {fmtDate(r.createdAt)}
                            {waiting >= 3 && <span className="ml-1 text-muted">({waiting} days)</span>}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className="block font-medium text-ink">{r.studentName}</span>
                            <span className="uid block text-xs text-muted">
                              {r.uid}
                              {r.batch && <span className="font-body">, {r.batch} batch{r.inList ? "" : ", not in student list"}</span>}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-ink-2">{r.category}</td>
                          <td className="max-w-[28ch] truncate py-2.5 pr-4 text-ink" title={r.subject}>
                            {r.subject}
                          </td>
                          <td className="whitespace-nowrap py-2.5">
                            <RequestStatusText status={r.status} />
                          </td>
                        </tr>
                        {open && (
                          <tr id={`req-${r.id}`} className="border-b border-rule bg-paper-2">
                            <td colSpan={6} className="px-4 pt-4 pb-6">
                              <RequestDetail row={r} onSaved={replaceRow} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function RequestStatusText({ status }: { status: RequestStatus }) {
  if (status === "Resolved")
    return <span className="inline-flex h-6 items-center rounded-pill bg-accent-soft px-2.5 text-xs font-medium text-accent-deep">Resolved</span>;
  return <span className={status === "Open" ? "font-medium text-ink" : "text-ink-2"}>{status}</span>;
}

function RequestDetail({ row, onSaved }: { row: RequestRow; onSaved: (r: RequestRow) => void }) {
  const [events, setEvents] = useState<RequestEvent[] | null>(null);
  const [eventsError, setEventsError] = useState("");
  const [status, setStatus] = useState<RequestStatus>(row.status);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/requests/${row.id}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setEventsError(body.error ?? "History could not be loaded.");
      setEvents(body.events);
    } catch {
      setEventsError("History could not be loaded.");
    }
  }, [row.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/requests/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === row.status ? "" : status, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "The update could not be saved.");
        return;
      }
      onSaved(body.request);
      setNote("");
      loadEvents();
    } catch {
      setError("No connection. The update was not saved.");
    } finally {
      setSaving(false);
    }
  }

  const unchanged = status === row.status && note.trim() === "";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-5">
        <div>
          <h3 className="text-title">{row.subject}</h3>
          <p className="mt-2 whitespace-pre-line text-ink-2">{row.details}</p>
        </div>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Program</dt>
            <dd className="text-ink">{row.program}</dd>
          </div>
          <div>
            <dt className="text-muted">School</dt>
            <dd className="text-ink">{row.institute}</dd>
          </div>
          <div>
            <dt className="text-muted">Mobile</dt>
            <dd className="text-ink">{row.contactPhone ? <a href={`tel:${row.contactPhone}`} className="underline underline-offset-2">{row.contactPhone}</a> : "Not given"}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="text-ink">{row.contactEmail ? <a href={`mailto:${row.contactEmail}`} className="underline underline-offset-2">{row.contactEmail}</a> : "Not given"}</dd>
          </div>
        </dl>

        <div>
          <h4 className="text-sm font-medium text-ink">History</h4>
          {eventsError ? (
            <p className="mt-1 text-sm text-error">{eventsError}</p>
          ) : !events ? (
            <p className="mt-1 text-sm text-muted">Loading history.</p>
          ) : (
            <ol className="mt-2 space-y-2 text-sm">
              {events.map((ev, i) => (
                <li key={i} className="border-l-2 border-rule pl-3">
                  <p className="text-ink">
                    {ev.toStatus && ev.fromStatus ? `${ev.fromStatus} to ${ev.toStatus}` : ev.toStatus || "Note"}
                    <span className="text-muted">, {ev.actor === "student" ? "by the student" : `by ${ev.actor}`}</span>
                  </p>
                  {ev.note && <p className="whitespace-pre-line text-ink-2">{ev.note}</p>}
                  <p className="text-xs text-muted">{fmtTime(ev.at)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <form onSubmit={save} className="min-w-0 space-y-4 rounded-card border border-rule bg-paper p-4">
        <h4 className="text-sm font-medium text-ink">Update</h4>
        <label className="block text-xs text-muted">
          Status
          <select className="control mt-1 block w-full pl-2.5 pr-7" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
            {REQUEST_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted">
          Note for the record
          <textarea
            className="control mt-1 block h-auto w-full px-3 py-2 text-sm leading-normal"
            rows={4}
            maxLength={LIMITS.note}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving || unchanged}>
          {saving ? "Saving" : "Save update"}
        </button>
        {row.updatedBy && row.updatedBy !== "" && (
          <p className="text-xs text-muted">Last updated by {row.updatedBy}, {fmtTime(row.updatedAt)}</p>
        )}
      </form>
    </div>
  );
}
