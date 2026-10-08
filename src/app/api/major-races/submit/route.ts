// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { findListedDuplicate } from "@/lib/raceDuplicates";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const submissions = await prisma.majorRace.findMany({
    where: { submittedBy: userId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ submissions });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { raceId, name, raceDate, distanceM, city, country, website, isTriathlon } = await req.json();
  const race = await prisma.majorRace.findUnique({ where: { id: raceId } });
  if (!race) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (race.submittedBy !== userId) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (race.status !== "pending") return NextResponse.json({ error: "Race already reviewed" }, { status: 400 });
  const updated = await prisma.majorRace.update({
    where: { id: raceId },
    data: { name, raceDate: new Date(raceDate), distanceM: Number(distanceM), city, country, website: website || null, isTriathlon: !!isTriathlon },
  });
  return NextResponse.json({ race: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { raceId } = await req.json();
  const race = await prisma.majorRace.findUnique({ where: { id: raceId } });
  if (!race) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (race.submittedBy !== userId) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (race.status !== "pending") return NextResponse.json({ error: "Race already reviewed" }, { status: 400 });
  await prisma.majorRace.delete({ where: { id: raceId } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { name, raceDate, distanceM, city, country, website, isTriathlon, series } = await req.json();
  if (!name || !raceDate || !distanceM || !city || !country) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  if (website && !/^https?:\/\//i.test(website)) return NextResponse.json({ error: "Website must start with http:// or https://" }, { status: 400 });
  const date = new Date(raceDate);
  // New races go live automatically at midnight. One that looks like a race already listed is
  // still saved, but held for an admin to review (the nightly job won't approve it).
  const duplicate = await findListedDuplicate({ name, city, raceDate: date, distanceM: Number(distanceM), isTriathlon: !!isTriathlon });
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${date.getFullYear()}-${Date.now()}`;
  const race = await prisma.majorRace.create({ data: { name, slug, city, country, raceDate: date, distanceM, isTriathlon: isTriathlon||false, series: series||null, website: website||null, status: "pending", submittedBy: userId } });
  if (duplicate) {
    return NextResponse.json({ race, pending: true, duplicate: true, existing: duplicate, message: `This looks like ${duplicate.name}, which is already listed. An admin will review your submission.` });
  }
  return NextResponse.json({ race, pending: true, message: "Thanks! Your race will be added tonight." });
}
