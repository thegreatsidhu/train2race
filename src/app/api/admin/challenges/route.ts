// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminAuthorized } from "@/lib/adminAuth";

function rateLimited(req: NextRequest): boolean {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  return !checkRateLimit(`admin:${ip}`, 10, 15 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const password = req.nextUrl.searchParams.get("password") || "";
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenges = await prisma.teamChallenge.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      team: { select: { id: true, name: true } },
      entries: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  const creatorIds = [...new Set(challenges.map((c) => c.createdBy).filter(Boolean))];
  const creators = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true, email: true },
  });
  const creatorMap = Object.fromEntries(creators.map((u) => [u.id, u]));

  const result = challenges.map((c) => {
    const participantMap: Record<string, { id: string; name: string; email: string; total: number; entryCount: number }> = {};
    c.entries.forEach((e) => {
      if (!participantMap[e.userId]) {
        participantMap[e.userId] = { id: e.userId, name: e.user?.name || "?", email: e.user?.email || "", total: 0, entryCount: 0 };
      }
      participantMap[e.userId].total += e.value;
      participantMap[e.userId].entryCount += 1;
    });
    return {
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
      participants: Object.values(participantMap).sort((a, b) => b.total - a.total),
    };
  });

  return NextResponse.json({ challenges: result });
}

export async function PATCH(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const { password, challengeId, status } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["approved", "rejected"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const updated = await prisma.teamChallenge.update({ where: { id: challengeId }, data: { status } });
  return NextResponse.json({ challenge: updated });
}

export async function DELETE(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const { password, challengeId } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!challengeId) return NextResponse.json({ error: "challengeId required" }, { status: 400 });
  await prisma.teamChallengeEntry.deleteMany({ where: { challengeId } });
  await prisma.teamChallenge.delete({ where: { id: challengeId } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await req.json();
  const { password, action, challengeId, userId } = body;
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action === "removeParticipant") {
    if (!challengeId || !userId) return NextResponse.json({ error: "challengeId and userId required" }, { status: 400 });
    await prisma.teamChallengeEntry.deleteMany({ where: { challengeId, userId } });
    return NextResponse.json({ ok: true });
  }

  if (action === "createChallenge") {
    const { teamId, title, type, metric, unit, goal, goalPerDay, startDate, endDate, description } = body;
    if (!teamId || !title?.trim() || !type || !metric || !unit || !startDate || !endDate || !goal) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const [challenge, team] = await Promise.all([
      prisma.teamChallenge.create({
        data: {
          teamId,
          createdBy: "admin",
          title: title.trim(),
          type,
          metric,
          unit,
          goal: Number(goal),
          goalPerDay: goalPerDay === true,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          description: description?.trim() || null,
          isPublic: true,
          status: "approved",
        },
      }),
      prisma.team.findUnique({ where: { id: teamId }, select: { name: true } }),
    ]);
    return NextResponse.json({ challenge: { ...challenge, teamName: team?.name || "", participants: [], creator: { name: "Admin" } } }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
