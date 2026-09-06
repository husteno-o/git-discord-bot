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
