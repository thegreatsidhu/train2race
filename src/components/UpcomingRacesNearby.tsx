"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

function milesLabel(distanceM: number) {
  const mi = distanceM / 1609.34;
  return mi >= 26 ? "Marathon" : mi >= 13 ? "Half marathon" : mi >= 6 ? `${mi.toFixed(0)}mi` : `${mi.toFixed(1)}mi`;
}

export function UpcomingRacesNearby({ city, registeredRaceId }: { city: string | null; registeredRaceId?: string | null }) {
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setRaces([]);
    fetch(`/api/major-races?city=${encodeURIComponent(city)}&upcoming=1`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setRaces((d.races || []).slice(0, 5)); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [city]);

  if (!city) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => <div key={i} className="rounded-xl border border-border bg-surface h-16 animate-pulse" />)}
    </div>
  );

  if (races.length === 0) return (
    <p className="text-sm text-foreground-dim">No upcoming races found in {city}.</p>
  );

  return (
    <div className="space-y-2">
      {races.map(race => {
        const isRegistered = registeredRaceId === race.id;
        const daysAway = Math.ceil((new Date(race.raceDate).getTime() - today.getTime()) / 86400000);
        return (
          <div key={race.id} className={"rounded-xl border bg-surface px-4 py-3 flex items-center justify-between " + (isRegistered ? "border-signal/40" : "border-border")}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">{race.name}</p>
                {isRegistered && <span className="text-xs px-1.5 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20">Registered</span>}
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
  );
}
