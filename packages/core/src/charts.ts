export interface BarChartItem {
  label: string;
  value: number;
  displayValue?: string | number;
}

export function renderProgressBar(percentage: number, totalBlocks = 10): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filledBlocks = Math.round((clamped / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return `${"█".repeat(filledBlocks)}${"░".repeat(emptyBlocks)} ${clamped.toFixed(0)}%`;
}

export function renderHorizontalBarChart(
  items: BarChartItem[],
  options: {
    maxBarLength?: number;
    showValues?: boolean;
    barChar?: string;
  } = {},
): string {
  if (items.length === 0) return "No data available";
  const { maxBarLength = 12, showValues = true, barChar = "█" } = options;

  const maxValue = Math.max(...items.map((i) => i.value), 1);
  const maxLabelLength = Math.max(...items.map((i) => i.label.length), 0);

  return items
    .map((item) => {
      const labelPadded = item.label.padEnd(maxLabelLength, " ");
      const barLength = Math.max(0, Math.round((item.value / maxValue) * maxBarLength));
      const bar = barLength > 0 ? barChar.repeat(barLength) : "▏";
      const valStr = showValues ? ` ${item.displayValue ?? item.value}` : "";
      return `${labelPadded} ${bar}${valStr}`;
    })
    .join("\n");
}

export function renderSparkline(values: number[]): string {
  if (values.length === 0) return "";
  const ticks = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return values
    .map((val) => {
      if (range === 0) return ticks[0];
      const index = Math.min(ticks.length - 1, Math.floor(((val - min) / range) * ticks.length));
      return ticks[index];
    })
    .join("");
}

export function renderAsciiTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "Empty table";
  const colWidths = headers.map((h, i) => {
    const rowMax = rows.reduce((max, row) => Math.max(max, (row[i] || "").length), 0);
    return Math.max(h.length, rowMax);
  });

  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(" | ");
  const separatorLine = colWidths.map((w) => "-".repeat(w)).join("-+-");
  const dataLines = rows.map((row) =>
    headers.map((_, i) => (row[i] || "").padEnd(colWidths[i])).join(" | "),
  );

  return [headerLine, separatorLine, ...dataLines].join("\n");
}

export interface PieSlice {
  label: string;
  value: number;
  color?: string;
}

const PIE_COLORS = ["🟦", "🟩", "🟧", "🟥", "🟪", "🟨", "⬜", "🟫"];

export function renderPieChart(slices: PieSlice[], size = 4): string {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return "No data";

  const normalized = slices.map((s, i) => ({
    ...s,
    pct: (s.value / total) * 100,
    icon: s.color || PIE_COLORS[i % PIE_COLORS.length],
  }));

  const grid: string[][] = [];
  const rows = size * 2;
  const cols = size * 4;
  const cy = size;
  const cx = size * 2;
  const ry = size;
  const rx = size * 2;

  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      const dy = (y - cy) / ry;
      const dx = (x - cx) / rx;
      const dist = dx * dx + dy * dy;
      if (dist > 1) {
        grid[y][x] = "  ";
        continue;
      }
      const angle = Math.atan2(dy, dx);
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      let cumulative = 0;
      let sliceIndex = 0;
      for (let i = 0; i < normalized.length; i++) {
        cumulative += (normalized[i].pct / 100) * 2 * Math.PI;
        if (normalizedAngle <= cumulative) {
          sliceIndex = i;
          break;
        }
      }
      grid[y][x] = normalized[sliceIndex].icon;
    }
  }

  const legend = normalized.map((s) => `${s.icon} ${s.label} (${s.pct.toFixed(0)}%)`).join("\n");

  return grid.map((row) => row.join("")).join("\n") + "\n" + legend;
}

export function renderDonutChart(slices: PieSlice[], size = 4): string {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return "No data";

  const normalized = slices.map((s, i) => ({
    ...s,
    pct: (s.value / total) * 100,
    icon: s.color || PIE_COLORS[i % PIE_COLORS.length],
  }));

  const grid: string[][] = [];
  const rows = size * 2;
  const cols = size * 4;
  const cy = size;
  const cx = size * 2;
  const ry = size;
  const rx = size * 2;
  const innerRy = size * 0.5;
  const innerRx = size * 1.0;

  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      const dy = (y - cy) / ry;
      const dx = (x - cx) / rx;
      const dist = dx * dx + dy * dy;
      const innerDy = (y - cy) / innerRy;
      const innerDx = (x - cx) / innerRx;
      const innerDist = innerDx * innerDx + innerDy * innerDy;
      if (dist > 1 || innerDist < 1) {
        grid[y][x] = "  ";
        continue;
      }
      const angle = Math.atan2(dy, dx);
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      let cumulative = 0;
      let sliceIndex = 0;
      for (let i = 0; i < normalized.length; i++) {
        cumulative += (normalized[i].pct / 100) * 2 * Math.PI;
        if (normalizedAngle <= cumulative) {
          sliceIndex = i;
          break;
        }
      }
      grid[y][x] = normalized[sliceIndex].icon;
    }
  }

  const centerText = `${total}`;
  const centerX = Math.floor(cols / 2) - Math.floor(centerText.length / 2);
  const centerY = Math.floor(rows / 2);
  for (let i = 0; i < centerText.length; i++) {
    if (grid[centerY] && grid[centerY][centerX + i] === "  ") {
      grid[centerY][centerX + i] = centerText[i] + " ";
    }
  }

  return grid.map((row) => row.join("")).join("\n");
}

export function renderHeatmap(data: number[][], options: { maxCols?: number; maxRows?: number } = {}): string {
  const { maxCols = 14, maxRows = 7 } = options;
  if (data.length === 0 || data[0].length === 0) return "No data";

  const flat = data.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const range = max - min || 1;

  const heatChars = [" ", "░", "▒", "▓", "█"];

  const result: string[] = [];
  for (let r = 0; r < Math.min(data.length, maxRows); r++) {
    let row = "";
    for (let c = 0; c < Math.min(data[r].length, maxCols); c++) {
      const val = data[r][c];
      const idx = Math.min(heatChars.length - 1, Math.floor(((val - min) / range) * heatChars.length));
      row += heatChars[idx];
    }
    result.push(row);
  }

  return result.join("\n");
}

export function renderRadarChart(
  axes: { label: string; value: number }[],
  size = 8,
): string {
  if (axes.length < 3) return "Need at least 3 axes";

  const n = axes.length;
  const centerX = size * 2;
  const centerY = size;
  const radius = size;

  const grid: string[][] = [];
  for (let y = 0; y <= size * 2; y++) {
    grid[y] = [];
    for (let x = 0; x <= size * 4; x++) {
      grid[y][x] = " ";
    }
  }

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    points.push({ x, y });
  }

  for (let ring = 1; ring <= 3; ring++) {
    const ringRadius = (radius * ring) / 3;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const px = centerX + Math.cos(angle) * ringRadius;
      const py = centerY + Math.sin(angle) * ringRadius;
      const ix = Math.round(px);
      const iy = Math.round(py);
      if (grid[iy] && grid[iy][ix] === " ") {
        grid[iy][ix] = "·";
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const valRadius = (radius * (axes[i].value || 0)) / 100;
    const px = centerX + Math.cos(angle) * valRadius;
    const py = centerY + Math.sin(angle) * valRadius;
    const ix = Math.round(px);
    const iy = Math.round(py);
    if (grid[iy] && grid[iy][ix]) {
      grid[iy][ix] = "●";
    }
  }

  const axisLabels = axes.map((a, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const lx = centerX + Math.cos(angle) * (radius + 1.5);
    const ly = centerY + Math.sin(angle) * (radius + 0.5);
    return { label: a.label.slice(0, 4), x: Math.round(lx), y: Math.round(ly) };
  });

  let result = grid.map((row) => row.join("")).join("\n");
  result += "\n" + axisLabels.map((l) => `${l.label}: ${axes.find((a) => a.label.startsWith(l.label))?.value ?? 0}%`).join(" | ");

  return result;
}

export function renderStackedBar(label: string, segments: { value: number; color?: string }[], totalWidth = 20): string {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return `${label.padEnd(12)} ${"░".repeat(totalWidth)} 0`;

  const blocks = ["█", "▓", "▒", "░"];
  let bar = "";
  let pos = 0;
  for (let i = 0; i < segments.length; i++) {
    const segWidth = Math.round((segments[i].value / total) * totalWidth);
    const blockChar = segments[i].color || blocks[i % blocks.length];
    bar += blockChar.repeat(Math.max(0, segWidth));
    pos += segWidth;
  }
  if (pos < totalWidth) bar += "░".repeat(totalWidth - pos);
  if (pos > totalWidth) bar = bar.slice(0, totalWidth);

  return `${label.padEnd(12)} ${bar} ${total}`;
}

export function renderCommitActivityGrid(weeks: number[][]): string {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  let result = "    " + days.join(" ") + "\n";

  const flat = weeks.flat();
  const max = Math.max(...flat, 1);
  const levels = [" ", "▁", "▃", "▅", "▇"];

  for (let w = 0; w < weeks.length; w++) {
    const week = weeks[w];
    const rowNum = String(w + 1).padStart(2);
    let row = `${rowNum}  `;
    for (let d = 0; d < 7; d++) {
      const val = week[d] || 0;
      const idx = Math.min(levels.length - 1, Math.floor((val / max) * levels.length));
      row += levels[idx] + " ";
    }
    result += row + "\n";
  }

  return result;
}
