// @ts-nocheck
import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperUser } from "@/lib/superuser";
import { sendPush } from "@/lib/oneSignal";
import { DAY_NAMES, parseRunFields, fmtClockTime } from "@/lib/clubRuns";
import { localDateKey } from "@/lib/userDate";

// Edit a weekly group run. Upcoming RSVPs are kept when they still make sense:
//  - day changed        → upcoming RSVPs (and cancelled weeks) no longer match a date, so they're
//                         cleared and those members are told the run moved
//  - start time changed → RSVPs kept; RSVP'd members are told the new time
//  - pace group removed → those members' RSVPs stay but lose their group, and they're asked to
//                         pick again (the tab prompts them)
// The club's time zone is kept from when the run was created.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } }, select: { role: true } });
  if (member?.role !== "admin" && !isSuperUser(session.user.email)) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const run = await prisma.clubRun.findFirst({ where: { id: runId, teamId: id }, include: { team: { select: { name: true } } } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = parseRunFields(await req.json().catch(() => ({})));
  if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });

  const todayKey = localDateKey(run.timezone);
  const upcoming = { clubRunId: run.id, date: { gte: todayKey } };
  const dayChanged = fields.dayOfWeek !== run.dayOfWeek;
  const timeChanged = !dayChanged && fields.startTime !== run.startTime;
  const removedGroups = run.paceGroups.filter(g => !fields.paceGroups.includes(g));

  // Who to tell, worked out before the RSVPs change.
  const affected = dayChanged || timeChanged
    ? await prisma.clubRunRsvp.findMany({ where: upcoming, select: { userId: true } })
    : removedGroups.length && fields.paceGroups.length // dropping pace groups entirely needs no re-pick
      ? await prisma.clubRunRsvp.findMany({ where: { ...upcoming, paceGroup: { in: removedGroups } }, select: { userId: true } })
      : [];

  await prisma.$transaction([
    prisma.clubRun.update({
      where: { id: run.id },
      data: { ...fields, ...(dayChanged ? { cancelledDates: run.cancelledDates.filter(d => d < todayKey) } : {}) },
    }),
    ...(dayChanged
      ? [prisma.clubRunRsvp.deleteMany({ where: upcoming })]
      : removedGroups.length
        ? [prisma.clubRunRsvp.updateMany({ where: { ...upcoming, paceGroup: { in: removedGroups } }, data: { paceGroup: null } })]
        : []),
  ]);

  const notify = [...new Set(affected.map(a => a.userId))].filter(u => u !== userId);
  if (notify.length) {
    after(async () => {
      const targets = (await prisma.user.findMany({ where: { id: { in: notify }, pushEnabled: true }, select: { id: true } })).map(u => u.id);
      const message = dayChanged
        ? `Now every ${DAY_NAMES[fields.dayOfWeek]} at ${fmtClockTime(fields.startTime)}. Please RSVP again.`
        : timeChanged
          ? `Now starts at ${fmtClockTime(fields.startTime)}. Your RSVP still stands.`
          : `Your pace group changed. Please pick a new one.`;
      await sendPush({
        userId: targets,
        title: `${fields.title} (${run.team.name}) changed`,
        message,
        data: { type: "club_run", teamId: id },
      });
    });
  }

  return NextResponse.json({ ok: true, rsvpsCleared: dayChanged, notified: notify.length });
}
