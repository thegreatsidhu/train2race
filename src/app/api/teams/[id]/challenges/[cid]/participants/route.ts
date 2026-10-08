// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperUser } from "@/lib/superuser";

// Captains add team members to a challenge by hand: people who left it, or who joined the team
// after enrollment closed. POST { userIds: string[] } or { all: true }. Works even when the
// challenge has locked enrollment, since the captain is choosing to let them in.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [me, team, challenge] = await Promise.all([
    prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } }, select: { role: true } }),
    prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } }),
    prisma.teamChallenge.findFirst({ where: { id: cid, teamId }, select: { id: true, status: true, endDate: true, acceptances: true } }),
  ]);
  if (me?.role !== "admin" && team?.createdBy !== userId && !isSuperUser(session.user.email)) {
    return NextResponse.json({ error: "Captains only" }, { status: 403 });
  }
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.status !== "approved") return NextResponse.json({ error: "This challenge isn't approved yet." }, { status: 400 });
  if (challenge.endDate <= new Date()) return NextResponse.json({ error: "This challenge has ended." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const requested: string[] = body.all === true ? null : (Array.isArray(body.userIds) ? body.userIds.filter(u => typeof u === "string") : []);
  if (requested && requested.length === 0) return NextResponse.json({ error: "Pick at least one member." }, { status: 400 });

  // Only actual team members can be added.
  const members = await prisma.teamMember.findMany({
    where: { teamId, ...(requested ? { userId: { in: requested } } : {}) },
    select: { userId: true },
  });
  const toAdd = members.map(m => m.userId).filter(u => !challenge.acceptances.includes(u));
  if (toAdd.length) {
    await prisma.$executeRaw`
      UPDATE "team_challenges"
      SET "acceptances" = ARRAY(SELECT DISTINCT u FROM unnest("acceptances" || ${toAdd}::text[]) AS u)
      WHERE "id" = ${cid}`;
  }
  return NextResponse.json({ ok: true, added: toAdd });
}
