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

type ForecastDay = { day: string; code: number; hi: number; lo: number };
type WeatherState = { temp: number; feels: number; wind: number; code: number; forecast: ForecastDay[] };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`);
        const wx = await wxRes.json();
        const c = wx.current;
        const d = wx.daily;
        const forecast: ForecastDay[] = (d?.time || []).slice(1, 5).map((dateStr: string, i: number) => ({
          day: DAY_NAMES[new Date(dateStr + "T12:00:00").getDay()],
          code: d.weathercode[i + 1],
          hi: Math.round(d.temperature_2m_max[i + 1]),
          lo: Math.round(d.temperature_2m_min[i + 1]),
        }));
        if (c && !cancelled) setWeather({ temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), wind: Math.round(c.windspeed_10m), code: c.weathercode, forecast });
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
      <div className="flex gap-1 pt-2 mt-1 border-t border-border">
        {[1,2,3,4].map(i => <div key={i} className="flex-1 h-14 bg-border rounded-lg" />)}
      </div>
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
      <p className="text-sm text-foreground-dim">{label} · Feels {weather.feels}°F · {weather.wind} mph</p>
      {goodRunning && <p className="text-xs text-signal mt-1">Great conditions for a run today.</p>}
      {weather.forecast.length > 0 && (
        <div className="flex gap-1 mt-3 pt-3 border-t border-border">
          {weather.forecast.map((f, i) => {
            const [fEmoji] = wmoLabel(f.code);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-xs text-foreground-dim">{f.day}</span>
                <span className="text-base leading-none">{fEmoji}</span>
                <span className="text-xs font-medium">{f.hi}°</span>
                <span className="text-xs text-foreground-dim">{f.lo}°</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
