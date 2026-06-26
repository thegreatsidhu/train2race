// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { isAdminAuthorized } from "@/lib/adminAuth";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ tickets });
}

export async function PATCH(req: NextRequest) {
  const { password, ticketId, status, adminNote } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ticketId) return NextResponse.json({ error: "ticketId required" }, { status: 400 });

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      ...(status ? { status } : {}),
      ...(adminNote !== undefined ? { adminNote } : {}),
    },
    include: { user: { select: { name: true, email: true } } },
  });

  if (status && ticket.user?.email) {
    const statusLabel: Record<string, string> = {
      open: "Open",
      in_progress: "In Progress",
      resolved: "Resolved",
      closed: "Closed",
    };
    const label = statusLabel[status] ?? status;
    const noteHtml = ticket.adminNote
      ? `<div style="margin-top:20px;padding:16px;background:#1a1d22;border-radius:8px;border-left:3px solid #5ec9b5;">
           <p style="color:#9aa3ab;font-size:12px;margin:0 0 6px;">Note from our team</p>
           <p style="color:#ede9e2;margin:0;">${ticket.adminNote}</p>
         </div>`
      : "";

    await resend.emails.send({
      from: "Train2Race Support <support@train2race.com>",
      to: ticket.user.email,
      subject: `Your support ticket has been updated — ${ticket.subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b0d10;color:#ede9e2;border-radius:12px;">
          <h1 style="font-size:22px;font-weight:600;margin:0 0 8px;">Ticket status updated</h1>
          <p style="color:#9aa3ab;margin:0 0 24px;">Hi ${ticket.user.name ?? "there"}, your support ticket status has changed.</p>
          <div style="padding:16px;background:#1a1d22;border-radius:8px;margin-bottom:20px;">
            <p style="color:#9aa3ab;font-size:12px;margin:0 0 4px;">Subject</p>
            <p style="color:#ede9e2;font-weight:600;margin:0;">${ticket.subject}</p>
          </div>
          <div style="padding:16px;background:#1a1d22;border-radius:8px;margin-bottom:20px;">
            <p style="color:#9aa3ab;font-size:12px;margin:0 0 4px;">New status</p>
            <p style="color:#5ec9b5;font-weight:600;margin:0;">${label}</p>
          </div>
          ${noteHtml}
          <p style="color:#9aa3ab;font-size:12px;margin-top:28px;">You can view your ticket on the <a href="https://train2race.com/dashboard/support" style="color:#5ec9b5;">Help &amp; Support</a> page.</p>
        </div>
      `,
    }).catch(err => console.error("Resend ticket email error:", err));
  }

  return NextResponse.json({ ticket });
}
