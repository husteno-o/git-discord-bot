export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);
  return `${Number.parseFloat((bytes / k ** safeIndex).toFixed(dm))} ${sizes[safeIndex]}`;
}

export function formatDuration(ms: number): string {
  const safeMs = Math.max(0, ms);
  const seconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remMins = minutes % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }
  if (minutes > 0) {
    const remSecs = seconds % 60;
    return remSecs > 0 ? `${minutes}m ${remSecs}s` : `${minutes}m`;
  }
  if (seconds > 0) {
    return `${seconds}s`;
  }
  return `${Math.round(ms)}ms`;
}

export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === "number" || typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  if (diffSec > 10) return `${diffSec}s ago`;
  return "just now";
}

export function truncate(text: string, maxLength: number, suffix = "…"): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function sanitizeMarkdown(text: string): string {
  if (!text) return "";
  return text.replace(/([*_`~|\\])/g, "\\$1");
}

export function discordTimestamp(
  date: Date | number,
  format: "t" | "T" | "d" | "D" | "f" | "F" | "R" = "R",
): string {
  const timestamp = Math.floor((typeof date === "number" ? date : date.getTime()) / 1000);
  return `<t:${timestamp}:${format}>`;
}
