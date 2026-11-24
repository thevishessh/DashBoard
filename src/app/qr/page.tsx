import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import PrintButton from "@/components/requests/PrintButton";
import { notFound } from "next/navigation";
import { getStaff } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "QR poster | Registrar Office" };

/** The public address of the request form: an explicit setting, the production domain, or this host. */
async function formUrl(): Promise<string> {
  if (process.env.PUBLIC_SITE_URL) return `${process.env.PUBLIC_SITE_URL.replace(/\/$/, "")}/request`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/request`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/request`;
}

export default async function QrPosterPage() {
  if (!(await getStaff())) notFound();

  const url = await formUrl();
  // Plain black on white scans most reliably on every phone camera.
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 0 });

  return (
    <main className="mx-auto max-w-[44rem] px-5 py-10 print:max-w-none print:p-0">
      <div className="mb-8 flex flex-wrap items-center gap-3 print:hidden">
        <a href="/?view=complaints" className="btn btn--quiet">
          Back to requests
        </a>
        <PrintButton />
        <p className="w-full text-sm text-muted">
          Print on A4. The code opens <span className="uid">{url}</span>
        </p>
        {/^https?:\/\/(localhost|127\.|192\.168\.|10\.)/.test(url) && (
          <p role="alert" className="w-full rounded-input border border-error/40 bg-paper-2 px-3 py-2 text-sm text-error">
            This code points to this computer, so students&apos; phones cannot open it. Deploy the student form first, then set
            PUBLIC_SITE_URL to its address and print again.
          </p>
        )}
      </div>

      <article className="rounded-card border border-rule bg-paper p-10 text-center print:rounded-none print:border-0 print:p-0">
        <p className="font-display text-lg tracking-[-0.02em]">Registrar Office</p>
        <h1 className="mx-auto mt-6 max-w-[16ch] text-[2.6rem] leading-[1.05]">Raise a complaint or request</h1>
        <p className="mx-auto mt-4 max-w-[36ch] text-lg text-ink-2">
          Scan with your phone camera, fill in your UID and the issue, and keep the reference you get.
        </p>
        <div
          role="img"
          aria-label={`QR code that opens ${url}`}
          className="mx-auto mt-10 w-[min(70vw,320px)] [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="uid mt-8 text-md text-ink-2">{url.replace(/^https?:\/\//, "")}</p>
        <p className="mx-auto mt-8 max-w-[40ch] text-sm text-muted">
          Use the same page to check the status of a request with your reference and UID.
        </p>
      </article>
    </main>
  );
}
