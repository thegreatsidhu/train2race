// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { upcomingDates } from "@/lib/clubRuns";

// RSVP to one week's group run: POST { date, paceGroup } to say "I'm in" (or switch pace group),
// DELETE { date } to drop out.

async function load(teamId: string, runId: string, userId: string) {
  const [member, run] = await Promise.all([
    prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } }, select: { id: true } }),
    prisma.clubRun.findFirst({ where: { id: runId, teamId } }),
  ]);
  return { member, run };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { member, run } = await load(id, runId, userId);
  if (!member) return NextResponse.json({ error: "Join the club to RSVP." }, { status: 403 });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { date, paceGroup } = await req.json().catch(() => ({}));
  if (typeof date !== "string" || !upcomingDates(run, 10).includes(date)) return NextResponse.json({ error: "That run has already happened." }, { status: 400 });
  if (run.cancelledDates.includes(date)) return NextResponse.json({ error: "This run is cancelled." }, { status: 400 });
  const group = run.paceGroups.length ? (run.paceGroups.includes(paceGroup) ? paceGroup : null) : null;
  if (run.paceGroups.length && !group) return NextResponse.json({ error: "Pick a pace group." }, { status: 400 });

  const rsvp = await prisma.clubRunRsvp.upsert({
    where: { clubRunId_userId_date: { clubRunId: run.id, userId, date } },
    create: { clubRunId: run.id, userId, date, paceGroup: group },
    update: { paceGroup: group },
  });
  return NextResponse.json({ rsvp });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { member, run } = await load(id, runId, userId);
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { date } = await req.json().catch(() => ({}));
  await prisma.clubRunRsvp.deleteMany({ where: { clubRunId: run.id, userId, date } });
  return NextResponse.json({ ok: true });
}
