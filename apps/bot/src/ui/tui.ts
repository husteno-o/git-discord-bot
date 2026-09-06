// Terminal User Interface (TUI) Rendering Engine for GITBOT
// Strict fixed-width monospace containers guaranteed to render without line-wrapping across Discord Desktop, Web, iOS, and Android.

export const TUI_WIDTH = 43;

export function padText(str: string, len: number): string {
  if (str.length > len) {
    return str.slice(0, len);
  }
  return str + " ".repeat(len - str.length);
}

export function tuiTopBar(title: string, width = TUI_WIDTH): string {
  const prefix = `┌─ [ ${title} ] `;
  const rem = Math.max(0, width - prefix.length - 1);
  return `${prefix}${"─".repeat(rem)}┐`;
}

export function tuiBottomBar(width = TUI_WIDTH): string {
  return `└${"─".repeat(width - 2)}┘`;
}

export function tuiDivider(title?: string, width = TUI_WIDTH): string {
  if (!title) {
    return `├${"─".repeat(width - 2)}┤`;
  }
  const prefix = `├─ ${title} `;
  const rem = Math.max(0, width - prefix.length - 1);
  return `${prefix}${"─".repeat(rem)}┤`;
}

export function tuiLine(text = "", width = TUI_WIDTH): string {
  const contentWidth = width - 4;
  return `│ ${padText(text, contentWidth)} │`;
}

export function tuiPrompt(cmd: string, width = TUI_WIDTH): string {
  return tuiLine(`$ ${cmd}`, width);
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
    return tuiLine(`${l1.padEnd(10)}: ${v1}`, width);
  }
  const half = Math.floor((contentWidth - 2) / 2);
  const col1 = padText(`${l1.padEnd(7)}: ${v1}`, half);
  const col2 = padText(`${l2.padEnd(7)}: ${v2}`, contentWidth - half - 2);
  return tuiLine(`${col1}  ${col2}`, width);
}

export function renderMeter(pct: number, length = 10): string {
  const filled = Math.min(length, Math.max(0, Math.round((pct / 100) * length)));
  return `[${"■".repeat(filled)}${"□".repeat(length - filled)}]`;
}

export function renderTuiCard(lines: string[]): string {
  return `\`\`\`text\n${lines.join("\n")}\n\`\`\``;
}
