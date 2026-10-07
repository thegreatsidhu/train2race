import { localDateKey, dateFromKey } from "@/lib/userDate";

// Helpers for run clubs' weekly group runs (ClubRun). A run repeats every week on `dayOfWeek` at
// `startTime` in the club's own time zone, so "Saturday 7:00am" stays 7:00am for the club even
// when members' phones or the server are in other zones.

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "07:30" → "7:30 AM" */
export function fmtClockTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "2026-10-10" → "Sat, Oct 10" */
export function fmtRunDate(dateKey: string, long = false): string {
  return new Date(dateKey + "T00:00:00Z").toLocaleDateString("en-US", { weekday: long ? "long" : "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Keep showing an occurrence as "upcoming" for this long after it starts (people check in late). */
const GRACE_MS = 2 * 60 * 60 * 1000;

function addDays(key: string, days: number): string {
  return new Date(dateFromKey(key).getTime() + days * 86400000).toISOString().slice(0, 10);
}

/** Milliseconds `timezone` is ahead of UTC at instant `at`. */
function zoneOffsetMs(timezone: string, at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at).map(p => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The UTC instant of wall-clock `dateKey` + `time` ("HH:MM") in `timezone`. */
export function wallTimeToInstant(dateKey: string, time: string, timezone: string): Date {
  const [h, m] = time.split(":").map(Number);
  const guess = dateFromKey(dateKey).getTime() + (h * 60 + m) * 60000;
  // Two passes so the offset is the one in force at the actual instant (handles DST changeovers).
  let instant = guess - zoneOffsetMs(timezone, new Date(guess));
  instant = guess - zoneOffsetMs(timezone, new Date(instant));
  return new Date(instant);
}

/** Next `count` occurrences ("YYYY-MM-DD", in the club's zone) that haven't finished yet. */
export function upcomingDates(run: { dayOfWeek: number; startTime: string; timezone: string }, count: number, now: Date = new Date()): string[] {
  const todayKey = localDateKey(run.timezone, now);
  const out: string[] = [];
  for (let i = 0; out.length < count && i < 7 * count + 7; i++) {
    const key = addDays(todayKey, i);
    if (dateFromKey(key).getUTCDay() !== run.dayOfWeek) continue;
    if (wallTimeToInstant(key, run.startTime, run.timezone).getTime() + GRACE_MS < now.getTime()) continue;
    out.push(key);
  }
  return out;
}

export function isValidTime(t: unknown): t is string {
  return typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function isValidZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

function clean(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

export interface RunFields {
  title: string; dayOfWeek: number; startTime: string; meetingPoint: string;
  mapUrl: string | null; distance: string | null; paceGroups: string[]; notes: string | null;
}

/** Validates the add/edit form. Returns the cleaned fields, or an error message for the captain. */
export function parseRunFields(body: any): RunFields | { error: string } {
  const title = clean(body?.title, 80);
  const meetingPoint = clean(body?.meetingPoint, 200);
  const dayOfWeek = Number(body?.dayOfWeek);
  if (!title || !meetingPoint) return { error: "Name and meeting spot are required." };
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return { error: "Pick a day of the week." };
  if (!isValidTime(body?.startTime)) return { error: "Pick a start time." };
  let mapUrl = clean(body?.mapUrl, 500);
  if (mapUrl && !/^https?:\/\//i.test(mapUrl)) mapUrl = "https://" + mapUrl;
  const paceGroups = (Array.isArray(body?.paceGroups) ? body.paceGroups : [])
    .map((p: unknown) => clean(p, 30)).filter((p: string | null): p is string => !!p)
    .filter((p: string, i: number, a: string[]) => a.indexOf(p) === i).slice(0, 8);
  return { title, dayOfWeek, startTime: body.startTime, meetingPoint, mapUrl, distance: clean(body?.distance, 40), paceGroups, notes: clean(body?.notes, 1000) };
}
