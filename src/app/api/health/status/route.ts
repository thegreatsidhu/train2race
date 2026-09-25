import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Grace period before nagging a user who's never connected at all — gives them time to go
// through the Connections page on their own before we assume it's stuck.
const NEVER_CONNECTED_GRACE_DAYS = 4;

// Whether this user has ever successfully synced from the Health Bridge (Apple Health /
// Google Health Connect) before, used to tell "never connected" apart from "was connected,
// now broken." Both cases end up nagging the user (a live check on the client side confirms
// it's still actually broken right now before showing anything) — "never connected" is common
// on Android specifically because Samsung Health doesn't forward data to Health Connect until
// the user explicitly turns that on inside Samsung Health's own settings, so someone can have a
// perfectly working Samsung Health app and still show zero data here indefinitely.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [existing, user] = await Promise.all([
    prisma.activity.findFirst({
      where: { userId, source: { in: ["HEALTH_BRIDGE", "APPLE_HEALTH"] } },
      select: { id: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
  ]);

  const everConnected = !!existing;
  const accountAgeDays = user ? (Date.now() - user.createdAt.getTime()) / 86400000 : 0;
  const pastGracePeriod = accountAgeDays >= NEVER_CONNECTED_GRACE_DAYS;

  return NextResponse.json({ everConnected, pastGracePeriod });
}
