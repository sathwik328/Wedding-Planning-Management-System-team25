import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, verifyPasswordAsync } from "../src/utils/password.js";

describe("Phase 4: Password Hashing & Asynchronous Verification", () => {
  it("generates a salted scrypt hash", () => {
    const raw = "RoyalKnot#2026";
    const hash = hashPassword(raw);

    expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(hash).not.toContain(raw);
  });

  it("produces distinct hashes for the same password due to random salt", () => {
    const raw = "RoyalKnot#2026";
    const hash1 = hashPassword(raw);
    const hash2 = hashPassword(raw);

    expect(hash1).not.toBe(hash2);
    expect(verifyPassword(raw, hash1)).toBe(true);
    expect(verifyPassword(raw, hash2)).toBe(true);
  });

  it("verifies correct password and rejects incorrect password synchronously", () => {
    const raw = "JaipurPalace#Pass";
    const hash = hashPassword(raw);

    expect(verifyPassword(raw, hash)).toBe(true);
    expect(verifyPassword("WrongPassword", hash)).toBe(false);
    expect(verifyPassword("", hash)).toBe(false);
    expect(verifyPassword(raw, "invalid:format")).toBe(false);
  });

  it("asynchronously verifies password with full parity to synchronous scrypt", async () => {
    const raw = "UdaipurLakePalace#99";
    const hash = hashPassword(raw);

    const isValid = await verifyPasswordAsync(raw, hash);
    const isInvalid = await verifyPasswordAsync("WrongPassword", hash);

    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  it("safely rejects empty and malformed hashes without throwing", async () => {
    expect(await verifyPasswordAsync("ValidPass123", "")).toBe(false);
    expect(await verifyPasswordAsync("ValidPass123", "not-a-hash")).toBe(false);
    expect(await verifyPasswordAsync("ValidPass123", "scrypt:only-two-parts")).toBe(false);
    expect(await verifyPasswordAsync("ValidPass123", "scrypt:bad_salt:bad_hash")).toBe(false);
    expect(verifyPassword("ValidPass123", "")).toBe(false);
    expect(verifyPassword("ValidPass123", "not-scrypt-hash")).toBe(false);
  });

  it("rejects passwords shorter than 6 characters", () => {
    expect(() => hashPassword("123")).toThrow("Password must be at least 6 characters long.");
  });
});
