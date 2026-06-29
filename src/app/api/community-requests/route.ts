// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const requests = await prisma.communityRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { name, description, message } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Community name required" }, { status: 400 });

  // Limit: one pending request at a time per user
  const existing = await prisma.communityRequest.findFirst({ where: { userId, status: "pending" } });
  if (existing) return NextResponse.json({ error: "You already have a pending community request." }, { status: 409 });

  const request = await prisma.communityRequest.create({
    data: { userId, name: name.trim(), description: description?.trim() || null, message: message?.trim() || null },
  });
  return NextResponse.json({ request }, { status: 201 });
}
