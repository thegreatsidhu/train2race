// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const team = await prisma.team.findUnique({ where: { id }, include: { majorRace: { select: { id: true, name: true, raceDate: true, distanceM: true } }, members: { include: { user: { select: { id: true, name: true, trainingPlans: { take: 1, orderBy: { createdAt: "desc" }, select: { _count: { select: { workouts: true } }, workouts: { where: { completed: true }, select: { completed: true, distanceKm: true, date: true } } } } } } }, orderBy: { joinedAt: "asc" } } } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isMember = team.members.some(m => m.userId === userId);
  if (!isMember) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  const weekAgo = new Date(Date.now()-7*24*60*60*1000);
  const membersWithStats = team.members.map(m => {
    const plan = m.user.trainingPlans[0];
    const workouts = plan?.workouts??[];
    const total = plan?._count?.workouts??0;
    const done = workouts.filter(w=>w.completed).length;
    const weeklyMiles = workouts.filter(w=>w.completed&&w.distanceKm&&new Date(w.date)>=weekAgo).reduce((s,w)=>s+(w.distanceKm||0)/1.60934,0);
    return { userId: m.user.id, name: m.user.name||"Anonymous", role: m.role, isMe: m.userId===userId, joinedAt: m.joinedAt, totalWorkouts: total, doneWorkouts: done, pct: total>0?Math.round((done/total)*100):0, weeklyMiles: Math.round(weeklyMiles*10)/10 };
  }).sort((a,b)=>b.pct-a.pct);
  return NextResponse.json({ team: { ...team, members: membersWithStats, isAdmin: team.members.find(m=>m.userId===userId)?.role==="admin" } });
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
