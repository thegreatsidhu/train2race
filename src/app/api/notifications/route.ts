// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await req.json();
  // Only allow marking your own messages as read
  await prisma.adminMessage.updateMany({ where: { id, toUserId: userId }, data: { isRead: true } });
  return NextResponse.json({ ok: true });
}
