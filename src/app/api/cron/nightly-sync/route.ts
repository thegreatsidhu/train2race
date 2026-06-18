import { NextRequest, NextResponse } from "next/server";
import { syncAllConnections } from "@/lib/sync/engine";
import { generateAdviceForAllUsers } from "@/lib/ai/advice";

// This is the "agentic" core of the app: every night, with no human in
// the loop, it pulls fresh data from every connected wearable and
// generates a fresh advice card per user. Configured in vercel.json to
// run on a schedule; protected by CRON_SECRET so it can't be triggered
// by random requests.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const syncResult = await syncAllConnections();
  const adviceResult = await generateAdviceForAllUsers();

  return NextResponse.json({
    ok: true,
    sync: syncResult,
    advice: adviceResult,
    ranAt: new Date().toISOString(),
  });
}
