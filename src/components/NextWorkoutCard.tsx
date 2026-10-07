import Link from "next/link";
import { dateFromKey } from "@/lib/userDate";

const TYPE_LABEL: Record<string, string> = {
  easy_run: "Easy run", tempo: "Tempo", intervals: "Intervals", long_run: "Long run",
  cross_train: "Cross-train", swim: "Swim", bike: "Bike", brick: "Brick", race: "Race day",
};

interface Props {
  /** User's local today, "YYYY-MM-DD" */
  todayKey: string;
  workout: {
    dateKey: string;
    type: string;
    title: string;
    description: string | null;
    distanceKm: number | null;
    durationMin: number | null;
    raceId: string;
    raceName: string | null;
  };
}

function dayLabel(dateKey: string, todayKey: string): string {
  const diffDays = Math.round((dateFromKey(dateKey).getTime() - dateFromKey(todayKey).getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  const opts: Intl.DateTimeFormatOptions = diffDays < 7
    ? { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }
    : { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" };
  return dateFromKey(dateKey).toLocaleDateString("en-US", opts);
}

// The next incomplete workout from the user's local today onward, across all of their plans.
export function NextWorkoutCard({ todayKey, workout: w }: Props) {
  const stats = [
    w.distanceKm ? (w.distanceKm / 1.60934).toFixed(1) + " mi" : null,
    w.durationMin ? w.durationMin + " min" : null,
  ].filter(Boolean);

  return (
    <section className="mb-6 rounded-2xl border border-signal/30 bg-signal/5 px-5 py-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs text-signal font-medium uppercase tracking-[0.12em]">Next workout · {dayLabel(w.dateKey, todayKey)}</p>
        {TYPE_LABEL[w.type] && <span className="text-xs text-foreground-dim shrink-0">{TYPE_LABEL[w.type]}</span>}
      </div>
      <p className="font-semibold text-lg leading-tight">{w.title}</p>
      {stats.length > 0 && <p className="text-sm font-data mt-1">{stats.join(" · ")}</p>}
      {w.description && <p className="text-sm text-foreground-dim mt-2 leading-relaxed whitespace-pre-wrap break-words">{w.description}</p>}
      <Link href={"/dashboard/races/" + w.raceId} className="inline-block mt-3 text-xs text-signal hover:underline">
        {w.raceName ? `View ${w.raceName} plan →` : "View race plan →"}
      </Link>
    </section>
  );
}
