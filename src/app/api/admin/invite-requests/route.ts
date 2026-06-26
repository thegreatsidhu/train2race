// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";

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
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await prisma.inviteCode.create({ data: { code, note: `For invite request ${id}` } });
    await prisma.inviteRequest.update({ where: { id }, data: { status: "sent" } });
    return NextResponse.json({ ok: true, code });
  }

  if (action === "decline") {
    await prisma.inviteRequest.update({ where: { id }, data: { status: "declined" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
