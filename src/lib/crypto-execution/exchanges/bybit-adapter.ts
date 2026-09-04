import crypto from "crypto";
import type {
  ExchangeBalancePrecheckInput,
  ExchangeBalancePrecheckResult,
  ExchangePermissionCheckInput,
  ExchangePermissionCheckResult,
  ExchangeOrderLookupInput,
  ExchangeOrderLookupResult,
  ExchangeOrderPlacementInput,
  ExchangeOrderPlacementResult
} from "@/lib/crypto-execution/exchanges/types";

const BYBIT_BASE_BY_ENV = {
  production: "https://api.bybit.com",
  sandbox: "https://api-testnet.bybit.com"
} as const;

const RECV_WINDOW = "5000";
const REQUEST_TIMEOUT_MS = 10_000;

function keyFingerprint(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

function safeFailure(
  input: ExchangePermissionCheckInput,
  code: string,
  message: string
): ExchangePermissionCheckResult {
  return {
    ok: false,
    exchange: "bybit",
    permissionVerification: "failed",
    withdrawalPermission: "unknown",
    keyFingerprint: keyFingerprint(input.apiKey),
    safeMessage: message,
    sanitizedFailureCode: code,
    sanitizedFailureReason: message
  };
}

function sign(apiSecret: string, timestamp: string, apiKey: string, payload: string) {
  return crypto
    .createHmac("sha256", apiSecret)
    .update(`${timestamp}${apiKey}${RECV_WINDOW}${payload}`)
    .digest("hex");
}

async function fetchJsonWithTimeout(url: string, headers: HeadersInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal
    });
    const body = await response.json().catch(() => null) as unknown;

    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function postJsonWithTimeout(url: string, headers: HeadersInit, body: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal
    });
    const responseBody = await response.json().catch(() => null) as unknown;

    return { response, body: responseBody };
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getBybitServerTimestamp(environment: ExchangePermissionCheckInput["environment"]) {
  try {
    const { body } = await fetchJsonWithTimeout(
      `${BYBIT_BASE_BY_ENV[environment]}/v5/market/time`,
      { "Content-Type": "application/json" }
    );

    if (isRecord(body) && typeof body.time === "number") {
      return String(body.time);
    }

    const result = isRecord(body) ? body.result : null;

    if (isRecord(result) && typeof result.timeNano === "string" && result.timeNano.length > 6) {
      return result.timeNano.slice(0, -6);
    }

    if (isRecord(result) && typeof result.timeSecond === "string") {
      return `${result.timeSecond}000`;
    }
  } catch {
    // Fall back to local time; Bybit will reject safely if the clock is outside the allowed window.
  }

  return Date.now().toString();
}

function safeOrderFailure(
  input: ExchangeOrderPlacementInput | ExchangeOrderLookupInput,
  code: string,
  message: string
): ExchangeOrderPlacementResult {
  return {
    ok: false,
    exchange: "bybit",
    safeMessage: message,
    exchangeClientOrderId: input.clientOrderId,
    sanitizedFailureCode: code,
    sanitizedFailureReason: message
  };
}

function quoteAssetForSymbol(symbol: string, explicit?: string) {
  if (explicit?.trim()) {
    return explicit.trim().toUpperCase();
  }

  const normalized = symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const candidates = ["USDT", "USDC", "USD"];
  return candidates.find((asset) => normalized.endsWith(asset)) ?? "USDT";
}

function safeBalanceFailure(
  input: ExchangeBalancePrecheckInput,
  status: ExchangeBalancePrecheckResult["status"],
  code: string,
  message: string
): ExchangeBalancePrecheckResult {
  return {
    ok: false,
    exchange: "bybit",
    environment: input.environment,
    status,
    checkedAsset: quoteAssetForSymbol(input.symbol, input.quoteAsset),
    safeMessage: message,
    sanitizedFailureCode: code,
    sanitizedFailureReason: message,
    checkedAt: new Date().toISOString()
  };
}

function bybitOrderFailureMessage(retCode: number) {
  switch (retCode) {
    case 170131:
      return "Bybit testnet rejected the order because the account balance is insufficient. Add testnet USDT to Unified Trading, then publish a fresh signal.";
    default:
      return "Bybit rejected the order request. TradeHub recorded a sanitized failure.";
  }
}

function flattenPermissionValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenPermissionValues);
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, entry]) => [
      key,
      ...flattenPermissionValues(entry)
    ]);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  return [];
}

export async function checkBybitBalance(
  input: ExchangeBalancePrecheckInput
): Promise<ExchangeBalancePrecheckResult> {
  if (!input.apiKey || !input.apiSecret) {
    return safeBalanceFailure(
      input,
      "credential_missing",
      "bybit_balance_credential_missing",
      "TradeHub could not load a Bybit credential for the balance precheck."
    );
  }

  if (input.environment !== "sandbox" && !input.productionCanary) {
    return safeBalanceFailure(
      input,
      "not_supported_yet",
      "bybit_balance_production_requires_canary",
      "Bybit production balance precheck is available only inside the explicit TradeHub canary worker."
    );
  }

  const required = Number(input.requiredQuoteAmount);
  const checkedAsset = quoteAssetForSymbol(input.symbol, input.quoteAsset);

  if (!Number.isFinite(required) || required <= 0) {
    return safeBalanceFailure(
      input,
      "unavailable",
      "bybit_balance_required_amount_invalid",
      "TradeHub could not determine the tiny quote amount needed for the production balance precheck."
    );
  }

  const query = new URLSearchParams({
    accountType: "UNIFIED",
    coin: checkedAsset
  }).toString();
  const timestamp = await getBybitServerTimestamp(input.environment);
  const signature = sign(input.apiSecret, timestamp, input.apiKey, query);

  try {
    const { response, body } = await fetchJsonWithTimeout(
      `${BYBIT_BASE_BY_ENV[input.environment]}/v5/account/wallet-balance?${query}`,
      {
        "X-BAPI-API-KEY": input.apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": RECV_WINDOW,
        "X-BAPI-SIGN": signature,
        "Content-Type": "application/json"
      }
    );

    if (!response.ok || !isRecord(body) || body.retCode !== 0 || !isRecord(body.result)) {
      return safeBalanceFailure(
        input,
        "exchange_rejected",
        isRecord(body) && typeof body.retCode === "number"
          ? `bybit_balance_ret_${body.retCode}`
          : `bybit_balance_http_${response.status}`,
        "Bybit rejected the balance precheck. TradeHub blocked the canary before order submission."
      );
    }

    const accounts = Array.isArray(body.result.list) ? body.result.list : [];
    const account = accounts.find((entry) => isRecord(entry) && Array.isArray(entry.coin));
    const coins = isRecord(account) && Array.isArray(account.coin) ? account.coin : [];
    const coin = coins.find((entry) =>
      isRecord(entry) &&
      typeof entry.coin === "string" &&
      entry.coin.toUpperCase() === checkedAsset
    );

    if (!isRecord(coin)) {
      return safeBalanceFailure(
        input,
        "unavailable",
        "bybit_balance_asset_unavailable",
        "Bybit did not return a clear quote balance. TradeHub blocked the canary before order submission."
      );
    }

    const walletBalance = typeof coin.walletBalance === "string" ? Number(coin.walletBalance) : NaN;
    const locked = typeof coin.locked === "string" ? Number(coin.locked) : 0;
    const available = Number.isFinite(walletBalance) && Number.isFinite(locked)
      ? walletBalance - locked
      : NaN;

    if (!Number.isFinite(available)) {
      return safeBalanceFailure(
        input,
        "unavailable",
        "bybit_balance_amount_unparseable",
        "Bybit returned an unparseable quote balance. TradeHub blocked the canary before order submission."
      );
    }

    if (available < required) {
      return safeBalanceFailure(
        input,
        "insufficient",
        "bybit_balance_insufficient",
        "Bybit quote balance is below the tiny canary notional. TradeHub blocked the canary before order submission."
      );
    }

    return {
      ok: true,
      exchange: "bybit",
      environment: input.environment,
      status: "sufficient",
      checkedAsset,
      safeMessage: "Bybit balance precheck confirmed enough quote balance for the tiny canary notional.",
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return safeBalanceFailure(
      input,
      error instanceof Error && error.name === "AbortError" ? "unavailable" : "exchange_rejected",
      error instanceof Error && error.name === "AbortError"
        ? "bybit_balance_timeout"
        : "bybit_balance_request_failed",
      "TradeHub could not complete the Bybit balance precheck. The canary was blocked before order submission."
    );
  }
}

export async function checkBybitPermissions(
  input: ExchangePermissionCheckInput
): Promise<ExchangePermissionCheckResult> {
  const timestamp = await getBybitServerTimestamp(input.environment);
  const payload = "";
  const signature = sign(input.apiSecret, timestamp, input.apiKey, payload);
  const url = `${BYBIT_BASE_BY_ENV[input.environment]}/v5/user/query-api`;

  try {
    const { response, body } = await fetchJsonWithTimeout(url, {
      "X-BAPI-API-KEY": input.apiKey,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": RECV_WINDOW,
      "X-BAPI-SIGN": signature,
      "Content-Type": "application/json"
    });

    if (!response.ok || !isRecord(body) || body.retCode !== 0) {
      return safeFailure(
        input,
        isRecord(body) && typeof body.retCode === "number"
          ? `bybit_ret_${body.retCode}`
          : `bybit_http_${response.status}`,
        "Bybit rejected the API key or permission request. Check the key, secret, IP restrictions, and trading permissions."
      );
    }

    const result = body.result;

    if (!isRecord(result) || !isRecord(result.permissions)) {
      return safeFailure(
        input,
        "bybit_permission_shape_unknown",
        "Bybit did not return a clear permission set, so TradeHub rejected the key."
      );
    }

    const permissionValues = flattenPermissionValues(result.permissions);
    const spotPermissions = isRecord(result.permissions) && Array.isArray(result.permissions.Spot)
      ? result.permissions.Spot
      : [];
    const hasSpotTradePermission = spotPermissions.some((permission) => permission === "SpotTrade");
    const isReadWrite = result.readOnly === 0;

    if (permissionValues.length === 0) {
      return safeFailure(
        input,
        "bybit_permission_empty",
        "Bybit returned an empty permission set, so TradeHub rejected the key."
      );
    }

    const hasWithdrawalPermission = permissionValues.some((permission) =>
      permission.toLowerCase().includes("withdraw")
    );

    if (hasWithdrawalPermission) {
      return {
        ok: false,
        exchange: "bybit",
        permissionVerification: "failed",
        withdrawalPermission: "detected_enabled",
        keyFingerprint: keyFingerprint(input.apiKey),
        safeMessage: "This Bybit key has withdrawal-related permission enabled. Create a new trade-only key with no withdrawal access.",
        sanitizedFailureCode: "bybit_withdrawals_enabled",
        sanitizedFailureReason: "Withdrawal-related permission is enabled."
      };
    }

    if (!isReadWrite || !hasSpotTradePermission) {
      return safeFailure(
        input,
        "bybit_spot_trade_permission_missing",
        "Bybit testnet key must be read-write with SpotTrade enabled before TradeHub can run sandbox/testnet order QA."
      );
    }

    return {
      ok: true,
      exchange: "bybit",
      permissionVerification: "passed",
      withdrawalPermission: "confirmed_disabled",
      keyFingerprint: keyFingerprint(input.apiKey),
      safeMessage: "Bybit permission check passed with no withdrawal-related permission detected."
    };
  } catch (error) {
    return safeFailure(
      input,
      error instanceof Error && error.name === "AbortError"
        ? "bybit_permission_timeout"
        : "bybit_permission_request_failed",
      "TradeHub could not complete Bybit permission verification safely. Try again after checking the key and exchange restrictions."
    );
  }
}

export async function placeBybitOrder(
  input: ExchangeOrderPlacementInput
): Promise<ExchangeOrderPlacementResult> {
  if (input.environment !== "sandbox" && !input.productionCanary) {
    return safeOrderFailure(
      input,
      "bybit_production_rejected_without_canary",
      "Bybit production orders require the explicit TradeHub production canary worker."
    );
  }

  if (!input.quantity && !(input.orderType === "market" && input.side === "buy" && input.quoteOrderQty)) {
    return safeOrderFailure(
      input,
      "bybit_order_missing_quantity",
      "Bybit spot orders require quantity, or quote notional for market buys, before live execution can run."
    );
  }

  if (input.orderType === "limit" && !input.price) {
    return safeOrderFailure(
      input,
      "bybit_limit_order_missing_price",
      "Bybit limit orders require price before live execution can run."
    );
  }

  const timestamp = await getBybitServerTimestamp(input.environment);
  const orderBody = {
    category: "spot",
    symbol: input.symbol,
    side: input.side === "buy" ? "Buy" : "Sell",
    orderType: input.orderType === "market" ? "Market" : "Limit",
    qty: input.quantity ?? input.quoteOrderQty,
    price: input.orderType === "limit" ? input.price : undefined,
    marketUnit: input.orderType === "market" && input.side === "buy" && input.quoteOrderQty && !input.quantity
      ? "quoteCoin"
      : undefined,
    timeInForce: input.orderType === "limit" ? "GTC" : undefined,
    orderLinkId: input.clientOrderId
  };
  const body = JSON.stringify(
    Object.fromEntries(Object.entries(orderBody).filter(([, value]) => value !== undefined))
  );
  const signature = sign(input.apiSecret, timestamp, input.apiKey, body);

  try {
    const { response, body: responseBody } = await postJsonWithTimeout(
      `${BYBIT_BASE_BY_ENV[input.environment]}/v5/order/create`,
      {
        "X-BAPI-API-KEY": input.apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": RECV_WINDOW,
        "X-BAPI-SIGN": signature,
        "Content-Type": "application/json"
      },
      body
    );

    if (!response.ok || !isRecord(responseBody) || responseBody.retCode !== 0) {
      const retCode = isRecord(responseBody) && typeof responseBody.retCode === "number"
        ? responseBody.retCode
        : null;

      return safeOrderFailure(
        input,
        retCode !== null
          ? `bybit_order_ret_${retCode}`
          : `bybit_order_http_${response.status}`,
        retCode !== null
          ? bybitOrderFailureMessage(retCode)
          : "Bybit rejected the order request. TradeHub recorded a sanitized failure."
      );
    }

    const result = isRecord(responseBody.result) ? responseBody.result : {};

    return {
      ok: true,
      exchange: "bybit",
      exchangeOrderId: typeof result.orderId === "string" ? result.orderId : undefined,
      exchangeClientOrderId: typeof result.orderLinkId === "string"
        ? result.orderLinkId
        : input.clientOrderId,
      status: "accepted",
      safeMessage: "Bybit accepted the order request."
    };
  } catch (error) {
    return safeOrderFailure(
      input,
      error instanceof Error && error.name === "AbortError"
        ? "bybit_order_timeout"
        : "bybit_order_request_failed",
      "TradeHub could not complete the Bybit order request safely."
    );
  }
}

function normalizeBybitOrderStatus(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

export async function getBybitOrderStatus(
  input: ExchangeOrderLookupInput
): Promise<ExchangeOrderLookupResult> {
  if (input.environment !== "sandbox" && !input.productionCanary) {
    return safeOrderFailure(
      input,
      "bybit_production_status_rejected_without_canary",
      "Bybit production order status requires the explicit TradeHub production canary worker."
    );
  }

  const query = new URLSearchParams({
    category: "spot",
    symbol: input.symbol,
    orderLinkId: input.clientOrderId
  }).toString();
  const timestamp = await getBybitServerTimestamp(input.environment);
  const signature = sign(input.apiSecret, timestamp, input.apiKey, query);

  try {
    const { response, body } = await fetchJsonWithTimeout(
      `${BYBIT_BASE_BY_ENV[input.environment]}/v5/order/realtime?${query}`,
      {
        "X-BAPI-API-KEY": input.apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": RECV_WINDOW,
        "X-BAPI-SIGN": signature,
        "Content-Type": "application/json"
      }
    );

    if (!response.ok || !isRecord(body) || body.retCode !== 0 || !isRecord(body.result)) {
      return safeOrderFailure(
        input,
        isRecord(body) && typeof body.retCode === "number"
          ? `bybit_order_status_ret_${body.retCode}`
          : `bybit_order_status_http_${response.status}`,
        "Bybit did not return a clear sandbox/testnet order status."
      );
    }

    const list = Array.isArray(body.result.list) ? body.result.list : [];
    const order = list.find((entry) => isRecord(entry) && entry.orderLinkId === input.clientOrderId);

    if (!isRecord(order)) {
      return safeOrderFailure(
        input,
        "bybit_order_status_not_found",
        "Bybit testnet did not return the requested order link ID."
      );
    }

    return {
      ok: true,
      exchange: "bybit",
      exchangeOrderId: typeof order.orderId === "string" ? order.orderId : input.exchangeOrderId,
      exchangeClientOrderId: typeof order.orderLinkId === "string" ? order.orderLinkId : input.clientOrderId,
      status: normalizeBybitOrderStatus(order.orderStatus),
      cumulativeFilledQuantity: typeof order.cumExecQty === "string" ? order.cumExecQty : undefined,
      cumulativeFilledValue: typeof order.cumExecValue === "string" ? order.cumExecValue : undefined,
      safeMessage: "Bybit sandbox/testnet order status was reconciled."
    };
  } catch (error) {
    return safeOrderFailure(
      input,
      error instanceof Error && error.name === "AbortError"
        ? "bybit_order_status_timeout"
        : "bybit_order_status_request_failed",
      "TradeHub could not complete the Bybit sandbox/testnet order status request safely."
    );
  }
}

export async function cancelBybitOrder(
  input: ExchangeOrderLookupInput
): Promise<ExchangeOrderLookupResult> {
  if (input.environment !== "sandbox" && !input.productionCanary) {
    return safeOrderFailure(
      input,
      "bybit_production_cancel_rejected_without_canary",
      "Bybit production order cancel requires the explicit TradeHub production canary worker."
    );
  }

  const timestamp = await getBybitServerTimestamp(input.environment);
  const body = JSON.stringify({
    category: "spot",
    symbol: input.symbol,
    orderLinkId: input.clientOrderId
  });
  const signature = sign(input.apiSecret, timestamp, input.apiKey, body);

  try {
    const { response, body: responseBody } = await postJsonWithTimeout(
      `${BYBIT_BASE_BY_ENV[input.environment]}/v5/order/cancel`,
      {
        "X-BAPI-API-KEY": input.apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": RECV_WINDOW,
        "X-BAPI-SIGN": signature,
        "Content-Type": "application/json"
      },
      body
    );

    if (!response.ok || !isRecord(responseBody) || responseBody.retCode !== 0) {
      return safeOrderFailure(
        input,
        isRecord(responseBody) && typeof responseBody.retCode === "number"
          ? `bybit_order_cancel_ret_${responseBody.retCode}`
          : `bybit_order_cancel_http_${response.status}`,
        "Bybit did not return a clear sandbox/testnet cancellation status."
      );
    }

    const result = isRecord(responseBody.result) ? responseBody.result : {};

    return {
      ok: true,
      exchange: "bybit",
      exchangeOrderId: typeof result.orderId === "string" ? result.orderId : input.exchangeOrderId,
      exchangeClientOrderId: typeof result.orderLinkId === "string" ? result.orderLinkId : input.clientOrderId,
      status: "cancel_requested",
      safeMessage: "Bybit sandbox/testnet order cancel request was accepted."
    };
  } catch (error) {
    return safeOrderFailure(
      input,
      error instanceof Error && error.name === "AbortError"
        ? "bybit_order_cancel_timeout"
        : "bybit_order_cancel_request_failed",
      "TradeHub could not complete the Bybit sandbox/testnet cancel request safely."
    );
  }
}
