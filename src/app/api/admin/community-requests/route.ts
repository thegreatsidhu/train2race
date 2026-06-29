// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";

function makeInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.communityRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ requests });
}

export async function PATCH(req: NextRequest) {
  const { password, id, action } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const request = await prisma.communityRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    const team = await prisma.team.create({
      data: {
        name: request.name,
        description: request.description || null,
        inviteCode: makeInviteCode(),
        createdBy: request.userId,
        isPrivate: false,
        isCommunity: true,
        members: { create: { userId: request.userId, role: "admin" } },
      },
    });
    await prisma.communityRequest.update({ where: { id }, data: { status: "approved", teamId: team.id } });
    return NextResponse.json({ ok: true, teamId: team.id });
  }

  if (action === "reject") {
    await prisma.communityRequest.update({ where: { id }, data: { status: "rejected" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { password, id } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.communityRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
