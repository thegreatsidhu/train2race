import crypto from "crypto";

// OAuth access/refresh tokens for Garmin/Whoop/Strava grant access to a
// real person's health data, so we never store them in plaintext.
// ENCRYPTION_KEY must be a 32-byte key, base64-encoded, in your env vars.
// Generate one with: openssl rand -base64 32

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it to .env"
    );
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return buf;
}

/** Encrypts a string, returning iv:authTag:ciphertext, all base64, colon-joined. */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

/** Reverses encrypt(). Throws if the payload was tampered with or the key is wrong. */
export function decrypt(payload: string): string {
  const [ivB64, authTagB64, ciphertextB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted payload.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
