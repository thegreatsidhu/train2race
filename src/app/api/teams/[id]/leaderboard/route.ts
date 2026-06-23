// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function typeOR(type: string) {
  const map: Record<string, string[]> = {
    run:      ["run", "trail"],
    bike:     ["cycl", "bike", "ride"],
    swim:     ["swim"],
    walk:     ["walk", "hike"],
    strength: ["strength", "weight", "gym"],
  };
  const terms = map[type];
  if (!terms) return null;
  return { OR: terms.map(t => ({ type: { contains: t, mode: "insensitive" } })) };
}

function periodGte(period: string): Date | null {
  const now = new Date();
  if (period === "week")  { const d = new Date(now); d.setDate(d.getDate() - 7);  return d; }
  if (period === "month") { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  if (period === "year")  { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  return null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const membership = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const metric = searchParams.get("metric") || "distance";
  const type   = searchParams.get("type")   || "all";

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true, user: { select: { id: true, name: true } } },
  });
  const memberIds = members.map(m => m.userId);
  const userMap = Object.fromEntries(members.map(m => [m.userId, m.user]));

  const actWhere: any = { userId: { in: memberIds } };
  const since = periodGte(period);
  if (since) actWhere.startTime = { gte: since };
  const tOr = type !== "all" ? typeOR(type) : null;
  if (tOr) Object.assign(actWhere, tOr);

  const orderField = metric === "duration" ? "durationSec" : metric === "count" ? undefined : "distanceM";
  const grouped = await prisma.activity.groupBy({
    by: ["userId"],
    where: actWhere,
    _sum:   { distanceM: true, durationSec: true },
    _count: { id: true },
    orderBy: orderField
      ? { _sum: { [orderField]: "desc" } }
      : { _count: { id: "desc" } },
  });

  // Include members with 0 activity
  const activeIds = new Set(grouped.map(g => g.userId));
  const inactive = memberIds.filter(id => !activeIds.has(id)).map(id => ({
    userId: id, _sum: { distanceM: 0, durationSec: 0 }, _count: { id: 0 },
  }));

  const all = [...grouped, ...inactive];
  if (metric === "duration") all.sort((a, b) => (b._sum.durationSec || 0) - (a._sum.durationSec || 0));
  else if (metric === "count") all.sort((a, b) => (b._count.id || 0) - (a._count.id || 0));
  else all.sort((a, b) => (b._sum.distanceM || 0) - (a._sum.distanceM || 0));

  const entries = all.map((g, i) => ({
    rank:          i + 1,
    userId:        g.userId,
    name:          userMap[g.userId]?.name || "Athlete",
    isMe:          g.userId === userId,
    distanceMi:    g._sum.distanceM ? +(g._sum.distanceM / 1609.34).toFixed(1) : 0,
    durationMin:   g._sum.durationSec ? Math.round(g._sum.durationSec / 60) : 0,
    activityCount: g._count.id || 0,
  }));

  return NextResponse.json({ entries });
}
