import "server-only";
import { LIMITS, type RequestStatus } from "@/config/requests";
import { getSql } from "@/lib/db/client";
import type { NewRequest } from "./validate";

export interface RequestRow {
  id: number;
  ref: string;
  uid: string;
  studentName: string;
  program: string;
  institute: string;
  category: string;
  subject: string;
  details: string;
  contactPhone: string;
  contactEmail: string;
  status: RequestStatus;
  staffNote: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface RequestEvent {
  at: string;
  actor: string;
  fromStatus: string;
  toStatus: string;
  note: string;
}

type CreateResult =
  | { ok: true; ref: string }
  | { ok: false; reason: "unknown_uid" | "too_many" };

/** Creates a request if the UID is in the student list. Never returns anything about the student. */
export async function createRequest(r: NewRequest): Promise<CreateResult> {
  const sql = getSql();
  const [student] = await sql`SELECT 1 AS ok FROM students WHERE uid = ${r.uid}`;
  if (!student) return { ok: false, reason: "unknown_uid" };

  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM requests
    WHERE uid = ${r.uid} AND created_at > now() - interval '1 day'`;
  if (n >= LIMITS.perUidPerDay) return { ok: false, reason: "too_many" };

  const [row] = await sql`
    INSERT INTO requests (uid, category, subject, details, contact_phone, contact_email)
    VALUES (${r.uid}, ${r.category}, ${r.subject}, ${r.details}, ${r.contactPhone}, ${r.contactEmail})
    RETURNING id, ref`;
  await sql`INSERT INTO request_events (request_id, actor, to_status, note) VALUES (${row.id}, 'student', 'Open', 'Request raised')`;
  return { ok: true, ref: row.ref as string };
}

/** Status a student can see: only when both the reference and their UID match. */
export async function getPublicStatus(ref: string, uid: string) {
  const sql = getSql();
  const [row] = await sql`
    SELECT ref, category, subject, status, created_at, updated_at
    FROM requests WHERE ref = ${ref} AND uid = ${uid}`;
  if (!row) return null;
  return {
    ref: row.ref as string,
    category: row.category as string,
    subject: row.subject as string,
    status: row.status as RequestStatus,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const mapRow = (r: Record<string, unknown>): RequestRow => ({
  id: Number(r.id),
  ref: String(r.ref),
  uid: String(r.uid),
  studentName: String(r.name ?? ""),
  program: String(r.program ?? ""),
  institute: String(r.institute ?? ""),
  category: String(r.category),
  subject: String(r.subject),
  details: String(r.details),
  contactPhone: String(r.contact_phone),
  contactEmail: String(r.contact_email),
  status: r.status as RequestStatus,
  staffNote: String(r.staff_note),
  createdAt: new Date(r.created_at as string).toISOString(),
  updatedAt: new Date(r.updated_at as string).toISOString(),
  updatedBy: String(r.updated_by),
});

/** Staff inbox: every request with the student's allow-listed details. */
export async function listRequests(): Promise<RequestRow[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT r.*, s.name, s.program, s.institute
    FROM requests r JOIN students s ON s.uid = r.uid
    ORDER BY r.created_at DESC
    LIMIT 2000`;
  return rows.map(mapRow);
}

export async function getRequestEvents(id: number): Promise<RequestEvent[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT at, actor, from_status, to_status, note FROM request_events
    WHERE request_id = ${id} ORDER BY at`;
  return rows.map((e) => ({
    at: new Date(e.at as string).toISOString(),
    actor: String(e.actor),
    fromStatus: String(e.from_status),
    toStatus: String(e.to_status),
    note: String(e.note),
  }));
}

/** Changes status and/or adds a note, recording who did it. Returns the updated row, or null if missing. */
export async function updateRequest(
  id: number,
  change: { status?: RequestStatus; note: string },
  actor: string,
): Promise<RequestRow | null> {
  const sql = getSql();
  const [before] = await sql`SELECT status FROM requests WHERE id = ${id}`;
  if (!before) return null;
  const next = change.status ?? (before.status as RequestStatus);
  await sql`
    UPDATE requests
    SET status = ${next},
        staff_note = CASE WHEN ${change.note} = '' THEN staff_note ELSE ${change.note} END,
        updated_at = now(),
        updated_by = ${actor}
    WHERE id = ${id}`;
  await sql`
    INSERT INTO request_events (request_id, actor, from_status, to_status, note)
    VALUES (${id}, ${actor}, ${before.status}, ${next === before.status ? "" : next}, ${change.note})`;
  const [row] = await sql`
    SELECT r.*, s.name, s.program, s.institute FROM requests r JOIN students s ON s.uid = r.uid WHERE r.id = ${id}`;
  return row ? mapRow(row) : null;
}
