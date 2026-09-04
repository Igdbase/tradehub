import crypto from "node:crypto";
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { createSourceMeta } from "@/lib/course-hub/course-source";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import {
  fetchHistoricalCandlesWithCache,
  historicalDataLimits
} from "@/lib/practice/historical-data-service";
import {
  parseManualTradeFilters,
  validateManualTradeInput,
  type NormalizedManualTradeInput
} from "@/lib/journal/manual-trade-validation";
import type {
  ManualJournalAnalyticsResponse,
  ManualJournalTrade,
  ManualJournalTradeFilters,
  ManualJournalTradeInput,
  ManualJournalTradeListResponse,
  ManualJournalImportResponse,
  ManualJournalTradeReviewResponse,
  ManualJournalTradeMutationResponse,
  ManualTradeOutcome
} from "@/types/manual-journal";
import type { HistoricalCandleRequest, PracticeAssetClass } from "@/types/practice";

const COLLECTION_ID = "manual_journal_trades";
const MAX_FETCH_LIMIT = 120;
const ANALYTICS_FETCH_LIMIT = 500;
const IMPORT_LIMIT = 100;
const REVIEW_TIMEFRAME_MINUTES = 60;

function nowIso() {
  return new Date().toISOString();
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")
  ) as T;
}

function manualTradeCollection(actor: VerifiedStudent) {
  const { db } = getFirebaseAdminClients();

  return db
    .collection("workspaces")
    .doc(actor.workspaceId)
    .collection("students")
    .doc(actor.studentId)
    .collection(COLLECTION_ID);
}

function validateManualTradeId(tradeId: string) {
  if (!/^manual_[a-f0-9]{24}$/.test(tradeId)) {
    throw new AdminApiError(400, "manual_trade_invalid_id", "Manual trade reference is not valid.");
  }
}

function roundMoney(value: number) {
  return Number(value.toFixed(8));
}

function deriveOutcome(status: ManualJournalTrade["status"], netPnl?: number): ManualTradeOutcome {
  if (status === "planned") {
    return "planned";
  }

  if (status === "open") {
    return "open";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  if (typeof netPnl !== "number" || Math.abs(netPnl) < 0.00000001) {
    return "breakeven";
  }

  return netPnl > 0 ? "win" : "loss";
}

function deriveManualTradeFields(input: NormalizedManualTradeInput) {
  const fees = input.fees ?? 0;
  const entryPrice = input.entryPrice;
  const exitPrice = input.exitPrice;
  const quantity = input.quantity;
  const hasClosedMath =
    input.status === "closed" &&
    typeof entryPrice === "number" &&
    typeof exitPrice === "number" &&
    typeof quantity === "number";

  const grossPnl = hasClosedMath
    ? input.side === "buy_long"
      ? roundMoney((exitPrice - entryPrice) * quantity)
      : roundMoney((entryPrice - exitPrice) * quantity)
    : undefined;
  const netPnl = typeof grossPnl === "number" ? roundMoney(grossPnl - fees) : undefined;
  const riskAmount =
    typeof input.entryPrice === "number" &&
    typeof input.stopLoss === "number" &&
    typeof input.quantity === "number"
      ? roundMoney(Math.abs(input.entryPrice - input.stopLoss) * input.quantity)
      : undefined;
  const rMultiple =
    typeof netPnl === "number" && typeof riskAmount === "number" && riskAmount > 0
      ? Number((netPnl / riskAmount).toFixed(4))
      : undefined;

  return {
    grossPnl,
    netPnl,
    riskAmount,
    rMultiple,
    outcome: deriveOutcome(input.status, netPnl)
  };
}

function mapManualTrade(data: FirebaseFirestore.DocumentData): ManualJournalTrade {
  return {
    tradeId: String(data.tradeId ?? ""),
    workspaceId: String(data.workspaceId ?? ""),
    studentId: String(data.studentId ?? ""),
    market: data.market,
    symbol: String(data.symbol ?? ""),
    side: data.side,
    status: data.status,
    entryPrice: typeof data.entryPrice === "number" ? data.entryPrice : undefined,
    exitPrice: typeof data.exitPrice === "number" ? data.exitPrice : undefined,
    quantity: typeof data.quantity === "number" ? data.quantity : undefined,
    stopLoss: typeof data.stopLoss === "number" ? data.stopLoss : undefined,
    takeProfit: typeof data.takeProfit === "number" ? data.takeProfit : undefined,
    fees: typeof data.fees === "number" ? data.fees : undefined,
    openedAt: typeof data.openedAt === "string" ? data.openedAt : undefined,
    closedAt: typeof data.closedAt === "string" ? data.closedAt : undefined,
    strategyName: typeof data.strategyName === "string" ? data.strategyName : undefined,
    tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown) => typeof tag === "string") : [],
    emotion: typeof data.emotion === "string" ? data.emotion : undefined,
    mistakeCategory: typeof data.mistakeCategory === "string" ? data.mistakeCategory : undefined,
    setupQuality: typeof data.setupQuality === "string" ? data.setupQuality as ManualJournalTrade["setupQuality"] : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    lessonLearned: typeof data.lessonLearned === "string" ? data.lessonLearned : undefined,
    grossPnl: typeof data.grossPnl === "number" ? data.grossPnl : undefined,
    netPnl: typeof data.netPnl === "number" ? data.netPnl : undefined,
    riskAmount: typeof data.riskAmount === "number" ? data.riskAmount : undefined,
    rMultiple: typeof data.rMultiple === "number" ? data.rMultiple : undefined,
    outcome: data.outcome,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
    archivedAt: typeof data.archivedAt === "string" ? data.archivedAt : undefined
  };
}

function buildManualTrade(actor: VerifiedStudent, tradeId: string, input: NormalizedManualTradeInput, createdAt: string) {
  const derived = deriveManualTradeFields(input);

  return stripUndefined({
    tradeId,
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    ...input,
    ...derived,
    createdAt,
    updatedAt: nowIso(),
    serverUpdatedAt: FieldValue.serverTimestamp()
  });
}

function matchesFilters(trade: ManualJournalTrade, filters: ManualJournalTradeFilters) {
  if (!filters.includeArchived && trade.archivedAt) {
    return false;
  }

  if (filters.status && filters.status !== "all" && trade.status !== filters.status) {
    return false;
  }

  if (filters.outcome && filters.outcome !== "all" && trade.outcome !== filters.outcome) {
    return false;
  }

  if (filters.strategy && !trade.strategyName?.toLowerCase().includes(filters.strategy.toLowerCase())) {
    return false;
  }

  if (filters.tag && !trade.tags.some((tag) => tag.toLowerCase() === filters.tag?.toLowerCase())) {
    return false;
  }

  if (filters.q) {
    const haystack = [
      trade.symbol,
      trade.market,
      trade.side,
      trade.status,
      trade.outcome,
      trade.strategyName,
      trade.emotion,
      trade.mistakeCategory,
      ...trade.tags
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(filters.q.toLowerCase());
  }

  return true;
}

export { parseManualTradeFilters };

type ManualJournalExportKind = "trades" | "analytics" | "backup";

type ManualJournalExportResponse = {
  body: string;
  contentType: string;
  filename: string;
};

function roundMetric(value: number, decimals = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(decimals));
}

async function listStudentManualTradesForRollups(actor: VerifiedStudent) {
  const snapshot = await manualTradeCollection(actor)
    .orderBy("updatedAt", "desc")
    .limit(ANALYTICS_FETCH_LIMIT)
    .get();

  return snapshot.docs
    .map((doc) => mapManualTrade(doc.data()))
    .filter((trade) => trade.workspaceId === actor.workspaceId && trade.studentId === actor.studentId);
}

function closedManualTrades(trades: ManualJournalTrade[]) {
  return trades.filter((trade) => trade.status === "closed" && !trade.archivedAt);
}

function highlightTrade(trade: ManualJournalTrade) {
  return {
    tradeId: trade.tradeId,
    symbol: trade.symbol,
    market: trade.market,
    side: trade.side,
    outcome: trade.outcome,
    netPnl: roundMoney(trade.netPnl ?? 0),
    rMultiple: trade.rMultiple,
    closedAt: trade.closedAt,
    strategyName: trade.strategyName
  };
}

function computeWinRate(wins: number, closedCount: number) {
  return closedCount > 0 ? roundMetric((wins / closedCount) * 100, 2) : 0;
}

function computeAverageR(trades: ManualJournalTrade[]) {
  const values = trades
    .map((trade) => trade.rMultiple)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!values.length) {
    return 0;
  }

  return roundMetric(values.reduce((sum, value) => sum + value, 0) / values.length, 4);
}

function buildBreakdownRow(label: string, trades: ManualJournalTrade[]) {
  const closed = closedManualTrades(trades);
  const wins = closed.filter((trade) => trade.outcome === "win").length;
  const netPnl = closed.reduce((sum, trade) => sum + (trade.netPnl ?? 0), 0);

  return {
    label,
    count: trades.length,
    closedTrades: closed.length,
    netPnl: roundMoney(netPnl),
    averageR: computeAverageR(closed),
    winRate: computeWinRate(wins, closed.length)
  };
}

function pushGrouped(
  groups: Map<string, ManualJournalTrade[]>,
  label: string | undefined,
  trade: ManualJournalTrade
) {
  const safeLabel = label?.trim() || "Unspecified";
  const current = groups.get(safeLabel) ?? [];
  current.push(trade);
  groups.set(safeLabel, current);
}

function rowsFromGroups(groups: Map<string, ManualJournalTrade[]>, limit = 8) {
  return Array.from(groups.entries())
    .map(([label, trades]) => buildBreakdownRow(label, trades))
    .sort((a, b) => Math.abs(b.netPnl) - Math.abs(a.netPnl) || b.count - a.count)
    .slice(0, limit);
}

function buildManualJournalAnalytics(
  trades: ManualJournalTrade[]
): Omit<ManualJournalAnalyticsResponse, keyof ReturnType<typeof createSourceMeta>> {
  const activeTrades = trades.filter((trade) => !trade.archivedAt);
  const closed = closedManualTrades(activeTrades);
  const wins = closed.filter((trade) => trade.outcome === "win");
  const losses = closed.filter((trade) => trade.outcome === "loss");
  const breakeven = closed.filter((trade) => trade.outcome === "breakeven");
  const netPnl = closed.reduce((sum, trade) => sum + (trade.netPnl ?? 0), 0);
  const winningPnl = wins.reduce((sum, trade) => sum + Math.max(trade.netPnl ?? 0, 0), 0);
  const losingPnl = losses.reduce((sum, trade) => sum + Math.abs(Math.min(trade.netPnl ?? 0, 0)), 0);
  const bestTrade = closed.reduce<ManualJournalTrade | undefined>(
    (best, trade) => ((trade.netPnl ?? 0) > (best?.netPnl ?? Number.NEGATIVE_INFINITY) ? trade : best),
    undefined
  );
  const worstTrade = closed.reduce<ManualJournalTrade | undefined>(
    (worst, trade) => ((trade.netPnl ?? 0) < (worst?.netPnl ?? Number.POSITIVE_INFINITY) ? trade : worst),
    undefined
  );
  const symbolGroups = new Map<string, ManualJournalTrade[]>();
  const strategyGroups = new Map<string, ManualJournalTrade[]>();
  const tagGroups = new Map<string, ManualJournalTrade[]>();
  const emotionGroups = new Map<string, ManualJournalTrade[]>();
  const mistakeGroups = new Map<string, ManualJournalTrade[]>();
  const setupQualityGroups = new Map<string, ManualJournalTrade[]>();
  const calendarGroups = new Map<string, ManualJournalTrade[]>();

  for (const trade of activeTrades) {
    pushGrouped(symbolGroups, trade.symbol, trade);
    pushGrouped(strategyGroups, trade.strategyName, trade);
    pushGrouped(emotionGroups, trade.emotion, trade);
    pushGrouped(mistakeGroups, trade.mistakeCategory, trade);
    pushGrouped(setupQualityGroups, trade.setupQuality?.replace(/_/g, " ").toUpperCase(), trade);

    if (trade.tags.length) {
      for (const tag of trade.tags) {
        pushGrouped(tagGroups, tag, trade);
      }
    } else {
      pushGrouped(tagGroups, "Untagged", trade);
    }

    if (trade.status === "closed") {
      const date = (trade.closedAt ?? trade.openedAt ?? trade.updatedAt).slice(0, 10);
      pushGrouped(calendarGroups, date, trade);
    }
  }

  const calendar = Array.from(calendarGroups.entries())
    .map(([date, dayTrades]) => {
      const dayClosed = closedManualTrades(dayTrades);

      return {
        date,
        trades: dayTrades.length,
        closedTrades: dayClosed.length,
        netPnl: roundMoney(dayClosed.reduce((sum, trade) => sum + (trade.netPnl ?? 0), 0)),
        rTotal: roundMetric(dayClosed.reduce((sum, trade) => sum + (trade.rMultiple ?? 0), 0), 4),
        wins: dayClosed.filter((trade) => trade.outcome === "win").length,
        losses: dayClosed.filter((trade) => trade.outcome === "loss").length
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 42);

  return {
    ok: true,
    summary: {
      totalTrades: activeTrades.length,
      closedTrades: closed.length,
      openTrades: activeTrades.filter((trade) => trade.status === "open").length,
      plannedTrades: activeTrades.filter((trade) => trade.status === "planned").length,
      cancelledTrades: activeTrades.filter((trade) => trade.status === "cancelled").length,
      wins: wins.length,
      losses: losses.length,
      breakeven: breakeven.length,
      winRate: computeWinRate(wins.length, closed.length),
      netPnl: roundMoney(netPnl),
      averageR: computeAverageR(closed),
      expectancy: closed.length ? roundMoney(netPnl / closed.length) : 0,
      profitFactor: losingPnl > 0 ? roundMetric(winningPnl / losingPnl, 4) : winningPnl > 0 ? roundMetric(winningPnl, 4) : 0,
      bestTrade: bestTrade ? highlightTrade(bestTrade) : undefined,
      worstTrade: worstTrade ? highlightTrade(worstTrade) : undefined,
      averageWin: wins.length ? roundMoney(winningPnl / wins.length) : 0,
      averageLoss: losses.length ? roundMoney(losingPnl / losses.length) : 0
    },
    breakdowns: {
      symbols: rowsFromGroups(symbolGroups),
      strategies: rowsFromGroups(strategyGroups),
      tags: rowsFromGroups(tagGroups),
      emotions: rowsFromGroups(emotionGroups),
      mistakes: rowsFromGroups(mistakeGroups),
      setupQuality: rowsFromGroups(setupQualityGroups)
    },
    calendar,
    pageInfo: {
      limit: ANALYTICS_FETCH_LIMIT,
      totalLoaded: trades.length,
      bounded: trades.length >= ANALYTICS_FETCH_LIMIT
    },
    safeMessage:
      "Manual journal analytics are computed server-side from your private manual trades only. Workspace users do not receive raw trade rows or private notes."
  };
}

function csvCell(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function csvRows(headers: string[], rows: Array<Record<string, unknown>>) {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
}

function safeManualTradeExportRow(trade: ManualJournalTrade): Record<string, unknown> {
  return stripUndefined({
    tradeId: trade.tradeId,
    market: trade.market,
    symbol: trade.symbol,
    side: trade.side,
    status: trade.status,
    outcome: trade.outcome,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    quantity: trade.quantity,
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
    fees: trade.fees,
    grossPnl: trade.grossPnl,
    netPnl: trade.netPnl,
    riskAmount: trade.riskAmount,
    rMultiple: trade.rMultiple,
    openedAt: trade.openedAt,
    closedAt: trade.closedAt,
    strategyName: trade.strategyName,
    tags: trade.tags.join("|"),
    emotion: trade.emotion,
    mistakeCategory: trade.mistakeCategory,
    setupQuality: trade.setupQuality,
    notes: trade.notes,
    lessonLearned: trade.lessonLearned,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt
  });
}

function tradesToCsv(trades: ManualJournalTrade[]) {
  const headers = [
    "tradeId",
    "market",
    "symbol",
    "side",
    "status",
    "outcome",
    "entryPrice",
    "exitPrice",
    "quantity",
    "stopLoss",
    "takeProfit",
    "fees",
    "grossPnl",
    "netPnl",
    "riskAmount",
    "rMultiple",
    "openedAt",
    "closedAt",
    "strategyName",
    "tags",
    "emotion",
    "mistakeCategory",
    "setupQuality",
    "notes",
    "lessonLearned",
    "createdAt",
    "updatedAt"
  ];

  return csvRows(
    headers,
    trades
      .filter((trade) => !trade.archivedAt)
      .map(safeManualTradeExportRow)
  );
}

function analyticsToCsv(analytics: ManualJournalAnalyticsResponse) {
  const rows: Array<Record<string, unknown>> = [
    ...Object.entries(analytics.summary)
      .filter(([, value]) => typeof value !== "object")
      .map(([metric, value]) => ({ section: "summary", metric, label: "", value })),
    ...Object.entries(analytics.breakdowns).flatMap(([section, values]) =>
      values.map((row) => ({
        section,
        metric: "breakdown",
        label: row.label,
        value: row.netPnl,
        count: row.count,
        closedTrades: row.closedTrades,
        winRate: row.winRate,
        averageR: row.averageR
      }))
    ),
    ...analytics.calendar.map((day) => ({
      section: "calendar",
      metric: day.date,
      label: day.date,
      value: day.netPnl,
      count: day.trades,
      closedTrades: day.closedTrades,
      winRate: "",
      averageR: day.rTotal
    }))
  ];

  return csvRows(
    ["section", "metric", "label", "value", "count", "closedTrades", "winRate", "averageR"],
    rows
  );
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim())) {
    rows.push(row);
  }

  return rows;
}

function rowToManualTradeInput(headers: string[], row: string[]): ManualJournalTradeInput {
  const lookup = new Map(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""]));
  const tags = lookup.get("tags")?.replace(/\|/g, ",") ?? "";

  return {
    market: lookup.get("market") as ManualJournalTradeInput["market"],
    symbol: lookup.get("symbol"),
    side: lookup.get("side") as ManualJournalTradeInput["side"],
    status: lookup.get("status") as ManualJournalTradeInput["status"],
    entryPrice: lookup.get("entryPrice"),
    exitPrice: lookup.get("exitPrice"),
    quantity: lookup.get("quantity"),
    stopLoss: lookup.get("stopLoss"),
    takeProfit: lookup.get("takeProfit"),
    fees: lookup.get("fees"),
    openedAt: lookup.get("openedAt"),
    closedAt: lookup.get("closedAt"),
    strategyName: lookup.get("strategyName"),
    tags,
    emotion: lookup.get("emotion"),
    mistakeCategory: lookup.get("mistakeCategory"),
    setupQuality: lookup.get("setupQuality") as ManualJournalTradeInput["setupQuality"],
    notes: lookup.get("notes"),
    lessonLearned: lookup.get("lessonLearned")
  };
}

async function getStudentManualTrade(actor: VerifiedStudent, tradeId: string) {
  validateManualTradeId(tradeId);

  const snapshot = await manualTradeCollection(actor).doc(tradeId).get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "manual_trade_not_found", "That manual trade was not found.");
  }

  const trade = mapManualTrade(snapshot.data() ?? {});

  if (trade.workspaceId !== actor.workspaceId || trade.studentId !== actor.studentId) {
    throw new AdminApiError(404, "manual_trade_not_found", "That manual trade was not found.");
  }

  return trade;
}

function assetClassForManualTrade(trade: ManualJournalTrade): PracticeAssetClass | null {
  if (trade.market === "crypto") {
    return "crypto";
  }

  if (trade.market === "forex" || trade.market === "cfd") {
    return "forex_cfd";
  }

  return null;
}

function buildReviewCandleRequest(trade: ManualJournalTrade): HistoricalCandleRequest | null {
  const assetClass = assetClassForManualTrade(trade);

  if (!assetClass || !trade.entryPrice) {
    return null;
  }

  const anchorMs = Date.parse(trade.openedAt ?? trade.closedAt ?? trade.createdAt);

  if (!Number.isFinite(anchorMs)) {
    return null;
  }

  const startMs = anchorMs - 1000 * 60 * 60 * 24 * 5;
  const endSourceMs = Date.parse(trade.closedAt ?? trade.updatedAt);
  const endMs = Math.max(
    Number.isFinite(endSourceMs) ? endSourceMs : anchorMs,
    anchorMs + 1000 * 60 * 60 * 24
  ) + 1000 * 60 * 60 * 24 * 5;

  return {
    assetClass,
    symbol: trade.symbol,
    timeframeMinutes: REVIEW_TIMEFRAME_MINUTES,
    rangeStart: new Date(startMs).toISOString(),
    rangeEnd: new Date(endMs).toISOString()
  };
}

function emptyReviewChartState(safeMessage: string, warnings: string[] = []): ManualJournalTradeReviewResponse["chart"] {
  return {
    available: false,
    timeframeMinutes: REVIEW_TIMEFRAME_MINUTES,
    candles: [],
    safeMessage,
    warnings
  };
}

async function buildManualTradeReviewChart(actor: VerifiedStudent, trade: ManualJournalTrade): Promise<ManualJournalTradeReviewResponse["chart"]> {
  if (!trade.entryPrice) {
    return emptyReviewChartState("Planned manual trade has no entry price yet, so the review chart stays empty.");
  }

  const request = buildReviewCandleRequest(trade);

  if (!request) {
    return emptyReviewChartState(
      "Historical review candles are available only for supported crypto, Forex, and CFD practice symbols."
    );
  }

  if (request.assetClass === "crypto" && !historicalDataLimits.supportedCryptoSymbols.includes(request.symbol)) {
    return emptyReviewChartState("No approved public crypto candle source is configured for this manual trade symbol.");
  }

  if (request.assetClass === "forex_cfd" && !historicalDataLimits.supportedForexCfdSymbols.includes(request.symbol)) {
    return emptyReviewChartState("No approved practice Forex/CFD candle source is configured for this manual trade symbol.");
  }

  try {
    const result = await fetchHistoricalCandlesWithCache(actor.workspaceId, request);

    return {
      available: result.candles.length > 0,
      assetClass: request.assetClass,
      provider: result.provider,
      providerSymbol: result.providerSymbol,
      timeframeMinutes: request.timeframeMinutes,
      rangeStart: request.rangeStart,
      rangeEnd: request.rangeEnd,
      candles: result.candles,
      safeMessage: result.candles.length
        ? "Manual review candles come from approved practice historical data providers only."
        : "No candles are available for this bounded manual review range.",
      warnings: []
    };
  } catch {
    return emptyReviewChartState(
      "No candles are available for this manual trade review right now. Trade details remain available without provider data.",
      ["Manual review chart failed closed without exposing provider payloads."]
    );
  }
}

export async function listStudentManualTrades(
  actor: VerifiedStudent,
  filters: ManualJournalTradeFilters
): Promise<ManualJournalTradeListResponse> {
  const snapshot = await manualTradeCollection(actor)
    .orderBy("updatedAt", "desc")
    .limit(Math.min(Math.max(filters.limit * 2, filters.limit), MAX_FETCH_LIMIT))
    .get();

  const trades = snapshot.docs
    .map((doc) => mapManualTrade(doc.data()))
    .filter((trade) => trade.workspaceId === actor.workspaceId && trade.studentId === actor.studentId)
    .filter((trade) => matchesFilters(trade, filters))
    .slice(0, filters.limit);

  return {
    ...createSourceMeta(),
    trades,
    pageInfo: {
      limit: filters.limit,
      totalLoaded: trades.length,
      hasMore: snapshot.size >= Math.min(Math.max(filters.limit * 2, filters.limit), MAX_FETCH_LIMIT)
    }
  };
}

export async function getStudentManualJournalAnalytics(
  actor: VerifiedStudent
): Promise<ManualJournalAnalyticsResponse> {
  const trades = await listStudentManualTradesForRollups(actor);
  const analytics = buildManualJournalAnalytics(trades);

  return {
    ...createSourceMeta(analytics.pageInfo.bounded ? ["Manual analytics are bounded to the latest private manual trades."] : []),
    ...analytics
  };
}

export async function getStudentManualJournalExport(
  actor: VerifiedStudent,
  kind: ManualJournalExportKind
): Promise<ManualJournalExportResponse> {
  const trades = await listStudentManualTradesForRollups(actor);
  const timestamp = new Date().toISOString().slice(0, 10);

  if (kind === "trades") {
    return {
      body: tradesToCsv(trades),
      contentType: "text/csv; charset=utf-8",
      filename: `tradehub-manual-trades-${timestamp}.csv`
    };
  }

  const analytics = {
    ...createSourceMeta(),
    ...buildManualJournalAnalytics(trades)
  };

  if (kind === "analytics") {
    return {
      body: analyticsToCsv(analytics),
      contentType: "text/csv; charset=utf-8",
      filename: `tradehub-manual-analytics-${timestamp}.csv`
    };
  }

  return {
    body: JSON.stringify(
      {
        exportedAt: nowIso(),
        safeMessage:
          "Safe manual journal backup includes only export-safe manual trade fields and derived manual analytics. It excludes workspace/student identifiers, AutoCopy internals, provider payloads, credentials, and hidden practice candles.",
        trades: trades.filter((trade) => !trade.archivedAt).map(safeManualTradeExportRow),
        analytics
      },
      null,
      2
    ),
    contentType: "application/json; charset=utf-8",
    filename: `tradehub-manual-journal-backup-${timestamp}.json`
  };
}

export async function getStudentManualTradeReview(
  actor: VerifiedStudent,
  tradeId: string
): Promise<ManualJournalTradeReviewResponse> {
  const trade = await getStudentManualTrade(actor, tradeId);
  const chart = await buildManualTradeReviewChart(actor, trade);
  const readOnly = Boolean(trade.archivedAt);

  return {
    ...createSourceMeta(chart.warnings),
    ok: true,
    trade,
    chart,
    review: {
      readOnly,
      canEditReviewFields: !readOnly,
      safeMessage: readOnly
        ? "Archived manual trades are read-only. Unarchive support is not part of this stage."
        : "Review edits update only private manual journal fields through the protected student API."
    }
  };
}

export async function createStudentManualTrade(
  actor: VerifiedStudent,
  payload: ManualJournalTradeInput
): Promise<ManualJournalTradeMutationResponse> {
  const input = validateManualTradeInput(payload);
  const tradeId = `manual_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const createdAt = nowIso();
  const trade = buildManualTrade(actor, tradeId, input, createdAt);

  await manualTradeCollection(actor).doc(tradeId).set(trade);

  return {
    ...createSourceMeta(),
    trade: mapManualTrade(trade),
    message: "Manual trade saved privately to your journal."
  };
}

export async function importStudentManualTradesFromCsv(
  actor: VerifiedStudent,
  csvText: string
): Promise<ManualJournalImportResponse> {
  if (typeof csvText !== "string" || !csvText.trim()) {
    throw new AdminApiError(400, "manual_trade_import_empty", "Paste manual trade CSV before importing.");
  }

  if (csvText.length > 80_000) {
    throw new AdminApiError(400, "manual_trade_import_too_large", "Manual trade CSV import is limited to a small private batch.");
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new AdminApiError(400, "manual_trade_import_missing_rows", "Manual trade CSV needs a header row and at least one trade row.");
  }

  const headers = rows[0].map((header) => header.trim());
  const requiredHeaders = ["market", "symbol", "side", "status"];
  const missing = requiredHeaders.filter((header) => !headers.includes(header));

  if (missing.length) {
    throw new AdminApiError(
      400,
      "manual_trade_import_missing_headers",
      `Manual trade CSV is missing: ${missing.join(", ")}.`
    );
  }

  const bodyRows = rows.slice(1, IMPORT_LIMIT + 1);
  const errors: ManualJournalImportResponse["errors"] = [];
  const trades: ManualJournalTrade[] = [];
  const batch = getFirebaseAdminClients().db.batch();

  for (const [index, row] of bodyRows.entries()) {
    try {
      const input = validateManualTradeInput(rowToManualTradeInput(headers, row));
      const tradeId = `manual_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const createdAt = nowIso();
      const trade = buildManualTrade(actor, tradeId, input, createdAt);

      batch.set(manualTradeCollection(actor).doc(tradeId), trade);
      trades.push(mapManualTrade(trade));
    } catch (error) {
      errors.push({
        row: index + 2,
        code: error instanceof AdminApiError ? error.code : "manual_trade_import_row_invalid",
        message:
          error instanceof AdminApiError
            ? error.message
            : "That CSV row could not be imported safely."
      });
    }
  }

  if (!trades.length) {
    return {
      ...createSourceMeta(),
      ok: true,
      createdCount: 0,
      rejectedCount: errors.length,
      trades: [],
      errors,
      safeMessage: "No manual trades were imported. Fix the rejected rows and try again."
    };
  }

  await batch.commit();

  return {
    ...createSourceMeta(
      rows.length - 1 > IMPORT_LIMIT
        ? [`Manual trade import was bounded to the first ${IMPORT_LIMIT} rows.`]
        : []
    ),
    ok: true,
    createdCount: trades.length,
    rejectedCount: errors.length + Math.max(rows.length - 1 - IMPORT_LIMIT, 0),
    trades,
    errors,
    safeMessage:
      "Imported manual trades were validated server-side and saved only under your signed-in student journal."
  };
}

export async function updateStudentManualTrade(
  actor: VerifiedStudent,
  tradeId: string,
  payload: ManualJournalTradeInput
): Promise<ManualJournalTradeMutationResponse> {
  validateManualTradeId(tradeId);

  const docRef = manualTradeCollection(actor).doc(tradeId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "manual_trade_not_found", "That manual trade was not found.");
  }

  const existing = mapManualTrade(snapshot.data() ?? {});
  if (existing.archivedAt) {
    throw new AdminApiError(409, "manual_trade_archived", "Archived manual trades cannot be edited.");
  }

  const input = validateManualTradeInput(payload);
  const trade = buildManualTrade(actor, tradeId, input, existing.createdAt || nowIso());

  await docRef.set(trade, { merge: false });

  return {
    ...createSourceMeta(),
    trade: mapManualTrade(trade),
    message: "Manual trade updated privately."
  };
}

export async function archiveStudentManualTrade(
  actor: VerifiedStudent,
  tradeId: string
): Promise<ManualJournalTradeMutationResponse> {
  validateManualTradeId(tradeId);

  const docRef = manualTradeCollection(actor).doc(tradeId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "manual_trade_not_found", "That manual trade was not found.");
  }

  const existing = mapManualTrade(snapshot.data() ?? {});
  const archivedAt = nowIso();

  await docRef.set(
    {
      archivedAt,
      updatedAt: archivedAt,
      serverUpdatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return {
    ...createSourceMeta(),
    trade: {
      ...existing,
      archivedAt,
      updatedAt: archivedAt
    },
    message: "Manual trade archived privately."
  };
}
