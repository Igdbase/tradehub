/**
 * binance-client.js
 * ------------------------------------------------------------------
 * Handles linking a student's Binance API key and executing Auto-Copy
 * trades against it. Matches the flow in doc 02 (§ Crypto account
 * linking) and the execution safeguards in doc 02/03 v2.4:
 *
 *   1. Student pastes a Trade-Only API key + secret.
 *   2. checkBinancePermissions() confirms withdrawals are actually
 *      disabled before we accept the key — never trust the label.
 *   3. The key/secret are envelope-encrypted (KMS) and stored — see
 *      doc 03 / doc 06 Step 6. That part is NOT in this file; this
 *      file only talks to Binance, it doesn't touch storage.
 *   4. placeBinanceOrder() is called from inside the Cloud Tasks
 *      execution worker, AFTER the signal has already passed the
 *      sanity-bounds and kill-switch checks from doc 02 — this file
 *      has no opinion on whether a trade *should* happen, only on
 *      how to place it once that decision is made.
 *
 * Requires: Node 18+ (native fetch + crypto). No npm install needed.
 * ------------------------------------------------------------------
 */

const crypto = require("crypto");

const BINANCE_BASE = "https://api.binance.com";

/**
 * Binance requires every signed request's query string to be
 * percent-encoded before the HMAC signature is computed — this
 * became a hard requirement on 2026-01-15. Build the query string
 * with this helper, not with a plain template literal, or older
 * signing code will silently produce invalid signatures.
 */
function buildSignedQuery(params, apiSecret) {
    const withTimestamp = { ...params, timestamp: Date.now(), recvWindow: 5000 };
    const query = new URLSearchParams(withTimestamp).toString(); // URLSearchParams percent-encodes for us
    const signature = crypto.createHmac("sha256", apiSecret).update(query).digest("hex");
    return `${query}&signature=${signature}`;
}

async function binanceRequest(method, path, apiKey, apiSecret, params = {}) {
    const query = buildSignedQuery(params, apiSecret);
    const url = `${BINANCE_BASE}${path}?${query}`;
    const res = await fetch(url, {
        method,
        headers: { "X-MBX-APIKEY": apiKey },
    });
    const body = await res.json();
    if (!res.ok) {
        const err = new Error(body.msg || `Binance API error (HTTP ${res.status})`);
        err.code = body.code;
        err.status = res.status;
        throw err;
    }
    return body;
}

/**
 * Call this ONCE, at link time, before the key is ever stored.
 * Rejects any key that has withdrawal permission enabled — per the
 * v2.4 security review, we don't trust the "Trade-Only" label the
 * student thinks they set; we verify it against Binance directly.
 *
 * Returns { ok: true } or { ok: false, reason: string }.
 */
async function checkBinancePermissions(apiKey, apiSecret) {
    const result = await binanceRequest(
        "GET",
        "/sapi/v1/account/apiRestrictions",
        apiKey,
        apiSecret
    );

    if (result.enableWithdrawals) {
        return {
            ok: false,
            reason:
                "This API key has withdrawal permission enabled. Create a new key with " +
                "'Enable Withdrawals' left OFF, and only 'Enable Spot & Margin Trading' on.",
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
 * @param {object} order - { symbol, side, type, quantity, price? }
 *   symbol:   e.g. "BTCUSDT"
 *   side:     "BUY" | "SELL"
 *   type:     "MARKET" | "LIMIT"
 *   quantity: string | number
 *   price:    required if type === "LIMIT"
 */
async function placeBinanceOrder(apiKey, apiSecret, order) {
    const params = {
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
    };
    if (order.type === "LIMIT") {
        params.price = order.price;
        params.timeInForce = "GTC";
    }
    return binanceRequest("POST", "/api/v3/order", apiKey, apiSecret, params);
}

module.exports = { checkBinancePermissions, placeBinanceOrder };
