// Pure validation for the public request form and staff updates. No I/O; unit-tested.
import { UID_PATTERN } from "@/config/columns";
import { LIMITS, REQUEST_CATEGORIES, REQUEST_STATUSES, type RequestCategory, type RequestStatus } from "@/config/requests";

export interface NewRequest {
  uid: string;
  studentName: string;
  studentProgram: string;
  /** Admission year from the UID, e.g. "2025" for 25ABCD1234. */
  batch: string;
  category: RequestCategory;
  subject: string;
  details: string;
  contactPhone: string;
  contactEmail: string;
}

export type FieldErrors = Partial<Record<keyof NewRequest, string>>;

const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const cleanMultiline = (v: unknown) =>
  typeof v === "string" ? v.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() : "";

export function validateNewRequest(input: Record<string, unknown>):
  | { ok: true; value: NewRequest }
  | { ok: false; errors: FieldErrors } {
  const uid = clean(input.uid).toUpperCase();
  const studentName = clean(input.studentName);
  const studentProgram = clean(input.studentProgram);
  const category = clean(input.category) as RequestCategory;
  const subject = clean(input.subject);
  const details = cleanMultiline(input.details);
  const contactPhone = clean(input.contactPhone).replace(/[\s-]/g, "");
  const contactEmail = clean(input.contactEmail).toLowerCase();
  const errors: FieldErrors = {};

  if (!UID_PATTERN.test(uid)) errors.uid = "Enter your UID as printed on your ID card, for example 26ABCD1234.";
  if (studentName.length < 2 || studentName.length > 80 || !/[a-z]/i.test(studentName)) errors.studentName = "Enter your full name.";
  if (studentProgram.length < 2 || studentProgram.length > 120) errors.studentProgram = "Enter your program, for example BCA or MBA.";
  if (!REQUEST_CATEGORIES.includes(category)) errors.category = "Choose what your request is about.";
  if (subject.length < 5) errors.subject = "Give a short subject of at least 5 characters.";
  else if (subject.length > LIMITS.subject) errors.subject = `Keep the subject under ${LIMITS.subject} characters.`;
  if (details.length < 15) errors.details = "Describe the issue in at least 15 characters.";
  else if (details.length > LIMITS.details) errors.details = `Keep the description under ${LIMITS.details} characters.`;
  if (contactPhone && !/^\+?\d{10,14}$/.test(contactPhone)) errors.contactPhone = "Enter a 10 digit mobile number.";
  if (contactEmail && (contactEmail.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)))
    errors.contactEmail = "Enter a valid email address.";
  if (!contactPhone && !contactEmail) errors.contactPhone = "Give a mobile number or an email so the office can reach you.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { uid, studentName, studentProgram, batch: batchOf(uid), category, subject, details, contactPhone, contactEmail } };
}

/** "25ABCD1234" -> "2025". Works for every future batch. */
export function batchOf(uid: string): string {
  const m = /^(\d{2})/.exec(uid);
  return m ? `20${m[1]}` : "";
}

export function validateStaffUpdate(input: Record<string, unknown>):
  | { ok: true; value: { status?: RequestStatus; note: string } }
  | { ok: false; error: string } {
  const status = clean(input.status);
  const note = cleanMultiline(input.note);
  if (status && !REQUEST_STATUSES.includes(status as RequestStatus)) return { ok: false, error: "Unknown status." };
  if (!status && !note) return { ok: false, error: "Change the status or add a note." };
  if (note.length > LIMITS.note) return { ok: false, error: `Keep the note under ${LIMITS.note} characters.` };
  return { ok: true, value: { status: (status || undefined) as RequestStatus | undefined, note } };
}

/** Reference typed by a student, normalised: "req 12" or "REQ-000012" -> "REQ-000012". */
export function normaliseRef(raw: string): string | null {
  const m = /^\s*(?:req)?[\s-]*0*(\d{1,9})\s*$/i.exec(raw ?? "");
  return m ? `REQ-${m[1].padStart(6, "0")}` : null;
}
