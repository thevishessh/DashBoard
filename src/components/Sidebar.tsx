"use client";
import { COMING_SOON_LABEL, MODULES, type ModuleId } from "@/config/modules";

export default function Sidebar({
  active,
  onSelect,
}: {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
}) {
  return (
    <aside className="flex min-w-0 shrink-0 flex-col border-b border-rule bg-paper-2 lg:sticky lg:top-0 lg:h-dvh lg:w-[248px] lg:border-b-0 lg:border-r">
      <div className="px-5 pt-5 pb-4 lg:pt-6 lg:pb-8">
        <p className="font-display text-lg leading-tight tracking-[-0.02em]">Registrar Office</p>
        <p className="text-xs text-muted">Student services</p>
      </div>
      <nav aria-label="Modules" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
        {MODULES.map((m) =>
          m.enabled ? (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              aria-current={active === m.id ? "page" : undefined}
              className={`row-link flex h-9 shrink-0 items-center whitespace-nowrap rounded-input px-3 text-left text-sm ${
                active === m.id ? "bg-accent-soft font-medium text-ink" : "text-ink-2"
              }`}
            >
              {m.label}
            </button>
          ) : (
            <div
              key={m.id}
              aria-disabled="true"
              className="flex shrink-0 cursor-not-allowed flex-col justify-center whitespace-nowrap rounded-input px-3 py-1.5 text-sm leading-tight text-muted"
            >
              <span>{m.label}</span>
              <span className="text-xs">{COMING_SOON_LABEL}</span>
            </div>
          ),
        )}
      </nav>
    </aside>
  );
}
