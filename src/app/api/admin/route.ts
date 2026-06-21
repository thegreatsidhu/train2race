// @ts-nocheck
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "train2race2024";
export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== ADMIN_PASSWORD) return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password");
  if (password !== ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [users, inviteCodes, activityCount, raceCount, pendingRaces] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, createdAt: true, connections: { select: { source: true, status: true } }, _count: { select: { activities: true, raceTargets: true } } } }),
    prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.activity.count(),
    prisma.raceTarget.count(),
    prisma.majorRace.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ users, inviteCodes, activityCount, raceCount, pendingRaces });
}
