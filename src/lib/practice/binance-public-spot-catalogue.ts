import "server-only";

import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS,
  APPROVED_PRACTICE_CRYPTO_SPOT_BY_SYMBOL,
  APPROVED_PRACTICE_CRYPTO_SPOT_SYMBOLS
} from "@/lib/practice/practice-crypto-spot-allowlist";
import type { PracticeAssetCatalogueItem, PracticeInstrumentSpecSummary } from "@/types/practice";

const CATALOGUE_CACHE_PATH = "platform_practice_crypto_catalogue/current";
const CATALOGUE_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_PROVIDER_RESPONSE_BYTES = 2_000_000;
const MAX_PROVIDER_SYMBOLS = 250;
const MAX_SAFE_DECIMALS = 8;
const MAX_SAFE_QUANTITY = 1_000_000_000;
const MAX_SAFE_NOTIONAL = 10_000_000;
const PROVIDER_TIMEOUT_MS = 8_000;
const SAFE_AVAILABLE_MESSAGE = "Available for simulated practice. Values are practice estimates and may differ from an exchange.";
const SAFE_UNAVAILABLE_MESSAGE = "Historical candles are not available for this asset right now.";

type SafeCryptoCatalogueCacheRecord = {
  cacheVersion: 1;
  instruments: PracticeAssetCatalogueItem[];
  verifiedAt: string;
  expiresAt: string;
  demoSeed?: boolean;
};

let memoryCache: SafeCryptoCatalogueCacheRecord | null = null;

function safeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function decimalPlaces(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!/^\d+(?:\.\d+)?$/.test(raw)) {
    return -1;
  }

  const fraction = raw.includes(".") ? raw.split(".")[1].replace(/0+$/, "") : "";
  return fraction.length;
}

function safeFilter(filters: unknown, filterType: string) {
  if (!Array.isArray(filters) || filters.length > 40) {
    return undefined;
  }

  return filters.find((filter) =>
    typeof filter === "object" && filter !== null && !Array.isArray(filter) &&
    (filter as Record<string, unknown>).filterType === filterType
  ) as Record<string, unknown> | undefined;
}

function normalizedInstrumentFromProviderSymbol(value: unknown): PracticeAssetCatalogueItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const symbol = String(record.symbol ?? "").trim().toUpperCase();
  const approved = APPROVED_PRACTICE_CRYPTO_SPOT_BY_SYMBOL.get(symbol);
  const permissions = Array.isArray(record.permissions) ? record.permissions : [];

  if (
    !approved || record.status !== "TRADING" || record.quoteAsset !== "USDT" ||
    record.baseAsset !== approved.baseAsset ||
    !(record.isSpotTradingAllowed === true || permissions.includes("SPOT"))
  ) {
    return null;
  }

  const priceFilter = safeFilter(record.filters, "PRICE_FILTER");
  const lotSize = safeFilter(record.filters, "LOT_SIZE");
  const notionalFilter = safeFilter(record.filters, "NOTIONAL") ?? safeFilter(record.filters, "MIN_NOTIONAL");
  const tickSize = safeNumber(priceFilter?.tickSize);
  const minQuantity = safeNumber(lotSize?.minQty);
  const maxQuantity = safeNumber(lotSize?.maxQty);
  const stepSize = safeNumber(lotSize?.stepSize);
  const minNotional = safeNumber(notionalFilter?.minNotional);
  const providerMaxNotional = safeNumber(notionalFilter?.maxNotional);
  const pricePrecision = decimalPlaces(priceFilter?.tickSize);
  const quantityPrecision = decimalPlaces(lotSize?.stepSize);

  if (
    !Number.isFinite(tickSize) || tickSize <= 0 || tickSize > MAX_SAFE_NOTIONAL ||
    !Number.isFinite(minQuantity) || minQuantity <= 0 || minQuantity > MAX_SAFE_QUANTITY ||
    !Number.isFinite(maxQuantity) || maxQuantity < minQuantity || maxQuantity > MAX_SAFE_QUANTITY ||
    !Number.isFinite(stepSize) || stepSize <= 0 || stepSize > maxQuantity ||
    !Number.isFinite(minNotional) || minNotional <= 0 || minNotional > MAX_SAFE_NOTIONAL ||
    pricePrecision < 0 || pricePrecision > MAX_SAFE_DECIMALS ||
    quantityPrecision < 0 || quantityPrecision > MAX_SAFE_DECIMALS
  ) {
    return null;
  }

  const instrument: PracticeInstrumentSpecSummary = {
    canonicalSymbol: approved.symbol,
    assetClass: "crypto",
    displayName: approved.displayName,
    category: "crypto_spot",
    pricePrecision,
    quantityPrecision,
    quantityStep: stepSize,
    quantityLabel: "Qty",
    tickSize,
    pipSize: tickSize,
    pipLabel: "tick",
    contractMultiplier: 1,
    minSimulatedSize: minQuantity,
    maxSimulatedSize: maxQuantity,
    minSimulatedNotional: minNotional,
    maxSimulatedNotional: Number.isFinite(providerMaxNotional) && providerMaxNotional >= minNotional
      ? Math.min(providerMaxNotional, MAX_SAFE_NOTIONAL)
      : MAX_SAFE_NOTIONAL,
    safeMessage: SAFE_AVAILABLE_MESSAGE
  };

  return {
    symbol: approved.symbol,
    displayName: approved.displayName,
    assetClass: "crypto",
    category: "crypto",
    available: true,
    safeMessage: SAFE_AVAILABLE_MESSAGE,
    instrument
  };
}

function normalizeSafeCachedInstrument(value: unknown): PracticeAssetCatalogueItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const instrument = record.instrument;

  if (
    record.assetClass !== "crypto" || record.category !== "crypto" || record.available !== true ||
    typeof record.symbol !== "string" || !APPROVED_PRACTICE_CRYPTO_SPOT_SYMBOLS.has(record.symbol) ||
    typeof instrument !== "object" || instrument === null || Array.isArray(instrument)
  ) {
    return null;
  }

  const spec = instrument as Record<string, unknown>;
  const approved = APPROVED_PRACTICE_CRYPTO_SPOT_BY_SYMBOL.get(record.symbol);
  const normalized: PracticeInstrumentSpecSummary = {
    canonicalSymbol: record.symbol,
    assetClass: "crypto",
    displayName: approved?.displayName ?? record.symbol,
    category: "crypto_spot",
    pricePrecision: Math.floor(safeNumber(spec.pricePrecision)),
    quantityPrecision: Math.floor(safeNumber(spec.quantityPrecision)),
    quantityStep: safeNumber(spec.quantityStep),
    quantityLabel: "Qty",
    tickSize: safeNumber(spec.tickSize),
    pipSize: safeNumber(spec.pipSize),
    pipLabel: "tick",
    contractMultiplier: 1,
    minSimulatedSize: safeNumber(spec.minSimulatedSize),
    maxSimulatedSize: safeNumber(spec.maxSimulatedSize),
    minSimulatedNotional: safeNumber(spec.minSimulatedNotional),
    maxSimulatedNotional: safeNumber(spec.maxSimulatedNotional),
    safeMessage: SAFE_AVAILABLE_MESSAGE
  };

  if (
    !Number.isInteger(normalized.pricePrecision) || normalized.pricePrecision < 0 || normalized.pricePrecision > MAX_SAFE_DECIMALS ||
    !Number.isInteger(normalized.quantityPrecision) || normalized.quantityPrecision < 0 || normalized.quantityPrecision > MAX_SAFE_DECIMALS ||
    !Number.isFinite(normalized.quantityStep) || normalized.quantityStep <= 0 || normalized.quantityStep > normalized.maxSimulatedSize ||
    !Number.isFinite(normalized.tickSize) || (normalized.tickSize ?? 0) <= 0 ||
    !Number.isFinite(normalized.pipSize) || normalized.pipSize <= 0 ||
    !Number.isFinite(normalized.minSimulatedSize) || normalized.minSimulatedSize <= 0 ||
    !Number.isFinite(normalized.maxSimulatedSize) || normalized.maxSimulatedSize < normalized.minSimulatedSize ||
    !Number.isFinite(normalized.minSimulatedNotional) || (normalized.minSimulatedNotional ?? 0) <= 0 ||
    !Number.isFinite(normalized.maxSimulatedNotional) || normalized.maxSimulatedNotional < (normalized.minSimulatedNotional ?? 0)
  ) {
    return null;
  }

  return {
    symbol: record.symbol,
    displayName: approved?.displayName ?? record.symbol,
    assetClass: "crypto",
    category: "crypto",
    available: true,
    safeMessage: SAFE_AVAILABLE_MESSAGE,
    instrument: normalized
  };
}

function normalizeCacheRecord(value: unknown): SafeCryptoCatalogueCacheRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const instruments = Array.isArray(record.instruments)
    ? record.instruments.slice(0, MAX_PROVIDER_SYMBOLS).map(normalizeSafeCachedInstrument).filter((item): item is PracticeAssetCatalogueItem => Boolean(item))
    : [];
  const expiresAt = String(record.expiresAt ?? "");
  const demoSeed = record.demoSeed === true;
  const cacheIsCurrent = Date.parse(expiresAt) > Date.now();
  const emulatorDemoIsCurrent = demoSeed && Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (!instruments.length || (!cacheIsCurrent && !emulatorDemoIsCurrent)) {
    return null;
  }

  return {
    cacheVersion: 1,
    instruments,
    verifiedAt: String(record.verifiedAt ?? new Date().toISOString()),
    expiresAt,
    demoSeed
  };
}

async function readSafeCatalogueCache() {
  if (memoryCache && (Date.parse(memoryCache.expiresAt) > Date.now() || (memoryCache.demoSeed && process.env.FIRESTORE_EMULATOR_HOST))) {
    return memoryCache;
  }

  const { db } = getFirebaseAdminClients();
  const snapshot = await db.doc(CATALOGUE_CACHE_PATH).get();
  const cached = snapshot.exists ? normalizeCacheRecord(snapshot.data()) : null;

  if (cached) {
    memoryCache = cached;
  }

  return cached;
}

async function fetchVerifiedCatalogueFromBinance() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const url = new URL("https://data-api.binance.vision/api/v3/exchangeInfo");
    url.searchParams.set("symbols", JSON.stringify(APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS.map((asset) => asset.symbol)));
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, signal: controller.signal });

    if (!response.ok) {
      throw new AdminApiError(502, "practice_crypto_catalogue_unavailable", SAFE_UNAVAILABLE_MESSAGE);
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);

    if (declaredLength > MAX_PROVIDER_RESPONSE_BYTES) {
      throw new AdminApiError(502, "practice_crypto_catalogue_too_large", SAFE_UNAVAILABLE_MESSAGE);
    }

    const rawText = await response.text();

    if (rawText.length > MAX_PROVIDER_RESPONSE_BYTES) {
      throw new AdminApiError(502, "practice_crypto_catalogue_too_large", SAFE_UNAVAILABLE_MESSAGE);
    }

    const payload = JSON.parse(rawText) as unknown;

    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new AdminApiError(502, "practice_crypto_catalogue_invalid", SAFE_UNAVAILABLE_MESSAGE);
    }

    const symbols = (payload as Record<string, unknown>).symbols;

    if (!Array.isArray(symbols) || symbols.length > MAX_PROVIDER_SYMBOLS) {
      throw new AdminApiError(502, "practice_crypto_catalogue_invalid", SAFE_UNAVAILABLE_MESSAGE);
    }

    const bySymbol = new Map(
      symbols.map(normalizedInstrumentFromProviderSymbol).filter((item): item is PracticeAssetCatalogueItem => Boolean(item))
        .map((item) => [item.symbol, item])
    );
    const instruments = APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS.flatMap((asset) => {
      const verified = bySymbol.get(asset.symbol);
      return verified ? [verified] : [];
    });
    const now = new Date();
    const cache: SafeCryptoCatalogueCacheRecord = {
      cacheVersion: 1,
      instruments,
      verifiedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CATALOGUE_CACHE_TTL_MS).toISOString()
    };
    const { db } = getFirebaseAdminClients();

    await db.doc(CATALOGUE_CACHE_PATH).set(cache, { merge: false });
    memoryCache = cache;
    return cache;
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }

    throw new AdminApiError(502, "practice_crypto_catalogue_unavailable", SAFE_UNAVAILABLE_MESSAGE);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getVerifiedBinanceSpotCatalogue() {
  const cached = await readSafeCatalogueCache();

  if (cached) {
    return cached.instruments;
  }

  return (await fetchVerifiedCatalogueFromBinance()).instruments;
}

export async function getVerifiedBinanceSpotInstrument(symbol: string) {
  const canonicalSymbol = String(symbol ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!APPROVED_PRACTICE_CRYPTO_SPOT_SYMBOLS.has(canonicalSymbol)) {
    throw new AdminApiError(400, "practice_crypto_symbol_unapproved", "Choose an approved Crypto practice asset.");
  }

  const instrument = (await getVerifiedBinanceSpotCatalogue())
    .find((item) => item.symbol === canonicalSymbol)?.instrument;

  if (!instrument) {
    throw new AdminApiError(503, "practice_crypto_instrument_unavailable", SAFE_UNAVAILABLE_MESSAGE);
  }

  return instrument;
}

export function unavailableApprovedCryptoSpotCatalogue(): PracticeAssetCatalogueItem[] {
  return APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS.map((asset) => ({
    symbol: asset.symbol,
    displayName: asset.displayName,
    assetClass: "crypto",
    category: "crypto",
    available: false,
    safeMessage: SAFE_UNAVAILABLE_MESSAGE
  }));
}

export const cryptoSpotCatalogueLimits = {
  approvedCandidateCount: APPROVED_PRACTICE_CRYPTO_SPOT_ASSETS.length,
  cacheTtlMs: CATALOGUE_CACHE_TTL_MS,
  maxProviderResponseBytes: MAX_PROVIDER_RESPONSE_BYTES,
  maxProviderSymbols: MAX_PROVIDER_SYMBOLS
};
