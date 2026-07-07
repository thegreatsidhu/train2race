// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendEmail, groupEmailHtml, unsubscribeUrl } from "@/lib/email";
import bcrypt from "bcryptjs";

const FALLBACK_PASSWORD = "train2race2024";

async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: "adminPasswordHash" } });
    if (setting?.value) return bcrypt.compare(password, setting.value);
  } catch {}
  return password === FALLBACK_PASSWORD;
}

async function isSuperAdmin(): Promise<boolean> {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return false;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role === "superadmin" || user?.role === "admin";
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password") ?? "";

  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`admin-pch:${ip}`, 10, 15 * 60 * 1000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const valid = await verifyAdminPassword(password);
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const challenges = await (prisma as any).platformChallenge.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          participants: { where: { optedOut: false } },
          invites: true,
        },
      },
    },
  });

  // Alert counts by challenge type
  const alertCounts = await (prisma as any).challengeAlert.groupBy({
    by: ["challengeType"],
    _count: { _all: true },
  });
  const alertCountMap: Record<string, number> = {};
  for (const row of alertCounts) alertCountMap[row.challengeType] = row._count._all;

  // For each challenge, count participants who joined via invite vs organic
  const challengeIds = challenges.map((c: any) => c.id);
  const inviteJoins = await (prisma as any).platformChallengeParticipant.groupBy({
    by: ["challengeId", "joinedVia"],
    where: { challengeId: { in: challengeIds }, optedOut: false },
    _count: { _all: true },
  });

  const inviteJoinMap: Record<string, Record<string, number>> = {};
  for (const row of inviteJoins) {
    if (!inviteJoinMap[row.challengeId]) inviteJoinMap[row.challengeId] = {};
    inviteJoinMap[row.challengeId][row.joinedVia] = row._count._all;
  }

  return NextResponse.json({
    challenges: challenges.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.type,
      activityFilter: c.activityFilter,
      badgeName: c.badgeName,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      participantCount: c._count.participants,
      inviteCount: c._count.invites,
      joinsBySource: inviteJoinMap[c.id] ?? {},
      dailyAwards: c.dailyAwards ?? null,
      dailyAwardsDate: c.dailyAwardsDate ?? null,
      finalAnnouncement: c.finalAnnouncement ?? null,
      finalAnnouncedAt: c.finalAnnouncedAt ?? null,
      createdAt: c.createdAt,
    })),
    alertCounts: alertCountMap,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password } = body;

  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`admin-pch:${ip}`, 10, 15 * 60 * 1000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const valid = await verifyAdminPassword(password);
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, type, activityFilter, badgeName, startDate, endDate } = body;
  if (!title?.trim() || !type || !startDate || !endDate) {
    return NextResponse.json({ error: "title, type, startDate, endDate required" }, { status: 400 });
  }

  const session = await auth();
  const createdBy = (session?.user as any)?.id ?? "admin";

  const challenge = await (prisma as any).platformChallenge.create({
    data: {
      createdBy,
      title: title.trim(),
      description: description?.trim() || null,
      type,
      activityFilter: activityFilter || null,
      badgeName: badgeName?.trim() || null,
      startDate: new Date(startDate + "T12:00:00"),
      endDate: new Date(endDate + "T23:59:59"),
      status: "active",
    },
  });

  const startStr = challenge.startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const endStr = challenge.endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const challengeUrl = `${process.env.NEXTAUTH_URL || "https://train2race.com"}/challenge/${challenge.id}`;
  const hoursUntilStart = (challenge.startDate.getTime() - Date.now()) / 3600000;

  // Broadcast announcement to all users (only if challenge starts more than 24h from now)
  if (process.env.RESEND_API_KEY && hoursUntilStart > 24) {
    const allUsers = await (prisma as any).user.findMany({
      where: { emailOptOut: false, emailChallengeOptOut: false, email: { not: null } },
      select: { id: true, email: true, name: true },
    });
    for (const u of allUsers) {
      sendEmail({
        to: u.email,
        subject: `New challenge: ${challenge.title} starts ${startStr} 🏆`,
        html: groupEmailHtml({
          preheader: `A new Train2Race challenge is starting — join before enrollment closes!`,
          heading: `New challenge: ${challenge.title} 🏆`,
          body: `<p style="margin:0 0 12px;">A new platform challenge has launched!</p>
<p style="margin:0 0 6px;"><strong style="color:#ede9e2;">📅 Starts:</strong> ${startStr}</p>
<p style="margin:0 0 6px;"><strong style="color:#ede9e2;">🏁 Ends:</strong> ${endStr}</p>
${challenge.description ? `<p style="margin:12px 0;color:#9aa3ab;">${challenge.description}</p>` : ""}
<p style="margin:12px 0 0;color:#9aa3ab;font-size:13px;">Enrollment closes when the challenge starts — join now to secure your spot!</p>`,
          cta: "Join the challenge →",
          ctaUrl: challengeUrl,
          unsubUrl: unsubscribeUrl(u.id),
        }),
      }).catch(() => {});
    }
  }

  // Send alert emails to opted-in users and then delete their alert
  const alertsToNotify = await (prisma as any).challengeAlert.findMany({
    where: { OR: [{ challengeType: type }, { challengeType: "all" }] },
    select: { id: true, userId: true, user: { select: { email: true, name: true, emailOptOut: true } } },
  });
  for (const alert of alertsToNotify) {
    if (!alert.user.email || alert.user.emailOptOut) continue;
    sendEmail({
      to: alert.user.email,
      subject: `New challenge starting soon — ${challenge.title}`,
      html: groupEmailHtml({
        preheader: `${challenge.title} begins ${startStr}. Join now before enrollment closes!`,
        heading: `New challenge: ${challenge.title} 🏆`,
        body: `<p>A new platform challenge is starting soon — and you asked to be notified!</p><p style="margin-top:12px;"><strong style="color:#ede9e2;">${challenge.title}</strong> begins on <strong style="color:#ede9e2;">${startStr}</strong>. Join now before enrollment closes.</p>`,
        cta: "Join the challenge →",
        ctaUrl: challengeUrl,
        unsubUrl: unsubscribeUrl(alert.userId),
      }),
    }).catch(() => {});
  }
  // Remove all triggered alerts (users must re-request each time)
  if (alertsToNotify.length > 0) {
    await (prisma as any).challengeAlert.deleteMany({
      where: { id: { in: alertsToNotify.map((a: any) => a.id) } },
    });
  }

  return NextResponse.json({ challenge, alertsNotified: alertsToNotify.length });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { password, challengeId } = body;

  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    const valid = await verifyAdminPassword(password);
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!challengeId) return NextResponse.json({ error: "challengeId required" }, { status: 400 });
  await (prisma as any).platformChallenge.delete({ where: { id: challengeId } });
  return NextResponse.json({ ok: true });
}
