// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const FALLBACK_PASSWORD = "train2race2024";

async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "adminPasswordHash" } });
    if (setting?.value) return bcrypt.compare(password, setting.value);
  } catch {}
  return password === FALLBACK_PASSWORD;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  const valid = await verifyAdminPassword(password);
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, isBanned: true } },
        },
        orderBy: { role: "asc" },
      },
    },
  });

  const result = teams.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    isPrivate: t.isPrivate,
    createdAt: t.createdAt,
    members: t.members.map(m => ({
      userId: m.userId,
      name: m.user.name || "No name",
      email: m.user.email,
      role: m.role,
      isBanned: m.user.isBanned,
      joinedAt: m.joinedAt,
    })),
  }));

  return NextResponse.json({ teams: result });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, action, teamId, userId, role } = body;
  const valid = await verifyAdminPassword(password);
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action === "removeMember") {
    await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
    return NextResponse.json({ ok: true });
  }
  if (action === "setRole") {
    await prisma.teamMember.update({ where: { teamId_userId: { teamId, userId } }, data: { role } });
    return NextResponse.json({ ok: true });
  }
  if (action === "banUser") {
    await prisma.user.update({ where: { id: userId }, data: { isBanned: true } });
    return NextResponse.json({ ok: true });
  }
  if (action === "unbanUser") {
    await prisma.user.update({ where: { id: userId }, data: { isBanned: false } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
