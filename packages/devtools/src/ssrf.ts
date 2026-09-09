import * as dns from "node:dns/promises";
import * as net from "node:net";
import { SecurityError } from "@devpulse/core";

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map((x) => Number.parseInt(x, 10));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
      return true;
    }

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 10.0.0.0/8 (Private network)
    if (parts[0] === 10) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 172.16.0.0/12 (Private network)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private network)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 100.64.0.0/10 (Carrier grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

    // Broadcast
    if (ip === "255.255.255.255") return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // Loopback
    if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") {
      return true;
    }
    // Unspecified
    if (normalized === "::" || normalized === "0000:0000:0000:0000:0000:0000:0000:0000") {
      return true;
    }
    // Unique local address (fc00::/7)
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
      return true;
    }
    // Link-local unicast (fe80::/10)
    if (
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    ) {
      return true;
    }
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (normalized.includes("::ffff:")) {
      const v4Part = normalized.split("::ffff:")[1];
      if (v4Part && net.isIPv4(v4Part)) {
        return isPrivateIp(v4Part);
      }
    }
    return false;
  }

  return true;
}

export async function validateSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(
      rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`,
    );
  } catch {
    throw new SecurityError("Invalid URL provided.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SecurityError(
      `Unsupported URL protocol: ${parsed.protocol}. Only http and https are permitted.`,
    );
  }

  const hostname = parsed.hostname;

  // Check forbidden hosts
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal"
  ) {
    throw new SecurityError(`Access to '${hostname}' is blocked for security reasons.`);
  }

  // If hostname is raw IP
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new SecurityError(`Access to private IP range '${hostname}' is forbidden.`);
    }
    return parsed;
  }

  // Resolve hostname through DNS
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        throw new SecurityError(
          `Domain '${hostname}' resolves to private/internal IP address (${record.address}). Access forbidden.`,
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof SecurityError) throw err;
    throw new SecurityError(
      `Could not resolve hostname '${hostname}': ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return parsed;
}
