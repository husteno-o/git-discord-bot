import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { config } from "@devpulse/config";

const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT || "devpulse-secure-credential-salt-v1";

let _derivedKey: Buffer | null = null;

function getDerivedKey(): Buffer {
  if (_derivedKey) return _derivedKey;
  if (!config.ENCRYPTION_KEY) {
    throw new Error(
      "Failed to initialize encryption: ENCRYPTION_KEY must be set in environment variables. Generate one with: openssl rand -hex 32",
    );
  }
  _derivedKey = scryptSync(config.ENCRYPTION_KEY, ENCRYPTION_SALT, 32);
  return _derivedKey;
}

export function encryptSecret(plainText: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptSecret(encryptedPayload: string): string {
  const key = getDerivedKey();
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Failed to decrypt data: invalid encrypted payload format");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
