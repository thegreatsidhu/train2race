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

  const existing = await prisma.trainingWorkout.findUnique({ where: { id }, include: { plan: { select: { userId: true } } } });
  if (!existing || existing.plan.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};

  if ("completed" in body) {
    data.completed = body.completed;
    data.completedAt = body.completed ? new Date() : null;
  }
  if ("type" in body) data.type = body.type;
  if ("title" in body) data.title = body.title?.trim();
  if ("description" in body) data.description = body.description?.trim() ?? "";
  if ("distanceKm" in body) data.distanceKm = body.distanceKm ? Number(body.distanceKm) * 1.60934 : null;
  if ("durationMin" in body) data.durationMin = body.durationMin ? Number(body.durationMin) : null;
  if ("date" in body) {
    const d = new Date(body.date);
    data.date = d;
    data.day = d.toLocaleDateString("en-US", { weekday: "long" });
  }

  const workout = await prisma.trainingWorkout.update({ where: { id }, data });
  return NextResponse.json({ workout });
}
