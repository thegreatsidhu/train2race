// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const record = await prisma.dailyMetrics.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow }, steps: { not: null } },
    orderBy: { steps: "desc" },
    select: { steps: true },
  });

  return NextResponse.json({ steps: record?.steps ?? null });
}
