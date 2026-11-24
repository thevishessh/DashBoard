"use client";
import { useActionState } from "react";
import { lookupStatus, type LookupState } from "@/app/request/status/actions";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

const MEANING: Record<string, string> = {
  Open: "Received. The office has not picked it up yet.",
  "In progress": "The office is working on it.",
  Resolved: "The office has resolved it. Contact the office if anything is still missing.",
  Closed: "Closed by the office.",
};

export default function StatusLookup({ initialRef }: { initialRef: string }) {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupStatus, { kind: "idle" });

  return (
    <>
      <form action={action} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <label htmlFor="ref" className="block text-sm font-medium">
          Reference
          <input id="ref" name="ref" defaultValue={initialRef} required autoComplete="off" spellCheck={false} className="control mt-1 block h-11 w-full px-3 text-md uppercase" />
        </label>
        <label htmlFor="uid" className="block text-sm font-medium">
          UID
          <input id="uid" name="uid" required autoComplete="off" spellCheck={false} maxLength={10} className="control mt-1 block h-11 w-full px-3 text-md uppercase" />
        </label>
        <button type="submit" className="btn btn--primary h-11 px-6" disabled={pending}>
          {pending ? "Checking" : "Check"}
        </button>
      </form>

      {state.kind === "problem" && (
        <p role="alert" className="mt-6 text-sm text-error">
          {state.message}
        </p>
      )}

      {state.kind === "found" && (
        <section aria-live="polite" className="mt-8 rounded-card border border-rule bg-paper-2 p-6">
          <p className="font-outlier text-sm text-muted">{state.ref}</p>
          <h2 className="mt-1 text-section">{state.subject}</h2>
          <p className="text-sm text-muted">{state.category}</p>
          <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Status</dt>
              <dd className={`text-lg font-medium ${state.status === "Resolved" ? "text-accent-deep" : "text-ink"}`} data-status={state.status}>
                {state.status}
              </dd>
              <dd className="text-ink-2">{MEANING[state.status]}</dd>
            </div>
            <div>
              <dt className="text-muted">Raised</dt>
              <dd className="text-ink">{fmt(state.createdAt)}</dd>
              <dt className="mt-2 text-muted">Last updated</dt>
              <dd className="text-ink">{fmt(state.updatedAt)}</dd>
            </div>
          </dl>
        </section>
      )}
    </>
  );
}
