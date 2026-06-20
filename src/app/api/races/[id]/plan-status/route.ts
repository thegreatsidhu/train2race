// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const plan = await prisma.trainingPlan.findFirst({ where: { raceId: id, userId }, select: { id: true, _count: { select: { workouts: true } } } });
  return NextResponse.json({ ready: plan != null && plan._count.workouts > 0 });
}
