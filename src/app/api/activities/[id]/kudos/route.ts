// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, groupEmailHtml } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fromUserId = (session.user as { id: string }).id;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      userId: true,
      title: true,
      type: true,
      user: { select: { name: true, email: true, emailOptOut: true } },
    },
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (activity.userId === fromUserId) return NextResponse.json({ error: "Cannot high five your own workout" }, { status: 400 });

  // Check if any high five was already given today for this activity (for email throttle)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const highFivesToday = await (prisma as any).highFive.count({
    where: { activityId, createdAt: { gte: todayStart } },
  });
  const shouldEmail = highFivesToday === 0;

  await (prisma as any).highFive.upsert({
    where: { fromUserId_activityId: { fromUserId, activityId } },
    create: { fromUserId, activityId },
    update: {},
  });

  const count = await (prisma as any).highFive.count({ where: { activityId } });

  // Send email to workout owner (once per workout per day)
  if (shouldEmail && activity.user.email && !activity.user.emailOptOut) {
    const fromUser = await prisma.user.findUnique({
      where: { id: fromUserId },
      select: { name: true },
    });
    const fromName = fromUser?.name || "A teammate";
    const workoutName = activity.title || activity.type;
    sendEmail({
      to: activity.user.email,
      subject: "Your teammate gave you a high five 🙌",
      html: groupEmailHtml({
        preheader: `${fromName} high fived your ${workoutName}!`,
        heading: "You got a high five! 🙌",
        body: `<p><strong style="color:#ede9e2;">${fromName}</strong> gave your <strong style="color:#ede9e2;">${workoutName}</strong> a high five. Keep up the great work!</p>`,
        cta: "View your activity",
        ctaUrl: "https://train2race.com/dashboard",
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, count });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fromUserId = (session.user as { id: string }).id;

  await (prisma as any).highFive.deleteMany({ where: { fromUserId, activityId } });
  const count = await (prisma as any).highFive.count({ where: { activityId } });
  return NextResponse.json({ ok: true, count });
}
