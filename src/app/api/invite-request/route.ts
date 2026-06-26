// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  if (!emailOk) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  await prisma.inviteRequest.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), message: message?.trim() || null },
  });
  return NextResponse.json({ ok: true });
}
