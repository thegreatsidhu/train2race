// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "train2race2024";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("password") !== ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pending = await prisma.majorRace.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ pending });
}
export async function POST(req: NextRequest) {
  const { password, raceId, action } = await req.json();
  if (password !== ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.majorRace.update({ where: { id: raceId }, data: { status: action === "approve" ? "active" : "rejected" } });
  return NextResponse.json({ ok: true });
}
