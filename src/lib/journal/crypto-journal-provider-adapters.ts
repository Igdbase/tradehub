import "server-only";

import crypto from "node:crypto";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  createProviderExecutionIdentity,
  createProviderOrderExecutionIdentity
} from "@/lib/journal/provider-execution-identity";
import type {
  ConnectedJournalTradeStatus,
  JournalCryptoExchange,
  JournalCryptoSyncFailureCategory
} from "@/types/journal-workspace";

const BINANCE_HOST = "https://api.binance.com";
const BYBIT_HOST = "https://api.bybit.com";
export const JOURNAL_CRYPTO_ALLOWED_HOSTS = [BINANCE_HOST, BYBIT_HOST] as const;
export const JOURNAL_CRYPTO_APPROVED_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "LINKUSDT"
] as const;
export const JOURNAL_CRYPTO_MAX_SYMBOLS = 8;
export const JOURNAL_CRYPTO_MAX_HISTORY_DAYS = 180;
export const JOURNAL_CRYPTO_MAX_PAGES = 3;
export const JOURNAL_CRYPTO_MAX_RECORDS = 300;
export const JOURNAL_CRYPTO_MAX_PROVIDER_REQUESTS = 20;
const ONE_DAY_MS = 86_400_000;
const JOURNAL_CRYPTO_MAX_BINANCE_WINDOWS = JOURNAL_CRYPTO_MAX_HISTORY_DAYS;
const JOURNAL_CRYPTO_MAX_BYBIT_WINDOWS = Math.ceil(JOURNAL_CRYPTO_MAX_HISTORY_DAYS / 7);
const BINANCE_PAGE_LIMIT = 100;
const BYBIT_PAGE_LIMIT = 100;
const REQUEST_TIMEOUT_MS = 5_000;
const RETRY_AFTER_CAP_MS = 1_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_DECIMAL_CHARS = 40;

type Decimal = bigint;
const SCALE = BigInt(100_000_000);
const ZERO = BigInt(0);

export interface JournalCryptoProviderCredential {
  apiKey: string;
  apiSecret: string;
  exchange: JournalCryptoExchange;
}

export interface JournalCryptoProviderRequest {
  method: "GET";
  url: string;
  headers: Record<string, string>;
  timeoutMs: number;
}

export interface JournalCryptoProviderResponse {
  status: number;
  headers?: Record<string, string | undefined>;
  body: unknown;
}

export type JournalCryptoProviderTransport = (
  request: JournalCryptoProviderRequest
) => Promise<JournalCryptoProviderResponse>;

type NormalizedIneligibilityReason =
  | "open_position"
  | "partial_position"
  | "unknown_starting_inventory"
  | "unsupported_fee_currency"
  | "missing_fee"
  | "incomplete_history"
  | "truncated_history"
  | "malformed_history"
  | "duplicate_execution"
  | "authoritative_basis_unproven";

export interface NormalizedCryptoHistoryRecord {
  importKey: string;
  executionFingerprint: string;
  providerExecutionIdentity: string;
  providerExecutionIdentities?: string[];
  exchange: JournalCryptoExchange;
  symbol: string;
  market: "crypto";
  side: "buy" | "sell";
  providerStatus: "filled";
  journalLifecycle: ConnectedJournalTradeStatus;
  openedAt: string;
  closedAt?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  fees?: number;
  realizedPnl?: number;
  performanceEligible: boolean;
  ineligibilityReason?: NormalizedIneligibilityReason;
  source: "connected_provider";
  tradeOrigin: "provider_manual";
  safeBrokerOrExchangeLabel: string;
  executionLegs?: Array<{
    providerExecutionIdentity: string;
    side: "buy" | "sell";
    executedAt: string;
    price: number;
    quantity: number;
    fees?: number;
  }>;
}

export interface JournalCryptoSyncResult {
  imported: NormalizedCryptoHistoryRecord[];
  skippedCount: number;
  truncated: boolean;
  snapshotComplete: boolean;
  requestCount: number;
  watermarks: Record<string, number>;
  crawlProgress?: JournalCryptoCrawlProgress;
  failureCategory: JournalCryptoSyncFailureCategory;
  safeMessage: string;
}

export interface JournalCryptoCrawlProgress {
  exchange: JournalCryptoExchange;
  boundaryUntil: number;
  completedWatermarks: Record<string, number>;
  nextSymbolIndex: number;
  completedSymbolCount: number;
  totalSymbolCount: number;
  complete: boolean;
  updatedAt: string;
}

type RawFill = {
  exchange: JournalCryptoExchange;
  symbol: string;
  side: "buy" | "sell";
  price: Decimal;
  qty: Decimal;
  fee: Decimal | null;
  feeAsset: string;
  time: number;
  rawRef: string;
  executionFingerprint: string;
  providerOrderId: string;
  providerExecutionId: string;
  providerExecutionIdentity: string;
};

type SymbolTaint = {
  reason: NormalizedIneligibilityReason;
};

type RequestBudget = {
  used: number;
  max: number;
};

function consumeProviderRequest(budget: RequestBudget) {
  if (budget.used >= budget.max) return false;
  budget.used += 1;
  return true;
}

function fixed(value: unknown): Decimal | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim();
  if (raw.length > MAX_DECIMAL_CHARS || !/^-?\d+(\.\d+)?$/.test(raw)) return null;
  const negative = raw.startsWith("-");
  const [wholePart, fractionPart = ""] = raw.replace(/^-/, "").split(".");
  const whole = BigInt(wholePart || "0") * SCALE;
  const fraction = BigInt((fractionPart + "00000000").slice(0, 8));
  return negative ? -(whole + fraction) : whole + fraction;
}

function toNumber(value: Decimal) {
  return Number(value) / Number(SCALE);
}

function mul(left: Decimal, right: Decimal) {
  return (left * right) / SCALE;
}

function add(left: Decimal, right: Decimal) {
  return left + right;
}

function sub(left: Decimal, right: Decimal) {
  return left - right;
}

function minDecimal(left: Decimal, right: Decimal) {
  return left < right ? left : right;
}

function assertSymbol(symbol: string) {
  const normalized = symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (!JOURNAL_CRYPTO_APPROVED_SYMBOLS.includes(normalized as typeof JOURNAL_CRYPTO_APPROVED_SYMBOLS[number])) {
    throw new AdminApiError(400, "journal_crypto_symbol_unsupported", "Choose a supported crypto Journal Sync symbol.");
  }
  return normalized;
}

export function validateJournalCryptoSymbols(symbols: unknown) {
  const input = Array.isArray(symbols) ? symbols : [];
  const unique = [...new Set(input.map((symbol) => typeof symbol === "string" ? assertSymbol(symbol) : ""))]
    .filter(Boolean)
    .slice(0, JOURNAL_CRYPTO_MAX_SYMBOLS);
  if (unique.length === 0) {
    throw new AdminApiError(400, "journal_crypto_symbols_required", "Choose at least one supported crypto symbol.");
  }
  return unique;
}

function sortedQuery(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function binanceSignedQuery(params: Record<string, string>, secret: string) {
  const query = sortedQuery(params);
  const signature = crypto.createHmac("sha256", secret).update(query).digest("hex");
  return `${query}&signature=${signature}`;
}

function bybitSignedGet({
  apiKey,
  apiSecret,
  params,
  receiveWindow = "5000"
}: {
  apiKey: string;
  apiSecret: string;
  params: Record<string, string>;
  receiveWindow?: string;
}) {
  const timestamp = String(Date.now());
  const query = sortedQuery(params);
  const signaturePayload = `${timestamp}${apiKey}${receiveWindow}${query}`;
  const signature = crypto.createHmac("sha256", apiSecret).update(signaturePayload).digest("hex");

  return {
    query,
    headers: {
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-SIGN": signature,
      "X-BAPI-SIGN-TYPE": "2",
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": receiveWindow
    }
  };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function responseByteLength(body: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(body ?? null), "utf8");
  } catch {
    return MAX_RESPONSE_BYTES + 1;
  }
}

function assertBodyBounded(response: JournalCryptoProviderResponse) {
  if (responseByteLength(response.body) > MAX_RESPONSE_BYTES) {
    throw new AdminApiError(502, "journal_crypto_invalid_response", "Journal Sync provider response was too large.");
  }
}

async function requestWithRetry(
  transport: JournalCryptoProviderTransport,
  request: JournalCryptoProviderRequest,
  attempts = 2
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await transport(request);
    assertBodyBounded(response);
    if (response.status !== 429) return response;
    const retryAfter = Number(response.headers?.["retry-after"] ?? response.headers?.["Retry-After"] ?? 0);
    const waitMs = Math.min(Number.isFinite(retryAfter) ? retryAfter * 1000 : 250, RETRY_AFTER_CAP_MS);
    await sleep(Math.max(0, waitMs));
  }
  throw new AdminApiError(429, "journal_crypto_rate_limited", "Journal Sync is rate limited. Try again later.");
}

function defaultTransport(): JournalCryptoProviderTransport {
  return async (request) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        signal: controller.signal
      });
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        throw new AdminApiError(502, "journal_crypto_invalid_response", "Journal Sync provider response was too large.");
      }
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
        throw new AdminApiError(502, "journal_crypto_invalid_response", "Journal Sync provider response was too large.");
      }
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: text ? JSON.parse(text) as unknown : null
      };
    } finally {
      clearTimeout(timer);
    }
  };
}

function assertOk(response: JournalCryptoProviderResponse, category: JournalCryptoSyncFailureCategory) {
  if (response.status < 200 || response.status >= 300) {
    throw new AdminApiError(502, `journal_crypto_${category}`, "Journal Sync provider check failed safely.");
  }
  return response.body;
}

function assertBybitOk(response: JournalCryptoProviderResponse, category: JournalCryptoSyncFailureCategory) {
  const body = assertOk(response, category);
  const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const retCode = Number(record.retCode);
  if (!Number.isFinite(retCode) || retCode !== 0) {
    throw new AdminApiError(502, `journal_crypto_${category}`, "Journal Sync provider check failed safely.");
  }
  return record;
}

function safeImportKey(parts: string[]) {
  return `journal_crypto_${crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32)}`;
}

function executionFingerprint(parts: string[]) {
  return `journal_exec_${crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32)}`;
}

export function assertBinanceMyTradesRequestShape(urlValue: string) {
  const url = new URL(urlValue);
  if (url.origin !== BINANCE_HOST || url.pathname !== "/api/v3/myTrades") {
    throw new AdminApiError(400, "journal_crypto_binance_request_invalid", "Unsupported Binance history request.");
  }

  const hasFromId = url.searchParams.has("fromId");
  const hasStartTime = url.searchParams.has("startTime");
  const hasEndTime = url.searchParams.has("endTime");
  if (hasFromId && (hasStartTime || hasEndTime)) {
    throw new AdminApiError(400, "journal_crypto_binance_request_invalid", "Binance history request cannot combine fromId with time bounds.");
  }
  if (!hasStartTime || !hasEndTime) {
    throw new AdminApiError(400, "journal_crypto_binance_request_invalid", "Binance history request requires bounded time windows.");
  }

  const startTime = Number(url.searchParams.get("startTime"));
  const endTime = Number(url.searchParams.get("endTime"));
  const limit = Number(url.searchParams.get("limit"));
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime || endTime - startTime + 1 > ONE_DAY_MS) {
    throw new AdminApiError(400, "journal_crypto_binance_request_invalid", "Binance history request must use a 24-hour-or-smaller window.");
  }
  if (!Number.isFinite(limit) || limit <= 0 || limit > BINANCE_PAGE_LIMIT) {
    throw new AdminApiError(400, "journal_crypto_binance_request_invalid", "Binance history request exceeds the safe page limit.");
  }
  if (!url.searchParams.get("symbol") || !url.searchParams.get("timestamp") || !url.searchParams.get("recvWindow") || !url.searchParams.get("signature")) {
    throw new AdminApiError(400, "journal_crypto_binance_request_invalid", "Binance history request is missing required signed parameters.");
  }
}

export async function verifyJournalCryptoReadOnlyPermission({
  credential,
  transport = defaultTransport()
}: {
  credential: JournalCryptoProviderCredential;
  transport?: JournalCryptoProviderTransport;
}) {
  if (credential.exchange === "binance") {
    const query = binanceSignedQuery({ recvWindow: "5000", timestamp: String(Date.now()) }, credential.apiSecret);
    const body = assertOk(await requestWithRetry(transport, {
      method: "GET",
      url: `${BINANCE_HOST}/sapi/v1/account/apiRestrictions?${query}`,
      headers: { "X-MBX-APIKEY": credential.apiKey },
      timeoutMs: REQUEST_TIMEOUT_MS
    }), "permission_rejected");
    const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    const reading = record.enableReading === true;
    const mutationFlagNames = [
      "enableSpotAndMarginTrading",
      "enableWithdrawals",
      "enableInternalTransfer",
      "permitsUniversalTransfer",
      "enableFutures",
      "enableMargin",
      "enableVanillaOptions",
      "enableFixApiTrade",
      "enablePortfolioMarginTrading"
    ];
    const mutationFlags = mutationFlagNames.map((key) => record[key]);
    if (!reading || mutationFlags.some((value) => value !== false)) {
      throw new AdminApiError(403, "journal_crypto_permission_rejected", "Use a read-only crypto history key for Journal Sync.");
    }
    return { ok: true as const };
  }

  const signed = bybitSignedGet({
    apiKey: credential.apiKey,
    apiSecret: credential.apiSecret,
    params: {}
  });
  const body = assertBybitOk(await requestWithRetry(transport, {
    method: "GET",
    url: `${BYBIT_HOST}/v5/user/query-api${signed.query ? `?${signed.query}` : ""}`,
    headers: signed.headers,
    timeoutMs: REQUEST_TIMEOUT_MS
  }), "permission_rejected");
  const result = typeof body.result === "object" && body.result !== null
    ? body.result as Record<string, unknown>
    : {};
  const readOnly = Number(result.readOnly);
  if (!Number.isFinite(readOnly) || readOnly !== 1) {
    throw new AdminApiError(403, "journal_crypto_permission_rejected", "Use a clearly read-only Bybit history key for Journal Sync.");
  }
  return { ok: true as const };
}

function quoteAssetFor(symbol: string) {
  return symbol.endsWith("USDT") ? "USDT" : symbol.endsWith("USD") ? "USD" : "";
}

function baseAssetFor(symbol: string) {
  const quote = quoteAssetFor(symbol);
  return quote ? symbol.slice(0, -quote.length) : "";
}

function feeInQuote(fill: RawFill) {
  if (fill.fee === null) return null;
  if (fill.feeAsset === quoteAssetFor(fill.symbol)) return fill.fee;
  if (fill.side === "buy" && fill.feeAsset === baseAssetFor(fill.symbol)) return ZERO;
  return null;
}

function receivedBuyQuantity(fill: RawFill) {
  if (fill.fee !== null && fill.feeAsset === baseAssetFor(fill.symbol)) {
    return sub(fill.qty, fill.fee);
  }
  return fill.qty;
}

function taintSymbol(taints: Map<string, SymbolTaint>, symbol: string, reason: NormalizedIneligibilityReason) {
  if (!taints.has(symbol)) taints.set(symbol, { reason });
}

function normalizeSpotRoundTrips(
  fills: RawFill[],
  accountLabel: string,
  connectionIdentity = "unknown_connection",
  symbolTaints = new Map<string, SymbolTaint>()
): NormalizedCryptoHistoryRecord[] {
  const lots = new Map<string, Array<{
    qty: Decimal;
    remaining: Decimal;
    cost: Decimal;
    fee: Decimal;
    feeKnown: boolean;
    taint?: NormalizedIneligibilityReason;
    time: number;
    price: Decimal;
    rawRef: string;
    executionFingerprint: string;
    providerOrderId: string;
    providerExecutionId: string;
    providerExecutionIdentity: string;
  }>>();
  const output: NormalizedCryptoHistoryRecord[] = [];
  const ordered = [...fills].sort((left, right) => left.time - right.time || left.rawRef.localeCompare(right.rawRef));

  for (const fill of ordered) {
    const fee = feeInQuote(fill);
    const feeReason = fill.fee === null ? "missing_fee" : fee === null ? "unsupported_fee_currency" : undefined;
    if (feeReason) taintSymbol(symbolTaints, fill.symbol, feeReason);

    if (fill.side === "buy") {
      const receivedQty = receivedBuyQuantity(fill);
      if (receivedQty <= ZERO) {
        taintSymbol(symbolTaints, fill.symbol, "malformed_history");
        continue;
      }
      const list = lots.get(fill.symbol) ?? [];
      list.push({
        qty: receivedQty,
        remaining: receivedQty,
        cost: mul(fill.qty, fill.price),
        fee: fee ?? ZERO,
        feeKnown: !feeReason,
        taint: feeReason,
        time: fill.time,
        price: fill.price,
        rawRef: fill.rawRef,
        executionFingerprint: fill.executionFingerprint,
        providerOrderId: fill.providerOrderId,
        providerExecutionId: fill.providerExecutionId,
        providerExecutionIdentity: fill.providerExecutionIdentity
      });
      lots.set(fill.symbol, list);
      continue;
    }

    let remainingSell = fill.qty;
    const list = lots.get(fill.symbol) ?? [];
    if (list.length === 0) {
      taintSymbol(symbolTaints, fill.symbol, "unknown_starting_inventory");
      output.push(openRecord(fill, accountLabel, connectionIdentity, "unknown_starting_inventory"));
      continue;
    }

    while (remainingSell > ZERO && list.length > 0) {
      const lot = list[0];
      const matchedQty = minDecimal(remainingSell, lot.remaining);
      const ratio = (matchedQty * SCALE) / lot.qty;
      const matchedCost = mul(lot.cost, ratio);
      const matchedBuyFee = mul(lot.fee, ratio);
      const proceeds = mul(matchedQty, fill.price);
      const sellFee = feeInQuote(fill);
      const matchedSellFee = sellFee === null ? ZERO : mul(sellFee, (matchedQty * SCALE) / fill.qty);
      const pnl = sub(sub(proceeds, matchedCost), add(matchedBuyFee, matchedSellFee));
      const lifecycle: ConnectedJournalTradeStatus = matchedQty === lot.remaining ? "closed" : "partial";
      const outputTaint = lot.taint ?? feeReason ?? symbolTaints.get(fill.symbol)?.reason ?? "authoritative_basis_unproven";
      const providerExecutionIdentity = createProviderOrderExecutionIdentity({
        provider: fill.exchange,
        symbol: fill.symbol,
        side: "buy",
        providerOrderId: lot.providerOrderId || fill.providerOrderId
      }) ?? createProviderExecutionIdentity({
        provider: fill.exchange,
        symbol: fill.symbol,
        side: "buy",
        providerExecutionId: `${lot.providerExecutionId}:${fill.providerExecutionId}`,
        executedAt: fill.time
      })!;
      output.push({
        importKey: safeImportKey([connectionIdentity, fill.exchange, fill.symbol, lot.rawRef, fill.rawRef, matchedQty.toString()]),
        executionFingerprint: executionFingerprint([fill.exchange, fill.symbol, lot.executionFingerprint, fill.executionFingerprint, matchedQty.toString()]),
        providerExecutionIdentity,
        providerExecutionIdentities: Array.from(new Set([
          providerExecutionIdentity,
          lot.providerExecutionIdentity,
          fill.providerExecutionIdentity
        ].filter(Boolean))),
        exchange: fill.exchange,
        symbol: fill.symbol,
        market: "crypto",
        side: "buy",
        providerStatus: "filled",
        journalLifecycle: lifecycle,
        openedAt: new Date(lot.time).toISOString(),
        closedAt: new Date(fill.time).toISOString(),
        entryPrice: toNumber(lot.price),
        exitPrice: toNumber(fill.price),
        quantity: toNumber(matchedQty),
        fees: lot.feeKnown && !feeReason ? toNumber(add(matchedBuyFee, matchedSellFee)) : undefined,
        realizedPnl: !outputTaint && lifecycle === "closed" ? toNumber(pnl) : undefined,
        performanceEligible: !outputTaint && lifecycle === "closed",
        ineligibilityReason: outputTaint ?? (lifecycle === "partial" ? "partial_position" : undefined),
        source: "connected_provider",
        tradeOrigin: "provider_manual",
        safeBrokerOrExchangeLabel: accountLabel,
        executionLegs: [
          {
            providerExecutionIdentity: lot.providerExecutionIdentity,
            side: "buy",
            executedAt: new Date(lot.time).toISOString(),
            price: toNumber(lot.price),
            quantity: toNumber(matchedQty),
            fees: lot.feeKnown ? toNumber(matchedBuyFee) : undefined
          },
          {
            providerExecutionIdentity: fill.providerExecutionIdentity,
            side: "sell",
            executedAt: new Date(fill.time).toISOString(),
            price: toNumber(fill.price),
            quantity: toNumber(matchedQty),
            fees: feeReason ? undefined : toNumber(matchedSellFee)
          }
        ]
      });
      lot.remaining -= matchedQty;
      remainingSell -= matchedQty;
      if (lot.remaining <= ZERO) list.shift();
    }

    if (remainingSell > ZERO) {
      taintSymbol(symbolTaints, fill.symbol, "unknown_starting_inventory");
      output.push(openRecord({ ...fill, qty: remainingSell }, accountLabel, connectionIdentity, "unknown_starting_inventory"));
    }
  }

  for (const [symbol, list] of lots) {
    for (const lot of list) {
      if (lot.remaining <= ZERO) continue;
      const reason = lot.taint ?? symbolTaints.get(symbol)?.reason ?? (lot.remaining === lot.qty ? "open_position" : "partial_position");
      output.push({
        importKey: safeImportKey([connectionIdentity, "open", symbol, lot.rawRef, lot.remaining.toString()]),
        executionFingerprint: executionFingerprint(["open", symbol, lot.executionFingerprint, lot.remaining.toString()]),
        providerExecutionIdentity: lot.providerExecutionIdentity,
        providerExecutionIdentities: [lot.providerExecutionIdentity],
        exchange: fills[0]?.exchange ?? "binance",
        symbol,
        market: "crypto",
        side: "buy",
        providerStatus: "filled",
        journalLifecycle: lot.remaining === lot.qty ? "open" : "partial",
        openedAt: new Date(lot.time).toISOString(),
        entryPrice: toNumber(lot.price),
        quantity: toNumber(lot.remaining),
        fees: lot.feeKnown ? toNumber(lot.fee) : undefined,
        performanceEligible: false,
        ineligibilityReason: reason,
        source: "connected_provider",
        tradeOrigin: "provider_manual",
        safeBrokerOrExchangeLabel: accountLabel,
        executionLegs: [{
          providerExecutionIdentity: lot.providerExecutionIdentity,
          side: "buy",
          executedAt: new Date(lot.time).toISOString(),
          price: toNumber(lot.price),
          quantity: toNumber(lot.remaining),
          fees: lot.feeKnown ? toNumber(lot.fee) : undefined
        }]
      });
    }
  }

  return output.map((record) => {
    const symbolTaint = symbolTaints.get(record.symbol);
    if (!symbolTaint || !record.performanceEligible) return record;
    return {
      ...record,
      realizedPnl: undefined,
      performanceEligible: false,
      ineligibilityReason: symbolTaint.reason
    };
  });
}

function openRecord(
  fill: RawFill,
  accountLabel: string,
  connectionIdentity: string,
  reason: NormalizedIneligibilityReason
): NormalizedCryptoHistoryRecord {
  return {
    importKey: safeImportKey([connectionIdentity, fill.exchange, fill.symbol, fill.rawRef, reason]),
    executionFingerprint: executionFingerprint([fill.exchange, fill.symbol, fill.executionFingerprint, reason]),
    providerExecutionIdentity: fill.providerExecutionIdentity,
    providerExecutionIdentities: [fill.providerExecutionIdentity],
    exchange: fill.exchange,
    symbol: fill.symbol,
    market: "crypto",
    side: fill.side,
    providerStatus: "filled",
    journalLifecycle: fill.side === "sell" ? "execution_only" : "open",
    openedAt: new Date(fill.time).toISOString(),
    entryPrice: toNumber(fill.price),
    quantity: toNumber(fill.qty),
    performanceEligible: false,
    ineligibilityReason: reason,
    source: "connected_provider",
    tradeOrigin: "provider_manual",
    safeBrokerOrExchangeLabel: accountLabel,
    executionLegs: [{
      providerExecutionIdentity: fill.providerExecutionIdentity,
      side: fill.side,
      executedAt: new Date(fill.time).toISOString(),
      price: toNumber(fill.price),
      quantity: toNumber(fill.qty),
      fees: feeInQuote(fill) === null ? undefined : toNumber(feeInQuote(fill) ?? ZERO)
    }]
  };
}

function normalizeBinanceFill(row: unknown, symbol: string): RawFill | null {
  const record = typeof row === "object" && row !== null ? row as Record<string, unknown> : {};
  const price = fixed(record.price);
  const qty = fixed(record.qty);
  const fee = fixed(record.commission);
  const time = Number(record.time);
  if (price === null || qty === null || qty <= ZERO || price <= ZERO || !Number.isFinite(time)) return null;
  const rawRef = safeImportKey(["binance-fill", symbol, String(record.id ?? ""), String(record.orderId ?? ""), String(time), String(record.isBuyer)]);
  const side = record.isBuyer === true ? "buy" : "sell";
  const providerOrderId = String(record.orderId ?? "");
  const providerExecutionId = String(record.id ?? "");
  const providerExecutionIdentity = createProviderOrderExecutionIdentity({
    provider: "binance",
    symbol,
    side,
    providerOrderId
  }) ?? createProviderExecutionIdentity({
    provider: "binance",
    symbol,
    side,
    providerExecutionId,
    executedAt: time
  })!;
  return {
    exchange: "binance",
    symbol,
    side,
    price,
    qty,
    fee,
    feeAsset: String(record.commissionAsset ?? ""),
    time,
    rawRef,
    executionFingerprint: executionFingerprint(["binance", symbol, String(record.id ?? ""), String(record.orderId ?? ""), String(time), String(record.isBuyer)]),
    providerOrderId,
    providerExecutionId,
    providerExecutionIdentity
  };
}

function normalizeBybitFill(row: unknown, fallbackSymbol: string): RawFill | null {
  const record = typeof row === "object" && row !== null ? row as Record<string, unknown> : {};
  const symbol = assertSymbol(String(record.symbol ?? fallbackSymbol));
  const price = fixed(record.execPrice);
  const qty = fixed(record.execQty);
  const fee = fixed(record.execFee);
  const time = Number(record.execTime);
  const side = String(record.side).toLowerCase() === "buy" ? "buy" : String(record.side).toLowerCase() === "sell" ? "sell" : null;
  if (!side || price === null || qty === null || qty <= ZERO || price <= ZERO || !Number.isFinite(time)) return null;
  const rawRef = safeImportKey(["bybit-fill", symbol, String(record.execId ?? ""), String(record.orderId ?? ""), String(time), side]);
  const providerOrderId = String(record.orderId ?? "");
  const providerExecutionId = String(record.execId ?? "");
  const providerExecutionIdentity = createProviderOrderExecutionIdentity({
    provider: "bybit",
    symbol,
    side,
    providerOrderId
  }) ?? createProviderExecutionIdentity({
    provider: "bybit",
    symbol,
    side,
    providerExecutionId,
    executedAt: time
  })!;
  return {
    exchange: "bybit",
    symbol,
    side,
    price,
    qty,
    fee,
    feeAsset: String(record.feeCurrency ?? ""),
    time,
    rawRef,
    executionFingerprint: executionFingerprint(["bybit", symbol, String(record.execId ?? ""), String(record.orderId ?? ""), String(time), side]),
    providerOrderId,
    providerExecutionId,
    providerExecutionIdentity
  };
}

function boundedSinceUntil(boundaryUntil?: number) {
  const now = Date.now();
  const until = Number.isFinite(boundaryUntil) && boundaryUntil! > 0
    ? Math.min(Math.floor(boundaryUntil!), now)
    : now;
  const since = until - JOURNAL_CRYPTO_MAX_HISTORY_DAYS * 86_400_000;
  return { since, until };
}

async function fetchBinanceFills({
  credential,
  symbol,
  since,
  until,
  transport,
  symbolTaints,
  budget
}: {
  credential: JournalCryptoProviderCredential;
  symbol: string;
  since: number;
  until: number;
  transport: JournalCryptoProviderTransport;
  symbolTaints: Map<string, SymbolTaint>;
  budget: RequestBudget;
}) {
  const fills: RawFill[] = [];
  let skipped = 0;
  let truncated = false;
  let windowEnd = until;
  let windows = 0;

  while (windowEnd > since && windows < JOURNAL_CRYPTO_MAX_BINANCE_WINDOWS && fills.length < JOURNAL_CRYPTO_MAX_RECORDS) {
    if (!consumeProviderRequest(budget)) {
      truncated = true;
      taintSymbol(symbolTaints, symbol, "truncated_history");
      break;
    }
    const windowStart = Math.max(since, windowEnd - ONE_DAY_MS + 1);
    const query = binanceSignedQuery({
      endTime: String(windowEnd),
      limit: String(BINANCE_PAGE_LIMIT),
      recvWindow: "5000",
      startTime: String(windowStart),
      symbol,
      timestamp: String(Date.now())
    }, credential.apiSecret);
    const url = `${BINANCE_HOST}/api/v3/myTrades?${query}`;
    assertBinanceMyTradesRequestShape(url);
    const body = assertOk(await requestWithRetry(transport, {
      method: "GET",
      url,
      headers: { "X-MBX-APIKEY": credential.apiKey },
      timeoutMs: REQUEST_TIMEOUT_MS
    }), "invalid_response");
    if (!Array.isArray(body)) {
      taintSymbol(symbolTaints, symbol, "malformed_history");
      return { fills, skipped: skipped + 1, truncated: true };
    }
    for (const row of body) {
      const fill = normalizeBinanceFill(row, symbol);
      if (fill && fill.time >= windowStart && fill.time <= windowEnd) fills.push(fill);
      else {
        skipped += 1;
        taintSymbol(symbolTaints, symbol, "malformed_history");
      }
      if (fills.length >= JOURNAL_CRYPTO_MAX_RECORDS) {
        truncated = true;
        break;
      }
    }
    if (body.length >= BINANCE_PAGE_LIMIT) {
      truncated = true;
      taintSymbol(symbolTaints, symbol, "truncated_history");
    }
    windowEnd = windowStart - 1;
    windows += 1;
  }

  if (windowEnd > since || fills.length >= JOURNAL_CRYPTO_MAX_RECORDS) {
    truncated = true;
    taintSymbol(symbolTaints, symbol, "truncated_history");
  }
  if (truncated) taintSymbol(symbolTaints, symbol, "truncated_history");
  return { fills, skipped, truncated };
}

async function fetchBybitFills({
  credential,
  symbol,
  since,
  until,
  transport,
  symbolTaints,
  budget
}: {
  credential: JournalCryptoProviderCredential;
  symbol: string;
  since: number;
  until: number;
  transport: JournalCryptoProviderTransport;
  symbolTaints: Map<string, SymbolTaint>;
  budget: RequestBudget;
}) {
  const fills: RawFill[] = [];
  let skipped = 0;
  let truncated = false;
  let windowEnd = until;
  let windows = 0;

  while (windowEnd > since && windows < JOURNAL_CRYPTO_MAX_BYBIT_WINDOWS && fills.length < JOURNAL_CRYPTO_MAX_RECORDS) {
    const windowStart = Math.max(since, windowEnd - 7 * 86_400_000 + 1);
    let cursor = "";
    for (let page = 0; page < JOURNAL_CRYPTO_MAX_PAGES; page += 1) {
      if (!consumeProviderRequest(budget)) {
        truncated = true;
        taintSymbol(symbolTaints, symbol, "truncated_history");
        break;
      }
      const signed = bybitSignedGet({
        apiKey: credential.apiKey,
        apiSecret: credential.apiSecret,
        params: {
          category: "spot",
          cursor,
          endTime: String(windowEnd),
          limit: String(BYBIT_PAGE_LIMIT),
          startTime: String(windowStart),
          symbol
        }
      });
      const body = assertBybitOk(await requestWithRetry(transport, {
        method: "GET",
        url: `${BYBIT_HOST}/v5/execution/list?${signed.query}`,
        headers: signed.headers,
        timeoutMs: REQUEST_TIMEOUT_MS
      }), "invalid_response");
      const result = typeof body.result === "object" && body.result !== null ? body.result as Record<string, unknown> : {};
      if (!Array.isArray(result.list)) {
        skipped += 1;
        truncated = true;
        taintSymbol(symbolTaints, symbol, "incomplete_history");
        break;
      }
      for (const row of result.list) {
        const fill = normalizeBybitFill(row, symbol);
        if (fill && fill.time >= windowStart && fill.time <= windowEnd) fills.push(fill);
        else {
          skipped += 1;
          taintSymbol(symbolTaints, symbol, "malformed_history");
        }
        if (fills.length >= JOURNAL_CRYPTO_MAX_RECORDS) {
          truncated = true;
          break;
        }
      }
      cursor = typeof result.nextPageCursor === "string" ? result.nextPageCursor : "";
      if (!cursor || fills.length >= JOURNAL_CRYPTO_MAX_RECORDS) break;
      if (page === JOURNAL_CRYPTO_MAX_PAGES - 1) {
        truncated = true;
        taintSymbol(symbolTaints, symbol, "truncated_history");
      }
    }
    windowEnd = windowStart - 1;
    windows += 1;
  }

  if (windowEnd > since || fills.length >= JOURNAL_CRYPTO_MAX_RECORDS) {
    truncated = true;
    taintSymbol(symbolTaints, symbol, "truncated_history");
  }
  return { fills, skipped, truncated };
}

export async function fetchJournalCryptoHistory({
  credential,
  symbols,
  accountLabel,
  connectionIdentity,
  watermarks = {},
  crawlProgress,
  maxProviderRequests = JOURNAL_CRYPTO_MAX_PROVIDER_REQUESTS,
  transport = defaultTransport()
}: {
  credential: JournalCryptoProviderCredential;
  symbols: string[];
  accountLabel: string;
  connectionIdentity: string;
  watermarks?: Record<string, number | string | undefined>;
  crawlProgress?: Partial<JournalCryptoCrawlProgress> | null;
  maxProviderRequests?: number;
  transport?: JournalCryptoProviderTransport;
}): Promise<JournalCryptoSyncResult> {
  const selectedSymbols = validateJournalCryptoSymbols(symbols);
  const fills: RawFill[] = [];
  const symbolTaints = new Map<string, SymbolTaint>();
  let truncated = false;
  let skippedCount = 0;
  const progressBoundary = crawlProgress?.exchange === credential.exchange &&
    crawlProgress.complete !== true &&
    typeof crawlProgress.boundaryUntil === "number" &&
    Number.isFinite(crawlProgress.boundaryUntil)
    ? crawlProgress.boundaryUntil
    : undefined;
  const { since, until } = boundedSinceUntil(progressBoundary);
  const budget: RequestBudget = {
    used: 0,
    max: Math.max(1, Math.min(Math.floor(maxProviderRequests), JOURNAL_CRYPTO_MAX_PROVIDER_REQUESTS))
  };
  const completedWatermarks: Record<string, number> = crawlProgress?.exchange === credential.exchange &&
    crawlProgress.complete !== true &&
    typeof crawlProgress.completedWatermarks === "object" &&
    crawlProgress.completedWatermarks !== null
    ? Object.fromEntries(Object.entries(crawlProgress.completedWatermarks)
        .map(([symbol, value]) => [assertSymbol(symbol), Number(value)] as const)
        .filter(([, value]) => Number.isFinite(value) && value > 0))
    : {};
  const resumedSymbolIndex = crawlProgress?.exchange === credential.exchange &&
    typeof crawlProgress.nextSymbolIndex === "number" &&
    Number.isFinite(crawlProgress.nextSymbolIndex) &&
    crawlProgress.complete !== true
    ? Math.max(0, Math.min(Math.floor(crawlProgress.nextSymbolIndex), selectedSymbols.length - 1))
    : 0;
  let nextSymbolIndex = resumedSymbolIndex;

  for (let symbolIndex = resumedSymbolIndex; symbolIndex < selectedSymbols.length; symbolIndex += 1) {
    const symbol = selectedSymbols[symbolIndex];
    if (fills.length >= JOURNAL_CRYPTO_MAX_RECORDS) {
      truncated = true;
      taintSymbol(symbolTaints, symbol, "truncated_history");
      break;
    }
    const priorWatermark = Number(watermarks[symbol]);
    const symbolSince = Number.isFinite(priorWatermark)
      ? Math.max(since, priorWatermark + 1)
      : Math.max(since, until - 7 * ONE_DAY_MS);
    const result = credential.exchange === "binance"
      ? await fetchBinanceFills({ credential, symbol, since: symbolSince, until, transport, symbolTaints, budget })
      : await fetchBybitFills({ credential, symbol, since: symbolSince, until, transport, symbolTaints, budget });
    fills.push(...result.fills.slice(0, Math.max(0, JOURNAL_CRYPTO_MAX_RECORDS - fills.length)));
    skippedCount += result.skipped;
    truncated = truncated || result.truncated;
    if (fills.length >= JOURNAL_CRYPTO_MAX_RECORDS) truncated = true;
    if (!result.truncated && result.skipped === 0) {
      completedWatermarks[symbol] = until;
      nextSymbolIndex = symbolIndex + 1;
    } else {
      nextSymbolIndex = symbolIndex;
    }
    if (budget.used >= budget.max && symbolIndex < selectedSymbols.length - 1) {
      truncated = true;
      taintSymbol(symbolTaints, symbol, "truncated_history");
      break;
    }
  }
  const snapshotComplete = !truncated && skippedCount === 0 &&
    selectedSymbols.every((symbol) => Number(completedWatermarks[symbol]) >= until);
  const completedSymbolCount = selectedSymbols.filter((symbol) => Number(completedWatermarks[symbol]) >= until).length;
  const firstIncompleteSymbolIndex = selectedSymbols.findIndex((symbol) => Number(completedWatermarks[symbol]) < until);
  const boundedNextSymbolIndex = Math.max(0, Math.min(nextSymbolIndex, Math.max(0, selectedSymbols.length - 1)));
  const nextCrawlProgress = snapshotComplete
    ? {
        exchange: credential.exchange,
        boundaryUntil: until,
        completedWatermarks,
        nextSymbolIndex: 0,
        completedSymbolCount: selectedSymbols.length,
        totalSymbolCount: selectedSymbols.length,
        complete: true,
        updatedAt: new Date().toISOString()
      }
    : {
        exchange: credential.exchange,
        boundaryUntil: until,
        completedWatermarks,
        nextSymbolIndex: firstIncompleteSymbolIndex >= 0 ? firstIncompleteSymbolIndex : boundedNextSymbolIndex,
        completedSymbolCount,
        totalSymbolCount: selectedSymbols.length,
        complete: false,
        updatedAt: new Date().toISOString()
      };

  return {
    imported: normalizeSpotRoundTrips(fills, accountLabel, connectionIdentity, symbolTaints)
      .sort((left, right) => String(right.closedAt ?? right.openedAt).localeCompare(String(left.closedAt ?? left.openedAt))),
    skippedCount,
    truncated,
    snapshotComplete,
    requestCount: budget.used,
    watermarks: snapshotComplete ? completedWatermarks : {},
    crawlProgress: nextCrawlProgress,
    failureCategory: truncated ? "bounded_limit_reached" : skippedCount > 0 ? "invalid_response" : "none",
    safeMessage: truncated
      ? `Journal Sync imported a bounded slice and skipped ${skippedCount} unsafe ${skippedCount === 1 ? "record" : "records"}. Narrow symbols or run again later.`
      : skippedCount > 0
        ? `Journal Sync skipped ${skippedCount} unsafe ${skippedCount === 1 ? "record" : "records"} and imported provider-confirmed crypto history.`
        : "Journal Sync imported provider-confirmed crypto history."
  };
}

export function createDeterministicJournalCryptoFakeTransport(): JournalCryptoProviderTransport {
  let binanceRateLimited = false;
  const bybitPages = new Map<string, number>();
  const now = Date.now();

  return async (request) => {
    const url = new URL(request.url);
    if (!JOURNAL_CRYPTO_ALLOWED_HOSTS.includes(url.origin as typeof JOURNAL_CRYPTO_ALLOWED_HOSTS[number])) {
      return { status: 403, body: { safe: false } };
    }
    if (url.hostname.includes("binance")) {
      if (!request.headers["X-MBX-APIKEY"]) return { status: 401, body: {} };
      if (url.pathname === "/sapi/v1/account/apiRestrictions") {
        const key = request.headers["X-MBX-APIKEY"];
        if (key.includes("writer")) return { status: 200, body: { enableReading: true, enableSpotAndMarginTrading: true } };
        return { status: 200, body: { enableReading: true, enableSpotAndMarginTrading: false, enableWithdrawals: false, enableInternalTransfer: false, permitsUniversalTransfer: false, enableFutures: false, enableMargin: false, enableVanillaOptions: false, enableFixApiTrade: false, enablePortfolioMarginTrading: false } };
      }
      if (url.pathname === "/api/v3/myTrades") {
        try {
          assertBinanceMyTradesRequestShape(request.url);
        } catch {
          return { status: 400, body: { code: -1102 } };
        }
        if (!binanceRateLimited && url.searchParams.get("symbol") === "LINKUSDT") {
          binanceRateLimited = true;
          return { status: 429, headers: { "Retry-After": "0.001" }, body: { code: -1003 } };
        }
        const symbol = url.searchParams.get("symbol") ?? "BTCUSDT";
        const startTime = Number(url.searchParams.get("startTime"));
        const endTime = Number(url.searchParams.get("endTime"));
        const candidateRows = symbol === "LINKUSDT"
          ? [
              { id: 1, orderId: 11, price: "24", qty: "20", commission: "0.20", commissionAsset: "USDT", time: now - 86_400_000, isBuyer: true },
              { id: 2, orderId: 12, price: "26", qty: "20", commission: "0.20", commissionAsset: "USDT", time: now - 3_600_000, isBuyer: false }
            ]
          : [
              { id: 100, orderId: 101, price: "68420", qty: "0.02", commission: "0.000001", commissionAsset: "BTC", time: now - 7_200_000, isBuyer: true }
            ];
        const rows = candidateRows.filter((row) => Number.isFinite(startTime) && Number.isFinite(endTime) && row.time >= startTime && row.time <= endTime);
        return { status: 200, body: rows };
      }
    }
    if (url.hostname.includes("bybit")) {
      const apiKey = request.headers["X-BAPI-API-KEY"] ?? "";
      const timestamp = request.headers["X-BAPI-TIMESTAMP"] ?? "";
      const recvWindow = request.headers["X-BAPI-RECV-WINDOW"] ?? "";
      const signature = request.headers["X-BAPI-SIGN"] ?? "";
      const query = sortedQuery(Object.fromEntries(url.searchParams.entries()));
      const expected = crypto.createHmac("sha256", apiKey.includes("bad") ? "wrong" : "journal-sync-mock-secret")
        .update(`${timestamp}${apiKey}${recvWindow}${query}`)
        .digest("hex");
      if (!timestamp || !recvWindow || !signature || signature !== expected) {
        return { status: 200, body: { retCode: 10004, retMsg: "signature error" } };
      }
      if (url.pathname === "/v5/user/query-api") {
        if (apiKey.includes("writer")) return { status: 200, body: { retCode: 0, result: { readOnly: 0, permissions: { Spot: ["Order"] } } } };
        return { status: 200, body: { retCode: 0, result: { readOnly: 1, permissions: { Spot: ["SpotTrade"] } } } };
      }
      if (url.pathname === "/v5/execution/list") {
        const symbol = url.searchParams.get("symbol") ?? "BTCUSDT";
        const cursor = url.searchParams.get("cursor") ?? "";
        const key = `${symbol}:${url.searchParams.get("startTime")}:${cursor}`;
        const seen = bybitPages.get(key) ?? 0;
        bybitPages.set(key, seen + 1);
        if (symbol === "DOGEUSDT" && !cursor) {
          return { status: 200, body: { retCode: 0, result: { nextPageCursor: "page-2", list: [{ symbol, side: "Buy", execPrice: "0.12", execQty: "1000", execFee: "1", feeCurrency: "DOGE", execTime: String(now - 100_000), execId: "doge-1", orderId: "doge-order-1" }] } } };
        }
        if (cursor === "page-2") {
          return { status: 200, body: { retCode: 0, result: { nextPageCursor: "", list: [{ symbol, side: "Sell", execPrice: "0.14", execQty: "1000", execFee: "1", feeCurrency: "BNB", execTime: String(now - 50_000), execId: "doge-2", orderId: "doge-order-2" }] } } };
        }
        return { status: 200, body: { retCode: 0, result: { nextPageCursor: "", list: [] } } };
      }
    }
    return { status: 404, body: {} };
  };
}

export const journalCryptoAdapterTestHooks = {
  fixed,
  toNumber,
  normalizeSpotRoundTrips,
  verifyJournalCryptoReadOnlyPermission,
  fetchJournalCryptoHistory,
  assertBinanceMyTradesRequestShape,
  bybitSignedGet,
  createDeterministicJournalCryptoFakeTransport
};
