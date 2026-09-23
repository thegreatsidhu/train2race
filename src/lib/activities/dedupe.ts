import { prisma } from "@/lib/prisma";

const DUPLICATE_WINDOW_MS = 45 * 60 * 1000;

/**
 * Finds an existing activity for this user starting within ~45 minutes of the given time,
 * regardless of source — catches the same real-world workout arriving twice through different
 * paths (e.g. typed in by hand, then also synced from the Health app webhook), which the
 * @@unique([source, externalId]) constraint can't see since each path uses its own externalId.
 */
export async function findLikelyDuplicateActivity(userId: string, startTime: Date, excludeSource?: string) {
  const windowStart = new Date(startTime.getTime() - DUPLICATE_WINDOW_MS);
  const windowEnd = new Date(startTime.getTime() + DUPLICATE_WINDOW_MS);
  return prisma.activity.findFirst({
    where: {
      userId,
      startTime: { gte: windowStart, lte: windowEnd },
      ...(excludeSource ? { source: { not: excludeSource as never } } : {}),
    },
    select: { id: true, source: true, type: true, title: true, startTime: true, distanceM: true, durationSec: true },
    orderBy: { startTime: "asc" },
  });
}
