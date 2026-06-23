"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { "User-Agent": "Train2Race/1.0" } }
    );
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || null;
  } catch { return null; }
}

function milesLabel(distanceM: number) {
  const mi = distanceM / 1609.34;
  return mi >= 26 ? "Marathon" : mi >= 13 ? "Half marathon" : mi >= 6 ? `${mi.toFixed(0)}mi` : `${mi.toFixed(1)}mi`;
}

export function UpcomingRacesNearby({ fallbackCity, registeredRaceId }: { fallbackCity?: string | null; registeredRaceId?: string | null }) {
  const [city, setCity] = useState<string | null>(null);
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let detectedCity: string | null = null;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) { reject(new Error("unavailable")); return; }
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
        });
        detectedCity = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      } catch {
        detectedCity = fallbackCity || null;
      }

      if (detectedCity && !cancelled) {
        setCity(detectedCity);
        try {
          const res = await fetch(`/api/major-races?city=${encodeURIComponent(detectedCity)}&upcoming=1`);
          const data = await res.json();
          if (!cancelled) setRaces((data.races || []).slice(0, 5));
        } catch { /* no races */ }
      }

      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [fallbackCity]);

  if (loading) return (
    <section className="mb-6">
      <div className="h-4 bg-border rounded w-48 mb-3 animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="rounded-xl border border-border bg-surface px-4 py-3 h-16 animate-pulse" />)}
      </div>
    </section>
  );

  if (!city || races.length === 0) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <section className="mb-6">
      <h2 className="text-sm font-medium text-foreground-dim mb-3">Upcoming races in {city}</h2>
      <div className="space-y-2">
        {races.map(race => {
          const isRegistered = registeredRaceId === race.id;
          const daysAway = Math.ceil((new Date(race.raceDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return (
            <div key={race.id} className={"rounded-xl border bg-surface px-4 py-3 flex items-center justify-between " + (isRegistered ? "border-signal/40" : "border-border")}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{race.name}</p>
                  {isRegistered && <span className="text-xs px-1.5 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20">You're registered</span>}
                </div>
                <p className="text-xs text-foreground-dim mt-0.5">
                  {new Date(race.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {milesLabel(race.distanceM)} · {daysAway} days away
                </p>
                <p className="text-xs text-foreground-dim">{race._count.registrations} registered</p>
              </div>
              <Link href={`/community/${race.id}`} className="text-xs text-signal hover:underline shrink-0 ml-4">View →</Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
