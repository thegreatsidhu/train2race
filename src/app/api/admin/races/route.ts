// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { discoverRacesFromRunSignup } from "@/lib/raceDiscovery";

function rateLimited(req: NextRequest): boolean {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  return !checkRateLimit(`admin:${ip}`, 10, 15 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const { searchParams } = new URL(req.url);
  if (!(await isAdminAuthorized(searchParams.get("password") || ""))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [pending, active] = await Promise.all([
    prisma.majorRace.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" } }),
    prisma.majorRace.findMany({ where: { status: "active" }, orderBy: { raceDate: "asc" } }),
  ]);
  return NextResponse.json({ pending, active });
}

export async function POST(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await req.json();
  const { password, raceId, action, name, city, country, raceDate, distanceM, website, isTriathlon } = body;
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action === "discover") {
    const result = await discoverRacesFromRunSignup();
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "create") {
    if (!name || !raceDate || !distanceM || !city || !country) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date(raceDate).getFullYear()}-${Date.now()}`;
    const race = await prisma.majorRace.create({
      data: { name, slug, city, country, raceDate: new Date(raceDate), distanceM: Number(distanceM), isTriathlon: !!isTriathlon, website: website || null, status: "active" },
    });
    return NextResponse.json({ race });
  }

  await prisma.majorRace.update({ where: { id: raceId }, data: { status: action === "approve" ? "active" : "rejected" } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const { password, raceId, name, city, country, raceDate, distanceM, website, isTriathlon } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (city !== undefined) data.city = city;
  if (country !== undefined) data.country = country;
  if (raceDate !== undefined) data.raceDate = new Date(raceDate);
  if (distanceM !== undefined) data.distanceM = Number(distanceM);
  if (website !== undefined) data.website = website || null;
  if (isTriathlon !== undefined) data.isTriathlon = isTriathlon;
  const race = await prisma.majorRace.update({ where: { id: raceId }, data });
  return NextResponse.json({ race });
}

export async function DELETE(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const { password, raceId } = await req.json();
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.majorRace.delete({ where: { id: raceId } });
  return NextResponse.json({ ok: true });
}
