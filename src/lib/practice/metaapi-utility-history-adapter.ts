import "server-only";

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import {
  FOREX_CFD_APPROVED_INSTRUMENTS,
  forexCfdProviderSymbolMatchesCanonical,
  safeForexCfdProviderSymbol
} from "@/lib/practice/forex-cfd-history-provider-contract";
import { getPracticeInstrumentSpec } from "@/lib/practice/practice-instrument-specs";
import type {
  HistoricalCandleRequest,
  NormalizedCandle,
  PracticeInstrumentSpecSummary
} from "@/types/practice";

type MetaApiUtilityHistorySecretPayload = {
  authToken?: string;
  token?: string;
  accountId?: string;
  baseUrl?: string;
  terminalBaseUrl?: string;
};

const DEFAULT_METAAPI_MARKET_DATA_BASE_URL = "https://mt-market-data-client-api-v1.new-york.agiliumtrade.ai";
const DEFAULT_METAAPI_TERMINAL_BASE_URL = "https://mt-client-api-v1.new-york.agiliumtrade.ai";
const MAX_METAAPI_CANDLES_PER_REQUEST = 500;
const DEFAULT_TIMEOUT_MS = 25000;
const DISCOVERY_CACHE_TTL_MS = 15 * 60 * 1000;

export type VerifiedMetaApiForexCfdInstrument = {
  canonicalSymbol: string;
  providerSymbol: string;
  instrument: PracticeInstrumentSpecSummary;
};

let discoveryCache: { expiresAt: number; instruments: VerifiedMetaApiForexCfdInstrument[] } | undefined;

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function secretManagerProjectId() {
  return (
    safeString(process.env.PRACTICE_FOREX_CFD_HISTORY_SECRET_MANAGER_PROJECT_ID) ||
    safeString(process.env.GOOGLE_CLOUD_PROJECT) ||
    safeString(process.env.GCLOUD_PROJECT)
  );
}

function secretVersionName() {
  const projectId = secretManagerProjectId();
  const secretName = safeString(process.env.PRACTICE_FOREX_CFD_HISTORY_SECRET_NAME);

  if (!projectId || !secretName) {
    throw new AdminApiError(
      503,
      "practice_forex_cfd_history_vault_unavailable",
      "Real Forex/CFD historical candles require platform utility provider credentials in the server vault."
    );
  }

  if (/^projects\/[^/]+\/secrets\/[^/]+\/versions\/[^/]+$/.test(secretName)) {
    return secretName;
  }

  if (/^projects\/[^/]+\/secrets\/[^/]+$/.test(secretName)) {
    return `${secretName}/versions/latest`;
  }

  const safeSecretId = secretName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 255);

  if (!safeSecretId) {
    throw new AdminApiError(
      503,
      "practice_forex_cfd_history_vault_unavailable",
      "Real Forex/CFD historical candle credentials are not configured safely."
    );
  }

  return `projects/${projectId}/secrets/${safeSecretId}/versions/latest`;
}

function normalizeSecretPayload(payload: unknown): MetaApiUtilityHistorySecretPayload {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(
      503,
      "practice_forex_cfd_history_secret_invalid",
      "Real Forex/CFD historical candle credentials are not configured safely."
    );
  }

  const record = payload as Record<string, unknown>;

  return {
    authToken: safeString(record.authToken),
    token: safeString(record.token),
    accountId: safeString(record.accountId),
    baseUrl: safeString(record.baseUrl),
    terminalBaseUrl: safeString(record.terminalBaseUrl)
  };
}

async function loadMetaApiUtilityHistorySecret() {
  const client = new SecretManagerServiceClient();
  let secretText = "";

  try {
    const [version] = await client.accessSecretVersion({ name: secretVersionName() });
    secretText = version.payload?.data?.toString("utf8") ?? "";
  } catch {
    throw new AdminApiError(
      503,
      "practice_forex_cfd_history_vault_unavailable",
      "Real Forex/CFD historical candle credentials could not be loaded from the server vault."
    );
  }

  try {
    const payload = normalizeSecretPayload(JSON.parse(secretText) as unknown);
    const authToken = payload.authToken || payload.token;

    if (!authToken || !payload.accountId) {
      throw new Error("missing required utility history credential fields");
    }

    return {
      authToken,
      accountId: payload.accountId,
      baseUrl: payload.baseUrl,
      terminalBaseUrl: payload.terminalBaseUrl
    };
  } catch {
    throw new AdminApiError(
      503,
      "practice_forex_cfd_history_secret_invalid",
      "Real Forex/CFD historical candle credentials are not configured safely."
    );
  }
}

function metaApiTimeframe(timeframeMinutes: number) {
  switch (timeframeMinutes) {
    case 15:
      return "15m";
    case 60:
      return "1h";
    case 240:
      return "4h";
    case 1440:
      return "1d";
    default:
      throw new AdminApiError(400, "practice_timeframe_unsupported", "Choose M15, H1, H4, or D1 for Forex/CFD practice history.");
  }
}

function timeframeMs(timeframeMinutes: number) {
  return timeframeMinutes * 60 * 1000;
}

function candleLimit(input: HistoricalCandleRequest) {
  const startMs = Date.parse(input.rangeStart);
  const endMs = Date.parse(input.rangeEnd);
  const estimatedCandles = Math.ceil((endMs - startMs) / timeframeMs(input.timeframeMinutes));

  return Math.max(1, Math.min(MAX_METAAPI_CANDLES_PER_REQUEST, estimatedCandles + 2));
}

function safeProviderBaseUrlValue(rawValue: string, errorCode: string) {
  const raw = safeString(rawValue);

  try {
    const url = new URL(raw);

    if (url.protocol !== "https:") {
      throw new Error("base url must use https");
    }

    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";

    return url;
  } catch {
    throw new AdminApiError(
      503,
      errorCode,
      "Real Forex/CFD historical candle provider configuration is invalid."
    );
  }
}

function safeProviderBaseUrl(value: string | undefined) {
  return safeProviderBaseUrlValue(
    safeString(process.env.PRACTICE_FOREX_CFD_HISTORY_BASE_URL) || safeString(value) || DEFAULT_METAAPI_MARKET_DATA_BASE_URL,
    "practice_forex_cfd_history_provider_invalid"
  );
}

function safeTerminalBaseUrl(value: string | undefined) {
  return safeProviderBaseUrlValue(
    safeString(process.env.PRACTICE_FOREX_CFD_TERMINAL_BASE_URL) || safeString(value) || DEFAULT_METAAPI_TERMINAL_BASE_URL,
    "practice_forex_cfd_terminal_provider_invalid"
  );
}

function timeoutMs() {
  const raw = Number(process.env.PRACTICE_FOREX_CFD_HISTORY_HTTP_TIMEOUT_MS);

  if (!Number.isFinite(raw)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.max(5000, Math.min(60000, Math.floor(raw)));
}

async function readSafeProviderError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return undefined;
  }

  try {
    const payload = await response.json() as unknown;

    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return undefined;
    }

    const record = payload as Record<string, unknown>;
    const code = safeString(record.code || record.stringCode || record.error || record.name).slice(0, 80);
    const message = safeString(record.message || record.details).slice(0, 160);

    return code || message ? { code, message } : undefined;
  } catch {
    return undefined;
  }
}

function finiteNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function decimalPlaces(value: number) {
  const text = value.toFixed(8).replace(/0+$/, "");
  const decimal = text.split(".")[1];

  return Math.max(0, Math.min(decimal?.length ?? 0, 8));
}

async function fetchMetaApiJson(url: URL, authToken: string, failureCode: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "auth-token": authToken },
      signal: controller.signal
    });
  } catch {
    throw new AdminApiError(502, failureCode, "Forex/CFD instrument discovery failed safely.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AdminApiError(502, failureCode, "Forex/CFD instrument discovery returned a safe failure.");
  }

  try {
    return await response.json() as unknown;
  } catch {
    throw new AdminApiError(502, failureCode, "Forex/CFD instrument discovery returned an unsupported response.");
  }
}

function normalizeMetaApiInstrumentSpec(
  payload: unknown,
  canonicalSymbol: string,
  providerSymbol: string
): PracticeInstrumentSpecSummary {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new AdminApiError(502, "metaapi_utility_spec_invalid", "Forex/CFD instrument specification is unavailable.");
  }

  const record = payload as Record<string, unknown>;
  const responseSymbol = safeForexCfdProviderSymbol(record.symbol);
  const fallback = getPracticeInstrumentSpec("forex_cfd", canonicalSymbol);
  const digits = Math.floor(finiteNumber(record.digits) ?? fallback?.pricePrecision ?? 2);
  const tickSize = finiteNumber(record.tickSize) ?? 10 ** -digits;
  const minVolume = finiteNumber(record.minVolume);
  const maxVolume = finiteNumber(record.maxVolume);
  const volumeStep = finiteNumber(record.volumeStep);
  const contractSize = finiteNumber(record.contractSize);

  if (
    !fallback ||
    !responseSymbol ||
    responseSymbol !== providerSymbol ||
    !forexCfdProviderSymbolMatchesCanonical(responseSymbol, canonicalSymbol) ||
    digits < 0 || digits > 8 ||
    !tickSize || tickSize <= 0 || tickSize > 1_000_000 ||
    !minVolume || minVolume <= 0 ||
    !maxVolume || maxVolume < minVolume || maxVolume > 1_000_000 ||
    !volumeStep || volumeStep <= 0 || volumeStep > maxVolume ||
    !contractSize || contractSize <= 0 || contractSize > 1_000_000_000
  ) {
    throw new AdminApiError(502, "metaapi_utility_spec_invalid", "Forex/CFD instrument specification is unavailable.");
  }

  const isForex = fallback.category === "forex_major" || fallback.category === "forex_cross";

  return {
    ...fallback,
    pricePrecision: digits,
    quantityPrecision: decimalPlaces(volumeStep),
    quantityStep: volumeStep,
    pipSize: isForex ? (canonicalSymbol.endsWith("JPY") ? 0.01 : 0.0001) : tickSize,
    pipLabel: isForex ? "pip" : "tick",
    contractMultiplier: contractSize,
    minSimulatedSize: minVolume,
    maxSimulatedSize: Math.min(maxVolume, 1_000_000),
    maxSimulatedNotional: Math.min(fallback.maxSimulatedNotional, 10_000_000),
    safeMessage: "Verified platform instrument specification for simulated practice. Broker identifiers remain private."
  };
}

function chooseProviderSymbol(providerSymbols: string[], canonicalSymbol: string) {
  const candidates = providerSymbols.filter((symbol) =>
    forexCfdProviderSymbolMatchesCanonical(symbol, canonicalSymbol)
  );

  return candidates.find((symbol) => symbol === canonicalSymbol) ??
    candidates.sort((left, right) => left.length - right.length || left.localeCompare(right))[0];
}

export async function discoverMetaApiUtilityForexCfdInstruments(
  options?: { forceRefresh?: boolean }
): Promise<VerifiedMetaApiForexCfdInstrument[]> {
  if (!options?.forceRefresh && discoveryCache && discoveryCache.expiresAt > Date.now()) {
    return discoveryCache.instruments;
  }

  const credentials = await loadMetaApiUtilityHistorySecret();
  const terminalBaseUrl = safeTerminalBaseUrl(credentials.terminalBaseUrl);
  terminalBaseUrl.pathname = ["users", "current", "accounts", encodeURIComponent(credentials.accountId), "symbols"].join("/");
  const symbolsPayload = await fetchMetaApiJson(
    terminalBaseUrl,
    credentials.authToken,
    "metaapi_utility_symbols_fetch_failed"
  );

  if (!Array.isArray(symbolsPayload)) {
    throw new AdminApiError(502, "metaapi_utility_symbols_invalid", "Forex/CFD instrument discovery returned an unsupported response.");
  }

  const providerSymbols = [...new Set(symbolsPayload
    .slice(0, 2_000)
    .map(safeForexCfdProviderSymbol)
    .filter(Boolean))];
  const matched = FOREX_CFD_APPROVED_INSTRUMENTS
    .map((approved) => ({ approved, providerSymbol: chooseProviderSymbol(providerSymbols, approved.symbol) }))
    .filter((entry): entry is typeof entry & { providerSymbol: string } => Boolean(entry.providerSymbol));
  const instruments: VerifiedMetaApiForexCfdInstrument[] = [];

  for (let index = 0; index < matched.length; index += 4) {
    const batch = matched.slice(index, index + 4);
    const results = await Promise.all(batch.map(async ({ approved, providerSymbol }) => {
      const specificationUrl = safeTerminalBaseUrl(credentials.terminalBaseUrl);
      specificationUrl.pathname = [
        "users", "current", "accounts", encodeURIComponent(credentials.accountId),
        "symbols", encodeURIComponent(providerSymbol), "specification"
      ].join("/");

      try {
        const payload = await fetchMetaApiJson(
          specificationUrl,
          credentials.authToken,
          "metaapi_utility_spec_fetch_failed"
        );

        return {
          canonicalSymbol: approved.symbol,
          providerSymbol,
          instrument: normalizeMetaApiInstrumentSpec(payload, approved.symbol, providerSymbol)
        } satisfies VerifiedMetaApiForexCfdInstrument;
      } catch {
        return undefined;
      }
    }));

    instruments.push(...results.filter((entry): entry is VerifiedMetaApiForexCfdInstrument => Boolean(entry)));
  }

  discoveryCache = {
    expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS,
    instruments
  };

  return instruments;
}

export async function getMetaApiUtilityForexCfdInstrument(canonicalSymbol: string) {
  return (await discoverMetaApiUtilityForexCfdInstruments())
    .find((entry) => entry.canonicalSymbol === canonicalSymbol);
}

function normalizeMetaApiCandle(
  entry: unknown,
  input: HistoricalCandleRequest,
  providerSymbol: string,
  expectedTimeframe: string
): NormalizedCandle {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    throw new AdminApiError(502, "metaapi_utility_candle_shape_invalid", "Forex/CFD provider returned an unsupported candle shape.");
  }

  const record = entry as Record<string, unknown>;
  const symbol = safeForexCfdProviderSymbol(record.symbol);
  const timeframe = safeString(record.timeframe);
  const openMs = Date.parse(safeString(record.time));
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  const volume = finiteNumber(record.volume) ?? finiteNumber(record.tickVolume) ?? 0;

  if (
    !symbol ||
    !forexCfdProviderSymbolMatchesCanonical(symbol, input.symbol) ||
    symbol !== providerSymbol ||
    timeframe !== expectedTimeframe ||
    !Number.isFinite(openMs) ||
    open === undefined ||
    high === undefined ||
    low === undefined ||
    close === undefined ||
    !Number.isFinite(volume) ||
    high < low
  ) {
    throw new AdminApiError(502, "metaapi_utility_candle_invalid", "Forex/CFD provider candles could not be normalized safely.");
  }

  return {
    openTime: new Date(openMs).toISOString(),
    closeTime: new Date(openMs + timeframeMs(input.timeframeMinutes) - 1).toISOString(),
    open,
    high,
    low,
    close,
    volume,
    provider: "metaapi_mt5",
    assetClass: "forex_cfd",
    symbol: input.symbol,
    providerSymbol,
    timeframeMinutes: input.timeframeMinutes
  };
}

export async function fetchMetaApiUtilityForexCfdCandles(
  input: HistoricalCandleRequest,
  providerSymbol: string
): Promise<NormalizedCandle[]> {
  const credentials = await loadMetaApiUtilityHistorySecret();
  const baseUrl = safeProviderBaseUrl(credentials.baseUrl);
  const timeframe = metaApiTimeframe(input.timeframeMinutes);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());

  baseUrl.pathname = [
    "users",
    "current",
    "accounts",
    encodeURIComponent(credentials.accountId),
    "historical-market-data",
    "symbols",
    encodeURIComponent(providerSymbol),
    "timeframes",
    encodeURIComponent(timeframe),
    "candles"
  ].join("/");
  baseUrl.searchParams.set("startTime", input.rangeEnd);
  baseUrl.searchParams.set("limit", String(candleLimit(input)));

  let response: Response;

  try {
    response = await fetch(baseUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "auth-token": credentials.authToken
      },
      signal: controller.signal
    });
  } catch {
    clearTimeout(timeout);
    throw new AdminApiError(
      502,
      "metaapi_utility_history_fetch_failed",
      "Forex/CFD historical candle provider request failed safely."
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const providerError = await readSafeProviderError(response);

    throw new AdminApiError(
      502,
      "metaapi_utility_history_fetch_failed",
      providerError?.code
        ? `Forex/CFD historical candle provider returned a safe failure code: ${providerError.code}.`
        : "Forex/CFD historical candle provider returned a safe failure."
    );
  }

  let payload: unknown;

  try {
    payload = await response.json() as unknown;
  } catch {
    throw new AdminApiError(502, "metaapi_utility_history_response_invalid", "Forex/CFD provider returned an unsupported candle response.");
  }

  if (!Array.isArray(payload)) {
    throw new AdminApiError(502, "metaapi_utility_history_response_invalid", "Forex/CFD provider returned an unsupported candle response.");
  }

  const startMs = Date.parse(input.rangeStart);
  const endMs = Date.parse(input.rangeEnd);
  const candles = payload
    .map((entry) => normalizeMetaApiCandle(entry, input, providerSymbol, timeframe))
    .filter((candle) => {
      const openMs = Date.parse(candle.openTime);

      return openMs >= startMs && openMs <= endMs;
    })
    .sort((left, right) => Date.parse(left.openTime) - Date.parse(right.openTime))
    .slice(0, MAX_METAAPI_CANDLES_PER_REQUEST);

  if (candles.length === 0) {
    throw new AdminApiError(
      502,
      "metaapi_utility_history_empty",
      "Forex/CFD provider returned no normalized candles for that bounded range."
    );
  }

  return candles;
}
