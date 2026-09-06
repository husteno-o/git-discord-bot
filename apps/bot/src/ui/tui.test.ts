import { describe, expect, it } from "vitest";
import {
  TUI_WIDTH,
  renderMeter,
  renderTuiCard,
  stripAnsi,
  tuiBottomBar,
  tuiDivider,
  tuiLine,
  tuiPrompt,
  tuiRow2,
  tuiTopBar,
  visibleLength,
} from "./tui.js";

describe("TUI Rendering Engine", () => {
  it("enforces exact fixed visible width of 43 characters across all components", () => {
    const top = tuiTopBar("GITBOT TUI");
    const prompt = tuiPrompt("gitbot test");
    const div = tuiDivider("SECTION");
    const plainLine = tuiLine("Sample text here");
    const row = tuiRow2("Stars", "⭐ 10", "Forks", "🍴 2");
    const singleRow = tuiRow2("License", "MIT License");
    const bottom = tuiBottomBar();

    expect(visibleLength(top)).toBe(TUI_WIDTH);
    expect(visibleLength(prompt)).toBe(TUI_WIDTH);
    expect(visibleLength(div)).toBe(TUI_WIDTH);
    expect(visibleLength(plainLine)).toBe(TUI_WIDTH);
    expect(visibleLength(row)).toBe(TUI_WIDTH);
    expect(visibleLength(singleRow)).toBe(TUI_WIDTH);
    expect(visibleLength(bottom)).toBe(TUI_WIDTH);
  });

  it("handles long text by gracefully clipping to prevent Discord line breaks", () => {
    const overflowText =
      "This is a very long line that exceeds the standard terminal viewport and would otherwise wrap awkwardly on mobile Discord screens.";
    const line = tuiLine(overflowText);
    expect(visibleLength(line)).toBe(TUI_WIDTH);
    const stripped = stripAnsi(line);
    expect(stripped.startsWith("│ ")).toBe(true);
    expect(stripped.endsWith(" │")).toBe(true);
  });

  it("renders meter gauges correctly across boundary percentages", () => {
    expect(stripAnsi(renderMeter(0, 10))).toBe("[□□□□□□□□□□]");
    expect(stripAnsi(renderMeter(50, 10))).toBe("[■■■■■□□□□□]");
    expect(stripAnsi(renderMeter(100, 10))).toBe("[■■■■■■■■■■]");
  });

  it("wraps TUI lines in an ANSI monospace code block", () => {
    const card = renderTuiCard([tuiTopBar("TITLE"), tuiPrompt("cmd"), tuiBottomBar()]);
    expect(card.startsWith("```ansi\n")).toBe(true);
    expect(card.endsWith("\n```")).toBe(true);
  });
});
