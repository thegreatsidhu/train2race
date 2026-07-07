// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: set or remove an alert preference
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { challengeType, remove } = await req.json();
  const type = challengeType || "all";

  if (remove) {
    await (prisma as any).challengeAlert.deleteMany({ where: { userId, challengeType: type } });
    return NextResponse.json({ ok: true, removed: true });
  }

  await (prisma as any).challengeAlert.upsert({
    where: { userId_challengeType: { userId, challengeType: type } },
    create: { userId, challengeType: type },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

// GET: return current alert preferences for user
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ alerts: [] });
  const userId = (session.user as { id: string }).id;

  const alerts = await (prisma as any).challengeAlert.findMany({
    where: { userId },
    select: { challengeType: true, createdAt: true },
  });

  return NextResponse.json({ alerts });
}
