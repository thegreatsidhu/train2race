import Link from "next/link";
import { dateFromKey } from "@/lib/userDate";
import { fmtClockTime, fmtRunDate } from "@/lib/clubRuns";
import type { TeamScheduleItem } from "@/lib/teamSchedule";

function dayLabel(dateKey: string, todayKey: string): string {
  const diff = Math.round((dateFromKey(dateKey).getTime() - dateFromKey(todayKey).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return fmtRunDate(dateKey);
}

// "Coming up with your teams" on the Today page: group runs and team events in the next 2 weeks.
export function UpcomingTeamSchedule({ items, todayKey }: { items: TeamScheduleItem[]; todayKey: string }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-sm font-medium text-foreground-dim mb-3">Coming up with your teams</h2>
      <div className="space-y-2">
        {items.map(it => (
          <Link key={it.key} href={`/dashboard/teams/${it.teamId}?tab=${it.kind === "run" ? "runs" : "events"}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-raised transition-colors">
            <span className="text-lg shrink-0" aria-hidden>{it.kind === "run" ? "🏃" : "📅"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{it.title}</p>
              <p className="text-xs text-foreground-dim truncate">
                <span className="text-signal">{dayLabel(it.dateKey, todayKey)}{it.time ? ` · ${fmtClockTime(it.time)}` : ""}</span>
                {" · "}{it.teamName}{it.place ? ` · ${it.place}` : ""}
              </p>
            </div>
            {it.kind === "run" && (
              <span className={"shrink-0 text-xs px-2 py-0.5 rounded-full " + (it.myRsvp ? "bg-signal text-background font-medium" : "border border-border text-foreground-dim")}>
                {it.myRsvp ? "✓ Going" : `${it.going} going · RSVP`}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
