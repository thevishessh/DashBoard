import type { Metadata } from "next";
import StatusLookup from "@/components/requests/StatusLookup";
import { normaliseRef } from "@/lib/requests/validate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Check a request | Registrar Office" };

export default async function StatusPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const raw = Array.isArray(p.ref) ? p.ref[0] : p.ref;
  return (
    <>
      <h1>Check a request</h1>
      <p className="mt-2 text-ink-2">Enter the reference you received and your UID.</p>
      <div className="mt-8">
        <StatusLookup initialRef={normaliseRef(raw ?? "") ?? ""} />
      </div>
      <p className="mt-10 text-sm">
        <a href="/request" className="text-accent-deep underline underline-offset-2 hover:text-ink">
          Raise a new request
        </a>
      </p>
    </>
  );
}
