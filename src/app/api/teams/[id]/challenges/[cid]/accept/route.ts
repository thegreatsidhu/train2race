// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid: challengeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const challenge = await prisma.teamChallenge.findFirst({ where: { id: challengeId, teamId } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ((challenge.acceptances as string[]).includes(userId)) {
    return NextResponse.json({ ok: true, alreadyAccepted: true });
  }

  await prisma.teamChallenge.update({
    where: { id: challengeId },
    data: { acceptances: { push: userId } },
  });

  return NextResponse.json({ ok: true });
}
