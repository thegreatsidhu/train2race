import { prisma } from "@/lib/prisma";

// Duplicate detection for races (MajorRace). New races are approved automatically each night
// unless they look like a race that's already listed; those stay pending for an admin.
//
// Two races are treated as the same when they're within a day of each other, the same distance
// (±10%, or both triathlons), and either:
//  - they're in the same city and their names are similar once years, ordinals ("5th"), filler
//    words, numbers, city names and punctuation are ignored (equal, one contains the other, or
//    most words shared);
//  - they're in different cities but the names match exactly after that clean-up (the city was
//    entered differently). A series like "Cookie Run NYC" / "Cookie Run Sacramento" won't match; or
//  - they're in the same city on the same day at almost exactly the same distance (±3%) and share
//    about a third of their identifying words, which catches one race listed under two names.

type RaceLike = { id: string; name: string; city: string; raceDate: Date; distanceM: number; isTriathlon: boolean };

const FILLER = new Set(["the", "annual", "a", "an", "of", "and", "presented", "by", "race", "run", "inaugural"]);

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b\d+(st|nd|rd|th)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(t => t && !FILLER.has(t));
}

function sameNameExactly(a: string, b: string): boolean {
  const ja = nameTokens(a).join(" ");
  return !!ja && ja === nameTokens(b).join(" ");
}

/** "Austin" = "Austin, TX", "New York" = "New York City"; but "York" ≠ "New York City". */
function citiesMatch(a: string, b: string): boolean {
  const ca = a.trim().toLowerCase(), cb = b.trim().toLowerCase();
  if (!ca || !cb || ca === "unknown" || cb === "unknown") return false;
  const [short, long] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  return short === long || (long.startsWith(short) && /[\s,]/.test(long[short.length]));
}

/**
 * The words that identify a race: no numbers (so "5K/10K/13.1" isn't shared ground) and no
 * city names (so "Cookie Run Las Vegas" and "Coffee Run Las Vegas" don't match on "Las Vegas").
 */
function identifyingWords(name: string, cityWords: Set<string>): string[] {
  const words = nameTokens(name).filter(t => !/\d/.test(t));
  const withoutCity = words.filter(t => !cityWords.has(t));
  return withoutCity.length ? withoutCity : words;
}

function cityWordsOf(...cities: string[]): Set<string> {
  return new Set(cities.flatMap(c => c.toLowerCase().split(/[^a-z]+/).filter(Boolean)));
}

export function namesSimilar(a: string, b: string, cityWords: Set<string> = new Set()): boolean {
  const ta = identifyingWords(a, cityWords), tb = identifyingWords(b, cityWords);
  if (!ta.length || !tb.length) return false;
  const ja = ta.join(" "), jb = tb.join(" ");
  if (ja === jb) return true;
  if (Math.min(ja.length, jb.length) >= 8 && (ja.includes(jb) || jb.includes(ja))) return true;
  const sa = new Set(ta), sb = new Set(tb);
  const shared = [...sa].filter(t => sb.has(t)).length;
  return shared / new Set([...sa, ...sb]).size >= 0.6;
}

const DAY = 86400000;

export function isLikelyDuplicate(a: RaceLike, b: RaceLike): boolean {
  if (a.id === b.id) return false;
  const dayDiff = Math.abs(new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime()) / DAY;
  if (dayDiff > 1.5) return false;
  const distRatio = Math.abs(a.distanceM - b.distanceM) / Math.max(a.distanceM, b.distanceM, 1);
  const sameDistance = (a.isTriathlon && b.isTriathlon) || distRatio <= 0.1;
  if (!sameDistance) return false;
  if (!citiesMatch(a.city, b.city)) return sameNameExactly(a.name, b.name);
  const cityWords = cityWordsOf(a.city, b.city);
  if (namesSimilar(a.name, b.name, cityWords)) return true;
  // Same city, same day, same distance, and a good share of identifying words in common: most
  // likely one race listed twice under different names.
  if (dayDiff < 0.5 && distRatio <= 0.03) {
    const wa = new Set(identifyingWords(a.name, cityWords)), wb = new Set(identifyingWords(b.name, cityWords));
    const shared = [...wa].filter(w => wb.has(w)).length;
    return shared / new Set([...wa, ...wb]).size >= 0.34;
  }
  return false;
}

const SELECT = { id: true, name: true, city: true, raceDate: true, distanceM: true, isTriathlon: true, status: true } as const;

/** Approved races near any of these dates — the pool new races are checked against. */
async function activeRacesAround(dates: Date[]) {
  if (!dates.length) return [];
  const times = dates.map(d => new Date(d).getTime());
  return prisma.majorRace.findMany({
    where: { status: "active", raceDate: { gte: new Date(Math.min(...times) - 2 * DAY), lte: new Date(Math.max(...times) + 2 * DAY) } },
    select: SELECT,
  });
}

/** For an incoming race (e.g. a member's submission): the listed race it most likely duplicates. */
export async function findListedDuplicate(race: Omit<RaceLike, "id">) {
  const candidates = await activeRacesAround([race.raceDate]);
  return candidates.find(c => isLikelyDuplicate({ ...race, id: "__new" }, c)) ?? null;
}

/**
 * Adds `possibleDuplicate` to each pending race, for the admin panel. A pending race is flagged
 * when it matches an approved race, or a pending race that was submitted before it.
 */
export async function annotatePendingDuplicates<T extends RaceLike & { createdAt: Date }>(pending: T[]) {
  const active = await activeRacesAround(pending.map(p => p.raceDate));
  const byAge = [...pending].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return pending.map(p => {
    const older = byAge.slice(0, byAge.indexOf(p));
    const match = active.find(a => isLikelyDuplicate(p, a)) ?? older.find(o => isLikelyDuplicate(p, o));
    return {
      ...p,
      possibleDuplicate: match ? { id: match.id, name: match.name, city: match.city, raceDate: match.raceDate, distanceM: match.distanceM, status: (match as any).status ?? "pending" } : null,
    };
  });
}

/**
 * Nightly: approve every pending upcoming race that doesn't look like a duplicate. Duplicates
 * (and races whose date has already passed) stay pending for an admin to review.
 */
export async function autoApprovePendingRaces(): Promise<{ approved: number; flagged: number; past: number }> {
  const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const pending = await prisma.majorRace.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, select: SELECT });
  const upcoming = pending.filter(p => p.raceDate >= todayStart);
  const pool: RaceLike[] = await activeRacesAround(upcoming.map(p => p.raceDate));

  const approveIds: string[] = [];
  let flagged = 0;
  for (const race of upcoming) {
    if (pool.some(existing => isLikelyDuplicate(race, existing))) { flagged++; continue; }
    approveIds.push(race.id);
    pool.push(race); // a later pending copy of this race will now be flagged against it
  }
  for (let i = 0; i < approveIds.length; i += 500) {
    await prisma.majorRace.updateMany({ where: { id: { in: approveIds.slice(i, i + 500) }, status: "pending" }, data: { status: "active" } });
  }
  return { approved: approveIds.length, flagged, past: pending.length - upcoming.length };
}
