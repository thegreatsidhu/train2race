// Simple in-memory rate limiter — good enough for single-process and light traffic.
// Not shared across Vercel serverless instances, but still blocks most brute-force attempts.
const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, max = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
