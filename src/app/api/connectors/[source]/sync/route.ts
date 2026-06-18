import { NextRequest, NextResponse } from "next/server";
import { DataSource } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncConnection } from "@/lib/sync/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { source } = await params;
  const upperSource = source.toUpperCase();
  if (!(upperSource in DataSource) || upperSource === "APPLE_HEALTH") {
    return NextResponse.json({ error: "Unsupported source" }, { status: 400 });
  }

  const connection = await prisma.deviceConnection.findUnique({
    where: { userId_source: { userId, source: upperSource as DataSource } },
  });
  if (!connection) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  const result = await syncConnection(connection.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
