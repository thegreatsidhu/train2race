// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const FALLBACK_PASSWORD = "train2race2024";

async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: "adminPasswordHash" } });
    if (setting?.value) return bcrypt.compare(password, setting.value);
  } catch {}
  return password === FALLBACK_PASSWORD;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { password, action } = body;
  const valid = await verifyAdminPassword(password);
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (action === "getData") {
    try {
      const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, createdAt: true, connections: { select: { source: true } }, raceTargets: { select: { id: true } } } });
      const inviteCodes = await prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, code: true, createdAt: true, usedBy: true, usedAt: true } });
      const usedByIds = inviteCodes.map((c) => c.usedBy).filter(Boolean) as string[];
      const inviteUsers = usedByIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: usedByIds } }, select: { id: true, name: true, email: true } }) : [];
      const inviteUserMap = Object.fromEntries(inviteUsers.map((u) => [u.id, u]));
      const inviteCodesWithUser = inviteCodes.map((c) => ({ ...c, usedByUser: c.usedBy ? inviteUserMap[c.usedBy] ?? null : null }));
      const activityCount = await prisma.activity.count();
      const raceCount = await prisma.raceTarget.count();
      const pendingRaces = await prisma.majorRace.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" } });
      const recentMessages = await prisma.eventMessage.findMany({ where: { isDeleted: false }, orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } }, majorRace: { select: { name: true } } } });
      return NextResponse.json({ users, inviteCodes: inviteCodesWithUser, activityCount, raceCount, pendingRaces, recentMessages });
    } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }
  if (action === "createInviteCode") { const code = Math.random().toString(36).substring(2,10).toUpperCase(); const invite = await prisma.inviteCode.create({ data: { code } }); return NextResponse.json({ invite }); }
  if (action === "deleteInviteCode") { await prisma.inviteCode.delete({ where: { id: body.id } }); return NextResponse.json({ ok: true }); }
  if (action === "approveRace") { await prisma.majorRace.update({ where: { id: body.raceId }, data: { status: "active" } }); return NextResponse.json({ ok: true }); }
  if (action === "rejectRace") { await prisma.majorRace.delete({ where: { id: body.raceId } }); return NextResponse.json({ ok: true }); }
  if (action === "deleteMessage") { await prisma.eventMessage.update({ where: { id: body.messageId }, data: { isDeleted: true, deletedBy: "admin" } }); return NextResponse.json({ ok: true }); }
  return NextResponse.json({ ok: true });
}