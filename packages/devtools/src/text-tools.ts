import { ValidationError } from "@devpulse/core";

export function base64Encode(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64");
}

export function base64Decode(input: string): string {
  try {
    const buf = Buffer.from(input.trim(), "base64");
    return buf.toString("utf-8");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ValidationError(`Failed to decode Base64 string: ${msg}`);
  }
}

export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

export function urlDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ValidationError(`Failed to decode URL string: ${msg}`);
  }
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function unescapeHtml(input: string): string {
  const map: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
    "&apos;": "'",
  };
  return input.replace(/&(?:amp|lt|gt|quot|#039|apos);/g, (match) => map[match] || match);
}

export function formatMarkdown(input: string): {
  formatted: string;
  wordCount: number;
  charCount: number;
} {
  const trimmed = input.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  return {
    formatted: trimmed,
    wordCount,
    charCount: trimmed.length,
  };
}
