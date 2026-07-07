// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubToken } from "@/lib/email";

// POST: toggle subscription (resubscribe or unsubscribe)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, resubscribe } = body;
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const userId = verifyUnsubToken(token);
  if (!userId) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { emailOptOut: !resubscribe },
    });
    return NextResponse.json({ ok: true, emailOptOut: !resubscribe });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
