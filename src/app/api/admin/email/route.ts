// @ts-nocheck
import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { groupEmailHtml } from "@/lib/email";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Train2Race <support@train2race.com>";

export async function POST(req: Request) {
  const body = await req.json();
  const { password, subject, message, target, teamId } = body;

  if (!await isAdminAuthorized(password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email not configured — RESEND_API_KEY is missing" }, { status: 503 });
  }

  let recipients: { email: string; name: string | null }[] = [];

  if (target === "team") {
    if (!teamId) return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      select: { user: { select: { email: true, name: true, emailOptOut: true } } },
    });
    recipients = members.filter(m => !m.user.emailOptOut).map(m => ({ email: m.user.email, name: m.user.name })).filter(r => r.email);
  } else {
    const users = await prisma.user.findMany({
      where: { role: { not: "test" }, emailOptOut: { not: true } },
      select: { email: true, name: true },
    });
    recipients = users.filter(u => u.email);
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients found" }, { status: 400 });
  }

  const html = groupEmailHtml({
    heading: subject.trim(),
    body: message.trim().replace(/\n/g, "<br>"),
  });

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      await resend.emails.send({ from: FROM, to: r.email, subject: subject.trim(), html });
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
}
