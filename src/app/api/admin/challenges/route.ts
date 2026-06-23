// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function verifyAdmin(password: string): Promise<boolean> {
  const setting = await prisma.setting.findUnique({ where: { key: "adminPasswordHash" } });
  if (setting) return bcrypt.compare(password, setting.value);
  return password === "train2race2024";
}

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password") || "";
  if (!(await verifyAdmin(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenges = await prisma.teamChallenge.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: {
      team: { select: { id: true, name: true } },
      entries: { select: { id: true } },
    },
  });

  const creatorIds = [...new Set(challenges.map((c) => c.createdBy))];
  const creators = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true, email: true },
  });
  const creatorMap = Object.fromEntries(creators.map((u) => [u.id, u]));

  const result = challenges.map((c) => ({
    id: c.id,
    title: c.title,
    type: c.type,
    metric: c.metric,
    unit: c.unit,
    goal: c.goal,
    startDate: c.startDate,
    endDate: c.endDate,
    description: c.description,
    isPublic: c.isPublic,
    status: c.status,
    createdAt: c.createdAt,
    teamId: c.team.id,
    teamName: c.team.name,
    creator: creatorMap[c.createdBy] || null,
  }));

  return NextResponse.json({ challenges: result });
}

export async function PATCH(req: NextRequest) {
  const { password, challengeId, status } = await req.json();
  if (!(await verifyAdmin(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["approved", "rejected"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updated = await prisma.teamChallenge.update({ where: { id: challengeId }, data: { status } });
  return NextResponse.json({ challenge: updated });
}
