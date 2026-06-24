// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function ageRange(group: string) {
  const now = new Date();
  const ranges: Record<string, [number, number]> = {
    "18-29": [18, 29], "30-39": [30, 39], "40-49": [40, 49],
    "50-59": [50, 59], "60+": [60, 120],
  };
  const r = ranges[group];
  if (!r) return null;
  // lte = someone who is exactly r[0] years old today was born this date or earlier
  const lte = new Date(now.getFullYear() - r[0], now.getMonth(), now.getDate());
  // gte = someone who is exactly r[1] years old today was born this date or later
  const gte = new Date(now.getFullYear() - r[1] - 1, now.getMonth(), now.getDate() + 1);
  return { gte, lte };
}

function typeConditions(type: string) {
  const map: Record<string, string[]> = {
    run:      ["run", "trail"],
    bike:     ["cycl", "bike", "ride"],
    swim:     ["swim"],
    walk:     ["walk", "hike"],
    strength: ["strength", "weight", "gym"],
  };
  return map[type] || null;
}

function periodGte(period: string): Date | null {
  const now = new Date();
  if (period === "week")  { const d = new Date(now); d.setDate(d.getDate() - 7);  return d; }
  if (period === "month") { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  if (period === "year")  { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  return null;
}

export async function GET(req: Request) {
  try {
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
    const raceId   = searchParams.get("raceId")   || "";

    // 1. Build user filter (sex / age / city only; isPrivate filtered in JS below)
    const userWhere: any = {};
    if (sex !== "all") userWhere.sex = sex;
    if (ageGroup !== "all") {
      const r = ageRange(ageGroup);
      if (r) userWhere.dateOfBirth = r;
    }
    if (city) userWhere.city = { contains: city, mode: "insensitive" };

    // 2. Resolve eligible user IDs (apply team/race scope on top of profile filters)
    let eligibleIds: string[];

    if (raceId) {
      const regs = await prisma.raceRegistration.findMany({ where: { majorRaceId: raceId }, select: { userId: true } });
      const raceUserIds = regs.map((r: any) => r.userId);

      let scopedWhere = { ...userWhere, id: { in: raceUserIds } };
      if (teamId) {
        const members = await prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } });
        const teamUserIds = members.map((m: any) => m.userId);
        scopedWhere = { ...scopedWhere, id: { in: teamUserIds.filter((id: string) => raceUserIds.includes(id)) } };
      }
      const users = await prisma.user.findMany({ where: scopedWhere, select: { id: true } });
      eligibleIds = users.map((u: any) => u.id);
    } else if (teamId) {
      const members = await prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } });
      const teamUserIds = members.map((m: any) => m.userId);
      const users = await prisma.user.findMany({ where: { ...userWhere, id: { in: teamUserIds } }, select: { id: true } });
      eligibleIds = users.map((u: any) => u.id);
    } else {
      const users = await prisma.user.findMany({ where: userWhere, select: { id: true } });
      eligibleIds = users.map((u: any) => u.id);
    }

    if (eligibleIds.length === 0) return NextResponse.json({ entries: [] });

    // 3. Build activity filter
    const actWhere: any = { userId: { in: eligibleIds } };
    const since = periodGte(period);
    if (since) actWhere.startTime = { gte: since };

    const terms = type !== "all" ? typeConditions(type) : null;
    if (terms) actWhere.OR = terms.map((t: string) => ({ type: { contains: t, mode: "insensitive" } }));

    // 4. Group by userId
    const grouped = await prisma.activity.groupBy({
      by: ["userId"],
      where: actWhere,
      _sum:   { distanceM: true, durationSec: true },
      _count: { userId: true },
      orderBy: metric === "count"
        ? { _count: { userId: "desc" } }
        : metric === "duration"
          ? { _sum: { durationSec: "desc" } }
          : { _sum: { distanceM: "desc" } },
      take: 50,
    });

    if (grouped.length === 0) return NextResponse.json({ entries: [] });

    // 5. Enrich with profile + team data (filter private users in JS)
    const userIds = grouped.map((g: any) => g.userId);
    const [users, memberships] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, sex: true, dateOfBirth: true, city: true, isPrivate: true },
      }),
      prisma.teamMember.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, team: { select: { id: true, name: true } } },
        distinct: ["userId"],
      }),
    ]);
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
    const teamMap = Object.fromEntries(memberships.map((m: any) => [m.userId, m.team]));

    const now = new Date();
    let entries = grouped.map((g: any) => {
      const u = userMap[g.userId];
      const age = u?.dateOfBirth
        ? Math.floor((now.getTime() - new Date(u.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;
      const ageGrp = age == null ? null
        : age < 30 ? "18-29" : age < 40 ? "30-39" : age < 50 ? "40-49" : age < 60 ? "50-59" : "60+";
      return {
        userId:        g.userId,
        name:          u?.name || "Athlete",
        sex:           u?.sex  || null,
        ageGroup:      ageGrp,
        city:          u?.city || null,
        team:          teamMap[g.userId] || null,
        distanceMi:    g._sum.distanceM  ? +(g._sum.distanceM  / 1609.34).toFixed(1) : 0,
        durationMin:   g._sum.durationSec ? Math.round(g._sum.durationSec / 60) : 0,
        activityCount: g._count.userId || 0,
        rank:          0,
      };
    });

    // Remove private users (checked in JS to avoid OR-null Prisma query issues)
    entries = entries.filter((e: any) => !userMap[e.userId]?.isPrivate);

    // Sort and rank
    if (metric === "duration") entries.sort((a: any, b: any) => b.durationMin   - a.durationMin);
    else if (metric === "count") entries.sort((a: any, b: any) => b.activityCount - a.activityCount);
    else entries.sort((a: any, b: any) => b.distanceMi - a.distanceMi);
    entries.forEach((e: any, i: number) => { e.rank = i + 1; });

    return NextResponse.json({ entries });
  } catch (err: any) {
    console.error("Leaderboard error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
