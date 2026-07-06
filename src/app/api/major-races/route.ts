// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const upcoming = searchParams.get("upcoming") === "1";
  const city = searchParams.get("city") || "";
  const races = await prisma.majorRace.findMany({
    where: { status: "active", ...(upcoming ? { raceDate: { gte: new Date() } } : {}), ...(search ? { name: { contains: search, mode: "insensitive" } } : {}), ...(city ? { city: { contains: city, mode: "insensitive" } } : {}) },
    orderBy: { raceDate: "asc" },
    include: { _count: { select: { registrations: true } } },
  });
  return NextResponse.json({ races }, { headers: { "Cache-Control": "no-store" } });
}

