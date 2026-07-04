// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

  const myMemberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true, lastViewedChatAt: true },
  });
  const userTeamIds = myMemberships.map(m => m.teamId);

  const adminDmsQuery = (prisma as any).adminMessage.findMany({
    where: { toUserId: userId, isRead: false },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, content: true, createdAt: true },
  });

  if (userTeamIds.length === 0) {
    const adminDms = await adminDmsQuery;
    return NextResponse.json({
      teamMessageGroups: [],
      dmGroups: [],
      adminDms: adminDms.map((m: any) => ({ id: m.id, content: m.content, createdAt: m.createdAt.toISOString() })),
      groupAlerts: [],
      kudosReceived: [],
    });
  }

  const [rawTeamMessages, adminDms, recentEvents, recentChallenges, unreadDms, kudosReceived] = await Promise.all([
    prisma.teamMessage.findMany({
      where: { teamId: { in: userTeamIds }, userId: { not: userId }, isDeleted: false, createdAt: { gte: thirtyDaysAgo } },
      select: { content: true, createdAt: true, teamId: true, team: { select: { id: true, name: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    adminDmsQuery,
    (prisma as any).teamEvent.findMany({
      where: { teamId: { in: userTeamIds }, createdAt: { gte: sevenDaysAgo } },
      select: { id: true, title: true, createdAt: true, teamId: true, team: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    (prisma as any).teamChallenge.findMany({
      where: { teamId: { in: userTeamIds }, createdAt: { gte: sevenDaysAgo }, status: "approved" },
      select: { id: true, title: true, createdAt: true, teamId: true, team: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    (prisma as any).directMessage.findMany({
      where: { toUserId: userId, isRead: false, createdAt: { gte: thirtyDaysAgo } },
      select: { id: true, content: true, createdAt: true, teamId: true, team: { select: { id: true, name: true } }, fromUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    (prisma as any).kudo.findMany({
      where: {
        activity: { userId },
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        id: true,
        createdAt: true,
        fromUser: { select: { name: true, email: true } },
        activity: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const chatViewMap = new Map(myMemberships.map(m => [m.teamId, m.lastViewedChatAt]));
  const unreadTeamMsgs = rawTeamMessages.filter((msg: any) => {
    const lastViewed = chatViewMap.get(msg.teamId);
    return !lastViewed || new Date(msg.createdAt) > new Date(lastViewed);
  });

  const msgByTeam = new Map<string, any>();
  for (const msg of unreadTeamMsgs) {
    if (!msgByTeam.has(msg.teamId)) msgByTeam.set(msg.teamId, { teamId: msg.team.id, teamName: msg.team.name, count: 0, senderName: msg.user.name ?? "Someone", preview: msg.content });
    msgByTeam.get(msg.teamId).count++;
  }

  const dmByTeam = new Map<string, any>();
  for (const dm of unreadDms as any[]) {
    if (!dmByTeam.has(dm.teamId)) dmByTeam.set(dm.teamId, { teamId: dm.team.id, teamName: dm.team.name, count: 0, senderName: dm.fromUser.name ?? "Captain", preview: dm.content });
    dmByTeam.get(dm.teamId).count++;
  }

  const groupAlerts = [
    ...(recentEvents as any[]).map((e: any) => ({ id: "ev-" + e.id, type: "event",     teamId: e.teamId, teamName: e.team.name, title: e.title, createdAt: e.createdAt.toISOString() })),
    ...(recentChallenges as any[]).map((c: any) => ({ id: "ch-" + c.id, type: "challenge", teamId: c.teamId, teamName: c.team.name, title: c.title, createdAt: c.createdAt.toISOString() })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    teamMessageGroups: Array.from(msgByTeam.values()),
    dmGroups: Array.from(dmByTeam.values()),
    adminDms: (adminDms as any[]).map((m: any) => ({ id: m.id, content: m.content, createdAt: m.createdAt.toISOString() })),
    groupAlerts,
    kudosReceived: (kudosReceived as any[]).map((k: any) => ({
      id: k.id,
      createdAt: k.createdAt.toISOString(),
      fromName: k.fromUser.name || k.fromUser.email || "A teammate",
      activityTitle: k.activity.title || k.activity.type,
      activityId: k.activity.id,
    })),
  });
}
