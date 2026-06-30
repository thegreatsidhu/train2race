// @ts-nocheck
import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

const KEYS = ["emailWeeklySummaryEnabled", "emailWeeklySummaryDay"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password") || undefined;
  if (!await isAdminAuthorized(password)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.setting.findMany({ where: { key: { in: KEYS } } });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

  return NextResponse.json({
    weeklySummaryEnabled: map.emailWeeklySummaryEnabled === "true",
    weeklySummaryDay: map.emailWeeklySummaryDay ?? "1",
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { password, weeklySummaryEnabled, weeklySummaryDay } = body;
  if (!await isAdminAuthorized(password)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await Promise.all([
    prisma.setting.upsert({
      where: { key: "emailWeeklySummaryEnabled" },
      update: { value: weeklySummaryEnabled ? "true" : "false" },
      create: { key: "emailWeeklySummaryEnabled", value: weeklySummaryEnabled ? "true" : "false" },
    }),
    prisma.setting.upsert({
      where: { key: "emailWeeklySummaryDay" },
      update: { value: String(weeklySummaryDay ?? "1") },
      create: { key: "emailWeeklySummaryDay", value: String(weeklySummaryDay ?? "1") },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
