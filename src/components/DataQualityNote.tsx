"use client";
import type { LoadAudit } from "@/lib/data/types";

/** How the figures were produced, set as quiet notes under the register. */
export default function DataQualityNote({
  audit,
  unknownWords,
}: {
  audit: LoadAudit;
  unknownWords: { word: string; count: number }[];
}) {
  const notes: { term: string; detail: string }[] = [
    { term: "Source", detail: `${audit.source.replace(/^xlsx: /, "")}, ${audit.sheetCount} sheets read (${audit.programTabCount} program sheets), ${audit.rowCount.toLocaleString("en-IN")} students.` },
    { term: "Status", detail: "Taken from each program sheet (column AD), matched to the master list by UID." },
  ];
  if (audit.staleCacheRows > 0)
    notes.push({ term: "Outdated master values", detail: `${audit.staleCacheRows} rows in the master sheet showed an older status than their program sheet. The program sheet value is used.` });
  if (audit.rowsWithoutProgramTab > 0)
    notes.push({ term: "No program sheet", detail: `${audit.rowsWithoutProgramTab} students have no program sheet and are counted as no status.` });
  if (unknownWords.length > 0)
    notes.push({ term: "Unrecognised values", detail: `${unknownWords.map((w) => `"${w.word}" (${w.count})`).join(", ")}. Counted separately, not as verified.` });

  return (
    <section aria-labelledby="notes-head" className="border-t border-rule pt-6">
      <h2 id="notes-head" className="text-title">
        Data notes
      </h2>
      <dl className="mt-3 grid gap-x-10 gap-y-3 text-sm md:grid-cols-2">
        {notes.map((n) => (
          <div key={n.term} className="min-w-0">
            <dt className="font-medium text-ink">{n.term}</dt>
            <dd className="text-ink-2">{n.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
