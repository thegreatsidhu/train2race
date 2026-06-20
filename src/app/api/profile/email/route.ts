// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { email } = await req.json();
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  await prisma.user.update({ where: { id: userId }, data: { email } });
  return NextResponse.json({ ok: true });
}
