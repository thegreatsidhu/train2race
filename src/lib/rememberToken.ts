import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Mints a new remember-me token for a user. Returns the raw token — only ever exposed here, in plaintext, once. */
export async function mintRememberToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await prisma.rememberToken.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return raw;
}

/**
 * Validates and consumes (single-use) a remember-me token, returning the associated userId.
 * Returns null if the token is invalid, expired, or already used.
 */
export async function consumeRememberToken(raw: string): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const record = await prisma.rememberToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt < new Date()) return null;
  await prisma.rememberToken.delete({ where: { id: record.id } }).catch(() => {});
  return record.userId;
}
