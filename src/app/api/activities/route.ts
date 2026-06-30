// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const activities = await prisma.activity.findMany({
    where: { userId, distanceM: { not: null, gt: 0 }, durationSec: { gt: 0 } },
    orderBy: { startTime: "desc" },
    take: 20,
    select: { id: true, title: true, type: true, startTime: true, distanceM: true, durationSec: true },
  });
  return NextResponse.json({ activities });
}
