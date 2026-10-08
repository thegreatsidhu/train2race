// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { autoApprovePendingRaces } from "@/lib/raceDuplicates";

// Runs nightly at midnight Eastern (see vercel.json): approves new races automatically and leaves
// likely duplicates pending for an admin. See src/lib/raceDuplicates.ts.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await autoApprovePendingRaces();
    console.log("race auto-approval:", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("race auto-approval failed:", e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
