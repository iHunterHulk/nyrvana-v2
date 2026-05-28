import { describe, it, expect } from "vitest";
import { encrypt, decrypt, hashPassword, verifyPassword } from "./crypto";

describe("crypto", () => {
  const masterKeyHex = "000102030405060708090a0b0c0d0e0f000102030405060708090a0b0c0d0e0f"; // 32 bytes
  const plaintext = "test message";

  it("should encrypt and decrypt correctly", () => {
    const encrypted = encrypt(plaintext, masterKeyHex);
    const decrypted = decrypt(encrypted, masterKeyHex);
    expect(decrypted).toBe(plaintext);
  });

  it("should reject tampered authTag", () => {
    const encrypted = encrypt(plaintext, masterKeyHex);
    encrypted.authTag[0] ^= 1; // Tamper with authTag
    expect(() => decrypt(encrypted, masterKeyHex)).toThrow();
  });

  it("should hash and verify password", async () => {
    const password = "test password";
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });
});