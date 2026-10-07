import { prisma } from "@/lib/prisma";

// Team challenges enroll the whole team automatically. A member is "in" a challenge when their id
// is in TeamChallenge.acceptances; they can still leave a challenge themselves.

/** Adds every current team member to an approved challenge (keeps anyone already enrolled). */
export async function enrollAllMembers(challengeId: string, teamId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "team_challenges"
    SET "acceptances" = ARRAY(
      SELECT DISTINCT u FROM unnest(
        "acceptances" || ARRAY(SELECT "userId" FROM "team_members" WHERE "teamId" = ${teamId})
      ) AS u
    )
    WHERE "id" = ${challengeId} AND "status" = 'approved'`;
}

/**
 * Called when someone joins a team: enrolls them in the team's approved challenges that are still
 * open to new people (not ended, and not locked because they've already started).
 */
export async function enrollInOpenChallenges(teamId: string, userId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "team_challenges"
      SET "acceptances" = array_append("acceptances", ${userId})
      WHERE "teamId" = ${teamId}
        AND "status" = 'approved'
        AND "endDate" > NOW()
        AND (NOT "lockEnrollmentAtStart" OR "startDate" > NOW())
        AND NOT (${userId} = ANY("acceptances"))`;
  } catch (err) {
    // Joining the team matters more than the enrollment; the member can still tap "Accept".
    console.error("challenge auto-enroll failed:", err);
  }
}
