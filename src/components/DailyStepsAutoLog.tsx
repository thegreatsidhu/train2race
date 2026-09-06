"use client";
import { useEffect } from "react";
import { isMedianApp, getRecentDailySteps } from "@/lib/median";

const CHECKED_KEY_PREFIX = "t2r_daily_steps_checked_";
const LOOKBACK_DAYS = 7;

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DailyStepsAutoLog() {
  useEffect(() => {
    if (!isMedianApp()) return;
    const today = todayLocal();
    const checkedKey = CHECKED_KEY_PREFIX + today;
    if (localStorage.getItem(checkedKey)) return; // already ran today

    (async () => {
      try {
        const days = await getRecentDailySteps(LOOKBACK_DAYS);
        // Never log today — its step count is still accumulating, not a finished day yet.
        const candidates = days.filter((d) => d.date !== today);
        if (candidates.length === 0) { localStorage.setItem(checkedKey, "1"); return; }

        const res = await fetch("/api/activities/health-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ externalIds: candidates.map((d) => `steps_${d.date}`) }),
        });
        const { imported } = await res.json().catch(() => ({ imported: [] as string[] }));
        const alreadyLogged = new Set<string>((imported || []).map((id: string) => id.replace("steps_", "")));

        for (const day of candidates) {
          if (alreadyLogged.has(day.date)) continue;
          await fetch("/api/activities/auto-steps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: day.date, steps: day.steps }),
          }).catch(() => {});
        }
        localStorage.setItem(checkedKey, "1");
      } catch {
        // best-effort — try again next app open
      }
    })();
  }, []);

  return null;
}
