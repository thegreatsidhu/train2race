// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const now = new Date();
  const weekAgo = new Date(Date.now()-7*24*60*60*1000);
  // Fetch team + members
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      majorRace: { select: { id: true, name: true, raceDate: true, distanceM: true, isTriathlon: true } },
      members: {
        include: {
          user: {
            select: {
              id: true, name: true, bio: true, email: true,
              trainingPlans: {
                take: 1,
                orderBy: { createdAt: "desc" },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isMember = team.members.some(m => m.userId === userId);
  if (!isMember) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const activeInviteCode = await prisma.inviteCode.findFirst({
    where: { teamId: id, reusable: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });

  const planIds = team.members.flatMap(m => m.user.trainingPlans.map(p => p.id));
  const [dueCounts, doneCounts, weeklyData] = planIds.length > 0
    ? await Promise.all([
        // Workouts scheduled up to today (denominator)
        prisma.trainingWorkout.groupBy({ by: ["planId"], where: { planId: { in: planIds }, date: { lte: now } }, _count: { planId: true } }),
        // Completed workouts scheduled up to today (numerator)
        prisma.trainingWorkout.groupBy({ by: ["planId"], where: { planId: { in: planIds }, date: { lte: now }, completed: true }, _count: { planId: true } }),
        // Weekly miles from completed workouts in last 7 days
        prisma.trainingWorkout.findMany({ where: { planId: { in: planIds }, completed: true, date: { gte: weekAgo, lte: now } }, select: { planId: true, distanceKm: true } }),
      ])
    : [[], [], []];

  const dueMap  = Object.fromEntries(dueCounts.map(r => [r.planId, r._count.planId]));
  const doneMap = Object.fromEntries(doneCounts.map(r => [r.planId, r._count.planId]));
  const weeklyMap: Record<string, number> = {};
  for (const w of weeklyData) { weeklyMap[w.planId] = (weeklyMap[w.planId] || 0) + (w.distanceKm || 0); }

  const membersWithStats = team.members.map(m => {
    const plan = m.user.trainingPlans[0];
    const total = plan ? (dueMap[plan.id] ?? 0) : 0;
    const done  = plan ? (doneMap[plan.id] ?? 0) : 0;
    const weeklyMiles = plan ? Math.round((weeklyMap[plan.id] || 0) / 1.60934 * 10) / 10 : 0;
    return { userId: m.user.id, name: m.user.name||m.user.email||"", bio: m.user.bio||null, role: m.role, isMe: m.userId===userId, joinedAt: m.joinedAt, totalWorkouts: total, doneWorkouts: done, pct: total>0?Math.round((done/total)*100):0, weeklyMiles };
  }).sort((a,b)=>b.pct-a.pct);
  return NextResponse.json({ team: { ...team, members: membersWithStats, isAdmin: team.members.find(m=>m.userId===userId)?.role==="admin", activeSignupCode: activeInviteCode?.code || null } });
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } } });
  if (!member || member.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const updateData: any = {};
  if ("isPrivate" in body) updateData.isPrivate = body.isPrivate;
  if ("majorRaceId" in body) updateData.majorRaceId = body.majorRaceId ?? null;
  const team = await prisma.team.update({ where: { id }, data: updateData });
  return NextResponse.json({ team });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const team = await prisma.team.findUnique({ where: { id }, select: { createdBy: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (team.createdBy !== userId) return NextResponse.json({ error: "Only creator can delete" }, { status: 403 });
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
