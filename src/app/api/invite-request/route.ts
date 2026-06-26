// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || "Train2Race <onboarding@resend.dev>";

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  if (!emailOk) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  await prisma.inviteRequest.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), message: message?.trim() || null },
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: email.trim(),
    subject: "We received your Train2Race request",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b0d10; color: #ede9e2; border-radius: 12px;">
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Request received</h1>
        <p style="color: #9aa3ab; margin-bottom: 16px;">Hi ${name.trim()}, thanks for your interest in Train2Race! We've received your request and will send your invite code to this email address shortly.</p>
        <p style="color: #9aa3ab; font-size: 13px;">If you have any questions, reply to this email.</p>
        <p style="color: #9aa3ab; font-size: 12px; margin-top: 24px; border-top: 1px solid #2e3440; padding-top: 16px;">Train2Race · team training for endurance athletes</p>
      </div>
    `,
  });
  if (error) console.error("Resend confirmation email error:", error);

  return NextResponse.json({ ok: true });
}
