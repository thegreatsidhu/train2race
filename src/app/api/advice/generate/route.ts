import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAndSaveDailyAdvice } from "@/lib/ai/advice";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  await generateAndSaveDailyAdvice(userId);

  return NextResponse.json({ ok: true });
}
