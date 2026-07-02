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

const WMO_DESC: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Drizzle", 57: "Drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Rain", 67: "Rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow",
  80: "Showers", 81: "Showers", 82: "Heavy showers",
  85: "Snow", 86: "Snow",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
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
      const code = wx.current?.weather_code ?? 0;
      const icon = WMO_ICON[code] ?? "🌡️";
      const desc = WMO_DESC[code] ?? "";
      setLabel(`${icon} ${temp}${symbol}${desc ? ` · ${desc}` : ""}`);
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
