"use client";
import { useEffect, useState } from "react";
import { Confetti } from "@/components/Confetti";

const STREAK_MILESTONES = [7, 14, 30, 60, 100];

const MESSAGES: Record<string, { icon: string; headline: string; sub: string }> = {
  first:     { icon: "🎉", headline: "First workout logged!", sub: "The hardest part is starting. You're officially on your way." },
  streak_7:  { icon: "🔥", headline: "7-day streak!", sub: "Consistency is where fitness is built. Keep it going." },
  streak_14: { icon: "⚡", headline: "Two weeks straight!", sub: "You're forming a real habit now. Impressive." },
  streak_30: { icon: "🏆", headline: "30-day streak!", sub: "A full month without missing a day. You're unstoppable." },
  streak_60: { icon: "🔥", headline: "60-day streak!", sub: "Two months of consistency. Elite level dedication." },
  streak_100:{ icon: "👑", headline: "100-day streak!", sub: "100 days without stopping. Absolutely legendary." },
  plan_25:   { icon: "💪", headline: "25% through your plan!", sub: "You're off to a great start. Stay consistent." },
  plan_50:   { icon: "🎯", headline: "Halfway there!", sub: "50% of your training plan done. The work is paying off." },
  plan_75:   { icon: "🏁", headline: "75% complete!", sub: "The finish line is in sight. Don't let up now." },
  plan_100:  { icon: "🏆", headline: "Training plan complete!", sub: "You've done the work. Race day is yours." },
  miles_100: { icon: "💪", headline: "100 miles this month!", sub: "Serious mileage. Your body is getting stronger." },
};

export function KudosBanner({
  streak, pct, totalWorkouts, monthlyMiles,
}: {
  streak: number; pct: number; totalWorkouts: number; monthlyMiles: number;
}) {
  const [kudo, setKudo] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const param = sp.get("kudo");
    if (param === "first") {
      setKudo("first");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const seen: string[] = JSON.parse(sessionStorage.getItem("t2r-kudos-seen") || "[]");

    // Streak milestones
    for (const n of STREAK_MILESTONES) {
      const key = `streak_${n}`;
      if (streak === n && !seen.includes(key)) {
        sessionStorage.setItem("t2r-kudos-seen", JSON.stringify([...seen, key]));
        setKudo(key);
        return;
      }
    }

    // Plan milestones — show highest unlocked and mark all lower as seen
    if (totalWorkouts > 0) {
      const hit = [25, 50, 75, 100].filter(n => pct >= n && !seen.includes(`plan_${n}`));
      if (hit.length > 0) {
        const highest = hit[hit.length - 1];
        const allHit = [25, 50, 75, 100].filter(n => pct >= n).map(n => `plan_${n}`);
        sessionStorage.setItem("t2r-kudos-seen", JSON.stringify([...new Set([...seen, ...allHit])]));
        setKudo(`plan_${highest}`);
        return;
      }
    }

    // Monthly mileage
    if (monthlyMiles >= 100 && !seen.includes("miles_100")) {
      sessionStorage.setItem("t2r-kudos-seen", JSON.stringify([...seen, "miles_100"]));
      setKudo("miles_100");
    }
  }, [streak, pct, totalWorkouts, monthlyMiles]);

  if (!kudo || !MESSAGES[kudo]) return null;
  const { icon, headline, sub } = MESSAGES[kudo];
  const isFirst = kudo === "first";

  return (
    <>
      <Confetti active={isFirst} />
    <div className="mb-6 rounded-2xl border border-signal/40 bg-signal/10 px-5 py-4 flex items-start gap-4">
      <span className="text-3xl shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{headline}</p>
        <p className="text-sm text-foreground-dim mt-0.5">{sub}</p>
      </div>
      <button onClick={() => setKudo(null)} className="shrink-0 self-start text-foreground-dim hover:text-foreground transition-colors text-sm leading-none mt-0.5" aria-label="Dismiss">✕</button>
    </div>
    </>
  );
}
