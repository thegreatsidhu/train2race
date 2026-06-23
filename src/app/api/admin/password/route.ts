// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const FALLBACK_PASSWORD = "train2race2024";

async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: "adminPasswordHash" } });
    if (setting?.value) return bcrypt.compare(password, setting.value);
  } catch {}
  return password === FALLBACK_PASSWORD;
}

export async function POST(req: Request) {
  const { password, newPassword } = await req.json();
  if (!password || !newPassword) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const valid = await verifyAdminPassword(password);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

  const hash = await bcrypt.hash(newPassword, 12);
  await (prisma as any).setting.upsert({
    where: { key: "adminPasswordHash" },
    create: { key: "adminPasswordHash", value: hash },
    update: { value: hash },
  });

  return NextResponse.json({ ok: true });
}
