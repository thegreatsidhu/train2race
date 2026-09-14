// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminAuthorized } from "@/lib/adminAuth";

async function resolveAdminEditor(): Promise<{ userId: string; name: string }> {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      return { userId, name: user?.name || "Admin" };
    }
  } catch {}
  return { userId: "admin", name: "Admin" };
}

async function rateLimited(req: NextRequest): Promise<boolean> {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  return !(await checkRateLimit(`admin:${ip}`, 10, 15 * 60 * 1000));
}

export async function GET(req: NextRequest) {
  if (await rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
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
      requirePhotoVerification: c.requirePhotoVerification,
      entries: c.requirePhotoVerification ? c.entries
        .map((e) => ({ id: e.id, userId: e.userId, userName: e.user?.name || "?", value: e.value, date: e.date, photoUrl: e.photoUrl, verified: e.verified, flagged: e.flagged, flagReason: e.flagReason }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) : undefined,
    };
  });

  return NextResponse.json({ challenges: result });
}

export async function PATCH(req: NextRequest) {
  if (await rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await req.json();
  const { password, challengeId } = body;
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!challengeId) return NextResponse.json({ error: "challengeId required" }, { status: 400 });

  const challenge = await prisma.teamChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Status-only update (approve/reject) — existing simple flow, no audit log needed for this.
  const otherKeys = Object.keys(body).filter(k => !["password", "challengeId", "status"].includes(k));
  if (body.status !== undefined && otherKeys.length === 0) {
    if (!["approved", "rejected"].includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const updated = await prisma.teamChallenge.update({ where: { id: challengeId }, data: { status: body.status } });
    return NextResponse.json({ challenge: updated });
  }

  // Full field edit
  const { title, goal, goalPerDay, lockEnrollmentAtStart, startDate, endDate, description, force } = body;
  const now = new Date();
  const hasStarted = challenge.startDate <= now;
  const isActive = challenge.status === "approved" && hasStarted && challenge.endDate > now;

  if (startDate !== undefined && hasStarted) {
    const newStart = new Date(startDate);
    if (newStart.getTime() !== challenge.startDate.getTime()) {
      return NextResponse.json({ error: "Cannot change start date — challenge has already started." }, { status: 422 });
    }
  }
  if (endDate !== undefined && isActive) {
    const newEnd = new Date(endDate);
    if (newEnd < challenge.endDate && !force) {
      return NextResponse.json({ error: "Shortening an active challenge will affect participant progress.", requiresForce: true }, { status: 409 });
    }
  }

  const changes: { field: string; from: any; to: any }[] = [];
  const data: any = {};

  if (title !== undefined && title !== challenge.title) {
    changes.push({ field: "title", from: challenge.title, to: title });
    data.title = title;
  }
  if (description !== undefined && (description || null) !== challenge.description) {
    changes.push({ field: "description", from: challenge.description ?? "", to: description ?? "" });
    data.description = description || null;
  }
  if (goal !== undefined) {
    const newGoal = goal != null && goal !== "" ? parseFloat(goal) : null;
    if (newGoal !== challenge.goal) {
      changes.push({ field: "goal", from: challenge.goal, to: newGoal });
      data.goal = newGoal;
    }
  }
  if (goalPerDay !== undefined && goalPerDay !== challenge.goalPerDay) {
    changes.push({ field: "goalPerDay", from: challenge.goalPerDay, to: goalPerDay === true });
    data.goalPerDay = goalPerDay === true;
  }
  if (lockEnrollmentAtStart !== undefined && lockEnrollmentAtStart !== challenge.lockEnrollmentAtStart) {
    changes.push({ field: "lockEnrollmentAtStart", from: challenge.lockEnrollmentAtStart, to: lockEnrollmentAtStart !== false });
    data.lockEnrollmentAtStart = lockEnrollmentAtStart !== false;
  }
  if (startDate !== undefined && !hasStarted) {
    const newStart = new Date(startDate);
    if (newStart.getTime() !== challenge.startDate.getTime()) {
      changes.push({ field: "startDate", from: challenge.startDate.toISOString(), to: newStart.toISOString() });
      data.startDate = newStart;
    }
  }
  if (endDate !== undefined) {
    const newEnd = new Date(endDate);
    if (newEnd.getTime() !== challenge.endDate.getTime()) {
      changes.push({ field: "endDate", from: challenge.endDate.toISOString(), to: newEnd.toISOString() });
      data.endDate = newEnd;
    }
  }

  if (changes.length === 0) return NextResponse.json({ challenge, noChanges: true });

  const updated = await prisma.teamChallenge.update({ where: { id: challengeId }, data });

  const { userId: editorId, name: editorName } = await resolveAdminEditor();
  await (prisma as any).challengeEditLog.create({
    data: {
      challengeType: "team",
      challengeId,
      challengeTitle: updated.title,
      editedBy: editorId,
      editedByName: editorName,
      changes,
      notified: false,
    },
  });

  return NextResponse.json({ challenge: updated, changes });
}

export async function DELETE(req: NextRequest) {
  if (await rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const { password, challengeId } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!challengeId) return NextResponse.json({ error: "challengeId required" }, { status: 400 });
  await prisma.teamChallengeEntry.deleteMany({ where: { challengeId } });
  await prisma.teamChallenge.delete({ where: { id: challengeId } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (await rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await req.json();
  const { password, action, challengeId, userId } = body;
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action === "removeParticipant") {
    if (!challengeId || !userId) return NextResponse.json({ error: "challengeId and userId required" }, { status: 400 });
    await prisma.teamChallengeEntry.deleteMany({ where: { challengeId, userId } });
    return NextResponse.json({ ok: true });
  }

  if (action === "reviewEntry") {
    const { entryId, entryAction, flagReason } = body;
    if (!entryId || !entryAction) return NextResponse.json({ error: "entryId and entryAction required" }, { status: 400 });
    if (entryAction === "remove") {
      await prisma.teamChallengeEntry.delete({ where: { id: entryId } });
      return NextResponse.json({ ok: true });
    }
    if (entryAction === "verify") {
      await prisma.teamChallengeEntry.update({ where: { id: entryId }, data: { verified: true, flagged: false, flagReason: null } });
      return NextResponse.json({ ok: true });
    }
    if (entryAction === "flag") {
      await prisma.teamChallengeEntry.update({ where: { id: entryId }, data: { flagged: true, verified: false, flagReason: flagReason || "Flagged as suspicious" } });
      return NextResponse.json({ ok: true });
    }
    if (entryAction === "unflag") {
      await prisma.teamChallengeEntry.update({ where: { id: entryId }, data: { flagged: false, flagReason: null } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown entryAction" }, { status: 400 });
  }

  if (action === "createChallenge") {
    const { teamId, title, type, metric, unit, goal, goalPerDay, startDate, endDate, description } = body;
    if (!teamId || !title?.trim() || !type || !metric || !unit || !startDate || !endDate) {
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
          goal: goal != null && goal !== "" ? Number(goal) : null,
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
