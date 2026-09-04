# Stage 15H Sandbox/Testnet Live Order Worker Completion Note

Stage 15H is complete as a sandbox/testnet-only lifecycle proof for TradeHub crypto Auto-Copy.

This note records the final verified state after emulator QA, Binance Spot Testnet credential verification, a real Binance Spot Testnet order submission, and Bybit Testnet credential/order-call QA. It does not approve production live trading.

## Final Status

- Stage 15H can route newly published crypto signals into live-sandbox execution intents.
- A student can connect a real Binance Spot Testnet HMAC key through the student Copier UI.
- A student can connect a real Bybit Testnet HMAC key through the student Copier UI.
- Binance sandbox/testnet permission verification passes through signed Spot Testnet account access.
- Bybit sandbox/testnet permission verification passes through signed V5 API key access with SpotTrade required.
- Super Admin can run the bounded testnet worker against a workspace.
- The worker submitted a real Binance Spot Testnet BTCUSDT order from TradeHub using the student's encrypted sandbox credential.
- The resulting TradeHub order attempt reached `filled_live`.
- The worker submitted a real Bybit Testnet BTCUSDT order request from TradeHub using the student's encrypted sandbox credential. Bybit rejected it with `170131` because the API account had `0` usable USDT in Unified Trading; TradeHub recorded a sanitized `failed_live` attempt and did not expose raw exchange secrets or responses.
- Fixture-only ready intents without encrypted credentials fail safely as `failed_live` instead of crashing the worker.
- Production live trading remains blocked.
- `CRYPTO_EXECUTION_LIVE_ENABLED` remains ineffective for production execution.
- `CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED=true` remains the only gate that permits real sandbox/testnet exchange order calls.

## Real Binance Spot Testnet Evidence

Student account used for browser QA:

```text
student_stage15f_binance_sandbox@example.test
```

Workspace used:

```text
ws_stage15f_paper_beta
```

Observed student Copier result:

- Binance personal account was verified.
- Environment: `sandbox`
- Permissions: `passed`
- Withdrawals: `confirmed_disabled`
- Safe message: Binance Spot Testnet permission check passed; withdrawal capability is treated as unavailable for sandbox/testnet execution.
- No API key, API secret, credential reference, encrypted blob, signed payload, raw exchange response, or service-account data was shown in UI.

Observed Super Admin result after publishing a crypto BTCUSDT signal and running the testnet worker:

- Intent:
  - `executionMode: live_sandbox`
  - `environment: sandbox`
  - `exchange: binance`
  - `symbol: BTCUSDT`
  - `side: buy`
  - `status: filled_live`
- Order attempt:
  - `executionMode: live_sandbox`
  - `environment: sandbox`
  - `exchange: binance`
  - `symbol: BTCUSDT`
  - `status: filled_live`

The TradeHub admin UI showed the latest sandbox attempt as:

```text
BTCUSDT sandbox attempt
filled live
```

## Real Bybit Testnet Evidence

Student account used for browser QA:

```text
student_stage15f_bybit_sandbox@example.test
```

Workspace used:

```text
ws_stage15f_paper_beta
```

Observed student Copier result:

- Bybit personal account was verified.
- Environment: `sandbox`
- Permissions: `passed`
- Withdrawals: `confirmed_disabled`
- No API key, API secret, credential reference, encrypted blob, signed payload, raw exchange response, or service-account data was shown in UI.

Observed Super Admin result after publishing a fresh crypto BTCUSDT signal and running the testnet worker:

- Intent:
  - `executionMode: live_sandbox`
  - `environment: sandbox`
  - `exchange: bybit`
  - `symbol: BTCUSDT`
  - `side: buy`
  - `status: failed_live`
- Order attempt:
  - `executionMode: live_sandbox`
  - `environment: sandbox`
  - `exchange: bybit`
  - `symbol: BTCUSDT`
  - `sanitizedFailureCode: bybit_order_ret_170131`
  - `status: failed_live`

Safe balance diagnostics against the encrypted Bybit Testnet credential showed:

```text
UNIFIED USDT walletBalance: 0
UNIFIED USDT equity: 0
BTC walletBalance: empty
ETH walletBalance: empty
```

Bybit `170131` maps to insufficient balance. This means TradeHub successfully reached the real Bybit Testnet order endpoint, and the remaining blocker is Bybit test funds/faucet availability for that test account, not TradeHub routing, credential storage, or permission verification.

## Fixes Made During Real Testnet QA

The first real Binance testnet attempt exposed several expected sandbox-readiness issues. These were patched before marking 15H complete.

### Binance Sandbox Permission Verification

Binance Spot Testnet does not support the production-style `/sapi` permission endpoint used by the original Binance verifier.

Fix:

- Binance sandbox verification now uses signed Spot Testnet `/api/v3/account`.
- The sandbox verifier requires the key to prove testnet account access and trade permission.
- Withdrawal capability is treated as unavailable for Binance Spot Testnet execution and recorded as `confirmed_disabled`.
- Production Binance verification remains separate and stricter.

### Binance Signed Request Clock Safety

The first signed sandbox account request returned a Binance HTTP `400`.

Fix:

- Binance signed sandbox calls now use Binance server time from `/api/v3/time`.
- Order submit, order status lookup, and cancel also use Binance server time.
- If server time lookup fails, the adapter falls back to local time and fails safely if Binance rejects the request.

### Worker Handling For Metadata-Only Fixture Connections

The first testnet worker click returned `404` because old seeded ready intents referenced metadata-only fixture connections with no encrypted credential document.

Fix:

- Missing encrypted credential material now creates a support-safe `failed_live` attempt.
- The worker continues processing later ready intents instead of aborting the whole run.
- The real encrypted Binance Spot Testnet connection was then processed successfully.

### Support-Safe Preview Polish

Before the real testnet run, Stage 15H was tightened:

- Non-sandbox raw records are hidden from support-safe live-sandbox previews.
- Preview warnings explain when non-sandbox records were hidden.
- Student/influencer-safe previews use masked `exchangeOrderRef` rather than exposing full exchange order IDs.
- Reconciliation only queries unsettled/reconcile-needed statuses.
- Failed submission semantics now align intent and attempt status as `failed_live`.

### Bybit Testnet Clock And Permission Safety

During Bybit Testnet QA, the adapter was tightened before marking Bybit cleared.

Fix:

- Bybit signed permission, submit, status, and cancel calls now use Bybit server time from `/v5/market/time`.
- Bybit permission verification requires a read-write key with `SpotTrade` enabled.
- Bybit order rejection `170131` is mapped to a clearer support-safe insufficient-balance message.

## Verified Commands

These commands passed locally after the final 15H patches:

```bash
npm run typecheck
npm run lint
npm run build
```

The emulator-backed Stage 15F/15H scripts and Firestore rules denial tests had also passed before the real Binance testnet browser run:

```bash
npm run stage15f:seed
npm run stage15h:seed
npm run stage15f:seed-auth
npm run stage15f:qa
npm run stage15h:qa
env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore-rules-stage15f.test.mjs
```

Notes:

- `npm run firebase:rules:test` can fail if another Firestore emulator already owns port `8080`; the direct rules test against the running emulator is the equivalent check.
- The real Binance testnet order required the app server to keep the same `CRYPTO_CREDENTIAL_LOCAL_ENCRYPTION_KEY` used when the student connected the key, because local encrypted storage is intentionally key-bound.

## Manual QA Flow That Passed

1. Start local emulators:

```bash
npm run firebase:emulators
```

2. Seed fixtures and Auth users:

```bash
npm run stage15f:seed
npm run stage15h:seed
npm run stage15f:seed-auth
```

3. Start the Stage 15F app server with local encrypted credential storage and testnet order calls enabled:

```bash
CRYPTO_CREDENTIAL_STORAGE_MODE=local_encrypted \
CRYPTO_CREDENTIAL_LOCAL_ENCRYPTION_KEY=<same-64-char-hex-key-for-the-whole-run> \
CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED=true \
CRYPTO_EXECUTION_LIVE_ENABLED= \
npm run dev:stage15f
```

4. Sign in as the seeded Binance sandbox student:

```text
student_stage15f_binance_sandbox@example.test
Stage15F!Pass123
```

5. In `/app/copier`, connect a Binance Spot Testnet HMAC key with:

```text
TRADE
USER_DATA
USER_STREAM
```

6. Verify that the connection becomes `verified`.

7. Sign in as the influencer:

```text
stage15f.influencer@example.test
Stage15F!Pass123
```

8. In `/workspace`, publish a new crypto signal:

```text
Market: Crypto
Pair: BTCUSDT
Direction: Buy
Entry: 100
Take profit: 110
Stop loss: 95
```

9. Sign in as Super Admin:

```text
stage15f.admin@example.test
Stage15F!Pass123
```

10. In `/admin`, load:

```text
ws_stage15f_paper_beta
```

11. Run:

```text
Run testnet worker
Reconcile testnet
```

Result:

- The real Binance Spot Testnet BTCUSDT attempt reached `filled_live`.
- Older fixture-only ready intents failed safely with `live_sandbox_credential_unavailable`.

## Manual Bybit QA Flow That Passed With Expected Exchange Rejection

1. Sign in as the seeded Bybit sandbox student:

```text
student_stage15f_bybit_sandbox@example.test
Stage15F!Pass123
```

2. In `/app/copier`, connect a Bybit Testnet HMAC key with:

```text
Read-Write
Spot Trade
No withdrawal or transfer permission
Sandbox/testnet environment
```

3. Verify that the connection becomes `verified`.

4. Sign in as the influencer:

```text
stage15f.influencer@example.test
Stage15F!Pass123
```

5. In `/workspace`, publish a fresh crypto signal:

```text
Market: Crypto
Pair: BTCUSDT
Direction: Buy
Entry: 100
Take profit: 110
Stop loss: 95
```

6. Sign in as Super Admin:

```text
stage15f.admin@example.test
Stage15F!Pass123
```

7. In `/admin`, load:

```text
ws_stage15f_paper_beta
```

8. Run:

```text
Run testnet worker
Reconcile testnet
```

Result:

- The real Bybit Testnet order request reached Bybit and returned `bybit_order_ret_170131`.
- TradeHub recorded `failed_live` with a support-safe insufficient-balance message.
- A safe balance check confirmed `0` usable USDT in Bybit Unified Trading.
- No secrets, credential refs, encrypted blobs, raw exchange responses, or full exchange order IDs were exposed to student/influencer UI.

## Safety Boundary Still In Force

- Production exchange keys are still blocked from Stage 15H worker use.
- Production order endpoints must not be called by Stage 15H.
- `CRYPTO_EXECUTION_LIVE_ENABLED` must not enable production trading.
- `CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED` must stay sandbox/testnet-only.
- Stage 16 entitlements remain the server-trusted access gate.
- Funded-account and prop-firm postures remain blocked from Auto-Copy execution.
- Firestore rules remain deny-by-default for protected execution records.
- Exchange credentials stay encrypted server-side and are never returned to client UI.
- Full exchange order IDs should remain server-side/admin-bound or masked in support-safe previews.

## Remaining Non-Goals

- No production live trading.
- No production credential storage approval; local encrypted storage is dev/test only.
- No automatic scheduler or queue runner; the Super Admin button remains a controlled manual test hook.
- No external master-trader account ingestion.
- No forex, MT4, MT5, cTrader, or FX Blue execution.
- No final production UI polish for the current dense diagnostic/admin surfaces.

## Remaining Before Prompt 15I

Before production live beta, TradeHub still needs:

- Production-grade credential vault or KMS-backed envelope storage.
- A production live consent flow separate from paper/testnet readiness.
- Super Admin platform, workspace, and student allowlist gates for production.
- Strict production notional, symbol, daily, open-order, failure, and kill-switch limits.
- Production incident controls and runbooks.
- Production monitoring and alerting.
- UI cleanup that removes fixture/test panels from normal user-facing surfaces.

Bybit Testnet is cleared for credential verification and real exchange rejection-path handling. A Bybit `filled_live` proof remains blocked only by the Bybit test account having no usable testnet funds in Unified Trading.

## Final Verdict

Stage 15H is complete for sandbox/testnet lifecycle proof.

Binance Spot Testnet is proven through `filled_live`. Bybit Testnet is proven through verified credential setup, real order endpoint reachability, sanitized insufficient-balance failure handling, and safe account-balance diagnostics. Production trading remains blocked.

The next prompt should be **Prompt 15I - Production Live Beta Gate**, unless the team wants one more Bybit faucet retry specifically to obtain a `filled_live` Bybit attempt.
