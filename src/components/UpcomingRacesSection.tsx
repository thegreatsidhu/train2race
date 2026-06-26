"use client";
import { useState, useEffect } from "react";
import { UpcomingRacesNearby } from "./UpcomingRacesNearby";

const STORAGE_KEY = "t2r-location";

export function UpcomingRacesSection({
  defaultCity,
  registeredRaceIds,
}: {
  defaultCity: string | null;
  registeredRaceIds?: string[];
}) {
  const [city, setCity] = useState<string>(defaultCity || "");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCity(saved);
    else if (defaultCity) setCity(defaultCity);
  }, [defaultCity]);

  if (!city) return null;

  return (
    <section className="mb-6">
      <h2 className="text-sm font-medium text-foreground-dim mb-3">
        Upcoming races in {city}
      </h2>
      <UpcomingRacesNearby city={city} registeredRaceIds={registeredRaceIds ?? []} />
    </section>
  );
}
