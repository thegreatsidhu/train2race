// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { syncConnection } from "@/lib/sync/engine";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`admin-sync:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { password, connectionId } = await req.json();
  if (!(await isAdminAuthorized(password))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!connectionId) {
    return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
  }
  const result = await syncConnection(connectionId);
  return NextResponse.json(result);
}
