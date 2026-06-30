"use client";
import { useState, useEffect } from "react";

const WMO_ICON: Record<number, string> = {
  0: "☀️",
  1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️", 56: "🌦️", 57: "🌦️",
  61: "🌧️", 63: "🌧️", 65: "🌧️", 66: "🌧️", 67: "🌧️",
  71: "❄️",  73: "❄️",  75: "❄️",  77: "❄️",
  80: "🌧️", 81: "🌧️", 82: "🌧️",
  85: "❄️",  86: "❄️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

export function WeatherBadge({ city, timezone }: { city: string | null; timezone: string | null }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const useFahrenheit = !timezone || timezone.startsWith("America/") || timezone === "Pacific/Honolulu";
    const unit = useFahrenheit ? "fahrenheit" : "celsius";
    const symbol = useFahrenheit ? "°F" : "°C";

    async function fetchWeather(lat: number, lon: number) {
      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${unit}&forecast_days=1`
      );
      const wx = await wxRes.json();
      if (cancelled) return;
      const temp = Math.round(wx.current?.temperature_2m ?? 0);
      const icon = WMO_ICON[wx.current?.weather_code ?? 0] ?? "🌡️";
      setLabel(`${icon} ${temp}${symbol}`);
    }

    async function fallbackToCity() {
      if (!city) return;
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      const geo = await geoRes.json();
      const loc = geo.results?.[0];
      if (!loc || cancelled) return;
      await fetchWeather(loc.latitude, loc.longitude);
    }

    if (!navigator.geolocation) {
      fallbackToCity().catch(() => {});
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude).catch(() => {});
      },
      () => {
        fallbackToCity().catch(() => {});
      },
      { timeout: 6000 }
    );

    return () => { cancelled = true; };
  }, [city, timezone]);

  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-surface border border-border text-foreground-dim">
      {label}
    </span>
  );
}
