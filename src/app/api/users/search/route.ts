// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requesterId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ users: [] });

  try {
    const users = await (prisma as any).user.findMany({
      where: {
        AND: [
          { name: { contains: q, mode: "insensitive" } },
          { id: { not: requesterId } },
          { OR: [{ isPrivate: false }, { isPrivate: null }] },
        ],
      },
      select: { id: true, name: true, city: true, sex: true },
      take: 10,
    });
    return NextResponse.json({ users });
  } catch {
    // Fallback if isPrivate column not yet in DB
    const users = await prisma.user.findMany({
      where: { AND: [{ name: { contains: q, mode: "insensitive" } }, { id: { not: requesterId } }] },
      select: { id: true, name: true },
      take: 10,
    });
    return NextResponse.json({ users });
  }
}
