import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { DataSource } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getOAuthConnector } from "@/lib/connectors/registry";

// We encode userId + a random nonce into the OAuth `state` param so the
// callback route can verify the request wasn't forged (CSRF) and knows
// which user to attach the connection to.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { source } = await params;
  const upperSource = source.toUpperCase();
  if (!(upperSource in DataSource) || upperSource === "APPLE_HEALTH") {
    return NextResponse.json({ error: "Unsupported source" }, { status: 400 });
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const userId = (session.user as { id: string }).id;
  const state = Buffer.from(JSON.stringify({ userId, nonce })).toString("base64url");

  const connector = getOAuthConnector(upperSource as Exclude<DataSource, "APPLE_HEALTH">);
  const url = connector.getAuthorizationUrl(state);

  // Absolute path needed for mock-mode's relative redirect
  const target = url.startsWith("/") ? new URL(url, req.url) : url;

  const res = NextResponse.redirect(target);
  res.cookies.set(`oauth_state_${upperSource}`, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}
