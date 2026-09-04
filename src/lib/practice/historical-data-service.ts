import "server-only";

import { createHash } from "node:crypto";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  discoverMetaApiUtilityForexCfdInstruments,
  fetchMetaApiUtilityForexCfdCandles,
  getMetaApiUtilityForexCfdInstrument
} from "@/lib/practice/metaapi-utility-history-adapter";
import {
  assertForexCfdRealHistoryReady,
  FOREX_CFD_APPROVED_INSTRUMENTS,
  FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS,
  FOREX_CFD_HISTORY_SUPPORTED_TIMEFRAMES,
  forexCfdProviderSymbolMatchesCanonical as providerSymbolMatchesCanonical,
  getForexCfdHistoryProviderReadiness,
  resolveForexCfdHistoryProviderSymbol
} from "@/lib/practice/forex-cfd-history-provider-contract";
import { getPracticeInstrumentSpec } from "@/lib/practice/practice-instrument-specs";
import {
  getVerifiedBinanceSpotCatalogue,
  getVerifiedBinanceSpotInstrument,
  unavailableApprovedCryptoSpotCatalogue
} from "@/lib/practice/binance-public-spot-catalogue";
import {
  APPROVED_PRACTICE_CRYPTO_SPOT_SYMBOLS
} from "@/lib/practice/practice-crypto-spot-allowlist";
import type {
  HistoricalCandleCacheRecord,
  HistoricalCandleRequest,
  NormalizedCandle,
  PracticeAssetCatalogueItem,
  PracticeAssetClass,
  PracticeInstrumentSpecSummary,
  PracticePlatformSource
} from "@/types/practice";

export type MarketDataProvider = {
  id: PracticePlatformSource;
  name: string;
  supports(assetClass: PracticeAssetClass, symbol: string, timeframeMinutes: number): boolean;
  fetchCandles(input: HistoricalCandleRequest & { providerSymbol?: string }): Promise<NormalizedCandle[]>;
};

type HistoricalCandleCacheReadOptions = {
  allowExpired?: boolean;
};

export type HistoricalCandleFetchOptions = {
  allowExpiredCache?: boolean;
};

const MAX_CANDLES_PER_REQUEST = 500;
const MAX_RANGE_MS = 1000 * 60 * 60 * 24 * 366;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const SUPPORTED_TIMEFRAMES = new Set([15, 60, 240, 1440]);
const SUPPORTED_BINANCE_SYMBOLS = APPROVED_PRACTICE_CRYPTO_SPOT_SYMBOLS;
const SUPPORTED_FOREX_CFD_SYMBOLS = new Set<string>([...FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS]);
const LEGACY_FOREX_CFD_CATALOGUE_ALIASES = new Set(["US500", "JP225"]);
const CATALOGUE_ONLY_UNAVAILABLE_CFD: PracticeAssetCatalogueItem = {
  symbol: "FRA40",
  displayName: "France 40",
  assetClass: "forex_cfd",
  category: "indices",
  available: false,
  safeMessage: "Historical candles are not available for this asset right now."
};

// Stage 18X compatibility anchor: PRACTICE_FOREX_CFD_HISTORY_PROVIDER is parsed in the Stage 22A contract module.
export const historicalProviderSymbolMatchesCanonical = providerSymbolMatchesCanonical;

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSymbol(value: unknown) {
  return safeString(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function normalizeIso(value: unknown, field: string) {
  const raw = safeString(value);
  const time = Date.parse(raw);

  if (!raw || !Number.isFinite(time)) {
    throw new AdminApiError(400, `${field}_invalid`, "Choose a valid historical candle date range.");
  }

  return new Date(time).toISOString();
}

function normalizeTimeframe(value: unknown) {
  const timeframe = typeof value === "number" ? value : Number(value);

  if (!SUPPORTED_TIMEFRAMES.has(timeframe)) {
    throw new AdminApiError(400, "practice_timeframe_unsupported", "Choose M15, H1, H4, or D1 for this practice foundation.");
  }

  return timeframe;
}

function binanceInterval(timeframeMinutes: number) {
  if (timeframeMinutes === 15) {
    return "15m";
  }

  if (timeframeMinutes === 60) {
    return "1h";
  }

  if (timeframeMinutes === 240) {
    return "4h";
  }

  return "1d";
}

function timeframeMs(timeframeMinutes: number) {
  return timeframeMinutes * 60 * 1000;
}

function deterministicNoise(seed: string) {
  const digest = createHash("sha256").update(seed).digest("hex").slice(0, 8);
  const value = Number.parseInt(digest, 16) / 0xffffffff;

  return Number.isFinite(value) ? value - 0.5 : 0;
}

function basePriceForForexCfdSymbol(symbol: string) {
  switch (symbol) {
    case "XAUUSD":
      return 2400;
    case "XAGUSD":
      return 30;
    case "US30":
      return 40_000;
    case "US500":
    case "SPX500":
      return 5_500;
    case "NAS100":
      return 19_000;
    case "GER40":
      return 18_500;
    case "UK100":
      return 8_200;
    case "JP225":
    case "JPN225":
      return 39_000;
    case "USOIL":
    case "UKOIL":
      return 80;
    case "NATGAS":
      return 2.5;
    case "USDJPY":
      return 150;
    case "USDCHF":
      return 0.88;
    case "USDCAD":
      return 1.36;
    case "AUDUSD":
      return 0.66;
    case "NZDUSD":
      return 0.61;
    case "GBPUSD":
      return 1.28;
    default:
      return 1.09;
  }
}

function decimalPlacesForForexCfdSymbol(symbol: string) {
  return getPracticeInstrumentSpec("forex_cfd", symbol)?.pricePrecision ?? 5;
}

function roundForexCfdPrice(symbol: string, value: number) {
  const factor = 10 ** decimalPlacesForForexCfdSymbol(symbol);

  return Math.round(value * factor) / factor;
}

function isLocalPracticeEmulator() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

function basePriceForCryptoSymbol(symbol: string) {
  switch (symbol) {
    case "BTCUSDT":
      return 60_000;
    case "ETHUSDT":
      return 4_680;
    case "BNBUSDT":
      return 600;
    case "SOLUSDT":
      return 150;
    case "XRPUSDT":
      return 0.62;
    case "LINKUSDT":
      return 24;
    default:
      return Math.max(1, getPracticeInstrumentSpec("crypto", symbol)?.minSimulatedNotional ?? 5) * 12;
  }
}

function decimalPlacesForCryptoSymbol(symbol: string) {
  return getPracticeInstrumentSpec("crypto", symbol)?.pricePrecision ?? 4;
}

function roundCryptoPrice(symbol: string, value: number) {
  const instrument = getPracticeInstrumentSpec("crypto", symbol);
  const tickSize = instrument?.tickSize && instrument.tickSize > 0 ? instrument.tickSize : 10 ** -decimalPlacesForCryptoSymbol(symbol);
  const precision = Math.min(8, Math.max(0, String(tickSize).split(".")[1]?.length ?? decimalPlacesForCryptoSymbol(symbol)));

  return Number((Math.round(value / tickSize) * tickSize).toFixed(precision));
}

function validateRange(rangeStart: string, rangeEnd: string, timeframeMinutes: number) {
  const startMs = Date.parse(rangeStart);
  const endMs = Date.parse(rangeEnd);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new AdminApiError(400, "practice_range_invalid", "Choose a historical range where the end date is after the start date.");
  }

  if (endMs - startMs > MAX_RANGE_MS) {
    throw new AdminApiError(400, "practice_range_too_large", "Historical practice requests are limited to a bounded range in this foundation stage.");
  }

  const estimatedCandles = Math.ceil((endMs - startMs) / (timeframeMinutes * 60 * 1000));

  if (estimatedCandles > MAX_CANDLES_PER_REQUEST) {
    throw new AdminApiError(400, "practice_candle_limit_exceeded", "Reduce the range or use a higher timeframe before fetching candles.");
  }
}

export function normalizeHistoricalCandleRequest(payload: unknown): HistoricalCandleRequest {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(400, "practice_candle_payload_invalid", "Historical candle request details are required.");
  }

  const record = payload as Record<string, unknown>;
  const assetClass: PracticeAssetClass =
    record.assetClass === "crypto" || record.assetClass === "forex_cfd" ? record.assetClass : "crypto";
  const symbol = normalizeSymbol(record.symbol);
  const timeframeMinutes = normalizeTimeframe(record.timeframeMinutes);
  const rangeStart = normalizeIso(record.rangeStart, "rangeStart");
  const rangeEnd = normalizeIso(record.rangeEnd, "rangeEnd");

  if (!symbol) {
    throw new AdminApiError(400, "practice_symbol_required", "Choose a symbol before fetching historical candles.");
  }

  validateRange(rangeStart, rangeEnd, timeframeMinutes);

  return {
    assetClass,
    symbol,
    timeframeMinutes,
    rangeStart,
    rangeEnd
  };
}

function validateCandleShape(candle: NormalizedCandle) {
  const numbers = [candle.open, candle.high, candle.low, candle.close, candle.volume, candle.timeframeMinutes];
  const dates = [Date.parse(candle.openTime), Date.parse(candle.closeTime)];

  return numbers.every((value) => Number.isFinite(value)) &&
    dates.every((value) => Number.isFinite(value)) &&
    candle.high >= candle.low &&
    candle.symbol.length > 0;
}

function normalizeBinanceKline(entry: unknown, input: HistoricalCandleRequest): NormalizedCandle {
  if (!Array.isArray(entry) || entry.length < 6) {
    throw new AdminApiError(502, "binance_candle_shape_invalid", "Binance returned an unsupported candle shape.");
  }

  const openTime = Number(entry[0]);
  const closeTime = Number(entry[6] ?? openTime + input.timeframeMinutes * 60 * 1000 - 1);
  const candle: NormalizedCandle = {
    openTime: new Date(openTime).toISOString(),
    closeTime: new Date(closeTime).toISOString(),
    open: Number(entry[1]),
    high: Number(entry[2]),
    low: Number(entry[3]),
    close: Number(entry[4]),
    volume: Number(entry[5]),
    provider: "binance",
    assetClass: "crypto",
    symbol: input.symbol,
    timeframeMinutes: input.timeframeMinutes
  };

  if (!validateCandleShape(candle)) {
    throw new AdminApiError(502, "binance_candle_invalid", "Binance returned an invalid candle.");
  }

  return candle;
}

function generateTradeHubStaticForexCfdCandles(input: HistoricalCandleRequest, providerSymbol: string) {
  const canonicalSymbol = normalizeSymbol(input.symbol);
  const startMs = Date.parse(input.rangeStart);
  const endMs = Date.parse(input.rangeEnd);
  const stepMs = timeframeMs(input.timeframeMinutes);
  const basePrice = basePriceForForexCfdSymbol(canonicalSymbol);
  const category = getPracticeInstrumentSpec("forex_cfd", canonicalSymbol)?.category;
  const volatility = category === "indices_cfd"
    ? basePrice * 0.002
    : category === "energy_cfd"
      ? 0.65
      : canonicalSymbol === "XAUUSD"
        ? 7.5
        : canonicalSymbol === "XAGUSD"
          ? 0.18
          : canonicalSymbol.endsWith("JPY")
            ? 0.18
            : 0.0035;
  const candles: NormalizedCandle[] = [];
  let previousClose = basePrice + deterministicNoise(`${canonicalSymbol}:seed`) * volatility;

  for (let openMs = startMs; openMs < endMs && candles.length < MAX_CANDLES_PER_REQUEST; openMs += stepMs) {
    const closeMs = Math.min(openMs + stepMs - 1, endMs);
    const trend = Math.sin((openMs / stepMs) * 0.37) * volatility * 0.35;
    const move = deterministicNoise(`${canonicalSymbol}:${input.timeframeMinutes}:${openMs}:move`) * volatility + trend;
    const wickA = Math.abs(deterministicNoise(`${canonicalSymbol}:${openMs}:wickA`) * volatility * 0.7);
    const wickB = Math.abs(deterministicNoise(`${canonicalSymbol}:${openMs}:wickB`) * volatility * 0.7);
    const open = roundForexCfdPrice(canonicalSymbol, previousClose);
    const close = roundForexCfdPrice(canonicalSymbol, Math.max(basePrice * 0.1, open + move));
    const high = roundForexCfdPrice(canonicalSymbol, Math.max(open, close) + wickA);
    const low = roundForexCfdPrice(canonicalSymbol, Math.max(0.00001, Math.min(open, close) - wickB));
    const volume = Math.max(1, Math.round(Math.abs(deterministicNoise(`${canonicalSymbol}:${openMs}:volume`)) * 5000));
    const candle: NormalizedCandle = {
      openTime: new Date(openMs).toISOString(),
      closeTime: new Date(closeMs).toISOString(),
      open,
      high,
      low,
      close,
      volume,
      provider: "metaapi_mt5",
      assetClass: "forex_cfd",
      symbol: canonicalSymbol,
      providerSymbol,
      timeframeMinutes: input.timeframeMinutes
    };

    if (!validateCandleShape(candle)) {
      throw new AdminApiError(502, "practice_forex_cfd_static_candle_invalid", "TradeHub utility practice candles could not be normalized safely.");
    }

    candles.push(candle);
    previousClose = close;
  }

  return candles;
}

function generateTradeHubStaticCryptoCandles(input: HistoricalCandleRequest, providerSymbol: string) {
  const canonicalSymbol = normalizeSymbol(input.symbol);
  const startMs = Date.parse(input.rangeStart);
  const endMs = Date.parse(input.rangeEnd);
  const stepMs = timeframeMs(input.timeframeMinutes);
  const basePrice = basePriceForCryptoSymbol(canonicalSymbol);
  const volatility = Math.max(basePrice * 0.0035, getPracticeInstrumentSpec("crypto", canonicalSymbol)?.tickSize ?? 0.01);
  const candles: NormalizedCandle[] = [];
  let previousClose = basePrice + deterministicNoise(`${canonicalSymbol}:crypto:seed`) * volatility;

  for (let openMs = startMs; openMs < endMs && candles.length < MAX_CANDLES_PER_REQUEST; openMs += stepMs) {
    const closeMs = Math.min(openMs + stepMs - 1, endMs);
    const trend = Math.sin((openMs / stepMs) * 0.31) * volatility * 0.42;
    const move = deterministicNoise(`${canonicalSymbol}:${input.timeframeMinutes}:${openMs}:crypto:move`) * volatility + trend;
    const wickA = Math.abs(deterministicNoise(`${canonicalSymbol}:${openMs}:crypto:wickA`) * volatility * 0.85);
    const wickB = Math.abs(deterministicNoise(`${canonicalSymbol}:${openMs}:crypto:wickB`) * volatility * 0.85);
    const open = roundCryptoPrice(canonicalSymbol, previousClose);
    const close = roundCryptoPrice(canonicalSymbol, Math.max(basePrice * 0.1, open + move));
    const high = roundCryptoPrice(canonicalSymbol, Math.max(open, close) + wickA);
    const low = roundCryptoPrice(canonicalSymbol, Math.max(0.00000001, Math.min(open, close) - wickB));
    const volume = Math.max(1, Math.round(Math.abs(deterministicNoise(`${canonicalSymbol}:${openMs}:crypto:volume`)) * 100_000));
    const candle: NormalizedCandle = {
      openTime: new Date(openMs).toISOString(),
      closeTime: new Date(closeMs).toISOString(),
      open,
      high,
      low,
      close,
      volume,
      provider: "binance",
      assetClass: "crypto",
      symbol: canonicalSymbol,
      providerSymbol,
      timeframeMinutes: input.timeframeMinutes
    };

    if (!validateCandleShape(candle)) {
      throw new AdminApiError(502, "practice_crypto_static_candle_invalid", "TradeHub demo practice candles could not be normalized safely.");
    }

    candles.push(candle);
    previousClose = close;
  }

  return candles;
}

export const binancePublicCryptoProvider: MarketDataProvider = {
  id: "binance",
  name: "Binance public historical candles",
  supports(assetClass, symbol, timeframeMinutes) {
    return assetClass === "crypto" &&
      SUPPORTED_BINANCE_SYMBOLS.has(normalizeSymbol(symbol)) &&
      SUPPORTED_TIMEFRAMES.has(timeframeMinutes);
  },
  async fetchCandles(input) {
    if (!this.supports(input.assetClass, input.symbol, input.timeframeMinutes)) {
      throw new AdminApiError(400, "binance_symbol_or_timeframe_unsupported", "That crypto symbol or timeframe is not supported for practice candles yet.");
    }

    const url = new URL("https://api.binance.com/api/v3/klines");
    url.searchParams.set("symbol", input.symbol);
    url.searchParams.set("interval", binanceInterval(input.timeframeMinutes));
    url.searchParams.set("startTime", String(Date.parse(input.rangeStart)));
    url.searchParams.set("endTime", String(Date.parse(input.rangeEnd)));
    url.searchParams.set("limit", String(MAX_CANDLES_PER_REQUEST));

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new AdminApiError(502, "binance_public_candles_failed", "TradeHub could not fetch Binance public candles for that bounded range.");
      }

      const payload = await response.json() as unknown;

      if (!Array.isArray(payload)) {
        throw new AdminApiError(502, "binance_candle_response_invalid", "Binance returned an unsupported candle response.");
      }

      const candles = payload.slice(0, MAX_CANDLES_PER_REQUEST).map((entry) => normalizeBinanceKline(entry, input));

      if (candles.length > 0 || !isLocalPracticeEmulator()) {
        return candles;
      }
    } catch (error) {
      if (!isLocalPracticeEmulator()) {
        throw error;
      }
    }

    return generateTradeHubStaticCryptoCandles(input, input.providerSymbol || input.symbol);
  }
};

export const metaApiMt5ForexProvider: MarketDataProvider = {
  id: "metaapi_mt5",
  name: "TradeHub utility Forex/CFD historical candles",
  supports(assetClass, symbol, timeframeMinutes) {
    return assetClass === "forex_cfd" &&
      SUPPORTED_FOREX_CFD_SYMBOLS.has(normalizeSymbol(symbol)) &&
      SUPPORTED_TIMEFRAMES.has(timeframeMinutes);
  },
  async fetchCandles(input) {
    if (!this.supports(input.assetClass, input.symbol, input.timeframeMinutes)) {
      throw new AdminApiError(400, "practice_forex_cfd_symbol_or_timeframe_unsupported", "Choose an available Forex or CFD instrument on M15, H1, H4, or D1.");
    }

    const readiness = getForexCfdHistoryProviderReadiness();
    const providerSymbol = input.providerSymbol || resolveForexCfdHistoryProviderSymbol(input.symbol);

    if (readiness.provider === "disabled") {
      throw new AdminApiError(
        503,
        "practice_forex_cfd_history_not_configured",
        "Forex/CFD historical candles are not configured yet. TradeHub uses platform-owned utility data for practice, never student MetaAPI credentials."
      );
    }

    if (readiness.provider === "tradehub_static_demo") {
      return generateTradeHubStaticForexCfdCandles(input, providerSymbol);
    }

    if (readiness.provider === "metaapi_utility") {
      assertForexCfdRealHistoryReady();

      return fetchMetaApiUtilityForexCfdCandles(input, providerSymbol);
    }

    throw new AdminApiError(
      503,
      "practice_forex_cfd_history_provider_invalid",
      "Forex/CFD historical provider configuration is invalid. Practice data remains blocked safely."
    );
  }
};

function providerFor(input: HistoricalCandleRequest): MarketDataProvider {
  const providers = [binancePublicCryptoProvider, metaApiMt5ForexProvider];
  const provider = providers.find((candidate) =>
    candidate.supports(input.assetClass, input.symbol, input.timeframeMinutes)
  );

  if (!provider) {
    throw new AdminApiError(400, "practice_market_data_unsupported", "That asset class, symbol, or timeframe is not supported for practice candles yet.");
  }

  return provider;
}

async function verifiedForexCfdInstrument(symbol: string): Promise<{
  providerSymbol: string;
  instrument: PracticeInstrumentSpecSummary;
}> {
  const canonicalSymbol = normalizeSymbol(symbol);
  const readiness = getForexCfdHistoryProviderReadiness();

  if (!SUPPORTED_FOREX_CFD_SYMBOLS.has(canonicalSymbol)) {
    throw new AdminApiError(400, "practice_forex_cfd_symbol_unsupported", "Choose an approved Forex or CFD practice instrument.");
  }

  if (readiness.provider === "tradehub_static_demo" && readiness.configured) {
    const instrument = getPracticeInstrumentSpec("forex_cfd", canonicalSymbol);

    if (!instrument) {
      throw new AdminApiError(503, "practice_forex_cfd_spec_unavailable", "That Forex/CFD practice instrument is unavailable right now.");
    }

    return {
      providerSymbol: resolveForexCfdHistoryProviderSymbol(canonicalSymbol),
      instrument
    };
  }

  if (readiness.provider === "metaapi_utility" && readiness.configured) {
    assertForexCfdRealHistoryReady();
    const discovered = await getMetaApiUtilityForexCfdInstrument(canonicalSymbol);

    if (discovered) {
      return { providerSymbol: discovered.providerSymbol, instrument: discovered.instrument };
    }
  }

  throw new AdminApiError(503, "practice_forex_cfd_spec_unavailable", "That Forex/CFD practice instrument is unavailable right now.");
}

async function providerInstrumentForRequest(input: HistoricalCandleRequest, provider: PracticePlatformSource) {
  if (provider === "metaapi_mt5") {
    return verifiedForexCfdInstrument(input.symbol);
  }

  if (provider === "binance") {
    return {
      providerSymbol: normalizeSymbol(input.symbol),
      instrument: await getVerifiedBinanceSpotInstrument(input.symbol)
    };
  }

  const instrument = getPracticeInstrumentSpec(input.assetClass, input.symbol);

  if (!instrument) {
    throw new AdminApiError(400, "practice_instrument_spec_unsupported", "That practice instrument is unavailable right now.");
  }

  return { providerSymbol: normalizeSymbol(input.symbol), instrument };
}

export function buildHistoricalCandleCacheKey(input: HistoricalCandleRequest & { provider: PracticePlatformSource; providerSymbol?: string }) {
  const raw = [
    input.provider,
    input.assetClass,
    input.symbol,
    input.providerSymbol ?? "",
    String(input.timeframeMinutes),
    input.rangeStart,
    input.rangeEnd
  ].join(":");
  const digest = createHash("sha256").update(raw).digest("hex").slice(0, 20);

  return `${input.provider}_${input.assetClass}_${input.symbol}_${input.timeframeMinutes}_${digest}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
}

async function readHistoricalCandleCache(workspaceId: string, cacheId: string, options: HistoricalCandleCacheReadOptions = {}) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(`workspaces/${workspaceId}/historical_candle_cache/${cacheId}`).get();

  if (!snapshot.exists) {
    return null;
  }

  const record = snapshot.data() as HistoricalCandleCacheRecord | undefined;

  if (!record || (!options.allowExpired && Date.parse(record.expiresAt) <= Date.now())) {
    return null;
  }

  if (!Array.isArray(record.candles) || record.candles.length <= 0 || record.candles.some((candle) => !validateCandleShape(candle))) {
    return null;
  }

  return record;
}

async function writeHistoricalCandleCache(workspaceId: string, record: HistoricalCandleCacheRecord) {
  const { db } = getFirebaseAdminClients();

  await db.doc(`workspaces/${workspaceId}/historical_candle_cache/${record.cacheId}`).set(record, { merge: true });
}

export async function fetchHistoricalCandlesWithCache(
  workspaceId: string,
  request: HistoricalCandleRequest,
  options: HistoricalCandleFetchOptions = {}
) {
  const provider = providerFor(request);
  const { providerSymbol, instrument } = await providerInstrumentForRequest(request, provider.id);
  const cacheId = buildHistoricalCandleCacheKey({ ...request, provider: provider.id, providerSymbol });
  const cached = await readHistoricalCandleCache(workspaceId, cacheId, {
    allowExpired: options.allowExpiredCache === true
  });

  if (cached) {
    return {
      provider: provider.id,
      providerSymbol: cached.providerSymbol ?? providerSymbol,
      instrument,
      cacheId,
      cacheHit: true,
      candles: cached.candles
    };
  }

  const candles = await provider.fetchCandles({ ...request, providerSymbol });

  if (candles.length <= 0 || candles.length > MAX_CANDLES_PER_REQUEST || candles.some((candle) => !validateCandleShape(candle))) {
    throw new AdminApiError(502, "practice_candle_normalization_failed", "Historical candles could not be normalized safely.");
  }

  await writeHistoricalCandleCache(workspaceId, {
    cacheId,
    provider: provider.id,
    assetClass: request.assetClass,
    symbol: request.symbol,
    providerSymbol,
    timeframeMinutes: request.timeframeMinutes,
    rangeStart: request.rangeStart,
    rangeEnd: request.rangeEnd,
    candles,
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    cacheVersion: 1
  });

  return {
    provider: provider.id,
    providerSymbol,
    instrument,
    cacheId,
    cacheHit: false,
    candles
  };
}

async function cryptoAssetCatalogue(): Promise<PracticeAssetCatalogueItem[]> {
  try {
    return await getVerifiedBinanceSpotCatalogue();
  } catch {
    return unavailableApprovedCryptoSpotCatalogue();
  }
}

function visibleApprovedForexCfdInstruments() {
  return FOREX_CFD_APPROVED_INSTRUMENTS.filter((instrument) =>
    !LEGACY_FOREX_CFD_CATALOGUE_ALIASES.has(instrument.symbol)
  );
}

function unavailableForexCfdCatalogue(): PracticeAssetCatalogueItem[] {
  return visibleApprovedForexCfdInstruments()
    .map<PracticeAssetCatalogueItem>((instrument) => ({
      symbol: instrument.symbol,
      displayName: instrument.displayName,
      assetClass: "forex_cfd",
      category: instrument.category,
      available: false,
      safeMessage: "Historical candles are not available for this asset right now."
    }))
    .concat(CATALOGUE_ONLY_UNAVAILABLE_CFD);
}

export async function getPracticeAssetCatalogue(): Promise<PracticeAssetCatalogueItem[]> {
  const forexReadiness = getForexCfdHistoryProviderReadiness();
  const crypto = await cryptoAssetCatalogue();

  if (!forexReadiness.configured) {
    return [...crypto, ...unavailableForexCfdCatalogue()];
  }

  if (forexReadiness.provider === "tradehub_static_demo") {
    return [...crypto, ...visibleApprovedForexCfdInstruments().map((approved): PracticeAssetCatalogueItem => ({
      symbol: approved.symbol,
      displayName: approved.displayName,
      assetClass: "forex_cfd",
      category: approved.category,
      available: true,
      safeMessage: "Available for simulated practice.",
      instrument: getPracticeInstrumentSpec("forex_cfd", approved.symbol)
    })), CATALOGUE_ONLY_UNAVAILABLE_CFD];
  }

  try {
    const discovered = await discoverMetaApiUtilityForexCfdInstruments();
    const discoveredBySymbol = new Map(discovered.map((entry) => [entry.canonicalSymbol, entry]));
    const forexCfd = visibleApprovedForexCfdInstruments().map((approved): PracticeAssetCatalogueItem => {
      const entry = discoveredBySymbol.get(approved.symbol);

      return {
        symbol: approved.symbol,
        displayName: approved.displayName,
        assetClass: "forex_cfd",
        category: approved.category,
        available: Boolean(entry),
        safeMessage: entry
          ? "Available for simulated practice."
          : "Historical candles are not available for this asset right now.",
        instrument: entry?.instrument
      };
    });

    return [...crypto, ...forexCfd, CATALOGUE_ONLY_UNAVAILABLE_CFD];
  } catch {
    return [...crypto, ...unavailableForexCfdCatalogue()];
  }
}

export const historicalDataLimits = {
  maxCandlesPerRequest: MAX_CANDLES_PER_REQUEST,
  maxRangeDays: MAX_RANGE_MS / (1000 * 60 * 60 * 24),
  supportedTimeframes: [...SUPPORTED_TIMEFRAMES],
  supportedForexCfdTimeframes: [...FOREX_CFD_HISTORY_SUPPORTED_TIMEFRAMES],
  supportedCryptoSymbols: [...SUPPORTED_BINANCE_SYMBOLS],
  supportedForexCfdSymbols: [...SUPPORTED_FOREX_CFD_SYMBOLS],
  forexCfdHistoryReadiness: getForexCfdHistoryProviderReadiness()
};
