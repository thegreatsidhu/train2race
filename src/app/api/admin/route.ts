// @ts-nocheck
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { password, action } = body;

  if (password !== "train2race2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (action === "getData") {
    const [users, inviteCodes, activityCount, raceCount, pendingRaces, recentMessages] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, createdAt: true, deviceConnections: { select: { source: true } }, raceTargets: { select: { id: true } } } }),
      prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, code: true, createdAt: true, usedBy: true } }),
      prisma.activity.count(),
      prisma.raceTarget.count(),
      prisma.majorRace.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" } }),
      Promise.resolve([]),
    ]);
    return NextResponse.json({ users, inviteCodes, activityCount, raceCount, pendingRaces, recentMessages });
  }

  if (action === "createInviteCode") {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const invite = await prisma.inviteCode.create({ data: { code } });
    return NextResponse.json({ invite });
  }

  if (action === "deleteInviteCode") {
    await prisma.inviteCode.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (action === "approveRace") {
    await prisma.majorRace.update({ where: { id: body.raceId }, data: { status: "active" } });
    return NextResponse.json({ ok: true });
  }

  if (action === "rejectRace") {
    await prisma.majorRace.delete({ where: { id: body.raceId } });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteMessage") {
    await prisma.eventMessage.update({ where: { id: body.messageId }, data: { isDeleted: true, deletedBy: "admin" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}