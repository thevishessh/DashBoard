// Complaints and requests: categories and the workflow. Edit the lists here; the form and inbox follow.

export const REQUEST_CATEGORIES = [
  "Document verification",
  "Fees and receipts",
  "ID card",
  "Certificates and letters",
  "Examinations and results",
  "Hostel and transport",
  "Other",
] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export const REQUEST_STATUSES = ["Open", "In progress", "Resolved", "Closed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Field limits, enforced on the server and mirrored on the form. */
export const LIMITS = {
  subject: 120,
  details: 2000,
  phone: 15,
  email: 120,
  note: 1000,
  /** A student can raise at most this many requests per day (spam guard). */
  perUidPerDay: 5,
} as const;
