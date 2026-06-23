// @ts-nocheck
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return NextResponse.json({ ok: true });

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } });

  const { randomBytes } = await import("crypto");
  const rawToken = randomBytes(32).toString("hex");

  await prisma.passwordResetToken.create({
    data: {
      token: rawToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
    ? process.env.NEXTAUTH_URL
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  await resend.emails.send({
    from: "Train2Race <onboarding@resend.dev>",
    to: email,
    subject: "Reset your Train2Race password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b0d10; color: #ede9e2; border-radius: 12px;">
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Reset your password</h1>
        <p style="color: #9aa3ab; margin-bottom: 24px;">Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #5ec9b5; color: #0b0d10; border-radius: 999px; font-weight: 600; text-decoration: none; font-size: 14px;">
          Reset password
        </a>
        <p style="color: #9aa3ab; font-size: 12px; margin-top: 24px;">If you didn't request this, ignore this email.</p>
        <p style="color: #9aa3ab; font-size: 12px;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
