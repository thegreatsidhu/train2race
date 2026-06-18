import { NextRequest, NextResponse } from "next/server";
import { DataSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getOAuthConnector } from "@/lib/connectors/registry";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params;
  const upperSource = source.toUpperCase();
  if (!(upperSource in DataSource) || upperSource === "APPLE_HEALTH") {
    return NextResponse.json({ error: "Unsupported source" }, { status: 400 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/connections?error=${encodeURIComponent(error)}`, req.url)
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/connections?error=missing_code", req.url));
  }

  // Verify state: decode it, check the nonce matches what we set in the cookie
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    const cookieNonce = req.cookies.get(`oauth_state_${upperSource}`)?.value;
    if (!cookieNonce || cookieNonce !== decoded.nonce) {
      throw new Error("State mismatch");
    }
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(new URL("/dashboard/connections?error=invalid_state", req.url));
  }

  const connector = getOAuthConnector(upperSource as Exclude<DataSource, "APPLE_HEALTH">);

  try {
    const tokens = await connector.exchangeCodeForTokens(code);

    await prisma.deviceConnection.upsert({
      where: { userId_source: { userId, source: upperSource as DataSource } },
      create: {
        userId,
        source: upperSource as DataSource,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        expiresAt: tokens.expiresAt,
        externalUserId: tokens.externalUserId,
        status: "active",
      },
      update: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        expiresAt: tokens.expiresAt,
        externalUserId: tokens.externalUserId,
        status: "active",
        lastError: null,
      },
    });

    const res = NextResponse.redirect(
      new URL(`/dashboard/connections?connected=${source}`, req.url)
    );
    res.cookies.delete(`oauth_state_${upperSource}`);
    return res;
  } catch (err) {
    console.error(`OAuth callback failed for ${upperSource}:`, err);
    return NextResponse.redirect(
      new URL(`/dashboard/connections?error=token_exchange_failed`, req.url)
    );
  }
}
