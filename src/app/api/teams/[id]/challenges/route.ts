// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, groupEmailHtml } from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const challenges = await prisma.teamChallenge.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    include: {
      entries: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  // For steps challenges, aggregate raw.steps from Activity records per participant
  const today = new Date().toISOString().split("T")[0];
  const enriched = await Promise.all(challenges.map(async (c) => {
    if (c.unit !== "steps" || c.metric !== "count") return c;
    const participantIds = [...new Set(c.entries.map((e: any) => e.userId))];
    if (participantIds.length === 0) return { ...c, stepsByUser: {} };
    const endBound = new Date(c.endDate.getTime() + 86400000);
    const activities = await prisma.activity.findMany({
      where: { userId: { in: participantIds }, createdAt: { gte: c.startDate, lte: endBound } },
      select: { userId: true, raw: true, createdAt: true },
    });
    const stepsByUser: Record<string, { total: number; todayTotal: number }> = {};
    for (const act of activities) {
      const steps = Number((act.raw as any)?.steps ?? 0);
      if (steps <= 0) continue;
      if (!stepsByUser[act.userId]) stepsByUser[act.userId] = { total: 0, todayTotal: 0 };
      stepsByUser[act.userId].total += steps;
      const actDay = act.createdAt.toISOString().split("T")[0];
      if (actDay === today) stepsByUser[act.userId].todayTotal += steps;
    }
    return { ...c, stepsByUser };
  }));

  return NextResponse.json({ challenges: enriched });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const existingActive = await prisma.teamChallenge.findFirst({
    where: { teamId, endDate: { gte: new Date() } },
    select: { id: true, title: true },
  });
  if (existingActive) {
    return NextResponse.json({ error: `This team already has an active challenge ("${existingActive.title}"). It must end before a new one can be created.` }, { status: 409 });
  }

  const { title, type, metric, unit, goal, goalPerDay, startDate, endDate, description, isPublic } = await req.json();
  if (!title?.trim() || !type || !metric || !unit || !startDate || !endDate || !goal) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const challenge = await prisma.teamChallenge.create({
    data: {
      teamId,
      createdBy: userId,
      title: title.trim(),
      type,
      metric,
      unit,
      goal: Number(goal),
      goalPerDay: goalPerDay === true,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description?.trim() || null,
      isPublic: isPublic === true,
      status: member.role === "admin" ? "approved" : "pending",
    },
  });
  // Email team members when challenge is approved (captain-created)
  if (challenge.status === "approved") {
    prisma.teamMember.findMany({
      where: { teamId, userId: { not: userId } },
      include: { user: { select: { name: true, email: true } }, team: { select: { name: true } } },
    }).then(async members => {
      if (!members.length) return;
      const teamName = members[0].team.name;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://train2race.com";
      const ends = new Date(endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      await Promise.all(members.filter(m => m.user.email).map(m =>
        sendEmail({
          to: m.user.email,
          subject: `New challenge in ${teamName}: ${title.trim()}`,
          html: groupEmailHtml({
            preheader: `Join the challenge — ends ${ends}`,
            heading: `New challenge: ${title.trim()}`,
            body: `<strong>${teamName}</strong> has a new group challenge!${description ? `<br/><br/>${description}` : ""}<br/><br/>Goal: <strong>${goal} ${unit}</strong>${goalPerDay ? " per day" : ""} · Ends ${ends}`,
            cta: "View challenge",
            ctaUrl: `${baseUrl}/dashboard/teams/${teamId}?tab=challenges`,
          }),
        })
      ));
    }).catch(() => {});
  }

  return NextResponse.json({ challenge }, { status: 201 });
}
