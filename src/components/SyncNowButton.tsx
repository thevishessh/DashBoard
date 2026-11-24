"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncNow, type SyncNowResult } from "@/app/actions/syncNow";

/** Pulls the latest workbook from Google Drive now, then reloads the figures. */
export default function SyncNowButton({ lastSync, canSync = false }: { lastSync: string; canSync?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SyncNowResult | null>(null);
  const when = new Date(lastSync).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-muted">Last update from Google Drive: {when}. The figures update by themselves when the sheet changes.</span>
      {canSync && (
      <button
        type="button"
        className="btn btn--quiet border border-rule"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await syncNow();
            setResult(r);
            if (r.ok) {
              // The dashboard reads the database at most once a minute; give the new copy a moment, then reload.
              await new Promise((res) => setTimeout(res, 1500));
              router.refresh();
            }
          })
        }
      >
        {pending ? "Syncing" : "Sync now"}
      </button>
      )}
      {result && (
        <span role="status" className={result.ok ? "text-accent-deep" : "text-error"}>
          {result.message}
        </span>
      )}
    </div>
  );
}
