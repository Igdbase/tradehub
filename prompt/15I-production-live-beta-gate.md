# Prompt 15I - Production Live Beta Gate

You are building **TradeHub Stage 15I**.

Stages 15A-15F proved paper crypto Auto-Copy. Stage 15G designed the live execution safety boundary. Stage 15H proved the Binance/Bybit order lifecycle against sandbox/testnet only, including a real Binance Spot Testnet `filled_live` order and a real Bybit Testnet sanitized insufficient-balance rejection path.

Stage 15I is the **production live beta gate**. It must not become a broad production rollout. It must add a tiny, explicit, fail-closed real-money beta path for TradeHub-published crypto signals only.

Default behavior must remain production-disabled.

Do not implement external master-trader account ingestion. Do not implement forex. Do not bypass Stage 16 entitlements. Do not weaken Firestore rules. Do not expose secrets. Do not run real-money orders during automated tests.

---

## Read First

Before editing, read:

- `plan.md`
- `prompt/promptsumary.md`
- `prompt/15G-live-execution-safety-design.md`
- `prompt/15G-live-execution-safety-design-output.md`
- `prompt/15G-live-execution-state-machine.md`
- `prompt/15G-live-execution-testnet-qa-checklist.md`
- `prompt/15H-sandbox-testnet-live-order-worker.md`
- `prompt/15H-sandbox-testnet-live-order-worker-qa-notes.md`
- `prompt/15H-sandbox-testnet-live-order-worker-completion-note.md`
- `prompt/16-multi-tier-expansion-and-advanced-feature-gating.md`
- `README.md`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/crypto-execution.ts`
- `src/types/entitlements.ts`
- `src/lib/entitlements/student-entitlements.ts`
- `src/lib/crypto-execution/credential-vault.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/crypto-risk-engine.ts`
- `src/lib/crypto-execution/crypto-signal-routing.ts`
- `src/lib/crypto-execution/crypto-execution-worker.ts`
- `src/lib/crypto-execution/crypto-live-sandbox.ts`
- `src/lib/crypto-execution/exchanges/types.ts`
- `src/lib/crypto-execution/exchanges/index.ts`
- `src/lib/crypto-execution/exchanges/order-placement.ts`
- `src/lib/crypto-execution/exchanges/binance-adapter.ts`
- `src/lib/crypto-execution/exchanges/bybit-adapter.ts`
- `src/app/api/admin/crypto-execution/live-sandbox/worker/run/route.ts`
- `src/app/api/admin/crypto-execution/live-sandbox/reconcile/run/route.ts`
- `src/app/api/admin/crypto-execution/live-sandbox/orders/[attemptId]/cancel/route.ts`
- `src/app/(student)/app/copier/page.tsx`
- `src/components/student-app/student-copier-client.tsx`
- `src/components/workspace/crypto-execution-ops-section.tsx`
- `src/components/admin/crypto-execution-ops-panel.tsx`
- `scripts/seed-stage15h-live-sandbox.mjs`
- `scripts/qa-stage15h-live-sandbox.mjs`
- `scripts/firestore-rules-stage15f.test.mjs`

Also re-check the current official exchange docs before changing production order, cancel, status, permission, testnet, timestamp, rate-limit, or error handling:

- Binance Spot trade endpoints: `https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade`
- Binance API key permission endpoint: `https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/account#get-api-key-permission`
- Binance Spot user data stream: `https://developers.binance.com/en/docs/products/spot/user-data-stream`
- Bybit V5 create order: `https://bybit-exchange.github.io/docs/v5/order/create-order`
- Bybit V5 API key information: `https://bybit-exchange.github.io/docs/v5/user/apikey-info`
- Bybit V5 private order stream: `https://bybit-exchange.github.io/docs/v5/websocket/private/order`

Do not rely on remembered exchange behavior for production code.

---

## Stage Goal

Add a production live beta gate for **TradeHub-published crypto signals**.

The intended workflow is:

1. A student pays, has active Stage 16 Auto-Copy entitlement, and is not trial/past-due/cancelled.
2. The student explicitly opts into live trading in the student app, separate from paper/testnet consent.
3. The student confirms personal-account posture, live loss risk, no funded/prop-firm capital, and no withdrawal-enabled API key.
4. The student connects a production Binance/Bybit key.
5. The server verifies production key permissions and fresh connection health.
6. Super Admin allowlists the platform, workspace, student, exchange, and symbols for a tiny live beta.
7. The workspace owner publishes a structured TradeHub crypto signal.
8. Server-side routing creates live production intents only for students who pass every gate.
9. A Super Admin-only bounded worker processes eligible production live intents.
10. Orders are submitted only when all gates, caps, idempotency checks, kill switches, and environment flags pass.
11. Reconciliation, cancellation, audit, alerting, and support-safe visibility record what happened.

The influencer does not choose individual student execution paths. TradeHub decides eligibility server-side.

---

## Non-Negotiable Safety Boundary

Stage 15I may add a production beta path, but it must be fail-closed by default.

Do **not**:

- enable broad production trading;
- make `CRYPTO_EXECUTION_LIVE_ENABLED` alone enable production order placement;
- let client UI place orders directly;
- let client Firestore reads/writes touch protected execution records;
- use sandbox/testnet credentials for production;
- use local encrypted credential storage for production;
- submit production orders in automated tests;
- use student-controlled request values as execution authority;
- route trial, past-due, cancelled, funded-account, prop-firm, alerts-only, missing-consent, missing-allowlist, stale-permission, withdrawal-enabled, or paused students into live production;
- expose API keys, API secrets, credential refs, encrypted blobs, signatures, signed payloads, headers, raw exchange payloads, raw service-account values, raw balance snapshots, or full exchange order IDs in student/influencer UI;
- implement external master-trader order ingestion;
- implement leverage, margin, futures, derivatives, OCO, trailing stops, copy-pool trading, forex, MT4, MT5, cTrader, or FX Blue;
- weaken Firestore rules.

If any production gate is missing or ambiguous, block execution and write a support-safe audit or live gate decision.

---

## Environment Gates

Add explicit production beta environment gates.

Suggested env vars:

```text
CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=
CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=
CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=true
CRYPTO_EXECUTION_PRODUCTION_MAX_ORDER_USDT=25
```

Rules:

- Default is disabled and dry-run.
- `CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=true` allows production beta routing and previews only if Firestore controls also allow it.
- `CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=true` is required before the production worker may call production exchange order endpoints.
- `CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=true` must prevent exchange order calls even if other gates are true.
- `CRYPTO_EXECUTION_LIVE_ENABLED` must remain insufficient on its own.
- The worker must report exactly which gate blocked execution, without secrets.

---

## Credential Storage Requirement

Production exchange credentials must not use the Stage 15B local encrypted dev vault.

Implement a production credential-vault readiness gate:

- `local_encrypted` is allowed only for local development, emulator, sandbox, and testnet.
- `NODE_ENV=production` with `local_encrypted` must fail closed.
- Production live beta requires a production-grade vault mode such as KMS-backed envelope storage or a cloud secret manager adapter.
- If the production vault adapter is not configured, production connection and production worker routes must return safe `credential_storage_unavailable` errors.

It is acceptable for Stage 15I to add the production vault interface and fail-closed stub if real cloud KMS wiring is not ready yet. Do not fake production readiness.

---

## Data Model

Prefer reusing the Stage 15H protected live collections with explicit `executionMode: "live"` and `environment: "production"` instead of inventing loosely related parallel records.

Existing protected live collections include:

```text
/platform_live_execution_controls/current
/workspaces/{workspaceId}/live_execution_controls/current
/workspaces/{workspaceId}/live_allowlists/{documentId}
/workspaces/{workspaceId}/students/{studentId}/live_consents/current
/workspaces/{workspaceId}/students/{studentId}/live_execution_preferences/current
/workspaces/{workspaceId}/live_execution_intents/{intentId}
/workspaces/{workspaceId}/live_order_attempts/{attemptId}
/workspaces/{workspaceId}/live_reconciliation_records/{recordId}
/workspaces/{workspaceId}/live_execution_audit_events/{eventId}
```

Add production-specific fields without breaking Stage 15H sandbox records:

- `environment: "production"`
- `executionMode: "live"`
- production beta control flags
- production beta approval actor and timestamp
- consent version and risk disclosure version
- capped order sizing snapshot
- pre-trade gate snapshot
- safe balance availability category, not raw balances
- exchange permission freshness timestamp
- deterministic exchange client order ID
- masked exchange order reference for UI summaries
- incident state where relevant

Paper records must stay separate. Paper intents must not upgrade in place to production live intents.

---

## Types

Update `src/types/crypto-execution.ts` carefully.

Expected additions:

- production live control type
- production live consent fields if the current live consent shape is insufficient
- production live preference fields
- production live gate decision type
- production live intent summary
- production live order attempt summary
- production live reconciliation summary
- production worker run result
- production incident/runbook state
- support-safe preview response types

Keep Stage 15H `live_sandbox` types and behavior intact.

If existing `CryptoLiveSandboxIntentStatus` is reused for production statuses, rename or generalize it safely without weakening sandbox filters. Do not make sandbox and production indistinguishable.

---

## Production Gate Evaluation

Implement a server-only production live gate evaluator.

Required gates:

- Stage 16 Auto-Copy entitlement allowed.
- Active paid subscription.
- Trial students blocked by default.
- Student risk posture is personal account.
- Funded/prop-firm and alerts-only students blocked.
- Workspace approved and not suspended.
- TradeHub-published crypto signal.
- Signal has valid directional entry, TP, and SL levels.
- Signal symbol is production-live allowlisted.
- Platform production live beta enabled in env and Firestore control.
- Workspace production live beta enabled and workspace allowlisted.
- Student production live beta allowlisted.
- Student accepted current live production risk consent.
- Student did not revoke or pause live production.
- Workspace owner did not pause live execution.
- Super Admin kill switches off.
- Exchange allowlisted for production beta.
- Production exchange connection verified.
- Trading permission present.
- Withdrawal permission confirmed disabled.
- Permission verification fresh.
- Production vault credential available.
- Fixed notional is inside platform, workspace, student, exchange, and symbol caps.
- Daily notional cap not exceeded.
- Max open orders not exceeded.
- Recent failure threshold not exceeded.
- No unresolved incident lock.
- No duplicate live intent/order attempt for the signal version.

Blocked candidates must write production live gate decisions with safe reason codes. They must not create executable production intents.

---

## Production Routing

Integrate production live routing only after the above gate evaluator exists.

Rules:

- Only newly published TradeHub crypto signals are eligible.
- Drafts, forex, cancelled, edited-but-not-newly-published, stale, malformed, and non-crypto signals must not create production live intents.
- Candidate sampling must be bounded, default max 10 students for Stage 15I production beta.
- Intent IDs must be deterministic by workspace, signal, student, connection, environment, execution mode, and signal version.
- Re-running routing must merge or reuse existing intents rather than creating duplicates.
- Production routing must never scan unbounded student collections.
- Sandbox routing from Stage 15H must keep working independently.

Suggested default production beta limit:

```text
PRODUCTION_LIVE_BETA_CANDIDATE_LIMIT=10
```

If this env var is not added, hard-code a small bounded limit with a comment explaining the beta safety boundary.

---

## Production Worker

Add a Super Admin-only production live worker. Keep it separate from the sandbox/testnet worker.

Suggested route:

```text
POST /api/admin/crypto-execution/live-production/worker/run
```

Worker rules:

- Require Super Admin auth.
- Require `CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=true`.
- Require Firestore platform/workspace production controls enabled.
- Require `CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=true`.
- Require `CRYPTO_EXECUTION_PRODUCTION_DRY_RUN` to be false or absent.
- Require production vault readiness.
- Process a tiny bounded limit, default 1 to 3 intents per run.
- Process only `executionMode: "live"` and `environment: "production"`.
- Process only `ready_for_live`.
- Claim the intent transactionally before external exchange submission.
- Refuse any intent with missing or stale gate snapshot.
- Re-check kill switches immediately before submission.
- Use deterministic exchange client order IDs.
- If an attempt exists, reconcile instead of submitting a duplicate.
- Store sanitized attempt state and safe audit records.
- Never return raw exchange payloads.

If dry-run is active, the worker should record `dry_run_live` or a clearly named safe status/audit event and must not call the exchange.

---

## Production Order Scope

Keep the first production beta deliberately narrow:

- Spot only.
- USDT quote pairs only.
- No leverage.
- No margin borrowing.
- No futures or derivatives.
- Market buy by quote notional where safely supported.
- Conservative limit orders may be allowed only if symbol filters and precision are normalized.
- No automatic TP/SL/OCO order placement yet.
- TP/SL from signal can be stored as intended exit guidance and used for future monitoring, not as attached live orders.

Minimum notional, precision, step size, quote order quantity support, and rate limits must be checked before submission. If filters are not known, fail closed.

---

## Reconciliation

Production reconciliation is mandatory before any real production order path can be considered complete.

Suggested route:

```text
POST /api/admin/crypto-execution/live-production/reconcile/run
```

Rules:

- Require Super Admin auth.
- Query only bounded unsettled production attempts.
- Do not scan all orders.
- Reconcile by deterministic client order ID first where possible.
- Normalize exchange statuses to TradeHub statuses.
- Handle submitted, partially filled, filled, rejected, cancelled, expired, unknown, and stale states.
- Mark unknown or unparseable states as `reconcile_required` and raise a warning audit event.
- Do not expose raw exchange responses.
- Keep full exchange IDs server-side/admin-bound; student/influencer previews use masked refs.

---

## Cancellation And Emergency Stop

Add or harden production cancellation and incident controls.

Suggested route:

```text
POST /api/admin/crypto-execution/live-production/orders/[attemptId]/cancel
```

Rules:

- Require Super Admin auth.
- Require production attempt status to be cancellable.
- Re-check platform/workspace/student kill switches and incident locks.
- Submit bounded cancel requests only for TradeHub-originated client order IDs.
- Record `cancel_requested`, `cancel_submitted`, `cancelled_live`, or `reconcile_required`.
- If cancel fails or the order fills during cancel, preserve the filled state and raise review.

Add an operator runbook document:

```text
prompt/15I-production-live-beta-runbook.md
```

The runbook must include:

- pre-flight checklist
- how to enable/disable gates
- how to run worker and reconciliation
- emergency kill switch steps
- cancel-open-orders process
- student/influencer support copy
- rollback checklist
- evidence to capture after a production beta run

---

## Student UI

Update the student copier UI only as much as needed for production beta readiness.

Student should see:

- paper readiness
- sandbox/testnet proof if available
- production live beta status
- whether live beta is unavailable, requested, allowlisted, paused, revoked, or enabled
- production connection status without secrets
- live risk consent action
- fixed-notional and live cap settings
- pause/revoke live controls
- recent production live attempts with safe status
- clear copy that live orders can lose money and TradeHub does not custody funds

Student should not see:

- API key
- API secret
- credential reference
- encrypted blobs
- raw balances
- raw exchange responses
- full exchange order IDs
- Super Admin-only diagnostics

If production beta is not enabled, the UI should feel clean and mature, not like a broken diagnostic page.

---

## Influencer Workspace UI

Update workspace crypto ops visibility so the influencer can understand execution health without seeing private student account details.

Influencer should see:

- live beta workspace status
- published signal routing summary
- counts of live-ready, blocked, submitted, filled, failed, paused, and revoked students
- per-signal execution summary
- support-safe failure categories
- workspace kill switch and pause status if already supported

Influencer should not see:

- student API keys/secrets
- credential refs
- raw balances
- raw exchange responses
- full exchange order IDs
- private account data beyond support-safe student identifiers already allowed by workspace policy

Do not clutter normal workspace UI with fixture/test-only panels. Keep sandbox/testnet diagnostics separate from production beta status.

---

## Super Admin UI

Add a serious production beta operations panel, separate from the Stage 15H testnet proof panel.

Super Admin should see:

- platform production beta enabled/disabled
- workspace production beta enabled/disabled
- workspace/student/exchange/symbol allowlist summaries
- production vault readiness
- order-call env readiness
- dry-run status
- kill switches
- candidate and processed counts
- live intents
- order attempts
- reconciliation records
- warnings and incident locks
- run worker button
- run reconciliation button
- cancel eligible order button
- runbook link or embedded checklist

All lists must be bounded, default visible window of 4, with the list container scrolling instead of the whole page growing endlessly.

Do not show secrets or raw exchange payloads.

---

## Global UI Cleanup Required In This Prompt

Before closing 15I, clean up the crypto execution surfaces so the product no longer feels like a test harness.

Apply these rules to student, workspace, and Super Admin crypto execution panels:

- Testnet/sandbox proof panels stay clearly labeled and secondary.
- Production beta panels are operational, compact, and readable.
- No nested-card clutter where a simpler panel/list will do.
- Lists that can accumulate show 4 visible rows by default and scroll inside the list container.
- Long IDs, emails, handles, symbols, signal names, order IDs, and messages wrap or truncate safely.
- Pills and buttons must not become ultra-narrow vertical text.
- Use responsive grids with enough minimum width.
- Do not scale font size with viewport width.
- No text should escape bordered containers.
- Keep TradeHub dark premium styling, but mature the dashboards for real operator use.

---

## Firestore Rules

Preserve deny-by-default access for all protected execution records.

Client SDK access must be denied for:

```text
/broker_keys/**
/platform_live_execution_controls/**
/workspaces/{workspaceId}/live_execution_controls/**
/workspaces/{workspaceId}/live_allowlists/**
/workspaces/{workspaceId}/students/{studentId}/live_consents/**
/workspaces/{workspaceId}/students/{studentId}/live_execution_preferences/**
/workspaces/{workspaceId}/live_gate_decisions/**
/workspaces/{workspaceId}/live_execution_intents/**
/workspaces/{workspaceId}/live_order_attempts/**
/workspaces/{workspaceId}/live_reconciliation_records/**
/workspaces/{workspaceId}/live_execution_audit_events/**
```

Update `scripts/firestore-rules-stage15f.test.mjs` or add a Stage 15I rules test to prove denial for unauthenticated, student, influencer, and Super Admin client SDK contexts. Super Admin access to protected records must stay through server-side Admin SDK routes only.

---

## Seed And QA Scripts

Add deterministic emulator-safe Stage 15I fixtures and QA.

Suggested scripts:

```text
scripts/seed-stage15i-production-live-beta.mjs
scripts/qa-stage15i-production-live-beta.mjs
```

Suggested package scripts:

```json
{
  "stage15i:seed": "node scripts/seed-stage15i-production-live-beta.mjs",
  "stage15i:qa": "node scripts/qa-stage15i-production-live-beta.mjs"
}
```

Seed fixtures must not store real production secrets. They should prove:

- default production disabled
- production env disabled
- dry-run blocks exchange calls
- missing production vault blocks
- missing student consent blocks
- revoked consent blocks
- trial student blocks
- past-due student blocks
- funded/prop-firm posture blocks
- unallowlisted workspace blocks
- unallowlisted student blocks
- unallowlisted exchange blocks
- unallowlisted symbol blocks
- withdrawal-enabled key blocks
- stale permission blocks
- daily cap blocks
- open-order cap blocks
- recent-failure threshold blocks
- duplicate intent prevention
- dry-run worker records safe no-exchange-call attempt
- reconciliation only queries bounded unsettled production attempts
- cancellation refuses non-production or non-cancellable attempts

The QA script must not make real production exchange calls.

---

## Verification

After implementation, run:

```bash
npm run typecheck
npm run lint
npm run build
npm run stage15f:qa
npm run stage15h:qa
npm run stage15i:seed
npm run stage15i:qa
npm run firebase:rules:test
```

Also run safety scans:

```bash
rg -n "CRYPTO_EXECUTION_LIVE_ENABLED" src scripts
rg -n "CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED|CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED|CRYPTO_EXECUTION_PRODUCTION_DRY_RUN" src scripts .env.example README.md
rg -n "api\\.binance\\.com|api\\.bybit\\.com|/api/v3/order|/v5/order/create" src scripts api
rg -n "apiSecret|secret|credentialRef|encryptedSecretRef|ciphertext|authTag|exchangeOrderId" src/components src/app/api src/lib
rg -n "executionMode.*live|environment.*production|ready_for_live|submitted_live|filled_live|failed_live" src scripts
```

Expected scan posture:

- Production exchange endpoints appear only in server-only exchange adapters/order-placement and the production live worker/service.
- Client components do not import order-placement adapters.
- Secret references stay server-side.
- Full exchange order IDs are not rendered in student/influencer UI.
- `CRYPTO_EXECUTION_LIVE_ENABLED` is not sufficient to place production orders.
- Stage 15H sandbox/testnet behavior still passes.

---

## Manual QA

Manual QA should be dry-run and emulator-backed unless the human explicitly approves a real tiny production beta run.

Dry-run manual checklist:

- Student can view live beta locked/unavailable state.
- Student can accept live consent only through the intended UI.
- Student can pause and revoke live beta.
- Student production connection fails closed when production vault is unavailable.
- Influencer can publish a crypto signal and see support-safe routing summaries.
- Super Admin can load workspace production beta preview.
- Super Admin sees env, vault, allowlist, kill switch, dry-run, and order-call readiness.
- Super Admin worker dry-run does not call exchange endpoints.
- Super Admin reconciliation uses bounded unsettled records only.
- Super Admin cancel refuses non-cancellable or sandbox records.
- Firestore rules deny client SDK access to protected live records.

Real production beta checklist, only after separate explicit human approval:

- Use tiny dedicated production test accounts.
- Use exchange API keys with withdrawals disabled and only the minimum trading permissions.
- Use a very small cap, e.g. 10 to 25 USDT.
- Use one workspace, one student, one exchange, one symbol.
- Confirm all kill switches before enabling.
- Confirm dry-run result before live order-call env is enabled.
- Run one order.
- Immediately reconcile.
- Confirm exchange order history.
- Pause/disable production live after the proof.
- Capture audit evidence and write a completion note.

Do not perform the real production beta checklist automatically.

---

## Docs To Update

Update:

- `README.md`
- `.env.example`
- `plan.md`
- `prompt/promptsumary.md`

Create:

```text
prompt/15I-production-live-beta-qa-notes.md
prompt/15I-production-live-beta-runbook.md
```

If implementation stays dry-run only because production vault/KMS is unavailable, say that clearly in the QA notes. Do not call it production-ready.

---

## Acceptance Criteria

Stage 15I is complete only when:

- Production live beta is fail-closed by default.
- Production trading cannot be enabled by `CRYPTO_EXECUTION_LIVE_ENABLED` alone.
- Production order submission requires explicit env gates, Firestore platform/workspace controls, allowlists, current consent, active entitlement, safe production connection, production vault readiness, and all caps.
- Student live consent is separate from paper/testnet consent.
- Trial, past-due, cancelled, funded, prop-firm, alerts-only, paused, revoked, stale-permission, withdrawal-enabled, and unallowlisted students are blocked.
- Production live intents are deterministic and idempotent.
- Production worker is Super Admin-only, bounded, transactional, kill-switch aware, and dry-run by default.
- Production reconciliation exists before any order call can be considered complete.
- Production cancellation and emergency runbook exist.
- Student, influencer, and Super Admin previews are support-safe and do not leak secrets.
- Accumulating execution lists show 4 visible rows and scroll internally.
- Stage 15F and Stage 15H QA still pass.
- Firestore rules tests prove protected execution records remain client-denied.
- Typecheck, lint, and build pass.

Final response must include:

- exact files changed;
- whether production order calls are still disabled by default;
- exact gates required before any production order call;
- whether production vault/KMS is implemented or still fail-closed;
- what records are shown vs hidden in student, influencer, and Super Admin surfaces;
- verification results;
- manual QA checklist status;
- explicit statement that external master-trader order ingestion is still deferred.
