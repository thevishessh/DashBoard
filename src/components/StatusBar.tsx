import { STATUS_BUCKETS, STATUS_COLORS, STATUS_LABELS } from "@/config/status";
import type { StatusCounts } from "@/lib/metrics";

/** Parts of a whole as one stacked horizontal bar. Widths are percentages, so nothing animates size. */
export default function StatusBar({
  counts,
  total,
  thick = false,
}: {
  counts: StatusCounts;
  total: number;
  thick?: boolean;
}) {
  const label = STATUS_BUCKETS.filter((b) => counts[b] > 0)
    .map((b) => `${STATUS_LABELS[b]} ${counts[b]}`)
    .join(", ");
  return (
    <div
      role="img"
      aria-label={total ? label : "No students"}
      className={`flex w-full gap-[2px] overflow-hidden rounded-[3px] bg-paper-3 ${thick ? "h-5" : "h-2.5"}`}
    >
      {total > 0 &&
        STATUS_BUCKETS.map((b) =>
          counts[b] > 0 ? (
            <span
              key={b}
              title={`${STATUS_LABELS[b]}: ${counts[b].toLocaleString("en-IN")}`}
              style={{ flexGrow: counts[b], flexBasis: 0, minWidth: 2, backgroundColor: STATUS_COLORS[b] }}
            />
          ) : null,
        )}
    </div>
  );
}
