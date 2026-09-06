import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mintRememberToken } from "@/lib/rememberToken";

// Mints a fresh remember-me token for the currently-authenticated user, to be stored in
// localStorage client-side. Requires a real session already — this endpoint doesn't establish
// one, it just issues the token that can silently re-establish one later via NextAuth's
// Credentials provider (see the rememberToken branch in src/lib/auth.ts).
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const token = await mintRememberToken(userId);
  return NextResponse.json({ token });
}
