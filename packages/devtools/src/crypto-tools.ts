import * as crypto from "node:crypto";
import { ValidationError } from "@devpulse/core";

export type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha512";

export function generateHash(input: string, algorithm: HashAlgorithm = "sha256"): string {
  const supported = ["md5", "sha1", "sha256", "sha512"];
  if (!supported.includes(algorithm.toLowerCase())) {
    throw new ValidationError(
      `Unsupported hash algorithm: ${algorithm}. Supported: ${supported.join(", ")}`,
    );
  }
  return crypto.createHash(algorithm).update(input).digest("hex");
}

export function generateUuid(version: "v4" | "v7" = "v4"): string {
  if (version === "v7") {
    // Generate UUID v7 (Unix timestamp in ms + random bits)
    const timestamp = Date.now();
    const buffer = Buffer.alloc(16);
    // 48-bit timestamp
    buffer.writeUIntBE(Math.floor(timestamp / 0x100000000), 0, 2);
    buffer.writeUIntBE(timestamp % 0x100000000, 2, 4);
    // Fill remaining with random bytes
    const random = crypto.randomBytes(10);
    random.copy(buffer, 6);
    // Version 7: set bits 4-7 of byte 6 to 0111
    buffer[6] = (buffer[6] & 0x0f) | 0x70;
    // Variant 1: set bits 6-7 of byte 8 to 10
    buffer[8] = (buffer[8] & 0x3f) | 0x80;

    const hex = buffer.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return crypto.randomUUID();
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  algorithm?: string;
  type?: string;
  issuer?: string;
  subject?: string;
  audience?: string | string[];
  issuedAt?: Date;
  expiresAt?: Date;
  isExpired?: boolean;
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new ValidationError(
      "Invalid JWT structure. A JWT must consist of 3 parts separated by dots.",
    );
  }

  const decodePart = (str: string) => {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  };

  try {
    const header = decodePart(parts[0]);
    const payload = decodePart(parts[1]);

    const res: DecodedJwt = {
      header,
      payload,
      algorithm: header.alg,
      type: header.typ,
      issuer: payload.iss,
      subject: payload.sub,
      audience: payload.aud,
    };

    if (payload.iat && typeof payload.iat === "number") {
      res.issuedAt = new Date(payload.iat * 1000);
    }
    if (payload.exp && typeof payload.exp === "number") {
      res.expiresAt = new Date(payload.exp * 1000);
      res.isExpired = Date.now() > res.expiresAt.getTime();
    }

    return res;
  } catch (err: unknown) {
    throw new ValidationError(
      `Failed to decode JWT: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
