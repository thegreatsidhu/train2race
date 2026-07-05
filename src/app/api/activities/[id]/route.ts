// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || activity.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ activity });
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || activity.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { type, title, date, durationMin, distance, unit, notes, steps } = await req.json();
  let distanceM = null;
  if (distance) {
    const d = Number(distance);
    if (unit === "km") distanceM = d * 1000;
    else if (unit === "yd") distanceM = d * 0.9144;
    else if (unit === "m") distanceM = d;
    else distanceM = d * 1609.34;
  }
  const updated = await prisma.activity.update({
    where: { id },
    data: {
      type,
      title: title || type,
      startTime: new Date(date + "T12:00:00"),
      durationSec: Math.round(Number(durationMin) * 60),
      distanceM,
      raw: (() => {
        const r: any = {};
        if (notes) r.notes = notes;
        if (steps && Number(steps) > 0) r.steps = Number(steps);
        return Object.keys(r).length ? r : null;
      })(),
    },
  });
  return NextResponse.json({ activity: updated });
}

export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || activity.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.activity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}