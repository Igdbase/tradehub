"use client";

import type { Chart, KLineData, OverlayEvent, Period } from "klinecharts";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Brush,
  CandlestickChart,
  ChartCandlestick,
  Clock,
  Crosshair,
  Eye,
  EyeOff,
  GripHorizontal,
  ListTree,
  Lock,
  Magnet,
  Maximize2,
  MoveVertical,
  Newspaper,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  RectangleHorizontal,
  Ruler,
  Search,
  Settings,
  Rocket,
  StepBack,
  StepForward,
  Trash2,
  TrendingUp,
  Type,
  Unlock,
  X,
  ZoomIn
} from "lucide-react";
import { type FormEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import {
  formatPracticeMoney,
  formatPracticePrice,
  formatPracticeQuantity,
  getPracticeInstrumentSpec,
  practiceNotionalForInstrument,
  practicePipDistance,
  quantizePracticeQuantityDown,
  roundPracticePrice
} from "@/lib/practice/practice-instrument-specs";
import {
  PRACTICE_KLINE_ATR_INDICATOR,
  PRACTICE_KLINE_ATR_PANE,
  PRACTICE_KLINE_DRAFT_GROUP,
  PRACTICE_KLINE_DRAWING_GROUP,
  PRACTICE_KLINE_FIBONACCI_OVERLAY,
  PRACTICE_KLINE_HORIZONTAL_OVERLAY,
  PRACTICE_KLINE_MEASURE_OVERLAY,
  PRACTICE_KLINE_PRICE_GROUP,
  PRACTICE_KLINE_RSI_PANE,
  PRACTICE_KLINE_TEXT_OVERLAY,
  PRACTICE_KLINE_TREND_OVERLAY,
  PRACTICE_KLINE_VERTICAL_OVERLAY,
  PRACTICE_KLINE_VOLUME_PANE,
  PRACTICE_KLINE_ZONE_OVERLAY,
  registerPracticeKLineChartOverlays
} from "@/lib/practice/practice-klinechart-overlays";
import type {
  StudentPracticeCandle,
  PracticeAnnotationDeleteResponse,
  PracticeDrawingBulkDeleteResponse,
  PracticeAnnotationKind,
  PracticeAnnotationMutationResponse,
  PracticeBookmarkDeleteResponse,
  PracticeBookmarkMutationResponse,
  PracticeDrawingColorToken,
  PracticeDrawingAppearanceVersion,
  PracticeDrawingChartPoint,
  PracticeEventMarkerCategory,
  PracticeEventMarkerImpact,
  PracticeEventMarkerSummary,
  PracticeInstrumentSpecSummary,
  PracticeOrderDirection,
  PracticeOrderEvaluationResponse,
  PracticeOrderMutationResponse,
  PracticeOrderSummary,
  PracticeOrderType,
  PracticeReplayIndexMutationResponse,
  PracticeSessionDetailResponse,
  RevealedPracticeCandlesResponse
} from "@/types/practice";

declare global {
  interface Window {
    __TRADEHUB_PRACTICE_KLINECHART__?: Chart;
  }
}

type StudentPracticeTerminalClientProps = {
  sessionId: string;
};

type TerminalOrderForm = {
  orderType: PracticeOrderType;
  direction: PracticeOrderDirection;
  requestedPrice: string;
  stopLoss: string;
  takeProfit: string;
  playbookId: string;
  checklistNotes: string;
  notes: string;
  tags: string;
};

type TerminalDrawingForm = {
  kind: PracticeAnnotationKind;
  label: string;
  text: string;
  candleIndex: string;
  secondCandleIndex: string;
  priceLevel: string;
  secondPriceLevel: string;
  colorToken: PracticeDrawingColorToken;
  orderId: string;
  eventId: string;
  isMainLesson: boolean;
};

type TerminalBookmarkForm = {
  label: string;
  note: string;
  priceLevel: string;
};

type TerminalIndicatorSettings = {
  smaEnabled: boolean;
  smaPeriod: number;
  emaEnabled: boolean;
  emaPeriod: number;
  rsiEnabled: boolean;
  rsiPeriod: number;
  atrEnabled: boolean;
  atrPeriod: number;
  volumeMaEnabled: boolean;
  volumeMaPeriod: number;
};

type TerminalIndicatorPoint = {
  time: number;
  value: number;
};

type TerminalIndicatorResult = {
  sma: TerminalIndicatorPoint[];
  ema: TerminalIndicatorPoint[];
  rsi: TerminalIndicatorPoint[];
  atr: TerminalIndicatorPoint[];
  volumeMa: TerminalIndicatorPoint[];
  hasVolume: boolean;
};

type TerminalEventPosition = {
  eventMarker: PracticeEventMarkerSummary;
  candleIndex: number;
  xCoordinate: number;
};

type TerminalChartDrawingPlacement = {
  kind: PracticeAnnotationKind;
  candleIndex: number;
  priceLevel?: number;
  secondCandleIndex?: number;
  secondPriceLevel?: number;
  text?: string;
  coordinateVersion?: "klinecharts_v1" | "klinecharts_v2";
  chartPoints?: PracticeDrawingChartPoint[];
};

type TerminalActiveTool = PracticeAnnotationKind | "select" | "zoom";

type TerminalChartPoint = {
  x: number;
  y: number;
  dataIndex: number;
  candleIndex: number;
  priceLevel?: number;
};

type TerminalChartDragDraft = {
  kind: TerminalActiveTool;
  pointerId: number;
  start: TerminalChartPoint;
  current: TerminalChartPoint;
};

type TerminalTrendLineDraft = {
  start: TerminalChartPoint;
  current: TerminalChartPoint;
};

type TerminalTextDraft = TerminalChartPoint & {
  text: string;
};

type TerminalObjectFilter = "all" | "orders" | "drawings" | "events" | "bookmarks";

type TerminalPlotBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type TerminalMobilePanelTab = "objects" | "order" | "goto" | "news" | "journal";

type TerminalDockMessage = {
  tone: "success" | "error";
  text: string;
};

type TerminalToolPopoverPosition = {
  left: number;
  top: number;
};

function terminalToolPopoverPosition(anchor: DOMRect, width: number, height: number): TerminalToolPopoverPosition {
  const margin = 8;
  const gap = 8;
  const verticalRail = window.matchMedia("(min-width: 1024px)").matches;
  const preferredLeft = verticalRail ? anchor.right + gap : anchor.left;
  const fallbackLeft = verticalRail ? anchor.left - width - gap : anchor.right - width;
  const availableLeft = preferredLeft + width <= window.innerWidth - margin ? preferredLeft : fallbackLeft;
  const preferredTop = verticalRail ? anchor.top : anchor.bottom + gap;

  return {
    left: Math.max(margin, Math.min(availableLeft, window.innerWidth - width - margin)),
    top: Math.max(margin, Math.min(preferredTop, window.innerHeight - height - margin))
  };
}

type TerminalDrawingPlacementStart = {
  kind: PracticeAnnotationKind;
  candleIndex: number;
  priceLevel?: number;
};

const speedOptions = [
  { label: "0.5x", value: 1600 },
  { label: "1x", value: 900 },
  { label: "2x", value: 450 }
];

const orderTypeOptions: Array<{ label: string; value: PracticeOrderType }> = [
  { label: "Market", value: "market" },
  { label: "Limit", value: "limit" },
  { label: "Stop", value: "stop" }
];

const terminalTimeframeOptions = [
  { label: "1m", value: 1, supported: false },
  { label: "3m", value: 3, supported: false },
  { label: "5m", value: 5, supported: false },
  { label: "15m", value: 15, supported: true },
  { label: "30m", value: 30, supported: false },
  { label: "1h", value: 60, supported: true },
  { label: "2h", value: 120, supported: false },
  { label: "4h", value: 240, supported: true },
  { label: "D", value: 1440, supported: true },
  { label: "W", value: 10080, supported: false },
  { label: "M", value: 43200, supported: false }
];

const terminalMobilePanelTabs = [
  { label: "Objects", fullLabel: "Object tree", value: "objects", Icon: ListTree },
  { label: "Order", fullLabel: "Order", value: "order", Icon: CandlestickChart },
  { label: "Go To", fullLabel: "Go To", value: "goto", Icon: Clock },
  { label: "News", fullLabel: "News and events", value: "news", Icon: Newspaper },
  { label: "Journal", fullLabel: "Journal", value: "journal", Icon: BookOpen }
] satisfies Array<{ label: string; fullLabel: string; value: TerminalMobilePanelTab; Icon: typeof ListTree }>;

const drawingKindOptions: Array<{ label: string; value: PracticeAnnotationKind }> = [
  { label: "Trend line", value: "trend_line" },
  { label: "Horizontal line", value: "horizontal_line" },
  { label: "Vertical marker", value: "vertical_marker" },
  { label: "Zone", value: "zone" },
  { label: "Text note", value: "text_note" },
  { label: "Fib retracement", value: "fibonacci_retracement" },
  { label: "Measure", value: "measurement_placeholder" }
];

const drawingColorOptions: Array<{ label: string; value: PracticeDrawingColorToken }> = [
  { label: "Accent", value: "accent" },
  { label: "Green", value: "green" },
  { label: "Amber", value: "amber" },
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Neutral", value: "neutral" }
];

const defaultOrderForm: TerminalOrderForm = {
  orderType: "market",
  direction: "buy",
  requestedPrice: "",
  stopLoss: "",
  takeProfit: "",
  playbookId: "",
  checklistNotes: "",
  notes: "",
  tags: "terminal"
};

const defaultDrawingForm: TerminalDrawingForm = {
  kind: "text_note",
  label: "",
  text: "",
  candleIndex: "",
  secondCandleIndex: "",
  priceLevel: "",
  secondPriceLevel: "",
  colorToken: "accent",
  orderId: "",
  eventId: "",
  isMainLesson: false
};

const defaultBookmarkForm: TerminalBookmarkForm = {
  label: "",
  note: "",
  priceLevel: ""
};

const defaultIndicatorSettings: TerminalIndicatorSettings = {
  smaEnabled: false,
  smaPeriod: 20,
  emaEnabled: false,
  emaPeriod: 20,
  rsiEnabled: false,
  rsiPeriod: 14,
  atrEnabled: false,
  atrPeriod: 14,
  volumeMaEnabled: false,
  volumeMaPeriod: 20
};

const compactInputClass =
  "focus-ring min-h-9 w-full rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_84%,transparent)] px-2.5 py-1.5 text-sm text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]";

const terminalLineTools = [
  { id: "trend", label: "Trend line", kind: "trend_line", available: true },
  { id: "ray", label: "Ray (coming soon)", kind: undefined, available: false },
  { id: "extended-line", label: "Extended line (coming soon)", kind: undefined, available: false },
  { id: "horizontal", label: "Horizontal price line", kind: "horizontal_line", available: true },
  { id: "horizontal-ray", label: "Horizontal ray (coming soon)", kind: undefined, available: false },
  { id: "vertical", label: "Vertical line", kind: "vertical_marker", available: true },
  { id: "cross-line", label: "Cross line (coming soon)", kind: undefined, available: false }
] as const;

const terminalObjectFilters: Array<{ label: string; value: TerminalObjectFilter }> = [
  { label: "All", value: "all" },
  { label: "Orders", value: "orders" },
  { label: "Drawings", value: "drawings" },
  { label: "Events", value: "events" },
  { label: "Bookmarks", value: "bookmarks" }
];

const terminalTools = [
  { id: "cursor", label: "Crosshair and cursor", kind: undefined, Icon: Crosshair, available: true },
  { id: "lines", label: "Lines and trend tools", kind: undefined, Icon: TrendingUp, available: true },
  { id: "zone", label: "Rectangle zone", kind: "zone", Icon: RectangleHorizontal, available: true },
  { id: "text", label: "Text note", kind: "text_note", Icon: Type, available: true },
  { id: "brush", label: "Brush drawing (coming soon)", kind: undefined, Icon: Brush, available: false },
  { id: "fib", label: "Fibonacci retracement", kind: "fibonacci_retracement", Icon: BarChart3, available: true },
  { id: "measure", label: "Measure", kind: "measurement_placeholder", Icon: Ruler, available: true },
  { id: "zoom", label: "Zoom in", kind: undefined, Icon: ZoomIn, available: true },
  { id: "magnet", label: "Magnet snap (coming soon)", kind: undefined, Icon: Magnet, available: false },
  { id: "lock", label: "Lock or unlock drawings", kind: undefined, Icon: Lock, available: true },
  { id: "visibility", label: "Hide or show drawings", kind: undefined, Icon: Eye, available: true },
  { id: "delete-selected", label: "Delete selected drawing", kind: undefined, Icon: X, available: true },
  { id: "delete", label: "Clear chart drawings", kind: undefined, Icon: Trash2, available: true }
] as const;

const TERMINAL_WARMUP_CANDLE_COUNT = 24;
function candleToChartData(candle: StudentPracticeCandle): KLineData {
  return {
    timestamp: Date.parse(candle.openTime),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume
  };
}

function practiceKLinePeriod(timeframeMinutes: number): Period {
  if (timeframeMinutes >= 43_200 && timeframeMinutes % 43_200 === 0) return { type: "month", span: timeframeMinutes / 43_200 };
  if (timeframeMinutes >= 10_080 && timeframeMinutes % 10_080 === 0) return { type: "week", span: timeframeMinutes / 10_080 };
  if (timeframeMinutes >= 1_440 && timeframeMinutes % 1_440 === 0) return { type: "day", span: timeframeMinutes / 1_440 };
  if (timeframeMinutes >= 60 && timeframeMinutes % 60 === 0) return { type: "hour", span: timeframeMinutes / 60 };
  return { type: "minute", span: Math.max(1, timeframeMinutes) };
}

function practiceDrawingChartPoints(
  drawing: PracticeSessionDetailResponse["annotations"][number]
): PracticeDrawingChartPoint[] {
  if ((drawing.coordinateVersion === "klinecharts_v1" || drawing.coordinateVersion === "klinecharts_v2") && drawing.chartPoints?.length) {
    return drawing.chartPoints;
  }

  const first = drawing.candleIndex === undefined
    ? undefined
    : { dataIndex: drawing.candleIndex, ...(drawing.priceLevel === undefined ? {} : { value: drawing.priceLevel }) };
  const second = drawing.secondCandleIndex === undefined
    ? undefined
    : { dataIndex: drawing.secondCandleIndex, ...(drawing.secondPriceLevel === undefined ? {} : { value: drawing.secondPriceLevel }) };

  return [first, second].filter((point): point is PracticeDrawingChartPoint => point !== undefined);
}

function normalizedPracticeDrawingPoints(points: Array<Partial<PracticeDrawingChartPoint>>): PracticeDrawingChartPoint[] {
  return points.flatMap((point) => {
    if (!Number.isFinite(Number(point.dataIndex))) return [];
    return [{
      dataIndex: Math.round(Number(point.dataIndex) * 1_000_000) / 1_000_000,
      ...(Number.isFinite(Number(point.value)) ? { value: Number(point.value) } : {})
    } satisfies PracticeDrawingChartPoint];
  });
}

function practiceDrawingGeometryChanged(
  nextPoints: PracticeDrawingChartPoint[],
  persistedPoints: PracticeDrawingChartPoint[]
) {
  return nextPoints.length === persistedPoints.length && nextPoints.some((point, index) => {
    const persisted = persistedPoints[index];
    return Math.abs(point.dataIndex - persisted.dataIndex) > 0.000001 ||
      Math.abs(Number(point.value ?? 0) - Number(persisted.value ?? 0)) > 0.000001;
  });
}

function practiceKLineOverlayName(kind: PracticeAnnotationKind) {
  if (kind === "trend_line") return PRACTICE_KLINE_TREND_OVERLAY;
  if (kind === "horizontal_line") return PRACTICE_KLINE_HORIZONTAL_OVERLAY;
  if (kind === "vertical_marker") return PRACTICE_KLINE_VERTICAL_OVERLAY;
  if (kind === "fibonacci_retracement") return PRACTICE_KLINE_FIBONACCI_OVERLAY;
  if (kind === "zone") return PRACTICE_KLINE_ZONE_OVERLAY;
  if (kind === "measurement_placeholder") return PRACTICE_KLINE_MEASURE_OVERLAY;
  return PRACTICE_KLINE_TEXT_OVERLAY;
}

function boundedIndicatorPeriod(value: number, fallback: number) {
  return Math.max(2, Math.min(Math.floor(Number.isFinite(value) ? value : fallback), 200));
}

function indicatorPoint(candle: StudentPracticeCandle, value: number): TerminalIndicatorPoint {
  return {
    time: Date.parse(candle.openTime),
    value: Math.round(value * 100_000_000) / 100_000_000
  };
}

function computeSimpleMovingAverage(candles: StudentPracticeCandle[], period: number, selector: (candle: StudentPracticeCandle) => number) {
  const points: TerminalIndicatorPoint[] = [];

  for (let index = period - 1; index < candles.length; index += 1) {
    const window = candles.slice(index - period + 1, index + 1);
    const sum = window.reduce((total, candle) => total + selector(candle), 0);
    points.push(indicatorPoint(candles[index], sum / period));
  }

  return points;
}

function computeExponentialMovingAverage(candles: StudentPracticeCandle[], period: number) {
  if (candles.length < period) {
    return [];
  }

  const points: TerminalIndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((total, candle) => total + candle.close, 0) / period;

  points.push(indicatorPoint(candles[period - 1], ema));

  for (let index = period; index < candles.length; index += 1) {
    ema = (candles[index].close - ema) * multiplier + ema;
    points.push(indicatorPoint(candles[index], ema));
  }

  return points;
}

function computeRelativeStrengthIndex(candles: StudentPracticeCandle[], period: number) {
  if (candles.length <= period) {
    return [];
  }

  const points: TerminalIndicatorPoint[] = [];
  let averageGain = 0;
  let averageLoss = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = candles[index].close - candles[index - 1].close;
    averageGain += Math.max(change, 0);
    averageLoss += Math.max(-change, 0);
  }

  averageGain /= period;
  averageLoss /= period;
  points.push(indicatorPoint(candles[period], averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss))));

  for (let index = period + 1; index < candles.length; index += 1) {
    const change = candles[index].close - candles[index - 1].close;
    averageGain = ((averageGain * (period - 1)) + Math.max(change, 0)) / period;
    averageLoss = ((averageLoss * (period - 1)) + Math.max(-change, 0)) / period;
    points.push(indicatorPoint(candles[index], averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss))));
  }

  return points;
}

function trueRange(current: StudentPracticeCandle, previous?: StudentPracticeCandle) {
  if (!previous) {
    return current.high - current.low;
  }

  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close)
  );
}

function computeAverageTrueRange(candles: StudentPracticeCandle[], period: number) {
  if (candles.length < period) {
    return [];
  }

  const ranges = candles.map((candle, index) => trueRange(candle, candles[index - 1]));
  const points: TerminalIndicatorPoint[] = [];

  for (let index = period - 1; index < candles.length; index += 1) {
    const window = ranges.slice(index - period + 1, index + 1);
    const sum = window.reduce((total, value) => total + value, 0);
    points.push(indicatorPoint(candles[index], sum / period));
  }

  return points;
}

function computePracticeTerminalIndicators(
  revealedCandlesOnly: StudentPracticeCandle[],
  settings: TerminalIndicatorSettings
): TerminalIndicatorResult {
  const hasVolume = revealedCandlesOnly.some((candle) => candle.volume > 0);
  const smaPeriod = boundedIndicatorPeriod(settings.smaPeriod, defaultIndicatorSettings.smaPeriod);
  const emaPeriod = boundedIndicatorPeriod(settings.emaPeriod, defaultIndicatorSettings.emaPeriod);
  const rsiPeriod = boundedIndicatorPeriod(settings.rsiPeriod, defaultIndicatorSettings.rsiPeriod);
  const atrPeriod = boundedIndicatorPeriod(settings.atrPeriod, defaultIndicatorSettings.atrPeriod);
  const volumeMaPeriod = boundedIndicatorPeriod(settings.volumeMaPeriod, defaultIndicatorSettings.volumeMaPeriod);

  return {
    sma: settings.smaEnabled ? computeSimpleMovingAverage(revealedCandlesOnly, smaPeriod, (candle) => candle.close) : [],
    ema: settings.emaEnabled ? computeExponentialMovingAverage(revealedCandlesOnly, emaPeriod) : [],
    rsi: settings.rsiEnabled ? computeRelativeStrengthIndex(revealedCandlesOnly, rsiPeriod) : [],
    atr: settings.atrEnabled ? computeAverageTrueRange(revealedCandlesOnly, atrPeriod) : [],
    volumeMa: settings.volumeMaEnabled && hasVolume ? computeSimpleMovingAverage(revealedCandlesOnly, volumeMaPeriod, (candle) => candle.volume) : [],
    hasVolume
  };
}

function BottomDockMetric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  const toneClass = {
    neutral: "text-[color:var(--label)]",
    green: "text-[color:var(--green)]",
    amber: "text-[color:var(--amber)]",
    red: "text-[color:var(--red)]"
  }[tone];

  return (
    <div className="grid min-w-0 gap-0.5 px-1.5">
      <p className="truncate text-[10px] font-semibold leading-3 text-[color:var(--label2)]">{label}</p>
      <p className={`min-w-0 truncate tabular-nums text-xs font-semibold leading-4 ${toneClass}`} title={value}>{value}</p>
    </div>
  );
}

function formatCompactFinancial(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value) || Math.abs(value) < 0.005) {
    return "0";
  }

  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    return `${sign}${Number((absolute / 1_000_000).toFixed(absolute >= 10_000_000 ? 0 : 2))}m`;
  }

  if (absolute >= 1_000) {
    return `${sign}${Number((absolute / 1_000).toFixed(absolute >= 10_000 ? 0 : 2))}k`;
  }

  return `${sign}${Number(absolute.toFixed(2))}`;
}

function formatTerminalNumber(value: number | undefined, digits = 2) {
  if (value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(digits);
}

function formatTerminalMoney(value: number | undefined) {
  return value === undefined || !Number.isFinite(value) ? "-" : formatPracticeMoney(value);
}

function drawingKindLabel(kind: PracticeAnnotationKind) {
  return drawingKindOptions.find((option) => option.value === kind)?.label ?? kind.replace(/_/g, " ");
}

function terminalActiveToolLabel(tool: TerminalActiveTool) {
  return tool === "zoom" ? "Zoom area" : tool === "select" ? "Cursor" : drawingKindLabel(tool);
}

function isTerminalDrawingKind(kind: TerminalActiveTool): kind is PracticeAnnotationKind {
  return kind === "trend_line" ||
    kind === "horizontal_line" ||
    kind === "vertical_marker" ||
    kind === "zone" ||
    kind === "text_note" ||
    kind === "fibonacci_retracement" ||
    kind === "measurement_placeholder";
}

function requiresTwoChartPoints(kind: PracticeAnnotationKind) {
  return kind === "trend_line" ||
    kind === "zone" ||
    kind === "fibonacci_retracement" ||
    kind === "measurement_placeholder";
}

function terminalToolRequiresDrag(kind: PracticeAnnotationKind) {
  return kind === "zone" ||
    kind === "fibonacci_retracement" ||
    kind === "measurement_placeholder";
}

function normalizeTerminalMultilineText(value: string, limit = 700) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()
    .slice(0, limit);
}

function normalizeTerminalSingleLineText(value: string, limit: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function drawingObjectTypeLabel(kind: PracticeAnnotationKind) {
  if (kind === "measurement_placeholder") {
    return "Measure";
  }

  return drawingKindLabel(kind);
}

function formatDrawingMetric(value: number | undefined, digits = 2) {
  if (value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(digits);
}

function measurementElapsedLabel(candleCount: number) {
  return `~${candleCount} bars`;
}

function buildMeasurementSummary(drawing: PracticeSessionDetailResponse["annotations"][number]) {
  if (
    drawing.priceLevel === undefined ||
    drawing.secondPriceLevel === undefined ||
    drawing.candleIndex === undefined ||
    drawing.secondCandleIndex === undefined
  ) {
    return "Select two revealed points";
  }

  const diff = drawing.secondPriceLevel - drawing.priceLevel;
  const percent = drawing.priceLevel > 0 ? diff / drawing.priceLevel * 100 : 0;
  const candles = Math.abs(drawing.secondCandleIndex - drawing.candleIndex);

  return `${formatDrawingMetric(diff, 4)} · ${formatDrawingMetric(percent, 2)}% · ${candles} candles · ${measurementElapsedLabel(candles)}`;
}

function editableKeyboardTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;

  return Boolean(element?.closest("input, textarea, select, [contenteditable='true']"));
}

function drawingColorClass(colorToken: PracticeDrawingColorToken | undefined) {
  switch (colorToken) {
    case "green":
      return "border-[color:var(--green)] text-[color:var(--green)]";
    case "amber":
      return "border-[color:var(--amber)] text-[color:var(--amber)]";
    case "red":
      return "border-[color:var(--red)] text-[color:var(--red)]";
    case "blue":
      return "border-[color:#60a5fa] text-[color:#60a5fa]";
    case "neutral":
      return "border-[color:var(--label3)] text-[color:var(--label2)]";
    default:
      return "border-[color:var(--accent)] text-[color:var(--accent)]";
  }
}

function eventImpactTone(impact: PracticeEventMarkerImpact) {
  if (impact === "high") {
    return "red";
  }

  if (impact === "medium") {
    return "amber";
  }

  return "green";
}

function eventCategoryLabel(category: PracticeEventMarkerCategory) {
  return category.replace(/_/g, " ");
}

function eventImpactRank(impact: PracticeEventMarkerImpact) {
  if (impact === "high") {
    return 3;
  }

  if (impact === "medium") {
    return 2;
  }

  return 1;
}

function highestEventImpact(events: PracticeEventMarkerSummary[]): PracticeEventMarkerImpact {
  return events.reduce<PracticeEventMarkerImpact>((highest, eventMarker) =>
    eventImpactRank(eventMarker.impact) > eventImpactRank(highest) ? eventMarker.impact : highest,
  "low");
}

function eventMarkerDotClass(impact: PracticeEventMarkerImpact) {
  if (impact === "high") {
    return "border-[color:color-mix(in_srgb,var(--red)_74%,white_8%)] bg-[color:var(--red)] text-white shadow-[0_0_0_2px_color-mix(in_srgb,var(--red)_18%,transparent)]";
  }

  if (impact === "medium") {
    return "border-[color:color-mix(in_srgb,var(--amber)_74%,white_8%)] bg-[color:var(--amber)] text-[color:var(--ink)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--amber)_16%,transparent)]";
  }

  return "border-[color:color-mix(in_srgb,var(--green)_64%,white_8%)] bg-[color:color-mix(in_srgb,var(--green)_72%,transparent)] text-white shadow-[0_0_0_2px_color-mix(in_srgb,var(--green)_14%,transparent)]";
}

function formatTerminalPrice(value: number | undefined, spec?: PracticeInstrumentSpecSummary) {
  return value === undefined || !Number.isFinite(value) ? "-" : formatPracticePrice(value, spec);
}

function formatTerminalQuantity(value: number | undefined, spec?: PracticeInstrumentSpecSummary) {
  return value === undefined || !Number.isFinite(value) ? "-" : formatPracticeQuantity(value, spec);
}

function alignTerminalPriceToTick(
  value: number,
  spec: PracticeInstrumentSpecSummary | undefined,
  direction: "up" | "down" | "nearest" = "nearest"
) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const precision = Math.max(0, Math.min(spec?.pricePrecision ?? 2, 8));
  const factor = 10 ** precision;
  const rawTick = spec?.tickSize ?? spec?.pipSize ?? 1 / factor;
  const tickUnits = Math.max(1, Math.round(rawTick * factor));
  const scaled = value * factor / tickUnits;
  const stepCount = direction === "up" ? Math.ceil(scaled) : direction === "down" ? Math.floor(scaled) : Math.round(scaled);

  return roundPracticePrice(stepCount * tickUnits / factor, spec);
}

function terminalLevelsAreDirectional(input: {
  direction: PracticeOrderDirection;
  entryPrice: number | undefined;
  stopLoss: number;
  takeProfit: number;
}) {
  if (
    !Number.isFinite(input.entryPrice) ||
    !Number.isFinite(input.stopLoss) ||
    !Number.isFinite(input.takeProfit) ||
    (input.entryPrice ?? 0) <= 0 ||
    input.stopLoss <= 0 ||
    input.takeProfit <= 0
  ) {
    return false;
  }

  return input.direction === "buy"
    ? input.stopLoss < (input.entryPrice ?? 0) && (input.entryPrice ?? 0) < input.takeProfit
    : input.takeProfit < (input.entryPrice ?? 0) && (input.entryPrice ?? 0) < input.stopLoss;
}

function buildQuickMarketOrderDraft(input: {
  direction: PracticeOrderDirection;
  entryPrice: number | undefined;
  riskAmount: number;
  spec: PracticeInstrumentSpecSummary | undefined;
  stopLoss?: number;
  takeProfit?: number;
}) {
  const entryPrice = input.entryPrice;

  if (!entryPrice || !Number.isFinite(entryPrice) || entryPrice <= 0 || !input.spec) {
    return { stopLoss: 0, takeProfit: 0, size: 0, notional: 0, usedAutoLevels: true };
  }

  const hasCustomLevels = terminalLevelsAreDirectional({
    direction: input.direction,
    entryPrice,
    stopLoss: input.stopLoss ?? 0,
    takeProfit: input.takeProfit ?? 0
  });

  const tick = input.spec.tickSize ?? input.spec.pipSize ?? 10 ** -Math.max(0, Math.min(input.spec.pricePrecision, 8));
  const defaultDistance = Math.max(entryPrice * 0.005, tick * 25);
  const stopLoss = hasCustomLevels
    ? input.stopLoss ?? 0
    : input.direction === "buy"
      ? alignTerminalPriceToTick(entryPrice - defaultDistance, input.spec, "down")
      : alignTerminalPriceToTick(entryPrice + defaultDistance, input.spec, "up");
  const takeProfit = hasCustomLevels
    ? input.takeProfit ?? 0
    : input.direction === "buy"
      ? alignTerminalPriceToTick(entryPrice + defaultDistance, input.spec, "up")
      : alignTerminalPriceToTick(entryPrice - defaultDistance, input.spec, "down");
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const size = stopDistance > 0
    ? quantizePracticeQuantityDown(input.riskAmount / (stopDistance * input.spec.contractMultiplier), input.spec)
    : 0;
  const notional = size > 0 ? practiceNotionalForInstrument(input.spec, entryPrice, size) : 0;

  return {
    stopLoss,
    takeProfit,
    size,
    notional,
    usedAutoLevels: !hasCustomLevels
  };
}

function orderInstrumentSpec(order: PracticeOrderSummary, fallback?: PracticeInstrumentSpecSummary) {
  return order.instrument ?? fallback;
}

function orderChipStatusLabel(order: PracticeOrderSummary) {
  if (order.status === "closed") {
    if (order.closeReason === "take_profit") {
      return "+TP";
    }

    if (order.closeReason === "stop_loss") {
      return "-SL";
    }

    return "closed";
  }

  return order.status;
}

function orderChipToneClass(order: PracticeOrderSummary, selected: boolean) {
  const base = order.direction === "buy"
    ? "border-[color:color-mix(in_srgb,var(--green)_70%,black)] text-[color:var(--green)]"
    : "border-[color:color-mix(in_srgb,var(--red)_72%,black)] text-[color:var(--red)]";

  return selected
    ? `${base} bg-[color:color-mix(in_srgb,var(--accent)_16%,black)] ring-1 ring-[color:var(--accent)]`
    : `${base} bg-black/95 hover:bg-white/10`;
}

const PRACTICE_TREND_DEFAULT_COLOR = "#2962ff";

function drawingColorHex(
  colorToken: PracticeDrawingColorToken | undefined,
  kind?: PracticeAnnotationKind,
  appearanceVersion?: PracticeDrawingAppearanceVersion
) {
  if (
    kind === "trend_line" &&
    (
      appearanceVersion === "trend_blue_v1" ||
      (appearanceVersion !== "user_selected_v1" && (colorToken === undefined || colorToken === "accent" || colorToken === "blue"))
    )
  ) {
    return PRACTICE_TREND_DEFAULT_COLOR;
  }

  if (
    kind === "text_note" &&
    appearanceVersion !== "user_selected_v1" &&
    (colorToken === undefined || colorToken === "accent" || colorToken === "blue")
  ) {
    return "#60a5fa";
  }

  switch (colorToken) {
    case "green":
      return "#18a999";
    case "amber":
      return "#d9a441";
    case "red":
      return "#ef4444";
    case "blue":
      return "#60a5fa";
    case "neutral":
      return "#9ca3af";
    default:
      return "#d9c28c";
  }
}

function MiniOrderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_46%,transparent)] px-2 py-1.5">
      <p className="truncate text-[9px] font-semibold uppercase leading-3 text-[color:var(--label3)]">{label}</p>
      <p className="truncate tabular-nums text-xs font-semibold leading-4 text-[color:var(--label)]">{value}</p>
    </div>
  );
}

function TerminalChart({
  candles,
  timeframeMinutes,
  orders,
  annotations,
  eventMarkers,
  showEvents,
  indicatorSettings,
  selectedOrderId,
  selectedDrawingId,
  selectedEventId,
  activeDrawingTool,
  canPlaceDrawing,
  canEditDrawings,
  onSelectOrder,
  onSelectDrawing,
  onSelectEvent,
  onPlaceDrawing,
  onMoveDrawing,
  onCancelTool
}: {
  candles: StudentPracticeCandle[];
  timeframeMinutes: number;
  orders: PracticeOrderSummary[];
  annotations: PracticeSessionDetailResponse["annotations"];
  eventMarkers: PracticeEventMarkerSummary[];
  showEvents: boolean;
  indicatorSettings: TerminalIndicatorSettings;
  selectedOrderId?: string;
  selectedDrawingId?: string;
  selectedEventId?: string;
  activeDrawingTool: TerminalActiveTool;
  canPlaceDrawing: boolean;
  canEditDrawings: boolean;
  onSelectOrder: (orderId: string) => void;
  onSelectDrawing: (drawingId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onPlaceDrawing: (placement: TerminalChartDrawingPlacement) => Promise<boolean>;
  onMoveDrawing: (drawingId: string, chartPoints: PracticeDrawingChartPoint[]) => Promise<void>;
  onCancelTool: (message?: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const chartDataRef = useRef<KLineData[]>([]);
  const disposeChartRef = useRef<((chart: Chart) => void) | null>(null);
  const initialViewportAppliedRef = useRef(false);
  const viewportRestoreFrameRef = useRef<number | null>(null);
  const viewportModeRef = useRef<"uninitialized" | "live" | "historical">("uninitialized");
  const historicalRightDataIndexRef = useRef<number | null>(null);
  const isRestoringViewportRef = useRef(false);
  const selectDrawingRef = useRef(onSelectDrawing);
  const selectedDrawingIdRef = useRef(selectedDrawingId);
  const moveDrawingRef = useRef(onMoveDrawing);
  const nativeOverlayMoveRef = useRef<{
    drawingId: string;
    persistedPoints: PracticeDrawingChartPoint[];
  } | null>(null);
  const hoverClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [plotBounds, setPlotBounds] = useState<TerminalPlotBounds | null>(null);
  const [isKLineReady, setIsKLineReady] = useState(false);
  const [visibleRangeVersion, setVisibleRangeVersion] = useState(0);
  const [hoveredEventGroupId, setHoveredEventGroupId] = useState("");
  const dragDraftRef = useRef<TerminalChartDragDraft | null>(null);
  const trendLineDraftRef = useRef<TerminalTrendLineDraft | null>(null);
  const [textDraft, setTextDraft] = useState<TerminalTextDraft | null>(null);
  const textDraftRef = useRef<TerminalTextDraft | null>(null);
  const textEditorRef = useRef<HTMLDivElement | null>(null);
  const textEditorInputRef = useRef<HTMLTextAreaElement | null>(null);
  const textCommitInFlightRef = useRef(false);
  const commitTextDraftRef = useRef<() => Promise<void>>(async () => {});
  const textDiscardedRef = useRef(false);
  const activeDrawingToolRef = useRef(activeDrawingTool);
  const [textDraftSaveState, setTextDraftSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [zoomHistory, setZoomHistory] = useState<Array<{ barSpace: number; rightDataIndex: number; offsetRightDistance: number }>>([]);
  const chartData = useMemo(() => candles.map(candleToChartData), [candles]);
  const lastCandle = candles[candles.length - 1];
  const terminalDrawings = useMemo(() => annotations.filter((annotation) => isTerminalDrawingKind(annotation.kind)), [annotations]);
  const selectedTerminalDrawing = useMemo(
    () => terminalDrawings.find((drawing) => drawing.annotationId === selectedDrawingId),
    [selectedDrawingId, terminalDrawings]
  );
  useEffect(() => {
    selectDrawingRef.current = onSelectDrawing;
    selectedDrawingIdRef.current = selectedDrawingId;
    moveDrawingRef.current = onMoveDrawing;
  }, [onMoveDrawing, onSelectDrawing, selectedDrawingId]);
  useEffect(() => {
    activeDrawingToolRef.current = activeDrawingTool;
  }, [activeDrawingTool]);
  useEffect(() => {
    const finishNativeOverlayMove = () => {
      const pendingMove = nativeOverlayMoveRef.current;
      if (!pendingMove) return;

      window.requestAnimationFrame(() => {
        if (nativeOverlayMoveRef.current !== pendingMove) return;
        nativeOverlayMoveRef.current = null;
        const overlay = chartRef.current?.getOverlays({ id: pendingMove.drawingId })[0];
        if (!overlay) return;
        const nextPoints = normalizedPracticeDrawingPoints(overlay.points);
        if (practiceDrawingGeometryChanged(nextPoints, pendingMove.persistedPoints)) {
          void moveDrawingRef.current(pendingMove.drawingId, nextPoints);
        }
      });
    };
    const cancelNativeOverlayMove = () => {
      nativeOverlayMoveRef.current = null;
    };

    window.addEventListener("pointerup", finishNativeOverlayMove, true);
    window.addEventListener("pointercancel", cancelNativeOverlayMove, true);
    return () => {
      window.removeEventListener("pointerup", finishNativeOverlayMove, true);
      window.removeEventListener("pointercancel", cancelNativeOverlayMove, true);
    };
  }, []);
  const measureCandlePlot = useCallback(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    const plot = chart?.getDom("candle_pane", "main");
    if (!container || !plot) return;
    const containerRect = container.getBoundingClientRect();
    const plotRect = plot.getBoundingClientRect();
    if (plotRect.width <= 0 || plotRect.height <= 0) return;
    setPlotBounds({
      left: plotRect.left - containerRect.left,
      top: plotRect.top - containerRect.top,
      width: plotRect.width,
      height: plotRect.height
    });
  }, []);
  const eventGroups = useMemo(() => {
    if (visibleRangeVersion < 0) {
      return [];
    }

    const chart = chartRef.current;

    if (!showEvents || !chart || chartWidth <= 0 || candles.length === 0 || eventMarkers.length === 0) {
      return [];
    }

    const positionedEvents = eventMarkers
      .map((eventMarker) => {
        const eventTimeMs = Date.parse(eventMarker.eventTime);

        if (!Number.isFinite(eventTimeMs)) {
          return undefined;
        }

        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        candles.forEach((candle, index) => {
          const candleTimeMs = Date.parse(candle.closeTime);
          const distance = Number.isFinite(candleTimeMs) ? Math.abs(candleTimeMs - eventTimeMs) : Number.POSITIVE_INFINITY;

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        const closestCandle = candles[closestIndex];
        const rawCoordinate = chart.convertToPixel({ dataIndex: closestIndex, value: closestCandle.close });
        const xCoordinate = Array.isArray(rawCoordinate) || rawCoordinate.x === undefined ? null : Number(rawCoordinate.x);

        if (xCoordinate === null || !Number.isFinite(xCoordinate) || xCoordinate < 0 || xCoordinate > chartWidth) {
          return undefined;
        }

        return {
          eventMarker,
          candleIndex: closestIndex,
          xCoordinate
        } satisfies TerminalEventPosition;
      })
      .filter((entry): entry is TerminalEventPosition => entry !== undefined)
      .sort((left, right) => left.candleIndex - right.candleIndex);
    const groups: Array<{
      candleIndex: number;
      xCoordinate: number;
      events: PracticeEventMarkerSummary[];
    }> = [];
    const minMarkerSpacingPx = 18;

    for (const entry of positionedEvents) {
      const previous = groups[groups.length - 1];
      const previousXPx = previous?.xCoordinate ?? Number.NEGATIVE_INFINITY;
      const currentXPx = entry.xCoordinate;

      if (previous && (entry.candleIndex === previous.candleIndex || currentXPx - previousXPx < minMarkerSpacingPx)) {
        previous.events.push(entry.eventMarker);
        previous.candleIndex = Math.round((previous.candleIndex + entry.candleIndex) / 2);
        previous.xCoordinate = (previous.xCoordinate + entry.xCoordinate) / 2;
      } else {
        groups.push({
          candleIndex: entry.candleIndex,
          xCoordinate: entry.xCoordinate,
          events: [entry.eventMarker]
        });
      }
    }

    return groups
      .map((group) => ({
        ...group,
        impact: highestEventImpact(group.events),
        groupId: group.events.map((eventMarker) => eventMarker.eventId).join("__")
      }))
      .sort((left, right) => left.candleIndex - right.candleIndex);
  }, [candles, chartWidth, eventMarkers, showEvents, visibleRangeVersion]);
  const pinnedEventGroup = eventGroups.find((group) =>
    group.events.some((eventMarker) => eventMarker.eventId === selectedEventId)
  );
  const hoveredEventGroup = eventGroups.find((group) => group.groupId === hoveredEventGroupId);
  const activeEventGroup = hoveredEventGroup ?? pinnedEventGroup;

  function showEventGroupTooltip(groupId: string) {
    if (hoverClearTimerRef.current) {
      clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }

    setHoveredEventGroupId(groupId);
  }

  function scheduleHideEventGroupTooltip() {
    if (hoverClearTimerRef.current) {
      clearTimeout(hoverClearTimerRef.current);
    }

    hoverClearTimerRef.current = setTimeout(() => {
      setHoveredEventGroupId("");
      hoverClearTimerRef.current = null;
    }, 140);
  }

  const chartPointFromCoordinates = useCallback((xCoordinate: number, yCoordinate: number): TerminalChartPoint | undefined => {
    const chart = chartRef.current;
    const maxCandleIndex = candles.length - 1;

    if (!chart || maxCandleIndex < 0 || !plotBounds || plotBounds.width <= 0 || plotBounds.height <= 0) {
      return undefined;
    }

    const boundedX = Math.max(0, Math.min(xCoordinate, plotBounds.width));
    const boundedY = Math.max(0, Math.min(yCoordinate, plotBounds.height));
    const converted = chart.convertFromPixel([{ x: boundedX, y: boundedY }], { paneId: "candle_pane" });
    const convertedPoint = Array.isArray(converted) ? converted[0] : converted;
    const zeroPixel = chart.convertToPixel({ dataIndex: 0 }, { paneId: "candle_pane" });
    const onePixel = chart.convertToPixel({ dataIndex: 1 }, { paneId: "candle_pane" });
    const zeroX = Array.isArray(zeroPixel) ? Number.NaN : Number(zeroPixel.x);
    const oneX = Array.isArray(onePixel) ? Number.NaN : Number(onePixel.x);
    const pixelsPerDataIndex = oneX - zeroX;
    const convertedDataIndex = Number(convertedPoint?.dataIndex);
    const rawDataIndex = Number.isFinite(zeroX) && Number.isFinite(pixelsPerDataIndex) && Math.abs(pixelsPerDataIndex) > 0.0001
      ? (boundedX - zeroX) / pixelsPerDataIndex
      : convertedDataIndex;
    if (!Number.isFinite(rawDataIndex)) return undefined;
    const dataIndex = Math.round(rawDataIndex * 1_000_000) / 1_000_000;
    const candleIndex = Math.max(0, Math.min(Math.round(dataIndex), maxCandleIndex));
    const priceLevel = Number.isFinite(Number(convertedPoint?.value)) ? Number(convertedPoint?.value) : undefined;

    return {
      x: boundedX,
      y: boundedY,
      dataIndex,
      candleIndex,
      priceLevel
    };
  }, [candles.length, plotBounds]);

  function terminalOverlayPoint(point: TerminalChartPoint): PracticeDrawingChartPoint {
    return {
      dataIndex: point.dataIndex,
      ...(point.priceLevel === undefined ? {} : { value: point.priceLevel })
    };
  }

  function clearKLineDraft() {
    chartRef.current?.removeOverlay({ groupId: PRACTICE_KLINE_DRAFT_GROUP });
  }

  function clearTextDraft() {
    textDraftRef.current = null;
    textDiscardedRef.current = true;
    setTextDraft(null);
    setTextDraftSaveState("idle");
  }

  function placeTextDraft(point: TerminalChartPoint) {
    const nextDraft = { ...point, text: "" } satisfies TerminalTextDraft;
    textDiscardedRef.current = false;
    textDraftRef.current = nextDraft;
    setTextDraft(nextDraft);
    setTextDraftSaveState("idle");
  }

  function updateTextDraftValue(text: string) {
    setTextDraft((current) => {
      if (!current) return current;
      const nextDraft = { ...current, text };
      textDraftRef.current = nextDraft;
      return nextDraft;
    });
    setTextDraftSaveState("idle");
  }

  function renderKLineDraft(kind: TerminalActiveTool, start: TerminalChartPoint, end: TerminalChartPoint) {
    const chart = chartRef.current;
    if (!chart) return;
    const name = kind === "zoom"
      ? PRACTICE_KLINE_ZONE_OVERLAY
      : isTerminalDrawingKind(kind)
        ? practiceKLineOverlayName(kind)
        : PRACTICE_KLINE_ZONE_OVERLAY;
    const isUp = (end.priceLevel ?? 0) >= (start.priceLevel ?? 0);
    const color = kind === "measurement_placeholder" ? (isUp ? "#60a5fa" : "#ef4444") : kind === "zoom" ? "#60a5fa" : kind === "trend_line" ? PRACTICE_TREND_DEFAULT_COLOR : "#d9c28c";
    const id = kind === "trend_line" ? "practice-kline-trend-draft" : "practice-kline-drag-draft";
    const nextPoints = [terminalOverlayPoint(start), terminalOverlayPoint(end)];
    const existing = chart.getOverlays({ id })[0];

    if (existing) {
      chart.overrideOverlay({ id, points: nextPoints, extendData: { color } });
      return;
    }

    chart.createOverlay({
      id,
      name,
      groupId: PRACTICE_KLINE_DRAFT_GROUP,
      zLevel: 30,
      points: nextPoints,
      lock: true,
      needDefaultPointFigure: false,
      extendData: { color },
      styles: {
        line: { color, style: "solid", size: 2 },
        polygon: { color: `${color}22`, borderColor: color, borderSize: 1 },
        point: { color: "transparent", borderColor: "transparent", borderSize: 0, radius: 0 }
      }
    });
  }

  function handleDrawingCapturePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const point = chartPointFromCoordinates(event.clientX - rect.left, event.clientY - rect.top);

    event.preventDefault();
    event.stopPropagation();

    if (!point || !canPlaceDrawing || activeDrawingTool === "select") {
      return;
    }

    if (activeDrawingTool === "text_note" || activeDrawingTool === "trend_line") {
      return;
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Safari can throw when pointer capture is unavailable for a synthetic touch/mouse transition.
    }

    const nextDraft = {
      kind: activeDrawingTool,
      pointerId: event.pointerId,
      start: point,
      current: point
    } satisfies TerminalChartDragDraft;
    dragDraftRef.current = nextDraft;
    renderKLineDraft(activeDrawingTool, point, point);
  }

  function handleDrawingCapturePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const currentTrendLineDraft = trendLineDraftRef.current;

    if (activeDrawingTool === "trend_line" && currentTrendLineDraft) {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = chartPointFromCoordinates(event.clientX - rect.left, event.clientY - rect.top);

      event.preventDefault();
      event.stopPropagation();

      if (point) {
        const nextDraft = { ...currentTrendLineDraft, current: point };
        trendLineDraftRef.current = nextDraft;
        renderKLineDraft("trend_line", nextDraft.start, point);
      }

      return;
    }

    const currentDraft = dragDraftRef.current;

    if (!currentDraft || event.pointerId !== currentDraft.pointerId) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const point = chartPointFromCoordinates(event.clientX - rect.left, event.clientY - rect.top);

    event.preventDefault();
    event.stopPropagation();

    if (point) {
      const nextDraft = { ...currentDraft, current: point };
      dragDraftRef.current = nextDraft;
      renderKLineDraft(currentDraft.kind, currentDraft.start, point);
    }
  }

  function handleDrawingCapturePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeDrawingTool === "text_note") {
      if (event.button !== 0 || !event.isPrimary) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const point = chartPointFromCoordinates(event.clientX - rect.left, event.clientY - rect.top);
      event.preventDefault();
      event.stopPropagation();
      if (point) placeTextDraft(point);
      return;
    }

    if (activeDrawingTool === "trend_line") {
      if (event.button !== 0 || !event.isPrimary) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const point = chartPointFromCoordinates(event.clientX - rect.left, event.clientY - rect.top);

      event.preventDefault();
      event.stopPropagation();

      if (!point) {
        return;
      }

      const currentTrendLineDraft = trendLineDraftRef.current;

      if (!currentTrendLineDraft) {
        trendLineDraftRef.current = { start: point, current: point };
        renderKLineDraft("trend_line", point, point);
        return;
      }

      trendLineDraftRef.current = null;
      clearKLineDraft();
      onCancelTool("Trend line completed. Select restored.");
      void onPlaceDrawing({
        kind: "trend_line",
        candleIndex: currentTrendLineDraft.start.candleIndex,
        priceLevel: currentTrendLineDraft.start.priceLevel,
        secondCandleIndex: point.candleIndex,
        secondPriceLevel: point.priceLevel,
        coordinateVersion: "klinecharts_v2",
        chartPoints: [
          { dataIndex: currentTrendLineDraft.start.dataIndex, ...(currentTrendLineDraft.start.priceLevel === undefined ? {} : { value: currentTrendLineDraft.start.priceLevel }) },
          { dataIndex: point.dataIndex, ...(point.priceLevel === undefined ? {} : { value: point.priceLevel }) }
        ]
      });
      return;
    }

    const currentDraft = dragDraftRef.current;

    if (!currentDraft || event.pointerId !== currentDraft.pointerId) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const endPoint = chartPointFromCoordinates(event.clientX - rect.left, event.clientY - rect.top) ?? currentDraft.current;
    const pixelDistance = Math.hypot(endPoint.x - currentDraft.start.x, endPoint.y - currentDraft.start.y);

    event.preventDefault();
    event.stopPropagation();
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer capture can be absent after Safari cancels a gesture; the draft still resolves safely.
    }
    dragDraftRef.current = null;
    clearKLineDraft();

    if (currentDraft.kind === "zoom") {
      if (pixelDistance < 14) {
        return;
      }

      const chart = chartRef.current;
      const visibleRange = chart?.getVisibleRange();

      if (chart && visibleRange) {
        const zoomBaseline = {
          barSpace: chart.getBarSpace().bar,
          rightDataIndex: visibleRange.to,
          offsetRightDistance: chart.getOffsetRightDistance()
        };
        setZoomHistory((current) => [...current.slice(-5), zoomBaseline]);
        const from = Math.min(currentDraft.start.dataIndex, endPoint.dataIndex);
        const to = Math.max(currentDraft.start.dataIndex, endPoint.dataIndex);
        const selectedBars = Math.max(2, to - from + 1);
        chart.setBarSpace(Math.max(4, Math.min(34, (plotBounds?.width ?? chartWidth) / selectedBars)));
        chart.scrollToDataIndex(to);
        const zoomedRange = chart.getVisibleRange();
        viewportModeRef.current = "historical";
        historicalRightDataIndexRef.current = zoomedRange.to;
      }

      onCancelTool("Zoom rectangle applied. Select restored.");

      return;
    }

    if (!isTerminalDrawingKind(currentDraft.kind)) {
      return;
    }

    if (terminalToolRequiresDrag(currentDraft.kind)) {
      if (pixelDistance < 10) {
        onCancelTool(`${drawingKindLabel(currentDraft.kind)} cancelled. Drag across the chart to place it.`);
        return;
      }

      onCancelTool(`${drawingKindLabel(currentDraft.kind)} completed. Select restored.`);
      void onPlaceDrawing({
        kind: currentDraft.kind,
        candleIndex: currentDraft.start.candleIndex,
        priceLevel: currentDraft.start.priceLevel,
        secondCandleIndex: endPoint.candleIndex,
        secondPriceLevel: endPoint.priceLevel,
        coordinateVersion: "klinecharts_v2",
        chartPoints: [
          { dataIndex: currentDraft.start.dataIndex, ...(currentDraft.start.priceLevel === undefined ? {} : { value: currentDraft.start.priceLevel }) },
          { dataIndex: endPoint.dataIndex, ...(endPoint.priceLevel === undefined ? {} : { value: endPoint.priceLevel }) }
        ]
      });
      return;
    }

    onCancelTool(`${drawingKindLabel(currentDraft.kind)} completed. Select restored.`);
    void onPlaceDrawing({
      kind: currentDraft.kind,
      candleIndex: currentDraft.start.candleIndex,
      priceLevel: currentDraft.start.priceLevel,
      coordinateVersion: "klinecharts_v2",
      chartPoints: [{ dataIndex: currentDraft.start.dataIndex, ...(currentDraft.start.priceLevel === undefined ? {} : { value: currentDraft.start.priceLevel }) }]
    });
  }

  function handleDrawingCapturePointerCancel(event?: ReactPointerEvent<HTMLDivElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    try {
      if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Safe no-op when the browser has already cancelled pointer capture.
    }
    dragDraftRef.current = null;
    trendLineDraftRef.current = null;
    nativeOverlayMoveRef.current = null;
    clearTextDraft();
    clearKLineDraft();
    onCancelTool("Drawing cancelled. Select restored.");
  }

  async function commitTextDraft() {
    const draft = textDraftRef.current;
    if (!draft || textCommitInFlightRef.current || textDiscardedRef.current) return;

    const text = normalizeTerminalMultilineText(draft.text);
    if (text.length < 2) {
      clearTextDraft();
      if (activeDrawingToolRef.current === "text_note") {
        onCancelTool("Blank text note discarded. Select restored.");
      }
      return;
    }

    textCommitInFlightRef.current = true;
    setTextDraftSaveState("saving");
    const saved = await onPlaceDrawing({
      kind: "text_note",
      candleIndex: draft.candleIndex,
      priceLevel: draft.priceLevel,
      text,
      coordinateVersion: "klinecharts_v2",
      chartPoints: [{ dataIndex: draft.dataIndex, ...(draft.priceLevel === undefined ? {} : { value: draft.priceLevel }) }]
    });
    textCommitInFlightRef.current = false;

    if (saved) {
      clearTextDraft();
      if (activeDrawingToolRef.current === "text_note") {
        onCancelTool("Text note added. Select restored.");
      }
      return;
    }

    textDiscardedRef.current = false;
    setTextDraftSaveState("error");
    if (activeDrawingToolRef.current !== "text_note") {
      onCancelTool("Text note was not saved. Your text is still available.");
    }
    window.requestAnimationFrame(() => textEditorInputRef.current?.focus());
  }

  function discardTextDraft() {
    clearTextDraft();
    onCancelTool("Text note cancelled. Select restored.");
  }
  commitTextDraftRef.current = commitTextDraft;

  function zoomOutOneStep() {
    const chart = chartRef.current;
    const baseline = zoomHistory[0];
    if (viewportRestoreFrameRef.current !== null) {
      window.cancelAnimationFrame(viewportRestoreFrameRef.current);
      viewportRestoreFrameRef.current = null;
    }
    isRestoringViewportRef.current = true;
    if (chart) {
      const plotWidth = plotBounds?.width ?? chart.getSize("candle_pane", "main")?.width ?? chartWidth;
      chart.setBarSpace(baseline?.barSpace ?? Math.max(4, Math.min(18, plotWidth / Math.max(candles.length + 10, 24))));
      chart.setOffsetRightDistance(baseline?.offsetRightDistance ?? Math.max(96, Math.round(plotWidth * 0.24)));
      chart.scrollToDataIndex(baseline?.rightDataIndex ?? Math.max(0, candles.length - 1));
      const restoredRightDataIndex = baseline?.rightDataIndex ?? candles.length - 1;
      viewportModeRef.current = restoredRightDataIndex < candles.length - 1 ? "historical" : "live";
      historicalRightDataIndexRef.current = viewportModeRef.current === "historical" ? restoredRightDataIndex : null;
    }
    isRestoringViewportRef.current = false;
    setZoomHistory([]);
  }

  useEffect(() => () => {
    if (hoverClearTimerRef.current) {
      clearTimeout(hoverClearTimerRef.current);
    }
  }, []);

  useEffect(() => {
    dragDraftRef.current = null;
    trendLineDraftRef.current = null;
    chartRef.current?.removeOverlay({ groupId: PRACTICE_KLINE_DRAFT_GROUP });
  }, [activeDrawingTool]);

  useEffect(() => {
    if (!textDraft) return undefined;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (textEditorRef.current?.contains(event.target as Node)) return;
      void commitTextDraftRef.current();
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [textDraft]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const initialRect = container.getBoundingClientRect();
    setChartWidth(initialRect.width);

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;

      if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height)) {
        setChartWidth(rect.width);
        chartRef.current?.resize();
        setVisibleRangeVersion((current) => current + 1);
        window.requestAnimationFrame(measureCandlePlot);
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [measureCandlePlot]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    let cancelled = false;
    const handleVisibleRangeChange = () => setVisibleRangeVersion((current) => current + 1);
    const handleViewportInteraction = () => {
      if (isRestoringViewportRef.current) return;
      const chart = chartRef.current;
      const dataCount = chart?.getDataList().length ?? 0;
      const visibleRange = chart?.getVisibleRange();
      if (!chart || !visibleRange || dataCount <= 0) return;
      if (visibleRange.to < dataCount - 1) {
        viewportModeRef.current = "historical";
        historicalRightDataIndexRef.current = visibleRange.to;
      } else {
        viewportModeRef.current = "live";
        historicalRightDataIndexRef.current = null;
      }
    };

    void registerPracticeKLineChartOverlays().then((klinecharts) => {
      if (cancelled) return;
      const chart = klinecharts.init(container, {
        locale: "en-US",
        timezone: "UTC",
        styles: "dark",
        zoomAnchor: "cursor",
        layout: {
          barSpaceLimit: { min: 2, max: 34 },
          yAxis: { position: "right", inside: false }
        }
      });
      if (!chart) return;
      chartRef.current = chart;
      window.__TRADEHUB_PRACTICE_KLINECHART__ = chart;
      disposeChartRef.current = klinecharts.dispose;
      chart.setDataLoader({
        getBars: ({ type, callback }) => {
          callback(type === "init" ? chartDataRef.current : [], { forward: false, backward: false });
        }
      });
      chart.setSymbol({ ticker: "PRACTICE", pricePrecision: 8, volumePrecision: 8 });
      chart.setPeriod(practiceKLinePeriod(timeframeMinutes));
      chart.setRightMinVisibleBarCount(12);
      chart.setMaxOffsetLeftDistance(100_000);
      chart.setMaxOffsetRightDistance(100_000);
      chart.subscribeAction("onVisibleRangeChange", handleVisibleRangeChange);
      chart.subscribeAction("onScroll", handleViewportInteraction);
      chart.subscribeAction("onZoom", handleViewportInteraction);
      chart.resetData();
      setIsKLineReady(true);
      setVisibleRangeVersion((current) => current + 1);
      window.requestAnimationFrame(measureCandlePlot);
    });

    return () => {
      cancelled = true;
      const chart = chartRef.current;
      if (chart) {
        chart.unsubscribeAction("onVisibleRangeChange", handleVisibleRangeChange);
        chart.unsubscribeAction("onScroll", handleViewportInteraction);
        chart.unsubscribeAction("onZoom", handleViewportInteraction);
        disposeChartRef.current?.(chart);
      }
      chartRef.current = null;
      disposeChartRef.current = null;
      delete window.__TRADEHUB_PRACTICE_KLINECHART__;
      setIsKLineReady(false);
      initialViewportAppliedRef.current = false;
      viewportModeRef.current = "uninitialized";
      historicalRightDataIndexRef.current = null;
      isRestoringViewportRef.current = false;
      if (viewportRestoreFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportRestoreFrameRef.current);
        viewportRestoreFrameRef.current = null;
      }
    };
  }, [measureCandlePlot, timeframeMinutes]);

  useEffect(() => {
    const chart = chartRef.current;
    chartDataRef.current = chartData;
    if (!chart) {
      return;
    }

    const previousDataCount = chart.getDataList().length;
    const previousBarSpace = chart.getBarSpace().bar;
    const previousOffsetRightDistance = chart.getOffsetRightDistance();
    const previousVisibleRange = chart.getVisibleRange();
    const previousAnchorDataIndex = Math.round((previousVisibleRange.from + previousVisibleRange.to) / 2);
    const previousAnchorPixel = chart.convertToPixel({ dataIndex: previousAnchorDataIndex });
    const previousAnchorPixelX = !Array.isArray(previousAnchorPixel) && typeof previousAnchorPixel.x === "number"
      ? previousAnchorPixel.x
      : null;
    if (viewportModeRef.current === "uninitialized") {
      viewportModeRef.current = previousDataCount > 0 && previousVisibleRange.to < previousDataCount - 1
        ? "historical"
        : "live";
    }
    if (viewportModeRef.current === "historical" && historicalRightDataIndexRef.current === null) {
      historicalRightDataIndexRef.current = previousVisibleRange.to;
    }
    const wasAtLiveEdge = viewportModeRef.current !== "historical";
    const historicalRightDataIndex = historicalRightDataIndexRef.current ?? previousVisibleRange.to;

    chart.resetData();

    chart.removeOverlay({ groupId: PRACTICE_KLINE_PRICE_GROUP });
    if (lastCandle) {
      chart.createOverlay({
        id: "practice-current-price",
        name: "horizontalStraightLine",
        groupId: PRACTICE_KLINE_PRICE_GROUP,
        points: [{ dataIndex: chartData.length - 1, value: lastCandle.close }],
        lock: true,
        needDefaultPointFigure: false,
        styles: { line: { color: "#18a999", style: "dashed", size: 1 } }
      });
    }

    if (viewportRestoreFrameRef.current !== null) {
      window.cancelAnimationFrame(viewportRestoreFrameRef.current);
    }

    if (chartData.length > 0 && chartWidth > 0 && !initialViewportAppliedRef.current) {
      initialViewportAppliedRef.current = true;
      viewportRestoreFrameRef.current = window.requestAnimationFrame(() => {
        isRestoringViewportRef.current = true;
        const plotWidth = chart.getSize("candle_pane", "main")?.width ?? chartWidth;
        chart.setBarSpace(Math.max(4, Math.min(18, plotWidth / Math.max(chartData.length + 10, 24))));
        chart.scrollToDataIndex(chartData.length - 1);
        chart.setOffsetRightDistance(Math.max(96, Math.round(plotWidth * 0.24)));
        viewportModeRef.current = "live";
        historicalRightDataIndexRef.current = null;
        isRestoringViewportRef.current = false;
        viewportRestoreFrameRef.current = null;
      });
    } else if (chartData.length > 0 && previousDataCount > 0) {
      viewportRestoreFrameRef.current = window.requestAnimationFrame(() => {
        isRestoringViewportRef.current = true;
        const restoreHistoricalViewport = () => {
          chart.setBarSpace(previousBarSpace);
          chart.setOffsetRightDistance(previousOffsetRightDistance);
          chart.scrollToDataIndex(historicalRightDataIndex);
          const restoredAnchorPixel = chart.convertToPixel({ dataIndex: previousAnchorDataIndex });
          if (!Array.isArray(restoredAnchorPixel) && typeof restoredAnchorPixel.x === "number" && previousAnchorPixelX !== null) {
            chart.scrollByDistance(previousAnchorPixelX - restoredAnchorPixel.x);
          }
          historicalRightDataIndexRef.current = chart.getVisibleRange().to;
        };

        chart.setBarSpace(previousBarSpace);
        chart.setOffsetRightDistance(previousOffsetRightDistance);
        if (!wasAtLiveEdge) {
          restoreHistoricalViewport();
          viewportRestoreFrameRef.current = window.requestAnimationFrame(() => {
            restoreHistoricalViewport();
            isRestoringViewportRef.current = false;
            viewportRestoreFrameRef.current = null;
          });
          return;
        }
        isRestoringViewportRef.current = false;
        viewportRestoreFrameRef.current = null;
      });
    }

    setVisibleRangeVersion((current) => current + 1);
  }, [chartData, chartWidth, isKLineReady, lastCandle]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.removeIndicator({ name: "MA" });
    chart.removeIndicator({ name: "EMA" });
    chart.removeIndicator({ name: "RSI" });
    chart.removeIndicator({ name: PRACTICE_KLINE_ATR_INDICATOR });
    chart.removeIndicator({ name: "VOL" });

    if (indicatorSettings.smaEnabled) {
      chart.createIndicator({
        name: "MA",
        paneId: "candle_pane",
        calcParams: [boundedIndicatorPeriod(indicatorSettings.smaPeriod, defaultIndicatorSettings.smaPeriod)]
      }, true);
    }
    if (indicatorSettings.emaEnabled) {
      chart.createIndicator({
        name: "EMA",
        paneId: "candle_pane",
        calcParams: [boundedIndicatorPeriod(indicatorSettings.emaPeriod, defaultIndicatorSettings.emaPeriod)]
      }, true);
    }
    if (indicatorSettings.rsiEnabled) {
      chart.createIndicator({
        name: "RSI",
        paneId: PRACTICE_KLINE_RSI_PANE,
        calcParams: [boundedIndicatorPeriod(indicatorSettings.rsiPeriod, defaultIndicatorSettings.rsiPeriod)]
      });
    }
    if (indicatorSettings.atrEnabled) {
      chart.createIndicator({
        name: PRACTICE_KLINE_ATR_INDICATOR,
        paneId: PRACTICE_KLINE_ATR_PANE,
        calcParams: [boundedIndicatorPeriod(indicatorSettings.atrPeriod, defaultIndicatorSettings.atrPeriod)]
      });
    }
    if (indicatorSettings.volumeMaEnabled) {
      chart.createIndicator({
        name: "VOL",
        paneId: PRACTICE_KLINE_VOLUME_PANE,
        calcParams: [boundedIndicatorPeriod(indicatorSettings.volumeMaPeriod, defaultIndicatorSettings.volumeMaPeriod)]
      });
    }
    window.requestAnimationFrame(measureCandlePlot);
  }, [
    indicatorSettings.atrEnabled,
    indicatorSettings.atrPeriod,
    indicatorSettings.emaEnabled,
    indicatorSettings.emaPeriod,
    indicatorSettings.rsiEnabled,
    indicatorSettings.rsiPeriod,
    indicatorSettings.smaEnabled,
    indicatorSettings.smaPeriod,
    indicatorSettings.volumeMaEnabled,
    indicatorSettings.volumeMaPeriod,
    isKLineReady,
    measureCandlePlot
  ]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const isNavigationMode = activeDrawingTool === "select";
    chart.setScrollEnabled(isNavigationMode);
    chart.setZoomEnabled(isNavigationMode);
  }, [activeDrawingTool, isKLineReady]);

  useEffect(() => {
    const chart = chartRef.current;

    if (!chart) {
      return undefined;
    }

    chart.removeOverlay({ groupId: PRACTICE_KLINE_DRAWING_GROUP });
    for (const drawing of terminalDrawings) {
      const points = practiceDrawingChartPoints(drawing);
      if (!points.length) continue;
      const color = drawingColorHex(drawing.colorToken, drawing.kind, drawing.appearanceVersion);
      const isMeasureUp = (points[1]?.value ?? points[0]?.value ?? 0) >= (points[0]?.value ?? 0);
      const overlayColor = drawing.kind === "measurement_placeholder" ? (isMeasureUp ? "#60a5fa" : "#ef4444") : color;
      chart.createOverlay({
        id: drawing.annotationId,
        name: practiceKLineOverlayName(drawing.kind),
        groupId: PRACTICE_KLINE_DRAWING_GROUP,
        zLevel: 20,
        points,
        lock: !canEditDrawings,
        needDefaultPointFigure: true,
        extendData: { text: drawing.kind === "text_note" ? drawing.text : undefined, color: overlayColor },
        styles: {
          line: { color: overlayColor, size: 2, style: "solid" },
          polygon: { color: `${overlayColor}22`, borderColor: overlayColor, borderSize: 1 },
          point: {
            color: "#050506",
            borderColor: overlayColor,
            borderSize: 2,
            radius: 7,
            activeColor: "#050506",
            activeBorderColor: "#f8fafc",
            activeBorderSize: 2,
            activeRadius: 9
          },
          backgroundColor: `${overlayColor}22`,
          tipBackgroundColor: overlayColor,
          lineColor: overlayColor
        },
        onClick: (event: OverlayEvent<unknown>) => selectDrawingRef.current(event.overlay.id),
        onSelected: (event: OverlayEvent<unknown>) => selectDrawingRef.current(event.overlay.id),
        onPressedMoveStart: (event: OverlayEvent<unknown>) => {
          // KLineChart requires an explicit start handler before it owns a handle drag.
          nativeOverlayMoveRef.current = {
            drawingId: drawing.annotationId,
            persistedPoints: normalizedPracticeDrawingPoints(points)
          };
          if (selectedDrawingIdRef.current !== event.overlay.id) {
            selectDrawingRef.current(event.overlay.id);
          }
        },
        onPressedMoving: () => {
          // Native overlay geometry is updated by KLineChart while the pointer moves.
        },
        onPressedMoveEnd: (event: OverlayEvent<unknown>) => {
          const pendingMove = nativeOverlayMoveRef.current;
          nativeOverlayMoveRef.current = null;
          const nextPoints = normalizedPracticeDrawingPoints(event.overlay.points);
          const persistedPoints = pendingMove?.drawingId === drawing.annotationId
            ? pendingMove.persistedPoints
            : normalizedPracticeDrawingPoints(points);
          if (practiceDrawingGeometryChanged(nextPoints, persistedPoints)) {
            void moveDrawingRef.current(drawing.annotationId, nextPoints);
          }
        }
      });
    }

    return undefined;
  }, [canEditDrawings, isKLineReady, terminalDrawings]);

  return (
    <div
      className={`relative min-h-0 flex-1 overflow-hidden bg-[#050506] ${canPlaceDrawing && activeDrawingTool !== "select" ? "cursor-crosshair" : ""}`}
      data-testid="practice-terminal-chart-click-layer"
      data-active-drawing-tool={activeDrawingTool}
    >
      <div ref={containerRef} className="absolute inset-0 w-full" data-testid="practice-terminal-klinechart" data-practice-chart-engine="klinecharts-10.0.3" />
      {canPlaceDrawing && activeDrawingTool !== "select" && !textDraft && plotBounds ? (
        <div
          role="presentation"
          className="absolute z-[60] block cursor-crosshair bg-transparent p-0 text-left"
          data-testid="practice-terminal-drawing-capture-layer"
          data-practice-drawing-capture="active"
          data-practice-kline-plot-only="axes-excluded"
          data-practice-plot-width={Math.round(plotBounds.width)}
          data-practice-plot-height={Math.round(plotBounds.height)}
          aria-label={`Place ${terminalActiveToolLabel(activeDrawingTool)} on chart`}
          style={{ left: plotBounds.left, top: plotBounds.top, width: plotBounds.width, height: plotBounds.height, touchAction: "none" }}
          onPointerDown={handleDrawingCapturePointerDown}
          onPointerMove={handleDrawingCapturePointerMove}
          onPointerUp={handleDrawingCapturePointerUp}
          onPointerCancel={handleDrawingCapturePointerCancel}
        />
      ) : null}
      {textDraft && plotBounds ? (
        <div
          ref={textEditorRef}
          className="pointer-events-auto absolute z-[70] w-[min(12.5rem,calc(100%-1rem))]"
          style={{
            left: Math.max(plotBounds.left + 4, Math.min(plotBounds.left + textDraft.x + 6, plotBounds.left + plotBounds.width - Math.min(200, plotBounds.width - 8) - 4)),
            top: Math.max(plotBounds.top + 4, Math.min(plotBounds.top + textDraft.y + 6, plotBounds.top + plotBounds.height - 118))
          }}
          data-testid="practice-terminal-text-tool-editor"
          data-practice-text-note-commit="automatic"
          data-practice-text-note-state={textDraftSaveState}
          data-practice-anchor-x={Math.round(textDraft.x)}
          data-practice-anchor-y={Math.round(textDraft.y)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              discardTextDraft();
            }
          }}
        >
          <textarea
            ref={textEditorInputRef}
            autoFocus
            className="block min-h-9 max-h-28 w-full resize-none overflow-y-auto rounded-[5px] border border-[#2962ff]/70 bg-black/95 px-2 py-1.5 text-xs leading-4 text-[#60a5fa] shadow-lg outline-none transition focus:border-[#2962ff] focus:ring-2 focus:ring-[#2962ff]/30"
            value={textDraft.text}
            maxLength={700}
            placeholder="Add text"
            aria-label="Chart text note"
            rows={Math.max(1, Math.min(6, textDraft.text.split("\n").length))}
            onChange={(event) => updateTextDraftValue(event.target.value)}
          />
          {textDraftSaveState === "saving" ? <p className="mt-1 text-[10px] text-[#60a5fa]">Saving note...</p> : null}
          {textDraftSaveState === "error" ? <p className="mt-1 text-[10px] leading-4 text-[#ef4444]">Could not save. Your text is still here; click outside to retry.</p> : null}
        </div>
      ) : null}
      {zoomHistory.length ? (
        <button
          type="button"
          className="focus-ring pointer-events-auto absolute right-24 top-3 z-[70] rounded-[8px] border border-[#60a5fa]/50 bg-black px-2.5 py-1.5 text-xs font-semibold text-[#60a5fa] shadow-xl hover:bg-[#60a5fa]/10"
          onClick={zoomOutOneStep}
          data-testid="practice-terminal-zoom-out"
          data-practice-terminal-zoom-history-depth={zoomHistory.length}
          data-practice-terminal-zoom-baseline-bar-space={zoomHistory[0]?.barSpace}
          aria-label="Zoom out one chart step"
          title="Restore the chart viewport from before rectangle zoom"
        >
          Zoom out
        </button>
      ) : null}
      {orders.length ? (
        <div className="pointer-events-auto absolute left-3 top-3 z-20 flex max-w-[min(76%,42rem)] flex-wrap gap-1.5" data-testid="practice-terminal-order-chip-list">
          {orders.slice(0, 7).map((order) => (
            <button
              key={order.orderId}
              type="button"
              className={`focus-ring flex h-7 max-w-36 items-center gap-1.5 rounded-[5px] border px-2 text-left text-[10px] font-semibold shadow-lg ${orderChipToneClass(order, selectedOrderId === order.orderId)}`}
              onClick={() => onSelectOrder(order.orderId)}
              title={`Show ${order.direction} ${order.status} order`}
              data-testid="practice-terminal-order-chip"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${order.direction === "buy" ? "bg-[color:var(--green)]" : "bg-[color:var(--red)]"}`} />
              <span className="truncate">{order.direction.toUpperCase()} {orderChipStatusLabel(order)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {selectedTerminalDrawing ? (
        <div className="pointer-events-auto absolute right-16 top-3 z-20 flex max-w-[42%] gap-1 overflow-hidden" data-testid="practice-terminal-selected-drawing-chip">
          <button
            type="button"
            className={`h-7 max-w-36 truncate rounded-[5px] border bg-black px-2 text-left text-[10px] ${drawingColorClass(selectedTerminalDrawing.colorToken)} ring-1 ring-[color:var(--accent)]`}
            onClick={() => onSelectDrawing(selectedTerminalDrawing.annotationId)}
            title={selectedTerminalDrawing.label || drawingKindLabel(selectedTerminalDrawing.kind)}
          >
            {selectedTerminalDrawing.label || drawingKindLabel(selectedTerminalDrawing.kind)}
          </button>
        </div>
      ) : null}
      {eventGroups.length ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-2 z-30 h-7 border-t border-[color:color-mix(in_srgb,var(--line)_74%,transparent)]"
          data-practice-event-marker-lane="bottom"
        >
          {eventGroups.map((group) => (
            <button
              key={group.groupId}
              type="button"
              className="group pointer-events-auto absolute top-0 z-40 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-transparent focus:outline-none"
              data-practice-event-hit-target="24px"
              data-practice-event-marker={group.groupId}
              style={{
                left: `${group.xCoordinate}px`,
                transform: "translateX(-50%)"
              }}
              onClick={() => {
                showEventGroupTooltip(group.groupId);
                onSelectEvent(group.events[0]?.eventId ?? "");
              }}
              onFocus={() => showEventGroupTooltip(group.groupId)}
              onBlur={scheduleHideEventGroupTooltip}
              onPointerEnter={() => showEventGroupTooltip(group.groupId)}
              onPointerMove={() => showEventGroupTooltip(group.groupId)}
              onPointerLeave={scheduleHideEventGroupTooltip}
              onMouseEnter={() => showEventGroupTooltip(group.groupId)}
              onMouseMove={() => showEventGroupTooltip(group.groupId)}
              onMouseLeave={scheduleHideEventGroupTooltip}
              title={`${group.events.length > 1 ? `${group.events.length} events` : group.events[0]?.title} · ${group.impact} impact`}
              aria-label={`${group.events.length > 1 ? `${group.events.length} grouped practice events` : group.events[0]?.title ?? "Practice event marker"} at revealed candle ${group.candleIndex}`}
            >
              <span
                className={`grid place-items-center rounded-full border font-bold leading-none transition group-hover:scale-125 ${group.events.length > 1 ? "h-4 min-w-4 px-1 text-[9px]" : "h-2.5 w-2.5 text-[0px]"} ${eventMarkerDotClass(group.impact)} ${activeEventGroup?.groupId === group.groupId ? "ring-2 ring-[color:var(--accent)]" : ""}`}
                data-practice-event-hover-target="24px"
                data-practice-event-visible-marker="compact"
              >
                {group.events.length > 1 ? group.events.length : ""}
              </span>
            </button>
          ))}
          {activeEventGroup ? (
            <div
              className="pointer-events-auto absolute bottom-8 z-50 grid w-[min(19rem,82vw)] gap-2 rounded-[8px] border border-[color:color-mix(in_srgb,var(--line)_82%,transparent)] bg-[color:color-mix(in_srgb,var(--ink)_84%,black_10%)] px-3 py-2 text-xs shadow-xl backdrop-blur-md"
              data-practice-event-tooltip={activeEventGroup.groupId}
              style={{
                left: `${activeEventGroup.xCoordinate < 160 ? 0 : activeEventGroup.xCoordinate > chartWidth - 160 ? chartWidth : activeEventGroup.xCoordinate}px`,
                maxWidth: "320px",
                transform: activeEventGroup.xCoordinate < 160 ? "translateX(0)" : activeEventGroup.xCoordinate > chartWidth - 160 ? "translateX(-100%)" : "translateX(-50%)"
              }}
              role="dialog"
              aria-label="Practice event details"
              onPointerEnter={() => showEventGroupTooltip(activeEventGroup.groupId)}
              onPointerLeave={scheduleHideEventGroupTooltip}
              onMouseEnter={() => showEventGroupTooltip(activeEventGroup.groupId)}
              onMouseLeave={scheduleHideEventGroupTooltip}
            >
              {pinnedEventGroup?.groupId === activeEventGroup.groupId ? (
                <button
                  type="button"
                  className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full border border-[color:var(--line)] text-[11px] leading-none text-[color:var(--label2)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  onClick={() => {
                    setHoveredEventGroupId("");
                    onSelectEvent("");
                  }}
                  aria-label="Close pinned practice event details"
                  title="Close event details"
                >
                  x
                </button>
              ) : null}
              {activeEventGroup.events.length > 1 ? (
                <p className="truncate pr-6 text-[10px] font-semibold uppercase leading-3 text-[color:var(--label3)]">
                  {activeEventGroup.events.length} grouped events
                </p>
              ) : null}
              {activeEventGroup.events.slice(0, 3).map((eventMarker) => (
                <div key={eventMarker.eventId} className="grid gap-1.5">
                  <div className="flex min-w-0 items-center gap-2 pr-5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${eventMarker.impact === "high" ? "bg-[color:var(--red)]" : eventMarker.impact === "medium" ? "bg-[color:var(--amber)]" : "bg-[color:var(--green)]"}`} />
                    <p className="truncate text-[13px] font-semibold leading-4 text-[color:var(--label)]">{eventMarker.title}</p>
                  </div>
                  <p className="truncate text-[10px] uppercase leading-3 text-[color:var(--label3)]">
                    {eventCategoryLabel(eventMarker.category)} · {new Date(eventMarker.eventTime).toLocaleString("en-NG")} · {eventMarker.impact}
                  </p>
                  <p className="line-clamp-3 break-safe leading-5 text-[color:var(--label2)]">{eventMarker.safeSummary}</p>
                  {eventMarker.sourceLabel ? (
                    <p className="truncate text-[10px] leading-3 text-[color:var(--label3)]">Source: {eventMarker.sourceLabel}</p>
                  ) : null}
                </div>
              ))}
              {activeEventGroup.events.length > 3 ? (
                <p className="truncate text-[color:var(--label3)]">+{activeEventGroup.events.length - 3} more events in this bucket</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {!candles.length ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            No candle is revealed yet. Use Step forward to request the next server-bounded candle before drawing, reading indicators, or placing simulated orders.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TerminalBody({ sessionId }: StudentPracticeTerminalClientProps) {
  const [detail, setDetail] = useState<PracticeSessionDetailResponse | null>(null);
  const [revealed, setRevealed] = useState<RevealedPracticeCandlesResponse | null>(null);
  const [orderForm, setOrderForm] = useState<TerminalOrderForm>(defaultOrderForm);
  const [drawingForm, setDrawingForm] = useState<TerminalDrawingForm>(defaultDrawingForm);
  const [bookmarkForm, setBookmarkForm] = useState<TerminalBookmarkForm>(defaultBookmarkForm);
  const [goToIndex, setGoToIndex] = useState("");
  const [goToDateTime, setGoToDateTime] = useState("");
  const [indicatorSettings, setIndicatorSettings] = useState<TerminalIndicatorSettings>(defaultIndicatorSettings);
  const [isIndicatorPanelOpen, setIsIndicatorPanelOpen] = useState(false);
  const [selectedToolKind, setSelectedToolKind] = useState<TerminalActiveTool>("select");
  const selectedToolKindRef = useRef<TerminalActiveTool>("select");
  const [isLinesMenuOpen, setIsLinesMenuOpen] = useState(false);
  const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState(false);
  const [linesMenuPosition, setLinesMenuPosition] = useState<TerminalToolPopoverPosition | null>(null);
  const [deleteMenuPosition, setDeleteMenuPosition] = useState<TerminalToolPopoverPosition | null>(null);
  const [objectTreeFilter, setObjectTreeFilter] = useState<TerminalObjectFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedDrawingId, setSelectedDrawingId] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventImpactFilter, setEventImpactFilter] = useState<"all" | PracticeEventMarkerImpact>("all");
  const [eventCategoryFilter, setEventCategoryFilter] = useState<"all" | PracticeEventMarkerCategory>("all");
  const [showEvents, setShowEvents] = useState(true);
  const [mobilePanelTab, setMobilePanelTab] = useState<TerminalMobilePanelTab>("objects");
  const [isUtilityPanelOpen, setIsUtilityPanelOpen] = useState(true);
  const [areDrawingsLocked, setAreDrawingsLocked] = useState(false);
  const [isDrawingLayerVisible, setIsDrawingLayerVisible] = useState(true);
  const [drawingPlacementStart, setDrawingPlacementStart] = useState<TerminalDrawingPlacementStart | null>(null);
  const [speedMs, setSpeedMs] = useState(900);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [dockMessage, setDockMessage] = useState<TerminalDockMessage | null>(null);
  const [drawingError, setDrawingError] = useState<string | null>(null);
  const ticketRef = useRef<HTMLElement | null>(null);
  const ticketEntryRef = useRef<HTMLInputElement | null>(null);
  const terminalShellRef = useRef<HTMLElement | null>(null);
  const linesButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const linesMenuRef = useRef<HTMLDivElement | null>(null);
  const deleteMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    selectedToolKindRef.current = selectedToolKind;
  }, [selectedToolKind]);
  const warmupAppliedRef = useRef(false);

  const session = revealed?.session ?? detail?.session;
  const instrumentSpec = session?.instrument ?? (session ? getPracticeInstrumentSpec(session.assetClass, session.symbol) : undefined);
  const orders = useMemo(() => detail?.orders ?? [], [detail?.orders]);
  const annotations = useMemo(() => detail?.annotations ?? [], [detail?.annotations]);
  const bookmarks = useMemo(() => detail?.bookmarks ?? [], [detail?.bookmarks]);
  const eventMarkers = revealed?.eventMarkers ?? detail?.eventMarkers ?? [];
  const filteredEventMarkers = eventMarkers.filter((eventMarker) =>
    (eventImpactFilter === "all" || eventMarker.impact === eventImpactFilter) &&
    (eventCategoryFilter === "all" || eventMarker.category === eventCategoryFilter)
  );
  const challengeStatus = detail?.challengeStatus;
  const drawings = annotations.filter((annotation) => isTerminalDrawingKind(annotation.kind));
  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId);
  const orderSummaryRows = selectedOrder ? [] : orders.slice(0, 20);
  const hiddenOrderRowCount = Math.max(0, orders.length - orderSummaryRows.length);
  const visibleOrderCards = selectedOrder ? [selectedOrder] : [];
  const selectedDrawing = drawings.find((drawing) => drawing.annotationId === selectedDrawingId);
  const drawingSummaryRows = drawings.slice(0, 20);
  const hiddenDrawingRowCount = Math.max(0, drawings.length - drawingSummaryRows.length);
  const revealedCandlesOnly = useMemo(() => revealed?.candles ?? [], [revealed?.candles]);
  const latestCandle = revealed?.candles[revealed.candles.length - 1];
  const currentIndex = revealed?.currentCandleIndex ?? session?.currentCandleIndex ?? 0;
  const availableCount = revealed?.availableCandleCount ?? 0;
  const isSessionLocked = session?.status === "completed" || session?.status === "abandoned";
  const canStepBack = !isSaving && !isSessionLocked && availableCount > 0 && currentIndex > 0;
  const canStepForward = !isSaving && !isSessionLocked && availableCount > 0 && currentIndex < availableCount - 1;
  const activePlaybooks = detail?.playbooks.filter((playbook) => playbook.status === "active" && (!session || playbook.market === session.assetClass)) ?? [];
  const realizedPnl = detail?.performance.netPnl ?? 0;
  const currentBalance = detail?.performance.endingBalance ?? session?.startingBalance ?? 0;
  const riskAmount = session ? session.startingBalance * session.riskPct / 100 : 0;
  const ticketEntryPrice = orderForm.orderType === "market" ? latestCandle?.close : Number(orderForm.requestedPrice);
  const ticketStopLoss = Number(orderForm.stopLoss);
  const ticketStopDistance = Number.isFinite(ticketEntryPrice) && Number.isFinite(ticketStopLoss)
    ? Math.abs((ticketEntryPrice ?? 0) - ticketStopLoss)
    : 0;
  const previewSize = ticketStopDistance > 0 && instrumentSpec
    ? quantizePracticeQuantityDown(riskAmount / (ticketStopDistance * instrumentSpec.contractMultiplier), instrumentSpec)
    : ticketStopDistance > 0 ? riskAmount / ticketStopDistance : 0;
  const quickMarketDraft = buildQuickMarketOrderDraft({
    direction: orderForm.direction,
    entryPrice: latestCandle?.close,
    riskAmount,
    spec: instrumentSpec,
    stopLoss: Number(orderForm.stopLoss),
    takeProfit: Number(orderForm.takeProfit)
  });
  const bottomPreviewSize = previewSize > 0 ? previewSize : quickMarketDraft.size;
  const previewNotional = previewSize > 0 && ticketEntryPrice
    ? practiceNotionalForInstrument(instrumentSpec, ticketEntryPrice, previewSize)
    : 0;
  const previewPipDistance = ticketEntryPrice && ticketStopLoss > 0
    ? practicePipDistance({ spec: instrumentSpec, firstPrice: ticketEntryPrice, secondPrice: ticketStopLoss })
    : 0;
  const canMutateOrders = !isSaving && !isSessionLocked;
  const canMutateDrawings = !isSaving && !isSessionLocked && !areDrawingsLocked;
  const canMutateBookmarks = !isSaving && !isSessionLocked;
  const previousBookmark = [...bookmarks].reverse().find((bookmark) => bookmark.candleIndex < currentIndex);
  const nextBookmark = bookmarks.find((bookmark) => bookmark.candleIndex > currentIndex);
  const indicators = useMemo(
    () => computePracticeTerminalIndicators(revealedCandlesOnly, indicatorSettings),
    [indicatorSettings, revealedCandlesOnly]
  );
  const activeIndicatorBadges = [
    indicatorSettings.smaEnabled ? `SMA ${boundedIndicatorPeriod(indicatorSettings.smaPeriod, defaultIndicatorSettings.smaPeriod)}` : "",
    indicatorSettings.emaEnabled ? `EMA ${boundedIndicatorPeriod(indicatorSettings.emaPeriod, defaultIndicatorSettings.emaPeriod)}` : "",
    indicatorSettings.rsiEnabled ? `RSI ${boundedIndicatorPeriod(indicatorSettings.rsiPeriod, defaultIndicatorSettings.rsiPeriod)}` : "",
    indicatorSettings.atrEnabled ? `ATR ${boundedIndicatorPeriod(indicatorSettings.atrPeriod, defaultIndicatorSettings.atrPeriod)}` : "",
    indicatorSettings.volumeMaEnabled ? `Vol MA ${boundedIndicatorPeriod(indicatorSettings.volumeMaPeriod, defaultIndicatorSettings.volumeMaPeriod)}` : ""
  ].filter(Boolean);
  const latestRsi = indicators.rsi[indicators.rsi.length - 1]?.value;
  const latestAtr = indicators.atr[indicators.atr.length - 1]?.value;
  const latestVolumeMa = indicators.volumeMa[indicators.volumeMa.length - 1]?.value;
  const latestSma = indicators.sma[indicators.sma.length - 1]?.value;
  const latestEma = indicators.ema[indicators.ema.length - 1]?.value;

  function selectTerminalOrder(orderId: string) {
    setSelectedOrderId(orderId);
    setSelectedDrawingId("");
    setMobilePanelTab("objects");
    setIsUtilityPanelOpen(true);
    setDockMessage({ tone: "success", text: "Order selected. Showing that order only in the side panel." });
    window.requestAnimationFrame(() => {
      document.getElementById(`terminal-order-card-${orderId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });
  }

  function selectTerminalEvent(eventId: string) {
    setSelectedEventId(eventId);

    if (!eventId) {
      setDrawingForm((current) => ({
        ...current,
        eventId: ""
      }));
      return;
    }

    setDrawingForm((current) => ({
      ...current,
      eventId,
      kind: current.kind === "text_note" ? current.kind : "text_note",
      label: current.label || eventMarkers.find((eventMarker) => eventMarker.eventId === eventId)?.title || ""
    }));
  }

  function selectTerminalDrawing(drawingId: string) {
    setSelectedDrawingId(drawingId);
    setSelectedOrderId("");
    selectedToolKindRef.current = "select";
    setSelectedToolKind("select");
    setDrawingPlacementStart(null);
    setIsLinesMenuOpen(false);
    openUtilityPanel("objects");
    setDockMessage({ tone: "success", text: "Chart object selected. Edit or remove it from Objects." });
  }

  function openUtilityPanel(tab: TerminalMobilePanelTab) {
    setMobilePanelTab(tab);
    setIsUtilityPanelOpen(true);
    setIsLinesMenuOpen(false);
    setIsDeleteMenuOpen(false);
  }

  function closeOrderPopoutIfOpen() {
    if (mobilePanelTab === "order") {
      setMobilePanelTab("objects");
    }
  }

  function updateIndicatorSettings(update: Partial<TerminalIndicatorSettings>) {
    setIndicatorSettings((current) => ({
      ...current,
      ...update
    }));
  }

  const loadRevealedCandles = useCallback(async (index?: number) => {
    const suffix = index === undefined ? "" : `?index=${encodeURIComponent(String(index))}`;
    const payload = await requestCourseHubApi<RevealedPracticeCandlesResponse>(
      `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/candles${suffix}`
    );

    setRevealed(payload);
    setDetail((current) => current ? { ...current, session: payload.session } : current);
  }, [sessionId]);

  const loadTerminal = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<PracticeSessionDetailResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}`
      );
      setDetail(payload);
      setOrderForm((current) => ({
        ...current,
        playbookId: current.playbookId || payload.session.playbookId || ""
      }));
      await loadRevealedCandles(payload.session.currentCandleIndex);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load the practice terminal.");
    } finally {
      setIsLoading(false);
    }
  }, [loadRevealedCandles, sessionId]);

  const refreshTerminalAfterOrderMutation = useCallback(async () => {
    await loadTerminal();
  }, [loadTerminal]);

  const evaluateOrders = useCallback(async () => {
    const evaluation = await requestCourseHubApi<PracticeOrderEvaluationResponse>(
      `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/evaluate`,
      { method: "POST" }
    );

    setDetail((current) => current ? {
      ...current,
      session: evaluation.session,
      orders: evaluation.orders,
      performance: evaluation.performance,
      challengeStatus: evaluation.challengeStatus,
      playbookPerformance: evaluation.playbookPerformance
    } : current);
  }, [sessionId]);

  const persistReplayIndex = useCallback(async (nextIndex: number) => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const mutation = await requestCourseHubApi<PracticeReplayIndexMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ currentCandleIndex: nextIndex })
        }
      );
      setDetail((current) => current ? { ...current, session: mutation.session } : current);
      await loadRevealedCandles(mutation.currentCandleIndex);
      await evaluateOrders();
    } catch (error) {
      setIsPlaying(false);
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not move the terminal replay.");
    } finally {
      setIsSaving(false);
    }
  }, [evaluateOrders, loadRevealedCandles, sessionId]);

  const navigateTerminalReplay = useCallback(async (payload: {
    mode: "start" | "latest_revealed" | "index" | "datetime";
    candleIndex?: number;
    dateTime?: string;
    revealToTarget?: boolean;
  }) => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const mutation = await requestCourseHubApi<PracticeReplayIndexMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/navigation`,
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );
      setDetail((current) => current ? { ...current, session: mutation.session } : current);
      await loadRevealedCandles(mutation.currentCandleIndex);
      await evaluateOrders();
    } catch (error) {
      setIsPlaying(false);
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not navigate the practice replay.");
    } finally {
      setIsSaving(false);
    }
  }, [evaluateOrders, loadRevealedCandles, sessionId]);

  async function changeTerminalTimeframe(timeframeMinutes: number) {
    if (!session || timeframeMinutes === session.timeframeMinutes) {
      return;
    }

    closeOrderPopoutIfOpen();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<{ ok: true; session: { sessionId: string } }>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/timeframe`,
        {
          method: "POST",
          body: JSON.stringify({ timeframeMinutes })
        }
      );
      window.location.href = `/app/practice/${encodeURIComponent(response.session.sessionId)}/terminal`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not open that practice timeframe.");
    } finally {
      setIsSaving(false);
    }
  }

  async function createTerminalBookmark(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeBookmarkMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/bookmarks`,
        {
          method: "POST",
          body: JSON.stringify({
            candleIndex: currentIndex,
            priceLevel: bookmarkForm.priceLevel ? Number(bookmarkForm.priceLevel) : latestCandle?.close,
            label: bookmarkForm.label || `Bookmark ${currentIndex}`,
            note: bookmarkForm.note
          })
        }
      );
      setDetail((current) => current ? { ...current, bookmarks: response.bookmarks } : current);
      setBookmarkForm(defaultBookmarkForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save that practice bookmark.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTerminalBookmark(bookmarkId: string, form: FormData) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeBookmarkMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/bookmarks/${encodeURIComponent(bookmarkId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            label: String(form.get("label") ?? ""),
            note: String(form.get("note") ?? ""),
            priceLevel: form.get("priceLevel") ? Number(form.get("priceLevel")) : undefined
          })
        }
      );
      setDetail((current) => current ? { ...current, bookmarks: response.bookmarks } : current);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update that practice bookmark.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTerminalBookmark(bookmarkId: string) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeBookmarkDeleteResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/bookmarks/${encodeURIComponent(bookmarkId)}`,
        { method: "DELETE" }
      );
      setDetail((current) => current ? { ...current, bookmarks: response.bookmarks } : current);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not delete that practice bookmark.");
    } finally {
      setIsSaving(false);
    }
  }

  function focusTerminalTicket(direction: PracticeOrderDirection) {
    openUtilityPanel("order");
    setOrderForm((current) => ({ ...current, direction }));
    setTicketError(null);
    setDockMessage(null);
    ticketRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.setTimeout(() => {
      ticketEntryRef.current?.focus();
    }, 80);
  }

  async function submitQuickMarketOrder(direction: PracticeOrderDirection) {
    setIsSaving(true);
    setErrorMessage(null);
    setTicketError(null);
    setDockMessage(null);

    try {
      if (!latestCandle) {
        throw new Error("Reveal at least one candle before using quick Buy or Sell.");
      }

      if (isSessionLocked) {
        throw new Error("This session is locked, so quick simulated orders are disabled.");
      }

      const quickDraft = buildQuickMarketOrderDraft({
        direction,
        entryPrice: latestCandle.close,
        riskAmount,
        spec: instrumentSpec,
        stopLoss: Number(orderForm.stopLoss),
        takeProfit: Number(orderForm.takeProfit)
      });

      if (!Number.isFinite(quickDraft.size) || quickDraft.size <= 0 || quickDraft.stopLoss <= 0 || quickDraft.takeProfit <= 0) {
        throw new Error("Quick Buy/Sell needs a valid revealed price and instrument size.");
      }

      const response = await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
            orderType: "market",
            direction,
            playbookId: orderForm.playbookId,
            stopLoss: quickDraft.stopLoss,
            takeProfit: quickDraft.takeProfit,
            checklistNotes: orderForm.checklistNotes,
            notes: orderForm.notes,
            tags: orderForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
          })
        }
      );

      setDetail((current) => current ? {
        ...current,
        orders: [response.order, ...current.orders.filter((order) => order.orderId !== response.order.orderId)],
        challengeStatus: response.challengeStatus ?? current.challengeStatus
      } : current);
      setSelectedOrderId(response.order.orderId);
      setOrderForm((current) => ({
        ...defaultOrderForm,
        direction,
        playbookId: current.playbookId,
        stopLoss: current.stopLoss,
        takeProfit: current.takeProfit,
        checklistNotes: current.checklistNotes,
        notes: current.notes,
        tags: current.tags
      }));
      setDockMessage({
        tone: "success",
        text: quickDraft.usedAutoLevels
          ? `${direction === "buy" ? "Buy" : "Sell"} simulated market order accepted with quick default SL/TP.`
          : `${direction === "buy" ? "Buy" : "Sell"} simulated market order accepted at the latest revealed close.`
      });
      await evaluateOrders();
    } catch (error) {
      setDockMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "TradeHub could not place that quick simulated order."
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function submitTerminalOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setTicketError(null);

    try {
      if (!latestCandle) {
        throw new Error("Reveal at least one candle before submitting simulated orders.");
      }

      if (orderForm.orderType !== "market" && Number(orderForm.requestedPrice) <= 0) {
        throw new Error("Limit and stop orders require a requested price.");
      }

      const response = await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
            orderType: orderForm.orderType,
            direction: orderForm.direction,
            requestedPrice: orderForm.orderType === "market" ? undefined : Number(orderForm.requestedPrice),
            playbookId: orderForm.playbookId,
            stopLoss: Number(orderForm.stopLoss),
            takeProfit: Number(orderForm.takeProfit),
            checklistNotes: orderForm.checklistNotes,
            notes: orderForm.notes,
            tags: orderForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
          })
        }
      );

      setDetail((current) => current ? {
        ...current,
        orders: [response.order, ...current.orders.filter((order) => order.orderId !== response.order.orderId)],
        challengeStatus: response.challengeStatus ?? current.challengeStatus
      } : current);
      setSelectedOrderId(response.order.orderId);
      setOrderForm((current) => ({
        ...defaultOrderForm,
        direction: current.direction,
        playbookId: current.playbookId
      }));
      await evaluateOrders();
    } catch (error) {
      setTicketError(error instanceof Error ? error.message : "TradeHub could not place that simulated terminal order.");
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelTerminalOrder(orderId: string) {
    setIsSaving(true);
    setErrorMessage(null);
    setTicketError(null);

    try {
      await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/${encodeURIComponent(orderId)}/cancel`,
        { method: "POST" }
      );
      await refreshTerminalAfterOrderMutation();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not cancel that simulated order.");
    } finally {
      setIsSaving(false);
    }
  }

  async function manuallyCloseTerminalOrder(orderId: string) {
    setIsSaving(true);
    setErrorMessage(null);
    setTicketError(null);

    try {
      await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/${encodeURIComponent(orderId)}/close`,
        { method: "POST" }
      );
      await refreshTerminalAfterOrderMutation();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not manually close that simulated order.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTerminalOrderLevels(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setTicketError(null);

    try {
      const form = new FormData(event.currentTarget);

      await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/${encodeURIComponent(orderId)}/levels`,
        {
          method: "PATCH",
          body: JSON.stringify({
            stopLoss: Number(form.get("stopLoss")),
            takeProfit: Number(form.get("takeProfit"))
          })
        }
      );
      await refreshTerminalAfterOrderMutation();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update those simulated SL/TP levels.");
    } finally {
      setIsSaving(false);
    }
  }

  async function partiallyCloseTerminalOrder(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setTicketError(null);

    try {
      const form = new FormData(event.currentTarget);

      await requestCourseHubApi<PracticeOrderMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/${encodeURIComponent(orderId)}/partial-close`,
        {
          method: "POST",
          body: JSON.stringify({
            percent: Number(form.get("percent")),
            quantity: Number(form.get("quantity"))
          })
        }
      );
      await refreshTerminalAfterOrderMutation();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not partially close that simulated order.");
    } finally {
      setIsSaving(false);
    }
  }

  function selectDrawingTool(kind: TerminalActiveTool) {
    selectedToolKindRef.current = kind;
    setSelectedToolKind(kind);
    setIsLinesMenuOpen(false);
    setIsDeleteMenuOpen(false);
    setDrawingError(null);
    setDrawingPlacementStart(null);
    setSelectedDrawingId("");
    setSelectedOrderId("");

    if (kind === "select") {
      setDockMessage({ tone: "success", text: "Cursor selected. Pick a chart object to review it." });
      return;
    }

    if (kind === "zoom") {
      setDockMessage({ tone: "success", text: "Zoom selected. Drag a rectangle over the chart area." });
      return;
    }

    if (areDrawingsLocked) {
      selectedToolKindRef.current = "select";
      setSelectedToolKind("select");
      setDrawingError("Unlock chart drawings before placing a new object.");
      setDockMessage({ tone: "error", text: "Unlock chart drawings before placing a new object." });
      return;
    }

    if (!latestCandle) {
      selectedToolKindRef.current = "select";
      setSelectedToolKind("select");
      setDrawingError("Reveal one candle before adding chart tools.");
      setDockMessage({ tone: "error", text: "Reveal one candle before adding chart tools." });
      return;
    }

    setDrawingForm((current) => ({
      ...current,
      kind,
      candleIndex: current.candleIndex || String(currentIndex),
      priceLevel: current.priceLevel || (latestCandle ? String(latestCandle.close) : "")
    }));
    setDockMessage({
      tone: "success",
      text: kind === "trend_line"
        ? "Trend line selected. Click the start, move the pointer, then click the endpoint."
        : terminalToolRequiresDrag(kind)
          ? `${drawingKindLabel(kind)} selected. Drag on the chart, preview, then release.`
          : `${drawingKindLabel(kind)} selected. Click the chart to place it.`
    });
  }

  function cancelActiveChartTool(message = "Chart tool cancelled.") {
    selectedToolKindRef.current = "select";
    setSelectedToolKind("select");
    setDrawingPlacementStart(null);
    setIsLinesMenuOpen(false);
    setIsDeleteMenuOpen(false);
    setDockMessage({ tone: "success", text: message });
  }

  const applyDrawingMutation = useCallback((response: PracticeAnnotationMutationResponse | PracticeAnnotationDeleteResponse) => {
    setDetail((current) => current ? {
      ...current,
      annotations: response.annotations,
      completedReview: response.completedReview ?? current.completedReview
    } : current);
  }, []);

  async function createTerminalDrawingFromChartPoint(placement: TerminalChartDrawingPlacement): Promise<boolean> {
    setDrawingError(null);
    setErrorMessage(null);

    try {
      if (isSessionLocked) {
        throw new Error("Completed sessions are locked for chart tools.");
      }

      if (areDrawingsLocked) {
        throw new Error("Unlock chart drawings before placing a new object.");
      }

      if (!latestCandle || availableCount <= 0) {
        throw new Error("Reveal one candle before placing chart tools.");
      }

      const boundedClickPoint = {
        kind: placement.kind,
        candleIndex: Math.max(0, Math.min(placement.candleIndex, currentIndex)),
        priceLevel: Number.isFinite(placement.priceLevel) ? placement.priceLevel : undefined
      };

      if (placement.kind !== "vertical_marker" && boundedClickPoint.priceLevel === undefined) {
        throw new Error("Click inside the revealed price area to place this chart tool.");
      }

      if (requiresTwoChartPoints(placement.kind) && placement.secondCandleIndex === undefined) {
        if (!drawingPlacementStart || drawingPlacementStart.kind !== placement.kind) {
          setDrawingPlacementStart(boundedClickPoint);
          setDockMessage({ tone: "success", text: `${drawingKindLabel(placement.kind)} start selected. Click second point.` });
          return false;
        }
      }

      const startPoint = drawingPlacementStart && drawingPlacementStart.kind === placement.kind
        ? drawingPlacementStart
        : boundedClickPoint;
      const endPoint = placement.secondCandleIndex !== undefined
        ? {
          candleIndex: Math.max(0, Math.min(placement.secondCandleIndex, currentIndex)),
          priceLevel: Number.isFinite(placement.secondPriceLevel) ? placement.secondPriceLevel : undefined
        }
        : boundedClickPoint;
      const candleIndex = startPoint.candleIndex;
      const canUsePrice = placement.kind !== "vertical_marker" && Number.isFinite(startPoint.priceLevel);
      const priceLevel = canUsePrice
        ? alignTerminalPriceToTick(startPoint.priceLevel ?? latestCandle.close, instrumentSpec, "nearest")
        : undefined;
      const tick = instrumentSpec?.tickSize ?? instrumentSpec?.pipSize ?? 0.01;
      const zoneDistance = priceLevel === undefined ? undefined : Math.max(Math.abs(priceLevel) * 0.003, tick * 20);
      const usesSecondPoint = requiresTwoChartPoints(placement.kind);
      const secondCandleIndex = usesSecondPoint
        ? endPoint.candleIndex
        : undefined;
      const rawSecondPrice = Number.isFinite(endPoint.priceLevel) ? endPoint.priceLevel : undefined;
      const secondPriceLevel = usesSecondPoint && priceLevel !== undefined
        ? alignTerminalPriceToTick(rawSecondPrice ?? priceLevel + (zoneDistance ?? tick * 20), instrumentSpec, rawSecondPrice === undefined ? "up" : "nearest")
        : undefined;

      if (usesSecondPoint && (secondCandleIndex === candleIndex && secondPriceLevel === priceLevel)) {
        throw new Error("Choose a different second point for this chart tool.");
      }

      const placementText = placement.kind === "text_note"
        ? normalizeTerminalMultilineText(placement.text ?? "")
        : normalizeTerminalSingleLineText(placement.text ?? "", 160);
      const labelText = placement.kind === "text_note"
        ? placementText.split("\n").find((line) => line.trim()) ?? ""
        : placementText;
      const label = labelText
        ? normalizeTerminalSingleLineText(labelText, 42)
        : drawingForm.label || drawingKindLabel(placement.kind);
      const colorToken = placement.kind === "trend_line"
        ? "blue"
        : placement.kind === "text_note"
          ? "blue"
        : placement.kind === "measurement_placeholder" && secondPriceLevel !== undefined && priceLevel !== undefined
        ? secondPriceLevel >= priceLevel ? "blue" : "red"
        : drawingForm.colorToken;
      const appearanceVersion = placement.kind === "trend_line" ? "trend_blue_v1" : undefined;
      const chartPoints = placement.chartPoints?.map((point) => ({
        dataIndex: Math.round(point.dataIndex * 1_000_000) / 1_000_000,
        ...(point.value === undefined ? {} : { value: alignTerminalPriceToTick(point.value, instrumentSpec, "nearest") })
      }));

      setIsSaving(true);
      const response = await requestCourseHubApi<PracticeAnnotationMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/drawings`,
        {
          method: "POST",
          body: JSON.stringify({
            kind: placement.kind,
            label,
            text: placementText || (placement.kind === "text_note"
              ? normalizeTerminalMultilineText(drawingForm.text)
              : normalizeTerminalSingleLineText(drawingForm.text, 700)) || label,
            candleIndex,
            secondCandleIndex,
            priceLevel,
            secondPriceLevel,
            coordinateVersion: placement.coordinateVersion,
            chartPoints,
            colorToken,
            appearanceVersion,
            orderId: selectedOrderId || undefined,
            eventId: selectedEventId || undefined,
            isMainLesson: drawingForm.isMainLesson
          })
        }
      );

      applyDrawingMutation(response);
      setSelectedDrawingId(response.annotation.annotationId);
      setSelectedOrderId("");
      if (placement.kind !== "text_note" || selectedToolKindRef.current === "text_note") {
        selectedToolKindRef.current = "select";
        setSelectedToolKind("select");
      }
      setDrawingPlacementStart(null);
      setMobilePanelTab("objects");
      if (placement.kind === "text_note") {
        setIsUtilityPanelOpen(true);
      }
      setDrawingForm((current) => ({
        ...defaultDrawingForm,
        kind: placement.kind,
        colorToken: current.colorToken,
        candleIndex: String(candleIndex),
        priceLevel: priceLevel === undefined ? "" : String(priceLevel)
      }));
      setDockMessage({ tone: "success", text: `${drawingKindLabel(placement.kind)} added. Select it on the chart to edit or delete.` });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "TradeHub could not place that chart tool.";
      setDrawingError(message);
      setDockMessage({ tone: "error", text: message });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateSelectedDrawing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDrawing) {
      setDrawingError("Select a drawing before editing it.");
      return;
    }

    setIsSaving(true);
    setDrawingError(null);
    setErrorMessage(null);

    try {
      const form = new FormData(event.currentTarget);
      const response = await requestCourseHubApi<PracticeAnnotationMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/drawings/${encodeURIComponent(selectedDrawing.annotationId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            kind: selectedDrawing.kind,
            label: String(form.get("label") ?? ""),
            text: String(form.get("text") ?? ""),
            colorToken: String(form.get("colorToken") ?? "accent"),
            appearanceVersion: "user_selected_v1",
            isMainLesson: form.get("isMainLesson") === "on",
            candleIndex: form.get("candleIndex") ? Number(form.get("candleIndex")) : selectedDrawing.candleIndex,
            secondCandleIndex: form.get("secondCandleIndex") ? Number(form.get("secondCandleIndex")) : selectedDrawing.secondCandleIndex,
            priceLevel: form.get("priceLevel") ? Number(form.get("priceLevel")) : selectedDrawing.priceLevel,
            secondPriceLevel: form.get("secondPriceLevel") ? Number(form.get("secondPriceLevel")) : selectedDrawing.secondPriceLevel,
            orderId: selectedDrawing.orderId,
            eventId: String(form.get("eventId") ?? selectedDrawing.eventId ?? "") || undefined
          })
        }
      );

      applyDrawingMutation(response);
      setDockMessage({ tone: "success", text: `${drawingKindLabel(response.annotation.kind)} updated.` });
    } catch (error) {
      setDrawingError(error instanceof Error ? error.message : "TradeHub could not update that terminal drawing.");
    } finally {
      setIsSaving(false);
    }
  }

  const updateTerminalDrawingChartPoints = useCallback(async (drawingId: string, chartPoints: PracticeDrawingChartPoint[]) => {
    const drawing = drawings.find((entry) => entry.annotationId === drawingId);
    if (!drawing || !canMutateDrawings) return;

    try {
      const first = chartPoints[0];
      const second = chartPoints[1];
      const response = await requestCourseHubApi<PracticeAnnotationMutationResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/drawings/${encodeURIComponent(drawingId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            kind: drawing.kind,
            label: drawing.label,
            text: drawing.text,
            colorToken: drawing.colorToken,
            appearanceVersion: drawing.appearanceVersion,
            isMainLesson: drawing.isMainLesson,
            orderId: drawing.orderId,
            eventId: drawing.eventId,
            candleIndex: first ? Math.max(0, Math.min(first.dataIndex, currentIndex)) : drawing.candleIndex,
            secondCandleIndex: second ? Math.max(0, Math.min(second.dataIndex, currentIndex)) : drawing.secondCandleIndex,
            priceLevel: first?.value,
            secondPriceLevel: second?.value,
            coordinateVersion: "klinecharts_v2",
            chartPoints
          })
        }
      );
      applyDrawingMutation(response);
      setDockMessage({ tone: "success", text: `${drawingKindLabel(drawing.kind)} position updated.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "TradeHub could not save that drawing position.";
      setDrawingError(message);
      setDockMessage({ tone: "error", text: message });
      void loadTerminal();
    }
  }, [applyDrawingMutation, canMutateDrawings, currentIndex, drawings, loadTerminal, sessionId]);

  const deleteSelectedDrawing = useCallback(async () => {
    if (!selectedDrawing) {
      setDrawingError("Select a drawing before deleting it.");
      return;
    }

    setIsSaving(true);
    setDrawingError(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<PracticeAnnotationDeleteResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/drawings/${encodeURIComponent(selectedDrawing.annotationId)}`,
        { method: "DELETE" }
      );

      applyDrawingMutation(response);
      setSelectedDrawingId("");
      setSelectedToolKind("select");
      setDockMessage({ tone: "success", text: "Selected chart drawing deleted." });
    } catch (error) {
      setDrawingError(error instanceof Error ? error.message : "TradeHub could not delete that terminal drawing.");
    } finally {
      setIsSaving(false);
    }
  }, [applyDrawingMutation, selectedDrawing, sessionId]);

  const deleteAllTerminalDrawings = useCallback(async () => {
    const deletableDrawings = drawings;
    const deletedDrawingIds = new Set(deletableDrawings.map((drawing) => drawing.annotationId));

    if (!deletableDrawings.length) {
      setDrawingError("No chart drawings to clear.");
      return;
    }

    setIsSaving(true);
    setDrawingError(null);
    setErrorMessage(null);
    setIsDeleteMenuOpen(false);
    setSelectedDrawingId("");
    setSelectedOrderId("");
    setSelectedToolKind("select");
    setIsLinesMenuOpen(false);
    setDrawingPlacementStart(null);

    setDetail((current) => current
      ? {
          ...current,
          annotations: current.annotations.filter((annotation) => !deletedDrawingIds.has(annotation.annotationId))
        }
      : current
    );

    try {
      const response = await requestCourseHubApi<PracticeDrawingBulkDeleteResponse>(
        `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/drawings`,
        { method: "DELETE" }
      );

      setDetail((current) => current ? {
        ...current,
        annotations: response.annotations,
        completedReview: response.completedReview ?? current.completedReview
      } : current);
      setDockMessage({ tone: "success", text: `${response.deletedDrawingCount} chart drawing${response.deletedDrawingCount === 1 ? "" : "s"} cleared for this practice session.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "TradeHub could not clear all chart drawings.";
      try {
        const authoritativeDetail = await requestCourseHubApi<PracticeSessionDetailResponse>(
          `/api/student/practice/sessions/${encodeURIComponent(sessionId)}/drawings`
        );
        setDetail(authoritativeDetail);
      } catch {
        // Keep the optimistic drawing-only removal when the authoritative refresh is unavailable.
        // Restoring a stale snapshot could visually resurrect drawings already committed by the server.
      }
      setDrawingError(message);
      setDockMessage({ tone: "error", text: message });
    } finally {
      setIsSaving(false);
    }
  }, [drawings, sessionId]);

  useEffect(() => {
    void loadTerminal();
  }, [loadTerminal]);

  const repositionToolPopovers = useCallback(() => {
    if (isLinesMenuOpen && linesButtonRef.current) {
      setLinesMenuPosition(terminalToolPopoverPosition(linesButtonRef.current.getBoundingClientRect(), 224, 154));
    }
    if (isDeleteMenuOpen && deleteButtonRef.current) {
      setDeleteMenuPosition(terminalToolPopoverPosition(deleteButtonRef.current.getBoundingClientRect(), 224, 112));
    }
  }, [isDeleteMenuOpen, isLinesMenuOpen]);

  useEffect(() => {
    if (!isLinesMenuOpen && !isDeleteMenuOpen) return undefined;
    repositionToolPopovers();
    window.addEventListener("resize", repositionToolPopovers);
    window.addEventListener("scroll", repositionToolPopovers, true);
    return () => {
      window.removeEventListener("resize", repositionToolPopovers);
      window.removeEventListener("scroll", repositionToolPopovers, true);
    };
  }, [isDeleteMenuOpen, isLinesMenuOpen, repositionToolPopovers]);

  useEffect(() => {
    if (!isLinesMenuOpen && !isDeleteMenuOpen) return undefined;
    const closeOutsideToolPopover = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        linesButtonRef.current?.contains(target) ||
        deleteButtonRef.current?.contains(target) ||
        linesMenuRef.current?.contains(target) ||
        deleteMenuRef.current?.contains(target)
      ) return;
      setIsLinesMenuOpen(false);
      setIsDeleteMenuOpen(false);
    };
    window.addEventListener("pointerdown", closeOutsideToolPopover, true);
    return () => window.removeEventListener("pointerdown", closeOutsideToolPopover, true);
  }, [isDeleteMenuOpen, isLinesMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const workstationMedia = window.matchMedia("(min-width: 1280px)");

    if (!workstationMedia.matches) {
      setIsUtilityPanelOpen(false);
    }

    const handleWorkstationChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        setIsUtilityPanelOpen(false);
      }
    };

    workstationMedia.addEventListener("change", handleWorkstationChange);

    return () => workstationMedia.removeEventListener("change", handleWorkstationChange);
  }, []);

  useEffect(() => {
    function handleTerminalKeyboard(event: KeyboardEvent) {
      if (editableKeyboardTarget(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        if (isLinesMenuOpen || isDeleteMenuOpen) {
          event.preventDefault();
          setIsLinesMenuOpen(false);
          setIsDeleteMenuOpen(false);
          return;
        }

        if (drawingPlacementStart) {
          event.preventDefault();
          setDrawingPlacementStart(null);
          setDockMessage({ tone: "success", text: "Chart tool placement cancelled." });
          return;
        }

        if (selectedToolKind !== "select") {
          event.preventDefault();
          setSelectedToolKind("select");
          setDrawingPlacementStart(null);
          setDockMessage({ tone: "success", text: `${terminalActiveToolLabel(selectedToolKind)} cancelled.` });
          return;
        }

        if (selectedDrawingId || selectedOrderId) {
          event.preventDefault();
          setSelectedDrawingId("");
          setSelectedOrderId("");
          setDockMessage({ tone: "success", text: "Selection cleared." });
        }
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedDrawing && canMutateDrawings) {
        event.preventDefault();
        void deleteSelectedDrawing();
      }
    }

    window.addEventListener("keydown", handleTerminalKeyboard);

    return () => window.removeEventListener("keydown", handleTerminalKeyboard);
  }, [canMutateDrawings, deleteSelectedDrawing, drawingPlacementStart, isDeleteMenuOpen, isLinesMenuOpen, selectedDrawing, selectedDrawingId, selectedOrderId, selectedToolKind]);

  useEffect(() => {
    if (
      warmupAppliedRef.current ||
      isLoading ||
      !session ||
      isSessionLocked ||
      orders.length > 0 ||
      currentIndex !== 0 ||
      availableCount <= 1
    ) {
      return;
    }

    warmupAppliedRef.current = true;
    const warmupIndex = Math.min(TERMINAL_WARMUP_CANDLE_COUNT - 1, availableCount - 1);

    if (warmupIndex > 0) {
      void persistReplayIndex(warmupIndex);
    }
  }, [availableCount, currentIndex, isLoading, isSessionLocked, orders.length, persistReplayIndex, session]);

  useEffect(() => {
    const stored = window.localStorage.getItem(`tradehub.practiceTerminal.indicators.${sessionId}`);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<TerminalIndicatorSettings>;
      setIndicatorSettings({
        ...defaultIndicatorSettings,
        ...parsed,
        smaPeriod: boundedIndicatorPeriod(Number(parsed.smaPeriod), defaultIndicatorSettings.smaPeriod),
        emaPeriod: boundedIndicatorPeriod(Number(parsed.emaPeriod), defaultIndicatorSettings.emaPeriod),
        rsiPeriod: boundedIndicatorPeriod(Number(parsed.rsiPeriod), defaultIndicatorSettings.rsiPeriod),
        atrPeriod: boundedIndicatorPeriod(Number(parsed.atrPeriod), defaultIndicatorSettings.atrPeriod),
        volumeMaPeriod: boundedIndicatorPeriod(Number(parsed.volumeMaPeriod), defaultIndicatorSettings.volumeMaPeriod)
      });
    } catch {
      window.localStorage.removeItem(`tradehub.practiceTerminal.indicators.${sessionId}`);
    }
  }, [sessionId]);

  useEffect(() => {
    window.localStorage.setItem(
      `tradehub.practiceTerminal.indicators.${sessionId}`,
      JSON.stringify(indicatorSettings)
    );
  }, [indicatorSettings, sessionId]);

  useEffect(() => {
    if (!isPlaying || !canStepForward || isSaving) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void persistReplayIndex(currentIndex + 1);
    }, speedMs);

    return () => window.clearTimeout(timer);
  }, [canStepForward, currentIndex, isPlaying, isSaving, persistReplayIndex, speedMs]);

  function mobilePanelVisibility(tab: TerminalMobilePanelTab) {
    return mobilePanelTab === tab ? "grid" : "hidden";
  }

  function mobileTicketVisibility() {
    return mobilePanelTab === "order" ? "block" : "hidden";
  }

  async function toggleTerminalFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await terminalShellRef.current?.requestFullscreen();
  }

  return (
    <main
      ref={terminalShellRef}
      className="fixed inset-0 z-[100] h-[100dvh] min-h-[100dvh] overflow-hidden bg-black text-[color:var(--label)]"
      data-practice-terminal-responsive-layout="stage29d15-xl-side-panel"
      data-practice-terminal-responsive-shell="stage18h"
      data-testid="practice-terminal-chart-first-shell"
    >
      <div className="flex h-[100dvh] min-h-0 flex-col">
        <header
          className="shrink-0 border-b border-white/10 bg-black px-1.5 py-1.5 sm:px-2"
          data-testid="practice-terminal-top-toolbar"
        >
          <div className="flex h-12 min-w-0 items-center gap-1 overflow-x-auto" data-terminal-density="workstation">
            <Button
              href="/app/practice"
              variant="ghost"
              size="sm"
              className="h-10 w-10 shrink-0 rounded-[5px] border-white/10 px-0 text-white"
              aria-label="Back to practice"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="flex h-10 min-w-[9.5rem] shrink-0 items-center gap-2 rounded-[5px] border border-white/10 bg-[#09090a] px-2.5" title="Session instrument">
              <Search className="h-4 w-4 text-[color:var(--label3)]" aria-hidden="true" />
              <span className="truncate text-sm font-semibold">{session?.symbol ?? "Loading"}</span>
              <span className="truncate text-[10px] uppercase text-[color:var(--label3)]">{session?.assetClass?.replace("_", " ") ?? ""}</span>
            </div>
            <div className="flex shrink-0 items-center gap-px border-l border-white/10 pl-1" aria-label="Terminal timeframes" data-testid="practice-terminal-timeframe-strip">
              {terminalTimeframeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`focus-ring h-9 min-w-8 rounded-[4px] px-1.5 text-[11px] font-semibold ${session?.timeframeMinutes === option.value ? "bg-white text-black" : option.supported ? "text-[color:var(--label2)] hover:bg-white/10 hover:text-white" : "cursor-not-allowed text-white/25"}`}
                  disabled={isSaving || !session || !option.supported}
                  onClick={() => void changeTerminalTimeframe(option.value)}
                  aria-label={`${option.label} timeframe${option.supported ? "" : " unavailable"}`}
                  title={option.supported ? `Open ${option.label} practice timeframe` : `${option.label} is not available for this practice history`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button type="button" className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-[5px] border-l border-white/10 text-[color:var(--label2)] hover:bg-white/10 hover:text-white" aria-label="Candlestick chart layout" aria-pressed="true" title="Candlestick chart">
              <ChartCandlestick className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="hidden min-w-0 flex-1 items-center justify-center px-2 lg:flex">
              <div className="flex min-w-0 items-center gap-2">
                <CandlestickChart className="hidden h-4 w-4 text-[color:var(--accent)] sm:block" aria-hidden="true" />
                <span className="hidden max-w-[18rem] truncate text-xs font-semibold md:block">{session?.sessionName ?? "Practice session"}</span>
                <Badge tone={isSessionLocked ? "green" : "amber"}>{session?.status ?? "loading"}</Badge>
                <span className="hidden text-[10px] text-[color:var(--label3)] xl:inline">{availableCount ? `${currentIndex + 1}/${availableCount}` : "0/0"}</span>
              </div>
            </div>
            <Badge tone="amber" className="hidden xl:inline-flex">Simulated</Badge>
            <Button
              className="h-10 shrink-0 rounded-[5px] px-2.5"
              size="sm"
              variant={isIndicatorPanelOpen ? "primary" : "ghost"}
              onClick={() => {
                closeOrderPopoutIfOpen();
                setIsIndicatorPanelOpen((current) => !current);
              }}
              title="Indicators"
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">Indicators</span>
            </Button>
            <Button className="hidden h-10 w-10 shrink-0 rounded-[5px] px-0 xl:flex" size="sm" variant={mobilePanelTab === "goto" && isUtilityPanelOpen ? "primary" : "ghost"} onClick={() => openUtilityPanel("goto")} aria-label="Go To" title="Go To">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button className="hidden h-10 w-10 shrink-0 rounded-[5px] px-0 xl:flex" size="sm" variant={mobilePanelTab === "order" && isUtilityPanelOpen ? "primary" : "ghost"} onClick={() => focusTerminalTicket(orderForm.direction)} aria-label="Order ticket" title="Order ticket">
              <CandlestickChart className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button className="hidden h-10 w-10 shrink-0 rounded-[5px] px-0 xl:flex" size="sm" variant={mobilePanelTab === "news" && isUtilityPanelOpen ? "primary" : "ghost"} onClick={() => openUtilityPanel("news")} aria-label="Events and news" title="Events and news">
              <Newspaper className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button className="hidden h-10 w-10 shrink-0 rounded-[5px] px-0 xl:flex" size="sm" variant={mobilePanelTab === "journal" && isUtilityPanelOpen ? "primary" : "ghost"} onClick={() => openUtilityPanel("journal")} aria-label="Journal and review" title="Journal and review">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button className="hidden h-10 w-10 shrink-0 rounded-[5px] px-0 xl:flex" size="sm" href={`/app/practice/${encodeURIComponent(sessionId)}/report`} variant="ghost" aria-label="Session report">
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Button>
            <button type="button" className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-[5px] text-[color:var(--label2)] hover:bg-white/10 hover:text-white" onClick={() => setIsUtilityPanelOpen((current) => !current)} aria-label={isUtilityPanelOpen ? "Collapse utility panel" : "Open utility panel"} title={isUtilityPanelOpen ? "Collapse utility panel" : "Open utility panel"}>
              {isUtilityPanelOpen ? <PanelRightClose className="h-5 w-5" aria-hidden="true" /> : <PanelRightOpen className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </header>

        {errorMessage ? (
          <div className="border-b border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-4 py-2 text-sm text-[color:var(--red)]">
            {errorMessage}
          </div>
        ) : null}

        {isIndicatorPanelOpen ? (
          <section className="shrink-0 border-b border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_70%,transparent)] px-3 py-3">
            <div className="grid gap-2 md:grid-cols-5">
              {([
                { key: "sma", label: "SMA", enabled: indicatorSettings.smaEnabled, period: indicatorSettings.smaPeriod, value: latestSma, points: indicators.sma.length },
                { key: "ema", label: "EMA", enabled: indicatorSettings.emaEnabled, period: indicatorSettings.emaPeriod, value: latestEma, points: indicators.ema.length },
                { key: "rsi", label: "RSI", enabled: indicatorSettings.rsiEnabled, period: indicatorSettings.rsiPeriod, value: latestRsi, points: indicators.rsi.length },
                { key: "atr", label: "ATR", enabled: indicatorSettings.atrEnabled, period: indicatorSettings.atrPeriod, value: latestAtr, points: indicators.atr.length },
                { key: "volumeMa", label: "Vol MA", enabled: indicatorSettings.volumeMaEnabled, period: indicatorSettings.volumeMaPeriod, value: latestVolumeMa, points: indicators.volumeMa.length }
              ] as const).map((indicator) => (
                <div key={indicator.key} className="grid gap-2 rounded-[8px] border border-[color:var(--line)] px-2.5 py-2">
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span className="truncate">{indicator.label} {indicator.period}</span>
                    <input
                      type="checkbox"
                      data-testid={`practice-terminal-indicator-toggle-${indicator.key}`}
                      checked={indicator.enabled}
                      onChange={(event) => {
                        if (indicator.key === "sma") updateIndicatorSettings({ smaEnabled: event.target.checked });
                        if (indicator.key === "ema") updateIndicatorSettings({ emaEnabled: event.target.checked });
                        if (indicator.key === "rsi") updateIndicatorSettings({ rsiEnabled: event.target.checked });
                        if (indicator.key === "atr") updateIndicatorSettings({ atrEnabled: event.target.checked });
                        if (indicator.key === "volumeMa") updateIndicatorSettings({ volumeMaEnabled: event.target.checked });
                      }}
                    />
                  </label>
                  <input
                    className={compactInputClass}
                    inputMode="numeric"
                    aria-label={`${indicator.label} period`}
                    value={indicator.period}
                    onChange={(event) => {
                      const period = boundedIndicatorPeriod(Number(event.target.value), indicator.period);
                      if (indicator.key === "sma") updateIndicatorSettings({ smaPeriod: period });
                      if (indicator.key === "ema") updateIndicatorSettings({ emaPeriod: period });
                      if (indicator.key === "rsi") updateIndicatorSettings({ rsiPeriod: period });
                      if (indicator.key === "atr") updateIndicatorSettings({ atrPeriod: period });
                      if (indicator.key === "volumeMa") updateIndicatorSettings({ volumeMaPeriod: period });
                    }}
                  />
                  <p className="truncate text-xs leading-5 text-[color:var(--label2)]">
                    {indicator.key === "volumeMa" && !indicators.hasVolume
                      ? "No volume"
                      : !indicator.enabled
                        ? "Off"
                        : indicator.points <= 0
                          ? "Reveal more candles"
                          : formatTerminalNumber(indicator.value, indicator.key === "rsi" ? 1 : 4)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-[color:var(--label2)]">
              Indicators use revealed candles only.
            </p>
          </section>
        ) : null}

        <section
          className={`grid min-h-0 flex-1 overflow-hidden bg-black ${isUtilityPanelOpen ? "grid-rows-[4rem_minmax(18rem,1fr)_minmax(11rem,32dvh)] lg:grid-cols-[4rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_minmax(11rem,30dvh)] xl:grid-cols-[4rem_minmax(0,1fr)_18rem] xl:grid-rows-1 2xl:grid-cols-[4rem_minmax(0,1fr)_20rem]" : "grid-rows-[4rem_minmax(18rem,1fr)] lg:grid-cols-[4rem_minmax(0,1fr)] lg:grid-rows-1"}`}
          data-practice-terminal-responsive-workspace="bottom-drawer-before-xl"
          data-testid="practice-terminal-workspace"
        >
          <aside
            className="relative flex h-16 shrink-0 gap-1.5 overflow-x-auto border-b border-white/10 bg-[#060607] p-1.5 lg:row-span-2 lg:h-auto lg:w-16 lg:flex-col lg:items-center lg:overflow-x-hidden lg:overflow-y-auto lg:border-b-0 lg:border-r xl:row-span-1"
            data-practice-terminal-responsive-tools="mature-icon-workstation-rail"
            data-testid="practice-terminal-left-tool-rail"
            aria-label="Drawing tools"
          >
            {terminalTools.map((tool) => {
              const ToolIcon = tool.id === "lock"
                ? areDrawingsLocked ? Unlock : Lock
                : tool.id === "visibility"
                  ? isDrawingLayerVisible ? Eye : EyeOff
                  : tool.Icon;
              const isSelected = tool.kind === selectedToolKind ||
                (tool.id === "cursor" && selectedToolKind === "select") ||
                (tool.id === "lines" && (selectedToolKind === "trend_line" || selectedToolKind === "horizontal_line" || selectedToolKind === "vertical_marker")) ||
                (tool.id === "zoom" && selectedToolKind === "zoom") ||
                (tool.id === "lock" && areDrawingsLocked) ||
                (tool.id === "visibility" && !isDrawingLayerVisible);
              const isDisabled = !tool.available ||
                (tool.id === "delete-selected" && (!selectedDrawing || !canMutateDrawings)) ||
                (tool.id === "delete" && (!drawings.length || !canMutateDrawings)) ||
                (Boolean(tool.kind) && !canMutateDrawings);

              return (
                <button
                  key={tool.id}
                  ref={tool.id === "lines" ? linesButtonRef : tool.id === "delete" ? deleteButtonRef : undefined}
                  type="button"
                  disabled={isDisabled}
                  title={tool.label}
                  aria-label={tool.label}
                  aria-pressed={isSelected}
                  className={`focus-ring grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-[8px] border transition disabled:cursor-not-allowed disabled:opacity-30 ${isSelected ? "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_20%,black)] text-[color:var(--accent)] shadow-[inset_0_0_0_1px_rgba(217,194,140,0.2)]" : "border-transparent text-[color:var(--label2)] hover:border-white/15 hover:bg-white/10 hover:text-white"}`}
                  onClick={(event) => {
                    if (tool.id === "delete-selected") {
                      setIsLinesMenuOpen(false);
                      setIsDeleteMenuOpen(false);
                      void deleteSelectedDrawing();
                      return;
                    }

                    if (tool.id === "delete") {
                      setIsLinesMenuOpen(false);
                      const nextOpen = !isDeleteMenuOpen;
                      setIsDeleteMenuOpen(nextOpen);
                      if (nextOpen) {
                        setDeleteMenuPosition(terminalToolPopoverPosition(event.currentTarget.getBoundingClientRect(), 224, 112));
                        setDockMessage({ tone: "success", text: "Delete menu opened. Choose one drawing or clear chart drawings." });
                      }
                      return;
                    }

                    if (tool.id === "lines") {
                      const nextOpen = !isLinesMenuOpen;
                      setIsLinesMenuOpen(nextOpen);
                      setIsDeleteMenuOpen(false);
                      if (nextOpen) {
                        setLinesMenuPosition(terminalToolPopoverPosition(event.currentTarget.getBoundingClientRect(), 224, 154));
                      }
                      setSelectedToolKind("select");
                      setSelectedDrawingId("");
                      setSelectedOrderId("");
                      setDrawingError(null);
                      setDrawingPlacementStart(null);
                      setDockMessage({ tone: "success", text: "Lines menu opened. Pick an implemented line tool." });
                      return;
                    }

                    if (tool.id === "zoom") {
                      selectDrawingTool("zoom");
                      return;
                    }

                    if (tool.id === "lock") {
                      const nextLockedState = !areDrawingsLocked;
                      setAreDrawingsLocked(nextLockedState);
                      if (nextLockedState) {
                        setSelectedToolKind("select");
                        setDrawingPlacementStart(null);
                      }
                      setDockMessage({ tone: "success", text: nextLockedState ? "Chart drawings locked." : "Chart drawings unlocked." });
                      return;
                    }

                    if (tool.id === "visibility") {
                      const nextVisibleState = !isDrawingLayerVisible;
                      setIsDrawingLayerVisible(nextVisibleState);
                      setDockMessage({ tone: "success", text: nextVisibleState ? "Chart drawings shown." : "Chart drawings hidden." });
                      return;
                    }

                    selectDrawingTool(tool.kind ?? "select");
                  }}
                >
                  <ToolIcon className="h-6 w-6" strokeWidth={1.65} aria-hidden="true" />
                </button>
              );
            })}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col lg:col-start-2 lg:row-start-1 xl:col-start-auto xl:row-start-auto">
            <div
              className="relative flex min-h-[18rem] flex-1 overflow-hidden bg-black"
              data-testid="practice-terminal-chart-surface"
              data-revealed-candle-count={revealed?.candles.length ?? 0}
              data-terminal-warmup-boundary="revealed-only-24-max"
            >
              <TerminalChart
                candles={revealed?.candles ?? []}
                timeframeMinutes={session?.timeframeMinutes ?? 60}
                orders={orders}
                annotations={isDrawingLayerVisible ? annotations : []}
                eventMarkers={filteredEventMarkers}
                showEvents={showEvents}
                indicatorSettings={indicatorSettings}
                selectedOrderId={selectedOrderId}
                selectedDrawingId={selectedDrawingId}
                selectedEventId={selectedEventId}
                activeDrawingTool={selectedToolKind}
                canPlaceDrawing={(canMutateDrawings || selectedToolKind === "zoom") && selectedToolKind !== "select" && (selectedToolKind === "zoom" || !areDrawingsLocked)}
                canEditDrawings={canMutateDrawings && selectedToolKind === "select"}
                onSelectOrder={selectTerminalOrder}
                onSelectDrawing={selectTerminalDrawing}
                onSelectEvent={selectTerminalEvent}
                onPlaceDrawing={createTerminalDrawingFromChartPoint}
                onMoveDrawing={updateTerminalDrawingChartPoints}
                onCancelTool={cancelActiveChartTool}
              />
              <div
                className="absolute left-1/2 top-3 z-40 flex h-10 max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-0.5 rounded-[6px] border border-white/15 bg-black px-1 shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
                data-testid="practice-terminal-floating-replay-controls"
                aria-label="Replay controls"
              >
                <GripHorizontal className="mx-1 h-4 w-4 text-[color:var(--label3)]" aria-hidden="true" />
                <button type="button" className="focus-ring grid h-8 w-8 place-items-center rounded-[5px] hover:bg-white/10 disabled:opacity-35" disabled={!canStepBack} onClick={() => void persistReplayIndex(currentIndex - 1)} aria-label="Previous candle" title="Previous candle">
                  <StepBack className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" className="focus-ring grid h-8 w-8 place-items-center rounded-[5px] bg-white text-black disabled:opacity-35" disabled={!canStepForward && !isPlaying} onClick={() => setIsPlaying((current) => !current)} aria-label={isPlaying ? "Pause replay" : "Play replay"} title={isPlaying ? "Pause replay" : "Play replay"}>
                  {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                </button>
                <button type="button" className="focus-ring grid h-8 w-8 place-items-center rounded-[5px] hover:bg-white/10 disabled:opacity-35" disabled={!canStepForward} onClick={() => void persistReplayIndex(currentIndex + 1)} aria-label="Next candle" title="Next candle">
                  <StepForward className="h-4 w-4" aria-hidden="true" />
                </button>
                <select aria-label="Replay speed" className="focus-ring h-8 w-[4.25rem] rounded-[5px] border-0 bg-[#111113] px-1.5 text-xs" value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value))}>
                  {speedOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="hidden h-8 items-center border-l border-white/10 px-2 text-[10px] font-semibold text-[color:var(--label2)] sm:flex">
                  {terminalTimeframeOptions.find((option) => option.value === session?.timeframeMinutes)?.label ?? `${session?.timeframeMinutes ?? 0}m`}
                </span>
              </div>
            </div>
            {activeIndicatorBadges.length ? (
              <div className="shrink-0 border-t border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--ink)_86%,black_8%)] px-3 py-2">
                <div className="grid gap-2 sm:grid-cols-5">
                  <MiniOrderStat label={`SMA ${indicatorSettings.smaPeriod}`} value={indicatorSettings.smaEnabled ? (latestSma === undefined ? "Reveal more" : formatTerminalNumber(latestSma, 4)) : "Off"} />
                  <MiniOrderStat label={`EMA ${indicatorSettings.emaPeriod}`} value={indicatorSettings.emaEnabled ? (latestEma === undefined ? "Reveal more" : formatTerminalNumber(latestEma, 4)) : "Off"} />
                  <MiniOrderStat label={`RSI ${indicatorSettings.rsiPeriod}`} value={indicatorSettings.rsiEnabled ? (latestRsi === undefined ? "Reveal more" : formatTerminalNumber(latestRsi, 1)) : "Off"} />
                  <MiniOrderStat label={`ATR ${indicatorSettings.atrPeriod}`} value={indicatorSettings.atrEnabled ? (latestAtr === undefined ? "Reveal more" : formatTerminalNumber(latestAtr, 4)) : "Off"} />
                  <MiniOrderStat label={`Vol ${indicatorSettings.volumeMaPeriod}`} value={indicatorSettings.volumeMaEnabled ? (!indicators.hasVolume ? "No volume" : latestVolumeMa === undefined ? "Reveal more" : formatCompactFinancial(latestVolumeMa)) : "Off"} />
                </div>
              </div>
            ) : null}
            <footer
              className="shrink-0 border-t border-white/10 bg-black px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-3 lg:pb-2"
              data-testid="practice-terminal-bottom-status-bar"
              data-practice-terminal-trade-dock="round-buy-sell-quantity"
            >
              <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(24rem,auto)_minmax(14rem,1fr)_auto] xl:items-center" data-practice-terminal-chart-density="dense-fx-style" data-practice-terminal-footer-wrap="stage29d15-xl-only-columns">
                <div className="flex min-w-0 items-center gap-2.5 overflow-x-auto">
                  <button
                    type="button"
                    className="focus-ring grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#25b6a7] text-base font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_26px_rgba(37,182,167,0.26)] transition hover:bg-[#2ecabd] disabled:cursor-not-allowed disabled:opacity-40 sm:h-16 sm:w-16 sm:text-lg"
                    disabled={isSaving || isSessionLocked}
                    onClick={() => void submitQuickMarketOrder("buy")}
                    aria-label="Buy simulated order"
                    title="Quick simulated market Buy"
                    data-testid="practice-terminal-quick-buy"
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    className="focus-ring grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#f05252] text-base font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_26px_rgba(240,82,82,0.24)] transition hover:bg-[#ff5c5c] disabled:cursor-not-allowed disabled:opacity-40 sm:h-16 sm:w-16 sm:text-lg"
                    disabled={isSaving || isSessionLocked}
                    onClick={() => void submitQuickMarketOrder("sell")}
                    aria-label="Sell simulated order"
                    title="Quick simulated market Sell"
                    data-testid="practice-terminal-quick-sell"
                  >
                    Sell
                  </button>
                  <label className="grid h-14 min-w-[13rem] flex-1 max-w-[28rem] grid-cols-[minmax(0,1fr)_3rem] overflow-hidden rounded-[18px] border border-[#3d4352] bg-[#050507] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] sm:h-16">
                    <span className="sr-only">Calculated order quantity</span>
                    <input
                      className="min-w-0 bg-transparent px-5 text-xl font-semibold tabular-nums text-white outline-none sm:text-2xl"
                      readOnly
                      value={formatTerminalQuantity(bottomPreviewSize, instrumentSpec)}
                      aria-label="Calculated order quantity"
                    />
                    <span className="grid place-items-center border-l border-white/10 text-[color:var(--label3)]" aria-hidden="true">
                      <MoveVertical className="h-6 w-6" />
                    </span>
                  </label>
                  <button
                    type="button"
                    className="focus-ring grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[#1d2332] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_24px_rgba(29,35,50,0.28)] transition hover:bg-[#293145] disabled:cursor-not-allowed disabled:opacity-40 sm:h-16 sm:w-16"
                    disabled={isSaving || isSessionLocked}
                    onClick={() => focusTerminalTicket(orderForm.direction)}
                    aria-label="Open simulated order ticket"
                    title="Open simulated order ticket"
                    data-testid="practice-terminal-open-order-ticket"
                  >
                    <Rocket className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                {dockMessage ? (
                  <p
                    className={`min-w-0 rounded-[8px] border px-2.5 py-1.5 text-xs leading-5 xl:col-span-3 ${dockMessage.tone === "success" ? "border-[color:color-mix(in_srgb,var(--green)_34%,transparent)] text-[color:var(--green)]" : "border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] text-[color:var(--red)]"}`}
                    data-testid="practice-terminal-quick-order-message"
                    role="status"
                  >
                    {dockMessage.text}
                  </p>
                ) : null}
                <div className="grid min-w-0 grid-cols-2 items-center gap-x-3 gap-y-1 sm:grid-cols-4 xl:flex xl:justify-end xl:gap-4">
                  <BottomDockMetric label="Account Balance" value={formatCompactFinancial(session?.startingBalance ?? 0)} />
                  <BottomDockMetric label="Equity" value={formatCompactFinancial(currentBalance)} />
                  <BottomDockMetric label="Realized PnL" value={formatCompactFinancial(realizedPnl)} tone={realizedPnl >= 0 ? "green" : "red"} />
                  <BottomDockMetric label="Unrealized PnL" value="0" tone="amber" />
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2 xl:justify-end">
                  <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">{isPlaying ? "Replaying" : isSessionLocked ? "Locked" : `Candle ${currentIndex + 1}/${availableCount || 0}`}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" className="focus-ring grid h-10 w-10 place-items-center rounded-[10px] border border-white/10 hover:bg-white/10" onClick={() => openUtilityPanel("objects")} aria-label="Open analytics and objects" title="Analytics and objects">
                      <BarChart3 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" className="focus-ring grid h-10 w-10 place-items-center rounded-[10px] border border-white/10 hover:bg-white/10" onClick={() => void toggleTerminalFullscreen()} aria-label="Toggle fullscreen" title="Toggle fullscreen">
                      <Maximize2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </footer>
          </div>

          <aside
            className={`${isUtilityPanelOpen ? "flex" : "hidden"} h-[32dvh] min-h-0 max-h-[20rem] flex-col border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)] lg:col-start-2 lg:row-start-2 lg:h-[30dvh] lg:max-h-[20rem] xl:col-start-auto xl:row-start-auto xl:h-auto xl:max-h-[calc(100dvh-3.75rem)] xl:border-l xl:border-t-0 xl:pb-0`}
            data-practice-terminal-responsive-drawer="bottom-sheet-mobile-side-desktop"
            data-practice-terminal-panel-breakpoint="side-panel-at-xl"
            data-testid="practice-terminal-right-panel"
          >
            <nav
              className="grid grid-cols-[repeat(5,2.5rem)_2.5rem] justify-end gap-1 border-b border-white/10 bg-[#070708] p-1"
              data-practice-terminal-mobile-tabs="objects-order-goto-news-journal"
              data-practice-terminal-tabs="compact-icon-tabs"
              data-testid="practice-terminal-right-panel-tabs"
              aria-label="Practice terminal panel tabs"
            >
              {terminalMobilePanelTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`focus-ring grid h-10 w-10 place-items-center rounded-[5px] ${mobilePanelTab === tab.value ? "bg-white/10 text-white" : "text-[color:var(--label3)] hover:bg-white/5 hover:text-white"}`}
                  aria-pressed={mobilePanelTab === tab.value}
                  aria-label={tab.fullLabel}
                  title={tab.fullLabel}
                  onClick={() => openUtilityPanel(tab.value)}
                >
                  <tab.Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{tab.label}</span>
                </button>
              ))}
              <button type="button" className="focus-ring grid h-10 w-9 place-items-center rounded-[5px] text-[color:var(--label3)] hover:bg-white/10 hover:text-white" onClick={() => setIsUtilityPanelOpen(false)} aria-label="Collapse utility panel" title="Collapse utility panel">
                <PanelRightClose className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
            <section
              ref={ticketRef}
              data-testid="practice-terminal-order-ticket"
              data-practice-terminal-order-popout="chart-overlay"
              role={mobilePanelTab === "order" ? "dialog" : undefined}
              aria-label="Place simulated order"
              className={`${mobileTicketVisibility()} min-h-0 flex-1 overflow-y-auto border-b border-white/10 bg-black p-3 ${mobilePanelTab === "order" ? "xl:fixed xl:left-[5.25rem] xl:top-[5.25rem] xl:z-50 xl:block xl:max-h-[calc(100dvh-10rem)] xl:w-[min(48rem,calc(100vw-27rem))] xl:overflow-hidden xl:rounded-[16px] xl:border xl:border-[#1b5c84] xl:p-0 xl:shadow-[0_0_0_2px_rgba(29,92,132,0.55),0_24px_70px_rgba(0,0,0,0.68)]" : "xl:hidden"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 xl:border-b xl:border-white/15 xl:px-5 xl:py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold xl:text-xl">Place Order</p>
                  <p className="mt-1 hidden text-xs leading-5 text-[color:var(--label2)] xl:block">
                    Simulated only. Entries use revealed candles and never place a broker or exchange order.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden rounded-full bg-[#43464b] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] xl:inline-flex">Preset</span>
                  <Badge tone="amber">Practice only</Badge>
                  <button
                    type="button"
                    className="focus-ring hidden h-9 w-9 place-items-center rounded-full text-[color:var(--label2)] hover:bg-white/10 hover:text-white xl:grid"
                    onClick={() => setMobilePanelTab("objects")}
                    aria-label="Close order ticket"
                    title="Close order ticket"
                    data-practice-terminal-order-popout-close="true"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)] xl:hidden">
                Simulated orders only. Entries use revealed candles and never place a broker or exchange order.
              </p>
              <form className="mt-3 grid gap-2 xl:mt-0 xl:max-h-[calc(100dvh-16.5rem)] xl:overflow-y-auto xl:p-5" onSubmit={submitTerminalOrder}>
                <div className="grid grid-cols-2 gap-2 xl:gap-3">
                  <Button
                    className="h-9 rounded-[8px] px-3 xl:h-12 xl:text-base"
                    type="button"
                    variant={orderForm.direction === "buy" ? "primary" : "secondary"}
                    disabled={isSaving || isSessionLocked}
                    onClick={() => setOrderForm((current) => ({ ...current, direction: "buy" }))}
                  >
                    Buy
                  </Button>
                  <Button
                    className="h-9 rounded-[8px] px-3 xl:h-12 xl:text-base"
                    type="button"
                    variant={orderForm.direction === "sell" ? "primary" : "secondary"}
                    disabled={isSaving || isSessionLocked}
                    onClick={() => setOrderForm((current) => ({ ...current, direction: "sell" }))}
                  >
                    Sell
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 xl:gap-3">
                  {orderTypeOptions.map((option) => (
                    <Button
                      key={option.value}
                      className="h-8 rounded-[8px] px-2 text-xs xl:h-11 xl:text-sm"
                      type="button"
                      variant={orderForm.orderType === option.value ? "primary" : "secondary"}
                      disabled={isSaving || isSessionLocked}
                      onClick={() => setOrderForm((current) => ({ ...current, orderType: option.value }))}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Strategy (optional)
                  <select className={compactInputClass} disabled={isSaving || isSessionLocked} value={orderForm.playbookId} onChange={(event) => setOrderForm((current) => ({ ...current, playbookId: event.target.value }))}>
                    <option value="">No strategy</option>
                    {activePlaybooks
                      .filter((playbook) => !session || !playbook.market || playbook.market === session.assetClass)
                      .map((playbook) => (
                      <option key={playbook.playbookId} value={playbook.playbookId}>{playbook.name}</option>
                      ))}
                  </select>
                </label>
                <div className="grid grid-cols-3 gap-2 xl:gap-3">
                  <label className="grid gap-1.5 text-xs font-semibold">
                    Entry
                    <input
                      ref={ticketEntryRef}
                      className={compactInputClass}
                      disabled={isSaving || isSessionLocked || orderForm.orderType === "market"}
                      inputMode="decimal"
                      value={orderForm.orderType === "market" ? (latestCandle?.close ? String(latestCandle.close) : "") : orderForm.requestedPrice}
                      onChange={(event) => setOrderForm((current) => ({ ...current, requestedPrice: event.target.value }))}
                      placeholder="Latest"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold">
                    SL
                    <input className={compactInputClass} disabled={isSaving || isSessionLocked} inputMode="decimal" value={orderForm.stopLoss} onChange={(event) => setOrderForm((current) => ({ ...current, stopLoss: event.target.value }))} />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold">
                    TP
                    <input className={compactInputClass} disabled={isSaving || isSessionLocked} inputMode="decimal" value={orderForm.takeProfit} onChange={(event) => setOrderForm((current) => ({ ...current, takeProfit: event.target.value }))} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 xl:gap-3">
                  <label className="grid gap-1.5 text-xs font-semibold">
                    Risk $
                    <input className={compactInputClass} readOnly value={riskAmount.toFixed(2)} aria-label="Risk amount preview" />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold">
                    Risk %
                    <input className={compactInputClass} readOnly value={session ? String(session.riskPct) : "0"} aria-label="Risk percent preview" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-3">
                  <MiniOrderStat label="Size" value={`${formatTerminalQuantity(previewSize, instrumentSpec)} ${instrumentSpec?.quantityLabel ?? "Qty"}`} />
                  <MiniOrderStat label="Notional" value={previewNotional > 0 ? formatTerminalMoney(previewNotional) : "0"} />
                  <MiniOrderStat label={instrumentSpec?.pipLabel === "pip" ? "Pips" : "Ticks"} value={previewPipDistance > 0 ? formatTerminalNumber(previewPipDistance, 2) : "0"} />
                  <MiniOrderStat label="Spec" value={instrumentSpec?.displayName ?? session?.symbol ?? "-"} />
                </div>
                <p className="text-[11px] leading-4 text-[color:var(--label3)]" data-testid="practice-terminal-instrument-format">
                  Price {instrumentSpec?.pricePrecision ?? 2} dp · {instrumentSpec?.quantityLabel ?? "Qty"} {instrumentSpec?.quantityPrecision ?? 6} dp. Practice estimates may differ by venue.
                </p>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Checklist
                  <textarea className={compactInputClass} disabled={isSaving || isSessionLocked} rows={2} value={orderForm.checklistNotes} onChange={(event) => setOrderForm((current) => ({ ...current, checklistNotes: event.target.value }))} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Terminal note
                  <textarea className={compactInputClass} disabled={isSaving || isSessionLocked} rows={2} value={orderForm.notes} onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
                {ticketError ? <p className="rounded-[8px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-2.5 py-2 text-xs leading-5 text-[color:var(--red)]">{ticketError}</p> : null}
                {!orderForm.playbookId ? <p className="text-xs leading-5 text-[color:var(--label2)]">This trade will count in overall analytics but not in a Strategy breakdown.</p> : null}
                {!latestCandle ? <p className="text-xs leading-5 text-[color:var(--label2)]">Reveal one candle before submitting simulated orders. Market entries use the latest revealed close.</p> : null}
                {isSessionLocked ? <p className="text-xs leading-5 text-[color:var(--label2)]">Completed sessions are locked for mutations and remain review-only.</p> : null}
                <Button
                  className="h-9 rounded-[8px] px-3 xl:h-12 xl:text-base"
                  type="submit"
                  variant="primary"
                  disabled={!canMutateOrders || !latestCandle}
                >
                  Submit simulated order
                </Button>
              </form>
            </section>

            <div
              className={`${mobilePanelTab === "order" ? "hidden" : "grid"} min-h-0 flex-1 gap-3 overflow-y-auto overscroll-contain p-3 lg:gap-4`}
              data-practice-terminal-panel-content="tabbed-utility-panel"
            >
              <div className="flex min-w-0 items-center justify-between gap-2" data-practice-terminal-active-panel-title="true">
                <p className="clip-line text-base font-semibold">
                  {terminalMobilePanelTabs.find((tab) => tab.value === mobilePanelTab)?.fullLabel ?? "Panel"}
                </p>
                <Badge tone="neutral">{session?.status ?? "session"}</Badge>
              </div>

              <section className={`${mobilePanelVisibility("goto")} gap-3`} data-testid="practice-terminal-go-to-panel">
                <div>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--label2)]">Move within this practice session by candle or time.</p>
                </div>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Candle index
                  <input className={compactInputClass} inputMode="numeric" value={goToIndex} onChange={(event) => setGoToIndex(event.target.value)} placeholder={`0-${Math.max(0, availableCount - 1)}`} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Date / time
                  <input className={compactInputClass} type="datetime-local" value={goToDateTime} onChange={(event) => setGoToDateTime(event.target.value)} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" disabled={isSaving || isSessionLocked} onClick={() => void navigateTerminalReplay({ mode: "start" })}>Start</Button>
                  <Button size="sm" disabled={isSaving || isSessionLocked} onClick={() => void navigateTerminalReplay({ mode: "latest_revealed" })}>Latest</Button>
                  <Button size="sm" disabled={isSaving || isSessionLocked || !goToIndex} onClick={() => void navigateTerminalReplay({ mode: "index", candleIndex: Number(goToIndex), revealToTarget: true })}>Go to index</Button>
                  <Button size="sm" disabled={isSaving || isSessionLocked || !goToDateTime} onClick={() => void navigateTerminalReplay({ mode: "datetime", dateTime: new Date(goToDateTime).toISOString(), revealToTarget: true })}>Go to time</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" disabled={!previousBookmark || isSaving || isSessionLocked} onClick={() => previousBookmark ? void navigateTerminalReplay({ mode: "index", candleIndex: previousBookmark.candleIndex }) : undefined}>Previous bookmark</Button>
                  <Button size="sm" variant="secondary" disabled={!nextBookmark || isSaving || isSessionLocked} onClick={() => nextBookmark ? void navigateTerminalReplay({ mode: "index", candleIndex: nextBookmark.candleIndex, revealToTarget: true }) : undefined}>Next bookmark</Button>
                </div>
              </section>

              <section className={`${mobilePanelVisibility("objects")} gap-2`} data-testid="practice-terminal-object-tree" data-practice-terminal-object-tree="compact-real-tools">
                <div className="grid grid-cols-2 gap-1.5">
                  <MiniOrderStat label="Orders" value={String(orders.length)} />
                  <MiniOrderStat label="Drawings" value={String(drawings.length)} />
                  <MiniOrderStat label="Events" value={String(filteredEventMarkers.length)} />
                  <MiniOrderStat label="Bookmarks" value={String(bookmarks.length)} />
                </div>
                <div className="flex gap-1 overflow-x-auto" data-testid="practice-terminal-object-tree-filters">
                  {terminalObjectFilters.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      className={`focus-ring h-7 shrink-0 rounded-[7px] border px-2 text-[11px] font-semibold ${objectTreeFilter === filter.value ? "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_18%,black)] text-[color:var(--accent)]" : "border-white/10 text-[color:var(--label2)] hover:bg-white/10"}`}
                      onClick={() => setObjectTreeFilter(filter.value)}
                      aria-pressed={objectTreeFilter === filter.value}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                {!orders.length && !drawings.length && !bookmarks.length && !filteredEventMarkers.length ? <p className="text-xs leading-5 text-[color:var(--label2)]">Orders and chart objects appear here as you work.</p> : null}
                {(objectTreeFilter === "all" || objectTreeFilter === "orders") && orders.length ? (
                  <div className="grid gap-1" data-practice-terminal-object-orders="compact">
                    {orders.slice(0, 8).map((order) => (
                      <button
                        key={order.orderId}
                        type="button"
                        data-testid="practice-terminal-object-tree-row"
                        className={`focus-ring grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] border border-[color:var(--line)] bg-white/[0.025] px-2.5 py-2 text-left text-xs hover:border-[color:var(--accent)] hover:bg-white/[0.06] ${selectedOrderId === order.orderId ? "ring-1 ring-[color:var(--accent)]" : ""}`}
                        onClick={() => selectTerminalOrder(order.orderId)}
                      >
                        <span className="min-w-0">
                          <span className="truncate font-semibold text-white">{order.direction.toUpperCase()} {order.status}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-[color:var(--label3)]">Order · {order.orderType}</span>
                        </span>
                        <Badge tone={order.status === "closed" ? "green" : order.status === "open" ? "amber" : order.status === "pending" ? "accent" : "red"}>{order.status}</Badge>
                      </button>
                    ))}
                  </div>
                ) : null}
                {(objectTreeFilter === "all" || objectTreeFilter === "drawings") && drawingSummaryRows.length ? (
                  <div className="grid gap-1" data-practice-terminal-drawing-list="compact-object-tree">
                    {drawingSummaryRows.map((drawing) => (
                      <button
                        key={drawing.annotationId}
                        type="button"
                        data-testid="practice-terminal-object-tree-row"
                        className={`focus-ring grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] border border-[color:var(--line)] bg-white/[0.025] px-2.5 py-2 text-left text-xs hover:border-[color:var(--accent)] hover:bg-white/[0.06] ${selectedDrawingId === drawing.annotationId ? "ring-1 ring-[color:var(--accent)]" : ""}`}
                        onClick={() => selectTerminalDrawing(drawing.annotationId)}
                      >
                        <span className="min-w-0">
                          <span className="truncate font-semibold text-white">{drawing.label || drawingObjectTypeLabel(drawing.kind)}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-[color:var(--label3)]">
                            {drawingObjectTypeLabel(drawing.kind)}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${drawingColorClass(drawing.colorToken)}`}>
                          {drawing.kind === "fibonacci_retracement" ? "FIB" : drawing.kind === "measurement_placeholder" ? "RULER" : "OBJ"}
                        </span>
                      </button>
                    ))}
                    {hiddenDrawingRowCount ? (
                      <p className="rounded-[7px] border border-[color:var(--line)] px-2.5 py-2 text-xs text-[color:var(--label2)]">
                        {hiddenDrawingRowCount} more chart objects hidden. Use chart labels to focus one.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {(objectTreeFilter === "all" || objectTreeFilter === "events") ? filteredEventMarkers.slice(-6).reverse().map((eventMarker) => (
                  <button
                    key={eventMarker.eventId}
                    type="button"
                    data-testid="practice-terminal-object-tree-row"
                    className="focus-ring grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] border border-[color:var(--line)] bg-white/[0.025] px-2.5 py-2 text-left text-xs hover:border-[color:var(--accent)] hover:bg-white/[0.06]"
                    onClick={() => selectTerminalEvent(eventMarker.eventId)}
                  >
                    <span className="min-w-0">
                      <span className="truncate font-semibold text-white">{eventMarker.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-[color:var(--label3)]">Event · {eventCategoryLabel(eventMarker.category)}</span>
                    </span>
                    <Badge tone={eventImpactTone(eventMarker.impact)}>{eventMarker.impact}</Badge>
                  </button>
                )) : null}
                {(objectTreeFilter === "all" || objectTreeFilter === "bookmarks") ? bookmarks.slice(-6).reverse().map((bookmark) => (
                  <button
                    key={bookmark.bookmarkId}
                    type="button"
                    data-testid="practice-terminal-object-tree-row"
                    className="focus-ring grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] border border-[color:var(--line)] bg-white/[0.025] px-2.5 py-2 text-left text-xs hover:border-[color:var(--accent)] hover:bg-white/[0.06]"
                    onClick={() => void navigateTerminalReplay({ mode: "index", candleIndex: bookmark.candleIndex, revealToTarget: bookmark.candleIndex > currentIndex })}
                  >
                    <span className="min-w-0">
                      <span className="truncate font-semibold text-white">{bookmark.label ?? `Bookmark ${bookmark.candleIndex}`}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-[color:var(--label3)]">Bookmark · Candle {bookmark.candleIndex}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-[color:var(--line)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[color:var(--label2)]">GO</span>
                  </button>
                )) : null}
                {objectTreeFilter !== "all" &&
                ((objectTreeFilter === "orders" && !orders.length) ||
                  (objectTreeFilter === "drawings" && !drawings.length) ||
                  (objectTreeFilter === "events" && !filteredEventMarkers.length) ||
                  (objectTreeFilter === "bookmarks" && !bookmarks.length)) ? (
                  <p className="rounded-[8px] border border-dashed border-white/15 px-2.5 py-3 text-xs leading-5 text-[color:var(--label2)]">
                    No {objectTreeFilter} in this revealed workspace yet.
                  </p>
                ) : null}
              </section>

              <section className={`${mobilePanelVisibility("objects")} gap-2`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{selectedOrder ? "Selected order" : "Orders"}</p>
                  {selectedOrder ? (
                    <button
                      type="button"
                      className="focus-ring rounded-[5px] border border-white/10 px-2 py-1 text-[11px] font-semibold text-[color:var(--label2)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                      onClick={() => setSelectedOrderId("")}
                    >
                      Show all
                    </button>
                  ) : orders.length ? <Badge tone="neutral">{orders.length}</Badge> : null}
                </div>
                <p className="text-xs leading-5 text-[color:var(--label2)]">
                  {selectedOrder ? "Only this simulated order is open. Show all returns to the short order list." : "Tap a short row or chart chip to open one simulated order."}
                </p>
                {!selectedOrder && orderSummaryRows.length ? (
                  <div className="grid gap-1" data-practice-terminal-compact-order-list="collapsed-until-selected">
                    {orderSummaryRows.map((order) => {
                      const orderSpec = orderInstrumentSpec(order, instrumentSpec);
                      const toneClass =
                        order.direction === "buy"
                          ? "border-[color:color-mix(in_srgb,var(--green)_34%,transparent)] text-[color:var(--green)]"
                          : "border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] text-[color:var(--red)]";

                      return (
                        <button
                          key={order.orderId}
                          type="button"
                          data-testid="practice-terminal-order-summary-row"
                          className="focus-ring grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] border border-[color:var(--line)] bg-white/[0.025] px-2.5 py-2 text-left text-xs hover:border-[color:var(--accent)] hover:bg-white/[0.06]"
                          onClick={() => selectTerminalOrder(order.orderId)}
                        >
                          <span className="min-w-0">
                            <span className={`mr-1 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${toneClass}`}>
                              {order.direction.toUpperCase()}
                            </span>
                            <span className="font-semibold text-white">{order.status}</span>
                          </span>
                          <span className="shrink-0 text-right text-[color:var(--label2)]">
                            {formatTerminalPrice(order.filledPrice ?? order.requestedPrice, orderSpec)}
                          </span>
                        </button>
                      );
                    })}
                    {hiddenOrderRowCount ? (
                      <p className="rounded-[7px] border border-[color:var(--line)] px-2.5 py-2 text-xs text-[color:var(--label2)]">
                        {hiddenOrderRowCount} more orders hidden. Use chart chips or recent rows to focus one.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {visibleOrderCards.length ? visibleOrderCards.map((order) => (
                  <div
                    key={order.orderId}
                    id={`terminal-order-card-${order.orderId}`}
                    data-testid="practice-terminal-order-card"
                    className={`grid gap-2 rounded-[8px] border px-3 py-2 text-xs ${selectedOrderId === order.orderId ? "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--glass-hi)_34%,transparent)] ring-1 ring-[color:var(--accent)]" : "border-[color:var(--line)]"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{order.direction.toUpperCase()} {order.orderType} · {order.status}</p>
                        <p className="mt-1 truncate leading-5 text-[color:var(--label2)]">{order.playbookName ?? "No strategy"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button className="h-7 rounded-[8px] px-2 text-[11px]" size="sm" type="button" variant="secondary" onClick={() => selectTerminalOrder(order.orderId)}>
                          Focus
                        </Button>
                        <Badge tone={order.status === "closed" ? "green" : order.status === "open" ? "amber" : order.status === "pending" ? "accent" : "red"}>
                          {order.closeReason ?? order.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(() => {
                        const orderSpec = orderInstrumentSpec(order, instrumentSpec);

                        return (
                          <>
                            <MiniOrderStat label="Entry" value={formatTerminalPrice(order.filledPrice ?? order.requestedPrice, orderSpec)} />
                            <MiniOrderStat label="SL" value={formatTerminalPrice(order.stopLoss, orderSpec)} />
                            <MiniOrderStat label="TP" value={formatTerminalPrice(order.takeProfit, orderSpec)} />
                            <MiniOrderStat label="Size" value={`${formatTerminalQuantity(order.size, orderSpec)} ${orderSpec?.quantityLabel ?? "Qty"}`} />
                            <MiniOrderStat label="Remain" value={formatTerminalQuantity(order.remainingSize ?? order.size, orderSpec)} />
                            <MiniOrderStat label="Notional" value={formatTerminalMoney(order.notional)} />
                            <MiniOrderStat label={orderSpec?.pipLabel === "pip" ? "Pips" : "Ticks"} value={order.stopDistanceInPips === undefined ? "-" : formatTerminalNumber(order.stopDistanceInPips, 2)} />
                          </>
                        );
                      })()}
                      <MiniOrderStat label="P&L" value={formatTerminalMoney(order.pnl)} />
                      <MiniOrderStat label="R" value={order.rMultiple === undefined ? "-" : `${order.rMultiple.toFixed(2)}R`} />
                      <MiniOrderStat label="Type" value={order.orderType} />
                    </div>
                    {order.status === "pending" ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Button className="h-8 rounded-[8px] px-2 text-xs" size="sm" disabled={!canMutateOrders} onClick={() => cancelTerminalOrder(order.orderId)}>
                          Cancel pending
                        </Button>
                      </div>
                    ) : null}
                    {order.status === "open" ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Button className="h-8 rounded-[8px] px-2 text-xs" size="sm" disabled={!canMutateOrders || !latestCandle} onClick={() => manuallyCloseTerminalOrder(order.orderId)}>
                          Manual close
                        </Button>
                      </div>
                    ) : null}
                    {order.status === "open" ? (
                      <form className="grid grid-cols-[1fr_1fr_auto] gap-1.5" onSubmit={(event) => updateTerminalOrderLevels(event, order.orderId)}>
                        <input className={compactInputClass} name="stopLoss" disabled={!canMutateOrders} inputMode="decimal" defaultValue={order.stopLoss ?? ""} aria-label="Edit SL" />
                        <input className={compactInputClass} name="takeProfit" disabled={!canMutateOrders} inputMode="decimal" defaultValue={order.takeProfit ?? ""} aria-label="Edit TP" />
                        <Button className="h-9 rounded-[8px] px-2 text-xs" size="sm" type="submit" disabled={!canMutateOrders}>
                          Save SL/TP
                        </Button>
                      </form>
                    ) : null}
                    {order.status === "closed" ? (
                      <p className="truncate rounded-[8px] border border-[color:var(--line)] px-2 py-1.5 text-xs text-[color:var(--label2)]">
                        Read-only outcome · {order.closeReason ?? "closed"}
                      </p>
                    ) : null}
                    {order.status === "open" ? (
                      <form className="grid grid-cols-[1fr_1fr_auto] gap-1.5" onSubmit={(event) => partiallyCloseTerminalOrder(event, order.orderId)}>
                        <input className={compactInputClass} name="percent" disabled={!canMutateOrders} inputMode="decimal" placeholder="Close %" aria-label="Partial close percent" />
                        <input className={compactInputClass} name="quantity" disabled={!canMutateOrders} inputMode="decimal" placeholder="Qty" aria-label="Partial close quantity" />
                        <Button className="h-9 rounded-[8px] px-2 text-xs" size="sm" type="submit" disabled={!canMutateOrders || !latestCandle}>
                          Close partial
                        </Button>
                      </form>
                    ) : null}
                    {order.checklistNotes ? <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">Checklist: {order.checklistNotes}</p> : null}
                    {order.notes ? <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">Note: {order.notes}</p> : null}
                    {order.closeEvents?.length ? (
                      <div className="grid gap-1.5">
                        {order.closeEvents.slice(-2).map((event) => (
                          <p key={event.eventId} className="truncate rounded-[8px] border border-[color:var(--line)] px-2 py-1.5 text-xs text-[color:var(--label2)]">
                            {event.eventType === "partial_close" ? "Partial close" : "Full close"} · {formatTerminalQuantity(event.closedSize, event.instrument ?? order.instrument)} @ {formatTerminalPrice(event.exitPrice, event.instrument ?? order.instrument)}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )) : <p className="text-sm leading-6 text-[color:var(--label2)]">No active, pending, or closed simulated orders yet. Reveal a candle, choose Buy or Sell, select a Strategy, and submit a simulated order.</p>}
              </section>

              <section className={`${mobilePanelVisibility("objects")} gap-2`}>
                <p className="text-sm font-semibold">Analytics</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatChip label="Closed" value={String(detail?.performance.closedTrades ?? 0)} className="rounded-[8px]" />
                  <StatChip label="Win rate" value={`${((detail?.performance.winRate ?? 0) * 100).toFixed(0)}%`} className="rounded-[8px]" />
                  <StatChip label="Avg R" value={(detail?.performance.averageR ?? 0).toFixed(2)} className="rounded-[8px]" />
                  <StatChip label="Max DD" value={(detail?.performance.maxDrawdown ?? 0).toFixed(2)} tone="red" className="rounded-[8px]" />
                </div>
              </section>

              {challengeStatus ? (
                <section className={`${mobilePanelVisibility("objects")} gap-2 rounded-[8px] border border-[color:var(--line)] p-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{challengeStatus.challengeName}</p>
                    <Badge tone={challengeStatus.status === "passed" ? "green" : challengeStatus.status === "failed" ? "red" : challengeStatus.status === "active" ? "amber" : "neutral"}>
                      {challengeStatus.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniOrderStat label="Start" value={formatCompactFinancial(challengeStatus.startingBalance)} />
                    <MiniOrderStat label="Equity" value={formatCompactFinancial(challengeStatus.currentEquity)} />
                    <MiniOrderStat label="Target" value={`${Math.min(100, challengeStatus.profitTargetProgress * 100).toFixed(0)}%`} />
                    <MiniOrderStat label="Daily loss" value={`${formatCompactFinancial(challengeStatus.dailyLossUsage)} / ${formatCompactFinancial(challengeStatus.maxDailyLossAmount)}`} />
                    <MiniOrderStat label="Drawdown" value={`${formatCompactFinancial(challengeStatus.drawdownUsage)} / ${formatCompactFinancial(challengeStatus.maxTotalDrawdownAmount)}`} />
                    <MiniOrderStat label="Open" value={`${challengeStatus.openTrades}/${challengeStatus.maxOpenSimulatedTrades}`} />
                    <MiniOrderStat label="Trades" value={`${challengeStatus.tradesUsed}/${challengeStatus.maxTradesPerSession}`} />
                    <MiniOrderStat label="Days" value={`${challengeStatus.tradingDays}${challengeStatus.minimumTradingDays ? `/${challengeStatus.minimumTradingDays}` : ""}`} />
                  </div>
                  {challengeStatus.breachMessages.length ? (
                    <div className="grid gap-1">
                      {challengeStatus.breachMessages.slice(0, 3).map((message) => (
                        <p key={message} className="break-safe rounded-[8px] border border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] px-2 py-1.5 text-xs leading-5 text-[color:var(--red)]">
                          {message}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="break-safe text-xs leading-5 text-[color:var(--label2)]">
                      Simulated challenge rules use practice orders only.
                    </p>
                  )}
                </section>
              ) : null}

              <section className={`${mobilePanelVisibility("news")} gap-2`} data-testid="practice-terminal-news-panel">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">News and events</p>
                  <Badge tone="accent">{filteredEventMarkers.length}/{eventMarkers.length}</Badge>
                </div>
                <p className="text-xs leading-5 text-[color:var(--label2)]">
                  Only events available in the revealed session window appear here.
                </p>
                <label className="flex items-center justify-between gap-2 rounded-[8px] border border-[color:var(--line)] px-2.5 py-2 text-xs font-semibold">
                  <span>Show chart events</span>
                  <input
                    type="checkbox"
                    checked={showEvents}
                    onChange={(event) => setShowEvents(event.target.checked)}
                    aria-label="Show or hide chart event markers"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Event impact filter"
                    className={compactInputClass}
                    value={eventImpactFilter}
                    onChange={(event) => setEventImpactFilter(event.target.value as "all" | PracticeEventMarkerImpact)}
                  >
                    <option value="all">All impact</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    aria-label="Event category filter"
                    className={compactInputClass}
                    value={eventCategoryFilter}
                    onChange={(event) => setEventCategoryFilter(event.target.value as "all" | PracticeEventMarkerCategory)}
                  >
                    <option value="all">All categories</option>
                    <option value="economic">Economic</option>
                    <option value="news">News</option>
                    <option value="earnings">Earnings</option>
                    <option value="platform_note">Platform note</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {filteredEventMarkers.length ? filteredEventMarkers.slice(-8).reverse().map((eventMarker) => (
                  <button
                    key={eventMarker.eventId}
                    type="button"
                    className={`grid gap-1 rounded-[8px] border px-2.5 py-2 text-left text-xs ${selectedEventId === eventMarker.eventId ? "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--glass-hi)_34%,transparent)] ring-1 ring-[color:var(--accent)]" : "border-[color:var(--line)]"}`}
                    onClick={() => selectTerminalEvent(eventMarker.eventId)}
                  >
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate font-semibold">{eventMarker.title}</span>
                      <Badge tone={eventImpactTone(eventMarker.impact)}>{eventMarker.impact}</Badge>
                    </span>
                    <span className="truncate text-[color:var(--label2)]">
                      {eventCategoryLabel(eventMarker.category)} · {new Date(eventMarker.eventTime).toLocaleString("en-NG")}
                    </span>
                    {selectedEventId === eventMarker.eventId ? (
                      <span className="break-safe leading-5 text-[color:var(--label2)]">{eventMarker.safeSummary}</span>
                    ) : null}
                  </button>
                )) : (
                  <p className="text-sm leading-6 text-[color:var(--label2)]">
                    No static event marker is visible in the revealed candle window yet.
                  </p>
                )}
              </section>

              <section className={`${mobilePanelVisibility("journal")} gap-2`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Bookmarks</p>
                  <Badge tone="accent">{bookmarks.length}</Badge>
                </div>
                <form className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-2" onSubmit={createTerminalBookmark}>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1.5 text-xs font-semibold">
                      Label
                      <input className={compactInputClass} disabled={!canMutateBookmarks} value={bookmarkForm.label} onChange={(event) => setBookmarkForm((current) => ({ ...current, label: event.target.value }))} placeholder={`Candle ${currentIndex}`} />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold">
                      Price
                      <input className={compactInputClass} disabled={!canMutateBookmarks} inputMode="decimal" value={bookmarkForm.priceLevel} onChange={(event) => setBookmarkForm((current) => ({ ...current, priceLevel: event.target.value }))} placeholder={latestCandle ? String(latestCandle.close) : "Optional"} />
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-xs font-semibold">
                    Note
                    <textarea className={compactInputClass} disabled={!canMutateBookmarks} rows={2} value={bookmarkForm.note} onChange={(event) => setBookmarkForm((current) => ({ ...current, note: event.target.value }))} placeholder="Safe text-only replay marker" />
                  </label>
                  <Button className="h-9 rounded-[8px] px-3" size="sm" type="submit" variant="primary" disabled={!canMutateBookmarks || !latestCandle}>
                    Bookmark current candle
                  </Button>
                  {isSessionLocked ? <p className="text-xs leading-5 text-[color:var(--label2)]">Completed sessions keep bookmarks view-only.</p> : null}
                </form>
                {bookmarks.length ? bookmarks.slice(0, 10).map((bookmark) => (
                  <form
                    key={bookmark.bookmarkId}
                    className="grid gap-2 rounded-[8px] border border-[color:var(--line)] px-3 py-2 text-xs"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void updateTerminalBookmark(bookmark.bookmarkId, new FormData(event.currentTarget));
                    }}
                  >
                    <button
                      type="button"
                      className="grid gap-1 text-left"
                      onClick={() => void navigateTerminalReplay({ mode: "index", candleIndex: bookmark.candleIndex, revealToTarget: bookmark.candleIndex > currentIndex })}
                    >
                      <span className="truncate font-semibold">{bookmark.label ?? `Candle ${bookmark.candleIndex}`}</span>
                      <span className="truncate text-[color:var(--label2)]">
                        Candle {bookmark.candleIndex} · {bookmark.candleTime ? new Date(bookmark.candleTime).toLocaleString("en-NG") : "No time"} · Price {bookmark.priceLevel ?? "-"}
                      </span>
                    </button>
                    <input className={compactInputClass} name="label" disabled={!canMutateBookmarks} defaultValue={bookmark.label ?? ""} aria-label="Bookmark label" />
                    <div className="grid grid-cols-[1fr_auto] gap-1.5">
                      <input className={compactInputClass} name="priceLevel" disabled={!canMutateBookmarks} inputMode="decimal" defaultValue={bookmark.priceLevel ?? ""} aria-label="Bookmark price" />
                      <Button className="h-9 rounded-[8px] px-2 text-xs" size="sm" type="submit" disabled={!canMutateBookmarks}>Save</Button>
                    </div>
                    <textarea className={compactInputClass} name="note" disabled={!canMutateBookmarks} rows={2} defaultValue={bookmark.note ?? ""} aria-label="Bookmark note" />
                    <div className="flex flex-wrap gap-1.5">
                      <Button className="h-8 rounded-[8px] px-2 text-xs" size="sm" type="button" disabled={isSaving || (bookmark.candleIndex > currentIndex && isSessionLocked)} onClick={() => void navigateTerminalReplay({ mode: "index", candleIndex: bookmark.candleIndex, revealToTarget: bookmark.candleIndex > currentIndex })}>Go</Button>
                      <Button className="h-8 rounded-[8px] px-2 text-xs" size="sm" type="button" variant="secondary" disabled={!canMutateBookmarks} onClick={() => void deleteTerminalBookmark(bookmark.bookmarkId)}>Remove</Button>
                    </div>
                  </form>
                )) : <p className="text-sm leading-6 text-[color:var(--label2)]">No bookmarks yet. Mark a revealed candle to jump back during review.</p>}
              </section>

              <section className={`${mobilePanelVisibility("objects")} gap-2`} data-testid="practice-terminal-selected-object-editor">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Selected object</p>
                  <Badge tone="accent">{selectedDrawing ? drawingObjectTypeLabel(selectedDrawing.kind) : drawingPlacementStart ? drawingKindLabel(drawingPlacementStart.kind) : "No object"}</Badge>
                </div>
                <p className="text-xs leading-5 text-[color:var(--label2)]">
                  {selectedDrawing ? "Edit the focused chart object or delete it here." : drawingPlacementStart ? "Click the second point on the chart to finish this object." : "Choose a drawing tool, then draw on the chart."}
                </p>
                {!selectedDrawing && drawingPlacementStart ? (
                  <div className="grid gap-1 rounded-[8px] border border-[color:var(--line)] px-2.5 py-2 text-xs">
                    <span className="font-semibold text-white">{drawingKindLabel(drawingPlacementStart.kind)} start selected</span>
                    <span className="truncate text-[color:var(--label2)]">Candle {drawingPlacementStart.candleIndex} · Price {formatTerminalPrice(drawingPlacementStart.priceLevel, instrumentSpec)}</span>
                    <Button className="h-8 rounded-[8px] px-2 text-xs" size="sm" type="button" variant="secondary" onClick={() => {
                      setDrawingPlacementStart(null);
                      setDockMessage({ tone: "success", text: "Chart tool placement cancelled." });
                    }}>
                      Cancel placement
                    </Button>
                  </div>
                ) : null}

                {!selectedDrawing && !drawingPlacementStart ? (
                  <div className="grid gap-1 rounded-[8px] border border-[color:var(--line)] px-2.5 py-2 text-xs text-[color:var(--label2)]">
                    <span>Choose a drawing tool, then draw on the chart.</span>
                    {isSessionLocked ? <span>Completed sessions keep chart objects view-only.</span> : null}
                  </div>
                ) : null}

                {selectedDrawing ? (
                  <form key={selectedDrawing.annotationId} className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-2" onSubmit={updateSelectedDrawing}>
                    <p className="truncate text-xs font-semibold">Selected: {selectedDrawing.label || drawingObjectTypeLabel(selectedDrawing.kind)}</p>
                    {drawingError ? (
                      <p className="rounded-[8px] border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-200">
                        {drawingError}
                      </p>
                    ) : null}
                    <input className={compactInputClass} name="label" disabled={!canMutateDrawings} defaultValue={selectedDrawing.label ?? ""} aria-label="Drawing label" />
                    <textarea className={`${compactInputClass} whitespace-pre-wrap`} name="text" disabled={!canMutateDrawings} rows={3} maxLength={700} defaultValue={selectedDrawing.text} aria-label="Drawing text" />
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Candle
                        <input className={compactInputClass} name="candleIndex" disabled={!canMutateDrawings} inputMode="numeric" defaultValue={selectedDrawing.candleIndex ?? ""} aria-label="Drawing candle index" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Candle 2
                        <input className={compactInputClass} name="secondCandleIndex" disabled={!canMutateDrawings || !requiresTwoChartPoints(selectedDrawing.kind)} inputMode="numeric" defaultValue={selectedDrawing.secondCandleIndex ?? ""} aria-label="Drawing second candle index" />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Price
                        <input className={compactInputClass} name="priceLevel" disabled={!canMutateDrawings || selectedDrawing.kind === "vertical_marker"} inputMode="decimal" defaultValue={selectedDrawing.priceLevel ?? ""} aria-label="Drawing price" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Price 2
                        <input className={compactInputClass} name="secondPriceLevel" disabled={!canMutateDrawings || !requiresTwoChartPoints(selectedDrawing.kind)} inputMode="decimal" defaultValue={selectedDrawing.secondPriceLevel ?? ""} aria-label="Drawing second price" />
                      </label>
                    </div>
                    {selectedDrawing.kind === "measurement_placeholder" ? (
                      <p className="truncate rounded-[8px] border border-[color:var(--line)] px-2 py-1.5 text-xs text-[color:var(--label2)]">
                        {buildMeasurementSummary(selectedDrawing)}
                      </p>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <select className={compactInputClass} name="colorToken" disabled={!canMutateDrawings} defaultValue={selectedDrawing.colorToken ?? "accent"} aria-label="Drawing color">
                        {drawingColorOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <select className={compactInputClass} name="eventId" disabled={!canMutateDrawings || eventMarkers.length === 0} defaultValue={selectedDrawing.eventId ?? ""} aria-label="Drawing event link">
                        <option value="">No event</option>
                        {eventMarkers.slice(-12).reverse().map((eventMarker) => (
                          <option key={eventMarker.eventId} value={eventMarker.eventId}>{eventMarker.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold">
                        <input name="isMainLesson" disabled={!canMutateDrawings} type="checkbox" defaultChecked={selectedDrawing.isMainLesson} />
                        Main lesson
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button className="h-8 rounded-[8px] px-2 text-xs" size="sm" type="submit" disabled={!canMutateDrawings}>Save drawing</Button>
                      <Button className="h-8 rounded-[8px] px-2 text-xs" size="sm" type="button" variant="secondary" disabled={!canMutateDrawings} onClick={() => void deleteSelectedDrawing()}>Delete selected</Button>
                      <Button className="h-8 rounded-[8px] px-2 text-xs" size="sm" type="button" variant="secondary" onClick={() => setSelectedDrawingId("")}>Clear</Button>
                    </div>
                  </form>
                ) : null}
              </section>

              <section className={`${mobilePanelVisibility("journal")} gap-2`} data-testid="practice-terminal-journal-panel">
                <p className="text-sm font-semibold">Review shortcuts</p>
                {detail?.instructorFeedback ? (
                  <div className="grid gap-2 rounded-[8px] border border-[color:var(--line)] p-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[color:var(--label)]">Instructor feedback</span>
                      <Badge tone={detail.instructorFeedback.status === "reviewed" ? "green" : "amber"}>
                        {detail.instructorFeedback.rubric.overallScore}/5
                      </Badge>
                    </div>
                    <p className="break-safe leading-5 text-[color:var(--label2)]">
                      {detail.instructorFeedback.feedbackNote || "No written instructor note was added."}
                    </p>
                    {detail.instructorFeedback.recommendedNextDrill ? (
                      <p className="break-safe leading-5 text-[color:var(--label2)]">
                        Next: {detail.instructorFeedback.recommendedNextDrill}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-[8px] border border-[color:var(--line)] p-2 text-xs leading-5 text-[color:var(--label2)]">
                    Instructor feedback appears here after a completed assignment is reviewed.
                  </p>
                )}
                <Button href={`/app/practice/${encodeURIComponent(sessionId)}`} size="sm">Replay and reflection</Button>
                <Button href={`/app/practice/${encodeURIComponent(sessionId)}/report`} variant="secondary" size="sm">Printable report</Button>
                <Button href="/app/journal" variant="secondary" size="sm">Journal</Button>
              </section>
            </div>
          </aside>
        </section>

        {isLoading ? (
          <div className="fixed inset-x-0 bottom-0 border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-2 text-sm text-[color:var(--label2)]">
            Loading practice terminal...
          </div>
        ) : null}
      </div>

      {isLinesMenuOpen && linesMenuPosition ? (
        <div
          ref={linesMenuRef}
          className="fixed z-[130] grid w-56 max-w-[calc(100vw-1rem)] gap-1 rounded-[8px] border border-white/15 bg-black p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.72)]"
          data-testid="practice-terminal-lines-menu"
          role="menu"
          aria-label="Lines and trend tools"
          style={{ left: linesMenuPosition.left, top: linesMenuPosition.top }}
        >
          {terminalLineTools.filter((tool) => tool.available).map((tool) => (
            <button
              key={tool.id}
              type="button"
              role="menuitem"
              className="focus-ring rounded-[6px] px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/10"
              onClick={() => {
                if (tool.kind) selectDrawingTool(tool.kind);
              }}
            >
              {tool.label}
            </button>
          ))}
        </div>
      ) : null}

      {isDeleteMenuOpen && deleteMenuPosition ? (
        <div
          ref={deleteMenuRef}
          className="fixed z-[130] grid w-56 max-w-[calc(100vw-1rem)] gap-1 rounded-[8px] border border-white/15 bg-black p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.72)]"
          data-testid="practice-terminal-delete-menu"
          role="menu"
          aria-label="Delete chart drawings"
          style={{ left: deleteMenuPosition.left, top: deleteMenuPosition.top }}
        >
          <button
            type="button"
            role="menuitem"
            className="focus-ring rounded-[6px] px-3 py-2 text-left text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!selectedDrawing || !canMutateDrawings}
            onClick={() => {
              setIsDeleteMenuOpen(false);
              void deleteSelectedDrawing();
            }}
          >
            Delete selected drawing
          </button>
          <button
            type="button"
            role="menuitem"
            className="focus-ring rounded-[6px] px-3 py-2 text-left text-sm font-semibold text-red-300 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!drawings.length || !canMutateDrawings}
            onClick={() => {
              setIsDeleteMenuOpen(false);
              void deleteAllTerminalDrawings();
            }}
          >
            Clear chart drawings
          </button>
        </div>
      ) : null}
    </main>
  );
}

export function StudentPracticeTerminalClient(props: StudentPracticeTerminalClientProps) {
  return (
    <RoleGate allowedRole="student" nextPath={`/app/practice/${props.sessionId}/terminal`}>
      <TerminalBody {...props} />
    </RoleGate>
  );
}
