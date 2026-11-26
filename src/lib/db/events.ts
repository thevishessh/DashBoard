import "server-only";
import type { StatusEvent } from "@/lib/activity";
import { getSql, hasDatabase } from "./client";

/** Status changes of the last `days` days, newest first (UID, statuses, editor, time; no student details). */
export async function loadRecentEvents(days = 31): Promise<StatusEvent[]> {
  if (!hasDatabase()) return [];
  try {
    const rows = await getSql()`
      SELECT uid, from_status, to_status, actor, source, at FROM status_events
      WHERE at > now() - make_interval(days => ${days})
      ORDER BY at DESC LIMIT 20000`;
    return rows.map((r) => ({
      uid: String(r.uid),
      from: String(r.from_status),
      to: String(r.to_status),
      actor: String(r.actor),
      source: String(r.source),
      at: new Date(r.at as string).toISOString(),
    }));
  } catch (e) {
    console.error("loading status events failed", e);
    return [];
  }
}
