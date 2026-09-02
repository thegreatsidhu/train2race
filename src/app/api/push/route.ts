// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — returns the current user's ID, so the client can associate this device with
// Median.onesignal.login(userId) before registering for push.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  return NextResponse.json({ userId });
}

// POST — updates push notification preferences for the current user.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => ({}));
  const data: Record<string, boolean> = {};
  if ("pushEnabled" in body) data.pushEnabled = body.pushEnabled === true;
  if ("pushDigestOptOut" in body) data.pushDigestOptOut = body.pushDigestOptOut === true;
  if ("pushWeeklyOptOut" in body) data.pushWeeklyOptOut = body.pushWeeklyOptOut === true;
  if ("pushChallengeOptOut" in body) data.pushChallengeOptOut = body.pushChallengeOptOut === true;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({ ok: true });
}
