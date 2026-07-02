"use client";
import { useState, useEffect } from "react";
import { UpcomingRacesNearby } from "./UpcomingRacesNearby";

const STORAGE_KEY = "t2r-location";

export function UpcomingRacesSection({
  defaultCity,
  registeredRaceIds,
  hasRacePlan,
}: {
  defaultCity: string | null;
  registeredRaceIds?: string[];
  hasRacePlan?: boolean;
}) {
  const [city, setCity] = useState<string>(defaultCity || "");
  const [hasRaces, setHasRaces] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCity(saved);
    else if (defaultCity) setCity(defaultCity);
  }, [defaultCity]);

  if (!city) return null;
  if (hasRaces === false) return null;

  return (
    <details className="mb-6 group">
      <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden mb-3 py-0.5 border-b border-border">
        <h2 className="text-sm font-medium text-foreground-dim select-none">Upcoming races near you</h2>
        <span className="text-foreground-dim text-xs select-none transition-transform group-open:rotate-180 inline-block mr-0.5">▾</span>
      </summary>
      <div className="pt-1">
        <UpcomingRacesNearby
          city={city}
          registeredRaceIds={registeredRaceIds ?? []}
          hasRacePlan={hasRacePlan ?? false}
          onHasRaces={setHasRaces}
        />
      </div>
    </details>
  );
}
