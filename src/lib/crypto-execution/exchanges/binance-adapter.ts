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

const BINANCE_BASE_BY_ENV = {
  production: "https://api.binance.com",
  sandbox: "https://testnet.binance.vision"
} as const;

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
    exchange: "binance",
    permissionVerification: "failed",
    withdrawalPermission: "unknown",
    keyFingerprint: keyFingerprint(input.apiKey),
    safeMessage: message,
    sanitizedFailureCode: code,
    sanitizedFailureReason: message
  };
}

async function fetchJsonWithTimeout(url: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-MBX-APIKEY": apiKey
      },
      signal: controller.signal
    });
    const body = await response.json().catch(() => null) as unknown;

    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPublicJsonWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });
    const body = await response.json().catch(() => null) as unknown;

    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function postJsonWithTimeout(url: string, apiKey: string, body: URLSearchParams) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-MBX-APIKEY": apiKey
      },
      body,
      signal: controller.signal
    });
    const responseBody = await response.json().catch(() => null) as unknown;

    return { response, body: responseBody };
  } finally {
    clearTimeout(timeout);
  }
}

function signParams(params: URLSearchParams, apiSecret: string) {
  const query = params.toString();
  const signature = crypto.createHmac("sha256", apiSecret).update(query).digest("hex");

  params.set("signature", signature);
  return params;
}

async function getBinanceServerTimestamp(baseUrl: string) {
  try {
    const { response, body } = await fetchPublicJsonWithTimeout(`${baseUrl}/api/v3/time`);

    if (response.ok && isRecord(body) && typeof body.serverTime === "number" && Number.isFinite(body.serverTime)) {
      return body.serverTime.toString();
    }
  } catch {
    // Fall back to local time. The signed request will fail safely if the clock is too far out of sync.
  }

  return Date.now().toString();
}

async function signedQuery(apiSecret: string, baseUrl: string) {
  const timestamp = await getBinanceServerTimestamp(baseUrl);
  const params = signParams(new URLSearchParams({
    recvWindow: "5000",
    timestamp
  }), apiSecret);

  return params.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeOrderFailure(
  input: ExchangeOrderPlacementInput | ExchangeOrderLookupInput,
  code: string,
  message: string
): ExchangeOrderPlacementResult {
  return {
    ok: false,
    exchange: "binance",
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
  const candidates = ["USDT", "USDC", "FDUSD", "BUSD", "USD"];
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
    exchange: "binance",
    environment: input.environment,
    status,
    checkedAsset: quoteAssetForSymbol(input.symbol, input.quoteAsset),
    safeMessage: message,
    sanitizedFailureCode: code,
    sanitizedFailureReason: message,
    checkedAt: new Date().toISOString()
  };
}

function normalizeBinanceOrderStatus(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

export async function checkBinanceBalance(
  input: ExchangeBalancePrecheckInput
): Promise<ExchangeBalancePrecheckResult> {
  if (!input.apiKey || !input.apiSecret) {
    return safeBalanceFailure(
      input,
      "credential_missing",
      "binance_balance_credential_missing",
      "TradeHub could not load a Binance credential for the balance precheck."
    );
  }

  if (input.environment !== "sandbox" && !input.productionCanary) {
    return safeBalanceFailure(
      input,
      "not_supported_yet",
      "binance_balance_production_requires_canary",
      "Binance production balance precheck is available only inside the explicit TradeHub canary worker."
    );
  }

  const required = Number(input.requiredQuoteAmount);
  const checkedAsset = quoteAssetForSymbol(input.symbol, input.quoteAsset);

  if (!Number.isFinite(required) || required <= 0) {
    return safeBalanceFailure(
      input,
      "unavailable",
      "binance_balance_required_amount_invalid",
      "TradeHub could not determine the tiny quote amount needed for the production balance precheck."
    );
  }

  const baseUrl = BINANCE_BASE_BY_ENV[input.environment];
  const timestamp = await getBinanceServerTimestamp(baseUrl);
  const params = signParams(new URLSearchParams({
    omitZeroBalances: "false",
    recvWindow: "5000",
    timestamp
  }), input.apiSecret);

  try {
    const { response, body } = await fetchJsonWithTimeout(
      `${baseUrl}/api/v3/account?${params.toString()}`,
      input.apiKey
    );

    if (!response.ok || !isRecord(body)) {
      return safeBalanceFailure(
        input,
        "exchange_rejected",
        `binance_balance_http_${response.status}`,
        "Binance rejected the balance precheck. TradeHub blocked the canary before order submission."
      );
    }

    const balances = Array.isArray(body.balances) ? body.balances : [];
    const balance = balances.find((entry) =>
      isRecord(entry) &&
      typeof entry.asset === "string" &&
      entry.asset.toUpperCase() === checkedAsset
    );

    if (!isRecord(balance) || typeof balance.free !== "string") {
      return safeBalanceFailure(
        input,
        "unavailable",
        "binance_balance_asset_unavailable",
        "Binance did not return a clear available quote balance. TradeHub blocked the canary before order submission."
      );
    }

    const available = Number(balance.free);

    if (!Number.isFinite(available)) {
      return safeBalanceFailure(
        input,
        "unavailable",
        "binance_balance_amount_unparseable",
        "Binance returned an unparseable quote balance. TradeHub blocked the canary before order submission."
      );
    }

    if (available < required) {
      return safeBalanceFailure(
        input,
        "insufficient",
        "binance_balance_insufficient",
        "Binance quote balance is below the tiny canary notional. TradeHub blocked the canary before order submission."
      );
    }

    return {
      ok: true,
      exchange: "binance",
      environment: input.environment,
      status: "sufficient",
      checkedAsset,
      safeMessage: "Binance balance precheck confirmed enough quote balance for the tiny canary notional.",
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return safeBalanceFailure(
      input,
      error instanceof Error && error.name === "AbortError" ? "unavailable" : "exchange_rejected",
      error instanceof Error && error.name === "AbortError"
        ? "binance_balance_timeout"
        : "binance_balance_request_failed",
      "TradeHub could not complete the Binance balance precheck. The canary was blocked before order submission."
    );
  }
}

export async function checkBinancePermissions(
  input: ExchangePermissionCheckInput
): Promise<ExchangePermissionCheckResult> {
  const baseUrl = BINANCE_BASE_BY_ENV[input.environment];

  if (input.environment === "sandbox") {
    const url = `${baseUrl}/api/v3/account?${await signedQuery(input.apiSecret, baseUrl)}`;

    try {
      const { response, body } = await fetchJsonWithTimeout(url, input.apiKey);

      if (!response.ok) {
        return safeFailure(
          input,
          `binance_testnet_account_http_${response.status}`,
          "Binance Spot Testnet rejected the API key or secret. Check the key, secret, and selected testnet permissions."
        );
      }

      if (!isRecord(body)) {
        return safeFailure(
          input,
          "binance_testnet_account_shape_unknown",
          "Binance Spot Testnet did not return a clear account state, so TradeHub rejected the key."
        );
      }

      if (body.canTrade !== true) {
        return safeFailure(
          input,
          "binance_testnet_trade_permission_missing",
          "This Binance Spot Testnet key does not appear to have trade permission enabled."
        );
      }

      const permissions = Array.isArray(body.permissions) ? body.permissions.map(String) : [];

      if (permissions.length > 0 && !permissions.includes("SPOT")) {
        return safeFailure(
          input,
          "binance_testnet_spot_permission_missing",
          "This Binance Spot Testnet key did not return SPOT account permission."
        );
      }

      return {
        ok: true,
        exchange: "binance",
        permissionVerification: "passed",
        withdrawalPermission: "confirmed_disabled",
        keyFingerprint: keyFingerprint(input.apiKey),
        safeMessage: "Binance Spot Testnet permission check passed. Withdrawal capability is treated as unavailable for sandbox/testnet execution."
      };
    } catch (error) {
      return safeFailure(
        input,
        error instanceof Error && error.name === "AbortError"
          ? "binance_testnet_account_timeout"
          : "binance_testnet_account_request_failed",
        "TradeHub could not complete Binance Spot Testnet permission verification safely. Try again after checking the key and testnet permissions."
      );
    }
  }

  const url = `${baseUrl}/sapi/v1/account/apiRestrictions?${await signedQuery(input.apiSecret, baseUrl)}`;

  try {
    const { response, body } = await fetchJsonWithTimeout(url, input.apiKey);

    if (!response.ok) {
      return safeFailure(
        input,
        `binance_http_${response.status}`,
        "Binance rejected the API key or permission request. Check the key, secret, IP restrictions, and trading permissions."
      );
    }

    if (!isRecord(body) || typeof body.enableWithdrawals !== "boolean") {
      return safeFailure(
        input,
        "binance_permission_shape_unknown",
        "Binance did not return a clear withdrawal-permission state, so TradeHub rejected the key."
      );
    }

    if (body.enableWithdrawals) {
      return {
        ok: false,
        exchange: "binance",
        permissionVerification: "failed",
        withdrawalPermission: "detected_enabled",
        keyFingerprint: keyFingerprint(input.apiKey),
        safeMessage: "This Binance key has withdrawals enabled. Create a new trade-only key with withdrawals disabled.",
        sanitizedFailureCode: "binance_withdrawals_enabled",
        sanitizedFailureReason: "Withdrawal permission is enabled."
      };
    }

    return {
      ok: true,
      exchange: "binance",
      permissionVerification: "passed",
      withdrawalPermission: "confirmed_disabled",
      keyFingerprint: keyFingerprint(input.apiKey),
      safeMessage: "Binance permission check passed with withdrawals confirmed disabled."
    };
  } catch (error) {
    return safeFailure(
      input,
      error instanceof Error && error.name === "AbortError"
        ? "binance_permission_timeout"
        : "binance_permission_request_failed",
      "TradeHub could not complete Binance permission verification safely. Try again after checking the key and exchange restrictions."
    );
  }
}

export async function placeBinanceOrder(
  input: ExchangeOrderPlacementInput
): Promise<ExchangeOrderPlacementResult> {
  if (input.environment !== "sandbox" && !input.productionCanary) {
    return safeOrderFailure(
      input,
      "binance_production_rejected_without_canary",
      "Binance production orders require the explicit TradeHub production canary worker."
    );
  }

  const baseUrl = BINANCE_BASE_BY_ENV[input.environment];
  const timestamp = await getBinanceServerTimestamp(baseUrl);
  const params = new URLSearchParams({
    symbol: input.symbol,
    side: input.side.toUpperCase(),
    type: input.orderType.toUpperCase(),
    newClientOrderId: input.clientOrderId,
    newOrderRespType: "RESULT",
    recvWindow: "5000",
    timestamp
  });

  if (input.quantity) {
    params.set("quantity", input.quantity);
  }

  if (input.quoteOrderQty) {
    params.set("quoteOrderQty", input.quoteOrderQty);
  }

  if (input.orderType === "limit") {
    if (!input.price || !input.quantity) {
      return safeOrderFailure(
        input,
        "binance_limit_order_missing_price_or_quantity",
        "Binance limit orders require both quantity and price."
      );
    }

    params.set("price", input.price);
    params.set("timeInForce", "GTC");
  }

  if (input.orderType === "market" && !input.quantity && !input.quoteOrderQty) {
    return safeOrderFailure(
      input,
      "binance_market_order_missing_size",
      "Binance market orders require quantity or quote order quantity."
    );
  }

  try {
    const { response, body } = await postJsonWithTimeout(
      `${baseUrl}/api/v3/order`,
      input.apiKey,
      signParams(params, input.apiSecret)
    );

    if (!response.ok || !isRecord(body)) {
      return safeOrderFailure(
        input,
        `binance_order_http_${response.status}`,
        "Binance rejected the order request. TradeHub recorded a sanitized failure."
      );
    }

    return {
      ok: true,
      exchange: "binance",
      exchangeOrderId: typeof body.orderId === "number" || typeof body.orderId === "string"
        ? String(body.orderId)
        : undefined,
      exchangeClientOrderId: typeof body.clientOrderId === "string"
        ? body.clientOrderId
        : input.clientOrderId,
      status: normalizeBinanceOrderStatus(body.status),
      safeMessage: "Binance accepted the order request."
    };
  } catch (error) {
    return safeOrderFailure(
      input,
      error instanceof Error && error.name === "AbortError"
        ? "binance_order_timeout"
        : "binance_order_request_failed",
      "TradeHub could not complete the Binance order request safely."
    );
  }
}

export async function getBinanceOrderStatus(
  input: ExchangeOrderLookupInput
): Promise<ExchangeOrderLookupResult> {
  if (input.environment !== "sandbox" && !input.productionCanary) {
    return safeOrderFailure(
      input,
      "binance_production_status_rejected_without_canary",
      "Binance production order status requires the explicit TradeHub production canary worker."
    );
  }

  const baseUrl = BINANCE_BASE_BY_ENV[input.environment];
  const timestamp = await getBinanceServerTimestamp(baseUrl);
  const params = signParams(new URLSearchParams({
    symbol: input.symbol,
    origClientOrderId: input.clientOrderId,
    recvWindow: "5000",
    timestamp
  }), input.apiSecret);

  try {
    const { response, body } = await fetchJsonWithTimeout(
      `${baseUrl}/api/v3/order?${params.toString()}`,
      input.apiKey
    );

    if (!response.ok || !isRecord(body)) {
      return safeOrderFailure(
        input,
        `binance_order_status_http_${response.status}`,
        "Binance did not return a clear sandbox/testnet order status."
      );
    }

    return {
      ok: true,
      exchange: "binance",
      exchangeOrderId: typeof body.orderId === "number" || typeof body.orderId === "string"
        ? String(body.orderId)
        : input.exchangeOrderId,
      exchangeClientOrderId: typeof body.clientOrderId === "string"
        ? body.clientOrderId
        : input.clientOrderId,
      status: normalizeBinanceOrderStatus(body.status),
      cumulativeFilledQuantity: typeof body.executedQty === "string" ? body.executedQty : undefined,
      cumulativeFilledValue: typeof body.cummulativeQuoteQty === "string" ? body.cummulativeQuoteQty : undefined,
      safeMessage: "Binance sandbox/testnet order status was reconciled."
    };
  } catch (error) {
    return safeOrderFailure(
      input,
      error instanceof Error && error.name === "AbortError"
        ? "binance_order_status_timeout"
        : "binance_order_status_request_failed",
      "TradeHub could not complete the Binance sandbox/testnet order status request safely."
    );
  }
}

export async function cancelBinanceOrder(
  input: ExchangeOrderLookupInput
): Promise<ExchangeOrderLookupResult> {
  if (input.environment !== "sandbox" && !input.productionCanary) {
    return safeOrderFailure(
      input,
      "binance_production_cancel_rejected_without_canary",
      "Binance production order cancel requires the explicit TradeHub production canary worker."
    );
  }

  const baseUrl = BINANCE_BASE_BY_ENV[input.environment];
  const timestamp = await getBinanceServerTimestamp(baseUrl);
  const params = signParams(new URLSearchParams({
    symbol: input.symbol,
    origClientOrderId: input.clientOrderId,
    recvWindow: "5000",
    timestamp
  }), input.apiSecret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${baseUrl}/api/v3/order?${params.toString()}`,
      {
        method: "DELETE",
        headers: {
          "X-MBX-APIKEY": input.apiKey
        },
        signal: controller.signal
      }
    );
    const body = await response.json().catch(() => null) as unknown;

    if (!response.ok || !isRecord(body)) {
      return safeOrderFailure(
        input,
        `binance_order_cancel_http_${response.status}`,
        "Binance did not return a clear sandbox/testnet cancellation status."
      );
    }

    return {
      ok: true,
      exchange: "binance",
      exchangeOrderId: typeof body.orderId === "number" || typeof body.orderId === "string"
        ? String(body.orderId)
        : input.exchangeOrderId,
      exchangeClientOrderId: typeof body.clientOrderId === "string"
        ? body.clientOrderId
        : input.clientOrderId,
      status: normalizeBinanceOrderStatus(body.status) ?? "canceled",
      safeMessage: "Binance sandbox/testnet order cancel request was accepted."
    };
  } catch (error) {
    return safeOrderFailure(
      input,
      error instanceof Error && error.name === "AbortError"
        ? "binance_order_cancel_timeout"
        : "binance_order_cancel_request_failed",
      "TradeHub could not complete the Binance sandbox/testnet cancel request safely."
    );
  } finally {
    clearTimeout(timeout);
  }
}
