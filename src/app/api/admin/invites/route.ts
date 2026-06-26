// @ts-nocheck
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const { password, count = 1 } = await req.json();
  if (!(await isAdminAuthorized(password))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const codes = [];
  for (let i = 0; i < Math.min(count, 20); i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invite = await prisma.inviteCode.create({ data: { code } });
    codes.push(invite);
  }
  return NextResponse.json({ codes });
}

export async function DELETE(req: Request) {
  const { password, id } = await req.json();
  if (!(await isAdminAuthorized(password))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.inviteCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
