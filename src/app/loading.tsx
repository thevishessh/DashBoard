// Shown while the workbook is read on first load (a few seconds); shaped like the screen that follows.
export default function Loading() {
  return (
    <div className="lg:flex" aria-busy="true" aria-live="polite">
      <div className="border-b border-rule bg-paper-2 lg:h-dvh lg:w-[248px] lg:border-b-0 lg:border-r" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[var(--container)] px-5 pt-6 md:px-10 md:pt-8">
          <h1>Document verification</h1>
          <p className="mt-1 text-sm text-muted">Reading the verification workbook.</p>
          <div className="mt-6 h-[132px] rounded-card border border-rule bg-paper-2" />
          <div className="mt-8 h-12 w-40 rounded-input bg-paper-3" />
          <div className="mt-6 h-5 rounded-[3px] bg-paper-3" />
          <div className="mt-10 space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-6 rounded-[4px] bg-paper-2" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
