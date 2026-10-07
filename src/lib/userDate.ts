// Calendar-date helpers for per-user time zones. Vercel functions run in UTC, so a bare
// `new Date().setHours(0,0,0,0)` is UTC midnight — for a US user in the evening that's already
// "tomorrow". Use these whenever a page needs "the user's today".

export const DEFAULT_TIMEZONE = "America/New_York";

function safeZone(timezone: string | null | undefined): string {
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** "YYYY-MM-DD" for the given instant as seen in the user's time zone. */
export function localDateKey(timezone: string | null | undefined, at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: safeZone(timezone), year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/**
 * "YYYY-MM-DD" of a stored calendar date (training workouts, race dates). Those are written
 * server-side in UTC, so their UTC date is the intended calendar day.
 */
export function storedDateKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

/** UTC-midnight Date for a "YYYY-MM-DD" key — handy for date arithmetic and display with timeZone: "UTC". */
export function dateFromKey(key: string): Date {
  return new Date(key + "T00:00:00.000Z");
}
