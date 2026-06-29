import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password") || undefined;
  if (!(await isAdminAuthorized(password))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalTeams,
    totalActivities,
    totalPlans,
    ticketsByStatus,
    recentSignups,
    topUsers,
    dauRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.team.count({ where: { isCommunity: false } }),
    prisma.activity.count(),
    prisma.trainingPlan.count(),

    prisma.supportTicket.groupBy({
      by: ["status"],
      _count: { status: true },
    }),

    // Signups per week for last 8 weeks — fetch raw rows and bucket in JS
    prisma.user.findMany({
      where: { createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true },
    }),

    // Top 5 users by activity count
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { activities: true } },
      },
      orderBy: { activities: { _count: "desc" } },
      take: 5,
      where: { role: { not: "test" } },
    }),

    // Daily active users for last 7 days (users with at least one activity that day)
    prisma.activity.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { userId: true, createdAt: true },
    }),
  ]);

  // Build signups-per-week buckets (Mon–Sun weeks)
  const weekBuckets: Record<string, number> = {};
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    weekBuckets[weekStart.toISOString()] = 0;
  }
  for (const u of recentSignups) {
    const d = new Date(u.createdAt);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    if (key in weekBuckets) weekBuckets[key] = (weekBuckets[key] || 0) + 1;
  }
  const signupsPerWeek = Object.entries(weekBuckets).map(([week, count]) => ({
    week,
    count,
  }));

  // Build DAU buckets for last 7 days
  const dauBuckets: Record<string, Set<string>> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dauBuckets[d.toISOString()] = new Set();
  }
  for (const a of dauRaw) {
    const d = new Date(a.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    if (key in dauBuckets) dauBuckets[key].add(a.userId);
  }
  const dailyActiveUsers = Object.entries(dauBuckets).map(([day, users]) => ({
    day,
    count: users.size,
  }));

  const avgWorkoutsPerUser =
    totalUsers > 0 ? Math.round((totalActivities / totalUsers) * 10) / 10 : 0;

  const tickets = ticketsByStatus.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count.status;
    return acc;
  }, {});

  return NextResponse.json({
    totalUsers,
    totalTeams,
    totalActivities,
    totalPlans,
    avgWorkoutsPerUser,
    signupsPerWeek,
    dailyActiveUsers,
    topUsers: topUsers.map((u) => ({
      name: u.name || u.email || "Unknown",
      email: u.email,
      count: u._count.activities,
    })),
    tickets,
  });
}
