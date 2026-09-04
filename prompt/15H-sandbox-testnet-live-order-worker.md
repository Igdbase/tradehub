# Prompt 15H - Sandbox/Testnet Live Order Worker

You are building **TradeHub Stage 15H**. Stages 15A-15F proved crypto Auto-Copy in paper mode. Stage 15G designed the real-money safety boundary and explicitly kept production live trading disabled.

Stage 15H is the first implementation step after that design, but it is still **not production live trading**.

Your job is to implement a sandbox/testnet-only live order worker for Binance and Bybit so TradeHub can prove the real exchange order lifecycle without real money.

Do not enable production trading. Do not accept production exchange keys for this worker. Do not make `CRYPTO_EXECUTION_LIVE_ENABLED` enable production trading. Do not implement external master trader order ingestion. Do not implement forex.

---

## Read First

Before editing, read:

- `plan.md`
- `prompt/promptsumary.md`
- `prompt/15F-paper-beta-completion-note.md`
- `prompt/15G-live-execution-safety-design.md`
- `prompt/15G-live-execution-safety-design-output.md`
- `prompt/15G-live-execution-state-machine.md`
- `prompt/15G-live-execution-testnet-qa-checklist.md`
- `prompt/16-multi-tier-expansion-and-advanced-feature-gating.md`
- `README.md`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/crypto-execution.ts`
- `src/types/entitlements.ts`
- `src/lib/entitlements/student-entitlements.ts`
- `src/lib/crypto-execution/crypto-execution-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/credential-vault.ts`
- `src/lib/crypto-execution/crypto-risk-engine.ts`
- `src/lib/crypto-execution/crypto-signal-routing.ts`
- `src/lib/crypto-execution/crypto-execution-worker.ts`
- `src/lib/crypto-execution/exchanges/types.ts`
- `src/lib/crypto-execution/exchanges/index.ts`
- `src/lib/crypto-execution/exchanges/order-placement.ts`
- `src/lib/crypto-execution/exchanges/binance-adapter.ts`
- `src/lib/crypto-execution/exchanges/bybit-adapter.ts`
- `src/app/api/admin/crypto-execution/worker/run/route.ts`
- `src/app/api/student/crypto-execution/overview/route.ts`
- `src/app/api/workspace/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/overview/route.ts`
- `src/components/student-app/student-copier-client.tsx`
- `src/components/workspace/crypto-execution-ops-section.tsx`
- `src/components/admin/crypto-execution-ops-panel.tsx`
- `scripts/stage15f-paper-beta-fixtures.mjs`
- `scripts/seed-stage15f-paper-beta.mjs`
- `scripts/qa-stage15f-paper-beta.mjs`
- `scripts/firestore-rules-stage15f.test.mjs`

Also re-check the current official exchange docs before implementing order submit, cancel, status, permission, testnet, rate-limit, and error handling:

- Binance Spot trade endpoints: `https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade`
- Binance API key permission endpoint: `https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/account#get-api-key-permission`
- Binance Spot user data stream: `https://developers.binance.com/en/docs/products/spot/user-data-stream`
- Bybit V5 create order: `https://bybit-exchange.github.io/docs/v5/order/create-order`
- Bybit V5 API key information: `https://bybit-exchange.github.io/docs/v5/user/apikey-info`
- Bybit V5 private order stream: `https://bybit-exchange.github.io/docs/v5/websocket/private/order`

Do not rely on stale remembered exchange behavior for live-order code.

---

## Stage Goal

Implement a sandbox/testnet-only live order path:

1. A TradeHub-published crypto signal is eligible for sandbox live routing.
2. Only students with active entitlement, explicit sandbox/live consent fixture state, personal-account posture, verified sandbox/testnet exchange connection, and allowlist gates can receive sandbox live intents.
3. The system creates deterministic `ready_for_live` sandbox/testnet intents.
4. A Super Admin-only worker submits those intents to Binance sandbox/testnet or Bybit testnet.
5. The worker writes safe order attempt, status, reconciliation, and audit records.
6. Duplicate worker runs do not duplicate exchange orders.
7. Kill switches, pauses, blocked risk posture, production connection attempts, and missing consent fail closed.

This stage proves exchange order mechanics with testnet/sandbox accounts only.

---

## Non-Negotiable Safety Boundary

Stage 15H must remain sandbox/testnet-only.

Do **not**:

- submit production Binance or Bybit orders;
- accept production connections for the sandbox/testnet worker;
- use production `environment: "production"` records in live sandbox routing;
- make `CRYPTO_EXECUTION_LIVE_ENABLED` enable production live trading;
- add production live beta controls;
- add production allowlisted real-money worker behavior;
- implement external master trader order ingestion;
- implement TP/SL/OCO automation unless explicitly safe and sandbox-only;
- implement forex, MT4, MT5, cTrader, FX Blue, or prop-firm copying;
- expose exchange secrets, credential refs, encrypted blobs, signed payloads, raw exchange responses, or service-account values;
- weaken Firestore rules;
- add client Firestore reads/writes for protected execution records.

If production keys, production environment, missing consent, ambiguous permission response, active kill switch, or funded/prop-firm posture appears anywhere in the path, fail closed with support-safe audit records.

---

## Recommended Naming

Use names that make the sandbox boundary obvious.

Suggested env var:

```text
CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED=
```

Rules:

- Default is disabled.
- Required for real sandbox/testnet exchange calls.
- Separate from `CRYPTO_EXECUTION_LIVE_ENABLED`.
- `CRYPTO_EXECUTION_LIVE_ENABLED` must remain ineffective for production trading in Stage 15H.

Suggested execution mode:

```text
live_sandbox
```

Suggested live sandbox records:

```text
/platform_live_execution_controls/current
/workspaces/{workspaceId}/live_execution_controls/current
/workspaces/{workspaceId}/students/{studentId}/live_consents/current
/workspaces/{workspaceId}/students/{studentId}/live_execution_preferences/current
/workspaces/{workspaceId}/live_execution_intents/{intentId}
/workspaces/{workspaceId}/live_order_attempts/{attemptId}
/workspaces/{workspaceId}/live_reconciliation_records/{recordId}
/workspaces/{workspaceId}/live_execution_audit_events/{eventId}
/workspaces/{workspaceId}/live_allowlists/{documentId}
```

All records above must remain protected through server-side Admin SDK APIs only.

---

## Implementation Requirements

### 1. Types

Extend `src/types/crypto-execution.ts` for sandbox/testnet live execution.

Add only what Stage 15H needs:

- sandbox/testnet execution mode;
- live sandbox intent summary;
- live sandbox order attempt summary;
- live sandbox reconciliation summary;
- live consent and allowlist/control types;
- support-safe API response types.

Live statuses may be added to runtime types only for `executionMode: "live_sandbox"` and only if production remains impossible.

Do not allow paper records to upgrade in-place to live records.

### 2. Exchange Adapters

Use `src/lib/crypto-execution/exchanges/order-placement.ts` only from the new sandbox/testnet live worker or sandbox/testnet exchange service.

Add or verify server-only exchange methods for:

- sandbox/testnet order submit;
- sandbox/testnet order status lookup;
- sandbox/testnet cancel where supported and safe;
- safe response normalization.

Requirements:

- Order submit must reject `environment: "production"` in Stage 15H.
- Adapters must never return raw exchange payloads to UI/API callers.
- Store only sanitized summaries: exchange, environment, client order ID/order link ID, exchange order ID if safe, status, symbol, side, order type, quantity/notional, timestamps, and safe error code/message.
- Keep secrets, signatures, headers, and raw payloads out of audit records and public summaries.

### 3. Sandbox/Testnet Live Gates

Implement server-side gate evaluation for live sandbox intents.

Required gates:

- Stage 16 Auto-Copy entitlement allowed.
- Active paid subscription.
- Personal-account posture.
- Not funded/prop-firm.
- TradeHub-published crypto signal.
- Explicit live sandbox consent or live consent fixture state.
- Platform live sandbox/testnet control enabled.
- Workspace live sandbox/testnet control enabled.
- Student allowlisted.
- Exchange allowlisted.
- Symbol allowlisted.
- Student pause off.
- Platform/workspace/symbol/exchange kill switches off.
- Verified sandbox/testnet connection.
- Withdrawal permission disabled or impossible.
- Trading permission present.
- Permission verification fresh.
- Fixed notional and exposure caps pass.

Blocked candidates should write risk decisions or live gate decisions with support-safe reasons. They must not create executable intents.

### 4. Sandbox/Testnet Live Routing

Integrate with TradeHub-published signal routing, but only for sandbox/testnet live mode.

Rules:

- Only newly published crypto signals should create live sandbox intents.
- Drafts, forex signals, cancelled signals, already-routed signal versions, and non-crypto signals must not create live sandbox intents.
- Keep paper routing intact.
- Keep funded/prop-firm and alerts-only students on Signal Alerts or blocked states.
- Use deterministic intent IDs and idempotency keys.
- Candidate scans must be bounded, following the Stage 15C limit pattern.

Recommended live intent ID:

```text
live_sandbox_{workspaceId}_{signalId}_{studentId}_{connectionId}_{signalVersionHash}
```

Recommended idempotency key:

```text
crypto-live-sandbox-intent:{workspaceId}:{signalId}:{studentId}:{connectionId}:{signalVersionHash}
```

### 5. Sandbox/Testnet Worker

Add a new Super Admin-only worker route, separate from the existing paper worker.

Suggested route:

```text
POST /api/admin/crypto-execution/live-sandbox/worker/run
```

The worker must:

- verify Super Admin using existing Admin SDK auth patterns;
- require a workspace ID;
- require `CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED=true` for real sandbox/testnet exchange calls;
- query only bounded `ready_for_live` intents with `executionMode: "live_sandbox"`;
- reject production environment records;
- re-check controls, consent, connection, and kill switches before submitting;
- claim intents idempotently before exchange submission;
- create deterministic attempt IDs and exchange client order IDs;
- submit only sandbox/testnet orders;
- record safe attempt summaries;
- record audit events for submit, skip, reject, cancel, reconcile, and failure paths;
- never call production exchange endpoints.

Suggested bounded default:

```text
limit: 5
max limit: 10
```

### 6. Idempotency And Duplicate Prevention

Implement duplicate prevention before exchange submission.

Required:

- deterministic live intent ID;
- deterministic attempt ID;
- deterministic exchange client order ID/order link ID;
- Firestore transaction or equivalent claim state before submit;
- existing non-terminal attempt blocks duplicate submit;
- duplicate client order ID response triggers reconciliation, not blind retry;
- worker rerun on same intent must not submit a second exchange order.

If a worker crash after submit cannot be proven safe in local tests, document the exact remaining risk and keep production blocked.

### 7. Reconciliation

Add a bounded reconciliation path for sandbox/testnet orders.

Minimum:

- Submitted order can be checked against exchange status.
- Filled order maps to `filled_live`.
- Partially filled order maps to `partially_filled_live`.
- Rejected order maps to `rejected_live`.
- Cancelled order maps to `cancelled_live`.
- Timeout or unknown response maps to `reconcile_required`.
- Reconciliation records are support-safe.
- Reconciliation queries are bounded.

Suggested route:

```text
POST /api/admin/crypto-execution/live-sandbox/reconcile/run
```

If one exchange does not support a clean sandbox/testnet status path, fail closed and document the limitation in QA notes.

### 8. Cancellation

Add a minimal sandbox/testnet cancellation path if supported safely.

Suggested route:

```text
POST /api/admin/crypto-execution/live-sandbox/orders/[attemptId]/cancel
```

Requirements:

- Super Admin only.
- Workspace scoped.
- Sandbox/testnet only.
- Production environment rejected.
- Safe audit record created.
- Unknown cancel state becomes `reconcile_required`.

If cancellation cannot be implemented safely for both exchanges in this stage, implement the safe exchange(s), document the gap, and keep production blocked.

### 9. Firestore Rules And Indexes

Update `firestore.rules` so all new live sandbox collections are explicitly denied to client SDK access.

Update `scripts/firestore-rules-stage15f.test.mjs` or create a Stage 15H rules test to prove:

- unauthenticated client cannot read/write live controls, live consents, live preferences, live intents, live attempts, reconciliation records, live incidents, live allowlists, or live audit events;
- student client cannot directly read/write them;
- influencer client cannot directly read/write them;
- Super Admin client SDK cannot directly bypass them;
- API/Admin SDK remains the access path.

Add indexes only for bounded worker/reconciliation queries that actually exist.

### 10. Seed And QA Scripts

Add deterministic scripts:

```text
npm run stage15h:seed
npm run stage15h:qa
```

Seed script:

- uses Firebase emulators only by default;
- refuses live Firestore/Auth writes;
- seeds controls, allowlists, live consent fixture records, sandbox/testnet connection metadata, live sandbox intents, blocked live decisions, and audit records;
- does not seed API keys, API secrets, encrypted blobs, credential refs, or service-account material.

QA script:

- validates entitlement gate;
- validates explicit live consent gate;
- validates funded/prop-firm block;
- validates production connection block;
- validates kill-switch block;
- validates idempotency and duplicate prevention at fixture level;
- validates status transitions and support-safe records;
- validates no production environment can be worker-consumable;
- can skip real exchange calls unless testnet credentials and `CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED=true` are present.

If real Binance/Bybit sandbox/testnet credentials are present, add optional integration checks. Those checks must never use production credentials.

### 11. UI Visibility

Add support-safe visibility without turning the UI into a production live trading console.

Student:

- show sandbox/testnet live eligibility;
- show explicit sandbox/testnet live consent status;
- show sandbox/testnet connection status;
- show safe live sandbox order history and failure reasons;
- keep production live disabled copy clear.

Influencer:

- show workspace sandbox/testnet live routing summary;
- show eligible, blocked, submitted, filled, failed, and reconciliation-required counts;
- no balances, credentials, or raw exchange data.

Super Admin:

- load workspace live sandbox preview;
- run bounded sandbox/testnet worker;
- run bounded reconciliation;
- inspect support-safe attempts and audit records;
- see clear copy that production live trading remains disabled.

All accumulating lists should remain bounded and internally scrollable, following Stage 15E/15F layout rules.

### 12. Documentation

Create:

```text
prompt/15H-sandbox-testnet-live-order-worker-qa-notes.md
```

Include:

- what was implemented;
- exact commands;
- fixture workspace/student IDs;
- how to run with emulator-only QA;
- how to run optional Binance/Bybit testnet integration QA;
- what records are shown vs hidden;
- production blockers still in force;
- any exchange-specific limitations.

Update:

- `plan.md`
- `prompt/promptsumary.md`
- `.env.example`
- `README.md` if new commands/env vars need documentation.

---

## Acceptance Criteria

Stage 15H is complete only when:

- Sandbox/testnet live routing can create deterministic `ready_for_live` intents for eligible students.
- Production environment records cannot become worker-consumable.
- Worker submits sandbox/testnet orders only when `CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED=true`.
- Worker rejects production exchange environment regardless of env vars.
- Duplicate worker runs do not duplicate orders.
- Attempt records are support-safe.
- Reconciliation records are support-safe.
- Cancellation is safe where implemented, or blocked with a documented reason.
- Kill switches block new live sandbox execution.
- Funded/prop-firm students remain blocked.
- Firestore rules deny direct client access to new protected live sandbox records.
- Student, influencer, and Super Admin previews expose no secrets.
- Production live beta remains blocked.

---

## Required Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run firebase:rules:test
npm run stage15h:seed
npm run stage15h:qa
```

If real sandbox/testnet credentials are configured, also run the optional integration path documented by Stage 15H.

Run safety scans:

```bash
rg -n "ready_for_live|queued_live|submitted_live|filled_live|partially_filled_live|rejected_live|cancel_requested|cancel_submitted|cancelled_live|expired_live|reconcile_required|failed_live" src scripts
rg -n "placeBinanceOrder|placeBybitOrder|getExchangeOrderPlacementAdapter|/api/v3/order|/v5/order/create" src scripts api
rg -n "CRYPTO_EXECUTION_LIVE_ENABLED|CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED" src scripts .env.example README.md
rg -n "credentialRefPath|encryptedSecretRef|apiSecret|apiKey|serviceAccount|private_key" src/app src/components src/lib/crypto-execution scripts
```

Expected scan posture:

- Live statuses appear only in sandbox/testnet code paths and protected summaries.
- Order placement adapter is imported only by the sandbox/testnet live worker/service.
- Existing legacy `api/*.js` order endpoint references remain isolated.
- No client component imports order placement.
- No production environment can reach order placement.
- Secret-bearing fields do not appear in UI responses, audit payloads, or public summaries.

---

## Final Response Requirements

In the final response, include:

- exact files changed;
- whether real sandbox/testnet exchange calls were actually run or skipped;
- what env vars are required for optional real testnet calls;
- what live sandbox records are created;
- what production paths remain blocked;
- verification results;
- safety scan results;
- manual QA checklist for student, influencer, and Super Admin;
- proposed next prompt, which should remain **Prompt 15I - Production Live Beta Gate** only after 15H passes with real sandbox/testnet QA.
