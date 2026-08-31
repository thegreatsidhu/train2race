// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { deleteFromR2 } from "@/lib/r2";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teams = await prisma.team.findMany({
    where: { logoStatus: "pending" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, isCommunity: true, isPrivate: true, logoUrl: true, logoStatus: true, _count: { select: { members: true } } },
  });
  return NextResponse.json({ teams });
}

export async function PATCH(req: NextRequest) {
  const { password, teamId, action } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { logoUrl: true, logoStatus: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    await prisma.team.update({ where: { id: teamId }, data: { logoStatus: "approved" } });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    await prisma.team.update({ where: { id: teamId }, data: { logoUrl: null, logoStatus: "rejected" } });
    if (team.logoUrl) deleteFromR2(team.logoUrl).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
