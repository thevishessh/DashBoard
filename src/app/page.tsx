import Dashboard from "@/components/Dashboard";
import { notFound } from "next/navigation";
import { getStaff, passwordRequired } from "@/lib/auth/staff";
import { loadData } from "@/lib/data";
import { loadRecentEvents } from "@/lib/db/events";
import { readUrlState } from "@/lib/urlState";

// Always read the current file on request (cached in memory until it changes).
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { view, filters, tab } = readUrlState(await searchParams);
  // Student names and UIDs are staff-only.
  if (!(await getStaff())) notFound(); // the proxy sends password-less visitors to /login first
  try {
    const [{ rows, audit }, events] = await Promise.all([loadData(), loadRecentEvents()]);
    // Only allow-listed StudentRow fields cross to the browser.
    return (
      <Dashboard
        rows={rows}
        audit={audit}
        initialView={view}
        initialFilters={filters}
        initialTab={tab}
        events={events}
        canSignOut={passwordRequired()}
        canSync={Boolean(process.env.APPS_SCRIPT_URL)}
      />
    );
  } catch (err) {
    return (
      <main className="mx-auto max-w-[60ch] px-5 py-24">
        <h1>The verification data could not be loaded</h1>
        <p className="mt-3 text-ink-2">{(err as Error).message}</p>
        <p className="mt-3 text-sm text-muted">
          Check that the workbook is in the project folder and is not open with a lock in Excel, then reload this page.
        </p>
      </main>
    );
  }
}
