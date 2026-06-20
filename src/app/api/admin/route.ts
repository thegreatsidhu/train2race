// @ts-nocheck
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ADMIN_PASSWORD = "train2race2024";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const password = searchParams.get("password");
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        connections: { select: { source: true, status: true } },
        _count: { select: { activities: true, raceTargets: true } },
      },
    });
    const inviteCodes = await prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" } });
    const activityCount = await prisma.activity.count();
    const raceCount = await prisma.raceTarget.count();
    return NextResponse.json({ users, inviteCodes, activityCount, raceCount });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
