import crypto from "crypto";

/**
 * Hash a password using Node's native scrypt KDF with cryptographically random salt.
 * Produces format: scrypt:<salt_hex>:<derived_key_hex>
 */
export function hashPassword(password: string): string {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a candidate password against an scrypt hash using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || !storedHash.startsWith("scrypt:")) {
    return false;
  }
  const parts = storedHash.split(":");
  if (parts.length !== 3) {
    return false;
  }
  const [, salt, originalHash] = parts;
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const originalBuffer = Buffer.from(originalHash, "hex");
    if (originalBuffer.length !== derivedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(originalBuffer, derivedKey);
  } catch {
    return false;
  }
}
