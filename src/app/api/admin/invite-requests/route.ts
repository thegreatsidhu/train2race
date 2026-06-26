// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendInviteEmail(name: string, email: string, code: string) {
  const signupUrl = `https://train2race.com/signup?invite=${code}`;
  await resend.emails.send({
    from: "Train2Race <onboarding@resend.dev>",
    to: email,
    subject: "Your Train2Race invite code",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b0d10; color: #ede9e2; border-radius: 12px;">
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">You're invited to Train2Race</h1>
        <p style="color: #9aa3ab; margin-bottom: 24px;">Hi ${name}, your invite code is ready. Use the button below to create your account.</p>
        <div style="background: #1a1d22; border: 1px solid #2e3440; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="color: #9aa3ab; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">Your invite code</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.15em; color: #5ec9b5; margin: 0;">${code}</p>
        </div>
        <a href="${signupUrl}" style="display: inline-block; padding: 12px 24px; background: #5ec9b5; color: #0b0d10; border-radius: 999px; font-weight: 600; text-decoration: none; font-size: 14px;">
          Create your account
        </a>
        <p style="color: #9aa3ab; font-size: 12px; margin-top: 24px;">Or sign up at train2race.com/signup and enter the code above.</p>
      </div>
    `,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password") || "";
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.inviteRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ requests });
}

export async function PATCH(req: NextRequest) {
  const { password, id, action } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action === "fulfill") {
    const request = await prisma.inviteRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await prisma.inviteCode.create({ data: { code, note: `For invite request ${id}` } });
    await prisma.inviteRequest.update({ where: { id }, data: { status: "sent", inviteCode: code } });

    await sendInviteEmail(request.name, request.email, code);
    return NextResponse.json({ ok: true, code });
  }

  if (action === "resend") {
    const request = await prisma.inviteRequest.findUnique({ where: { id } });
    if (!request || !request.inviteCode) return NextResponse.json({ error: "No code to resend" }, { status: 400 });
    await sendInviteEmail(request.name, request.email, request.inviteCode);
    return NextResponse.json({ ok: true, code: request.inviteCode });
  }

  if (action === "decline") {
    await prisma.inviteRequest.update({ where: { id }, data: { status: "declined" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { password, id } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.inviteRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
