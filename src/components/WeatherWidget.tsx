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

type WeatherState = { temp: number; feels: number; wind: number; code: number };

export function WeatherWidget({ city }: { city: string | null }) {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setWeather(null);

    async function load() {
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`);
        const geoData = await geoRes.json();
        const r = geoData.results?.[0];
        if (!r) return;
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`);
        const wx = await wxRes.json();
        const c = wx.current;
        if (c && !cancelled) setWeather({ temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), wind: Math.round(c.windspeed_10m), code: c.weathercode });
      } catch { /* hide */ } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [city]);

  if (!city) return null;

  if (loading) return (
    <div className="animate-pulse space-y-2">
      <div className="h-8 bg-border rounded-lg w-24" />
      <div className="h-3 bg-border rounded-lg w-36" />
      <div className="h-3 bg-border rounded-lg w-28" />
    </div>
  );

  if (!weather) return <p className="text-sm text-foreground-dim">Weather unavailable for {city}.</p>;

  const [emoji, label] = wmoLabel(weather.code);
  const goodRunning = weather.code <= 2 && weather.temp >= 35 && weather.temp <= 75;

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-3xl leading-none">{emoji}</span>
        <p className="text-3xl font-data font-semibold">{weather.temp}°F</p>
      </div>
      <p className="text-sm text-foreground-dim">{label} · Feels like {weather.feels}°F · Wind {weather.wind} mph</p>
      {goodRunning && <p className="text-xs text-signal mt-1">Great conditions for a run today.</p>}
    </div>
  );
}
