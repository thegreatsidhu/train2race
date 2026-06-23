// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/team-invitations — pending invitations for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  try {
    const invitations = await (prisma as any).teamInvitation.findMany({
      where: { userId, status: "pending" },
      include: {
        team: { select: { id: true, name: true, description: true } },
        inviter: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ invitations });
  } catch (e: any) {
    console.error("team-invitations GET:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
