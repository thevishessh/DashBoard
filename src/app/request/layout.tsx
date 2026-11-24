import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raise a request | Registrar Office",
  description: "Raise a complaint or request with the Registrar Office and check its status.",
};

// Public pages opened from the QR code: a narrow, phone-first column.
export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-rule bg-paper-2">
        <div className="mx-auto max-w-[40rem] px-5 py-4">
          <p className="font-display text-lg leading-tight tracking-[-0.02em]">Registrar Office</p>
          <p className="text-xs text-muted">Complaints and requests</p>
        </div>
      </header>
      <main className="mx-auto max-w-[40rem] px-5 pt-8 pb-16">{children}</main>
    </div>
  );
}
