import "server-only";

import crypto from "crypto";
import type {
  ForexDemoOrderInput,
  ForexDemoOrderPlacementAdapter,
  ForexDemoOrderResult,
  ForexDemoOrderStatusInput,
  ForexLiveCanaryOrderInput,
  ForexLiveCanaryOrderPlacementAdapter,
  ForexLiveCanaryOrderResult,
  ForexConnectionVerificationAdapter,
  ForexConnectionVerificationInput,
  ForexConnectionVerificationResult
} from "@/lib/crypto-execution/forex/types";

type ForexOrderSubmissionInput = ForexDemoOrderInput | ForexLiveCanaryOrderInput;

const DEFAULT_METAAPI_PROVISIONING_BASE_URL = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const DEFAULT_METAAPI_CLIENT_BASE_URL = "https://mt-client-api-v1.new-york.agiliumtrade.agiliumtrade.ai";
const REQUEST_TIMEOUT_MS = 8_000;
const SAFE_PROVIDER_ERROR_MAX_LENGTH = 140;
const SUCCESSFUL_TRADE_RETCODES = new Set([
  "TRADE_RETCODE_DONE",
  "TRADE_RETCODE_PLACED",
  "TRADE_RETCODE_DONE_PARTIAL"
]);
const NUMERIC_TRADE_RETCODES: Record<string, string> = {
  "10008": "TRADE_RETCODE_PLACED",
  "10009": "TRADE_RETCODE_DONE",
  "10010": "TRADE_RETCODE_DONE_PARTIAL",
  "10018": "TRADE_RETCODE_MARKET_CLOSED"
};

function fingerprint(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function mockModeEnabled() {
  return process.env.FOREX_EXECUTION_MOCK_METAAPI === "true" && process.env.NODE_ENV !== "production";
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizePlatform(value: unknown): "mt4" | "mt5" | "unknown" {
  if (value === 4 || value === "4" || value === "mt4") {
    return "mt4";
  }

  if (value === 5 || value === "5" || value === "mt5") {
    return "mt5";
  }

  return "unknown";
}

function normalizeMetaApiEnvironment(input: ForexConnectionVerificationInput, record: Record<string, unknown>) {
  const server = safeString(record.server)?.toLowerCase() ?? "";
  const name = safeString(record.name)?.toLowerCase() ?? "";

  if (server.includes("demo") || name.includes("demo")) {
    return "demo" as const;
  }

  return input.environment;
}

function baseUrl() {
  return (
    process.env.FOREX_METAAPI_PROVISIONING_BASE_URL?.trim() ||
    DEFAULT_METAAPI_PROVISIONING_BASE_URL
  ).replace(/\/+$/g, "");
}

function clientBaseUrl() {
  return (
    process.env.FOREX_METAAPI_CLIENT_BASE_URL?.trim() ||
    DEFAULT_METAAPI_CLIENT_BASE_URL
  ).replace(/\/+$/g, "");
}

function maskRef(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.length <= 12 ? value : `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }

  if (typeof value === "object" && value !== null) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        cleaned[key] = stripUndefined(entry);
      }
    }

    return cleaned as T;
  }

  return value;
}

function safeProviderErrorText(value: unknown, maxLength = SAFE_PROVIDER_ERROR_MAX_LENGTH) {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const normalized = String(value)
    .replace(/bearer\s+[^\s,;]+/gi, "bearer [redacted]")
    .replace(/auth-token\s*[:=]\s*[^\s,;]+/gi, "auth-token [redacted]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .replace(/[^\w .,:;()/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return normalized || undefined;
}

function safePositiveNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function safeProviderErrorFromPayload(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return {};
  }

  const record = payload as Record<string, unknown>;
  const rawCode =
    record.stringCode ??
    record.errorCode ??
    record.code ??
    record.name ??
    record.numericCode;
  const rawMessage =
    record.message ??
    record.error ??
    record.details ??
    record.description ??
    record.reason;

  return {
    sanitizedProviderErrorCode: safeProviderErrorText(rawCode, 48),
    sanitizedProviderErrorMessage: safeProviderErrorText(rawMessage)
  };
}

function canonicalForexSymbol(value: unknown) {
  const canonical = safeProviderErrorText(value, 16)?.toUpperCase().replace(/[^A-Z]/g, "") ?? "";

  return /^[A-Z]{6}$/.test(canonical) ? canonical : undefined;
}

function safeProviderSymbol(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const normalized = String(value)
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "")
    .slice(0, 32);

  return normalized || undefined;
}

function providerSymbolMatchesCanonical(providerSymbol: string, canonicalSymbol: string) {
  if (providerSymbol === canonicalSymbol) {
    return true;
  }

  if (!providerSymbol.toUpperCase().startsWith(canonicalSymbol)) {
    return false;
  }

  const suffix = providerSymbol.slice(canonicalSymbol.length);

  return suffix.length > 0 && suffix.length <= 12 && /^[A-Za-z0-9._-]+$/.test(suffix);
}

function extractTradableSymbols(payload: unknown): string[] {
  let source: unknown[] = [];

  if (Array.isArray(payload)) {
    source = payload;
  } else if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.symbols)) {
      source = record.symbols;
    } else if (Array.isArray(record.result)) {
      source = record.result;
    }
  }

  const symbols = source
    .map((entry) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return safeProviderSymbol(entry);
      }

      if (typeof entry === "object" && entry !== null) {
        const record = entry as Record<string, unknown>;

        return safeProviderSymbol(record.symbol ?? record.name ?? record.id);
      }

      return undefined;
    })
    .filter((entry): entry is string => Boolean(entry));

  return [...new Set(symbols)];
}

function providerErrorCodeFromPayload(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.stringCode,
    record.errorCode,
    record.code,
    record.id,
    record.orderId,
    record.numericCode
  ].map((entry) => safeProviderErrorText(entry, 64));

  return candidates.find((entry) => entry && /^ERR[_A-Z0-9-]+$/i.test(entry));
}

function tradeRetcodeFromPayload(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.stringCode,
    record.retcode,
    record.returnCode,
    record.code,
    record.id,
    record.orderId,
    record.numericCode
  ];

  for (const candidate of candidates) {
    const value = safeProviderErrorText(candidate, 64)?.toUpperCase();

    if (!value) {
      continue;
    }

    if (NUMERIC_TRADE_RETCODES[value]) {
      return NUMERIC_TRADE_RETCODES[value];
    }

    if (/^TRADE_RETCODE[_A-Z0-9-]+$/.test(value)) {
      return value;
    }
  }

  return undefined;
}

function successfulTradeRetcode(value: string) {
  return SUCCESSFUL_TRADE_RETCODES.has(value.toUpperCase());
}

function payloadHasSuccessfulOrderStatus(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return false;
  }

  const status = normalizeOrderStatus((payload as Record<string, unknown>).status);

  return status === "submitted" || status === "filled" || status === "partially_filled";
}

function safeProviderExecutionStatus(payload: unknown): ForexDemoOrderResult["status"] | undefined {
  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const status = normalizeOrderStatus((payload as Record<string, unknown>).status);

    if (status === "submitted" || status === "filled" || status === "partially_filled") {
      return status;
    }
  }

  const tradeRetcode = tradeRetcodeFromPayload(payload);

  if (!tradeRetcode || !successfulTradeRetcode(tradeRetcode)) {
    return undefined;
  }

  if (tradeRetcode === "TRADE_RETCODE_DONE") {
    return "filled";
  }

  if (tradeRetcode === "TRADE_RETCODE_DONE_PARTIAL") {
    return "partially_filled";
  }

  return "submitted";
}

function safeProviderExecutionErrorFromPayload(payload: unknown) {
  const errorCode = providerErrorCodeFromPayload(payload);
  const tradeRetcode = tradeRetcodeFromPayload(payload);
  const providerError = safeProviderErrorFromPayload(payload);

  if (errorCode) {
    return {
      ...providerError,
      sanitizedProviderErrorCode: errorCode
    };
  }

  if (tradeRetcode && !successfulTradeRetcode(tradeRetcode)) {
    return {
      ...providerError,
      sanitizedProviderErrorCode: tradeRetcode
    };
  }

  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const status = normalizeOrderStatus((payload as Record<string, unknown>).status);

    if (status === "rejected") {
      return providerError;
    }
  }

  return null;
}

function safeProviderExecutionAccepted(payload: unknown) {
  const tradeRetcode = tradeRetcodeFromPayload(payload);

  if (tradeRetcode) {
    return successfulTradeRetcode(tradeRetcode);
  }

  return payloadHasSuccessfulOrderStatus(payload);
}

async function safeProviderErrorFromResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("json")) {
    return {};
  }

  const payload = await response.json().catch(() => null) as unknown;

  return safeProviderErrorFromPayload(payload);
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function failed(
  input: ForexConnectionVerificationInput,
  safeMessage: string,
  code: string,
  reason?: string
): ForexConnectionVerificationResult {
  return {
    ok: false,
    provider: input.provider,
    environment: input.environment,
    status: "error",
    readinessStatus: "verification_failed",
    safeMessage,
    sanitizedFailureCode: code,
    sanitizedFailureReason: reason
  };
}

function orderFailed(
  input: { provider: ForexDemoOrderInput["provider"]; environment: ForexDemoOrderResult["environment"] },
  safeMessage: string,
  code: string,
  reason?: string,
  diagnostics?: {
    providerHttpStatus?: number;
    canonicalSymbol?: string;
    providerSymbol?: string;
    sanitizedProviderErrorCode?: string;
    sanitizedProviderErrorMessage?: string;
  }
): ForexDemoOrderResult {
  return {
    ok: false,
    provider: input.provider,
    environment: input.environment,
    status: "rejected",
    safeMessage,
    sanitizedFailureCode: code,
    sanitizedFailureReason: reason,
    providerHttpStatus: diagnostics?.providerHttpStatus,
    canonicalSymbol: diagnostics?.canonicalSymbol,
    providerSymbol: diagnostics?.providerSymbol,
    sanitizedProviderErrorCode: diagnostics?.sanitizedProviderErrorCode,
    sanitizedProviderErrorMessage: diagnostics?.sanitizedProviderErrorMessage
  };
}

function normalizeOrderStatus(value: unknown): ForexDemoOrderResult["status"] {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";

  if (normalized.includes("fill")) {
    return normalized.includes("partial") ? "partially_filled" : "filled";
  }

  if (normalized.includes("cancel")) {
    return "cancelled";
  }

  if (normalized.includes("reject") || normalized.includes("fail")) {
    return "rejected";
  }

  if (normalized.includes("submit") || normalized.includes("accept") || normalized.includes("place")) {
    return "submitted";
  }

  return "unknown";
}

function providerOrderIdFrom(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const raw = record.orderId ?? record.stringCode ?? record.numericCode ?? record.id;

  return typeof raw === "string" || typeof raw === "number" ? String(raw) : undefined;
}

async function postTrade(input: ForexOrderSubmissionInput, body: Record<string, unknown>) {
  return fetchWithTimeout(
    `${clientBaseUrl()}/users/current/accounts/${encodeURIComponent(input.metaApiAccountId)}/trade`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "auth-token": input.metaApiToken
      },
      body: JSON.stringify(body)
    }
  );
}

async function getAccountSymbols(input: ForexOrderSubmissionInput) {
  return fetchWithTimeout(
    `${clientBaseUrl()}/users/current/accounts/${encodeURIComponent(input.metaApiAccountId)}/symbols`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "auth-token": input.metaApiToken
      }
    }
  );
}

async function getCurrentPrice(input: ForexOrderSubmissionInput, providerSymbol: string) {
  return fetchWithTimeout(
    `${clientBaseUrl()}/users/current/accounts/${encodeURIComponent(input.metaApiAccountId)}/symbols/${encodeURIComponent(providerSymbol)}/current-price`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "auth-token": input.metaApiToken
      }
    }
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstPositiveRecordNumber(records: Array<Record<string, unknown> | null>, keys: string[]) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const value = safePositiveNumber(record[key]);

      if (value) {
        return value;
      }
    }
  }

  return undefined;
}

function extractProviderQuote(payload: unknown) {
  const record = asRecord(payload);
  const nested = [
    record,
    asRecord(record?.quote),
    asRecord(record?.tick),
    asRecord(record?.currentTick),
    asRecord(record?.price)
  ];

  return {
    bid: firstPositiveRecordNumber(nested, ["bid", "Bid", "currentBid"]),
    ask: firstPositiveRecordNumber(nested, ["ask", "Ask", "currentAsk"])
  };
}

async function validateStopLossTakeProfitAgainstQuote(
  input: ForexOrderSubmissionInput,
  canonicalSymbol: string,
  providerSymbol: string,
  failureCode = "forex_demo_invalid_sl_tp"
) {
  if (!safePositiveNumber(input.stopLoss) || !safePositiveNumber(input.takeProfit)) {
    return {
      ok: false as const,
      result: orderFailed(
        input,
        "Forex demo order requires safe stop-loss and take-profit levels before provider submission.",
        failureCode,
        "Stop-loss and take-profit were missing or invalid before MetaAPI demo submission.",
        {
          canonicalSymbol,
          providerSymbol,
          sanitizedProviderErrorCode: failureCode
        }
      )
    };
  }

  try {
    const response = await getCurrentPrice(input, providerSymbol);

    if (!response.ok) {
      const providerError = await safeProviderErrorFromResponse(response);

      return {
        ok: false as const,
        result: orderFailed(
          input,
          "MetaAPI demo quote was unavailable before order submission.",
          "forex_provider_quote_unavailable",
          `MetaAPI current price returned HTTP ${response.status}.`,
          {
            providerHttpStatus: response.status,
            canonicalSymbol,
            providerSymbol,
            ...providerError
          }
        )
      };
    }

    const payload = await response.json().catch(() => null) as unknown;
    const quote = extractProviderQuote(payload);
    const referencePrice = input.side === "buy"
      ? quote.ask ?? quote.bid
      : quote.bid ?? quote.ask;

    if (!referencePrice) {
      return {
        ok: false as const,
        result: orderFailed(
          input,
          "MetaAPI demo quote was unavailable before order submission.",
          "forex_provider_quote_unavailable",
          "MetaAPI current price response did not include a safe bid or ask.",
          {
            providerHttpStatus: response.status,
            canonicalSymbol,
            providerSymbol,
            sanitizedProviderErrorCode: "provider_quote_missing"
          }
        )
      };
    }

    const stopLoss = safePositiveNumber(input.stopLoss) ?? 0;
    const takeProfit = safePositiveNumber(input.takeProfit) ?? 0;
    const levelsAreValid = input.side === "buy"
      ? stopLoss < referencePrice && takeProfit > referencePrice
      : stopLoss > referencePrice && takeProfit < referencePrice;

    if (!levelsAreValid) {
      return {
        ok: false as const,
        result: orderFailed(
          input,
          "Forex demo stop-loss and take-profit failed the current provider quote check.",
          failureCode,
          "Stop-loss and take-profit were not valid against the current MetaAPI demo quote.",
          {
            providerHttpStatus: response.status,
            canonicalSymbol,
            providerSymbol,
            sanitizedProviderErrorCode: failureCode
          }
        )
      };
    }

    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      result: orderFailed(
        input,
        "TradeHub could not reach MetaAPI for a demo quote before order submission.",
        "forex_provider_quote_unavailable",
        "MetaAPI current price lookup was unavailable before demo order submission.",
        {
          canonicalSymbol,
          providerSymbol
        }
      )
    };
  }
}

async function resolveMetaApiDemoProviderSymbol(input: ForexOrderSubmissionInput) {
  const canonicalSymbol = canonicalForexSymbol(input.symbol);

  if (!canonicalSymbol) {
    return {
      ok: false as const,
      result: orderFailed(
        input,
        "TradeHub forex pair is not valid for MetaAPI demo submission.",
        "forex_provider_symbol_unavailable",
        "TradeHub canonical forex pair could not be normalized safely."
      )
    };
  }

  try {
    const response = await getAccountSymbols(input);

    if (!response.ok) {
      const providerError = await safeProviderErrorFromResponse(response);

      return {
        ok: false as const,
        result: orderFailed(
          input,
          "MetaAPI tradable symbol list was unavailable for this demo account.",
          "forex_provider_symbol_unavailable",
          `MetaAPI symbols returned HTTP ${response.status}.`,
          {
            providerHttpStatus: response.status,
            canonicalSymbol,
            ...providerError
          }
        )
      };
    }

    const payload = await response.json().catch(() => null) as unknown;
    const providerSymbol = extractTradableSymbols(payload)
      .find((entry) => providerSymbolMatchesCanonical(entry, canonicalSymbol));

    if (!providerSymbol) {
      return {
        ok: false as const,
        result: orderFailed(
          input,
          "No tradable broker symbol matched the TradeHub canonical forex pair.",
          "forex_provider_symbol_unavailable",
          `No MetaAPI tradable symbol matched ${canonicalSymbol}.`,
          {
            canonicalSymbol,
            sanitizedProviderErrorCode: "provider_symbol_not_found",
            sanitizedProviderErrorMessage: `No tradable broker symbol matched ${canonicalSymbol}.`
          }
        )
      };
    }

    return {
      ok: true as const,
      canonicalSymbol,
      providerSymbol
    };
  } catch {
    return {
      ok: false as const,
      result: orderFailed(
        input,
        "TradeHub could not reach MetaAPI to resolve a demo broker symbol.",
        "forex_provider_symbol_unavailable",
        "MetaAPI symbol lookup was unavailable before demo order submission.",
        { canonicalSymbol }
      )
    };
  }
}

function metaApiDemoMarketOrderPayload(input: ForexOrderSubmissionInput, providerSymbol: string) {
  return stripUndefined({
    actionType: input.side === "buy" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL",
    symbol: providerSymbol,
    volume: input.volume,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit
  });
}

async function submitMetaApiDemoOrder(input: ForexDemoOrderInput): Promise<ForexDemoOrderResult> {
  if (input.provider !== "metaapi") {
    return orderFailed(input, "Only MetaAPI forex demo order proof is supported.", "forex_provider_unsupported");
  }

  if (input.environment !== "demo") {
    return orderFailed(input, "Forex demo order proof rejects non-demo MetaAPI environments.", "forex_demo_environment_required");
  }

  try {
    const symbolResolution = await resolveMetaApiDemoProviderSymbol(input);

    if (!symbolResolution.ok) {
      return symbolResolution.result;
    }

    const quoteValidation = await validateStopLossTakeProfitAgainstQuote(
      input,
      symbolResolution.canonicalSymbol,
      symbolResolution.providerSymbol
    );

    if (!quoteValidation.ok) {
      return quoteValidation.result;
    }

    const response = await postTrade(input, metaApiDemoMarketOrderPayload(input, symbolResolution.providerSymbol));

    if (!response.ok) {
      const providerError = await safeProviderErrorFromResponse(response);
      const providerHint = providerError.sanitizedProviderErrorCode || providerError.sanitizedProviderErrorMessage
        ? ` Provider error: ${[
            providerError.sanitizedProviderErrorCode,
            providerError.sanitizedProviderErrorMessage
          ].filter(Boolean).join(" - ")}.`
        : "";
      return orderFailed(
        input,
        response.status === 401
          ? "MetaAPI rejected the demo token before order submission."
          : "MetaAPI demo order submission failed safely.",
        response.status === 401 ? "metaapi_demo_auth_failed" : "metaapi_demo_submit_failed",
        `MetaAPI returned HTTP ${response.status}.${providerHint}`,
        {
          providerHttpStatus: response.status,
          canonicalSymbol: symbolResolution.canonicalSymbol,
          providerSymbol: symbolResolution.providerSymbol,
          ...providerError
        }
      );
    }

    const payload = await response.json().catch(() => null) as unknown;
    const providerExecutionError = safeProviderExecutionErrorFromPayload(payload);

    if (providerExecutionError) {
      return orderFailed(
        input,
        "MetaAPI demo order submission failed safely.",
        "metaapi_demo_submit_failed",
        "MetaAPI returned an order error code in a successful HTTP response.",
        {
          providerHttpStatus: response.status,
          canonicalSymbol: symbolResolution.canonicalSymbol,
          providerSymbol: symbolResolution.providerSymbol,
          ...providerExecutionError
        }
      );
    }

    const providerExecutionStatus = safeProviderExecutionStatus(payload);

    if (!safeProviderExecutionAccepted(payload) || !providerExecutionStatus) {
      const providerError = safeProviderErrorFromPayload(payload);

      return orderFailed(
        input,
        "MetaAPI demo order submission returned an unrecognized success state.",
        "metaapi_demo_submit_failed",
        "MetaAPI returned HTTP 2xx without a recognized successful trade retcode or order status.",
        {
          providerHttpStatus: response.status,
          canonicalSymbol: symbolResolution.canonicalSymbol,
          providerSymbol: symbolResolution.providerSymbol,
          sanitizedProviderErrorCode: providerError.sanitizedProviderErrorCode ?? "metaapi_demo_unknown_success_state",
          sanitizedProviderErrorMessage: providerError.sanitizedProviderErrorMessage
        }
      );
    }

    const providerOrderId = providerOrderIdFrom(payload);

    return {
      ok: true,
      provider: "metaapi",
      environment: "demo",
      status: providerExecutionStatus,
      providerOrderId,
      providerOrderRef: maskRef(providerOrderId ?? input.clientOrderId),
      canonicalSymbol: symbolResolution.canonicalSymbol,
      providerSymbol: symbolResolution.providerSymbol,
      safeMessage: "MetaAPI demo order was submitted through the server-side demo adapter."
    };
  } catch {
    return orderFailed(
      input,
      "TradeHub could not reach MetaAPI for demo order submission.",
      "metaapi_demo_unavailable"
    );
  }
}

async function submitMetaApiLiveCanaryOrder(input: ForexLiveCanaryOrderInput): Promise<ForexLiveCanaryOrderResult> {
  if (input.provider !== "metaapi") {
    return orderFailed(input, "Only MetaAPI forex live canary order proof is supported.", "forex_provider_unsupported") as ForexLiveCanaryOrderResult;
  }

  if (input.environment !== "production" || input.liveCanary !== true) {
    return orderFailed(input, "Forex live canary rejects demo or non-canary MetaAPI environments.", "forex_live_canary_environment_required") as ForexLiveCanaryOrderResult;
  }

  try {
    const symbolResolution = await resolveMetaApiDemoProviderSymbol(input);

    if (!symbolResolution.ok) {
      return symbolResolution.result as ForexLiveCanaryOrderResult;
    }

    const quoteValidation = await validateStopLossTakeProfitAgainstQuote(
      input,
      symbolResolution.canonicalSymbol,
      symbolResolution.providerSymbol,
      "forex_live_canary_invalid_sl_tp"
    );

    if (!quoteValidation.ok) {
      return quoteValidation.result as ForexLiveCanaryOrderResult;
    }

    const response = await postTrade(input, metaApiDemoMarketOrderPayload(input, symbolResolution.providerSymbol));

    if (!response.ok) {
      const providerError = await safeProviderErrorFromResponse(response);
      const providerHint = providerError.sanitizedProviderErrorCode || providerError.sanitizedProviderErrorMessage
        ? ` Provider error: ${[
            providerError.sanitizedProviderErrorCode,
            providerError.sanitizedProviderErrorMessage
          ].filter(Boolean).join(" - ")}.`
        : "";

      return orderFailed(
        input,
        response.status === 401
          ? "MetaAPI rejected the live canary token before order submission."
          : "MetaAPI live canary order submission failed safely.",
        response.status === 401 ? "metaapi_live_canary_auth_failed" : "metaapi_live_canary_submit_failed",
        `MetaAPI returned HTTP ${response.status}.${providerHint}`,
        {
          providerHttpStatus: response.status,
          canonicalSymbol: symbolResolution.canonicalSymbol,
          providerSymbol: symbolResolution.providerSymbol,
          ...providerError
        }
      ) as ForexLiveCanaryOrderResult;
    }

    const payload = await response.json().catch(() => null) as unknown;
    const providerExecutionError = safeProviderExecutionErrorFromPayload(payload);

    if (providerExecutionError) {
      return orderFailed(
        input,
        "MetaAPI live canary order submission failed safely.",
        "metaapi_live_canary_submit_failed",
        "MetaAPI returned an order error code in a successful HTTP response.",
        {
          providerHttpStatus: response.status,
          canonicalSymbol: symbolResolution.canonicalSymbol,
          providerSymbol: symbolResolution.providerSymbol,
          ...providerExecutionError
        }
      ) as ForexLiveCanaryOrderResult;
    }

    const providerExecutionStatus = safeProviderExecutionStatus(payload);

    if (!safeProviderExecutionAccepted(payload) || !providerExecutionStatus) {
      const providerError = safeProviderErrorFromPayload(payload);

      return orderFailed(
        input,
        "MetaAPI live canary order submission returned an unrecognized success state.",
        "metaapi_live_canary_submit_failed",
        "MetaAPI returned HTTP 2xx without a recognized successful trade retcode or order status.",
        {
          providerHttpStatus: response.status,
          canonicalSymbol: symbolResolution.canonicalSymbol,
          providerSymbol: symbolResolution.providerSymbol,
          sanitizedProviderErrorCode: providerError.sanitizedProviderErrorCode ?? "metaapi_live_canary_unknown_success_state",
          sanitizedProviderErrorMessage: providerError.sanitizedProviderErrorMessage
        }
      ) as ForexLiveCanaryOrderResult;
    }

    const providerOrderId = providerOrderIdFrom(payload);

    return {
      ok: true,
      provider: "metaapi",
      environment: "production",
      status: providerExecutionStatus,
      providerOrderId,
      providerOrderRef: maskRef(providerOrderId ?? input.clientOrderId),
      canonicalSymbol: symbolResolution.canonicalSymbol,
      providerSymbol: symbolResolution.providerSymbol,
      safeMessage: "MetaAPI tiny live Forex canary order was submitted through the server-side canary adapter."
    };
  } catch {
    return orderFailed(
      input,
      "TradeHub could not reach MetaAPI for live canary order submission.",
      "metaapi_live_canary_unavailable"
    ) as ForexLiveCanaryOrderResult;
  }
}

async function lookupMetaApiDemoOrder(input: ForexDemoOrderStatusInput): Promise<ForexDemoOrderResult> {
  if (input.environment !== "demo") {
    return orderFailed(input, "Forex demo reconciliation rejects non-demo MetaAPI environments.", "forex_demo_environment_required");
  }

  return {
    ok: false,
    provider: input.provider,
    environment: "demo",
    status: "unknown",
    providerOrderId: input.providerOrderId,
    providerOrderRef: maskRef(input.providerOrderId ?? input.clientOrderId),
    safeMessage: "MetaAPI demo order status lookup is not enabled in automated QA; reconciliation remains bounded and support-safe.",
    sanitizedFailureCode: "metaapi_demo_status_lookup_deferred"
  };
}

async function cancelMetaApiDemoOrder(input: ForexDemoOrderStatusInput): Promise<ForexDemoOrderResult> {
  if (input.environment !== "demo") {
    return orderFailed(input, "Forex demo cancellation rejects non-demo MetaAPI environments.", "forex_demo_environment_required");
  }

  if (!input.providerOrderId) {
    return orderFailed(input, "Forex demo cancellation requires a stored provider order reference.", "metaapi_demo_order_ref_missing");
  }

  try {
    const response = await postTrade(
      {
        ...input,
        symbol: "",
        side: "buy",
        volume: 0
      },
      {
        actionType: "ORDER_CANCEL",
        orderId: input.providerOrderId
      }
    );

    if (!response.ok) {
      const providerError = await safeProviderErrorFromResponse(response);
      const providerHint = providerError.sanitizedProviderErrorCode || providerError.sanitizedProviderErrorMessage
        ? ` Provider error: ${[
            providerError.sanitizedProviderErrorCode,
            providerError.sanitizedProviderErrorMessage
          ].filter(Boolean).join(" - ")}.`
        : "";
      return orderFailed(
        input,
        "MetaAPI demo cancellation failed safely.",
        "metaapi_demo_cancel_failed",
        `MetaAPI returned HTTP ${response.status}.${providerHint}`,
        {
          providerHttpStatus: response.status,
          ...providerError
        }
      );
    }

    return {
      ok: true,
      provider: input.provider,
      environment: "demo",
      status: "cancelled",
      providerOrderId: input.providerOrderId,
      providerOrderRef: maskRef(input.providerOrderId),
      safeMessage: "MetaAPI demo order cancellation was submitted through the server-side demo adapter."
    };
  } catch {
    return orderFailed(
      input,
      "TradeHub could not reach MetaAPI for demo cancellation.",
      "metaapi_demo_unavailable"
    );
  }
}

export const verifyMetaApiConnection: ForexConnectionVerificationAdapter = async (input) => {
  if (input.provider !== "metaapi") {
    return failed(input, "Only MetaAPI forex connections are supported in this foundation stage.", "provider_unsupported");
  }

  if (mockModeEnabled()) {
    const accepted = input.metaApiToken.startsWith("mock_metaapi_") ||
      input.metaApiAccountId.startsWith("metaapi_mock_");

    if (!accepted) {
      return failed(
        input,
        "The mock MetaAPI verifier rejected this test token.",
        "mock_metaapi_rejected"
      );
    }

    return {
      ok: true,
      provider: "metaapi",
      environment: input.environment === "unknown" ? "demo" : input.environment,
      status: "verified",
      readinessStatus: "paper_only_ready",
      providerAccountFingerprint: fingerprint(input.metaApiAccountId),
      brokerName: "MetaAPI mock broker",
      platform: "mt5",
      serverName: input.environment === "production" ? "Mock-Live" : "Mock-Demo",
      baseCurrency: "USD",
      providerState: "DEPLOYED",
      providerConnectionStatus: "CONNECTED",
      safeMessage: "MetaAPI connection metadata verified in explicit mock mode. Forex remains paper-only."
    };
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl()}/users/current/accounts/${encodeURIComponent(input.metaApiAccountId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "auth-token": input.metaApiToken
        }
      }
    );

    if (!response.ok) {
      const code = response.status === 401
        ? "metaapi_auth_failed"
        : response.status === 404
          ? "metaapi_account_not_found"
          : "metaapi_verification_failed";

      return failed(
        input,
        response.status === 401
          ? "MetaAPI rejected this token. Check that the token can read the selected account."
          : response.status === 404
            ? "MetaAPI could not find that account for this token."
            : "TradeHub could not verify this MetaAPI account metadata.",
        code
      );
    }

    const payload = await response.json() as unknown;

    if (typeof payload !== "object" || payload === null) {
      return failed(input, "MetaAPI returned an unreadable account metadata response.", "metaapi_response_invalid");
    }

    const record = payload as Record<string, unknown>;
    const environment = normalizeMetaApiEnvironment(input, record);

    return {
      ok: true,
      provider: "metaapi",
      environment,
      status: "verified",
      readinessStatus: "paper_only_ready",
      providerAccountFingerprint: fingerprint(input.metaApiAccountId),
      brokerName: safeString(record.broker) || undefined,
      platform: normalizePlatform(record.version ?? record.platform),
      serverName: safeString(record.server) || undefined,
      baseCurrency: safeString(record.baseCurrency) || undefined,
      providerState: safeString(record.state) || undefined,
      providerConnectionStatus: safeString(record.connectionStatus) || undefined,
      safeMessage: "MetaAPI account metadata verified. Forex remains paper-only; no broker trade endpoint was called."
    };
  } catch {
    return failed(
      input,
      "TradeHub could not reach MetaAPI for metadata verification.",
      "metaapi_unavailable"
    );
  }
};

export const metaApiDemoOrderAdapter: ForexDemoOrderPlacementAdapter = {
  submitOrder: submitMetaApiDemoOrder,
  lookupOrder: lookupMetaApiDemoOrder,
  cancelOrder: cancelMetaApiDemoOrder
};

export const metaApiLiveCanaryOrderAdapter: ForexLiveCanaryOrderPlacementAdapter = {
  submitOrder: submitMetaApiLiveCanaryOrder
};
