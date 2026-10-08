import { prisma } from "@/lib/prisma";

// Team and community names are unique across the whole app, ignoring capitals and extra spaces
// ("Austin Runners" = "austin  runners"). Teams and communities share one namespace.

export const NAME_TAKEN = "That name is already taken. Please choose a different one.";

/** Trims and collapses runs of whitespace, so "Austin  Runners " is stored as "Austin Runners". */
export function normalizeTeamName(name: unknown): string {
  return typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, 80) : "";
}

/** True if another team/community already uses this name. Pass the team's own id when renaming. */
export async function teamNameTaken(name: string, excludeTeamId?: string): Promise<boolean> {
  const existing = await prisma.team.findFirst({
    where: { name: { equals: normalizeTeamName(name), mode: "insensitive" }, ...(excludeTeamId ? { id: { not: excludeTeamId } } : {}) },
    select: { id: true },
  });
  return !!existing;
}

/** True if someone else already has a pending request for a community with this name. */
export async function communityRequestNameTaken(name: string, excludeRequestId?: string): Promise<boolean> {
  const existing = await prisma.communityRequest.findFirst({
    where: { status: "pending", name: { equals: normalizeTeamName(name), mode: "insensitive" }, ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}) },
    select: { id: true },
  });
  return !!existing;
}
