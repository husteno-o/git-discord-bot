// Terminal User Interface (TUI) Colorful ANSI Rendering Engine for GITBOT
// Strict fixed-width (43-column) monospace containers with rich Discord ANSI colors.

export const TUI_WIDTH = 43;

export const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2;37m", // Macchiato Subtext0 (#a5adcb)
  red: "\x1b[1;31m", // Macchiato Red (#ed8796)
  green: "\x1b[1;32m", // Macchiato Green (#a6da95)
  yellow: "\x1b[1;33m", // Macchiato Peach/Yellow (#eed49f)
  blue: "\x1b[1;34m", // Macchiato Blue (#8aadf4)
  magenta: "\x1b[1;35m", // Macchiato Mauve (#c6a0f6)
  cyan: "\x1b[1;36m", // Macchiato Teal (#8bd5ca)
  white: "\x1b[1;37m", // Macchiato Text (#cad3f5)
  gray: "\x1b[0;30m", // Macchiato Surface0 (#363a4f)
} as const;

export const MacchiatoAnsi = {
  mauve: ANSI.magenta,
  teal: ANSI.cyan,
  green: ANSI.green,
  peach: ANSI.yellow,
  yellow: ANSI.yellow,
  red: ANSI.red,
  blue: ANSI.blue,
  text: ANSI.white,
  subtext: ANSI.dim,
  surface: ANSI.gray,
  reset: ANSI.reset,
  bold: ANSI.bold,
} as const;

const ANSI_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, "");
}

export function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

export function padAnsi(str: string, targetLen: number): string {
  const visLen = visibleLength(str);
  if (visLen >= targetLen) {
    return str;
  }
  return `${str}${" ".repeat(targetLen - visLen)}`;
}

export function clipAnsi(str: string, maxLen: number): string {
  if (visibleLength(str) <= maxLen) {
    return str;
  }
  const stripped = stripAnsi(str);
  return `${stripped.slice(0, maxLen - 1)}…`;
}

export function tuiTopBar(title: string, width = TUI_WIDTH): string {
  const innerTitle = `${ANSI.dim}┌─ [ ${ANSI.magenta}${title}${ANSI.dim} ] ${ANSI.reset}`;
  const rem = width - visibleLength(innerTitle) - 1;
  return `${innerTitle}${ANSI.dim}${"─".repeat(Math.max(0, rem))}┐${ANSI.reset}`;
}

export function tuiBottomBar(width = TUI_WIDTH): string {
  return `${ANSI.dim}└${"─".repeat(width - 2)}┘${ANSI.reset}`;
}

export function tuiDivider(title?: string, width = TUI_WIDTH): string {
  if (!title) {
    return `${ANSI.dim}├${"─".repeat(width - 2)}┤${ANSI.reset}`;
  }
  const prefix = `${ANSI.dim}├─ ${ANSI.blue}${title} ${ANSI.dim}`;
  const rem = width - visibleLength(prefix) - 1;
  return `${prefix}${"─".repeat(Math.max(0, rem))}┤${ANSI.reset}`;
}

export function tuiLine(text = "", width = TUI_WIDTH): string {
  const contentWidth = width - 4;
  const clipped = clipAnsi(text, contentWidth);
  return `${ANSI.dim}│${ANSI.reset} ${padAnsi(clipped, contentWidth)} ${ANSI.dim}│${ANSI.reset}`;
}

export function tuiPrompt(cmd: string, width = TUI_WIDTH): string {
  return tuiLine(`${ANSI.cyan}$${ANSI.reset} ${ANSI.white}${cmd}${ANSI.reset}`, width);
}

export function tuiRow2(
  l1: string,
  v1: string,
  l2?: string,
  v2?: string,
  width = TUI_WIDTH,
): string {
  const contentWidth = width - 4;
  if (!l2) {
    const text = `${ANSI.dim}${l1.padEnd(9)}:${ANSI.reset} ${v1}`;
    return tuiLine(text, width);
  }
  const half = Math.floor((contentWidth - 2) / 2);
  const col1 = padAnsi(`${ANSI.dim}${l1.padEnd(7)}:${ANSI.reset} ${v1}`, half);
  const col2 = padAnsi(`${ANSI.dim}${l2.padEnd(7)}:${ANSI.reset} ${v2}`, contentWidth - half - 2);
  return tuiLine(`${col1}  ${col2}`, width);
}

export function renderMeter(pct: number, length = 10): string {
  const filled = Math.min(length, Math.max(0, Math.round((pct / 100) * length)));
  const color = pct >= 80 ? ANSI.green : pct >= 50 ? ANSI.yellow : ANSI.red;
  return `[${color}${"■".repeat(filled)}${ANSI.dim}${"□".repeat(length - filled)}${ANSI.reset}]`;
}

export function renderTuiCard(lines: string[]): string {
  return `\`\`\`ansi\n${lines.join("\n")}\n\`\`\``;
}
