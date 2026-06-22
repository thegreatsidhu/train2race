// @ts-nocheck
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { password, action } = body;

  if (password !== "train2race2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (action === "getData") {
    return NextResponse.json({ users: [], inviteCodes: [], activityCount: 0, raceCount: 0, pendingRaces: [], recentMessages: [] });
  }

  return NextResponse.json({ ok: true });
}