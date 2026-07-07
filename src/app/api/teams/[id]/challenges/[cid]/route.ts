// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function resolveEditor(userId: string, teamId: string) {
  const [member, team, user] = await Promise.all([
    prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } }),
    prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } }),
  ]);
  const isCaptain = team?.createdBy === userId;
  const isTeamAdmin = member?.role === "admin";
  const isSiteAdmin = user?.role === "admin" || user?.role === "superadmin";
  const canEdit = isCaptain || isTeamAdmin || isSiteAdmin;
  return { canEdit, isCaptain, isTeamAdmin, isSiteAdmin, editorName: user?.name || "Admin" };
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { canEdit } = await resolveEditor(userId, teamId);
  if (!canEdit) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const challenge = await prisma.teamChallenge.findUnique({ where: { id: cid } });
  if (!challenge || challenge.teamId !== teamId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.teamChallengeEntry.deleteMany({ where: { challengeId: cid } });
  await prisma.teamChallenge.delete({ where: { id: cid } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { canEdit, editorName } = await resolveEditor(userId, teamId);
  if (!canEdit) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const challenge = await prisma.teamChallenge.findUnique({ where: { id: cid } });
  if (!challenge || challenge.teamId !== teamId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Status-only update (approve/reject)
  if (body.status !== undefined && Object.keys(body).filter(k => k !== "status").length === 0) {
    if (!["approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const updated = await prisma.teamChallenge.update({ where: { id: cid }, data: { status: body.status } });
    return NextResponse.json({ challenge: updated });
  }

  const { title, goal, goalPerDay, lockEnrollmentAtStart, startDate, endDate, description, force } = body;

  const now = new Date();
  const hasStarted = challenge.startDate <= now;
  const isActive = challenge.status === "approved" && hasStarted && challenge.endDate > now;

  // Validate: cannot change startDate once started
  if (startDate !== undefined && hasStarted) {
    const newStart = new Date(startDate);
    if (newStart.toDateString() !== challenge.startDate.toDateString()) {
      return NextResponse.json({ error: "Cannot change start date — challenge has already started." }, { status: 422 });
    }
  }

  // Validate: cannot shorten endDate if active unless forced
  if (endDate !== undefined && isActive) {
    const newEnd = new Date(endDate + "T23:59:59");
    if (newEnd < challenge.endDate) {
      if (!force) {
        return NextResponse.json({
          error: "Shortening an active challenge will affect participant progress.",
          requiresForce: true,
        }, { status: 409 });
      }
    }
  }

  // Build diff for audit log
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
    const newGoal = goal != null ? parseFloat(goal) : null;
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
    if (newStart.toDateString() !== challenge.startDate.toDateString()) {
      changes.push({ field: "startDate", from: challenge.startDate.toISOString().split("T")[0], to: startDate });
      data.startDate = newStart;
    }
  }
  if (endDate !== undefined) {
    const newEnd = new Date(endDate + "T23:59:59");
    if (newEnd.toDateString() !== challenge.endDate.toDateString()) {
      changes.push({ field: "endDate", from: challenge.endDate.toISOString().split("T")[0], to: endDate });
      data.endDate = newEnd;
    }
  }

  if (changes.length === 0) return NextResponse.json({ challenge, noChanges: true });

  const updated = await prisma.teamChallenge.update({ where: { id: cid }, data });

  // Store audit log
  await (prisma as any).challengeEditLog.create({
    data: {
      challengeType: "team",
      challengeId: cid,
      challengeTitle: updated.title,
      editedBy: userId,
      editedByName: editorName,
      changes,
      notified: false,
    },
  });

  return NextResponse.json({ challenge: updated, changes });
}
