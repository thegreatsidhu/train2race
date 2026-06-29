import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

function isAdmin(email: string | null | undefined) {
  return email && ADMIN_EMAIL && email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const note = body.note ?? null;
  const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
  const code = `T2R-${raw.slice(0, 4)}`;
  const invite = await prisma.inviteCode.create({
    data: {
      code,
      note,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return NextResponse.json({ invite });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  await prisma.inviteCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}