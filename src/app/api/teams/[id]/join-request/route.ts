// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { isPrivate: true } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.isPrivate) return NextResponse.json({ error: "This team is private" }, { status: 403 });

  const existingMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (existingMember) return NextResponse.json({ alreadyMember: true });

  const existing = await prisma.teamJoinRequest.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (existing?.status === "pending") return NextResponse.json({ ok: true, alreadyRequested: true });

  await prisma.teamJoinRequest.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId, status: "pending" },
    update: { status: "pending" },
  });
  return NextResponse.json({ ok: true });
}

// GET — list pending join requests (captain/admin only)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member || member.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const requests = await prisma.teamJoinRequest.findMany({
    where: { teamId, status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ requests });
}

// PATCH — approve/reject one or all pending requests
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member || member.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { requestId, action, bulk } = await req.json();
  if (!["approve", "reject"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  if (bulk) {
    const pending = await prisma.teamJoinRequest.findMany({ where: { teamId, status: "pending" } });
    if (action === "approve") {
      await prisma.$transaction([
        ...pending.map(r => prisma.teamMember.upsert({
          where: { teamId_userId: { teamId, userId: r.userId } },
          create: { teamId, userId: r.userId, role: "member" },
          update: {},
        })),
        prisma.teamJoinRequest.updateMany({ where: { teamId, status: "pending" }, data: { status: "approved" } }),
      ]);
    } else {
      await prisma.teamJoinRequest.updateMany({ where: { teamId, status: "pending" }, data: { status: "rejected" } });
    }
    return NextResponse.json({ ok: true, count: pending.length });
  }

  if (!requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 });
  const request = await prisma.teamJoinRequest.findUnique({ where: { id: requestId } });
  if (!request || request.teamId !== teamId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    await prisma.$transaction([
      prisma.teamMember.upsert({
        where: { teamId_userId: { teamId, userId: request.userId } },
        create: { teamId, userId: request.userId, role: "member" },
        update: {},
      }),
      prisma.teamJoinRequest.update({ where: { id: requestId }, data: { status: "approved" } }),
    ]);
  } else {
    await prisma.teamJoinRequest.update({ where: { id: requestId }, data: { status: "rejected" } });
  }
  return NextResponse.json({ ok: true });
}
