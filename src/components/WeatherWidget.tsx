"use client";
import { useState, useEffect } from "react";

const WMO: Record<number, [string, string]> = {
  0:  ["☀️",  "Clear"],
  1:  ["🌤️", "Mainly clear"],
  2:  ["⛅",  "Partly cloudy"],
  3:  ["☁️",  "Overcast"],
  45: ["🌫️", "Foggy"],
  48: ["🌫️", "Icy fog"],
  51: ["🌦️", "Light drizzle"],
  53: ["🌦️", "Drizzle"],
  55: ["🌧️", "Heavy drizzle"],
  61: ["🌧️", "Light rain"],
  63: ["🌧️", "Rain"],
  65: ["🌧️", "Heavy rain"],
  71: ["❄️",  "Light snow"],
  73: ["❄️",  "Snow"],
  75: ["❄️",  "Heavy snow"],
  80: ["🌦️", "Showers"],
  81: ["🌧️", "Heavy showers"],
  95: ["⛈️",  "Thunderstorm"],
};

function wmoLabel(code: number): [string, string] {
  const keys = Object.keys(WMO).map(Number).sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (code >= keys[i]) return WMO[keys[i]];
  }
  return ["🌡️", "Unknown"];
}

async function getWeather(lat: number, lng: number) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
  );
  return res.json();
}

async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`
  );
  const data = await res.json();
  const r = data.results?.[0];
  return r ? { lat: r.latitude, lng: r.longitude } : null;
}

async function weatherForCity(city: string): Promise<{ temp: number; feels: number; wind: number; code: number; city: string } | null> {
  const coords = await geocodeCity(city);
  if (!coords) return null;
  const data = await getWeather(coords.lat, coords.lng);
  const c = data.current;
  if (!c) return null;
  return { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), wind: Math.round(c.windspeed_10m), code: c.weathercode, city };
}

type WeatherState = { temp: number; feels: number; wind: number; code: number; city: string };

export function WeatherWidget({ raceCity, timezoneCity }: { raceCity?: string | null; timezoneCity?: string | null }) {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

  async function loadWeather(skipGeo = false) {
    setLoading(true);
    setLocationDenied(false);
    try {
      if (!skipGeo) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) { reject(new Error("unavailable")); return; }
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
        });
        const data = await getWeather(pos.coords.latitude, pos.coords.longitude);
        const c = data.current;
        if (c) { setWeather({ temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), wind: Math.round(c.windspeed_10m), code: c.weathercode, city: "Your location" }); return; }
      }
    } catch {
      setLocationDenied(true);
    }
    // Fallbacks: race city → timezone city
    for (const city of [raceCity, timezoneCity].filter(Boolean) as string[]) {
      const w = await weatherForCity(city);
      if (w) { setWeather(w); return; }
    }
  }

  useEffect(() => {
    let cancelled = false;
    loadWeather().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [raceCity, timezoneCity]);

  if (loading) return (
    <div className="rounded-2xl border border-border bg-surface p-5 animate-pulse">
      <p className="text-xs text-foreground-dim uppercase tracking-wide mb-3">Weather</p>
      <div className="h-8 bg-border rounded-lg w-20 mb-2" />
      <div className="h-3 bg-border rounded-lg w-32" />
    </div>
  );

  if (!weather) return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
      <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Weather</p>
      <p className="text-sm text-foreground-dim mb-3">Allow location access to see conditions in your area.</p>
      <button onClick={() => { setLoading(true); loadWeather(false).finally(() => setLoading(false)); }}
        className="text-xs text-signal hover:underline text-left">Grant location access →</button>
    </div>
  );

  const [emoji, label] = wmoLabel(weather.code);
  const isGoodRunningWeather = weather.code <= 2 && weather.temp >= 35 && weather.temp <= 75;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs text-foreground-dim uppercase tracking-wide mb-3">Weather · {weather.city}</p>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-3xl leading-none">{emoji}</span>
        <p className="text-3xl font-data font-semibold">{weather.temp}°F</p>
      </div>
      <p className="text-sm text-foreground-dim">{label}</p>
      <p className="text-xs text-foreground-dim mt-1">Feels like {weather.feels}°F · Wind {weather.wind} mph</p>
      {isGoodRunningWeather && <p className="text-xs text-signal mt-2">Great conditions for a run today.</p>}
    </div>
  );
}
