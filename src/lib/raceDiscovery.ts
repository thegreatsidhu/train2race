import { prisma } from "@/lib/prisma";

const DISTANCE_BUCKETS = [
  { label: "5K",           slug: "5k",       minMi: 3,  maxMi: 3.2,  fallbackM: 5000,  minM: 4000,  maxM: 6000     },
  { label: "10K",          slug: "10k",      minMi: 6,  maxMi: 6.3,  fallbackM: 10000, minM: 9000,  maxM: 11500    },
  { label: "Half Marathon",slug: "half",     minMi: 13, maxMi: 13.2, fallbackM: 21097, minM: 19000, maxM: 23000    },
  { label: "Marathon",     slug: "marathon", minMi: 26, maxMi: 26.3, fallbackM: 42195, minM: 41000, maxM: 43500    },
  { label: "Ultra",        slug: "ultra",    minMi: 30, maxMi: 200,  fallbackM: 80467, minM: 43500, maxM: Infinity },
];

function parseRunSignupDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const datePart = String(s).trim().split(" ")[0];
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

// Parse RunSignup event.distance strings (e.g. "26.2 Miles", "Marathon", "5K", "42.195 Kilometers")
function parseEventDistanceM(distance: string | null | undefined): number | null {
  if (!distance) return null;
  const s = String(distance).trim().toLowerCase();

  if (s === "marathon") return 42195;
  if (s === "half marathon" || s === "half") return 21097;
  if (s === "5k") return 5000;
  if (s === "10k") return 10000;
  if (s === "15k") return 15000;
  if (s === "20k") return 20000;
  if (s === "25k") return 25000;
  if (s === "50k") return 50000;
  if (s === "100k") return 100000;
  if (/^50\s*mi(?:les?)?$/.test(s)) return 80467;
  if (/^100\s*mi(?:les?)?$/.test(s)) return 160934;

  const m = s.match(/^([\d.]+)\s*(mi(?:les?)?|km|k(?:ilo)?m(?:eters?)?|m(?:eters?)?)?$/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (isNaN(num) || num <= 0) return null;
  const unit = (m[2] || "").toLowerCase();

  if (unit.startsWith("km") || unit === "k") return Math.round(num * 1000);
  if (unit === "m" || unit.startsWith("meter")) return Math.round(num);
  // Default: miles (RunSignup is US-centric; numeric-only distances are in miles)
  return Math.round(num * 1609.34);
}

export async function discoverRacesFromRunSignup(): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const now = new Date();
  const startDate = now.toISOString().split("T")[0];
  const endDate = new Date(now.getTime() + 180 * 86400000).toISOString().split("T")[0];

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
        events: "T",
      });
      const res = await fetch(`https://api.runsignup.com/rest/races?${params}`, {
        headers: { Accept: "application/json", "User-Agent": "Train2Race/1.0" },
        // @ts-ignore
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

      // Use the actual event distance when available; fall back to the bucket's canonical value.
      let distanceM = bucket.fallbackM;
      for (const event of race.events ?? []) {
        const parsed = parseEventDistanceM(event.distance);
        if (parsed !== null && parsed >= bucket.minM && parsed <= bucket.maxM) {
          distanceM = parsed;
          break;
        }
      }

      const slugBase = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}-${raceDate.getFullYear()}-${race.race_id}-${bucket.slug}`;

      try {
        await (prisma as any).majorRace.create({
          data: {
            name,
            slug: slugBase,
            city: String(race.address?.city ?? "Unknown").trim(),
            country: String(race.address?.country_code ?? "US"),
            raceDate,
            distanceM,
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
          skipped++;
        } else {
          errors.push(`${name.slice(0, 60)}: ${String(e?.message ?? e).slice(0, 80)}`);
        }
      }
    }
  }

  return { created, skipped, errors };
}

// Delete all pending RunSignup races so a fresh re-discovery can correct any bad data.
export async function clearPendingRunSignupRaces(): Promise<number> {
  const result = await (prisma as any).majorRace.deleteMany({
    where: { status: "pending", source: "runsignup" },
  });
  return result.count;
}
