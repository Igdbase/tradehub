import type { IndicatorTemplate, OverlayFigure, OverlayTemplate } from "klinecharts";

export const PRACTICE_KLINE_DRAWING_GROUP = "tradehub_practice_drawings_v1";
export const PRACTICE_KLINE_DRAFT_GROUP = "tradehub_practice_drawing_draft_v1";
export const PRACTICE_KLINE_PRICE_GROUP = "tradehub_practice_price_guides_v1";
export const PRACTICE_KLINE_TREND_OVERLAY = "segment";
export const PRACTICE_KLINE_HORIZONTAL_OVERLAY = "tradehubHorizontalLine";
export const PRACTICE_KLINE_VERTICAL_OVERLAY = "tradehubVerticalLine";
export const PRACTICE_KLINE_FIBONACCI_OVERLAY = "tradehubBoundedFibonacci";
export const PRACTICE_KLINE_ZONE_OVERLAY = "tradehubZone";
export const PRACTICE_KLINE_MEASURE_OVERLAY = "tradehubDirectionalMeasure";
export const PRACTICE_KLINE_TEXT_OVERLAY = "tradehubTextNote";
export const PRACTICE_KLINE_ATR_INDICATOR = "TRADEHUB_ATR";
export const PRACTICE_KLINE_RSI_PANE = "practice-rsi-pane";
export const PRACTICE_KLINE_ATR_PANE = "practice-atr-pane";
export const PRACTICE_KLINE_VOLUME_PANE = "practice-volume-pane";

export const PRACTICE_FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

export type PracticeKLineOverlayData = {
  text?: string;
  color?: string;
};

let productionOverlaysRegistered = false;

function estimatedTextWidth(text: string, fontSize: number, weight = 500) {
  const weightScale = weight >= 600 ? 0.62 : 0.58;
  return text.length * fontSize * weightScale;
}

const PRACTICE_TEXT_NOTE_MAX_WIDTH = 210;
const PRACTICE_TEXT_NOTE_MIN_WIDTH = 48;
const PRACTICE_TEXT_NOTE_HORIZONTAL_PADDING = 8;
const PRACTICE_TEXT_NOTE_MAX_DISPLAY_LINES = 16;

function estimatedNoteTextWidth(text: string, fontSize: number) {
  return [...text].reduce((width, character) => {
    if (/\s/.test(character)) return width + fontSize * 0.38;
    if (/[ilI1|.,'`:;]/.test(character)) return width + fontSize * 0.38;
    if (/[MW@#%&]/.test(character)) return width + fontSize;
    if (/[A-Z0-9]/.test(character)) return width + fontSize * 0.74;
    return width + fontSize * 0.66;
  }, 0);
}

function wrapTextNoteDisplayLines(text: string, maxWidth: number, fontSize: number) {
  const wrapped: string[] = [];
  const sourceLines = text.split("\n");

  for (const sourceLine of sourceLines) {
    if (sourceLine.length === 0) {
      wrapped.push("");
      continue;
    }

    let remaining = sourceLine;
    while (remaining.length > 0) {
      let fittingLength = 0;
      for (let index = 1; index <= remaining.length; index += 1) {
        if (estimatedNoteTextWidth(remaining.slice(0, index), fontSize) > maxWidth) break;
        fittingLength = index;
      }

      if (fittingLength === 0) fittingLength = 1;
      if (fittingLength < remaining.length) {
        const whitespaceBreak = remaining.slice(0, fittingLength + 1).search(/\s+\S*$/);
        if (whitespaceBreak > 0) fittingLength = whitespaceBreak;
      }

      wrapped.push(remaining.slice(0, fittingLength).trimEnd());
      remaining = remaining.slice(fittingLength).trimStart();
    }
  }

  if (wrapped.length <= PRACTICE_TEXT_NOTE_MAX_DISPLAY_LINES) return wrapped;
  const visible = wrapped.slice(0, PRACTICE_TEXT_NOTE_MAX_DISPLAY_LINES);
  let finalLine = visible[visible.length - 1].trimEnd();
  while (finalLine.length > 0 && estimatedNoteTextWidth(`${finalLine}...`, fontSize) > maxWidth) {
    finalLine = finalLine.slice(0, -1).trimEnd();
  }
  visible[visible.length - 1] = `${finalLine}...`;
  return visible;
}

const twoPointTemplate = {
  totalStep: 3,
  drawingMode: "step",
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false
} as const;

const horizontalLineOverlay: OverlayTemplate<PracticeKLineOverlayData> = {
  name: PRACTICE_KLINE_HORIZONTAL_OVERLAY,
  totalStep: 2,
  drawingMode: "step",
  needDefaultPointFigure: true,
  createPointFigures: ({ coordinates, overlay, bounding }) => coordinates[0] ? [{
    type: "line",
    attrs: { coordinates: [{ x: 0, y: coordinates[0].y }, { x: bounding.width, y: coordinates[0].y }] },
    styles: { color: overlay.extendData?.color ?? "#d9c28c", size: 1, style: "solid" }
  }] : []
};

const verticalLineOverlay: OverlayTemplate<PracticeKLineOverlayData> = {
  name: PRACTICE_KLINE_VERTICAL_OVERLAY,
  totalStep: 2,
  drawingMode: "step",
  needDefaultPointFigure: true,
  createPointFigures: ({ coordinates, overlay, bounding }) => coordinates[0] ? [{
    type: "line",
    attrs: { coordinates: [{ x: coordinates[0].x, y: 0 }, { x: coordinates[0].x, y: bounding.height }] },
    styles: { color: overlay.extendData?.color ?? "#d9c28c", size: 1, style: "solid" }
  }] : []
};

const fibonacciColors = ["#94a3b8", "#38bdf8", "#22c55e", "#eab308", "#f97316", "#f43f5e", "#c084fc"] as const;
const fibonacciFills = ["rgba(56,189,248,0.055)", "rgba(34,197,94,0.05)", "rgba(234,179,8,0.05)", "rgba(249,115,22,0.05)", "rgba(244,63,94,0.05)", "rgba(192,132,252,0.05)"] as const;

const boundedFibonacciOverlay: OverlayTemplate<PracticeKLineOverlayData> = {
  name: PRACTICE_KLINE_FIBONACCI_OVERLAY,
  ...twoPointTemplate,
  createPointFigures: ({ coordinates, overlay, bounding, chart }) => {
    if (coordinates.length < 2 || overlay.points.length < 2) return [];
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    const startValue = Number(overlay.points[0]?.value ?? 0);
    const endValue = Number(overlay.points[overlay.points.length - 1]?.value ?? startValue);
    const precision = chart.getSymbol()?.pricePrecision ?? 2;
    const levelRows = PRACTICE_FIBONACCI_LEVELS.map((level) => ({
      level,
      y: start.y + ((end.y - start.y) * level),
      value: startValue + ((endValue - startValue) * level)
    }));
    const figures: OverlayFigure[] = [];

    for (let index = 0; index < levelRows.length - 1; index += 1) {
      const row = levelRows[index];
      const next = levelRows[index + 1];
      figures.push({
        key: `fill-${index}`,
        type: "polygon",
        attrs: {
          coordinates: [
            { x: left, y: row.y },
            { x: right, y: row.y },
            { x: right, y: next.y },
            { x: left, y: next.y }
          ]
        },
        styles: { style: "fill", color: fibonacciFills[index] }
      });
    }

    levelRows.forEach((row, index) => {
      const color = fibonacciColors[index];
      figures.push({
        key: `level-${row.level}`,
        type: "line",
        attrs: { coordinates: [{ x: left, y: row.y }, { x: right, y: row.y }] },
        styles: { color, size: index === 0 || index === levelRows.length - 1 ? 1.5 : 1, style: "solid" }
      });
      const label = `${(row.level * 100).toFixed(row.level === 0 || row.level === 1 ? 0 : 1)}%  ${row.value.toFixed(precision)}`;
      const labelWidth = Math.min(118, Math.max(58, estimatedTextWidth(label, 10, 600) + 10));
      const labelX = right + labelWidth + 6 <= bounding.width ? right + 4 : Math.max(left + 4, right - labelWidth - 4);
      figures.push({
        key: `label-${row.level}`,
        type: "text",
        ignoreEvent: true,
        attrs: { x: labelX, y: row.y, text: label, baseline: "middle" },
        styles: {
          color,
          size: 10,
          weight: 600,
          backgroundColor: "rgba(3, 7, 18, 0.88)",
          borderRadius: 3,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2
        }
      });
    });

    figures.push({
      key: "anchor-axis",
      type: "line",
      attrs: { coordinates: [start, end] },
      styles: { color: "rgba(226,232,240,0.48)", size: 1, style: "dashed" }
    });
    return figures;
  }
};

const zoneOverlay: OverlayTemplate<PracticeKLineOverlayData> = {
  name: PRACTICE_KLINE_ZONE_OVERLAY,
  ...twoPointTemplate,
  createPointFigures: ({ coordinates, overlay }) => {
    if (coordinates.length < 2) return [];
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    const color = overlay.extendData?.color ?? "#d9c28c";
    return [{
      type: "polygon",
      attrs: { coordinates: [start, { x: end.x, y: start.y }, end, { x: start.x, y: end.y }] },
      styles: { style: "stroke_fill", color: `${color}20`, borderColor: color, borderSize: 1 }
    }];
  }
};

const directionalMeasureOverlay: OverlayTemplate<PracticeKLineOverlayData> = {
  name: PRACTICE_KLINE_MEASURE_OVERLAY,
  ...twoPointTemplate,
  createPointFigures: ({ coordinates, overlay }) => {
    if (coordinates.length < 2 || overlay.points.length < 2) return [];
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    const startValue = Number(overlay.points[0]?.value ?? 0);
    const endValue = Number(overlay.points[overlay.points.length - 1]?.value ?? startValue);
    const color = endValue >= startValue ? "#60a5fa" : "#ef4444";
    const delta = endValue - startValue;
    const percent = startValue === 0 ? 0 : delta / startValue * 100;
    const bars = Math.abs(Number(overlay.points[overlay.points.length - 1]?.dataIndex ?? 0) - Number(overlay.points[0]?.dataIndex ?? 0));
    const label = `${delta.toFixed(4)} · ${percent.toFixed(2)}% · ${bars.toFixed(1)} bars`;
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const right = Math.max(start.x, end.x);
    const bottom = Math.max(start.y, end.y);

    return [
      {
        type: "polygon",
        attrs: { coordinates: [start, { x: end.x, y: start.y }, end, { x: start.x, y: end.y }] },
        styles: { style: "stroke_fill", color: `${color}18`, borderColor: color, borderSize: 1 }
      },
      {
        type: "line",
        attrs: { coordinates: [start, end] },
        styles: { color, size: 2, style: "solid" }
      },
      {
        type: "text",
        ignoreEvent: true,
        attrs: { x: left + 6, y: Math.max(4, top + 6), text: label },
        styles: {
          color,
          size: 10,
          weight: 600,
          backgroundColor: "rgba(0,0,0,0.9)",
          borderColor: color,
          borderSize: 1,
          borderRadius: 4,
          paddingLeft: 5,
          paddingRight: 5,
          paddingTop: 3,
          paddingBottom: 3
        }
      },
      {
        type: "line",
        attrs: { coordinates: [{ x: left, y: bottom }, { x: right, y: bottom }] },
        styles: { color: `${color}88`, size: 1, style: "dashed" }
      }
    ];
  }
};

const textNoteOverlay: OverlayTemplate<PracticeKLineOverlayData> = {
  name: PRACTICE_KLINE_TEXT_OVERLAY,
  totalStep: 2,
  drawingMode: "step",
  needDefaultPointFigure: true,
  createPointFigures: ({ coordinates, overlay, bounding }) => {
    const anchor = coordinates[0];
    if (!anchor) return [];
    const color = overlay.extendData?.color ?? "#60a5fa";
    const fontSize = 11;
    const lineHeight = 15;
    const maxNoteWidth = Math.max(48, Math.min(PRACTICE_TEXT_NOTE_MAX_WIDTH, bounding.width - 8));
    const maxTextWidth = Math.max(24, maxNoteWidth - PRACTICE_TEXT_NOTE_HORIZONTAL_PADDING);
    const lines = wrapTextNoteDisplayLines(overlay.extendData?.text ?? "Text note", maxTextWidth, fontSize);
    const width = Math.min(maxNoteWidth, Math.max(PRACTICE_TEXT_NOTE_MIN_WIDTH, ...lines.map((line) => estimatedNoteTextWidth(line || " ", fontSize) + PRACTICE_TEXT_NOTE_HORIZONTAL_PADDING)));
    const height = Math.max(18, lines.length * lineHeight + 4);
    const x = Math.max(4, Math.min(anchor.x + 8, bounding.width - width - 4));
    const y = Math.max(4, Math.min(anchor.y + 8, bounding.height - height - 4));
    const figures: OverlayFigure[] = [{
      key: "note-hit-area",
      type: "rect",
      attrs: { x, y, width, height },
      styles: {
        style: "fill",
        color: "rgba(41,98,255,0.001)",
        borderColor: "transparent",
        borderSize: 0,
        borderRadius: 0
      }
    }];

    lines.forEach((line, index) => {
      figures.push({
        key: `note-line-${index}`,
        type: "text",
        attrs: { x: x + 4, y: y + 2 + index * lineHeight, text: line || " ", baseline: "top" },
        styles: {
          color,
          size: fontSize,
          weight: 600,
          backgroundColor: "transparent",
          paddingLeft: 0,
          paddingRight: 0,
          paddingTop: 0,
          paddingBottom: 0
        }
      });
    });
    return figures;
  }
};

type PracticeAtrResult = {
  atr?: number;
};

const practiceAtrIndicator: IndicatorTemplate<PracticeAtrResult, number> = {
  name: PRACTICE_KLINE_ATR_INDICATOR,
  shortName: "ATR",
  calcParams: [14],
  shouldOhlc: true,
  precision: 8,
  figures: [{ key: "atr", title: "ATR: ", type: "line" }],
  calc: (dataList, indicator) => {
    const period = Math.max(2, Math.floor(Number(indicator.calcParams[0]) || 14));
    const trueRanges = dataList.map((candle, index) => {
      const previousClose = dataList[index - 1]?.close;
      if (previousClose === undefined) return candle.high - candle.low;
      return Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose)
      );
    });

    let runningTotal = 0;
    return trueRanges.map((trueRange, index) => {
      runningTotal += trueRange;
      if (index >= period) runningTotal -= trueRanges[index - period];
      return index >= period - 1 ? { atr: runningTotal / period } : {};
    });
  }
};

export async function registerPracticeKLineChartOverlays() {
  const klinecharts = await import("klinecharts");

  if (!productionOverlaysRegistered) {
    klinecharts.registerOverlay(horizontalLineOverlay);
    klinecharts.registerOverlay(verticalLineOverlay);
    klinecharts.registerOverlay(boundedFibonacciOverlay);
    klinecharts.registerOverlay(zoneOverlay);
    klinecharts.registerOverlay(directionalMeasureOverlay);
    klinecharts.registerOverlay(textNoteOverlay);
    klinecharts.registerIndicator(practiceAtrIndicator);
    productionOverlaysRegistered = true;
  }

  return klinecharts;
}
