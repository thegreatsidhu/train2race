// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const FALLBACK_PASSWORD = "train2race2024";

async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: "adminPasswordHash" } });
    if (setting?.value) return bcrypt.compare(password, setting.value);
  } catch {}
  return password === FALLBACK_PASSWORD;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { password, action } = body;
  const valid = await verifyAdminPassword(password);
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (action === "getData") {
    try {
      const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, createdAt: true, connections: { select: { source: true } }, raceTargets: { select: { id: true } } } });
      const inviteCodes = await prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, code: true, createdAt: true, usedBy: true, usedAt: true } });
      const usedByIds = inviteCodes.map((c) => c.usedBy).filter(Boolean) as string[];
      const inviteUsers = usedByIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: usedByIds } }, select: { id: true, name: true, email: true } }) : [];
      const inviteUserMap = Object.fromEntries(inviteUsers.map((u) => [u.id, u]));
      const inviteCodesWithUser = inviteCodes.map((c) => ({ ...c, usedByUser: c.usedBy ? inviteUserMap[c.usedBy] ?? null : null }));
      const activityCount = await prisma.activity.count();
      const raceCount = await prisma.raceTarget.count();
      const pendingRaces = await prisma.majorRace.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" } });
      const recentMessages = await prisma.eventMessage.findMany({ where: { isDeleted: false }, orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } }, majorRace: { select: { name: true } } } });
      return NextResponse.json({ users, inviteCodes: inviteCodesWithUser, activityCount, raceCount, pendingRaces, recentMessages });
    } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }
  if (action === "createInviteCode") { const code = Math.random().toString(36).substring(2,10).toUpperCase(); const invite = await prisma.inviteCode.create({ data: { code } }); return NextResponse.json({ invite }); }
  if (action === "deleteInviteCode") { await prisma.inviteCode.delete({ where: { id: body.id } }); return NextResponse.json({ ok: true }); }
  if (action === "approveRace") { await prisma.majorRace.update({ where: { id: body.raceId }, data: { status: "active" } }); return NextResponse.json({ ok: true }); }
  if (action === "rejectRace") { await prisma.majorRace.delete({ where: { id: body.raceId } }); return NextResponse.json({ ok: true }); }
  if (action === "deleteMessage") { await prisma.eventMessage.update({ where: { id: body.messageId }, data: { isDeleted: true, deletedBy: "admin" } }); return NextResponse.json({ ok: true }); }

  if (action === "setUserPassword") {
    const { userId, newPassword } = body;
    if (!userId || !newPassword) return NextResponse.json({ error: "Missing userId or newPassword" }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return NextResponse.json({ ok: true });
  }

  if (action === "sendUserReset") {
    const { userId, email } = body;
    if (!userId || !email) return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await prisma.passwordResetToken.deleteMany({ where: { userId, used: false } });
    const { randomBytes } = await import("crypto");
    const rawToken = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({ data: { token: rawToken, userId, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    const baseUrl = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
      ? process.env.NEXTAUTH_URL
      : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Train2Race <onboarding@resend.dev>",
      to: email,
      subject: "Reset your Train2Race password",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b0d10;color:#ede9e2;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:600;margin-bottom:8px;">Password reset requested</h1>
        <p style="color:#9aa3ab;margin-bottom:24px;">An admin has sent you a password reset link. Click below to set a new password. This link expires in 24 hours.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#5ec9b5;color:#0b0d10;border-radius:999px;font-weight:600;text-decoration:none;font-size:14px;">Set new password</a>
        <p style="color:#9aa3ab;font-size:12px;margin-top:24px;">Or copy this link: ${resetUrl}</p>
      </div>`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteUser") {
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}