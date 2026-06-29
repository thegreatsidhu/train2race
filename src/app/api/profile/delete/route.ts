// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => ({}));
  const { reason, otherText } = body;

  console.log(`[account-delete] userId=${userId} reason="${reason}"${otherText ? ` other="${otherText}"` : ""}`);

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
