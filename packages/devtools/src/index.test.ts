import { describe, expect, it } from "vitest";
import {
  base64Decode,
  base64Encode,
  calculateChmod,
  compareSemver,
  decodeJwt,
  formatJson,
  generateHash,
  generateUuid,
  isPrivateIp,
  parseCronExpression,
  testRegex,
} from "./index.js";

describe("devtools text and crypto", () => {
  it("encodes and decodes base64", () => {
    const raw = "DevPulse Discord Bot";
    const enc = base64Encode(raw);
    expect(enc).toBe("RGV2UHVsc2UgRGlzY29yZCBCb3Q=");
    expect(base64Decode(enc)).toBe(raw);
  });

  it("generates valid hashes", () => {
    expect(generateHash("hello", "md5")).toBe("5d41402abc4b2a76b9719d911017c592");
    expect(generateHash("hello", "sha256")).toHaveLength(64);
  });

  it("generates UUID v4 and v7", () => {
    const u4 = generateUuid("v4");
    expect(u4).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const u7 = generateUuid("v7");
    expect(u7).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("decodes JWT header and payload", () => {
    // Example test token
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const decoded = decodeJwt(token);
    expect(decoded.algorithm).toBe("HS256");
    expect(decoded.payload.sub).toBe("1234567890");
    expect(decoded.payload.name).toBe("John Doe");
  });
});

describe("devtools data and system", () => {
  it("formats json properly", () => {
    const min = '{"a":1,"b":2}';
    const fmt = formatJson(min);
    expect(fmt).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("calculates chmod permissions", () => {
    const p755 = calculateChmod("755");
    expect(p755.symbolic).toBe("rwxr-xr-x");
    expect(p755.user.write).toBe(true);
    expect(p755.group.write).toBe(false);

    const fromSym = calculateChmod("rwxr-xr-x");
    expect(fromSym.octal).toBe("755");
  });

  it("compares semver strings", () => {
    expect(compareSemver("1.2.0", "1.1.9").diff).toBe("minor");
    expect(compareSemver("2.0.0", "1.9.9").result).toBe(1);
    expect(compareSemver("1.0.0", "1.0.0").diff).toBe("none");
  });
});

describe("devtools time and network security", () => {
  it("parses cron expressions and lists future runs", () => {
    const cron = parseCronExpression("0 12 * * *", 3);
    expect(cron.nextOccurrences.length).toBe(3);
  });

  it("blocks private IP ranges in SSRF guard", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("172.20.0.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
  });

  it("tests regex matches", () => {
    const res = testRegex("test(\\d+)", "g", "test123 and test456");
    expect(res.matchesCount).toBe(2);
    expect(res.matches[0].match).toBe("test123");
  });
});
