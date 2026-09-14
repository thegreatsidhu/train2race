import { prisma } from "@/lib/prisma";

// Postgres-backed rate limiter for the admin panel — shared across Vercel's serverless
// instances/cold starts (an in-memory Map isn't), with an escalating lockout for repeat
// offenders: exceeding the limit doesn't just mean "wait out the window," each subsequent
// violation from the same key locks it out for longer, up to a 24h cap. A key's strike count
// decays back to 0 after 7 clean days so one bad day doesn't follow a legitimate admin forever.
const LOCKOUT_STAGES_MS = [
  30 * 60 * 1000,      // 1st violation: 30 min
  60 * 60 * 1000,      // 2nd: 1 hour
  4 * 60 * 60 * 1000,  // 3rd: 4 hours
  24 * 60 * 60 * 1000, // 4th+: 24 hours (cap)
];
const STRIKE_DECAY_MS = 7 * 24 * 60 * 60 * 1000;

export async function checkRateLimit(key: string, max = 10, windowMs = 15 * 60 * 1000): Promise<boolean> {
  const now = new Date();

  try {
    const record = await prisma.adminAuthAttempt.findUnique({ where: { key } });

    if (record?.lockedUntil && record.lockedUntil > now) {
      return false;
    }

    const strikesDecayed = record && now.getTime() - record.updatedAt.getTime() > STRIKE_DECAY_MS;
    const priorStrikes = strikesDecayed ? 0 : (record?.strikes ?? 0);

    const windowExpired = !record || now.getTime() - record.windowStart.getTime() > windowMs || (record.lockedUntil != null && record.lockedUntil <= now);
    const nextCount = windowExpired ? 1 : record.count + 1;
    const nextWindowStart = windowExpired ? now : record.windowStart;

    if (nextCount > max) {
      const strikes = priorStrikes + 1;
      const lockMs = LOCKOUT_STAGES_MS[Math.min(strikes - 1, LOCKOUT_STAGES_MS.length - 1)];
      await prisma.adminAuthAttempt.upsert({
        where: { key },
        create: { key, count: nextCount, windowStart: nextWindowStart, strikes, lockedUntil: new Date(now.getTime() + lockMs) },
        update: { count: nextCount, windowStart: nextWindowStart, strikes, lockedUntil: new Date(now.getTime() + lockMs) },
      });
      return false;
    }

    await prisma.adminAuthAttempt.upsert({
      where: { key },
      create: { key, count: nextCount, windowStart: nextWindowStart, strikes: priorStrikes },
      update: { count: nextCount, windowStart: nextWindowStart, strikes: priorStrikes, lockedUntil: null },
    });
    return true;
  } catch (err) {
    // Fail open on a DB hiccup rather than locking every admin out of the panel entirely.
    console.error("rate limit check failed:", err);
    return true;
  }
}

// Clears a key's attempt history entirely — call on a successful admin login so a few
// fat-fingered attempts beforehand don't linger toward the next lockout.
export async function clearRateLimit(key: string): Promise<void> {
  await prisma.adminAuthAttempt.delete({ where: { key } }).catch(() => {});
}
