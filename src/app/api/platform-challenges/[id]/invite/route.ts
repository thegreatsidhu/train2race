// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, groupEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: challengeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const invitedBy = (session.user as { id: string }).id;
  const inviterName = (session.user as any).name || "A friend";

  const { type, userId, email } = await req.json();
  if (!type || (type !== "user" && type !== "email")) {
    return NextResponse.json({ error: "type must be 'user' or 'email'" }, { status: 400 });
  }

  const challenge = await (prisma as any).platformChallenge.findUnique({
    where: { id: challengeId },
    select: { id: true, title: true, startDate: true, endDate: true, status: true },
  });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Invites are only allowed before the challenge starts
  if (new Date(challenge.startDate) <= new Date()) {
    return NextResponse.json({ error: "Invites closed — challenge already started" }, { status: 409 });
  }

  const startStr = new Date(challenge.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const challengeUrl = `${process.env.NEXTAUTH_URL || "https://train2race.com"}/challenge/${challengeId}`;

  if (type === "user") {
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    // Look up the invitee user
    const invitee = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, emailOptOut: true },
    });
    if (!invitee) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Avoid duplicate invites
    const existing = await (prisma as any).platformChallengeInvite.findFirst({
      where: { challengeId, email: invitee.email ?? userId, userId },
    });
    if (existing) return NextResponse.json({ ok: true, alreadyInvited: true });

    await (prisma as any).platformChallengeInvite.create({
      data: {
        challengeId,
        invitedBy,
        email: invitee.email || "",
        userId: invitee.id,
        notified: false,
      },
    });

    return NextResponse.json({ ok: true });
  }

  // type === "email" — external invite
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

  // Check if email belongs to a known user
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, emailOptOut: true },
  });

  if (existingUser) {
    // Treat as in-app invite
    const alreadyInvited = await (prisma as any).platformChallengeInvite.findFirst({
      where: { challengeId, userId: existingUser.id },
    });
    if (!alreadyInvited) {
      await (prisma as any).platformChallengeInvite.create({
        data: { challengeId, invitedBy, email: existingUser.email!, userId: existingUser.id, notified: false },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Unknown email — send invite email immediately
  const alreadyEmailed = await (prisma as any).platformChallengeInvite.findFirst({
    where: { challengeId, email: email.toLowerCase() },
  });
  if (alreadyEmailed) return NextResponse.json({ ok: true, alreadySent: true });

  await (prisma as any).platformChallengeInvite.create({
    data: { challengeId, invitedBy, email: email.toLowerCase(), notified: true },
  });

  await sendEmail({
    to: email.toLowerCase(),
    subject: `${inviterName} invited you to a fitness challenge on Train2Race`,
    html: groupEmailHtml({
      preheader: `Join the ${challenge.title} challenge — starts ${startStr}`,
      heading: `You're invited! 🏆`,
      body: `<p><strong style="color:#ede9e2;">${inviterName}</strong> invited you to join the <strong style="color:#ede9e2;">${challenge.title}</strong> challenge on Train2Race — starts <strong style="color:#ede9e2;">${startStr}</strong>.</p><p style="margin-top:12px;color:#9aa3ab;">Train2Race is a free app to track workouts, compete with friends, and crush your fitness goals together.</p>`,
      cta: "Join free →",
      ctaUrl: challengeUrl,
    }),
  });

  return NextResponse.json({ ok: true });
}
