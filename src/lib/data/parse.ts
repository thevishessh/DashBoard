// Pure helpers for the workbook's free-form columns: dates and pending documents. Unit-tested.

/** A cell value from the sheet as an ISO date (YYYY-MM-DD), or "" when it is not a recognisable date. */
export function parseSheetDate(value: unknown, today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10)): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return unswapFuture(value.toISOString().slice(0, 10), today);
  if (typeof value === "number" && value > 20000 && value < 80000) {
    // Excel serial day (1900 system)
    return new Date(Math.round((value - 25569) * 86_400_000)).toISOString().slice(0, 10);
  }
  if (typeof value !== "string") return "";
  const s = value.trim();
  let m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(s); // Indian order: day/month/year
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const dayFirst = iso(year, Number(mo), Number(d));
    // A date in the future was probably typed month-first (11/12/2026 meaning 12 Nov); swap when that fits.
    if (dayFirst > today) {
      const monthFirst = iso(year, Number(d), Number(mo));
      if (monthFirst && monthFirst <= today) return monthFirst;
    }
    return dayFirst;
  }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  return "";
}

/** A real date in the future whose day is 12 or less was probably entered month-first; swap day and month back. */
function unswapFuture(isoDate: string, today: string): string {
  if (isoDate <= today) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  const swapped = d <= 12 ? iso(y, d, m) : "";
  return swapped && swapped <= today ? swapped : isoDate;
}

function iso(y: number, m: number, d: number): string {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return ""; // e.g. 31/02
  return dt.toISOString().slice(0, 10);
}

// Notes that mean "nothing is pending".
const NOTHING_PENDING = /^(-+|na|n\/a|nil|none|no|0|all\s+(the\s+)?(documents?|docs?)\s+(is\s+|are\s+)?(submitted|received|complete)d?\.?)$/i;

// Common spellings of the same document, mapped to one name.
const CANONICAL: [RegExp, string][] = [
  [/migration/i, "Migration certificate"],
  [/transfer|\btc\b/i, "Transfer certificate"],
  [/character|\bcc\b/i, "Character certificate"],
  [/anti\s*-?\s*ragging/i, "Anti-ragging form"],
  [/graduat|\bug\b|degree/i, "Graduation marksheet"],
  [/10(th)?\b|tenth|matric|high\s*school/i, "10th marksheet"],
  [/12(th)?\b|twelfth|intermediate|senior\s*secondary/i, "12th marksheet"],
  [/aadha?ar/i, "Aadhaar card"],
  [/apa+r/i, "APAAR ID"],
  [/photo/i, "Photographs"],
  [/gap/i, "Gap certificate"],
  [/caste|category/i, "Category certificate"],
  [/income/i, "Income certificate"],
  [/domicile/i, "Domicile certificate"],
  [/medical|fitness/i, "Medical certificate"],
  [/diploma/i, "Diploma marksheet"],
];

/** The documents still pending for a student, from the "Pending Documents" note. [] when nothing is pending. */
export function parsePendingDocs(note: string | null | undefined): string[] {
  const text = (note ?? "").replace(/\s+/g, " ").trim();
  if (!text || NOTHING_PENDING.test(text) || /all\s+doc\w*\s+(is\s+|are\s+)?submit/i.test(text)) return [];
  const out = new Set<string>();
  for (const part of text.split(/,|;|\/|&|\+|\band\b|\n/i)) {
    const p = part.trim().replace(/\.$/, "");
    if (!p || NOTHING_PENDING.test(p)) continue;
    const hit = CANONICAL.find(([re]) => re.test(p));
    out.add(hit ? hit[1] : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
  }
  return [...out];
}
