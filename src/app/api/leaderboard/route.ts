// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function ageRange(group: string): { gte: Date; lte: Date } | null {
  const now = new Date();
  const ranges: Record<string, [number, number]> = {
    "18-29": [18, 29], "30-39": [30, 39], "40-49": [40, 49],
    "50-59": [50, 59], "60+": [60, 120],
  };
  const r = ranges[group];
  if (!r) return null;
  const lte = new Date(now.getFullYear() - r[0], now.getMonth(), now.getDate());
  const gte = new Date(now.getFullYear() - r[1] - 1, now.getMonth(), now.getDate());
  return { gte, lte };
}

function typeOR(type: string) {
  const map: Record<string, string[]> = {
    run:      ["run", "trail"],
    bike:     ["cycl", "bike", "ride"],
    swim:     ["swim"],
    walk:     ["walk", "hike"],
    strength: ["strength", "weight", "gym"],
  };
  const terms = map[type];
  if (!terms) return undefined;
  return { OR: terms.map(t => ({ type: { contains: t, mode: "insensitive" } })) };
}

function periodGte(period: string): Date | null {
  const now = new Date();
  if (period === "week")  { const d = new Date(now); d.setDate(d.getDate() - 7);  return d; }
  if (period === "month") { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  if (period === "year")  { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  return null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period   = searchParams.get("period")   || "month";
  const metric   = searchParams.get("metric")   || "distance";
  const type     = searchParams.get("type")     || "all";
  const sex      = searchParams.get("sex")      || "all";
  const ageGroup = searchParams.get("ageGroup") || "all";
  const city     = searchParams.get("city")     || "";
  const teamId   = searchParams.get("teamId")   || "";

  // 1. Resolve eligible userIds from profile filters
  const userWhere: any = {};
  if (sex !== "all") userWhere.sex = sex;
  if (ageGroup !== "all") {
    const r = ageRange(ageGroup);
    if (r) userWhere.dateOfBirth = r;
  }
  if (city) userWhere.city = { contains: city, mode: "insensitive" };

  let eligibleIds: string[] | null = null;

  if (teamId) {
    const members = await prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } });
    const teamUserIds = members.map(m => m.userId);
    if (Object.keys(userWhere).length > 0) {
      const filtered = await prisma.user.findMany({ where: { ...userWhere, id: { in: teamUserIds } }, select: { id: true } });
      eligibleIds = filtered.map(u => u.id);
    } else {
      eligibleIds = teamUserIds;
    }
  } else if (Object.keys(userWhere).length > 0) {
    const users = await prisma.user.findMany({ where: userWhere, select: { id: true } });
    eligibleIds = users.map(u => u.id);
  }

  // 2. Build activity where
  const actWhere: any = {};
  if (eligibleIds) actWhere.userId = { in: eligibleIds };
  const since = periodGte(period);
  if (since) actWhere.startTime = { gte: since };
  const tOr = type !== "all" ? typeOR(type) : null;
  if (tOr) Object.assign(actWhere, tOr);

  // 3. Group by userId
  const orderField = metric === "duration" ? "durationSec" : metric === "count" ? undefined : "distanceM";
  const grouped = await prisma.activity.groupBy({
    by: ["userId"],
    where: actWhere,
    _sum:   { distanceM: true, durationSec: true },
    _count: { id: true },
    orderBy: orderField
      ? { _sum: { [orderField]: "desc" } }
      : { _count: { id: "desc" } },
    take: 50,
  });

  if (grouped.length === 0) return NextResponse.json({ entries: [] });

  // 4. Fetch user profiles
  const userIds = grouped.map(g => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, sex: true, dateOfBirth: true, city: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // 5. Fetch team names for users (first team each user belongs to)
  const memberships = await prisma.teamMember.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, team: { select: { id: true, name: true } } },
    distinct: ["userId"],
  });
  const teamMap = Object.fromEntries(memberships.map(m => [m.userId, m.team]));

  const now = new Date();
  const entries = grouped.map((g, i) => {
    const u = userMap[g.userId];
    const age = u?.dateOfBirth
      ? Math.floor((now.getTime() - new Date(u.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
      : null;
    const ageGrp = age === null ? null
      : age < 30 ? "18-29" : age < 40 ? "30-39" : age < 50 ? "40-49" : age < 60 ? "50-59" : "60+";
    return {
      rank:       i + 1,
      userId:     g.userId,
      name:       u?.name || "Athlete",
      sex:        u?.sex || null,
      ageGroup:   ageGrp,
      city:       u?.city || null,
      team:       teamMap[g.userId] || null,
      distanceMi: g._sum.distanceM ? +(g._sum.distanceM / 1609.34).toFixed(1) : 0,
      durationMin: g._sum.durationSec ? Math.round(g._sum.durationSec / 60) : 0,
      activityCount: g._count.id,
    };
  });

  // Re-sort by chosen metric after enrichment
  if (metric === "duration") entries.sort((a, b) => b.durationMin - a.durationMin);
  else if (metric === "count") entries.sort((a, b) => b.activityCount - a.activityCount);
  else entries.sort((a, b) => b.distanceMi - a.distanceMi);
  entries.forEach((e, i) => { e.rank = i + 1; });

  return NextResponse.json({ entries });
}
