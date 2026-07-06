import { prisma } from "@/lib/prisma";

const DISTANCE_BUCKETS = [
  { label: "5K",           slug: "5k",       minMi: 3,  maxMi: 3.2,  distanceM: 5000  },
  { label: "10K",          slug: "10k",      minMi: 6,  maxMi: 6.3,  distanceM: 10000 },
  { label: "Half Marathon",slug: "half",     minMi: 13, maxMi: 13.2, distanceM: 21097 },
  { label: "Marathon",     slug: "marathon", minMi: 26, maxMi: 26.3, distanceM: 42195 },
  { label: "Ultra",        slug: "ultra",    minMi: 30, maxMi: 200,  distanceM: 80467 },
];

function parseRunSignupDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const datePart = String(s).trim().split(" ")[0]; // handles "6/1/2026 00:00" and "06/01/2026"
  const parts = datePart.split("/").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [m, d, y] = parts;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function getBestDate(race: any, after: Date): Date | null {
  const nd = parseRunSignupDate(race.next_date);
  if (nd && nd >= after) return nd;
  for (const day of race.race_event_days ?? []) {
    const d = parseRunSignupDate(day.start_date);
    if (d && d >= after) return d;
  }
  return null;
}

export async function discoverRacesFromRunSignup(): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const now = new Date();
  const startDate = now.toISOString().split("T")[0];
  const endDate = new Date(now.getTime() + 180 * 86400000).toISOString().split("T")[0];

  // Bulk-load existing RunSignup externalIds to avoid per-row DB lookups
  const existing = await (prisma as any).majorRace.findMany({
    where: { externalId: { startsWith: "runsignup-" } },
    select: { externalId: true },
  });
  const existingIds = new Set<string>(existing.map((r: any) => r.externalId).filter(Boolean));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const bucket of DISTANCE_BUCKETS) {
    let races: any[] = [];
    try {
      const params = new URLSearchParams({
        format: "json",
        results_per_page: "100",
        start_date: startDate,
        end_date: endDate,
        min_distance: String(bucket.minMi),
        max_distance: String(bucket.maxMi),
        distance_units: "M",
        country: "US",
        sort: "date ASC",
        include_event_days: "T",
      });
      const res = await fetch(`https://api.runsignup.com/rest/races?${params}`, {
        headers: { Accept: "application/json", "User-Agent": "Train2Race/1.0" },
        // @ts-ignore — AbortSignal.timeout is available in Node 18+
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) { errors.push(`${bucket.label}: HTTP ${res.status}`); continue; }
      const data = await res.json();
      races = data.races ?? [];
    } catch (e: any) {
      errors.push(`${bucket.label} fetch: ${String(e?.message ?? e).slice(0, 120)}`);
      continue;
    }

    for (const raceObj of races) {
      const race = raceObj?.race;
      if (!race?.race_id) continue;

      const externalId = `runsignup-${race.race_id}-${bucket.slug}`;
      if (existingIds.has(externalId)) { skipped++; continue; }

      const raceDate = getBestDate(race, now);
      if (!raceDate) { skipped++; continue; }

      const name = String(race.name ?? "").trim();
      if (!name) { skipped++; continue; }

      const slugBase = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}-${raceDate.getFullYear()}-${race.race_id}-${bucket.slug}`;

      try {
        await (prisma as any).majorRace.create({
          data: {
            name,
            slug: slugBase,
            city: String(race.address?.city ?? "Unknown").trim(),
            country: String(race.address?.country_code ?? "US"),
            raceDate,
            distanceM: bucket.distanceM,
            isTriathlon: false,
            website: race.url ?? null,
            status: "pending",
            source: "runsignup",
            externalId,
          },
        });
        existingIds.add(externalId);
        created++;
      } catch (e: any) {
        if (e?.code === "P2002") {
          skipped++; // unique constraint (slug or externalId collision)
        } else {
          errors.push(`${name.slice(0, 60)}: ${String(e?.message ?? e).slice(0, 80)}`);
        }
      }
    }
  }

  return { created, skipped, errors };
}
