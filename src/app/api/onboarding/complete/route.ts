// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));
  const data: any = { onboardingComplete: true };
  if (body.fitnessGoal) data.fitnessGoal = body.fitnessGoal;
  await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({ ok: true });
}
