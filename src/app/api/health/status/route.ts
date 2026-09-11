import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Whether this user has ever successfully synced from the Health Bridge (Apple Health /
// Google Health Connect) before, used to tell "never connected" apart from "was connected,
// now broken" so we only nag users who had a working connection that dropped.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const existing = await prisma.activity.findFirst({
    where: { userId, source: "HEALTH_BRIDGE" },
    select: { id: true },
  });

  return NextResponse.json({ everConnected: !!existing });
}
