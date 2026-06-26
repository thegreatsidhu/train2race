// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, isBanned: true } },
        },
        orderBy: { role: "asc" },
      },
    },
  });

  const result = teams.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    isPrivate: t.isPrivate,
    createdAt: t.createdAt,
    createdBy: t.createdBy,
    members: t.members.map(m => ({
      userId: m.userId,
      name: m.user.name || "No name",
      email: m.user.email,
      role: m.role,
      isBanned: m.user.isBanned,
      joinedAt: m.joinedAt,
    })),
  }));

  return NextResponse.json({ teams: result });
}

function makeInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, action, teamId, userId, role, name, description, email } = body;
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action === "removeMember") {
    await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
    return NextResponse.json({ ok: true });
  }
  if (action === "setRole") {
    await prisma.teamMember.update({ where: { teamId_userId: { teamId, userId } }, data: { role } });
    return NextResponse.json({ ok: true });
  }
  if (action === "banUser") {
    await prisma.user.update({ where: { id: userId }, data: { isBanned: true } });
    return NextResponse.json({ ok: true });
  }
  if (action === "unbanUser") {
    await prisma.user.update({ where: { id: userId }, data: { isBanned: false } });
    return NextResponse.json({ ok: true });
  }
  if (action === "editTeam") {
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
    await prisma.team.update({ where: { id: teamId }, data: { name: name.trim(), description: description || null } });
    return NextResponse.json({ ok: true });
  }
  if (action === "deleteTeam") {
    await prisma.team.delete({ where: { id: teamId } });
    return NextResponse.json({ ok: true });
  }
  if (action === "createTeam") {
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const team = await prisma.team.create({
      data: { name: name.trim(), description: description || null, inviteCode: makeInviteCode(), createdBy: "admin", isPrivate: true },
    });
    return NextResponse.json({ team: { id: team.id, name: team.name, description: team.description, isPrivate: team.isPrivate, createdAt: team.createdAt, members: [] } });
  }
  if (action === "addMember") {
    if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, name: true, email: true, isBanned: true } });
    if (!user) return NextResponse.json({ error: "No user with that email" }, { status: 404 });
    const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } });
    if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 });
    const member = await prisma.teamMember.create({ data: { teamId, userId: user.id, role: "member" } });
    return NextResponse.json({ member: { userId: user.id, name: user.name || "No name", email: user.email, role: member.role, isBanned: user.isBanned, joinedAt: member.joinedAt } });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
