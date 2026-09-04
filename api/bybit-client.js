/**
 * bybit-client.js
 * ------------------------------------------------------------------
 * Same role as binance-client.js, for Bybit's unified V5 API (Spot,
 * Derivatives, and Options all go through one endpoint family now —
 * the old V3 split-by-product APIs are gone).
 *
 * A few Bybit-specific things worth knowing before wiring this in:
 *
 *   - As of 2026-02-10, fiat-related permissions and IP whitelist
 *     entries can ONLY be set at key creation, through the Bybit
 *     website — not modified via the API afterward. Your onboarding
 *     copy for students should say "create the key with withdrawals
 *     off from the start," not "you can fix this later."
 *   - The permission-check endpoint (query-api) returns a nested
 *     permissions object per category (Spot, ContractTrade, Wallet,
 *     etc). Bybit's exact field layout for wallet/withdrawal-related
 *     permissions has shifted between API versions before, so
 *     checkBybitPermissions() below does a defensive scan across
 *     every category's permission list rather than hardcoding one
 *     exact key path — re-verify against current Bybit docs
 *     (bybit-exchange.github.io/docs/v5/user/apikey-info) if this
 *     ever stops matching what you see in a real response.
 *
 * Requires: Node 18+ (native fetch + crypto). No npm install needed.
 * ------------------------------------------------------------------
 */

const crypto = require("crypto");

const BYBIT_BASE = "https://api.bybit.com";
const RECV_WINDOW = "5000";

function sign(apiSecret, timestamp, apiKey, payload) {
    const raw = `${timestamp}${apiKey}${RECV_WINDOW}${payload}`;
    return crypto.createHmac("sha256", apiSecret).update(raw).digest("hex");
}

async function bybitRequest(method, path, apiKey, apiSecret, params = {}) {
    const timestamp = Date.now().toString();
    const isGet = method === "GET";
    const payload = isGet
        ? new URLSearchParams(params).toString()
        : JSON.stringify(params);

    const signature = sign(apiSecret, timestamp, apiKey, payload);
    const url = isGet ? `${BYBIT_BASE}${path}?${payload}` : `${BYBIT_BASE}${path}`;

    const res = await fetch(url, {
        method,
        headers: {
            "X-BAPI-API-KEY": apiKey,
            "X-BAPI-TIMESTAMP": timestamp,
            "X-BAPI-RECV-WINDOW": RECV_WINDOW,
            "X-BAPI-SIGN": signature,
            "Content-Type": "application/json",
        },
        body: isGet ? undefined : payload,
    });

    const body = await res.json();
    if (body.retCode !== 0) {
        const err = new Error(body.retMsg || `Bybit API error (retCode ${body.retCode})`);
        err.retCode = body.retCode;
        throw err;
    }
    return body.result;
}

/**
 * Call this ONCE, at link time, before the key is ever stored.
 * Scans every permission category for anything withdrawal-related
 * and rejects the key if found. See the file header note above —
 * this is intentionally defensive rather than checking one exact
 * field, since Bybit's response shape has moved before.
 *
 * Returns { ok: true } or { ok: false, reason: string }.
 */
async function checkBybitPermissions(apiKey, apiSecret) {
    const result = await bybitRequest("GET", "/v5/user/query-api", apiKey, apiSecret);

    const permissionLists = Object.values(result.permissions || {});
    const flatPermissions = permissionLists.flat();
    const hasWithdrawal = flatPermissions.some((p) =>
        String(p).toLowerCase().includes("withdraw")
    );

    if (hasWithdrawal) {
        return {
            ok: false,
            reason:
                "This API key has withdrawal-related permission enabled. Bybit only lets you " +
                "set permissions at key creation (since Feb 2026) — create a new key with only " +
                "trading permissions and no withdrawal access.",
        };
    }
    return { ok: true, raw: result };
}

/**
 * Places a live order. Call only from the execution worker, only
 * after sanity-bounds + kill-switch checks (doc 02) have passed.
 *
 * @param {string} apiKey
 * @param {string} apiSecret
 * @param {object} order - { category, symbol, side, orderType, qty, price? }
 *   category:  "spot" | "linear" | "inverse" | "option"
 *   symbol:    e.g. "BTCUSDT"
 *   side:      "Buy" | "Sell"
 *   orderType: "Market" | "Limit"
 *   qty:       string
 *   price:     required if orderType === "Limit"
 */
async function placeBybitOrder(apiKey, apiSecret, order) {
    const body = {
        category: order.category,
        symbol: order.symbol,
        side: order.side,
        orderType: order.orderType,
        qty: order.qty,
    };
    if (order.orderType === "Limit") {
        body.price = order.price;
        body.timeInForce = "GTC";
    }
    return bybitRequest("POST", "/v5/order/create", apiKey, apiSecret, body);
}

module.exports = { checkBybitPermissions, placeBybitOrder };
