"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function milesLabel(distanceM: number) {
  const mi = distanceM / 1609.34;
  if (distanceM >= 200000) return "140.6 Ironman";
  if (distanceM >= 100000) return "70.3 Half Ironman";
  return mi >= 26 ? "Marathon" : mi >= 13 ? "Half Marathon" : mi >= 6 ? `${mi.toFixed(0)} mi` : `${mi.toFixed(1)} mi`;
}

export function UpcomingRacesNearby({ city, registeredRaceIds, hasRacePlan }: { city: string | null; registeredRaceIds: string[]; hasRacePlan: boolean }) {
  const router = useRouter();
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addErrorId, setAddErrorId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

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

  async function joinEvent(race: any, navigate: boolean) {
    setAddingId(race.id);
    await fetch("/api/major-races/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ majorRaceId: race.id, isPublic: true }),
    });
    setJoinedIds(prev => new Set(prev).add(race.id));
    setAddingId(null);
    if (navigate) router.push(`/dashboard/community?race=${race.id}`);
  }

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
      {[1, 2, 3].map(i => <div key={i} className="rounded-xl border border-border bg-surface h-14 animate-pulse" />)}
    </div>
  );

  if (races.length === 0) return (
    <p className="text-sm text-foreground-dim">No upcoming races found in {city}.</p>
  );

  return (
    <div className="space-y-2">
      {races.map(race => {
        const isRegistered = registeredRaceIds.includes(race.id) || joinedIds.has(race.id);
        const isExpanded = expandedId === race.id;
        const daysAway = Math.ceil((new Date(race.raceDate).getTime() - today.getTime()) / 86400000);

        return (
          <div key={race.id} className={"rounded-xl border bg-surface overflow-hidden transition-colors " + (isRegistered ? "border-signal/40" : "border-border")}>
            {/* Main row */}
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{race.name}</p>
                  {isRegistered && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20 shrink-0">Registered</span>
                  )}
                  {race.isTriathlon && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-900/40 text-cyan-300 border border-cyan-700/40 shrink-0">Triathlon</span>
                  )}
                </div>
                <p className="text-xs text-foreground-dim mt-0.5">
                  {new Date(race.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" · "}{milesLabel(race.distanceM)}
                  {" · "}{daysAway} days away
                </p>
              </div>
              <button
                onClick={() => setExpandedId(isExpanded ? null : race.id)}
                className={"text-xs px-3 py-1.5 rounded-full border transition-colors shrink-0 " + (isExpanded ? "bg-surface-raised border-signal/40 text-signal" : "border-border text-foreground-dim hover:border-signal/30 hover:text-foreground")}
              >
                {isExpanded ? "Close" : "Details"}
              </button>
            </div>

            {/* Details panel */}
            {isExpanded && (
              <div className="border-t border-border/60 px-4 py-4 bg-surface-raised/40 space-y-3">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Location</p>
                    <p className="text-sm">{[race.city, race.country].filter(Boolean).join(", ") || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Distance</p>
                    <p className="text-sm">{milesLabel(race.distanceM)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Date</p>
                    <p className="text-sm">{new Date(race.raceDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Athletes registered</p>
                    <p className="text-sm">{race._count.registrations}</p>
                  </div>
                </div>

                {race.website && (
                  <a href={race.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-signal hover:underline">
                    Official website ↗
                  </a>
                )}

                {/* Action */}
                <div className="pt-1">
                  {isRegistered ? (
                    <Link href={`/dashboard/community?race=${race.id}`}
                      className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-signal text-background text-sm font-medium hover:opacity-90 transition-opacity">
                      Go to community →
                    </Link>
                  ) : hasRacePlan ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => joinEvent(race, true)}
                        disabled={addingId === race.id}
                        className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-signal text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {addingId === race.id ? "Joining…" : "Join community →"}
                      </button>
                      <button
                        onClick={() => joinEvent(race, false)}
                        disabled={addingId === race.id}
                        className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50"
                      >
                        Add to my events
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToPlan(race)}
                      disabled={addingId === race.id}
                      className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-signal text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {addingId === race.id ? "Adding to plan…" : addErrorId === race.id ? "Failed — tap to retry" : "Add to my races →"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
