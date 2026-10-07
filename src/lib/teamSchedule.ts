import { prisma } from "@/lib/prisma";
import { upcomingDates, wallTimeToInstant } from "@/lib/clubRuns";
import { DEFAULT_TIMEZONE } from "@/lib/userDate";

// What's coming up across all of a user's teams, for the Today page: run clubs' weekly group runs
// (next non-cancelled week of each) and one-off team events.

export interface TeamScheduleItem {
  kind: "run" | "event";
  key: string;
  teamId: string;
  teamName: string;
  title: string;
  dateKey: string;      // "YYYY-MM-DD", local to the club / as the captain entered it
  time: string | null;  // "HH:MM"
  place: string | null;
  going: number | null; // group runs only
  myRsvp: boolean;
  startsAt: number;     // ms, for sorting
}

const WINDOW_DAYS = 14;

export async function getUpcomingTeamSchedule(userId: string, userTz: string | null, limit = 4): Promise<TeamScheduleItem[]> {
  const now = new Date();
  const horizon = now.getTime() + WINDOW_DAYS * 86400000;
  const inMyTeams = { members: { some: { userId } } };

  const [events, runs] = await Promise.all([
    prisma.teamEvent.findMany({
      // Event times are the captain's wall-clock time stored as UTC (see the events route), so a
      // day of slack either side covers every time zone; exact filtering happens below.
      where: { team: inMyTeams, eventDate: { gte: new Date(now.getTime() - 86400000), lte: new Date(horizon + 86400000) } },
      orderBy: { eventDate: "asc" },
      take: 20,
      select: { id: true, title: true, eventDate: true, location: true, teamId: true, team: { select: { name: true } } },
    }),
    prisma.clubRun.findMany({
      where: { team: { ...inMyTeams, isRunClub: true } },
      take: 50,
      select: { id: true, title: true, dayOfWeek: true, startTime: true, timezone: true, meetingPoint: true, cancelledDates: true, teamId: true, team: { select: { name: true } } },
    }),
  ]);

  const items: TeamScheduleItem[] = [];

  for (const e of events) {
    const iso = e.eventDate.toISOString();
    const dateKey = iso.slice(0, 10);
    const time = iso.slice(11, 16);
    const startsAt = wallTimeToInstant(dateKey, time, userTz || DEFAULT_TIMEZONE).getTime();
    if (startsAt < now.getTime() || startsAt > horizon) continue;
    items.push({ kind: "event", key: "e" + e.id, teamId: e.teamId, teamName: e.team.name, title: e.title, dateKey, time, place: e.location, going: null, myRsvp: false, startsAt });
  }

  const nextRuns = runs.flatMap(r => {
    const date = upcomingDates(r, 4).find(d => !r.cancelledDates.includes(d));
    if (!date) return [];
    const startsAt = wallTimeToInstant(date, r.startTime, r.timezone).getTime();
    return startsAt > horizon ? [] : [{ run: r, date, startsAt }];
  });
  const rsvps = nextRuns.length
    ? await prisma.clubRunRsvp.findMany({
        where: { OR: nextRuns.map(n => ({ clubRunId: n.run.id, date: n.date })) },
        select: { clubRunId: true, date: true, userId: true },
      })
    : [];
  for (const { run, date, startsAt } of nextRuns) {
    const going = rsvps.filter(v => v.clubRunId === run.id && v.date === date);
    items.push({
      kind: "run", key: "r" + run.id + date, teamId: run.teamId, teamName: run.team.name, title: run.title,
      dateKey: date, time: run.startTime, place: run.meetingPoint, going: going.length,
      myRsvp: going.some(v => v.userId === userId), startsAt,
    });
  }

  return items.sort((a, b) => a.startsAt - b.startsAt).slice(0, limit);
}
