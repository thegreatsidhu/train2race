// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const user = await (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true, email: true, weightKg: true, heightCm: true, dateOfBirth: true, sex: true, city: true, isPrivate: true, timezone: true, bio: true, passwordHash: true } });
  return NextResponse.json({ user: { ...user, hasPassword: !!user?.passwordHash, passwordHash: undefined } });
}
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { name, weightKg, heightCm, dateOfBirth, sex, city, isPrivate, timezone, bio } = body;
  const data: any = {};
  if ("name" in body)        data.name = name ? String(name).trim().slice(0, 100) || null : null;
  if ("weightKg" in body) {
    const w = weightKg != null ? Number(weightKg) : null;
    if (w != null && (isNaN(w) || w < 10 || w > 500)) return NextResponse.json({ error: "Weight must be between 10 and 500 kg" }, { status: 400 });
    data.weightKg = w;
  }
  if ("heightCm" in body) {
    const h = heightCm != null ? Number(heightCm) : null;
    if (h != null && (isNaN(h) || h < 50 || h > 300)) return NextResponse.json({ error: "Height must be between 50 and 300 cm" }, { status: 400 });
    data.heightCm = h;
  }
  if ("dateOfBirth" in body) {
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (isNaN(age) || age < 10 || age > 120) return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
      data.dateOfBirth = dob;
    } else {
      data.dateOfBirth = null;
    }
  }
  if ("sex" in body)         data.sex = sex || null;
  if ("city" in body)        data.city = city || null;
  if ("isPrivate" in body)   data.isPrivate = isPrivate ?? false;
  if ("timezone" in body)    data.timezone = timezone || null;
  if ("bio" in body)         data.bio = bio ? String(bio).trim().slice(0, 160) : null;
  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });
  try {
    await prisma.user.update({ where: { id: userId }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Profile update error:", e);
    return NextResponse.json({ error: e.message || "Failed to save" }, { status: 500 });
  }
}
