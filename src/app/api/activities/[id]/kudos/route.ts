// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fromUserId = (session.user as { id: string }).id;

  const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { userId: true } });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (activity.userId === fromUserId) return NextResponse.json({ error: "Cannot kudo your own workout" }, { status: 400 });

  await (prisma as any).kudo.upsert({
    where: { fromUserId_activityId: { fromUserId, activityId } },
    create: { fromUserId, activityId },
    update: {},
  });

  const count = await (prisma as any).kudo.count({ where: { activityId } });
  return NextResponse.json({ ok: true, count });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fromUserId = (session.user as { id: string }).id;

  await (prisma as any).kudo.deleteMany({ where: { fromUserId, activityId } });
  const count = await (prisma as any).kudo.count({ where: { activityId } });
  return NextResponse.json({ ok: true, count });
}
