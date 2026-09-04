# Prompt 15L - Production Credential Vault And First Live Canary Order

You are continuing TradeHub in `/Users/idrissuleiman/Developer/tradehub`.

First read the saved continuation note reference `TH-2026-07-13-STAGE16-HANDOFF`, then inspect the current repository before editing. Preserve Stage 16 entitlement logic and the existing server-side Firebase Admin SDK access patterns.

## Read First

Read these files before making changes:

- `plan.md`
- `prompt/promptsumary.md`
- `prompt/15G-live-execution-safety-design-output.md`
- `prompt/15G-live-execution-state-machine.md`
- `prompt/15I-production-live-beta-gate.md`
- `prompt/15I-production-live-beta-runbook.md`
- `prompt/15K-crypto-execution-completion-note.md`
- `prompt/15K-crypto-execution-completion-qa-notes.md`
- `src/lib/crypto-execution/credential-vault.ts`
- `src/lib/crypto-execution/crypto-live-production.ts`
- `src/lib/crypto-execution/exchanges/order-placement.ts`
- `src/lib/crypto-execution/exchanges/binance-adapter.ts`
- `src/lib/crypto-execution/exchanges/bybit-adapter.ts`
- `src/types/crypto-execution.ts`
- `firestore.rules`
- `.env.example`

Also re-check the current official docs before touching the adapter boundary:

- Binance Spot REST trade endpoints: `https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade`
- Binance API key permission endpoint: `https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/account#get-api-key-permission`
- Bybit V5 order create: `https://bybit-exchange.github.io/docs/v5/order/create-order`
- Bybit V5 API key info: `https://bybit-exchange.github.io/docs/v5/user/apikey-info`
- Google Cloud Secret Manager client libraries: `https://docs.cloud.google.com/secret-manager/docs/reference/libraries`

## Stage Goal

Stage 15L is the first controlled bridge from gated production dry-run to a real-money production canary.

The desired workflow is:

1. Influencer publishes a valid TradeHub crypto signal.
2. TradeHub creates production-live intents only for paid, entitled, opted-in, personal-account students.
3. A Super Admin explicitly runs one tiny production canary worker.
4. TradeHub loads that student's production Binance/Bybit credential from a real production vault.
5. TradeHub places at most one tiny production order for the allowlisted student/exchange/symbol.
6. TradeHub records the order attempt, reconciles it, and keeps all student/influencer/admin previews support-safe.

This stage should prove one real production order path without turning on broad production Auto-Copy.

## What This Stage Must Not Do

- Do not implement forex execution, FX Blue, cTrader, MT4, or MT5.
- Do not implement external master-trader account ingestion or private stream mirroring.
- Do not place broad production orders.
- Do not run production orders automatically on signal publish.
- Do not make `CRYPTO_EXECUTION_LIVE_ENABLED` sufficient for production trading.
- Do not make production live order placement available from student or influencer client UI.
- Do not use local encrypted dev storage for production credentials.
- Do not store API keys, API secrets, encrypted blobs, signed payloads, raw exchange payloads, raw balances, or full exchange order IDs in public/client-visible responses.
- Do not weaken Firestore rules or allow client SDK reads/writes to protected execution collections.
- Do not auto-create TP/SL/OCO/bracket orders in this stage.
- Do not support leverage, futures, margin, derivatives, transfers, withdrawals, batch orders, or percent-balance sizing in this stage.
- Do not hide production failures from the student, influencer, or operator.

## Production Credential Vault

Implement a production-grade credential vault adapter behind `src/lib/crypto-execution/credential-vault.ts`.

Requirements:

- Support `CRYPTO_CREDENTIAL_STORAGE_MODE=cloud_secret_manager`.
- Add the minimal dependency needed for Google Cloud Secret Manager if the repo does not already have it.
- Use Application Default Credentials or service runtime identity for Secret Manager access.
- Keep `local_encrypted` available for local sandbox/testnet development only.
- Keep production fail-closed when the vault is not configured or cannot be reached.
- Store production API key/secret material in Secret Manager, not Firestore.
- Firestore may store only server-only metadata needed to locate and manage the vault entry.
- Do not return vault resource names or credential refs to student/influencer UI.
- Add server-side helpers for:
  - storing a production credential after permission verification;
  - loading a production credential only inside server-only production worker/reconcile/cancel code;
  - revoking/disabling a production vault reference;
  - readiness checks that do not expose secret values.
- Add safe audit events for store/load/revoke outcomes without secret material.
- If Secret Manager is unavailable in local automated QA, use a mockable adapter seam and deterministic fail-closed tests. Do not require real Google Cloud credentials for the normal test suite.

Suggested env additions:

```bash
CRYPTO_CREDENTIAL_STORAGE_MODE=cloud_secret_manager
CRYPTO_CREDENTIAL_PRODUCTION_VAULT_READY=false
CRYPTO_CREDENTIAL_SECRET_MANAGER_PROJECT_ID=
CRYPTO_CREDENTIAL_SECRET_MANAGER_PREFIX=tradehub-crypto
CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED=false
CRYPTO_EXECUTION_PRODUCTION_CANARY_MAX_ORDER_USDT=5
```

## Production Connection Flow

Update the production credential submission and refresh path so production keys can be accepted only when:

- production beta request/connection setup is allowed server-side;
- the student has active paid Auto-Copy entitlement from Stage 16;
- the student is personal-account posture, not funded/prop-firm;
- the key is for `environment: "production"`;
- permission verification passes;
- withdrawal permission is confirmed disabled;
- the credential is written to the production vault;
- the Firestore connection record stores safe metadata only.

The browser may hold the key only for the one-time submit request. Do not retain it in state after submit success/failure, and do not log it.

## Canary Execution Scope

Add a distinct canary path on top of the existing Stage 15I production worker. The canary must be narrower than the dry-run production beta:

- Super Admin only.
- Explicit workspace ID required.
- Explicit typed confirmation required, for example `RUN_LIVE_CANARY`.
- Env gate required: `CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED=true`.
- Existing env gates still required:
  - `CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=true`
  - `CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=true`
  - `CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=false`
  - production vault ready
- Existing Firestore gates still required:
  - platform production beta enabled;
  - workspace production beta enabled;
  - platform/workspace production order calls enabled;
  - platform/workspace dry-run disabled;
  - platform/workspace kill switches off;
  - student/exchange/symbol allowlists;
  - active student consent, not paused/revoked;
  - fresh verified production connection;
  - withdrawals disabled.
- Worker limit must be `1` for real canary order calls.
- Maximum order notional must default to `5 USDT` and must be clamped by env, platform, workspace, and student caps.
- First canary should support spot `BUY` market orders only, using quote-notional sizing where the exchange supports it.
- If a signal is `SELL`, block it for 15L with a clear safe reason such as `production_canary_sell_deferred`.
- If the symbol is not allowlisted, block it.
- If the account balance cannot be verified as sufficient, block before order placement when possible.
- If balance precheck is not available for an exchange, use an extra-tiny cap and record a safe warning before attempting, then sanitize exchange insufficient-balance failures.

## Order Placement Rules

Use only existing server-only order-placement adapters, extended as needed.

Before calling an exchange:

- Re-read and re-evaluate the full production gate at worker execution time. Do not trust only the intent snapshot.
- Re-check the connection freshness and withdrawal-disabled state.
- Check idempotency: the same intent must not create a duplicate exchange order.
- Create or reserve the order attempt in a transaction before the exchange call.
- Use deterministic client order IDs.
- Confirm the order notional is within every cap.
- Confirm production dry-run is false at env, platform, workspace, and intent snapshot levels.
- Confirm kill switches are still off.

After the exchange call:

- Map exchange status into `submitted_live`, `partially_filled_live`, `filled_live`, `rejected_live`, `failed_live`, or `reconcile_required`.
- Store full exchange IDs only in protected server/admin records if needed for reconciliation. Do not return full IDs to UI previews.
- Store masked refs for UI summaries.
- Record support-safe audit events.
- If the exchange returns an error, record sanitized error code/reason only.
- Never retry automatically inside the same request unless retry behavior is explicitly bounded, idempotent, and documented.

## Reconciliation And Cancel

Update production reconciliation and cancel paths so they can use production vault credentials only when all canary gates are still open.

Requirements:

- Reconciliation must query only bounded unsettled production attempts.
- Reconciliation must load credentials server-side only.
- Reconciliation must call exchange order status only for canary-eligible records.
- Cancel must require Super Admin, workspace ID, attempt ID, and typed confirmation.
- Cancel must never cancel unrelated orders; it can target only the stored canary order/client order ID.
- If vault, env, order, or kill-switch gates are closed, reconciliation/cancel must fail closed with safe audit records.

## UI And Ops Requirements

Student/influencer views:

- Must not expose secrets, credential refs, raw exchange payloads, raw balances, or full exchange order IDs.
- Must clearly say Production Beta is still tiny-scope and Super Admin controlled.
- Must show real production canary status only after canary is actually enabled and attempted.
- Must not use live-looking labels when production is still dry-run/gated.
- Must clearly say TradeHub does not custody funds and live trading can lose money.
- Must show pause/revoke state clearly.

Super Admin view:

- Add a clearly separated `Run production canary` action, distinct from `Run production dry-run`.
- Require typed confirmation before calling the canary route.
- Show env/platform/workspace/student/exchange/symbol gate status before and after the canary run.
- Show canary result with masked order ref, symbol, exchange, notional, status, and safe message.
- Show emergency stop checklist or runbook link/copy.
- Keep bounded list behavior and text containment.

## API And Data Requirements

Add or update server-only API routes as needed, for example:

- `POST /api/admin/crypto-execution/live-production/canary/run`
- `POST /api/admin/crypto-execution/live-production/canary/reconcile`
- `POST /api/admin/crypto-execution/live-production/canary/orders/[attemptId]/cancel`

If you reuse the existing production worker/reconcile/cancel routes, make the canary mode explicit in the payload and route response. Do not let an existing dry-run button silently become real order placement.

Data records should remain under existing protected production paths unless a new canary-specific collection is safer:

- `/workspaces/{workspaceId}/live_execution_intents/{intentId}`
- `/workspaces/{workspaceId}/live_order_attempts/{attemptId}`
- `/workspaces/{workspaceId}/live_reconciliation_records/{recordId}`
- `/workspaces/{workspaceId}/live_execution_audit_events/{eventId}`
- `/workspaces/{workspaceId}/live_gate_decisions/{decisionId}`

Add fields only where they improve safety, for example:

- `canaryRunId`
- `canaryConfirmedBy`
- `canaryConfirmedAt`
- `canaryMaxNotionalUsdt`
- `productionCanaryOnly: true`
- `gateRecheckedAt`

## Firestore Rules

Keep protected execution and credential paths denied to client SDK contexts.

Extend rules tests if any new path is added. Test unauthenticated, student, influencer, and Super Admin client SDK contexts. Even Super Admin client SDK should not read/write protected execution internals directly; Super Admin access should remain through server API routes.

## Automated QA

Add deterministic tests and scripts that do not require real production exchange credentials:

- `npm run stage15l:qa`
- optional `npm run stage15l:seed`

The QA must prove:

- production canary is blocked when env canary gate is false;
- production canary is blocked when dry-run is true;
- production canary is blocked when production order env is false;
- production canary is blocked when production vault is unavailable;
- production canary is blocked by platform kill switch;
- production canary is blocked by workspace kill switch;
- production canary is blocked when student consent is missing, paused, or revoked;
- production canary is blocked for trial, past-due, cancelled, funded, prop-firm, or unentitled students;
- production canary is blocked when student/exchange/symbol is not allowlisted;
- production canary is blocked for stale permission verification;
- production canary is blocked if withdrawals are detected enabled;
- production canary is blocked for `SELL` until sell canary support is explicitly approved;
- duplicate canary worker runs do not duplicate exchange order attempts;
- no secret, credential ref, raw exchange response, raw balance, signed payload, or full exchange order ID appears in public/API UI summaries;
- student/influencer views still scrub debug/fixture wording;
- production dry-run labels remain safe when real-money canary gates are not all open.

Use mocked exchange order placement/status/cancel seams for automated QA. Do not make real production exchange calls in CI or local automated scripts.

## Manual Canary QA

Do not perform this automatically. Document the manual steps, and only run after code review and explicit owner approval.

Manual run should use:

- a dedicated production Binance or Bybit account with tiny funds;
- a production API key with trading enabled and withdrawals disabled;
- preferably IP restriction where the exchange and hosting setup support it;
- one allowlisted workspace;
- one allowlisted student;
- one allowlisted exchange;
- one allowlisted symbol;
- `maxOrderUsdt` of `5` or less;
- a single valid `BUY` signal;
- Super Admin typed confirmation;
- immediate reconciliation;
- screenshots or notes of the exchange-side order and TradeHub-side record;
- emergency stop tested after the canary.

## Verification Commands

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run stage15f:qa
npm run stage15h:qa
npm run stage15i:qa
npm run stage15j:qa
npm run stage15k:qa
npm run stage15l:qa
npm run firebase:rules:test
```

If the Firestore emulator wrapper cannot start because port `8080` is already in use, run:

```bash
env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore-rules-stage15f.test.mjs
```

## Handoff Response Requirements

The builder's final response must include:

- exact files changed;
- which production vault mode was implemented;
- exact production gates required before a real order call can happen;
- whether any real production order was placed in this turn;
- if no real order was placed, the exact remaining manual canary steps;
- if a real canary was manually run with explicit approval, the symbol, exchange, notional, final status, masked order ref, reconciliation result, and emergency-stop result;
- what student/influencer/Super Admin can see versus what stays hidden;
- verification command results;
- manual QA checklist.

