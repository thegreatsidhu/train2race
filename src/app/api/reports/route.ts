// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const VALID_TYPES = ["team_message", "direct_message", "activity_comment", "activity_photo"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (!(await checkRateLimit(`report:${userId}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many reports. Try again later." }, { status: 429 });
  }

  const { contentType, contentId, reason } = await req.json();
  if (!VALID_TYPES.includes(contentType) || !contentId) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }

  let reportedUserId: string | null = null;
  let contentSnapshot: string | null = null;
  let autoActioned = false;

  if (contentType === "team_message") {
    const message = await prisma.teamMessage.findUnique({ where: { id: contentId } });
    if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const isMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: message.teamId, userId } } });
    if (!isMember) return NextResponse.json({ error: "Not a member" }, { status: 403 });
    reportedUserId = message.userId;
    contentSnapshot = message.content;
  } else if (contentType === "direct_message") {
    const message = await prisma.directMessage.findUnique({ where: { id: contentId } });
    if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (message.fromUserId !== userId && message.toUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    reportedUserId = message.fromUserId === userId ? message.toUserId : message.fromUserId;
    contentSnapshot = message.content;
  } else if (contentType === "activity_comment") {
    const comment = await (prisma as any).activityComment.findUnique({ where: { id: contentId } });
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    reportedUserId = comment.userId;
    contentSnapshot = comment.content;
  } else if (contentType === "activity_photo") {
    const activity = await prisma.activity.findUnique({ where: { id: contentId } });
    if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
    reportedUserId = activity.userId;
    autoActioned = true;
    await prisma.activity.update({ where: { id: contentId }, data: { photosHidden: true } });
  }

  if (!reportedUserId) return NextResponse.json({ error: "Could not resolve reported content" }, { status: 400 });

  if (reportedUserId === userId) {
    return NextResponse.json({ error: "You can't report your own content" }, { status: 400 });
  }

  const report = await (prisma as any).contentReport.create({
    data: {
      reporterId: userId,
      reportedUserId,
      contentType,
      contentId,
      contentSnapshot,
      reason: reason?.trim()?.slice(0, 500) || null,
      autoActioned,
    },
  });

  return NextResponse.json({ ok: true, report, autoActioned });
}
