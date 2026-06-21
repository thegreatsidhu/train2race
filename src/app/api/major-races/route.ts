// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const upcoming = searchParams.get("upcoming") === "1";
  const races = await prisma.majorRace.findMany({
    where: { ...(upcoming ? { raceDate: { gte: new Date() } } : {}), ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) },
    orderBy: { raceDate: "asc" },
    take: 50,
    include: { _count: { select: { registrations: true } } },
  });
  return NextResponse.json({ races });
}
