import { describe, expect, it } from "vitest";
import {
  TUI_WIDTH,
  renderMeter,
  renderTuiCard,
  tuiBottomBar,
  tuiDivider,
  tuiLine,
  tuiPrompt,
  tuiRow2,
  tuiTopBar,
} from "./tui.js";

describe("TUI Rendering Engine", () => {
  it("enforces exact fixed line width of 43 characters across all components", () => {
    const top = tuiTopBar("GITBOT TUI");
    const prompt = tuiPrompt("gitbot test");
    const div = tuiDivider("SECTION");
    const plainLine = tuiLine("Sample text here");
    const row = tuiRow2("Stars", "★ 10", "Forks", "⑂ 2");
    const singleRow = tuiRow2("License", "MIT License");
    const bottom = tuiBottomBar();

    expect(top.length).toBe(TUI_WIDTH);
    expect(prompt.length).toBe(TUI_WIDTH);
    expect(div.length).toBe(TUI_WIDTH);
    expect(plainLine.length).toBe(TUI_WIDTH);
    expect(row.length).toBe(TUI_WIDTH);
    expect(singleRow.length).toBe(TUI_WIDTH);
    expect(bottom.length).toBe(TUI_WIDTH);
  });

  it("handles long text by gracefully clipping to prevent Discord line breaks", () => {
    const overflowText =
      "This is a very long line that exceeds the standard terminal viewport and would otherwise wrap awkwardly on mobile Discord screens.";
    const line = tuiLine(overflowText);
    expect(line.length).toBe(TUI_WIDTH);
    expect(line.startsWith("│ ")).toBe(true);
    expect(line.endsWith(" │")).toBe(true);
  });

  it("renders meter gauges correctly across boundary percentages", () => {
    expect(renderMeter(0, 10)).toBe("[□□□□□□□□□□]");
    expect(renderMeter(50, 10)).toBe("[■■■■■□□□□□]");
    expect(renderMeter(100, 10)).toBe("[■■■■■■■■■■]");
  });

  it("wraps TUI lines in a monospace code block", () => {
    const card = renderTuiCard([tuiTopBar("TITLE"), tuiPrompt("cmd"), tuiBottomBar()]);
    expect(card.startsWith("```text\n")).toBe(true);
    expect(card.endsWith("\n```")).toBe(true);
  });
});
