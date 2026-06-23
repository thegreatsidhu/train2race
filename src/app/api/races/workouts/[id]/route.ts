// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const workout = await prisma.trainingWorkout.findUnique({ where: { id }, include: { plan: { select: { userId: true } } } });
  if (!workout || workout.plan.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.trainingWorkout.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const { completed } = await req.json();

  const workout = await prisma.trainingWorkout.update({
    where: { id },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  return NextResponse.json({ workout });
}
