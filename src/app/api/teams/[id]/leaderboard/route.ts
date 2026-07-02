// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function typeFilter(type: string): { OR: any[] } | null {
  const map: Record<string, string[]> = {
    run:       ["run", "trail", "walk", "hike"],
    bike:      ["cycl", "bike", "ride"],
    swim:      ["swim"],
    triathlon: ["run", "trail", "swim", "cycl", "bike", "ride", "walk", "hike"],
  };
  const terms = map[type];
  if (!terms) return null;
  return { OR: terms.map(t => ({ type: { contains: t, mode: "insensitive" } })) };
}

function periodGte(period: string): Date | null {
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year")  return new Date(now.getFullYear(), 0, 1);
  return null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: teamId } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id: string }).id;

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";
    const metric = searchParams.get("metric") || "distance";
    const type   = searchParams.get("type")   || "all";

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      select: { userId: true, user: { select: { id: true, name: true, email: true, bio: true } } },
    });
    const memberIds = members.map(m => m.userId);
    const userMap = Object.fromEntries(members.map(m => [m.userId, m.user]));

    // Build where clause for Activity query
    const actWhere: any = { userId: { in: memberIds } };
    const since = periodGte(period);
    if (since) actWhere.startTime = { gte: since };
    const tFilter = type !== "all" ? typeFilter(type) : null;
    if (tFilter) actWhere.OR = tFilter.OR;

    // Fetch activities and aggregate manually — avoids groupBy issues with nullable sum fields
    const activities = await prisma.activity.findMany({
      where: actWhere,
      select: { userId: true, distanceM: true, durationSec: true },
    });

    const agg: Record<string, { distanceM: number; durationSec: number; count: number }> = {};
    for (const a of activities) {
      if (!agg[a.userId]) agg[a.userId] = { distanceM: 0, durationSec: 0, count: 0 };
      agg[a.userId].distanceM  += a.distanceM  || 0;
      agg[a.userId].durationSec += a.durationSec || 0;
      agg[a.userId].count++;
    }

    const entries = memberIds.map(uid => {
      const user  = userMap[uid];
      const stats = agg[uid] || { distanceM: 0, durationSec: 0, count: 0 };
      return {
        userId:        uid,
        name:          user?.name || user?.email || "Athlete",
        bio:           user?.bio  || null,
        isMe:          uid === userId,
        distanceMi:    +((stats.distanceM / 1609.34).toFixed(1)),
        durationMin:   Math.round(stats.durationSec / 60),
        activityCount: stats.count,
      };
    });

    if (metric === "duration") entries.sort((a, b) => b.durationMin   - a.durationMin);
    else if (metric === "count") entries.sort((a, b) => b.activityCount - a.activityCount);
    else                         entries.sort((a, b) => b.distanceMi   - a.distanceMi);

    const ranked = entries.map((e, i) => ({ ...e, rank: i + 1 }));
    return NextResponse.json({ entries: ranked });
  } catch (err: any) {
    console.error("Team leaderboard error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
