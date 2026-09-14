import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Most recent synced body weight from any connected source (in practice, the Apple Health /
// Google Health Connect bridge — Garmin doesn't sync body weight), for auto-pull in the
// weight-loss gate and weekly check-in form.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const latest = await prisma.dailyMetrics.findFirst({
    where: { userId, bodyWeightKg: { not: null } },
    orderBy: { date: "desc" },
    select: { bodyWeightKg: true, date: true, source: true },
  });

  if (!latest) return NextResponse.json({ weightKg: null });

  return NextResponse.json({ weightKg: latest.bodyWeightKg, date: latest.date, source: latest.source });
}
