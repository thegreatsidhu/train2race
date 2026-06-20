// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, weightKg: true, heightCm: true, dateOfBirth: true, sex: true, timezone: true, passwordHash: true } });
  return NextResponse.json({ user: { ...user, hasPassword: !!user?.passwordHash, passwordHash: undefined } });
}
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { name, weightKg, heightCm, dateOfBirth, sex, timezone } = await req.json();
  const user = await prisma.user.update({ where: { id: userId }, data: { name: name||null, weightKg: weightKg??null, heightCm: heightCm??null, dateOfBirth: dateOfBirth?new Date(dateOfBirth):null, sex: sex||null, timezone: timezone||null }, select: { name: true, weightKg: true, heightCm: true, dateOfBirth: true, sex: true, timezone: true } });
  return NextResponse.json({ user });
}
