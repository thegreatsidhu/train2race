"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function milesLabel(distanceM: number) {
  const mi = distanceM / 1609.34;
  return mi >= 26 ? "Marathon" : mi >= 13 ? "Half marathon" : mi >= 6 ? `${mi.toFixed(0)}mi` : `${mi.toFixed(1)}mi`;
}

export function UpcomingRacesNearby({ city, registeredRaceIds }: { city: string | null; registeredRaceIds: string[] }) {
  const router = useRouter();
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addErrorId, setAddErrorId] = useState<string | null>(null);

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

  async function addToPlan(race: any) {
    setAddingId(race.id);
    setAddErrorId(null);
    try {
      const rtRes = await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceName: race.name, raceDate: race.raceDate, distanceM: race.distanceM, isTriathlon: race.isTriathlon ?? false }),
      });
      if (!rtRes.ok) throw new Error();
      const { race: rt } = await rtRes.json();
      await fetch("/api/major-races/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ majorRaceId: race.id, raceTargetId: rt.id, isPublic: true }),
      });
      router.push("/dashboard/plan");
    } catch {
      setAddErrorId(race.id);
      setAddingId(null);
    }
  }

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
        const isRegistered = registeredRaceIds.includes(race.id);
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
            {isRegistered ? (
              <Link href={`/dashboard/community?race=${race.id}`} className="text-xs text-signal hover:underline shrink-0 ml-4">Community →</Link>
            ) : (
              <button
                onClick={() => addToPlan(race)}
                disabled={addingId === race.id}
                className="text-xs text-signal hover:underline shrink-0 ml-4 disabled:opacity-50"
              >
                {addingId === race.id ? "Adding..." : addErrorId === race.id ? "Failed — retry" : "Add to plan →"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
