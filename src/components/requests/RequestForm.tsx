"use client";
import { useRef, useState } from "react";
import { LIMITS, REQUEST_CATEGORIES } from "@/config/requests";
import type { FieldErrors } from "@/lib/requests/validate";

type Phase = { kind: "editing" } | { kind: "sending" } | { kind: "sent"; ref: string };
type Key = keyof FieldErrors;

const FIELD_ORDER: Key[] = ["uid", "studentName", "studentProgram", "category", "subject", "details", "contactPhone", "contactEmail"];

export default function RequestForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "editing" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [detailsLen, setDetailsLen] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setErrors({});
    setPhase({ kind: "sending" });
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 201 && body.ref) {
        setPhase({ kind: "sent", ref: body.ref });
        window.scrollTo({ top: 0 });
        return;
      }
      setPhase({ kind: "editing" });
      if (body.errors) {
        setErrors(body.errors);
        const first = FIELD_ORDER.find((k) => body.errors[k]);
        if (first) (formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus();
      } else setFormError(body.error ?? "Your request could not be sent. Try again.");
    } catch {
      setPhase({ kind: "editing" });
      setFormError("No connection. Check your internet and try again.");
    }
  }

  if (phase.kind === "sent")
    return (
      <section aria-live="polite" className="rounded-card border border-rule bg-paper-2 p-6">
        <h2 className="text-section">Request received</h2>
        <p className="mt-2 text-ink-2">Keep this reference. You need it, with your UID, to check the status.</p>
        <p className="mt-5 font-outlier text-[2rem] leading-none text-ink" data-ref={phase.ref}>
          {phase.ref}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`/request/status?ref=${encodeURIComponent(phase.ref)}`} className="btn btn--primary">
            Check status
          </a>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              setPhase({ kind: "editing" });
              setDetailsLen(0);
            }}
          >
            Raise another request
          </button>
        </div>
      </section>
    );

  const sending = phase.kind === "sending";
  const control = "control mt-1 block h-11 w-full px-3 text-md";
  const describedBy = (k: Key, hint?: boolean) =>
    [hint ? `${k}-hint` : "", errors[k] ? `${k}-error` : ""].filter(Boolean).join(" ") || undefined;
  const a11y = (k: Key, hint?: boolean) => ({ id: k, name: k, "aria-invalid": errors[k] ? true : undefined, "aria-describedby": describedBy(k, hint) });
  const Label = ({ k, children }: { k: Key; children: React.ReactNode }) => (
    <label htmlFor={k} className="block text-sm font-medium">
      {children}
    </label>
  );
  const Hint = ({ k, children }: { k: Key; children: React.ReactNode }) => (
    <p id={`${k}-hint`} className="text-xs text-muted">
      {children}
    </p>
  );
  const Err = ({ k }: { k: Key }) =>
    errors[k] ? (
      <p id={`${k}-error`} className="mt-1 text-sm text-error">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      <div>
        <Label k="uid">UID</Label>
        <Hint k="uid">As printed on your ID card, for example 25ABCD1234.</Hint>
        <input {...a11y("uid", true)} required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={10} className={`${control} uppercase`} />
        <Err k="uid" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label k="studentName">Your name</Label>
          <input {...a11y("studentName")} required autoComplete="name" maxLength={80} className={control} />
          <Err k="studentName" />
        </div>
        <div>
          <Label k="studentProgram">Program</Label>
          <input {...a11y("studentProgram")} required maxLength={120} placeholder="e.g. BCA, MBA" className={control} />
          <Err k="studentProgram" />
        </div>
      </div>

      <div>
        <Label k="category">What is it about?</Label>
        <select {...a11y("category")} required defaultValue="" className={control}>
          <option value="" disabled>
            Choose one
          </option>
          {REQUEST_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <Err k="category" />
      </div>

      <div>
        <Label k="subject">Subject</Label>
        <input {...a11y("subject")} required maxLength={LIMITS.subject} className={control} />
        <Err k="subject" />
      </div>

      <div>
        <Label k="details">Details</Label>
        <Hint k="details">What happened, what you need.</Hint>
        <textarea
          {...a11y("details", true)}
          required
          rows={6}
          maxLength={LIMITS.details}
          onChange={(e) => setDetailsLen(e.target.value.length)}
          className="control mt-1 block h-auto w-full px-3 py-2 text-md leading-normal"
        />
        <p className="mt-1 text-right text-xs text-muted tabular-nums" aria-hidden>
          {detailsLen} of {LIMITS.details}
        </p>
        <Err k="details" />
      </div>

      <fieldset aria-describedby="contact-hint">
        <legend className="text-sm font-medium">How can the office reach you?</legend>
        <p id="contact-hint" className="text-xs text-muted">
          Give at least one.
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <Label k="contactPhone">Mobile number</Label>
            <input {...a11y("contactPhone")} type="tel" inputMode="tel" autoComplete="tel" maxLength={LIMITS.phone} className={control} />
            <Err k="contactPhone" />
          </div>
          <div>
            <Label k="contactEmail">Email</Label>
            <input {...a11y("contactEmail")} type="email" inputMode="email" autoComplete="email" maxLength={LIMITS.email} className={control} />
            <Err k="contactEmail" />
          </div>
        </div>
      </fieldset>

      {formError && (
        <p role="alert" className="rounded-input border border-error/40 bg-paper-2 px-3 py-2 text-sm text-error">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <button type="submit" className="btn btn--primary h-11 px-6" disabled={sending}>
          {sending ? "Sending" : "Send request"}
        </button>
        <a href="/request/status" className="text-sm text-accent-deep underline underline-offset-2 hover:text-ink">
          Check an earlier request
        </a>
      </div>
      <p className="text-xs text-muted">
        Only Registrar Office staff can see your request.
      </p>
    </form>
  );
}
