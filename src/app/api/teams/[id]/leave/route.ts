// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  // Don't let the last captain walk away and leave the team with nobody in charge.
  const me = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } }, select: { role: true } });
  if (me?.role === "admin") {
    const [captains, members] = await Promise.all([
      prisma.teamMember.count({ where: { teamId: id, role: "admin" } }),
      prisma.teamMember.count({ where: { teamId: id } }),
    ]);
    if (captains === 1 && members > 1) {
      return NextResponse.json({ error: "You're the only captain. Make someone else a captain first, or delete the team." }, { status: 409 });
    }
  }
  await prisma.teamMember.deleteMany({ where: { teamId: id, userId } });
  return NextResponse.json({ ok: true });
}
