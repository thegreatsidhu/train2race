// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { name, raceDate, distanceM, city, country, website, isTriathlon, series } = await req.json();
  if (!name || !raceDate || !distanceM || !city || !country) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  const date = new Date(raceDate);
  const sevenDays = 7*24*60*60*1000;
  const duplicate = await prisma.majorRace.findFirst({
    where: { OR: [
      { name: { equals: name, mode: "insensitive" }, raceDate: { gte: new Date(date.getTime()-sevenDays), lte: new Date(date.getTime()+sevenDays) } },
      { city: { equals: city, mode: "insensitive" }, raceDate: { gte: new Date(date.getTime()-sevenDays), lte: new Date(date.getTime()+sevenDays) }, distanceM: { gte: distanceM*0.9, lte: distanceM*1.1 } },
    ]},
  });
  if (duplicate) return NextResponse.json({ duplicate: true, race: duplicate, message: "This race already exists!" });
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${date.getFullYear()}-${Date.now()}`;
  const race = await prisma.majorRace.create({ data: { name, slug, city, country, raceDate: date, distanceM, isTriathlon: isTriathlon||false, series: series||null, website: website||null, status: "pending", submittedBy: userId } });
  return NextResponse.json({ race, pending: true });
}
