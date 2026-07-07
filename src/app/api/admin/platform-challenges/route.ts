// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

const FALLBACK_PASSWORD = "train2race2024";

async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: "adminPasswordHash" } });
    if (setting?.value) return bcrypt.compare(password, setting.value);
  } catch {}
  return password === FALLBACK_PASSWORD;
}

async function isSuperAdmin(): Promise<boolean> {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return false;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role === "superadmin" || user?.role === "admin";
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password") ?? "";

  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`admin-pch:${ip}`, 10, 15 * 60 * 1000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const valid = await verifyAdminPassword(password);
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const challenges = await (prisma as any).platformChallenge.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: { where: { optedOut: false } } } },
    },
  });

  return NextResponse.json({
    challenges: challenges.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.type,
      activityFilter: c.activityFilter,
      badgeName: c.badgeName,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      participantCount: c._count.participants,
      dailyAwards: c.dailyAwards ?? null,
      dailyAwardsDate: c.dailyAwardsDate ?? null,
      finalAnnouncement: c.finalAnnouncement ?? null,
      finalAnnouncedAt: c.finalAnnouncedAt ?? null,
      createdAt: c.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password } = body;

  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`admin-pch:${ip}`, 10, 15 * 60 * 1000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const valid = await verifyAdminPassword(password);
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, type, activityFilter, badgeName, startDate, endDate } = body;
  if (!title?.trim() || !type || !startDate || !endDate) {
    return NextResponse.json({ error: "title, type, startDate, endDate required" }, { status: 400 });
  }

  const session = await auth();
  const createdBy = (session?.user as any)?.id ?? "admin";

  const challenge = await (prisma as any).platformChallenge.create({
    data: {
      createdBy,
      title: title.trim(),
      description: description?.trim() || null,
      type,
      activityFilter: activityFilter || null,
      badgeName: badgeName?.trim() || null,
      startDate: new Date(startDate + "T12:00:00"),
      endDate: new Date(endDate + "T23:59:59"),
      status: "active",
    },
  });

  return NextResponse.json({ challenge });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { password, challengeId } = body;

  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    const valid = await verifyAdminPassword(password);
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!challengeId) return NextResponse.json({ error: "challengeId required" }, { status: 400 });
  await (prisma as any).platformChallenge.delete({ where: { id: challengeId } });
  return NextResponse.json({ ok: true });
}
