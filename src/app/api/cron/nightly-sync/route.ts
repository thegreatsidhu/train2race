// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { syncAllConnections } from "@/lib/sync/engine";
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const syncResult = await syncAllConnections();
  return NextResponse.json({ ok: true, sync: syncResult, ranAt: new Date().toISOString() });
}
