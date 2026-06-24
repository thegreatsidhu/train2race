// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { DataSource } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const userId = (session.user as { id: string }).id;

  if (!(upperSource in DataSource)) {
    return NextResponse.redirect(new URL("/dashboard/connections?error=unsupported_source", req.url));
  }

  try {
    await prisma.deviceConnection.deleteMany({
      where: { userId, source: upperSource as DataSource },
    });
  } catch (err) {
    console.error("Disconnect error:", err);
    return NextResponse.redirect(new URL("/dashboard/connections?error=disconnect_failed", req.url));
  }

  return NextResponse.redirect(new URL(`/dashboard/connections?disconnected=${source}`, req.url));
}
