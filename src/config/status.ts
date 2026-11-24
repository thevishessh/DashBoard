// Canonical verification buckets. Matching is case/space-insensitive (see normalizeStatus).
export const STATUS_BUCKETS = ["Verified", "Pending", "Not Verified", "Unknown", "Blank"] as const;
export type StatusBucket = (typeof STATUS_BUCKETS)[number];

/** Normalised (lowercase, single-spaced) word -> bucket. Add new spellings here. */
export const STATUS_ALIASES: Record<string, Exclude<StatusBucket, "Unknown" | "Blank">> = {
  verified: "Verified",
  pending: "Pending",
  "pending docs": "Pending",
  "not verified": "Not Verified",
  "not verfied": "Not Verified",
};

/** Display labels (sentence case) for each bucket. */
export const STATUS_LABELS: Record<StatusBucket, string> = {
  Verified: "Verified",
  Pending: "Pending",
  "Not Verified": "Not verified",
  Unknown: "Unrecognised value",
  Blank: "No status",
};

// One green does every signal: a lightness ramp on the accent for progress, greys for the rest.
// Colours live in src/app/tokens.css; this maps each bucket to its token.
export const STATUS_COLORS: Record<StatusBucket, string> = {
  Verified: "var(--color-status-verified)",
  Pending: "var(--color-status-pending)",
  "Not Verified": "var(--color-status-not-verified)",
  Unknown: "var(--color-status-unknown)",
  Blank: "var(--color-status-blank)",
};
