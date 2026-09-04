import { AdminApiError } from "@/lib/firebase/admin-errors";
import type {
  ManualJournalTradeFilters,
  ManualJournalTradeInput,
  ManualTradeMarket,
  ManualTradeOutcome,
  ManualTradeSetupQuality,
  ManualTradeSide,
  ManualTradeStatus
} from "@/types/manual-journal";

const MARKETS: ManualTradeMarket[] = ["crypto", "forex", "cfd", "stock", "futures", "other"];
const SIDES: ManualTradeSide[] = ["buy_long", "sell_short"];
const STATUSES: ManualTradeStatus[] = ["planned", "open", "closed", "cancelled"];
const OUTCOMES: ManualTradeOutcome[] = ["planned", "open", "cancelled", "win", "loss", "breakeven"];
const SETUP_QUALITIES: ManualTradeSetupQuality[] = ["", "a_plus", "a", "b", "c", "poor"];

const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 32;

export type NormalizedManualTradeInput = {
  market: ManualTradeMarket;
  symbol: string;
  side: ManualTradeSide;
  status: ManualTradeStatus;
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  stopLoss?: number;
  takeProfit?: number;
  fees?: number;
  openedAt?: string;
  closedAt?: string;
  strategyName?: string;
  tags: string[];
  emotion?: string;
  mistakeCategory?: string;
  setupQuality?: ManualTradeSetupQuality;
  notes?: string;
  lessonLearned?: string;
};

function sanitizeText(value: unknown, maxLength: number, field: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > maxLength) {
    throw new AdminApiError(400, "manual_trade_invalid_text", `${field} is too long.`);
  }

  return normalized;
}

function sanitizeSymbol(value: unknown) {
  const symbol = sanitizeText(value, 24, "Symbol")?.toUpperCase();

  if (!symbol) {
    throw new AdminApiError(400, "manual_trade_symbol_required", "Add a symbol before saving the manual trade.");
  }

  if (!/^[A-Z0-9][A-Z0-9./:_-]{0,23}$/.test(symbol)) {
    throw new AdminApiError(400, "manual_trade_invalid_symbol", "Use a short market symbol such as BTCUSDT, EURUSD, or AAPL.");
  }

  return symbol;
}

function sanitizeEnum<T extends string>(value: unknown, allowed: T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new AdminApiError(400, "manual_trade_invalid_choice", `${field} is not supported.`);
  }

  return value as T;
}

function sanitizeOptionalNumber(value: unknown, field: string, options: { allowZero?: boolean } = {}) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).trim());

  if (!Number.isFinite(parsed)) {
    throw new AdminApiError(400, "manual_trade_invalid_number", `${field} must be a valid number.`);
  }

  if (parsed < 0 || (!options.allowZero && parsed === 0)) {
    throw new AdminApiError(400, "manual_trade_invalid_number", `${field} must be greater than zero.`);
  }

  if (Math.abs(parsed) > 1_000_000_000) {
    throw new AdminApiError(400, "manual_trade_number_too_large", `${field} is outside the manual journal limit.`);
  }

  return Number(parsed.toFixed(8));
}

function sanitizeOptionalDate(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw new AdminApiError(400, "manual_trade_invalid_date", `${field} must be a valid date/time.`);
  }

  const year = parsed.getUTCFullYear();
  if (year < 2000 || year > 2100) {
    throw new AdminApiError(400, "manual_trade_invalid_date", `${field} is outside the supported range.`);
  }

  return parsed.toISOString();
}

function sanitizeTags(value: unknown) {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of rawTags) {
    const tag = sanitizeText(rawTag, MAX_TAG_LENGTH, "Tag");
    if (!tag) {
      continue;
    }

    const normalized = tag.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      tags.push(tag);
    }
  }

  if (tags.length > MAX_TAGS) {
    throw new AdminApiError(400, "manual_trade_too_many_tags", `Add ${MAX_TAGS} tags or fewer.`);
  }

  return tags;
}

export function validateManualTradeInput(payload: ManualJournalTradeInput): NormalizedManualTradeInput {
  if (!payload || typeof payload !== "object") {
    throw new AdminApiError(400, "manual_trade_payload_required", "Manual trade details are required.");
  }

  const market = sanitizeEnum(payload.market, MARKETS, "Market");
  const side = sanitizeEnum(payload.side, SIDES, "Side");
  const status = sanitizeEnum(payload.status, STATUSES, "Status");
  const entryPrice = sanitizeOptionalNumber(payload.entryPrice, "Entry price");
  const exitPrice = sanitizeOptionalNumber(payload.exitPrice, "Exit price");
  const quantity = sanitizeOptionalNumber(payload.quantity, "Quantity");
  const stopLoss = sanitizeOptionalNumber(payload.stopLoss, "Stop loss");
  const takeProfit = sanitizeOptionalNumber(payload.takeProfit, "Take profit");
  const fees = sanitizeOptionalNumber(payload.fees, "Fees/costs", { allowZero: true });
  const openedAt = sanitizeOptionalDate(payload.openedAt, "Opened at");
  const closedAt = sanitizeOptionalDate(payload.closedAt, "Closed at");

  if (status === "closed" && (!entryPrice || !exitPrice || !quantity)) {
    throw new AdminApiError(400, "manual_trade_closed_requires_prices", "Closed trades require entry price, exit price, and quantity.");
  }

  if ((status === "open" || status === "closed") && (!entryPrice || !quantity)) {
    throw new AdminApiError(400, "manual_trade_open_requires_entry", "Open and closed trades require entry price and quantity.");
  }

  if (openedAt && closedAt && new Date(closedAt).getTime() < new Date(openedAt).getTime()) {
    throw new AdminApiError(400, "manual_trade_invalid_close_time", "Closed at cannot be before opened at.");
  }

  return {
    market,
    symbol: sanitizeSymbol(payload.symbol),
    side,
    status,
    entryPrice,
    exitPrice,
    quantity,
    stopLoss,
    takeProfit,
    fees,
    openedAt,
    closedAt,
    strategyName: sanitizeText(payload.strategyName, 120, "Strategy/playbook name"),
    tags: sanitizeTags(payload.tags),
    emotion: sanitizeText(payload.emotion, 80, "Emotion"),
    mistakeCategory: sanitizeText(payload.mistakeCategory, 80, "Mistake category"),
    setupQuality: sanitizeEnum(payload.setupQuality ?? "", SETUP_QUALITIES, "Setup quality"),
    notes: sanitizeText(payload.notes, 1000, "Notes"),
    lessonLearned: sanitizeText(payload.lessonLearned, 700, "Lesson learned")
  };
}

function readParam(params: URLSearchParams, key: string, maxLength: number) {
  return sanitizeText(params.get(key), maxLength, key);
}

export function parseManualTradeFilters(request: Request): ManualJournalTradeFilters {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 100);
  const statusRaw = url.searchParams.get("status") ?? "all";
  const outcomeRaw = url.searchParams.get("outcome") ?? "all";

  return {
    q: readParam(url.searchParams, "q", 80),
    status: statusRaw === "all" ? "all" : sanitizeEnum(statusRaw, STATUSES, "Status"),
    outcome:
      outcomeRaw === "all"
        ? "all"
        : sanitizeEnum(outcomeRaw, OUTCOMES, "Outcome"),
    strategy: readParam(url.searchParams, "strategy", 80),
    tag: readParam(url.searchParams, "tag", MAX_TAG_LENGTH),
    includeArchived: url.searchParams.get("includeArchived") === "true",
    limit
  };
}
