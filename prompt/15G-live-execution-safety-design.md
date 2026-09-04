# Prompt 15G - Live Execution Safety Design

You are building **TradeHub Stage 15G**. Stages 15A-15F proved a crypto-first Auto-Copy foundation for Binance and Bybit personal accounts, but only in paper mode.

Stage 15F is complete and validated with:

- deterministic Firestore fixtures;
- Auth emulator users and custom claims;
- real Firestore rules denial tests;
- student copier manual QA;
- influencer workspace manual QA;
- Super Admin bounded paper worker manual QA;
- final evidence in `prompt/15F-paper-beta-completion-note.md`.

This prompt starts the next phase, but it is **not** a live trading implementation prompt. Your job is to design the real-money execution boundary before any live order placement is added.

Do not place live Binance or Bybit orders. Do not add a live worker. Do not add production order execution. Do not make `CRYPTO_EXECUTION_LIVE_ENABLED` effective. Do not wire order placement into any route, worker, UI, or script.

---

## Read First

Before making changes, read:

- `plan.md`
- `prompt/promptsumary.md`
- `prompt/15A-crypto-auto-copy-data-model-and-server-boundary.md`
- `prompt/15B-student-binance-bybit-connection-and-permission-verification.md`
- `prompt/15C-risk-engine-and-signal-routing.md`
- `prompt/15E-paper-execution-visibility-ops-and-qa.md`
- `prompt/15F-paper-beta-seed-data-rules-tests-and-e2e-qa.md`
- `prompt/15F-paper-beta-qa-checklist.md`
- `prompt/15F-paper-beta-completion-note.md`
- `prompt/16-multi-tier-expansion-and-advanced-feature-gating.md`
- `README.md`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/crypto-execution.ts`
- `src/types/entitlements.ts`
- `src/lib/entitlements/student-entitlements.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/crypto-risk-engine.ts`
- `src/lib/crypto-execution/crypto-signal-routing.ts`
- `src/lib/crypto-execution/crypto-execution-worker.ts`
- `src/lib/crypto-execution/exchanges/index.ts`
- `src/lib/crypto-execution/exchanges/order-placement.ts`
- `src/lib/crypto-execution/exchanges/binance-adapter.ts`
- `src/lib/crypto-execution/exchanges/bybit-adapter.ts`
- `src/components/student-app/student-copier-client.tsx`
- `src/components/workspace/crypto-execution-ops-section.tsx`
- `src/components/admin/crypto-execution-ops-panel.tsx`

Also review the official Binance and Bybit API docs at implementation time for current order, permission, testnet, websocket/user-data stream, rate-limit, and error semantics. Do not rely on stale remembered exchange behavior for live-execution design.

Treat `src/types/entitlements.ts` and `src/lib/entitlements/student-entitlements.ts` as the entitlement source of truth.

Treat Stage 15F as closed paper-beta evidence. Do not weaken it while designing live execution.

---

## Stage Goal

Create a written live-execution safety design for TradeHub crypto Auto-Copy.

The target future behavior is:

1. A student pays for an Auto-Copy-enabled tier.
2. The student explicitly opts in to live Auto-Copy.
3. The student accepts live-trading risk disclosures separate from paper-mode consent.
4. The student connects a safe Binance/Bybit API key with withdrawals disabled.
5. An influencer/trader publishes a TradeHub trade instruction.
6. TradeHub checks entitlement, subscription, risk posture, connection health, kill switches, workspace approval, student preferences, and live beta allowlists.
7. TradeHub creates a live execution intent only when all checks pass.
8. A future live worker places the order server-side only.
9. TradeHub records order attempt, fill/rejection state, reconciliation state, audit events, and support-safe visibility.

Stage 15G must decide how that future system should work before Stage 15H implements sandbox/testnet order placement.

---

## What This Stage Must Produce

Create:

1. `prompt/15G-live-execution-safety-design-output.md`
   - The full live execution safety design.

2. `prompt/15G-live-execution-state-machine.md`
   - Proposed statuses, transitions, allowed actors, failure states, and retry/cancel semantics.

3. `prompt/15G-live-execution-testnet-qa-checklist.md`
   - The checklist that Stage 15H must satisfy before any production beta.

Update:

4. `plan.md`
   - Mark 15G as designed when complete.
   - Keep 15H and 15I as not started.

5. `prompt/promptsumary.md`
   - Add 15G to the Prompt 15 split.

Do not create production live routes, workers, Firestore live-status code, or UI controls that can place real orders.

---

## Required Design Sections

Your design output must include these sections.

### 1. Live Scope Decision

Define the first live path as **TradeHub-published trade instructions only**.

Do not design first live beta around automatically detecting a trader's external Binance/Bybit account orders. External master-account order ingestion must remain a later prompt because it requires private stream ingestion, order/fill deduplication, position matching, latency handling, reconciliation, and stronger incident semantics.

### 2. Roles And Approval Gates

Define the actors and what each can do:

- Student
- Influencer/workspace owner
- Super Admin
- System worker

Include approval gates for:

- platform live beta enablement;
- workspace live beta enablement;
- student live re-consent;
- student allowlist;
- exchange allowlist;
- symbol allowlist;
- max notional limits;
- kill-switch state;
- subscription and entitlement state.

### 3. Student Live Consent

Design a separate live-consent posture from paper Auto-Copy.

Required:

- explicit live trading opt-in;
- risk disclosure version;
- timestamp;
- source/IP/device metadata if already available safely;
- confirmation that connected exchange account is personal, not prop-firm or funded;
- confirmation that withdrawals are disabled on the exchange key;
- confirmation that live orders can lose money;
- ability to pause/revoke live consent.

Do not allow paper consent to imply live consent.

### 4. Live Entitlement And Billing Gate

Preserve Stage 16 entitlement logic.

Live eligibility must require:

- active paid subscription;
- Auto-Copy tier entitlement;
- personal account posture;
- no past-due block;
- no funded/prop-firm posture;
- workspace-approved state;
- platform/workspace/student live beta allowlist;
- safe exchange connection.

Paystack remains the default payment rail. Solana remains optional and separate from exchange trading.

### 5. Live Intent State Machine

Propose live-only statuses.

The design should consider statuses like:

- `proposed_live`
- `blocked_live`
- `ready_for_live`
- `queued_live`
- `submitting_live`
- `submitted_live`
- `partially_filled_live`
- `filled_live`
- `rejected_live`
- `cancel_requested`
- `cancel_submitted`
- `cancelled_live`
- `expired_live`
- `reconcile_required`
- `failed_live`

Define:

- who can create each state;
- what preconditions are required;
- valid transitions;
- terminal states;
- retryable vs non-retryable failures;
- idempotency keys;
- audit events for every transition;
- how paper statuses remain separate.

Do not add these statuses to TypeScript yet unless the output explicitly explains that code changes are deferred to 15H.

### 6. Order Sizing Rules

Design safe first-live sizing.

At minimum address:

- fixed notional per student;
- percent balance sizing;
- risk-per-trade sizing;
- min notional;
- max notional;
- daily max notional;
- max open orders;
- max open symbol exposure;
- max failed attempts before automatic pause;
- quote asset support;
- exchange precision/step-size rounding;
- insufficient balance;
- stablecoin/USDT assumptions;
- leverage disabled for first spot MVP.

Default recommendation should be conservative: spot only, no leverage, strict caps, and either fixed notional or low percent-balance sizing for the first production beta.

### 7. Supported Order Types

Decide what Stage 15H should test first.

Address:

- market order;
- limit order;
- stop loss / take profit handling;
- whether TP/SL are tracked as separate exchange orders or TradeHub-managed follow-up orders;
- one-cancels-the-other support if exchange supports it;
- what to defer.

For the first sandbox/testnet stage, prefer a minimal order surface that can be reconciled safely.

### 8. Exchange Connection Requirements

Design production live connection requirements:

- production key must be separately verified;
- withdrawals must be disabled;
- trading permission must be present;
- IP restrictions should be recommended where feasible;
- key must have fresh verification timestamp;
- stale/ambiguous permission checks fail closed;
- testnet/sandbox connection must remain separate from production connection;
- secret refs must stay server-only.

Never expose:

- API keys;
- API secrets;
- credential refs;
- encrypted blobs;
- signed payloads;
- raw exchange responses;
- service-account values.

### 9. Idempotency And Duplicate Prevention

Define:

- deterministic live intent IDs;
- deterministic live order attempt IDs;
- exchange client order IDs;
- how repeated worker runs avoid duplicate orders;
- how partial failures are recovered;
- how stale in-flight attempts are reconciled;
- how duplicate signal publish/update events are ignored.

### 10. Cancellation And Emergency Stop

Design:

- platform kill switch;
- workspace kill switch;
- student pause;
- symbol pause;
- exchange pause;
- cancel-open-orders workflow;
- cancel intent states;
- what kill switches stop immediately vs what requires exchange cancellation;
- operator runbook for emergencies.

### 11. Reconciliation And Monitoring

Define:

- how order status is checked after submission;
- how fills, partial fills, rejections, expirations, and unknown states are recorded;
- how often reconciliation runs;
- bounded queries;
- alert thresholds;
- operator dashboards;
- student/influencer visibility;
- audit events;
- support-safe diagnostics.

### 12. Failure Handling

Address:

- exchange timeout;
- network failure;
- rate limit;
- insufficient balance;
- invalid symbol;
- precision/lot-size error;
- market closed/unavailable pair;
- permission revoked;
- key deleted;
- account restricted;
- duplicate client order ID;
- unknown exchange response;
- worker crash after exchange submission;
- Firestore write failure after exchange submission.

For each class, decide whether the worker should retry, pause, reconcile, alert, or mark failed.

### 13. Firestore And API Migration Plan

Propose new protected records or fields without implementing them yet.

Consider:

- `live_execution_controls/current`
- `live_consents/current`
- live fields on execution preferences;
- live intent records or live-specific fields on execution intents;
- live order attempts;
- reconciliation records;
- incident/audit records;
- allowlist records;
- indexes needed for bounded worker queries.

Preserve server-side Admin SDK access and Firestore deny-by-default rules.

### 14. UI And Ops Plan

Design what each surface should show.

Student:

- live eligibility;
- live consent;
- live pause/revoke;
- connected production exchange status;
- live risk limits;
- order history;
- failure messages;
- no secrets.

Influencer:

- workspace live beta status;
- eligible student counts;
- live-blocked counts;
- signal execution summary;
- no raw credentials or private student account balances.

Super Admin:

- platform/workspace/student live gates;
- allowlists;
- kill switches;
- live worker controls;
- reconciliation queue;
- incident controls;
- audit trail;
- bounded previews.

### 15. Legal, Risk, And Product Copy

Draft the required product copy themes:

- live trading can lose money;
- TradeHub is not custodying funds;
- API withdrawals must be disabled;
- students remain responsible for connected exchange accounts;
- funded/prop-firm accounts are not eligible;
- live Auto-Copy can be paused/revoked;
- no guarantee of execution price, fill, latency, profit, or availability.

Do not write marketing hype.

### 16. Stage 15H Acceptance Criteria

Define what the next stage must prove before production:

- sandbox/testnet live order placed successfully;
- duplicate worker runs do not duplicate orders;
- kill switch blocks future orders;
- cancel path works in sandbox/testnet;
- reconciliation updates status;
- failure cases are safe;
- no secrets leak;
- Firestore rules deny client access;
- funded/prop-firm remains blocked;
- live status is unavailable without explicit live consent and allowlist.

---

## What This Stage Must NOT Do

Do **not**:

- place live Binance or Bybit orders;
- place sandbox/testnet orders yet;
- call `/api/v3/order` or `/v5/order/create` from any worker or route;
- add `ready_for_live` to production TypeScript types;
- add live queue queries;
- add live order attempt creation code;
- add a live worker route;
- make `CRYPTO_EXECUTION_LIVE_ENABLED` effective;
- wire `src/lib/crypto-execution/exchanges/order-placement.ts` into active runtime paths;
- add client Firestore access to protected execution collections;
- weaken Firestore rules;
- collect or expose real production exchange secrets;
- implement external master trader order ingestion;
- implement forex, MT4, MT5, cTrader, or FX Blue.

If you believe a small code change is required for documentation discoverability, keep it docs-only or explain why it should wait. The expected Stage 15G output is design documentation, not live execution code.

---

## Verification

After writing the docs, run:

```bash
npm run typecheck
npm run lint
npm run build
```

Also run safety scans:

```bash
rg -n "ready_for_live|queued_live|submitted_live|filled_live|placeBinanceOrder|placeBybitOrder|/api/v3/order|/v5/order/create" src scripts
rg -n "CRYPTO_EXECUTION_LIVE_ENABLED" src scripts
```

Expected:

- Typecheck passes.
- Lint passes.
- Build passes.
- Any live-status strings added by Stage 15G should appear only in docs or prompt files, not runtime `src` or `scripts`.
- Order endpoint matches should remain isolated to legacy `api/*.js`, server-only adapter files, or docs. They must not appear in active workers/routes/client UI.
- `CRYPTO_EXECUTION_LIVE_ENABLED` must not become an active production live-trading gate.

---

## Final Response Requirements

In the final response, include:

- files created or changed;
- a short summary of the live execution design decision;
- confirmation that no live trading code was added;
- verification results;
- the proposed next prompt name, which should be **Prompt 15H - Sandbox/Testnet Live Order Worker**, but only after 15G is reviewed and accepted.
