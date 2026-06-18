import { NextRequest, NextResponse } from "next/server";

// Stands in for Garmin's real consent screen while GARMIN_MOCK_MODE=true.
// Immediately "approves" and redirects to the real callback URL shape,
// so swapping to real Garmin credentials later requires no code changes
// anywhere else — only flipping the env var and filling in real client
// id/secret.

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const callbackUrl = new URL("/api/connectors/garmin/callback", req.url);
  callbackUrl.searchParams.set("code", "mock-authorization-code");
  callbackUrl.searchParams.set("state", state);
  return NextResponse.redirect(callbackUrl);
}
