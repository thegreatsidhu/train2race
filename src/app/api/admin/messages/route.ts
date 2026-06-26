// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password") || "";
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [messages, announcements] = await Promise.all([
      prisma.adminMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { toUser: { select: { id: true, name: true, email: true } } },
      }),
      prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return NextResponse.json({ messages, announcements });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, action, toUserId, content, title, scheduledFor, expiresAt } = body;
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (action === "dm") {
      if (!toUserId || !content?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      const msg = await prisma.adminMessage.create({ data: { toUserId, content: content.trim() } });
      return NextResponse.json({ message: msg });
    }

    if (action === "announce") {
      if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
      const ann = await prisma.announcement.create({
        data: {
          title: title?.trim() || null,
          content: content.trim(),
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
      return NextResponse.json({ announcement: ann });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { password, id, type } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (type === "dm") await prisma.adminMessage.delete({ where: { id } });
    else if (type === "announce") await prisma.announcement.delete({ where: { id } });
    else return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
