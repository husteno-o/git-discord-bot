import * as dns from "node:dns/promises";
import * as tls from "node:tls";
import { ValidationError } from "@devpulse/core";
import { validateSafeUrl } from "./ssrf.js";

export async function lookupDns(
  hostname: string,
  recordType: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" = "A",
): Promise<{ hostname: string; recordType: string; records: string[] }> {
  const cleanHost = hostname
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .trim();
  if (!cleanHost) throw new ValidationError("Invalid domain name.");

  try {
    let records: string[] = [];
    switch (recordType.toUpperCase()) {
      case "A": {
        const res = await dns.resolve4(cleanHost);
        records = res;
        break;
      }
      case "AAAA": {
        const res = await dns.resolve6(cleanHost);
        records = res;
        break;
      }
      case "CNAME": {
        const res = await dns.resolveCname(cleanHost);
        records = res;
        break;
      }
      case "MX": {
        const res = await dns.resolveMx(cleanHost);
        records = res.map((r) => `${r.priority} ${r.exchange}`);
        break;
      }
      case "TXT": {
        const res = await dns.resolveTxt(cleanHost);
        records = res.map((r) => r.join(" "));
        break;
      }
      case "NS": {
        const res = await dns.resolveNs(cleanHost);
        records = res;
        break;
      }
      default:
        throw new ValidationError(`Unsupported record type: ${recordType}`);
    }

    return { hostname: cleanHost, recordType, records };
  } catch (err: any) {
    throw new ValidationError(`DNS lookup failed for ${cleanHost} (${recordType}): ${err.message}`);
  }
}

export interface SslCertInfo {
  domain: string;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  isValid: boolean;
  subjectAltNames: string[];
}

export async function inspectSslCertificate(domain: string, port = 443): Promise<SslCertInfo> {
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .trim();
  if (!cleanDomain) throw new ValidationError("Invalid domain name.");

  // SSRF check on domain
  await validateSafeUrl(`https://${cleanDomain}`);

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: cleanDomain,
        port,
        servername: cleanDomain,
        rejectUnauthorized: false,
        timeout: 5000,
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        socket.end();

        if (!cert || !cert.valid_to) {
          return reject(new ValidationError(`No SSL certificate found for ${cleanDomain}`));
        }

        const validToDate = new Date(cert.valid_to);
        const validFromDate = new Date(cert.valid_from);
        const now = Date.now();
        const daysRemaining = Math.max(
          0,
          Math.floor((validToDate.getTime() - now) / (1000 * 60 * 60 * 24)),
        );
        const isValid = socket.authorized && daysRemaining > 0;

        const sans = cert.subjectaltname
          ? cert.subjectaltname.split(",").map((s: string) => s.trim().replace(/^DNS:/, ""))
          : [];

        resolve({
          domain: cleanDomain,
          issuer:
            typeof cert.issuer === "object"
              ? cert.issuer.O || cert.issuer.CN || "Unknown"
              : "Unknown",
          subject: typeof cert.subject === "object" ? cert.subject.CN || cleanDomain : cleanDomain,
          validFrom: validFromDate.toISOString(),
          validTo: validToDate.toISOString(),
          daysRemaining,
          isValid,
          subjectAltNames: sans.slice(0, 10),
        });
      },
    );

    socket.on("error", (err: any) => {
      reject(new ValidationError(`SSL connection failed: ${err.message}`));
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new ValidationError(`SSL connection timed out for ${cleanDomain}`));
    });
  });
}

export interface HttpRequestResult {
  url: string;
  method: string;
  statusCode: number;
  statusText: string;
  responseTimeMs: number;
  headers: Record<string, string>;
  bodySnippet: string;
  contentLength: number;
}

export async function testHttpRequest(
  rawUrl: string,
  method: "GET" | "HEAD" | "POST" = "GET",
  body?: string,
): Promise<HttpRequestResult> {
  const safeUrl = await validateSafeUrl(rawUrl);
  const startTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(safeUrl.toString(), {
      method,
      headers: {
        "User-Agent": "DevPulse-Bot/1.0 (+https://github.com/swadhin/discordbot)",
        Accept: "*/*",
      },
      body: method === "POST" ? body : undefined,
      signal: controller.signal,
    });

    const responseTimeMs = Date.now() - startTime;
    const headers: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      headers[key] = val;
    });

    let bodySnippet = "";
    if (method !== "HEAD") {
      const text = await response.text();
      bodySnippet = text.slice(0, 1000);
    }

    return {
      url: safeUrl.toString(),
      method,
      statusCode: response.status,
      statusText: response.statusText,
      responseTimeMs,
      headers,
      bodySnippet,
      contentLength: bodySnippet.length,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const HttpStatusCodes: Record<number, { name: string; description: string }> = {
  200: { name: "OK", description: "The request has succeeded." },
  201: {
    name: "Created",
    description: "The request has been fulfilled and a new resource was created.",
  },
  204: {
    name: "No Content",
    description: "The server successfully processed the request and is not returning any content.",
  },
  301: {
    name: "Moved Permanently",
    description: "The target resource has been assigned a new permanent URI.",
  },
  302: {
    name: "Found",
    description: "The target resource resides temporarily under a different URI.",
  },
  304: { name: "Not Modified", description: "The client can use cached data." },
  400: {
    name: "Bad Request",
    description: "The server could not understand the request due to invalid syntax.",
  },
  401: {
    name: "Unauthorized",
    description: "The request requires user authentication credentials.",
  },
  403: {
    name: "Forbidden",
    description: "The server understood the request but refuses to authorize it.",
  },
  404: { name: "Not Found", description: "The server can not find the requested resource." },
  405: {
    name: "Method Not Allowed",
    description: "The request method is not supported for the requested resource.",
  },
  409: {
    name: "Conflict",
    description: "The request conflicts with the current state of the server.",
  },
  422: {
    name: "Unprocessable Entity",
    description:
      "The server understands the content type and syntax, but was unable to process the contained instructions.",
  },
  429: {
    name: "Too Many Requests",
    description: "The user has sent too many requests in a given amount of time.",
  },
  500: {
    name: "Internal Server Error",
    description:
      "The server encountered an unexpected condition that prevented it from fulfilling the request.",
  },
  502: {
    name: "Bad Gateway",
    description:
      "The server, while acting as a gateway or proxy, received an invalid response from the inbound server.",
  },
  503: {
    name: "Service Unavailable",
    description:
      "The server is currently unable to handle the request due to temporary overloading or maintenance.",
  },
  504: {
    name: "Gateway Timeout",
    description:
      "The server, while acting as a gateway or proxy, did not receive a timely response from an upstream server.",
  },
};

export function lookupHttpStatus(code: number): {
  code: number;
  name: string;
  description: string;
} {
  const found = HttpStatusCodes[code];
  if (!found) {
    throw new ValidationError(`Unknown or uncataloged HTTP status code: ${code}`);
  }
  return { code, ...found };
}
