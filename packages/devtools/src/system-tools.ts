import { ValidationError } from "@devpulse/core";

export function calculateChmod(input: string): {
  octal: string;
  symbolic: string;
  user: { read: boolean; write: boolean; execute: boolean };
  group: { read: boolean; write: boolean; execute: boolean };
  others: { read: boolean; write: boolean; execute: boolean };
} {
  const trimmed = input.trim();

  // If octal format like "755" or "0755"
  if (/^0?[0-7]{3}$/.test(trimmed)) {
    const octal = trimmed.length === 4 ? trimmed.slice(1) : trimmed;
    const u = Number.parseInt(octal[0], 8);
    const g = Number.parseInt(octal[1], 8);
    const o = Number.parseInt(octal[2], 8);

    const parseBits = (num: number) => ({
      read: (num & 4) !== 0,
      write: (num & 2) !== 0,
      execute: (num & 1) !== 0,
    });

    const user = parseBits(u);
    const group = parseBits(g);
    const others = parseBits(o);

    const toSym = (b: { read: boolean; write: boolean; execute: boolean }) =>
      `${b.read ? "r" : "-"}${b.write ? "w" : "-"}${b.execute ? "x" : "-"}`;

    const symbolic = `${toSym(user)}${toSym(group)}${toSym(others)}`;
    return { octal, symbolic, user, group, others };
  }

  // If symbolic format like "rwxr-xr-x"
  if (/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/.test(trimmed)) {
    const parseChunk = (chunk: string) => {
      let val = 0;
      if (chunk[0] === "r") val += 4;
      if (chunk[1] === "w") val += 2;
      if (chunk[2] === "x") val += 1;
      return val;
    };

    const u = parseChunk(trimmed.slice(0, 3));
    const g = parseChunk(trimmed.slice(3, 6));
    const o = parseChunk(trimmed.slice(6, 9));

    const octal = `${u}${g}${o}`;
    return calculateChmod(octal);
  }

  throw new ValidationError(
    "Invalid chmod input. Provide an octal value (e.g. '755') or symbolic string (e.g. 'rwxr-xr-x').",
  );
}

export function compareSemver(
  v1: string,
  v2: string,
): {
  result: -1 | 0 | 1;
  message: string;
  diff: "major" | "minor" | "patch" | "prerelease" | "none";
} {
  const parse = (v: string) => {
    const clean = v.replace(/^v/i, "").trim();
    const [core, prerelease] = clean.split("-");
    const [major, minor, patch] = core.split(".").map((n) => Number.parseInt(n, 10) || 0);
    return { major, minor, patch, prerelease };
  };

  const p1 = parse(v1);
  const p2 = parse(v2);

  if (p1.major !== p2.major) {
    return {
      result: p1.major > p2.major ? 1 : -1,
      message: `${v1} is ${p1.major > p2.major ? "greater" : "less"} than ${v2} (major change)`,
      diff: "major",
    };
  }

  if (p1.minor !== p2.minor) {
    return {
      result: p1.minor > p2.minor ? 1 : -1,
      message: `${v1} is ${p1.minor > p2.minor ? "greater" : "less"} than ${v2} (minor change)`,
      diff: "minor",
    };
  }

  if (p1.patch !== p2.patch) {
    return {
      result: p1.patch > p2.patch ? 1 : -1,
      message: `${v1} is ${p1.patch > p2.patch ? "greater" : "less"} than ${v2} (patch change)`,
      diff: "patch",
    };
  }

  if (p1.prerelease !== p2.prerelease) {
    if (!p1.prerelease && p2.prerelease) {
      return { result: 1, message: `${v1} is a release, ${v2} is prerelease`, diff: "prerelease" };
    }
    if (p1.prerelease && !p2.prerelease) {
      return { result: -1, message: `${v1} is prerelease, ${v2} is a release`, diff: "prerelease" };
    }
  }

  return { result: 0, message: `${v1} is identical to ${v2}`, diff: "none" };
}

export function convertBytes(bytes: number): Record<string, string> {
  const safeBytes = Math.max(0, bytes);
  return {
    bytes: `${safeBytes} B`,
    kilobytes: `${(safeBytes / 1024).toFixed(2)} KB`,
    megabytes: `${(safeBytes / (1024 * 1024)).toFixed(2)} MB`,
    gigabytes: `${(safeBytes / (1024 * 1024 * 1024)).toFixed(3)} GB`,
    terabytes: `${(safeBytes / (1024 * 1024 * 1024 * 1024)).toFixed(4)} TB`,
  };
}
