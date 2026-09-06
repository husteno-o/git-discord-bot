import { ValidationError, discordTimestamp } from "@devpulse/core";
import cronParser from "cron-parser";

export function parseTimestamp(input: string | number): {
  unixSeconds: number;
  unixMs: number;
  iso: string;
  utc: string;
  discordRelative: string;
  discordFull: string;
} {
  let ms: number;
  if (typeof input === "number") {
    ms = input < 10000000000 ? input * 1000 : input;
  } else {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
      const num = Number.parseInt(trimmed, 10);
      ms = num < 10000000000 ? num * 1000 : num;
    } else {
      const parsed = Date.parse(trimmed);
      if (Number.isNaN(parsed)) {
        throw new ValidationError(`Invalid date/timestamp input: ${input}`);
      }
      ms = parsed;
    }
  }

  const date = new Date(ms);
  const unixSeconds = Math.floor(ms / 1000);

  return {
    unixSeconds,
    unixMs: ms,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    discordRelative: discordTimestamp(date, "R"),
    discordFull: discordTimestamp(date, "F"),
  };
}

export function parseCronExpression(
  expression: string,
  count = 5,
): {
  expression: string;
  description: string;
  nextOccurrences: Array<{ iso: string; discord: string }>;
} {
  try {
    const p: any = cronParser;
    const parseFn = p.parseExpression || p.default?.parseExpression;
    const interval = parseFn(expression.trim());
    const nextOccurrences: Array<{ iso: string; discord: string }> = [];

    for (let i = 0; i < count; i++) {
      const nextDate = interval.next().toDate();
      nextOccurrences.push({
        iso: nextDate.toISOString(),
        discord: discordTimestamp(nextDate, "f"),
      });
    }

    return {
      expression: expression.trim(),
      description: `Runs on schedule: ${expression.trim()}`,
      nextOccurrences,
    };
  } catch (err: any) {
    throw new ValidationError(`Invalid cron expression '${expression}': ${err.message}`);
  }
}

export function convertTimezone(
  timeStr: string,
  fromTz: string,
  toTz: string,
): {
  original: string;
  fromTimezone: string;
  toTimezone: string;
  converted: string;
} {
  try {
    const date = new Date(timeStr);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError(`Invalid date time string: ${timeStr}`);
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: toTz,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });

    return {
      original: timeStr,
      fromTimezone: fromTz,
      toTimezone: toTz,
      converted: formatter.format(date),
    };
  } catch (err: any) {
    throw new ValidationError(`Timezone conversion failed: ${err.message}`);
  }
}
