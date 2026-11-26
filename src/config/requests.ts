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
  /** Spam guards. A UID or a mobile number: at most 2 requests a day. */
  perUidPerDay: 2,
  perPhonePerDay: 2,
  /** One network (IP): generous, because a whole campus Wi-Fi can share one address. */
  perNetworkPer10Min: 10,
} as const;
