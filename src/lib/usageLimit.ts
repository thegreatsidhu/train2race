import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fixed-window usage limiter for user-facing endpoints (chat, signup, login, AI calls), stored in
// the same Postgres table as the admin limiter so it's shared across all serverless instances.
// Keys are prefixed "rl:" so they never collide with the admin limiter's "admin:" keys.
// The whole check-and-increment is one SQL statement, so parallel requests can't slip past the
// limit the way a read-then-write would allow. Rows untouched for 2 days are pruned nightly.

/** Counts one use of `key`. Returns true if still within `max` uses per `windowMs`. */
export async function consumeLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "admin_auth_attempts" ("key", "count", "windowStart", "strikes", "updatedAt")
      VALUES (${"rl:" + key}, 1, NOW(), 0, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "admin_auth_attempts"."windowStart" < NOW() - (${windowMs}::int * INTERVAL '1 millisecond') THEN 1 ELSE "admin_auth_attempts"."count" + 1 END,
        "windowStart" = CASE WHEN "admin_auth_attempts"."windowStart" < NOW() - (${windowMs}::int * INTERVAL '1 millisecond') THEN NOW() ELSE "admin_auth_attempts"."windowStart" END,
        "updatedAt" = NOW()
      RETURNING "count"`;
    return Number(rows[0]?.count ?? 0) <= max;
  } catch (err) {
    // Fail open on a DB hiccup — matches src/lib/rateLimit.ts; if the DB is down the request
    // itself will fail anyway.
    console.error("usage limit check failed:", err);
    return true;
  }
}

export function clientIp(req: Request): string {
  // On Vercel, x-forwarded-for's first entry is the real client IP (set by Vercel's edge).
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function tooManyRequests(message = "You're doing that too often. Please wait a moment and try again.") {
  return NextResponse.json({ error: message }, { status: 429 });
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Chat-type posts (team chat, DMs, race/community chat, comments): 20/minute and 300/day per user. */
export async function chatLimitResponse(userId: string): Promise<NextResponse | null> {
  if (!(await consumeLimit(`chat:min:${userId}`, 20, MINUTE))) return tooManyRequests("You're sending messages too quickly. Please slow down.");
  if (!(await consumeLimit(`chat:day:${userId}`, 300, DAY))) return tooManyRequests("You've reached today's message limit. Try again tomorrow.");
  return null;
}

/**
 * Guards a call that will hit the Anthropic API. Two layers:
 *  - per user, per feature (`perUserPerDay`), so one account can't run up the bill
 *  - a global daily ceiling across the whole app (AI_DAILY_CALL_LIMIT, default 3000) as a
 *    backstop against runaway spend. Also set a monthly spend limit in the Anthropic console.
 * Call it only on the path that actually calls the model (after any cache hit has returned).
 */
export async function aiLimitResponse(userId: string, feature: string, perUserPerDay: number): Promise<NextResponse | null> {
  if (!(await consumeLimit(`ai:${feature}:${userId}`, perUserPerDay, DAY))) {
    return tooManyRequests("You've hit today's limit for this AI feature. Please try again tomorrow.");
  }
  const globalMax = Number(process.env.AI_DAILY_CALL_LIMIT) || 3000;
  if (!(await consumeLimit(`ai:global:${new Date().toISOString().slice(0, 10)}`, globalMax, DAY))) {
    console.error("AI global daily call limit reached");
    return tooManyRequests("Our AI coach is taking a breather — please try again later.");
  }
  return null;
}
