// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function verifyAdmin(password: string): Promise<boolean> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "adminPasswordHash" } });
    if (setting) return bcrypt.compare(password, setting.value);
  } catch {}
  return password === "train2race2024";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  if (!(await verifyAdmin(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ tickets });
}

export async function PATCH(req: NextRequest) {
  const { password, ticketId, status, adminNote } = await req.json();
  if (!(await verifyAdmin(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ticketId) return NextResponse.json({ error: "ticketId required" }, { status: 400 });

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      ...(status ? { status } : {}),
      ...(adminNote !== undefined ? { adminNote } : {}),
    },
  });
  return NextResponse.json({ ticket });
}
