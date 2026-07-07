// @ts-nocheck
import { prisma } from "@/lib/prisma";

export type PChallengeType = "most_workouts" | "most_miles" | "most_active_days" | "most_steps";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  stat: string;
  dateOfBirth?: string | null;
}

export function formatStat(score: number, type: string): string {
  switch (type) {
    case "most_workouts": return `${Math.round(score)} workout${score !== 1 ? "s" : ""}`;
    case "most_miles": return `${score.toFixed(1)} mi`;
    case "most_active_days": return `${Math.round(score)} active day${score !== 1 ? "s" : ""}`;
    case "most_steps": return `${Math.round(score).toLocaleString()} steps`;
    default: return `${Math.round(score)}`;
  }
}

export async function computeLeaderboard(
  challenge: { type: string; activityFilter?: string | null; startDate: Date; endDate: Date },
  participantUserIds: string[],
  includeAge = false
): Promise<LeaderboardEntry[]> {
  if (participantUserIds.length === 0) return [];

  const endCap = new Date(Math.min(new Date(challenge.endDate).getTime(), Date.now()));

  const [activities, users] = await Promise.all([
    prisma.activity.findMany({
      where: {
        userId: { in: participantUserIds },
        startTime: { gte: new Date(challenge.startDate), lte: endCap },
        ...(challenge.activityFilter && challenge.activityFilter !== "all"
          ? { type: challenge.activityFilter }
          : {}),
      },
      select: { userId: true, distanceM: true, startTime: true, raw: true },
    }),
    prisma.user.findMany({
      where: { id: { in: participantUserIds } },
      select: { id: true, name: true, ...(includeAge ? { dateOfBirth: true } : {}) },
    }),
  ]);

  const nameMap = Object.fromEntries(users.map((u: any) => [u.id, { name: u.name || "Athlete", dob: u.dateOfBirth ?? null }]));
  const scores = new Map<string, number>();
  const daysByUser = new Map<string, Set<string>>();

  for (const uid of participantUserIds) scores.set(uid, 0);

  for (const a of activities as any[]) {
    const existing = scores.get(a.userId) ?? 0;
    switch (challenge.type) {
      case "most_workouts":
        scores.set(a.userId, existing + 1);
        break;
      case "most_miles":
        scores.set(a.userId, existing + (a.distanceM ?? 0) / 1609.34);
        break;
      case "most_active_days": {
        const day = new Date(a.startTime).toISOString().split("T")[0];
        if (!daysByUser.has(a.userId)) daysByUser.set(a.userId, new Set());
        daysByUser.get(a.userId)!.add(day);
        break;
      }
      case "most_steps":
        scores.set(a.userId, existing + Number((a.raw as any)?.steps ?? 0));
        break;
    }
  }

  if (challenge.type === "most_active_days") {
    for (const [uid, days] of daysByUser) scores.set(uid, days.size);
  }

  return participantUserIds
    .map(uid => ({
      userId: uid,
      name: nameMap[uid]?.name ?? "Athlete",
      score: scores.get(uid) ?? 0,
      stat: formatStat(scores.get(uid) ?? 0, challenge.type),
      ...(includeAge ? { dateOfBirth: nameMap[uid]?.dob ?? null } : {}),
    }))
    .sort((a, b) => b.score - a.score);
}
