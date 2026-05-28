import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export function encrypt(plaintext: string, masterKeyHex: string) {
  const masterKey = Buffer.from(masterKeyHex, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

export function decrypt(
  data: { ciphertext: Buffer; iv: Buffer; authTag: Buffer },
  masterKeyHex: string
): string {
  const masterKey = Buffer.from(masterKeyHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", masterKey, data.iv);
  decipher.setAuthTag(data.authTag);
  return Buffer.concat([decipher.update(data.ciphertext), decipher.final()]).toString("utf8");
}

export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, { algorithm: 'argon2id' });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}