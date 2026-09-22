// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const blocks = await (prisma as any).blockedUser.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: "desc" },
    include: { blocked: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    blocked: blocks.map((b: any) => ({ id: b.blocked.id, name: b.blocked.name, email: b.blocked.email, blockedAt: b.createdAt })),
  });
}
