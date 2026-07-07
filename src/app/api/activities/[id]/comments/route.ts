// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, groupEmailHtml } from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comments = await (prisma as any).activityComment.findMany({
    where: { activityId, isDeleted: false },
    select: {
      id: true,
      content: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const myUserId = (session.user as { id: string }).id;
  return NextResponse.json({
    comments: comments.map((c: any) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      userId: c.userId,
      userName: c.user.name || c.user.email || "Athlete",
      isMe: c.userId === myUserId,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (content.trim().length > 500) return NextResponse.json({ error: "Comment too long (max 500 chars)" }, { status: 400 });

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true, title: true, type: true, userId: true,
      user: { select: { name: true, email: true, emailOptOut: true } },
    },
  });
  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const comment = await (prisma as any).activityComment.create({
    data: { activityId, userId, content: content.trim() },
    select: { id: true, content: true, createdAt: true, userId: true },
  });

  const commenter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const result = {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    userId: comment.userId,
    userName: commenter?.name || "Athlete",
  };

  // Email notification — max one email per activity per 24h (fire-and-forget)
  if (activity.userId !== userId && activity.user.email && !activity.user.emailOptOut) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const priorToday = await (prisma as any).activityComment.count({
      where: { activityId, createdAt: { gte: oneDayAgo }, id: { not: comment.id } },
    });
    if (priorToday === 0) {
      const fromName = commenter?.name || "A teammate";
      const workoutName = activity.title || activity.type;
      sendEmail({
        to: activity.user.email,
        subject: `💬 ${fromName} commented on your workout`,
        html: groupEmailHtml({
          preheader: `${fromName} commented on your ${workoutName}`,
          heading: "New comment on your workout 💬",
          body: `<p><strong style="color:#ede9e2;">${fromName}</strong> commented on your <strong style="color:#ede9e2;">${workoutName}</strong>:</p><p style="margin-top:12px;padding:12px;background:#1a1d23;border-radius:8px;color:#ede9e2;">"${content.trim()}"</p>`,
          cta: "View activity feed",
          ctaUrl: "https://train2race.com/dashboard/teams",
        }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ comment: result }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

  const comment = await (prisma as any).activityComment.findUnique({
    where: { id: commentId },
    select: { userId: true, activityId: true },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.activityId !== activityId || comment.userId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await (prisma as any).activityComment.update({
    where: { id: commentId },
    data: { isDeleted: true, deletedBy: userId },
  });
  return NextResponse.json({ ok: true });
}
