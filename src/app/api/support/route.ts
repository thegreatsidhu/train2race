// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { subject, description, category, ticketImages } = await req.json();
  if (!subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Subject and description are required" }, { status: 400 });
  }

  const images = Array.isArray(ticketImages)
    ? ticketImages.filter((u: unknown) => typeof u === "string").slice(0, 3)
    : [];

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      subject: subject.trim(),
      description: description.trim(),
      category: category || "general",
      ticketImages: images,
    },
  });
  return NextResponse.json({ ticket }, { status: 201 });
}
