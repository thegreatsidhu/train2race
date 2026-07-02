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

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCity(saved);
    else if (defaultCity) setCity(defaultCity);
  }, [defaultCity]);

  if (!city) return null;

  return (
    <section className="mb-6">
      <UpcomingRacesNearby city={city} registeredRaceIds={registeredRaceIds ?? []} hasRacePlan={hasRacePlan ?? false} />
    </section>
  );
}
