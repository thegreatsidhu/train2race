"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { WeatherWidget } from "./WeatherWidget";

const STORAGE_KEY = "t2r-location";

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { "User-Agent": "Train2Race/1.0" } }
    );
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || null;
  } catch { return null; }
}

type LeaderboardEntry = { userId: string; name: string; pct: number; isMe: boolean };

export function LocalSection({
  defaultCity,
  leaderboard,
  teamId,
  teamName,
}: {
  defaultCity: string | null;
  leaderboard: LeaderboardEntry[];
  teamId?: string | null;
  teamName?: string | null;
}) {
  const [city, setCity] = useState<string>(defaultCity || "");
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCity(saved);
    else if (defaultCity) setCity(defaultCity);
  }, [defaultCity]);

  function openEdit() {
    setInput(city);
    setGeoError("");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function saveCity(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCity(trimmed);
    localStorage.setItem(STORAGE_KEY, trimmed);
    setEditing(false);
    setGeoError("");
  }

  async function useMyLocation() {
    setGeoLoading(true);
    setGeoError("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error("unavailable")); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
      });
      const detected = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (detected) { saveCity(detected); }
      else setGeoError("Couldn't detect city. Enter it manually.");
    } catch {
      setGeoError("Location access denied. Enter your city below.");
    } finally {
      setGeoLoading(false);
    }
  }

  return (
    <div>
      {/* Weather + Team leaderboard grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-border bg-surface p-5">
          {/* Location inside weather card */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-foreground-dim">📍</span>
              {editing ? (
                <form onSubmit={e => { e.preventDefault(); saveCity(input); }} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="City name"
                    className="px-2 py-0.5 rounded-lg bg-background border border-signal text-sm outline-none w-32"
                  />
                  <button type="submit" className="text-xs text-signal font-medium hover:underline">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="text-xs text-foreground-dim hover:underline">Cancel</button>
                </form>
              ) : (
                <>
                  <span className="text-xs font-medium uppercase tracking-wide text-foreground-dim truncate">{city || "Set location"}</span>
                  <button onClick={openEdit} className="text-xs text-signal hover:underline shrink-0">Change</button>
                </>
              )}
            </div>
            {editing && (
              <button
                onClick={useMyLocation}
                disabled={geoLoading}
                className="text-xs text-foreground-dim hover:text-foreground disabled:opacity-50 transition-colors shrink-0 ml-2"
              >
                {geoLoading ? "Detecting…" : "Use my location"}
              </button>
            )}
          </div>
          {geoError && <p className="text-xs text-red-400 mb-2 -mt-1">{geoError}</p>}
          <WeatherWidget city={city || null} />
        </div>

        {leaderboard.length > 0 && teamId ? (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-foreground-dim uppercase tracking-wide">Team leaderboard</p>
              <Link href={"/dashboard/teams/" + teamId} className="text-xs text-signal hover:underline">{teamName} →</Link>
            </div>
            <div className="space-y-2">
              {leaderboard.map((m, i) => (
                <div key={m.userId} className={"flex items-center justify-between rounded-lg px-3 py-2 " + (m.isMe ? "bg-signal/10 border border-signal/20" : "bg-background border border-border")}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-5 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                    <p className="text-sm font-medium">{m.name.split(" ")[0]}{m.isMe ? " (you)" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-border rounded-full hidden sm:block">
                      <div className={"h-1.5 rounded-full " + (m.isMe ? "bg-signal" : i === 0 ? "bg-yellow-400" : "bg-foreground-dim")} style={{ width: m.pct + "%" }} />
                    </div>
                    <span className="text-xs text-foreground-dim w-8 text-right">{m.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Link href="/dashboard/teams" className="rounded-2xl border border-dashed border-border bg-surface/50 p-5 hover:bg-surface-raised transition-colors block">
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Team leaderboard</p>
            <p className="text-sm text-foreground-dim mb-3">Join a team to race your training partners to the finish line.</p>
            <span className="text-xs text-signal">Find a team →</span>
          </Link>
        )}
      </div>

    </div>
  );
}
