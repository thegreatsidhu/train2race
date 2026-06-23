// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const user = await (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true, email: true, weightKg: true, heightCm: true, dateOfBirth: true, sex: true, city: true, isPrivate: true, timezone: true, passwordHash: true } });
  return NextResponse.json({ user: { ...user, hasPassword: !!user?.passwordHash, passwordHash: undefined } });
}
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { name, weightKg, heightCm, dateOfBirth, sex, city, isPrivate, timezone } = body;
  const data: any = {};
  if ("name" in body)             data.name = name || null;
  if ("weightKg" in body)         data.weightKg = weightKg ?? null;
  if ("heightCm" in body)         data.heightCm = heightCm ?? null;
  if ("dateOfBirth" in body)      data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  if ("sex" in body)              data.sex = sex || null;
  if ("city" in body)             data.city = city || null;
  if ("isPrivate" in body)        data.isPrivate = isPrivate ?? false;
  if ("timezone" in body)         data.timezone = timezone || null;
  const user = await (prisma as any).user.update({ where: { id: userId }, data, select: { name: true, weightKg: true, heightCm: true, dateOfBirth: true, sex: true, city: true, isPrivate: true, timezone: true } });
  return NextResponse.json({ user });
}
