// @ts-nocheck
import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperUser } from "@/lib/superuser";
import { sendPush } from "@/lib/oneSignal";
import { DAY_NAMES, upcomingDates, isValidZone, parseRunFields } from "@/lib/clubRuns";
import { DEFAULT_TIMEZONE } from "@/lib/userDate";

// Weekly group runs for run clubs. Members can see them and RSVP; captains create, cancel single
// weeks, and delete them. Occurrences are computed (see src/lib/clubRuns.ts), not stored.

const OCCURRENCES_SHOWN = 3;

async function membership(teamId: string, userId: string) {
  return prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } }, select: { role: true } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  if (!(await membership(id, userId)) && !isSuperUser(session.user.email)) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const runs = await prisma.clubRun.findMany({ where: { teamId: id }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] });
  const datesByRun = Object.fromEntries(runs.map(r => [r.id, upcomingDates(r, OCCURRENCES_SHOWN)]));
  const rsvps = runs.length
    ? await prisma.clubRunRsvp.findMany({
        where: { OR: runs.map(r => ({ clubRunId: r.id, date: { in: datesByRun[r.id] } })) },
        orderBy: { createdAt: "asc" },
        select: { clubRunId: true, date: true, userId: true, paceGroup: true, user: { select: { name: true } } },
      })
    : [];

  return NextResponse.json({
    runs: runs.map(r => ({
      id: r.id, title: r.title, dayOfWeek: r.dayOfWeek, startTime: r.startTime, timezone: r.timezone,
      meetingPoint: r.meetingPoint, mapUrl: r.mapUrl, distance: r.distance, paceGroups: r.paceGroups, notes: r.notes,
      occurrences: datesByRun[r.id].map(date => {
        const going = rsvps.filter(v => v.clubRunId === r.id && v.date === date);
        return {
          date,
          cancelled: r.cancelledDates.includes(date),
          going: going.map(v => ({ userId: v.userId, name: v.user.name || "Member", paceGroup: v.paceGroup })),
          myRsvp: going.find(v => v.userId === userId) ? { paceGroup: going.find(v => v.userId === userId).paceGroup } : null,
        };
      }),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const member = await membership(id, userId);
  if (member?.role !== "admin" && !isSuperUser(session.user.email)) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const team = await prisma.team.findUnique({ where: { id }, select: { name: true, isRunClub: true, _count: { select: { clubRuns: true } } } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!team.isRunClub) return NextResponse.json({ error: "Turn on run club mode first." }, { status: 400 });
  if (team._count.clubRuns >= 20) return NextResponse.json({ error: "A club can have up to 20 weekly runs." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const fields = parseRunFields(body);
  if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });
  const { title, dayOfWeek, meetingPoint } = fields;

  const run = await prisma.clubRun.create({
    data: { teamId: id, createdBy: userId, timezone: isValidZone(body.timezone) ? body.timezone : DEFAULT_TIMEZONE, ...fields },
  });

  after(async () => {
    const members = await prisma.teamMember.findMany({ where: { teamId: id, userId: { not: userId }, user: { pushEnabled: true } }, select: { userId: true } });
    await sendPush({
      userId: members.map(m => m.userId),
      title: `New group run in ${team.name}`,
      message: `${title} · every ${DAY_NAMES[dayOfWeek]} · ${meetingPoint}`,
      data: { type: "club_run", teamId: id },
    });
  });

  return NextResponse.json({ run }, { status: 201 });
}

// Cancel or restore one week's occurrence: { runId, date, cancelled }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const member = await membership(id, userId);
  if (member?.role !== "admin" && !isSuperUser(session.user.email)) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const { runId, date, cancelled } = await req.json().catch(() => ({}));
  const run = await prisma.clubRun.findFirst({ where: { id: runId, teamId: id }, include: { team: { select: { name: true } } } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (typeof date !== "string" || !upcomingDates(run, 10).includes(date)) return NextResponse.json({ error: "That date isn't an upcoming run." }, { status: 400 });

  const cancelledDates = cancelled
    ? Array.from(new Set([...run.cancelledDates, date]))
    : run.cancelledDates.filter(d => d !== date);
  await prisma.clubRun.update({ where: { id: run.id }, data: { cancelledDates } });

  if (cancelled && !run.cancelledDates.includes(date)) {
    after(async () => {
      const going = await prisma.clubRunRsvp.findMany({ where: { clubRunId: run.id, date, userId: { not: userId }, user: { pushEnabled: true } }, select: { userId: true } });
      const label = new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
      await sendPush({
        userId: going.map(g => g.userId),
        title: `${run.title} is cancelled`,
        message: `${run.team.name} won't be running on ${label}.`,
          data: { type: "club_run", teamId: id },
      });
    });
  }
  return NextResponse.json({ ok: true, cancelledDates });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const member = await membership(id, userId);
  if (member?.role !== "admin" && !isSuperUser(session.user.email)) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const { runId } = await req.json().catch(() => ({}));
  const { count } = await prisma.clubRun.deleteMany({ where: { id: runId, teamId: id } });
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
