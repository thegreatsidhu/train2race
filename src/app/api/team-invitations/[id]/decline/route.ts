// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/team-invitations/[id]/decline
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const invitation = await (prisma as any).teamInvitation.findUnique({ where: { id } });
  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.userId !== userId) return NextResponse.json({ error: "Not your invitation" }, { status: 403 });
  if (invitation.status !== "pending") return NextResponse.json({ error: "Invitation already responded to" }, { status: 409 });

  await (prisma as any).teamInvitation.update({ where: { id }, data: { status: "declined" } });
  return NextResponse.json({ ok: true });
}
