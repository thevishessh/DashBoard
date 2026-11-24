"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const EVERY_MS = 5_000;

/**
 * Keeps the figures current without a page reload: every 5 seconds (while the tab is visible)
 * it asks when the data was last synced from Google Drive, and refreshes the page data when that changes.
 * Filters, the open module and scroll position stay as they are.
 */
export default function LiveUpdates({ since }: { since: string }) {
  const router = useRouter();
  const current = useRef(since);
  current.current = since;

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/staff/last-sync", { cache: "no-store" });
        if (!res.ok) return;
        const { at } = (await res.json()) as { at: string | null };
        if (at && at !== current.current) {
          current.current = at;
          router.refresh();
        }
      } catch {
        // offline for a moment: try again on the next tick
      }
    };
    const id = window.setInterval(check, EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
