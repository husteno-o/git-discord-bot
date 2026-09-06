import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDuration,
  formatRelativeTime,
  renderHorizontalBarChart,
  renderProgressBar,
  renderSparkline,
  truncate,
} from "./index.js";

describe("core formatters", () => {
  it("formats bytes correctly", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(1073741824)).toBe("1 GB");
  });

  it("formats durations accurately", () => {
    expect(formatDuration(450)).toBe("450ms");
    expect(formatDuration(5000)).toBe("5s");
    expect(formatDuration(65000)).toBe("1m 5s");
    expect(formatDuration(3600000)).toBe("1h");
    expect(formatDuration(90000000)).toBe("1d 1h");
  });

  it("truncates strings gracefully", () => {
    expect(truncate("hello world", 5)).toBe("hell…");
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("formats relative time", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 2000)).toBe("just now");
    expect(formatRelativeTime(now - 120000)).toBe("2m ago");
    expect(formatRelativeTime(now - 7200000)).toBe("2h ago");
    expect(formatRelativeTime(now - 86400000 * 3)).toBe("3d ago");
  });
});

describe("core charts", () => {
  it("renders progress bars", () => {
    const bar50 = renderProgressBar(50, 10);
    expect(bar50).toContain("█████░░░░░ 50%");
  });

  it("renders horizontal bar charts", () => {
    const chart = renderHorizontalBarChart([
      { label: "Mon", value: 5 },
      { label: "Tue", value: 10 },
    ]);
    expect(chart).toContain("Mon");
    expect(chart).toContain("Tue");
    expect(chart).toContain("█");
  });

  it("renders sparklines", () => {
    const spark = renderSparkline([1, 3, 5, 7, 9]);
    expect(spark.length).toBe(5);
  });
});
