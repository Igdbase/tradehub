# TradeHub Stage 15 Crypto Auto-Copy Plan

## Where This Fits

Crypto Auto-Copy belongs in **Prompt 15** of the 19-stage TradeHub roadmap.

The original MVP boundary stops at **Prompt 14**. Prompt 15 is a post-MVP execution stage, but we are intentionally pulling the **crypto** part forward before forex because Binance and Bybit are already the clearest personal-account Auto-Copy rails in the PRD. Stage 16 was already pulled forward earlier to harden multi-tier entitlements, so Stage 15 can now plug real execution into the trusted entitlement model instead of inventing access rules again.

This work should be treated as:

- **Not part of the original 14-prompt MVP**
- **A Prompt 15 execution-stage extension**
- **Crypto-first before forex**
- **Built behind explicit opt-in, risk controls, and kill switches**
- **Only for personal exchange accounts, never prop-firm or funded accounts**

## Current Product Truth To Preserve

- Paystack remains the default payment rail.
- Solana remains optional and separate from exchange trading.
- Stage 16 entitlement logic remains the source of truth for who can access Auto-Copy.
- Funded-account and prop-firm students remain Signal Alerts only.
- Protected data continues through server-side Admin SDK API routes.
- No exchange secret should ever be stored or handled in browser-trusted state.
- Live order placement must never happen directly from a client button or public route without server-side verification.

## Current Stage 15 Progress

The current Stage 15 goal is to create and prove the crypto Auto-Copy foundation for **Binance and Bybit personal accounts** before any forex or live-execution expansion.

Current status:

1. **Execution data model - implemented in 15A**
   - Add server-trusted records for exchange connections, encrypted credential metadata, student execution preferences, signal execution intents, order attempts, execution audit events, risk decisions, and workspace kill-switch state.

2. **Student exchange connection flow - implemented in 15B**
   - Add a student-facing connection surface for Binance and Bybit.
   - Require explicit Auto-Copy opt-in and risk acknowledgement.
   - Verify the student is entitled to Auto-Copy before allowing setup.
   - Verify exchange API permissions before accepting a key.
   - Reject keys with withdrawal permission.
   - Store secrets only through server-side encrypted storage.

3. **Crypto exchange adapter layer - implemented for permission checks**
   - Binance and Bybit permission verification live in server-only adapter modules.
   - Withdrawal-enabled keys are rejected.
   - Permission adapter exports are separated from order-placement exports.
   - Order-placement code remains isolated and is not wired into the paper worker, public routes, or client UI.

4. **Risk policy engine - implemented in 15C and patched**
   - Enforces entitlement, opt-in, account type, signal status, crypto market, symbol allowlist, bounded risk settings, directional TP/SL sanity, sandbox-only controls, workspace kill switch, platform kill switch, student pause, and exchange connection health.
   - Sandbox-only mode prefers a verified sandbox/testnet connection over a newer production connection.

5. **Signal-to-paper routing - implemented in 15C**
   - When an influencer publishes a signal, route it in two paths:
     - Auto-Copy eligible personal exchange students get paper execution intents.
     - Funded or alerts-only students get Signal Alerts only.
   - The influencer should not manually choose each student path.

6. **Paper execution worker - implemented in 15D**
   - Super Admin can run a bounded server-side worker for one workspace.
   - The worker consumes only `ready_for_paper` intents with `paperTradingOnly: true`.
   - The worker creates idempotent paper order attempts and marks intents `completed_paper`.
   - The worker does not call Binance/Bybit order endpoints.

7. **Paper audit and support visibility - implemented in 15D/15E**
   - Record execution intents, risk decisions, paper order attempts, worker skip/failure state, and support-safe execution audit events.
   - Keep support-friendly student/order context available without exposing secrets.

8. **Workspace and admin visibility - implemented in 15E**
   - Influencer workspace should show Auto-Copy readiness, active/paused status, failed executions, student mode counts, and signal delivery/execution outcomes.
   - Super Admin should see global kill switches, workspace-scoped execution health, risky failures, paper worker results, and support diagnostics.
   - Raw secrets must never appear in either surface.

9. **Student visibility - implemented in 15E**
   - Student app should show exchange connection state, paper Auto-Copy mode, personal risk limits, recent paper intents/attempts, failures, pause/resume controls, and clear alerts-only fallback states.

10. **Paper beta seed data, rules tests, and QA - implemented and validated in 15F**
    - Deterministic seed, QA, and Firestore rules test scripts now exist.
    - `npm run firebase:rules:test` is now a real emulator-backed command instead of a placeholder.
    - Java 21 is installed locally and emulator-backed seed, Auth seed, QA, rules tests, and browser manual QA pass.
    - Final completion evidence is recorded in `prompt/15F-paper-beta-completion-note.md`.

11. **Live execution safety design - documented in 15G**
    - Production live execution state machine, consent model, sizing rules, cancellation, reconciliation, and incident runbooks were designed before production code.
    - No live execution code was added in 15G.

12. **Sandbox/testnet live order worker - implemented and validated in 15H**
    - Super Admin can run bounded Binance/Bybit sandbox/testnet lifecycle proof.
    - Production environment records remain non-consumable by the sandbox worker.
    - Full exchange order IDs are masked in student/influencer previews.

13. **Production live beta gate - implemented in 15I as fail-closed dry-run by default**
    - Adds production beta controls, consent/allowlist/entitlement/vault/cap gates, support-safe production previews, and Super Admin dry-run/reconciliation controls.
    - Production order calls require explicit env gates, Firestore platform/workspace controls, dry-run disabled, production vault readiness, and bounded Super Admin worker execution.
    - KMS/cloud-secret production credential storage is not implemented locally, so production order submission remains fail-closed pending a production vault adapter.

14. **Student production consent, symbol validation, and execution UI polish - implemented in 15J**
    - Market-aware signal validation now blocks forex pairs such as `EURUSD` from crypto execution and blocks crypto symbols such as `BTCUSDT` from forex signals.
    - Paper, live-sandbox, and production dry-run routing all fail closed with `crypto_symbol_invalid_for_market` for bad crypto symbols.
    - Student production live beta consent, pause, resume, and revoke actions now use protected server API routes and Admin SDK writes.
    - Execution previews hide invalid-market historical rows, shorten refs, and use less cramped stat layouts.

15. **Crypto execution completion and product stabilization - implemented in 15K**
    - Manual QA cleared the student copier production controls, Super Admin workspace preview, crypto/forex symbol separation, and the 15J directional-level patch.
    - Bybit Testnet reached the exchange and failed safely only because the test account had `0` usable USDT in Unified Trading, so 15K should document it as non-blocking instead of waiting on external testnet funds.
    - 15K productized student/influencer/admin crypto surfaces, removed fixture-heavy copy from normal views, kept diagnostics in Super Admin, and created final crypto completion evidence before forex work begins.

16. **Production credential vault and first live canary order - implemented in 15L**
    - 15L added Google Cloud Secret Manager credential-vault mode, protected production credential loading, and a separate Super-Admin-confirmed tiny production canary boundary.
    - Real production order calls remain blocked unless every env, Firestore, allowlist, consent, cap, vault, and kill-switch gate passes.
    - No broad production Auto-Copy or automatic production execution on signal publish was added.

17. **Production readiness preflight, balance guard, and publish review - implemented in 15M**
    - 15M adds support-safe production readiness/preflight summaries for Super Admin, student-facing production risk clarity, and influencer signal publish review.
    - Production canary now performs a server-only balance precheck before any exchange order adapter can be reached.
    - Automated QA remains fixture/mock safe and does not require real exchange funds.

18. **Cross-asset and forex paper foundation - implemented in 15N/15O**
    - 15N adds shared Auto-Copy execution mode, consent, sizing, stale-signal, confirmation, and student preference foundations across crypto and forex.
    - 15O adds forex paper-only routing, protected forex paper intents/attempts/risk/audit records, Super Admin forex paper worker controls, and bounded student/workspace/admin previews.
    - No MetaAPI token storage, broker calls, Telegram ingestion runtime, demo forex execution, or live forex execution was added in 15O.

19. **Forex broker / MetaAPI connection foundation - implemented in 15P**
    - 15P adds student-owned MetaAPI connection readiness metadata, server-only token storage boundaries, metadata verification, and support-safe student/workspace/Super Admin previews.
    - MetaAPI tokens are never returned to browser responses, Firestore client SDK paths remain denied, and forex remains paper/simulation-only.
    - No MetaAPI trade endpoint, broker demo/live order, Telegram ingestion runtime, or production crypto order was added.

20. **Billing-gated Forex AutoCopy provisioning foundation - implemented in 15R**
    - 15R corrects the normal student product flow so students do not enter MetaAPI tokens or MetaAPI account IDs.
    - Paid Forex AutoCopy students can submit MT4/MT5 broker details through a protected server route after Stage 16 entitlement, active paid billing, and personal-account checks.
    - The current provider is mock/dry-run only: broker passwords are discarded, no MetaAPI account/terminal is created, and no demo/live forex order is placed.
    - 15Q demo proof now requires paid Forex AutoCopy provisioning before it can route or process demo execution proof records.

21. **Forex AutoCopy checkout and subscription lifecycle gate - implemented in 15S**
    - 15S connects the manual `active_paid` Forex AutoCopy marker to a protected Paystack checkout/verify/cancel lifecycle.
    - Supported states are `active_paid`, `payment_pending`, `payment_failed`, `past_due`, `cancelled`, and `expired`; only `active_paid` unlocks MT4/MT5 broker provisioning and forex demo proof gates.
    - Cancelled, expired, and past-due states trigger mock provisioning cleanup/disable without MetaAPI cost or broker execution.
    - Student, influencer, and Super Admin previews show support-safe add-on billing/provisioning state only; broker credentials, MetaAPI fields, payment payloads, provider refs, and secrets stay hidden.

22. **Crypto AutoCopy checkout and subscription lifecycle gate - implemented in 15T**
    - 15T makes Crypto AutoCopy a separate TradeHub-managed paid add-on, parallel to Forex AutoCopy.
    - Student checkout/verify/cancel writes protected Paystack intent and subscription records under dedicated `crypto_autocopy_*` paths.
    - Active paid Crypto AutoCopy billing is now required, in addition to Stage 16 entitlement and personal-account posture, before Binance/Bybit setup, crypto AutoCopy preferences, production consent, or crypto paper routing can proceed.
    - No new exchange order call, production-live expansion, custody behavior, or API-secret exposure was added.

## Prompt Split And Current Status

Stage 15 crypto has been split into paper-first implementation prompts so each part can be verified before live execution is allowed.

### Prompt 15A - Crypto Auto-Copy Data Model And Server Boundary

Purpose:

- Add the Firestore/data model and TypeScript types for exchange connections, credential metadata, execution preferences, execution intents, order attempts, risk decisions, audit events, and kill switches.
- Add repository functions and API route boundaries without live exchange order placement.
- Preserve Stage 16 entitlement checks.

Expected output:

- Server-only repositories and mappers.
- Firestore rules/index updates if needed.
- Types for all execution states.
- No live trading yet.

Status: implemented.

### Prompt 15B - Student Binance/Bybit Connection And Permission Verification

Purpose:

- Build the student exchange connection flow.
- Verify API key permissions against Binance/Bybit before accepting a connection.
- Reject withdrawal-enabled keys.
- Store only encrypted secrets or encrypted-secret references server-side.
- Add student pause/resume and risk preference setup.

Expected output:

- Student app connection UI.
- Server API routes for connect/disconnect/verify.
- Exchange adapter permission checks.
- No signal-driven live trading yet.

Status: implemented and patched for sandbox default / sandbox-only production-key blocking.

### Prompt 15C - Risk Engine And Signal Routing

Purpose:

- Convert published signals into execution intents only for eligible, opted-in personal exchange students.
- Keep funded and alerts-only students on Signal Alerts.
- Enforce risk checks before any intent can become executable.

Expected output:

- Signal publish fan-out logic.
- Risk decision records.
- Workspace and student kill-switch checks.
- Paper/sandbox execution path first.

Status: implemented and patched for sandbox-aware connection selection plus directional TP/SL checks.

### Prompt 15D - Paper Execution Worker And Paper Order Attempts

Purpose:

- Add the super-admin-only server-side worker that consumes `ready_for_paper` intents.
- Make paper execution idempotent and auditable.
- Create paper order attempts only, without calling Binance/Bybit order endpoints.
- Keep live execution ineffective until a later separately approved live stage adds distinct live statuses and controls.

Expected output:

- Bounded paper worker route.
- Idempotent paper order attempts.
- Paper execution audit log.
- No live order placement.

Status: implemented and patched so the worker is paper-only.

### Prompt 15E - Paper Execution Visibility, Ops Controls, And QA Hardening

Purpose:

- Add mature operational visibility for students, influencers, and Super Admin.
- Show paper execution outcomes and support details without exposing secrets.
- Add bounded Super Admin paper worker controls.
- Add manual QA checklist and final verification for the paper crypto Auto-Copy beta.

Expected output:

- Student paper execution history and connection status.
- Influencer paper copier dashboard.
- Super Admin paper execution ops panel.
- Final safety checks before any later live beta prompt.

Status: implemented and patched for ordered previews, workspace-scoped Super Admin preview, and real bounded workspace counts.

### Prompt 15F - Paper Beta Seed Data, Rules Tests, And End-To-End QA

Purpose:

- Prove the Stage 15 paper system with deterministic seed data.
- Replace the placeholder Firestore rules test with real protected-data denial tests.
- Add QA scripts/checklists for entitlement, risk, routing, worker, and dashboard scenarios.
- Keep live execution disabled until a later separately approved live stage.

Expected output:

- Local/emulator-safe paper beta seed script.
- Real `npm run firebase:rules:test` coverage for protected crypto execution collections.
- Paper beta QA script.
- Manual QA checklist for student, influencer, and Super Admin surfaces.
- No live order placement.

Status: implemented and locally validated with Java 21, Firebase emulators, seeded Auth users, browser manual QA, and the Stage 15F completion note.

## Current Next Gate

Stage 15K is implemented as the crypto completion/productization pass. The next builder prompt is `prompt/15L-production-credential-vault-and-live-canary-order.md`.

15L is not broad production Auto-Copy. It is a narrowly scoped production canary plan:

- add a real production credential vault adapter;
- accept production credentials only through server-side permission checks and Stage 16 entitlement gates;
- keep production dry-run/gates fail-closed by default;
- require Super Admin typed confirmation before any real canary order;
- place at most one tiny allowlisted production spot order if every env, Firestore, consent, allowlist, cap, vault, and kill-switch gate passes;
- keep forex execution and external master-trader ingestion deferred.

Keep 15F/15H/15I/15J/15K green by rerunning the local validation suite:

```bash
npm run stage15f:seed
npm run stage15f:seed-auth
npm run stage15f:qa
npm run stage15h:seed
npm run stage15h:qa
npm run stage15i:seed
npm run stage15i:qa
npm run stage15j:qa
npm run stage15k:qa
npm run firebase:rules:test
```

Current validation:

- `java -version` reports OpenJDK 21.0.11 from Homebrew.
- `npm run firebase:rules:test` passes against the Firestore emulator.
- `npm run stage15f:seed` passes against the local emulator.
- `npm run stage15f:seed-auth` creates local Auth emulator users with matching Stage 15F claims.
- `npm run stage15f:qa` passes against the seeded emulator data.

Stage 15 paper/testnet/production-gated beta is validated at the seed/script/rules level through 15K. Browser-based manual QA should use `npm run dev:stage15f` so the app's Admin SDK and client auth both point at the local emulators.

Manual browser QA is complete for:

- Student copier paper readiness and paper execution history.
- Influencer workspace paper execution previews, student management, blocked risk decisions, and audit visibility.
- Super Admin workspace preview and bounded paper worker run for `ws_stage15f_paper_beta`.

Recorded manual result:

- Super Admin paper worker candidates: `4`.
- Processed: `3`.
- Completed paper: `3`.
- Skipped: `1`.
- Failed: `0`.

The skipped record is expected because Stage 15F seeds a non-paper `ready_for_paper` fixture to prove the worker refuses it.

Do not start 15L implementation until the builder has read the new 15L prompt and the owner understands that it is the first real-money canary stage, not a full production rollout.

## Live Execution Roadmap Before Prompt Creation

Stage 15F proves the paper-only system. The goal of live Auto-Copy is different: when an influencer/trader publishes a trade instruction, TradeHub should place corresponding orders on the personal Binance/Bybit accounts of students who explicitly paid, opted in, accepted risk terms, connected safe API keys, and passed all server-side checks.

The safe implementation order is:

### Prompt 15G - Live Execution Safety Design

Purpose:

- Design the real-money execution boundary before adding live order placement.
- Define the exact transition from paper intents to live intents.
- Decide which actor can enable live beta and at what scope: platform, workspace, student, exchange, and symbol.
- Define live-only statuses such as proposed `ready_for_live`, `queued_live`, `submitted_live`, `partially_filled_live`, `filled_live`, `rejected_live`, `cancel_requested`, `cancelled_live`, `reconcile_required`, and `failed_live`.
- Define order sizing rules: fixed notional, percent balance, risk-per-trade, minimum notional, max notional, leverage disabled for spot MVP, and per-student caps.
- Define supported order types for the first live beta: likely spot market or conservative limit orders only.
- Define cancellation, retry, idempotency, partial-fill, timeout, and duplicate-order prevention rules.
- Define monitoring, reconciliation, alerting, and emergency rollback.
- Define legal/risk copy and explicit student re-consent for live trading.
- Confirm whether the first live version is TradeHub-published signals only, not automatic detection of a trader's external exchange account orders.

Expected output:

- A written live execution safety design.
- A live status/state-machine proposal.
- A Firestore/API migration plan.
- A UI and operations approval plan.
- A QA checklist for sandbox/testnet live order placement.
- No live order placement yet.

Status: designed. Output recorded in `prompt/15G-live-execution-safety-design-output.md`, `prompt/15G-live-execution-state-machine.md`, and `prompt/15G-live-execution-testnet-qa-checklist.md`. No live execution code was added.

### Prompt 15H - Sandbox/Testnet Live Order Worker

Purpose:

- Implement real exchange order placement only against Binance/Bybit sandbox or testnet environments.
- Add distinct live-intent statuses without enabling production trading.
- Keep `CRYPTO_EXECUTION_LIVE_ENABLED` ineffective for production, or make it effective only for sandbox/testnet.
- Use the isolated server-only order-placement adapters, never client-side calls.
- Retrieve encrypted credentials only server-side.
- Record exchange request summaries, safe exchange response summaries, order attempts, fills, failures, and audit events without exposing secrets.
- Prove idempotency so the same intent cannot place duplicate exchange orders.
- Prove kill switches can stop pending and future live sandbox execution.
- Prove funded/prop-firm and alerts-only students remain blocked.

Expected output:

- Sandbox/testnet-only live order worker.
- Sandbox/testnet execution attempt records.
- Reconciliation/check-status path for sandbox/testnet orders.
- Super Admin controls for sandbox/testnet worker runs.
- Student and influencer visibility for sandbox/testnet live simulation status.
- Automated tests and manual QA against testnet credentials.
- No production order placement.

Status: implemented and completed as a sandbox/testnet-only lifecycle proof. Stage 15H adds live-sandbox records, bounded routing, Super Admin worker/reconcile/cancel routes, emulator-safe seed/QA fixtures, Firestore deny tests for live-sandbox records, support-safe previews, and a verified real Binance Spot Testnet BTCUSDT order that reached `filled_live`. Bybit Testnet is cleared for credential verification, real order endpoint reachability, sanitized insufficient-balance failure handling, and safe balance diagnostics; a Bybit `filled_live` proof is blocked only by the Bybit test account having `0` usable USDT in Unified Trading. Production live trading remains blocked, `CRYPTO_EXECUTION_LIVE_ENABLED` remains ineffective for production trading, and 15I now keeps production fail-closed behind a separate dry-run beta gate. Final completion evidence is recorded in `prompt/15H-sandbox-testnet-live-order-worker-completion-note.md`.

### Prompt 15I - Production Live Beta Gate

Purpose:

- Enable real-money production trading only for a tiny allowlisted beta.
- Require explicit Super Admin approval at platform, workspace, and student scope.
- Require student live-trading re-consent separate from paper Auto-Copy consent.
- Require production key verification with withdrawals disabled.
- Enforce strict caps: allowed symbols, per-order max, daily max, max open orders, max failed orders, and kill-switch thresholds.
- Add production incident controls: emergency stop, cancel-open-orders workflow, reconciliation queue, alerting, and operator runbooks.
- Add support-visible but secret-safe payment/subscription/execution context for resolving student issues.
- Add production monitoring dashboards and audit export.

Expected output:

- Production live beta gates and allowlist.
- Real-money worker path only behind all gates.
- Full audit and reconciliation.
- Operator runbook and rollback checklist.
- Manual QA with tiny production accounts only after sandbox/testnet passes.

Status: implemented as a fail-closed tiny beta gate with dry-run default, production previews, protected routes, deterministic emulator fixtures, and QA. Production order submission still requires a production-grade credential vault and explicit human approval before any real-money beta run.

### Prompt 15J - Student Production Consent, Crypto Symbol Validation, And Execution UI Polish

Purpose:

- Fix the manual QA issue where a forex pair such as `EURUSD` can appear inside crypto execution previews.
- Add market-aware workspace signal validation so crypto signals require crypto spot symbols and forex signals require forex pairs.
- Add server-side crypto routing guards so UI bypasses cannot create crypto execution intents for forex pairs.
- Add clear student production live consent, pause, resume, and revoke controls.
- Keep production consent separate from paper/testnet consent.
- Mature student/workspace/admin crypto execution panels so stat labels, pills, long IDs, and lists stay readable and contained.

Expected output:

- Market-aware signal validation in UI and server routes.
- Existing bad crypto execution rows hidden, blocked, or repaired with support-safe notes.
- Student production consent/revoke API routes and UI controls.
- Updated Stage 15J QA script and manual QA notes.
- Execution UI polish for bounded four-row lists and non-cramped stat cards.
- No production order placement.

Status: implemented. Stage 15J adds market-aware signal validation, server-side crypto symbol guards, student production consent/revoke API routes and UI controls, invalid-market preview hiding, execution UI containment, and `npm run stage15j:qa`. Production live trading remains blocked by the Stage 15I fail-closed gates.

### Prompt 15K - Crypto Execution Completion And Product Stabilization

Purpose:

- Finish the crypto Auto-Copy section before forex work begins.
- Productize student, influencer, and Super Admin crypto execution surfaces so they feel like a mature product instead of fixture/debug dashboards.
- Move deep diagnostics to Super Admin while keeping student/influencer views support-safe and understandable.
- Document the final crypto boundary: paper works, Binance testnet proof exists, Bybit exchange reachability/safe insufficient-balance failure is non-blocking, and production remains gated.
- Preserve all Stage 15I production gates and Stage 16 entitlement gates.
- Create final completion notes and QA evidence for future chats.

Expected output:

- Student, influencer, and Super Admin crypto UI stabilization.
- Fixture/debug wording removed from default student/influencer surfaces.
- Bounded four-row lists and responsive stat/card containment.
- Stage 15K QA script and manual QA notes.
- Stage 15K crypto completion note.
- No production order placement.
- No forex execution.

Status: implemented. Stage 15K productizes the crypto execution surfaces, adds `npm run stage15k:qa`, records final QA notes in `prompt/15K-crypto-execution-completion-qa-notes.md`, and records the crypto completion handoff in `prompt/15K-crypto-execution-completion-note.md`. Production live trading remains blocked by Stage 15I gates, forex remains deferred, and external master-trader ingestion remains deferred.

### Prompt 15L - Production Credential Vault And First Live Canary Order

Purpose:

- Add the first production-grade credential vault boundary so real production Binance/Bybit credentials are never stored in Firestore or local dev storage.
- Create the smallest safe bridge from production dry-run to one explicit real-money production canary order.
- Preserve Stage 16 entitlement checks, production consent, personal-account posture, allowlists, caps, kill switches, withdrawal-disabled key checks, and server-only Admin SDK access.
- Require Super Admin typed confirmation for any canary order call.
- Keep production Auto-Copy broad rollout, forex execution, and external master-trader ingestion deferred.

Expected output:

- Production cloud-secret credential vault adapter and readiness checks.
- Production credential store/load/revoke helpers that never expose secrets or vault refs to student/influencer UI.
- Super-Admin-only canary route or explicit canary mode for the production worker.
- Worker limit of `1` for real canary order calls.
- Tiny allowlisted spot `BUY` market canary only, with max notional defaulting to `5 USDT`.
- Idempotent order attempt reservation before exchange calls.
- Safe reconciliation and cancel paths for canary records only.
- Student/influencer/Super Admin previews that show canary state without secrets, raw exchange payloads, raw balances, or full order IDs.
- `npm run stage15l:qa` proving fail-closed gates with mocked exchange/vault seams.
- No broad production rollout.
- No forex execution.

Status: implemented as the first production-vault/canary bridge. Stage 15L adds Google Cloud Secret Manager credential storage mode, keeps local encrypted storage sandbox/testnet-only, adds a separate Super-Admin-only production canary route with typed `RUN_LIVE_CANARY` confirmation, limits real canary processing to one tiny spot `BUY` market order, and adds canary-only reconciliation/cancel API boundaries. Automated QA is `npm run stage15l:qa`. No real production order was placed during implementation; manual canary execution still requires explicit owner approval, real production credentials, Secret Manager readiness, production dry-run disabled, allowlists, caps, kill switches off, and immediate reconciliation.

### Prompt 15M - Production Readiness Preflight, Balance Guard, Student Risk UX, And Influencer Signal Publish Review

Purpose:

- Add support-safe production readiness/preflight visibility.
- Add server-only Binance/Bybit balance precheck adapters.
- Fail-close the production canary before order submission when balance cannot be confirmed.
- Improve student production risk copy and influencer signal publish review.
- Keep production canary narrow and fail-closed without requiring real exchange funds.

Expected output:

- Super Admin production readiness checklist.
- Server-only balance guard.
- Student production risk UX.
- Influencer publish review.
- `npm run stage15m:qa`.
- No production order placement.
- No broad production Auto-Copy.
- No forex execution.

Status: implemented. Stage 15M adds support-safe production readiness checklist summaries, server-only Binance/Bybit balance precheck adapters, canary balance fail-closed behavior before order submission, student production risk copy, influencer publish review, and `npm run stage15m:qa`; no real production order was placed.

### Prompt 15N - Cross-Asset Auto-Copy Consent, Execution Mode, Risk Preferences, And Stale-Signal Foundation

Purpose:

- Extract the reusable Auto-Copy model from the forex architecture note so crypto and future forex share student-owned consent, execution mode, sizing, risk limits, stale-signal policy, idempotency posture, fairness disclosure, and suitability acknowledgment.
- Keep Stage 15 crypto paper/testnet/gated-production behavior working while adding server-side confirm-before-execute and stale-signal checks.
- Make forex visible as a saved preference foundation and Signal Alerts-only posture before any MetaAPI execution work.
- Improve influencer publish review with bounded full-auto, confirmation-required, alerts-only, and blocked preference posture.
- Keep all protected Auto-Copy internals behind Admin SDK API routes and explicit Firestore deny rules.

Expected output:

- Shared cross-asset Auto-Copy types and server-only preference mapper/repository helpers.
- Student API route for shared Auto-Copy preference writes.
- Paper/live-sandbox/production-gated routing checks for confirm-before-execute and stale-signal policy.
- Protected confirmation and stale decision records for future notification/execution stages.
- Student Auto-Copy control center copy for crypto and forex foundation.
- Influencer publish review posture counts.
- `npm run stage15n:qa`.
- No production order placement.
- No live forex execution.
- No Telegram ingestion runtime.

Status: implemented. Stage 15N adds the shared cross-asset Auto-Copy preference model, student preference API, confirmation/stale-signal foundation, UI controls, bounded influencer posture counts, Firestore-denied shared Auto-Copy paths, and `npm run stage15n:qa`. Crypto remains protected by existing Stage 15 gates, production canary remains narrow/fail-closed, and external master-trader ingestion remains deferred.

### Prompt 15O - Forex Paper Auto-Copy Foundation

Purpose:

- Add a forex paper-only execution lane using the shared Auto-Copy model from Stage 15N.
- Route newly published valid forex signals into bounded paper intents for eligible full-auto students.
- Create confirmation-required records for confirm-before-execute or stale-confirmation students.
- Keep alerts-only, paused, revoked, stale-expired, unentitled, funded-account, prop-firm, and risk-blocked students out of paper execution.
- Add a Super Admin-only forex paper worker that records simulated attempts only.
- Keep MetaAPI, broker credentials, Telegram ingestion, demo forex execution, and live forex execution deferred.

Expected output:

- Protected forex paper intent, attempt, risk decision, and audit records.
- Server-only forex paper risk/routing/worker module.
- Student, influencer, and Super Admin support-safe forex paper previews.
- Explicit Firestore deny rules and rules-test coverage for forex paper paths.
- `npm run stage15o:qa`.
- No broker calls.
- No MetaAPI credential storage.
- No live forex execution.

Status: implemented. Stage 15O adds forex paper routing, confirmation/stale handling, simulated paper attempts, support-safe previews, a separate Super Admin forex paper worker, Firestore-denied forex execution paths, and `npm run stage15o:qa`. Forex remains paper-only; MetaAPI, Telegram ingestion, broker credentials, demo/live forex execution, and broad production trading remain deferred.

### Prompt 15P - Forex Broker / MetaAPI Connection Foundation

Purpose:

- Add a safe student-owned MetaAPI connection foundation for future forex readiness.
- Verify MetaAPI account metadata server-side without broker password collection or trade calls.
- Store MetaAPI tokens only through the server-only vault boundary or fail closed.
- Show student, influencer, and Super Admin readiness without enabling demo/live forex execution.

Expected output:

- Protected forex connection metadata under student-scoped workspace paths.
- Server-only MetaAPI metadata verification adapter.
- Student API routes for create, refresh, and disable.
- Student forex connection setup UI with one-time token submit and no token echo.
- Workspace and Super Admin support-safe readiness counts and audit previews.
- Explicit Firestore deny rules and rules-test coverage.
- `npm run stage15p:qa`.
- No MetaAPI trade calls.
- No broker demo/live execution.
- No Telegram ingestion runtime.

Status: implemented. Stage 15P adds server-only MetaAPI connection metadata verification, vault-backed or fail-closed token handling, protected forex connection/audit paths, student create/refresh/disable routes, student/workspace/Super Admin readiness previews, and `npm run stage15p:qa`. Forex remains paper/simulation-only; MetaAPI trade execution, broker demo/live execution, Telegram ingestion, and external master-trader ingestion remain deferred.

### Later Prompt - External Master Trader Order Ingestion

### Prompt 15Q - Forex Demo Execution Proof With MetaAPI Demo Only

Purpose:

- Add a strictly demo-only MetaAPI execution proof lane for future forex Auto-Copy.
- Route newly published valid forex signals into bounded `ready_for_forex_demo` records only for eligible full-auto students with verified demo MetaAPI token storage.
- Keep confirm-before-execute and stale-signal policies from Stage 15N active.
- Add a Super Admin-only typed-confirmation worker, reconciliation, and cancellation boundary.
- Keep demo order calls disabled and dry-run by default.

Expected output:

- Protected forex demo controls, intents, attempts, gate decisions, reconciliation records, and audit events.
- Server-only MetaAPI demo trade adapter seam.
- Student, influencer, and Super Admin support-safe forex demo previews.
- Firestore-denied forex demo paths and ordered preview/worker indexes.
- `npm run stage15q:qa`.
- No production forex execution.
- No MetaAPI broker calls unless explicit demo env/platform/workspace gates are open.
- No Telegram ingestion runtime.

Status: implemented. Stage 15Q adds a demo-only MetaAPI proof lane behind env/platform/workspace controls, typed Super Admin worker confirmation, dry-run defaults, server-side token loading, bounded reconciliation/cancel paths, support-safe previews, Firestore deny rules, and `npm run stage15q:qa`. Production/live forex, Telegram ingestion, external master-trader ingestion, and broad production crypto trading remain deferred.

This is more advanced than the first live beta. It would connect a trader's own Binance/Bybit account, watch their real orders/fills, and copy them to students. That requires private user-data stream ingestion, deduplication, position matching, latency handling, reconciliation, and stronger failure semantics.

First live beta should use TradeHub-published trade instructions. External master-account mirroring should wait until after the safer TradeHub-published live path is proven.

## Still Non-Goals Until A Later Production Rollout

- Do not place broad production Binance or Bybit orders yet.
- Do not run any real production order outside the future 15L canary path with explicit human approval, production vault readiness, dry-run evidence, strict caps, and post-run reconciliation.
- Do not collect exchange secrets in the browser beyond a one-time secure submit flow.
- Do not implement live forex, FX Blue, cTrader, MT4, MT5, MetaAPI broker execution, or Telegram ingestion yet.
- Do not route funded-account students into Auto-Copy.
- Do not weaken Firestore rules.
- Do not bypass Stage 16 entitlement checks.
- Do not hide execution failures from students or operators.
- Do not make `CRYPTO_EXECUTION_LIVE_ENABLED` sufficient for production trading.
- Do not wire `src/lib/crypto-execution/exchanges/order-placement.ts` into client UI or unapproved broad workers.

## Short MVP Note

This is **Prompt 15**, immediately after the original 14-prompt MVP. It is technically post-MVP, but it is the right next build item if TradeHub wants automatic crypto trading in the early product. Current Stage 15 status is crypto-first through a fail-closed production beta gate, with 15K completed as the crypto stabilization pass before forex, 15L implemented as the first production-vault/live-canary bridge, 15M tightening readiness/balance/product clarity, 15N extracting the cross-asset Auto-Copy foundation, 15O adding forex paper-only simulation, 15P adding forex MetaAPI connection readiness only, and 15Q adding a MetaAPI demo-only proof lane behind dry-run defaults and Super Admin controls. The safest wording is:

> TradeHub MVP remains complete at Stage 14. Crypto Auto-Copy is a Stage 15 post-MVP execution extension, pulled forward before forex because Binance and Bybit are the clearest personal-account automation rails and Stage 16 has already prepared the entitlement gates. Stages 15A-15K prove and productize the crypto foundation, paper execution, sandbox/testnet lifecycle, fail-closed production beta gate, consent controls, symbol validation, directional-level validation, and crypto completion evidence. Stage 15L adds the production credential vault boundary and one tiny Super-Admin-confirmed canary path, 15M adds production readiness preflight and balance guards, 15N adds the shared cross-asset Auto-Copy consent/execution-mode/risk/stale-signal foundation, 15O adds forex paper simulation only, 15P adds MetaAPI connection readiness only, and 15Q adds MetaAPI demo-only proof with dry-run defaults. No real production order has been placed by default. Broad production trading, live forex execution, Telegram ingestion, and external master-trader ingestion remain deferred to later separately approved stages.



# TradeHub — Manual Strategy Backtesting (Chart Replay) — Architecture v3

*Supersedes v2. v2 assumed forex/CFD (MT5) only; this version reflects two facts from a platform-level architecture update: TradeHub is now positioned as an educator platform where AutoCopy (forex and crypto) is an optional premium feature, not the core product — and Replay/backtesting now supports crypto symbols alongside forex/CFD from the start.*

---

## Version History

- **v1:** Assumed "backtesting" meant replaying an influencer's historical Telegram signals. Superseded.
- **v2:** Pivoted to a TradeZella-style manual chart-replay tool for a student's own independent strategies, MT5-first.
- **v3 (this doc):** Two changes from a platform-level architecture update:
  1. TradeHub is now an educator platform (courses, communities, signals, subscriptions). "Signal-copying" is renamed **Forex AutoCopy**; a new **Crypto AutoCopy** (via exchange APIs, no MetaAPI) sits alongside it. Both are optional premium features, not the core product.
  2. Replay/backtesting supports **crypto symbols alongside forex/CFD from launch**, not forex-only.

---

## 1. Core Experience (Locked)

- Student picks an asset class (Forex/CFD or Crypto) and a symbol within it — Forex/CFD via MT5 at launch (FX majors/minors, XAUUSD, indices), Crypto via a shared historical data source (§3) regardless of which exchange the student eventually connects for live AutoCopy
- Picks a chart timeframe (M15/H1/H4/D1-equivalent, normalized across asset classes — §3) and a historical date range
- Sets a mock starting balance (matching real/planned account size) and risk % per trade
- Presses play: candles reveal one at a time — "the chart unfolds bar by bar, you cannot see the future." Hard architectural requirement, not just UX (§4)
- Places market/limit/stop orders as a setup appears, drag-to-place SL/TP directly on the chart, auto position sizing from risk % — asset-class-aware, via the shared risk engine (§5) — optional auto-breakeven and trailing stop
- Session ends → trades log into a practice analytics dashboard (win rate, profit factor, R-multiple, drawdown, equity curve, calendar heatmap), filterable by Playbook and by asset class

---

## 2. Charting Engine

- **TradingView Lightweight Charts** (open-source) — asset-agnostic candle rendering; no changes needed to support crypto alongside forex, it just draws whatever OHLC series it's given
- Custom overlay for order ticket UI, draggable SL/TP price lines, entry/exit markers — same non-trivial build regardless of asset class (unchanged from v2)
- Replay controls: Play/Pause, step forward/back, "Go to" jump, timeline scrubber
- v1 of this feature: single symbol, single chart, one asset class per session — a student picks forex OR crypto for a given session, not mixed in one chart. Multi-symbol/multi-chart stays a separable later add-on.

---

## 3. Historical Data Service

Formalizing this as a dedicated service, not just a cache table. Responsibilities:
- Download candles from the appropriate provider
- Cache candles (below)
- **Normalize symbols** across providers — MT5's `XAUUSD` vs. an exchange's `BTCUSDT` keep their native strings, but internal storage tags each with a canonical `asset_class` + `provider` so nothing else in the system has to special-case naming
- **Normalize timeframes** — store internally as a duration in minutes (1, 15, 60, 240, 1440) instead of each provider's own string (MT5's `M15` vs. an exchange's `15m`); each adapter translates its own format to/from this canonical form
- Retry failed downloads, rate limiting, basic data validation

Everything needing candles consumes this service. Nothing queries a provider's API directly from application code.

### MarketDataProvider Interface

```
Replay Engine
   ↓
Historical Data Service
   ↓
MarketDataProvider Interface
   ↓
MetaAPI Adapter (Forex/CFD)     Binance Adapter (Crypto)
```

- **Forex/CFD:** MetaAPI, via the platform-owned utility MT5 account (unchanged from v2) — matches the actual broker feed a student would eventually trade on live.
- **Crypto:** Binance's public market-data API as the v1 adapter. Major exchanges' prices track closely enough (arbitrage keeps them tight) that one deep, long-history, free source is enough for *replay* — it doesn't need to match whichever exchange a student eventually connects for live Crypto AutoCopy, the same way forex replay data was never tied to a student's personal account. Binance's historical klines endpoint is public — no API key needed, which is simpler than the forex path, not harder.
- Future adapters (cTrader, Match-Trader, Bybit, OKX, etc.) plug into the same interface without touching the replay/fill engine — this was the v2 design already; the platform-level update confirms it was the right call.

### Account Linkage (carries forward from v2)

A student practicing needs to do this *before* linking a live/funded account of any kind. Forex/CFD: the platform-owned utility MetaAPI account (v2 decision, unchanged). Crypto: not even needed — Binance's public API supplies historical data with no authentication.

### Caching

```
Provider API → Historical Data Service → TradeHub Cache → Students
```
Identical historical candles are never re-requested — serve from cache, fetch only what's missing. Reduces load on the metered MetaAPI path especially, and keeps the (free) Binance path efficient too.

### Dual-Resolution Fetch (unchanged principle from v2)

Cache both the display timeframe and a 1-minute-equivalent series for the same range, for both asset classes. Display timeframe drives what's rendered; the finer series drives fill-checking (§4).

---

## 4. Replay & Fill Engine

- Buffered pull, not push (unchanged): rolling client-side buffer, refilled via Edge Function calls as it runs low. Deterministic historical dataset regardless of asset class — no websocket/Realtime infrastructure needed.
- Forward-bias prevention is architectural, not discipline (unchanged): the server never sends candles past the current reveal index.
- Same-bar SL/TP conflicts resolved by walking the finer (1-minute-equivalent) series in order, for both asset classes. Conservative same-bar tie-break (SL first) only as a last-resort fallback.
- Client-side fill evaluation for responsiveness; authoritative server-side recheck on session save.

---

## 5. Shared Risk Engine

The platform-level update calls for **one risk calculation engine**, used by Replay, Backtesting, Journaling, Forex AutoCopy, and Crypto AutoCopy. That's right at the level of *concept* — risk % of account, converted into a position size given a stop distance — but the actual math can't be one formula across asset classes:

- **Forex/CFD:** pip value, lot size (standard/mini/micro), broker leverage limits
- **Crypto:** contract/coin quantity, tick size, exchange-specific leverage limits

**Design:** one shared risk-engine core (account size + risk % + entry + stop → required "risk units") sitting behind a pluggable **InstrumentSpec** adapter per asset class, which converts risk units into an actual order size using that asset class's unit economics. Same adapter pattern as MarketDataProvider, applied to sizing instead of price data — keeps "one risk engine" true in spirit without pretending forex lots and crypto contracts are the same thing.

Auto-breakeven and trailing-stop logic stay specific to the practice/Replay engine, not folded into the shared core — that logic doesn't exist in live AutoCopy execution (unchanged reasoning from v2).

---

## 6. Data Model (updated)

```sql
practice_sessions (
  id, user_id, asset_class ('forex_cfd' | 'crypto'), platform_source,
  symbol, chart_timeframe, date_start, date_end,
  starting_balance, risk_pct, playbook_id nullable fk,
  status, current_candle_index, created_at, completed_at
)

practice_orders (
  id, session_id fk, order_type, direction,
  requested_price, filled_price, size, sl, tp,
  trailing_stop_distance nullable, auto_breakeven_trigger nullable,
  opened_at_candle_time, closed_at_candle_time,
  close_reason, pnl, r_multiple,
  mfe_r nullable, mae_r nullable,
  tags jsonb nullable, notes text nullable, screenshot_urls text[] nullable,
  created_at
)

playbooks (
  id, user_id, name, description nullable,
  created_at, archived_at nullable
)

historical_candle_cache (
  provider, asset_class, symbol, timeframe_minutes,
  range_start, range_end, candles jsonb, fetched_at
)
```

Changes from v2: `practice_sessions` gains `asset_class` and `platform_source` (which MarketDataProvider adapter serviced this session — `metaapi_mt5` or `binance`, for now). `historical_candle_cache` keys on a canonical `timeframe_minutes` instead of a provider-specific string, and gains `provider`/`asset_class` so the same symbol string from two providers never collides.

Playbooks stay asset-class-agnostic on purpose — a student's "London Breakout" playbook is forex, "BTC Range Scalp" is crypto, but both are just named strategies in the same table. No schema change needed there.

---

## 7. Analytics Dashboard (v1 scope)

- Win rate, profit factor, avg R-multiple, max drawdown, equity curve — per Playbook, per tag, and now also filterable by asset class (forex vs. crypto), since a student may run both
- Avg MFE/MAE per Playbook
- Calendar heatmap of daily P&L
- Kept **separate** from AutoCopy performance (forex or crypto) — practicing your own reads is a different skill from copying someone else's calls, regardless of asset class
- "Best trade times," trade-duration breakdowns, deeper reports: later, not blocking

---

## 8. Explicitly Out of Scope for This Build

- Automated no-code (plain-English strategy → auto-run) mode
- Guided pre-built scenario library
- Multi-symbol / multi-chart sessions, and mixing forex + crypto in a single session
- Built-in ICT-style indicators (fair value gaps, order blocks)
- Building Bybit/OKX/Bitget/KuCoin *data* adapters specifically for Replay — Binance alone covers backtesting needs at this stage; the others only become relevant if live Crypto AutoCopy execution needs their exchange-specific specs, which is separate work from this doc

---

## 9. Reference: What Came From the TradeZilla PRD

Boss shared a full PRD for a TradeZilla-style institutional trade journal + backtesting platform (scripting DSL, genetic-algorithm optimization, Monte Carlo simulation, Kafka/Kubernetes/Terraform, IB/Tradovate/Alpaca broker integrations, SOC2/on-prem enterprise tier). Treated as reference material, not a build spec — none of that infrastructure fits a feature inside TradeHub's educator platform, where AutoCopy is an optional feature for forex and crypto traders.

**Folded into this doc, because they're genuinely cheap and useful at TradeHub's scale:**
- Ad-hoc trade tags, alongside the structured Playbook (§6, §7)
- Trade notes + screenshots (§6) — journaling, no new infrastructure beyond a storage bucket
- MFE/MAE per trade (§6, §7) — nearly free since the fill-checking walk (§4) already has the data

**Independently validated, no change needed:**
- Their look-ahead-bias risk mitigation matches the forward-bias requirement already locked in §4
- Their recommended chart stack (TradingView Lightweight Charts + Tailwind) matches what's already locked in §2

**Considered, not adopted:**
- Their "compare live journaled trades vs. backtested strategies on one dashboard" — doesn't map cleanly here, since AutoCopy means copying someone else's signals, not the student executing their own independent strategy. The §7 decision to keep practice and AutoCopy analytics separate stands.

---

## 10. Open Items

- [x] Data layer: platform-agnostic `MarketDataProvider` interface, MetaAPI (forex) + Binance (crypto) as the two v1 adapters
- [x] Starting balance: editable per session
- [x] Strategy tracking: structured `playbooks` entity
- [x] Crypto scope: supported from the start, via Binance's public API — no student exchange keys needed for Replay
- [x] Sequencing: keep deepening this architecture now — foundational platform pieces (auth/workspace/courses/subscriptions) are a separate, parallel track
- [ ] Confirm which MT5 symbols the utility historical-data account needs market-watch access to
- [ ] Confirm the canonical crypto symbol set to support at launch (majors like BTC/ETH, or broader)
- [ ] Fold the "simulated practice, not real fills" disclaimer into the pending fintech lawyer consultation
- [ ] Decide where the InstrumentSpec sizing-adapter pattern (§5) lives long-term — this doc, or a platform-level shared risk engine doc

---

*Version: Backtesting Architecture v3. Supersedes v2's forex-only scope; v2's Playbook, tagging, MFE/MAE, and forward-bias decisions carry forward unchanged.*

---

# Practice Terminal Roadmap - FXReplay-Inspired, TradeHub-Native

Reference date: 2026-08-04.

This roadmap is based on the FXReplay-style screenshots reviewed on 2026-08-04. Treat FXReplay as product inspiration only: do not copy their branding, exact layout, icons, text, or interaction details. Build a TradeHub-native practice terminal that fits the existing student app, journal, playbook, and AutoCopy boundaries.

Current foundation already exists through Stage 17H:

- Historical candle fetch/cache
- Forward-bias-safe replay reveal
- Simulated market/limit/stop orders
- SL/TP, partial close, manual close, conservative fill rules
- Practice analytics
- Playbooks and playbook performance
- Session finish/review/reflection
- Text-only annotations and main lesson
- Journal integration for practice/backtesting activity

Hard boundaries for every stage below:

- Practice-only unless a stage explicitly says otherwise.
- Do not add live broker/exchange execution.
- Do not call private Binance/Bybit APIs.
- Do not expose or collect MetaAPI student credentials for practice.
- Do not expose vault refs, raw provider payloads, exchange account IDs, broker passwords, or secrets.
- Do not couple Practice Terminal actions to AutoCopy execution.
- Keep Firestore browser rules deny-by-default for practice storage paths.
- Keep all historical/replay reads server-owned and forward-bias-safe.
- Do not add paid PDF, screenshot, news, WhatsApp, SMS, email, or market-data services.

## Stage 18A - Practice Terminal Shell

Goal: turn the existing replay page into a focused, full-screen "Practice Terminal" experience while preserving the Stage 17 server boundaries.

Builder prompt:

```text
Implement Stage 18A: Practice Terminal Shell.

Build a TradeHub-native, FXReplay-inspired practice terminal without copying FXReplay branding, exact layout, icons, or text.

Scope:
- Add a terminal-style replay surface for existing practice sessions, either as `/app/practice/[sessionId]/terminal` or as a terminal mode on `/app/practice/[sessionId]`, following the repo's routing patterns.
- Keep the existing normal replay page working.
- Add a full-screen terminal layout:
  - top toolbar with back/session controls, symbol, timeframe, current OHLC summary, replay progress, Go To placeholder, Indicators placeholder, Journal/Review shortcut, and layout placeholder
  - left vertical drawing toolbar with buttons/placeholders for cursor, horizontal line, zone/rectangle, text note, measurement, delete selected annotation
  - large main chart area using existing revealed candle API only
  - bottom trading/status bar with Buy, Sell, quantity/risk input surface, starting/current balance, realized P&L, unrealized P&L placeholder, replay speed, play/pause, step, and jump controls
  - right drawer/panel with order ticket, active orders, playbook selector, analytics, annotations, and reflection/review shortcuts
- Upgrade `/app/practice` quick session creation so it feels closer to a backtesting app:
  - session name
  - starting balance
  - asset selector
  - symbol
  - timeframe
  - start/end date
  - random start toggle placeholder
  - open terminal after create
- Preserve existing Stage 17H behavior and APIs.
- Do not add real execution, private exchange calls, MetaAPI student credentials, raw provider payloads, vault refs, paid services, screenshots, or PDFs.
- Keep forward-bias lock: terminal chart must only render candles returned by `/api/student/practice/sessions/[sessionId]/candles`.
- Add focused QA for terminal route/shell, preserved old replay route, server candle boundary, and no forbidden provider/execution calls.

Verification:
- npm run stage18a:qa
- npm run stage17h:qa
- npm run stage17g:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build

Manual QA:
1. Start emulators and dev server.
2. Sign in as a student.
3. Open `/app/practice`.
4. Create a BTCUSDT session with a custom name and starting balance.
5. Open terminal mode.
6. Confirm the large chart renders revealed candles only.
7. Confirm top toolbar, left toolbar, bottom bar, and right drawer render without mobile/desktop text overlap.
8. Step/play candles and confirm progress persists.
9. Confirm existing normal replay page still works.
```

Exit criteria:

- The terminal is usable as the main practice screen.
- The old replay route is not broken.
- Layout is professional on desktop and acceptable on tablet/mobile.
- No security boundary is weakened.

## Stage 18B - Terminal Order Ticket And Fast Simulated Trade Actions

Goal: make order placement feel like a trading terminal while staying fully simulated.

Builder prompt:

```text
Implement Stage 18B: terminal order ticket and fast simulated trade actions.

Scope:
- Add a terminal order ticket in the right drawer and/or bottom bar.
- Support simulated market, limit, and stop orders using the existing Stage 17C/17D server routes.
- Add Buy and Sell buttons that prefill direction.
- Add risk presets and quantity/notional fields, still validated server-side.
- Add SL/TP inputs with clear directional validation messages.
- Add optional order tags and checklist notes.
- Add open/pending/closed order list optimized for quick scanning.
- Add quick actions for cancel pending, manual close, partial close, and edit SL/TP.
- Keep all actual mutation calls through protected student API routes.
- Do not add live broker/exchange calls or private provider APIs.
- Do not add AutoCopy coupling.

Verification:
- npm run stage18b:qa
- npm run stage18a:qa
- npm run stage17h:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- A student can place and manage simulated trades from the terminal without scrolling through large forms.
- Server validation remains the source of truth.
- Completed sessions remain locked from further mutation.

## Stage 18C - Drawing Tools And Chart Annotation Layer

Goal: add simple chart drawings that connect to the existing Stage 17H annotation model.

Builder prompt:

```text
Implement Stage 18C: practice drawing tools and chart annotation layer.

Scope:
- Add text-only/persisted drawing records for:
  - horizontal price line
  - vertical time marker
  - rectangle/zone
  - arrow/marker if easy in the existing chart library
  - text note
- Store only safe drawing metadata: type, revealed candle index/time, optional price, optional second point, label, color token, order attachment, main lesson flag.
- Enforce server-side ownership and no future candle references beyond currentCandleIndex.
- Render drawings on the terminal chart when possible.
- Let students edit/delete their own drawings.
- Link drawings to session review and journal main lesson when marked.
- Do not store screenshots or uploaded image files.
- Do not expose raw candle/provider payloads.

Verification:
- npm run stage18c:qa
- npm run stage18b:qa
- npm run stage17h:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Students can mark up charts during replay.
- Drawings never reference unrevealed future candles.
- Journal/review can show safe summary labels.

## Stage 18D - Indicators And Revealed-Candle Overlays

Goal: add basic indicators without introducing look-ahead bias.

Builder prompt:

```text
Implement Stage 18D: revealed-candle-only indicators.

Scope:
- Add indicator settings for:
  - SMA
  - EMA
  - RSI
  - ATR
  - volume moving average if volume is present
- Compute indicators only from revealed candles, either client-side from revealed API response or server-side from the same bounded candle slice.
- Persist per-session indicator settings.
- Render overlays/panels in terminal mode.
- Add clear empty states when too few candles are revealed.
- Do not compute using the full hidden candle range.
- Do not add paid data providers or external indicator services.

Verification:
- npm run stage18d:qa
- npm run stage18c:qa
- npm run stage17h:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Indicators update as candles are revealed.
- QA proves indicators cannot see future candles.

## Stage 18E - Multi-Timeframe, Go-To, Random Start, And Bookmarks

Goal: make backtesting navigation feel fast while preserving historical-data limits.

Builder prompt:

```text
Implement Stage 18E: replay navigation upgrades.

Scope:
- Add timeframe selector for supported intervals already allowed by the historical data service.
- Add Go To candle/date within the session range.
- Add random start support for new sessions, selecting a valid bounded start point server-side.
- Add bookmarks for important revealed candles.
- Add next/previous bookmark controls.
- Keep replay state persisted per session.
- If changing timeframe would need unavailable data, fail closed with a safe message.
- Do not reveal candles beyond currentCandleIndex unless the user explicitly advances/jumps within allowed bounds.
- Do not add multi-chart sessions yet.

Verification:
- npm run stage18e:qa
- npm run stage18d:qa
- npm run stage17h:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Students can navigate sessions quickly without accidentally seeing future data.
- Random starts are server-bounded and reproducible enough for review.

## Stage 18F - Practice Challenge Rules

Goal: add optional prop-firm-style practice rules without connecting to funded accounts or live execution.

Builder prompt:

```text
Implement Stage 18F: practice challenge rules.

Scope:
- Add optional challenge settings per practice session:
  - profit target
  - max daily loss
  - max total drawdown
  - max open simulated trades
  - max trades per session/day
  - minimum trading days placeholder if easy
- Evaluate rules from simulated practice orders only.
- Display challenge status in terminal and `/app/practice` overview.
- Add warnings when a simulated action would breach a challenge rule.
- Keep funded/prop-firm real-account language clearly separate from practice-only challenge simulation.
- Do not connect to real prop firms, brokers, MetaAPI live accounts, or AutoCopy.

Verification:
- npm run stage18f:qa
- npm run stage18e:qa
- npm run stage17h:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Challenge mode can be used as a simulator.
- No real funded-account or live-account implication exists.

## Stage 18G - News And Event Markers Without Paid APIs

Goal: provide event-awareness on the chart using safe internal/manual data first.

Builder prompt:

```text
Implement Stage 18G: manual/static news and event markers.

Scope:
- Add server-owned event marker model for economic/news events.
- Start with manually seeded/static events only.
- Render event markers on terminal chart when their time is within the revealed candle window.
- Add event list panel with safe title, time, currency/asset tags, and impact label.
- Allow student notes/reflection to reference event markers.
- Do not add paid news APIs, scraping, browser-side external calls, or auto trading around news.
- Do not show future events beyond the current revealed replay time unless they are part of setup metadata without market direction.

Verification:
- npm run stage18g:qa
- npm run stage18f:qa
- npm run stage17h:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- News/event awareness exists without paid services.
- Forward-bias safety remains intact.

## Stage 18H - Mobile, Tablet, And Dense UI Polish

Goal: make the terminal usable on phones/tablets and fix the recurring cramped-label problem across dense panels.

Builder prompt:

```text
Implement Stage 18H: Practice Terminal responsive polish.

Scope:
- Audit terminal, replay, journal, copier, and practice pages for text wrapping, cramped stat cards, nested cards, and overflow on mobile/tablet.
- Convert dense metric cards to stable responsive grids with sane min widths.
- Use icon buttons with accessible labels/tooltips for terminal controls where appropriate.
- Add responsive drawer behavior:
  - bottom sheet on mobile
  - side drawer on desktop
- Keep chart large and primary.
- Avoid visible feature-instruction copy inside the trading surface unless it communicates state or safety.
- Do not change business logic or security rules unless a layout bug exposes unsafe data.

Verification:
- npm run stage18h:qa
- npm run stage18g:qa
- npm run stage17h:qa
- npm run typecheck
- npm run lint
- npm run build

Manual QA:
- Desktop wide
- Laptop
- Tablet portrait/landscape
- Phone portrait
```

Exit criteria:

- The terminal feels like a real tool, not a stack of cards.
- Labels do not split into ugly vertical letters.
- No content overlaps the fixed navigation/footer.

## Stage 18I - Practice Import And Export

Goal: let students keep their practice data portable without exposing protected internals.

Builder prompt:

```text
Implement Stage 18I: practice import/export.

Scope:
- Add student-owned CSV export for:
  - sessions
  - simulated orders
  - closed trade summaries
  - playbooks
  - annotations
  - reflections
- Add optional JSON export for full practice backup if simple.
- Add import for playbooks only at first.
- Do not export raw provider payloads, hidden unrevealed candles, vault refs, credentials, or AutoCopy internals.
- Do not add PDF generation or paid storage.

Verification:
- npm run stage18i:qa
- npm run stage18h:qa
- npm run stage17h:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Students can export safe practice records.
- Import cannot overwrite other students' data.

## Stage 18J - Historical Data Provider Expansion

Goal: expand useful symbols after the terminal is stable.

Builder prompt:

```text
Implement Stage 18J: historical data provider expansion.

Scope:
- Add provider interfaces for Forex/CFD historical data using a platform utility account or approved public provider.
- Support XAUUSD and major Forex pairs first.
- Keep fail-closed behavior when provider credentials/configuration are missing.
- Do not use student MetaAPI credentials for practice historical data.
- Do not add live order execution.
- Do not add paid services without separate approval.
- Keep symbol normalization explicit: canonical symbol stays separate from provider symbol.
- Add QA proving provider data cannot expose credentials/raw payloads and cannot cross-contaminate crypto/forex symbol caches.

Verification:
- npm run stage18j:qa
- npm run stage18h:qa
- npm run stage17h:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- XAUUSD/major Forex practice sessions can be created when the utility data provider is configured.
- Missing provider config produces a clean, safe blocked state.

## Stage 18K - Practice Instrument Specs And Sizing Accuracy

Goal: make practice sizing, P&L, R, quantity labels, price precision, and pip/tick distance instrument-aware for crypto, Forex majors, and XAUUSD/CFD practice symbols.

Builder prompt:

```text
Implement Stage 18K: practice instrument specs and sizing accuracy.

Scope:
- Add a safe practice-only instrument spec abstraction for BTCUSDT, ETHUSDT, XAUUSD, and major Forex pairs.
- Include canonical symbol, asset class, display name/category, price precision, quantity/lot precision, pip/tick size, pip/tick label, conservative notional multiplier, and bounded simulated size assumptions.
- Use specs in server-side simulated order sizing, P&L, R, analytics/journal/export surfaces, and terminal/replay displays where relevant.
- Keep provider symbol separate from canonical symbol.
- Make UI copy clear that practice values are estimates and may differ by broker.
- Preserve hidden-candle, AutoCopy, payment, provider, credential, and live-execution boundaries.

Verification:
- npm run stage18k:qa
- npm run stage18j:qa
- npm run stage18i:qa
- npm run stage18h:qa
- npm run stage17h:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- BTCUSDT remains regression-safe.
- XAUUSD and Forex pairs show practice lots/pips/ticks instead of confusing crypto-style quantity math.
- Server remains the source of truth for simulated sizing and lifecycle.

## Stage 18L - Practice Session Management Dashboard

Goal: make `/app/practice` a useful dashboard for students managing many practice/backtesting sessions.

Builder prompt:

```text
Implement Stage 18L: practice session management dashboard.

Scope:
- Add session search, filters, sorting, and bounded load-more behavior on /app/practice.
- Show session name, symbol, market, timeframe, status, progress estimate, balance/equity, realized P&L, linked playbook, challenge state, and last updated.
- Add protected server-owned session actions for resume/review links, duplicate setup, archive, and restore.
- Hide archived sessions by default and show them through an Archived filter.
- Duplicate sessions must copy setup only and never copy orders, annotations, drawings, bookmarks, reflections, hidden candles, or ledger entries.
- Preserve all practice-only, hidden-candle, credential, provider, AutoCopy, payment, and live-execution boundaries.

Verification:
- npm run stage18l:qa
- npm run stage18k:qa
- npm run stage18j:qa
- npm run stage18i:qa
- npm run stage18h:qa
- npm run stage18g:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Students can manage many practice sessions without touching execution, credentials, or AutoCopy.
- Archived sessions are hidden by default but restorable from the Archived filter.
- Duplicate creates a clean draft setup copy only.

## Stage 18M - Practice Analytics And Session Comparison

Goal: add practice-only aggregate analytics so students can review performance across sessions, symbols, playbooks, and challenge attempts.

Builder prompt:

```text
Implement Stage 18M: practice analytics and session comparison.

Scope:
- Add server-computed analytics from bounded student-owned simulated practice sessions and orders only.
- Add /app/practice sections for equity curve, drawdown curve, daily P&L, symbol breakdown, playbook breakdown, best/worst sessions, recent completed sessions, challenge pass/fail/active summary, and two-session comparison.
- Reuse existing practice performance/playbook/challenge helpers where possible.
- Keep instrument-aware calculations compatible with Stage 18K.
- Add clear empty states when no closed simulated trades exist.
- Do not fetch hidden candles or expose provider payloads, Firestore internals, account IDs, vault refs, credentials, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.

Verification:
- npm run stage18m:qa
- npm run stage18l:qa
- npm run stage18k:qa
- npm run stage18j:qa
- npm run stage18h:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Students can compare practice session summaries without exposing protected internals.
- Analytics derive from closed simulated practice trades and bounded student-owned records only.
- Practice analytics remain separate from AutoCopy/live execution.

## Stage 18N - Practice Session Report And Print Review

Goal: add a clean browser-printable practice report for one active or completed session using student-owned simulated practice data only.

Builder prompt:

```text
Implement Stage 18N: practice session report and print review.

Scope:
- Add a protected student report API and /app/practice/[sessionId]/report view.
- Include session details, performance metrics, challenge summary, playbook breakdown, closed simulated orders, best/worst trade, annotations/drawings, event-linked notes, reflection/main lesson, and safe fee/spread/slippage assumptions.
- Add report entry points from /app/practice, /app/practice/[sessionId], and /app/practice/[sessionId]/terminal.
- Add Print / Save PDF using browser print only, with print CSS that hides navigation/actions and keeps report sections readable.
- Add safe empty states for no closed trades, no reflection, and no annotations.
- Do not generate PDFs server-side, store screenshots/PDFs, fetch hidden candles, expose provider payloads, Firestore internals, account IDs, vault refs, credentials, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.

Verification:
- npm run stage18n:qa
- npm run stage18m:qa
- npm run stage18l:qa
- npm run stage18i:qa
- npm run stage18h:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Students can open and browser-print a safe report for one practice session.
- Report data is bounded, student-scoped, and does not return hidden candles or protected internals.
- Browser print is the only PDF path; TradeHub does not generate, upload, or store PDFs.

## Stage 18O - Workspace-Safe Practice Insights

Goal: add educator-safe practice analytics so workspace owners can understand student backtesting progress without private raw journal or trade details.

Builder prompt:

```text
Implement Stage 18O: workspace-safe practice insights.

Scope:
- Add a protected workspace practice insights API.
- Return aggregate/bounded/safe summaries only: active practice students, sessions by status, closed simulated trades, aggregate practice P&L, average win rate, average R, challenge pass/fail/in-progress counts, most practiced symbols, most used playbooks by name only, and recent completed session summaries with masked student identifiers.
- Add a compact /workspace Practice Insights UI section with empty states and clean filters for status, symbol, timeframe, and date range where reasonable.
- Do not expose raw journal entries, full trade-by-trade history, hidden candles, provider payloads, Firestore internals, account IDs, vault refs, credentials, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.
- Do not add PDF generation, screenshots/uploads, paid analytics/storage, provider calls, private exchange APIs, or live execution.

Verification:
- npm run stage18o:qa
- npm run stage18n:qa
- npm run stage18m:qa
- npm run stage18l:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Workspace owners can see bounded aggregate practice progress on /workspace.
- Student identifiers in recent completed summaries are masked and private trade/journal details are not returned.
- Practice insights remain separate from AutoCopy/live execution and protected practice storage remains deny-by-default to browsers.

## Stage 18P - Workspace Practice Assignments And Drills

Goal: let workspace owners create safe practice assignments for students while keeping student practice trades, notes, candles, and journal details private.

Builder prompt:

```text
Implement Stage 18P: workspace practice assignments and drills.

Scope:
- Add a workspace-owned practice assignment model with title, instructions, market, symbol, timeframe, optional date range/random start/starting balance/challenge/suggested playbook, due date, and draft/active/archived status.
- Add protected workspace assignment API routes for create/list/update/archive.
- Add student /app/practice active-assignment list and start action.
- Starting an assignment creates a student-owned practice session with safe assignment metadata snapshot only.
- Workspace assignment progress returns aggregate counts only: assigned, started, completed, average P&L, average R, challenge pass/fail/in-progress counts, and masked recent completions.
- Do not expose raw student trades, journal notes, hidden candles, order-by-order records, drawings, annotations, reflections, provider payloads, credentials, vault refs, or AutoCopy internals.
- Keep practice-only boundaries and deny-by-default Firestore browser access for protected assignment paths.

Verification:
- npm run stage18p:qa
- npm run stage18o:qa
- npm run stage18n:qa
- npm run stage18m:qa
- npm run stage18h:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Workspace owners can create and archive practice drills from /workspace.
- Students can start active assignments from /app/practice.
- Workspace assignment progress is aggregate-only and uses masked completion refs.
- Student session/order/note/candle/reflection privacy remains intact.

## Stage 18Q - Instructor Feedback And Rubric For Practice Assignments

Goal: let workspace owners review completed practice assignment summaries and leave structured, privacy-safe feedback for students.

Builder prompt:

```text
Implement Stage 18Q: instructor feedback and rubric for practice assignments.

Scope:
- Add a workspace/influencer feedback workflow for completed assignment sessions.
- Workspace feedback lists must show safe completed assignment summaries only, with masked student/session refs.
- Add rubric scores for setup quality, risk management, execution discipline, review/reflection quality, and overall score.
- Add bounded instructor note, optional recommended next drill, edit/update support, reviewed status, safe timestamps, and reviewer display label.
- Attach feedback to the student-owned assignment session through a protected server route.
- Students should see received instructor feedback on /app/practice, printable reports, terminal/review, and the Practice/backtesting journal summary where clean.
- Do not expose raw student journal entries, hidden candles, full private trade-by-trade detail beyond existing safe report summaries, annotations/drawings/reflections to workspace, provider payloads, credentials, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.
- Keep practice-only boundaries and deny-by-default Firestore browser access for feedback paths.

Verification:
- npm run stage18q:qa
- npm run stage18p:qa
- npm run stage18o:qa
- npm run stage18n:qa
- npm run stage18m:qa
- npm run stage18h:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Workspace owners can review completed assignment summaries and save/update rubric feedback.
- Feedback writes are workspace-scoped, server-owned, and target student-owned completed assignment sessions through opaque refs.
- Students can see their own feedback on practice/report/terminal/journal surfaces.
- Workspace feedback views do not reveal raw trades, journal entries, hidden candles, notes, reflections, secrets, provider payloads, or AutoCopy internals.

## Stage 18R - Practice Assignment Review Queue And Resubmissions

Goal: make workspace assignment review usable and allow safe student resubmissions without exposing private practice internals.

Builder prompt:

```text
Implement Stage 18R: practice assignment review queue and resubmissions.

Scope:
- Add a workspace Practice Review Queue for completed assignment attempts with filters for assignment, needs review, feedback draft, feedback published, resubmission requested, and completed.
- Keep queue rows safe: masked student/session refs, assignment title, completed time, rubric summary, and challenge summary only.
- Add feedback draft/published state. Students only see published feedback.
- Workspace can save draft feedback, publish feedback, and request resubmission with bounded reason, optional due date, and optional rubric area to improve.
- Student /app/practice should show assignment status: not started, in progress, completed, feedback available, or resubmission requested.
- Starting a resubmission creates a fresh student-owned practice session from assignment setup only, with safe linkage: assignmentId, attempt number, previous attempt masked ref, and resubmission status.
- Do not copy orders, candles, notes, drawings, annotations, bookmarks, reflections, ledger records, hidden data, raw student IDs, raw session IDs, provider payloads, credentials, or AutoCopy internals.

Verification:
- npm run stage18r:qa
- npm run stage18q:qa
- npm run stage18p:qa
- npm run stage18o:qa
- npm run stage18n:qa
- npm run stage18m:qa
- npm run stage18h:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Workspace owners can filter a review queue, save drafts, publish feedback, and request resubmissions.
- Students only see published feedback and can start a fresh setup-only resubmission.
- Assignment progress includes reviewed/resubmission aggregate counts and average rubric score.
- Workspace review and resubmission flows remain practice-only and privacy-safe.

## Stage 18S - Practice Cohorts, Assignment Scheduling, And Student Task Inbox

Goal: let workspace instructors organize students into safe practice cohorts, schedule assignments, and give students a clear task inbox for active and due practice drills.

Builder prompt:

```text
Implement Stage 18S: practice cohorts, assignment scheduling, and student task inbox.

Scope:
- Add workspace-owned practice cohorts with name, optional description, active/archived status, and bounded opaque student refs.
- Add protected workspace cohort API routes for create/update/archive and add/remove refs.
- Extend practice assignments with availability start, due date, optional close date, and target cohorts.
- Block assignment starts when assignment is draft/archived, student is outside targeted cohorts, before availability start, or after close date.
- Due date should show overdue state without blocking starts unless close date has passed.
- Add /app/practice Practice Task Inbox states for available, due soon, overdue, completed, feedback available, and resubmission requested.
- Workspace assignment dashboard should show cohort targeting and aggregate-safe assigned, started, completed, overdue, and resubmission counts.
- Do not expose raw private practice internals, raw trades, hidden candles, notes, reflections, provider payloads, credentials, or AutoCopy internals.

Verification:
- npm run stage18s:qa
- npm run stage18r:qa
- npm run stage18q:qa
- npm run stage18p:qa
- npm run stage18o:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Workspace owners can create/update/archive cohorts using opaque student refs only.
- Assignments can be scheduled and targeted to cohorts.
- Student start/resubmission starts are blocked by status, cohort, availability, and close-date gates server-side.
- Student /app/practice shows a task inbox with due/overdue/closed states.
- Workspace progress remains aggregate-safe and practice-only.

## Stage 18T - Cohort Roster Picker And Assignment Calendar Polish

Goal: make Stage 18S usable for instructors without manually typing opaque student refs, and make assignment scheduling easier to understand.

Builder prompt:

```text
Implement Stage 18T: cohort roster picker and assignment calendar polish.

Scope:
- Add a safe roster picker/search to workspace cohort management using students already visible through existing workspace student APIs.
- Let instructors add/remove cohort members from picker controls while cohort storage still stores only safe opaque student refs.
- Show selected member chips/cards with safe display labels and member count.
- Add a compact assignment calendar/schedule view on /workspace with availability start, due date, close date, status, target cohorts, and aggregate-safe progress.
- Add filters for active/draft/archived, cohort, due soon, overdue, and closed.
- Improve /app/practice task inbox copy for available, due soon, overdue but open, not available yet, closed, completed, and resubmission requested.
- Do not expose raw practice sessions, trades, hidden candles, notes, reflections, journals, provider payloads, credentials, vault refs, or AutoCopy internals.

Verification:
- npm run stage18t:qa
- npm run stage18s:qa
- npm run stage18r:qa
- npm run stage18p:qa
- npm run stage18o:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Instructors can manage cohort membership from loaded workspace student rows without manually typing refs.
- Assignment schedule/calendar view is filterable by status, cohort, and timing.
- Student task inbox has clearer date-state copy while server start gates remain unchanged.
- Storage and APIs remain practice-only and privacy-safe.

## Stage 18U - In-App Practice Notifications And Task Reminders

Goal: add safe in-app notification/reminder surfaces for practice assignments so students and workspace users can see important task states without email, SMS, WhatsApp, push, or paid notification services.

Builder prompt:

```text
Implement Stage 18U: in-app practice notifications and task reminders.

Scope:
- Add /app/practice Practice Notifications / Task Alerts for new available assignments, due soon assignments, overdue-open assignments, closed assignments, published feedback, resubmission requested, and resubmission due/overdue states.
- Alerts should link to safe in-app actions: start assignment, continue session, view feedback, or start resubmission.
- Add bounded student-owned read/dismiss state through protected Admin SDK routes if clean.
- Add workspace aggregate notification counts for needs review, overdue, resubmissions requested, and feedback drafts not published.
- Keep alerts bounded, sorted by urgency/date, and free of raw session IDs, raw student IDs, hidden candles, trades, notes, journal internals, provider payloads, credentials, vault refs, or AutoCopy internals.
- Do not add email, SMS, WhatsApp, push, paid messaging, live execution, provider APIs, uploads, screenshots, PDFs, or paid storage.

Verification:
- npm run stage18u:qa
- npm run stage18t:qa
- npm run stage18s:qa
- npm run stage18r:qa
- npm run stage18p:qa
- npm run stage18o:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Students see safe in-app practice alerts with read/dismiss support.
- Workspace users see aggregate notification counts only.
- Alert routes are protected and student/workspace scoped.
- Firestore remains deny-by-default for notification state.
- No external notification or execution surfaces are added.

## Stage 18V - Practice MVP Freeze And Browser Smoke Pack

Goal: Stop adding major practice/backtesting features and harden the existing practice product enough for a demo through source-level smoke coverage, route/workflow checks, docs cleanup, and only small bug/layout fixes if found.

Builder prompt:

```text
Implement Stage 18V: practice MVP freeze and browser smoke pack.

Scope:
- Add or update a seeded demo/smoke scenario for one complete student practice flow: create/use playbook, create BTCUSDT practice session, open terminal, reveal candles, place simulated order, close/finish session, and load reflection/report/journal surfaces.
- Add route/workflow smoke checks for /app/practice, /app/practice/[sessionId], /app/practice/[sessionId]/terminal, /app/practice/[sessionId]/report, /app/journal, workspace practice insights/assignments, student task inbox, and student notifications.
- Use existing browser-smoke helpers if available; otherwise add lightweight source/route smoke checks that require no paid services or external provider credentials.
- Fix only obvious regressions found by smoke checks.
- Confirm terminal, chart shell, event markers, order ticket, indicators, drawings, bookmarks, challenge, analytics, task inbox, notifications, report, and journal load safely.
- Update stale handoff metadata in plan.md, manual-test-backlog.md, and prompt/promptsumary.md.
- Add a short "Must Test Before Demo" section to manual-test-backlog.md.
- Do not add new major product surfaces, live execution, AutoCopy coupling, provider/private exchange calls, student MetaAPI credentials, paid services, hidden candle export, raw provider payloads, credentials, raw student/session IDs in workspace surfaces, or AutoCopy internals.

Verification:
- npm run stage18v:qa
- npm run stage18u:qa
- npm run stage18t:qa
- npm run stage18s:qa
- npm run stage18r:qa
- npm run stage18p:qa
- npm run stage18o:qa
- npm run stage18n:qa
- npm run stage18m:qa
- npm run stage18h:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- A Stage 18V smoke script covers the complete student practice demo path and workspace-safe practice surfaces.
- Docs and handoff metadata identify `TH-2026-08-20-STAGE18V-PRACTICE-MVP-SMOKE-HANDOFF`.
- Manual demo browser checks are captured in `manual-test-backlog.md`.
- The stage remains a freeze/smoke pass, not a feature expansion.

## Stage 18W - Practice Launch Copy, Empty States, And Onboarding Polish

Goal: make the practice backtesting product understandable and demo-ready for real students and instructors through small copy, empty-state, and helper-text polish only.

Builder prompt:

```text
Implement Stage 18W: practice launch copy, empty states, and onboarding polish.

Scope:
- Polish /app/practice first-run and empty states for no playbooks, sessions, assignments, notifications, analytics, imported/exported data, and recent practice orders.
- Add clear student onboarding copy for the recommended flow: create a playbook, create or start a practice session, open terminal, reveal candles, place a simulated order, finish session, and review report/journal.
- Polish terminal copy so students understand practice-only, simulated-orders-only, revealed-candles-only, no broker/exchange order placement, and indicators/events/drawings as learning tools.
- Polish assignment/task/notification copy for available, due soon, overdue but still open, closed, completed, feedback published, and resubmission requested.
- Polish report and journal empty states for no closed trades, no reflection, no playbook activity, no instructor feedback, and no AutoCopy activity.
- Add small non-invasive helper text where the flow is unclear.
- Keep terminal layout stable and do not redesign the chart workspace.
- Do not add new major product surfaces, live execution, AutoCopy coupling, provider/private exchange calls, student MetaAPI credentials, paid services, hidden candle export, raw provider payloads, credentials, raw student/session IDs in workspace surfaces, or AutoCopy internals.

Verification:
- npm run stage18w:qa
- npm run stage18v:qa
- npm run stage18u:qa
- npm run stage18t:qa
- npm run stage18s:qa
- npm run stage18r:qa
- npm run stage18p:qa
- npm run stage18o:qa
- npm run stage18n:qa
- npm run stage18m:qa
- npm run stage18h:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Students can understand the practice flow from first run through report/journal without extra instruction.
- Terminal and replay/report/journal copy consistently state practice-only and simulated-only boundaries.
- Workspace practice copy remains aggregate-safe and privacy-safe.
- Docs and handoff metadata identify `TH-2026-08-20-STAGE18W-PRACTICE-LAUNCH-POLISH-HANDOFF`.

## Stage 18X - Practice MVP Final Acceptance And Deferred QA Closeout

Goal: freeze the practice/backtesting MVP as demo-ready from source-level QA, organize deferred manual QA, and make the next product-area handoff clear.

Builder prompt:

```text
Implement Stage 18X: Practice MVP Final Acceptance And Deferred QA Closeout.

Scope:
- Add a final Stage 18X QA script that verifies the complete practice MVP surface: /app/practice dashboard, terminal route, replay route, report route, journal practice/backtesting, workspace insights, assignments, cohorts, feedback, review queue, notifications, import/export, historical providers, instrument specs, print/report safety, and Firestore deny-by-default practice paths.
- Verify source-level boundaries: practice-only, simulated orders only, revealed-candle-only replay, no hidden candle export, no AutoCopy execution coupling, no live broker/exchange calls, no private Binance/Bybit APIs, no MetaAPI student credentials for practice, no vault refs, secrets, account IDs, broker passwords, raw provider payloads, and no paid PDF/screenshot/upload/email/SMS/WhatsApp/push/news/storage services.
- Update manual-test-backlog.md so deferred manual QA is grouped into Must Test Before Demo, Nice To Test, and Later Regression, with exact local setup commands and seeded login notes where available.
- Update prompt/promptsumary.md with the final practice MVP summary, what was added beyond the original MVP, and the instruction that the next product area should be chosen separately.
- Mark practice/backtesting MVP as source-QA frozen.
- Do not redesign UI or add new product features unless a clear regression is found.

Verification:
- npm run stage18x:qa
- npm run stage18w:qa
- npm run stage18v:qa
- npm run stage18u:qa
- npm run stage18t:qa
- npm run stage18s:qa
- npm run stage18r:qa
- npm run stage18q:qa
- npm run stage18p:qa
- npm run stage18o:qa
- npm run stage18n:qa
- npm run stage18m:qa
- npm run stage18l:qa
- npm run stage18k:qa
- npm run stage18j:qa
- npm run stage18i:qa
- npm run stage18h:qa
- npm run stage17h:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- `npm run stage18x:qa` verifies the complete practice MVP source surface and security/privacy boundaries.
- `manual-test-backlog.md` keeps browser QA deferred but organized for demo readiness.
- `prompt/promptsumary.md` points future resumes at `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`.
- Practice/backtesting MVP is source-QA frozen.
- Practice/backtesting should not receive more major feature stages until browser demo QA is complete.

Recommended next-stage options outside practice:

- Course/lesson polish and educator content workflows.
- Workspace onboarding, student CRM, and operational readiness.
- Payment/subscription operations hardening.
- AutoCopy support/admin operations without broadening live execution.
- Public launch/landing/policy hardening.

## Stage 19A - Course And Lesson Experience Audit Foundation

Goal: improve the course/lesson learning experience without changing payment gates, role security, practice boundaries, or AutoCopy execution boundaries.

Builder prompt:

```text
Implement Stage 19A: Course And Lesson Experience Audit Foundation.

Scope:
- Inspect existing Course Hub and student course routes/components.
- Add a focused Stage 19A QA script that documents current course/lesson surfaces and expected boundaries.
- Improve course/lesson empty states and helper copy where the UI is unclear.
- Confirm student course access remains gated by existing entitlement, subscription, and course rules.
- Confirm workspace/influencer course management remains workspace-scoped.
- Confirm student notes/progress remain student-owned and protected.
- Add deferred course/lesson manual QA to manual-test-backlog.md.
- Update plan.md and prompt/promptsumary.md with Stage 19A as the new product-area start.
- Do not redesign the full course system yet.
- Do not add paid video hosting, file uploads, external email/SMS/WhatsApp, AI grading, or new payment flows.
- Do not touch practice/backtesting, AutoCopy, MetaAPI, Binance/Bybit, broker, vault, or live execution logic.

Verification:
- npm run stage19a:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Student `/app/courses` and `/app/courses/[courseId]` surfaces have clearer empty, locked, and progress-state copy.
- Workspace `/workspace/courses` and course editor surfaces clarify draft/publish rules, safe YouTube IDs, HTTPS attachment metadata, and workspace-scoped writes.
- Stage 19A QA documents current course APIs, entitlement/subscription/course access gates, student-owned progress, validation boundaries, and Firestore deny-by-default fallback.
- No payment, practice, AutoCopy, provider credential, exchange, broker, vault, live execution, upload, messaging, paid video hosting, or AI grading behavior changes are added.

Reference:

```text
TH-2026-08-20-STAGE19A-COURSE-LESSON-AUDIT-HANDOFF
```

Recommended next Course/Lesson stage:

- Stage 19B should focus on course navigation and lesson authoring ergonomics: clearer section ordering, lesson reorder/delete safety, course preview states, and mobile reader polish.

## Stage 19B - Course Navigation And Lesson Authoring Ergonomics

Goal: Improve the course/lesson experience without changing existing course security, entitlement, progress, or workspace ownership models.

Builder prompt:

```text
Implement Stage 19B: Course Navigation And Lesson Authoring Ergonomics.

Scope:
- Improve `/app/courses` course list navigation and empty/locked states.
- Improve the lesson reader with previous/next controls, course outline/current lesson highlight, locked lesson clarity, and mobile reader polish.
- Keep progress state student-owned and server-enforced.
- Improve workspace course editor ergonomics with module grouping, lesson reorder controls, safer lesson removal, draft/published preview clarity, and clearer validation guidance.
- Keep workspace-scoped authoring only.
- Do not expose one workspace course to another workspace.
- Do not change payment/subscription entitlement rules.
- Do not add uploads, paid video hosting, PDFs, messaging, AI grading, AutoCopy, MetaAPI, Binance/Bybit, broker, vault, or live execution behavior.
- Keep YouTube IDs and HTTPS attachment metadata validation bounded.
- Keep Firestore browser rules deny-by-default for course/progress storage.

Verification:
- npm run stage19b:qa
- npm run stage19a:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Student `/app/courses` has search/filter navigation and clear no-match/locked states without bypassing protected student course APIs.
- Student `/app/courses/[courseId]` has clear course outline, current lesson highlight, previous/next controls, next-locked messaging, student-owned progress copy, and mobile outline polish.
- Workspace course list/editor clarify student preview state for draft/published/archived courses.
- Workspace course editor supports section/module and lesson reordering, plus confirmation before removing a lesson from the next saved course structure.
- Stage 19B QA confirms entitlement, workspace, progress, validation, and deny-by-default boundaries remain intact.

Reference:

```text
TH-2026-08-20-STAGE19B-COURSE-NAV-AUTHORING-HANDOFF
```

Recommended next Course/Lesson stage:

- Stage 19C should focus on lesson progress detail, course completion certificates/badges only if they can be browser-safe and non-PDF, or quiz/readiness polish without adding AI grading or uploads.

## Stage 19C - Course Progress, Completion, And Proof Of Completion

Goal: Add a clean course completion layer for students and aggregate-safe completion visibility for workspace users, without changing entitlement/security rules.

Builder prompt:

```text
Implement Stage 19C: Course Progress, Completion, And Proof Of Completion.

Scope:
- Show clearer student course progress summaries: lessons completed, total lessons, percent complete, next lesson, and completed/locked/in-progress status.
- Add course completion state when all required lessons are complete.
- Add a student-owned completion/proof page or panel.
- Add browser-only Print / Save proof with print CSS. Do not generate or store PDF files.
- Add workspace aggregate-safe course completion visibility: eligible count, started count, completed count, average progress, and recent completions with masked/safe student refs only.
- Completion must be derived from signed-in student-owned progress and published course lesson requirements.
- Completion/proof must not be forgeable from browser-only state.
- Keep existing entitlement, subscription, tier, published-course, progress ownership, and workspace-scope gates intact.
- Do not add uploads, paid storage, paid PDF generation, paid video hosting, messaging, AI grading, AutoCopy, MetaAPI, Binance/Bybit, broker, vault, or live execution behavior.

Verification:
- npm run stage19c:qa
- npm run stage19b:qa
- npm run stage19a:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Student course cards and lesson reader show source-of-truth progress summaries, next lesson hints, completion state, and proof entry points.
- `/app/courses/[courseId]/proof` renders a browser-printable proof from the protected student completion API.
- Incomplete/locked/unentitled courses do not produce printable completion proof.
- Workspace Course Hub and dashboard course visibility surfaces show aggregate completion counts and masked recent completions only.
- Stage 19C QA confirms no payment, provider, execution, upload, messaging, paid PDF, AI, or Firestore rule boundary changes.

Reference:

```text
TH-2026-08-20-STAGE19C-COURSE-COMPLETION-PROOF-HANDOFF
```

Recommended next Course/Lesson stage:

- Stage 19D should focus on quiz/readiness ergonomics or lesson notes polish while preserving student-owned notes/progress and avoiding AI grading, uploads, or new payment flows.

## Stage 19D - Lesson Checks And Quiz Readiness, No AI Grading

Goal: Add simple course lesson checks/quizzes so students can prove understanding before completion, while keeping grading deterministic, bounded, and server-owned.

Builder prompt:

```text
Implement Stage 19D: Lesson Checks And Quiz Readiness, No AI Grading.

Scope:
- Add lesson check UI in the student lesson reader.
- Support multiple choice, true/false, and short text self-check questions. Short text is ungraded reflection only.
- Show attempt status, score, pass threshold, and correct/incorrect question numbers after submit.
- Do not expose hidden answer keys before submission.
- Required checks must pass before the lesson can be marked complete.
- Add workspace authoring for deterministic checks: add/edit/delete questions, answer keys for objective questions, pass threshold, and required/optional toggle.
- Attempts must be server-validated.
- Do not trust browser-computed scores.
- Store student-owned safe attempt summaries only.
- Completion/proof should respect required passed checks.
- Workspace sees aggregate-safe readiness only: attempted count, passed count, average score, and masked recent completions.
- Do not expose raw student answers to workspace.
- Do not add AI grading, proctoring, uploads, screenshots, PDFs, messaging, paid services, external quiz providers, file storage, practice changes, AutoCopy, provider credentials, or live execution behavior.

Verification:
- npm run stage19d:qa
- npm run stage19c:qa
- npm run stage19b:qa
- npm run stage19a:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Student lesson reader renders safe lesson checks without answer keys.
- Protected student attempt route grades objective questions server-side and stores only attempt summaries.
- Required checks block lesson completion and completion proof until passed.
- Workspace editor supports bounded deterministic check authoring.
- Workspace Course Hub and course visibility surfaces show aggregate-safe readiness counts only.
- Stage 19D QA confirms no AI, payment, provider, execution, upload, messaging, paid PDF, or Firestore rule boundary changes.

Reference:

```text
TH-2026-08-20-STAGE19D-LESSON-CHECKS-NO-AI-HANDOFF
```

Recommended next Course/Lesson stage:

- Stage 19E should focus on lesson notes/bookmarks or course search polish while preserving student-owned notes and avoiding uploads, AI grading, or new payments.

## Stage 19E - Student Lesson Notes, Bookmarks, And Resume Points

Goal: Let students privately organize course learning with notes, bookmarks, and resume points, without exposing private notes to workspace users or changing entitlement/progress security.

Builder prompt:

```text
Implement Stage 19E: Student Lesson Notes, Bookmarks, And Resume Points.

Scope:
- Add private lesson notes in the lesson reader.
- Add lesson bookmarks with optional short labels and safe position metadata.
- Add a resume point for last opened course/lesson and show Continue learning on /app/courses.
- Add search/filter for the signed-in student's own notes/bookmarks.
- Notes/bookmarks/resume points must be student-owned and server-written through protected routes.
- Bound and sanitize all note/label text.
- Workspace may see aggregate-safe learning activity only: students with notes count, bookmarked lessons count, and recent activity count.
- Workspace must not see raw note text, bookmark labels, private student reflection text, raw lesson position, or raw student IDs.
- Keep workspace-scoped access only.
- Do not add AI summarization, AI grading, uploads, screenshots, PDFs, messaging, paid services, external note providers, file storage, public sharing, practice/AutoCopy changes, provider credentials, or live execution behavior.

Verification:
- npm run stage19e:qa
- npm run stage19d:qa
- npm run stage19c:qa
- npm run stage19b:qa
- npm run stage19a:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Student lesson reader supports private save/delete note, bookmark/remove, and resume point actions through protected student APIs.
- `/app/courses` shows Continue learning and searchable private notes/bookmarks for the signed-in student only.
- Workspace Course Hub and Course Visibility show aggregate learning activity counts only.
- Firestore rules deny direct browser reads/writes to course learning-state storage paths.
- Stage 19E QA confirms no AI, provider, execution, upload, messaging, PDF, payment, practice, AutoCopy, MetaAPI, Binance/Bybit, broker, vault, or live execution boundary changes.

Reference:

```text
TH-2026-08-20-STAGE19E-STUDENT-LESSON-NOTES-BOOKMARKS-HANDOFF
```

Recommended next Course/Lesson stage:

- Stage 19F should focus on course discovery/search or lesson discussion/support surfaces, while preserving private student notes and avoiding messaging integrations, uploads, AI grading, or new payment flows.

## Stage 19F - Course Resources And Attachments Polish

Goal: Improve course lesson resources and attachment usability without adding uploads, paid storage, paid video hosting, public sharing, or external provider integrations.

Builder prompt:

```text
Implement Stage 19F: Course Resources And Attachments Polish.

Scope:
- Polish lesson attachment/resource display for students.
- Keep attachments as safe HTTPS metadata only.
- Add clearer resource cards in the student lesson reader: title, type/category, safe hostname/domain, open link action, and optional description.
- Group resources as lesson resources, course resources, and external references.
- Improve workspace course editor resource authoring: add/edit/remove metadata, validate HTTPS URLs, validate safe titles/descriptions, and preview how students will see resources.
- Add empty states for no lesson resources, locked course/resources unavailable, and invalid or removed resources.
- Add aggregate-safe workspace resource visibility: count of lessons with resources and total resource count.
- Do not add click tracking or raw private activity.
- Do not add file uploads, Cloud Storage/Supabase/Firebase Storage writes, paid storage, paid video hosting, server-side PDF generation, external note/resource providers, public sharing, AI summarization, practice/AutoCopy changes, provider credentials, or live execution behavior.

Verification:
- npm run stage19f:qa
- npm run stage19e:qa
- npm run stage19d:qa
- npm run stage19c:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Student lesson reader renders grouped HTTPS resource cards with safe hostname/domain, category, description, and open-link action.
- Workspace course editor supports adding, editing, removing, and previewing resource metadata.
- Validation keeps resource URLs HTTPS-only and text bounded/plain.
- Workspace Course Hub and Course Visibility show aggregate resource counts only.
- Stage 19F QA confirms no uploads, storage, paid hosting, AI, provider, execution, private note/answer key/student attempt exposure, or cross-workspace boundary changes.

Reference:

```text
TH-2026-08-20-STAGE19F-COURSE-RESOURCES-ATTACHMENTS-HANDOFF
```

Recommended next Course/Lesson stage:

- Stage 19G should focus on course discovery/search or lesson support/discussion planning while avoiding messaging integrations, uploads, AI grading, public sharing, or new payment flows.

## Stage 19G - Course Discovery, Lesson Search, And Learning Shortcuts

Goal: Make the course/lesson MVP easier for students and instructors to navigate and find content, without changing the existing security, entitlement, quiz, notes, resource, or progress model.

Builder prompt:

```text
Implement Stage 19G: Course Discovery, Lesson Search, And Learning Shortcuts.

Scope:
- Improve `/app/courses` discovery with search by course title/description, available/locked/in-progress/completed filters, level/tier filtering where existing metadata supports it, prominent Continue learning, and clear bookmarked/private note shortcuts.
- Add lesson-level search within signed-in student accessible course data for lesson title, section/module title, safe resource title/description, and the student's own private note/bookmark text only.
- Keep locked course/lesson data protected: locked cards can show safe course metadata only, but not locked lesson resources, quiz/check detail, private learning data, or attachment links.
- Improve workspace Course Hub discovery with search and draft/published/archived, resource-count, check-readiness, and completion filters using aggregate-safe metadata only.
- Add empty states for no search results, no available courses, no bookmarked lessons, no private notes, and locked course results.
- Do not add uploads, paid hosting/storage, generated PDFs, messaging, AI search/summarization, public sharing, external search providers, analytics tracking, practice/AutoCopy changes, provider credentials, or live execution behavior.

Verification:
- npm run stage19g:qa
- npm run stage19f:qa
- npm run stage19e:qa
- npm run stage19d:qa
- npm run stage19c:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- `/app/courses` supports course search, availability/progress/locked filters, tier/level filtering where supported, Continue learning, bookmarked/private note empty states, and accessible-only lesson/resource search.
- Student lesson/resource discovery is populated by the protected student course API only after course access checks and does not include locked lesson resources, answer keys, or other students' private notes/bookmarks.
- Workspace Course Hub supports search and aggregate-safe status/resource/check/completion filters without exposing raw student activity.
- Stage 19G QA confirms no external search provider, AI, messaging, upload/storage/PDF, practice/AutoCopy, provider, or live execution boundary changes.

Reference:

```text
TH-2026-08-20-STAGE19G-COURSE-DISCOVERY-SEARCH-HANDOFF
```

Recommended next Course/Lesson stage:

- Stage 19H should focus on lesson discussion/support planning or course polish closeout, while preserving private notes, answer-key safety, and avoiding messaging integrations, uploads, AI grading, public sharing, or new payment flows.

## Stage 19H - Course Launch Polish And Smoke Pack

Goal: Polish the course/lesson MVP for launch readiness without adding major new course features or changing the existing security model.

Builder prompt:

```text
Implement Stage 19H: Course Launch Polish And Smoke Pack.

Scope:
- Improve course/lesson empty states and helper copy for `/app/courses`, `/app/courses/[courseId]`, `/app/courses/[courseId]/proof`, and workspace Course Hub/editor views.
- Add or verify a clear student learning flow: browse/search course, open course, continue lesson, pass required lesson check, complete lesson/course, and print proof.
- Add or verify a clear workspace instructor flow: create/edit course, reorder sections/lessons, add resources, add lesson check, publish/archive clarity, and view aggregate completion/readiness/resource stats.
- Polish mobile readability for the student course reader and workspace editor where obvious.
- Add source-level smoke QA for core course routes/APIs and security boundaries.
- Do not change payment, entitlement, subscription, tier, or published-course gates.
- Do not expose answer keys before submission, private student notes/bookmarks/resume positions to workspace users, or raw student IDs in aggregate workspace views.
- Do not add AI grading, uploads, stored files, paid hosting/storage, generated PDFs, messaging, public sharing, external search providers, click tracking, analytics tracking, practice/AutoCopy changes, provider credentials, or live execution behavior.

Verification:
- npm run stage19h:qa
- npm run stage19g:qa
- npm run stage19f:qa
- npm run stage19e:qa
- npm run stage19d:qa
- npm run stage19c:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Student course list, reader, and proof pages have launch-ready helper copy, empty states, and a clear learning/proof flow.
- Workspace Course Hub/editor and Course Visibility surfaces have launch-ready instructor flow copy, publish/archive clarity, and aggregate-safe stats.
- Stage 19H smoke QA verifies core course routes/APIs, protected student learning paths, answer-key stripping, browser-print-only proof, and forbidden integration boundaries.

Reference:

```text
TH-2026-08-20-STAGE19H-COURSE-LAUNCH-SMOKE-HANDOFF
```

Recommended next Course/Lesson stage:

- Stage 19I should be chosen separately after browser smoke testing, or the roadmap should move to another product area if the course MVP is launch-ready enough.

## Stage 19I - Course/Lesson MVP Final Acceptance Freeze

Goal: Freeze the course/lesson MVP after Stage 19H, the same way Stage 18X froze the practice/backtesting MVP. This is a source-level acceptance QA, documentation, and handoff stage, not a new feature stage.

Builder prompt:

```text
Implement Stage 19I: Course/Lesson MVP Final Acceptance Freeze.

Scope:
- Add final acceptance QA covering `/app/courses`, `/app/courses/[courseId]`, `/app/courses/[courseId]/proof`, workspace Course Hub/editor surfaces, protected student course APIs, and protected workspace course APIs.
- Verify the full student flow exists: browse/search/filter courses, accessible-only lesson/resource search, Continue Learning, private notes/bookmarks/resume points, deterministic lesson checks, required-check completion blocking, server-derived completion, and browser-print-only proof.
- Verify the full workspace instructor flow exists: course create/edit, section/lesson reorder, safe lesson removal, HTTPS-only resources, deterministic lesson check authoring, publish/archive clarity, and aggregate-safe completion/readiness/resource/private-learning counts.
- Verify security boundaries: no answer keys before submission, no private learning data to workspace users, no raw student IDs in workspace aggregate views, no locked lesson/resource/check data through locked course search, no cross-student/cross-workspace leakage patterns, and Firestore/browser protected learning paths remain deny-by-default.
- Update docs and manual backlog to mark the course/lesson MVP as source-QA frozen.
- Do not add new course features beyond tiny compatibility or copy polish required by acceptance QA.

Verification:
- npm run stage19i:qa
- npm run stage19h:qa
- npm run stage19g:qa
- npm run stage19f:qa
- npm run stage19e:qa
- npm run stage19d:qa
- npm run stage19c:qa
- npm run stage19b:qa
- npm run stage19a:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Course/lesson MVP is source-QA frozen after Stage 19I.
- Stage 19I final acceptance QA covers the complete student learning flow, workspace instructor flow, protected API surfaces, and source-level privacy/security boundaries.
- Manual browser QA remains deferred and organized in `manual-test-backlog.md`.
- After Stage 19I, future course prompts should be bug patches or explicitly approved new stages; otherwise choose a different product area.

Reference:

```text
TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF
```

Recommended next product-area options:

- Run deferred browser smoke testing for practice and course MVPs.
- Return to payments/revenue operations polish.
- Continue trust/safety/admin launch hardening.
- Start a separately approved communication/support surface without email/SMS/WhatsApp or public sharing.

## Stage 20A - Workspace Ops, Student CRM, Payments, And Support Audit Foundation

Goal: Start the next product area after the Practice and Course MVPs are source-QA frozen. This is an audit/foundation pass across workspace onboarding, student CRM, payment/subscription operations, and admin/support operations.

Builder prompt:

```text
Implement Stage 20A: Workspace Ops, Student CRM, Payments, And Support Audit Foundation.

Scope:
- Workspace onboarding and student CRM.
- Payment and subscription operations.
- Admin and support operations.
- Audit `/workspace`, `/workspace/onboarding`, `/api/workspace/students`, student billing, admin overview, admin payment ops, audit log, and support panels.
- Add safe workspace readiness summaries for profile, payment/access, courses, signals, AutoCopy, and Practice/Course MVP readiness.
- Improve student CRM operational summaries, search/filter clarity, safe support refs, and empty-state copy without exposing private student internals.
- Improve payment/support browser display with masked operational references and bounded counts.
- Add aggregate-only Super Admin support summary for pending applications, payment issues, workspace readiness issues, AutoCopy gate blocks, and deferred MVP browser QA.
- Keep Paystack/Solana/webhook, entitlement, role, AutoCopy, Practice, Course, MetaAPI, Binance/Bybit, broker, vault, and live execution boundaries unchanged.

Verification:
- npm run stage20a:qa
- npm run stage19i:qa
- npm run stage18x:qa
- npm run stage15y:qa
- npm run typecheck
- npm run lint
- npm run build
```

Exit criteria:

- Workspace ops surfaces show safe readiness and CRM summaries without raw private records.
- Student billing and workspace/admin payment surfaces keep clear empty/error states and masked browser-visible references.
- Admin support overview is aggregate-only and adds no refunds, payouts, messaging, provider calls, credential flows, or live execution actions.
- Stage 18X and Stage 19I remain source-QA frozen.

Reference:

```text
TH-2026-08-21-STAGE20A-OPS-CRM-PAYMENTS-SUPPORT-HANDOFF
```

## Stage 20B - Workspace Student CRM Lifecycle And Support Actions

Goal: Make the workspace student CRM useful for daily operations while staying privacy-safe and avoiding messaging, refunds, payouts, withdrawals, payment-gate changes, provider calls, or execution changes.

Implemented scope:

- Added server-derived student lifecycle states for active, pending onboarding, payment/access issue, paused, inactive, and needs support.
- Added workspace CRM aggregate cards for onboarding, access issues, support follow-up, course readiness, practice readiness, and AutoCopy blocks.
- Added an expandable safe student detail view with masked support ref, course/practice/billing/AutoCopy readiness summaries, and recent operational event labels only.
- Added protected workspace support actions for marking/clearing follow-up, saving a bounded internal support note summary, and updating operational status.
- Stored support actions through influencer-only Admin SDK routes with bounded plain-text validation and audit-log writes.
- Kept internal support notes workspace-scoped and absent from student-facing APIs.
- Added explicit Firestore deny rules for direct browser reads/writes to workspace student CRM records.

Strict boundary:

- No email, SMS, WhatsApp, push notifications, paid messaging, refunds, payouts, withdrawals, wallet transfers, new payment providers, payment verification changes, entitlement changes, AutoCopy gate changes, provider calls, credential exposure, or live execution behavior.
- The CRM shows safe summaries only and does not expose raw journal entries, practice trades, course notes, hidden candles, payment refs, webhook payloads, provider payloads, account IDs, vault refs, broker passwords, tokens, or AutoCopy internals.
- Practice/backtesting remains source-QA frozen at Stage 18X and Course/Lesson remains source-QA frozen at Stage 19I.

Verification:

```bash
npm run stage20b:qa
npm run stage20a:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Exit criteria:

- Workspace CRM supports search/filter/lifecycle operations using safe operational summaries.
- Support notes and follow-up actions remain workspace-scoped, bounded, server-written, and hidden from students.
- No payment, entitlement, AutoCopy, provider, or execution boundary is changed.

Reference:

```text
TH-2026-08-21-STAGE20B-WORKSPACE-STUDENT-CRM-LIFECYCLE-HANDOFF
```

## Stage 20C - Payment And Subscription Ops Reconciliation Support

Goal: Improve workspace/admin operational visibility for student payment and subscription issues without changing payment gates, entitlement logic, refunds, payouts, withdrawals, or provider behavior.

Implemented scope:

- Added workspace-safe student billing ops indicators for unpaid/pending payment, active subscription, expired/cancelled subscription, verification pending, payment mismatch/admin review, and resolved payment issue states.
- Added CRM billing/access summary copy so influencers can see "student needs payment support", "admin review pending", "access active", and "payment issue resolved" without raw payment/provider references.
- Added a server-computed Super Admin payment support queue from bounded payment/settlement records with hashed safe refs only.
- Added support queue categories for pending Paystack verification, failed verification, stale pending intents, subscription/access mismatch, and Solana settlement review.
- Kept the existing Paystack reconcile route as the only payment recheck action and clarified it is Super Admin-only and does not grant access from workspace UI.
- Kept existing Solana settlement ledger note/status behavior; no new payout, refund, withdrawal, wallet transfer, or provider action was added.

Strict boundary:

- No refunds, payouts, withdrawals, wallet transfers, new payment providers, payment verification changes, entitlement/subscription gate changes, workspace access grants, messaging, uploads, PDFs, screenshots, paid services, provider credential flows, AutoCopy permission expansion, or live execution behavior.
- Browser-visible Stage 20C queue items use safe hashed/masked refs and do not expose raw Paystack references, webhook payloads, Solana signatures, wallet addresses, customer IDs, authorization data, provider metadata, private student learning/practice/journal internals, vault refs, broker passwords, tokens, exchange IDs, or AutoCopy internals.
- Practice/backtesting remains source-QA frozen at Stage 18X and Course/Lesson remains source-QA frozen at Stage 19I.

Verification:

```bash
npm run stage20c:qa
npm run stage20b:qa
npm run stage20a:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Exit criteria:

- Workspace CRM exposes safe billing issue labels and admin-review guidance without raw payment/provider data.
- Admin payment support queue is bounded, masked, and derived from existing payment ops data.
- Existing student checkout/verification, Paystack/Solana integrations, entitlement gates, and workspace permissions remain unchanged.

Reference:

```text
TH-2026-08-21-STAGE20C-PAYMENT-SUBSCRIPTION-OPS-HANDOFF
```

## Stage 20D - Ops, CRM, Payments, And Support Final Smoke Freeze

Goal: Finalize the Stage 20 ops/support MVP with source-level smoke coverage, documentation cleanup, and launch-safe deferred manual QA. This is a freeze stage, not a new product-feature stage.

Implemented scope:

- Added final Stage 20D acceptance QA covering workspace readiness, student CRM lifecycle/status indicators, support follow-up actions, bounded internal support notes, workspace payment/subscription issue indicators, Super Admin support overview, payment support queue, masked payment/settlement refs, and Firestore deny-by-default rules.
- Confirmed Stage 20D keeps the Stage 18X practice/backtesting and Stage 19I course/lesson frozen acceptance guards intact.
- Updated manual QA backlog into Stage 20 must-test, nice-to-test, and later-regression groups.
- Marked Stage 20 ops/support MVP as source-QA frozen.

Strict boundary:

- No refunds, payouts, withdrawals, wallet transfers, new payment providers, payment verification changes, entitlement/subscription gate changes, workspace access grants, checkout changes, verification behavior changes, messaging, uploads, screenshots, PDFs, paid services, external support tools, provider calls, AutoCopy permission expansion, or live execution behavior.
- No browser-visible raw Paystack refs, webhook payloads, Solana signatures, wallet addresses, customer IDs, authorization data, provider metadata, payment intents, settlement internals, support internals, private student notes, private course learning data, raw practice data, hidden candles, journal internals, credentials, vault refs, broker passwords, exchange IDs, or AutoCopy internals.
- Practice/backtesting remains source-QA frozen at `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`.
- Course/Lesson remains source-QA frozen at `TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`.

Verification:

```bash
npm run stage20d:qa
npm run stage20c:qa
npm run stage20b:qa
npm run stage20a:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Exit criteria:

- Stage 20 source-QA frozen for workspace ops, student CRM, payments visibility, and support summaries.
- Manual browser QA remains deferred but clearly grouped for demo readiness.
- Future ops work should be a targeted patch or separately approved next product stage.

Reference:

```text
TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF
```

Recommended next ops stage:

- Choose the next product area separately, or patch specific Stage 20 browser bugs after deferred manual QA.

## Stage 21A - Manual Trading Journal CRUD Foundation

Goal: Start the manual journal product lane with private, student-owned manual trade CRUD that stays separate from AutoCopy, practice/backtesting, broker execution, provider-connected ledgers, and workspace/admin raw trade visibility.

Implemented scope:

- Added manual journal trade types for market, side, status, strategy/playbook, tags, emotion, mistake category, setup quality, notes, lesson learned, and server-derived P&L/R/outcome fields.
- Added bounded server-side validation for manual trade input, including symbol normalization, enum checks, numeric/date limits, tag/text sanitization, and required math fields for open/closed trades.
- Added protected signed-in student APIs to list, create, update, and archive manual trades through Firebase Admin SDK actor-scoped paths.
- Added `/app/journal` manual trade CRUD UI with search/filter controls, create/edit form, archive confirmation, derived result display, and private-first copy.
- Added Firestore deny-by-default rules for direct browser access to manual journal trade storage.

Strict boundary:

- No live broker/exchange execution, MetaAPI, Binance, Bybit, Paystack, Solana, provider calls, external imports, AI analysis/grading, uploads, PDFs, screenshots, messaging, email, SMS, WhatsApp, paid services, raw account IDs, provider payloads, vault refs, credentials, broker passwords, tokens, exchange IDs, or AutoCopy internals.
- Workspace users do not receive raw manual trade rows or private notes in Stage 21A.
- Existing account-linked ledger, AutoCopy journal summary, and practice/backtesting journal sections remain separate.
- Practice/backtesting remains source-QA frozen at `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`.
- Course/Lesson remains source-QA frozen at `TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`.
- Ops/CRM/payments/support remains source-QA frozen at `TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF`.

Verification:

```bash
npm run stage21a:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Exit criteria:

- Students can privately create, edit, filter, review, and archive manual trades.
- Derived manual P&L/R/outcome fields are server-computed.
- Browser Firestore access to manual trade records remains denied.
- Workspace/admin surfaces do not expose raw manual journal rows or private notes.

Reference:

```text
TH-2026-08-21-STAGE21A-MANUAL-JOURNAL-CRUD-HANDOFF
```

Recommended next journal stage:

- Add manual journal analytics/import polish only after Stage 21A browser QA, or patch specific manual journal CRUD issues found during deferred testing.

## Stage 21B - Manual Trade Review Chart

Goal: Let students open a private manual trade review screen with a modern chart, entry/exit/SL/TP levels, metrics, notes, strategy/tags, and bounded review editing shortcuts.

Implemented scope:

- Added protected signed-in student review API at `/api/student/journal/manual-trades/[tradeId]/review`.
- Added student route `/app/journal/trades/[tradeId]` with a manual trade review client.
- Added `/app/journal` Review actions for private manual trade rows.
- Added chart panel using approved practice historical candle service only, with fail-closed empty states when candles are unavailable.
- Added entry, exit, stop loss, and take profit price lines on the review chart.
- Added trade metrics, notes, lesson learned, strategy/playbook, tags, emotion, mistake category, setup quality, opened/closed dates, and read-only archived state.
- Added bounded review editing shortcuts for strategy/playbook, tags, notes, and lesson learned through the existing protected manual trade update path.

Strict boundary:

- No live broker/exchange execution, private Binance/Bybit APIs, student MetaAPI credentials, Paystack/Solana calls, provider payload exposure, vault refs, account IDs, broker passwords, tokens, AutoCopy execution coupling, screenshots, uploads, PDFs, paid services, AI grading/analysis, messaging, email, SMS, or WhatsApp.
- Manual review uses only student-owned manual trade rows and approved practice historical candle providers. Browser review charts do not fetch external providers directly.
- Workspace users still do not receive raw manual trade rows, chart review details, or private notes.
- Practice/backtesting remains source-QA frozen at `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`.
- Course/Lesson remains source-QA frozen at `TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`.
- Ops/CRM/payments/support remains source-QA frozen at `TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF`.

Verification:

```bash
npm run stage21b:qa
npm run stage21a:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Exit criteria:

- Students can click Review from `/app/journal` and inspect a private manual trade with chart context when approved candles are available.
- Planned/open/archived/manual chart-empty states are clear and safe.
- Review note/tag/strategy/lesson edits stay protected and student-owned.

Reference:

```text
TH-2026-08-21-STAGE21B-MANUAL-TRADE-REVIEW-CHART-HANDOFF
```

Recommended next journal stage:

- Add manual journal analytics/dashboard rollups only after Stage 21B browser QA, or patch specific review-chart issues found during deferred testing.

## Stage 21C - Manual Journal Analytics, Calendar, Import/Export, And Final Polish

Goal: Finish the private manual trading journal MVP with student-only analytics, daily P&L calendar summaries, safe exports, pasted CSV imports, and clearer `/app/journal` workflow polish.

Implemented scope:

- Added protected signed-in student analytics API at `/api/student/journal/manual-trades/analytics`.
- Added server-computed manual journal metrics: total/closed/open/planned/cancelled trades, wins/losses/breakeven, win rate, net P&L, average R, expectancy, profit factor, best/worst trade, and average win/loss.
- Added private breakdowns by symbol, strategy/playbook, tag, emotion, mistake category, and setup quality.
- Added daily P&L calendar rows from closed manual trades only.
- Added protected export API at `/api/student/journal/manual-trades/export` for manual trades CSV, analytics CSV, and bounded safe JSON backup.
- Added protected pasted-CSV import API at `/api/student/journal/manual-trades/import`, with strict server validation, row limits, sanitization, new student-owned IDs, and no trust in browser-supplied workspace/student identifiers.
- Added `/app/journal` analytics cards, breakdown panels, daily P&L calendar, import/export controls, and clearer private-first copy while preserving manual, AutoCopy, practice/backtesting, and linked-account separation.

Strict boundary:

- No live broker/exchange execution, private Binance/Bybit APIs, student MetaAPI credentials, Paystack/Solana calls, provider payload exposure, vault refs, account IDs, broker passwords, tokens, AutoCopy execution coupling, hidden practice candle export, screenshots, uploads, server PDFs, paid services, AI grading/analysis, messaging, email, SMS, WhatsApp, or push notifications.
- Manual analytics/import/export use only signed-in student-owned manual journal trades through protected Admin SDK routes.
- Workspace users still do not receive raw manual trade rows, private notes, lesson learned text, tags, strategies, emotions, mistake categories, setup quality details, or raw student IDs.
- Practice/backtesting remains source-QA frozen at `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`.
- Course/Lesson remains source-QA frozen at `TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`.
- Ops/CRM/payments/support remains source-QA frozen at `TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF`.

Verification:

```bash
npm run stage21c:qa
npm run stage21b:qa
npm run stage21a:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Exit criteria:

- Students can review private manual journal analytics and daily P&L summaries from their own manual trades.
- Students can export safe manual trade/analytics files and import bounded pasted CSV rows without overwriting or exposing another student's data.
- Manual journal UI remains clear, modern, and separated from AutoCopy and practice/backtesting.

Reference:

```text
TH-2026-08-21-STAGE21C-MANUAL-JOURNAL-ANALYTICS-FINAL-HANDOFF
```

Recommended next journal stage:

- Treat manual journal MVP as source-QA complete after Stage 21C, then run deferred browser QA or choose a new product area separately.

## Stage 21D - Manual Journal MVP Final Acceptance Freeze

Goal: Freeze the Manual Journal MVP after CRUD, trade review chart, analytics, calendar, import/export, and safe backup. This is a source-level acceptance and smoke stage, not a feature expansion stage.

Implemented scope:

- Added final Stage 21D source acceptance QA script and package script.
- Verified manual journal student routes and APIs exist for list/create, update/archive, review, analytics, export, import, `/app/journal`, and `/app/journal/trades/[tradeId]`.
- Verified manual trade CRUD, review, analytics, import, and export routes remain protected by `requireStudent`.
- Verified repository storage is actor-scoped to `actor.workspaceId` and `actor.studentId`, and does not trust browser-supplied `workspaceId` or `studentId`.
- Verified manual analytics are server-computed from signed-in student manual trades only.
- Verified manual CSV/JSON backup export uses an allowlisted safe trade shape and excludes workspace/student identifiers, provider/payment internals, secrets, AutoCopy internals, and hidden practice candles.
- Verified import is bounded, validates/sanitizes rows server-side, ignores workspace/student columns, and writes new records only under the signed-in student.
- Verified `/app/journal` keeps Manual trading, AutoCopy ledger, Practice/backtesting, and linked-account readiness sections separate.
- Verified manual trade review chart uses approved practice historical candle services through server APIs, fails closed safely, renders entry/exit/SL/TP levels, and keeps archived trades read-only.
- Reorganized Manual Journal deferred manual QA into Must Test Before Demo, Nice To Test, and Later Regression groups.

Strict boundary:

- Manual Journal MVP is source-QA frozen.
- No new manual journal product features, workspace raw manual trade visibility, AI analysis/grading, uploads, screenshots, server PDF generation, paid storage, paid services, email/SMS/WhatsApp/push, live broker/exchange execution, private Binance/Bybit APIs, MetaAPI credentials, payment/entitlement/AutoCopy/practice/course/ops gate changes, or Firestore rule weakening.
- Workspace users do not receive raw manual trades, private notes, tags, strategies, emotions, mistake categories, lesson-learned text, or raw student IDs.
- Practice/backtesting remains source-QA frozen at `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`.
- Course/Lesson remains source-QA frozen at `TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`.
- Ops/CRM/payments/support remains source-QA frozen at `TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF`.

Verification:

```bash
npm run stage21d:qa
npm run stage21c:qa
npm run stage21b:qa
npm run stage21a:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Exit criteria:

- Manual Journal MVP is source-QA frozen and ready for deferred browser QA.
- Private manual trade CRUD, review chart, analytics, calendar, safe export/backup, and pasted CSV import remain student-owned and provider-safe.
- Future work should patch specific manual journal bugs found in manual QA or choose a new product area separately.

Reference:

```text
TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF
```

Recommended next stage:

- Continue only the four selected remaining launch-expansion tracks below. Do not plan uploads/file or video hosting, refunds/payouts/withdrawals automation, or AI features.

## Stage 22A - Real Forex/CFD Historical Provider Contract And Vault Gate

Goal: Prepare TradeHub for real Forex/CFD historical candles without enabling broad real provider fetching yet.

Implemented scope:

- Added a server-only Forex/CFD historical provider contract for future real provider adapters.
- Added explicit disabled-by-default real history gates: `PRACTICE_FOREX_CFD_REAL_HISTORY_ENABLED=false`, `PRACTICE_FOREX_CFD_HISTORY_PROVIDER=disabled`, `PRACTICE_FOREX_CFD_HISTORY_DRY_RUN=true`, and vault readiness flags.
- Added platform utility provider vault readiness checks using server-only Secret Manager project/secret config names.
- Kept current practice/backtesting behavior working: crypto historical candles still use the approved Binance public path, Forex/CFD remains fail-closed unless configured, and the static demo provider remains separate as `tradehub_static_demo`.
- Added canonical/provider symbol helpers for XAUUSD and major Forex pairs with safe suffix validation.
- Preserved bounded request validation for supported symbols, supported timeframes, date range, and max candle count.
- Added safe provider readiness preview metadata to the student practice overview only: configured state, provider label, supported symbols/timeframes, dry-run/vault booleans, fail-closed reason, and safe message.
- Added Stage 22A source QA for contracts, gates, normalized candle output, route protection, Firestore posture, and no forbidden provider/execution/secret behavior.

Strict boundary:

- Stage 22A does not add the real provider network adapter; real provider fetch remains disabled until Stage 22B.
- No live broker/exchange execution, AutoCopy execution changes, private Binance/Bybit APIs, student MetaAPI credentials, student broker passwords, account IDs, vault refs, provider tokens, raw provider payloads, hidden candle exposure, paid storage, uploads, screenshots, PDFs, AI, refunds, payouts, withdrawals, wallet-transfer automation, or Firestore rule weakening.
- Practice/backtesting MVP remains frozen at `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`.
- Course/lesson MVP remains frozen at `TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`.
- Ops/CRM/payments/support MVP remains frozen at `TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF`.
- Manual Journal MVP remains frozen at `TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF`.

Verification:

```bash
npm run stage22a:qa
npm run stage18x:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Exit criteria:

- Real Forex/CFD history has a server-only contract, disabled-by-default gates, vault readiness checks, safe symbol mapping, normalized output expectations, and source-level QA.
- Existing crypto and static demo practice history remain compatible.
- Stage 22B can add the real adapter without changing student credential, execution, or browser exposure boundaries.

Reference:

```text
TH-2026-08-22-STAGE22A-FOREX-CFD-HISTORY-CONTRACT-HANDOFF
```

Recommended next stage:

- Stage 22B: add the real Forex/CFD historical provider adapter and cache behavior behind the Stage 22A gates, then freeze the provider track.

## Stage 22B - Server-Only Forex/CFD Historical Adapter MVP

Goal: Add the first real server-only Forex/CFD historical candle adapter behind the Stage 22A gates without changing practice replay safety or live execution boundaries.

Implemented scope:

- Added a server-only MetaAPI utility historical candle adapter for `PRACTICE_FOREX_CFD_HISTORY_PROVIDER=metaapi_utility`.
- Kept the adapter disabled unless all Stage 22A gates pass: real history enabled, provider set to `metaapi_utility`, dry-run off, vault ready, and server vault/project/secret config present.
- Loaded platform utility provider credentials from Google Secret Manager only; no student MetaAPI token, student broker password, or student account ID is used for practice history.
- Fetches bounded candles from the MetaAPI market-data historical candle endpoint, with server-only auth headers and bounded timeout/request limits.
- Normalizes provider candles into the existing `NormalizedCandle` shape with strict OHLC/time/symbol/timeframe validation.
- Stores only normalized candles in the existing historical candle cache; raw provider payloads are never returned or stored.
- Preserves canonical/provider symbol separation and safe suffix mapping through `PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP`.
- Keeps `tradehub_static_demo` working as a separate explicit demo provider; `tradehub_static_demo remains separate` from real provider fetching.
- Keeps crypto BTCUSDT/ETHUSDT public history unchanged through the existing Binance public path.
- Added Stage 22B source QA covering gates, vault use, adapter normalization, cache safety, route protection, docs, and forbidden execution/provider-secret behavior.

Strict boundary:

- No live broker/exchange execution.
- No AutoCopy coupling.
- No private Binance/Bybit APIs.
- No student MetaAPI credentials, student broker passwords, or student account IDs for practice history.
- No vault refs, token names, account IDs, broker passwords, provider payloads, raw provider URLs with secrets, stack traces, or hidden candles are exposed to browser responses.
- No Firestore rule weakening, uploads, screenshots, PDFs, paid messaging, AI, refunds, payouts, or withdrawal automation.
- `tradehub_static_demo` remains separate from the real provider path.

Verification:

```bash
npm run stage22b:qa
npm run stage22a:qa
npm run stage18x:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Exit criteria:

- Real Forex/CFD historical candles can be fetched only through the server adapter when every Stage 22A gate passes.
- Provider failures fail closed with safe messages.
- Browser responses and cache records contain normalized candle metadata only.

Reference:

```text
TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF
```

Recommended next stage:

- Stage 23A: External Reminder Preferences, Consent, Templates, And Safe Queue.

## Stage 23A - External Messaging/Reminder Provider Contract And Gates

Goal: Prepare TradeHub for future external student reminders and support notifications without sending real external messages.

Implemented scope:

- Added a server-only messaging provider contract for future email, WhatsApp, and SMS channels.
- Added disabled-by-default messaging gates: `MESSAGING_ENABLED=false`, `MESSAGING_DRY_RUN=true`, channel gates off, `MESSAGING_PROVIDER=disabled`, and `MESSAGING_VAULT_READY=false`.
- Added a support-safe message intent model for assignment reminders, feedback published, resubmission due, course reminders, and billing/access issue reminders.
- Added a server-only dry-run intent helper that writes only safe metadata: workspace ID, masked student ref, channel, purpose, status, dry-run flag, safe reason, optional safe source ref, and timestamps.
- Added a Super Admin-only messaging readiness API and compact admin preview card.
- Added Firestore deny-by-default rules for messaging intent/provider/audit paths.
- Added Stage 23A source QA covering no-send gates, safe field allowlists, Super Admin-only preview, deny rules, and frozen MVP regression boundaries.

Strict boundary:

- No real email, SMS, or WhatsApp messages are sent.
- No paid messaging provider calls, Resend/Twilio/WhatsApp Cloud send calls, or provider webhooks were added.
- No phone numbers, email addresses, message bodies, provider payloads, tokens, vault refs, account IDs, payment refs, private notes, answer keys, hidden candles, raw trade/journal data, or AutoCopy internals are exposed in browser responses.
- Payment, course, practice, journal, AutoCopy, Forex/CFD history, CRM, and live execution boundaries remain unchanged.

Verification:

```bash
npm run stage23a:qa
npm run stage22b:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage21d:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE23A-MESSAGING-PROVIDER-CONTRACT-HANDOFF
```

Recommended next stage:

- Stage 23B: External Reminder Provider Adapter, Delivery Status, And Freeze.

## Stage 23B - Messaging Dry-Run Delivery Worker And Provider Adapter Placeholders

Goal: Add a server-only messaging delivery worker that processes safe message intents in dry-run mode, plus fail-closed provider adapter placeholders for future email, WhatsApp, and SMS.

Implemented scope:

- Added server-only provider adapter placeholders for email, WhatsApp, and SMS.
- Added a bounded Super Admin-only dry-run worker route at `/api/admin/messaging/worker/run`.
- Worker reads a bounded set of dry-run eligible message intents, respects messaging enabled/provider/channel/dry-run gates, refuses non-dry-run execution, and never calls external providers.
- Worker updates safe message intent status and writes safe delivery attempt records with masked workspace/student/message refs, channel, provider id, purpose, status, dry-run flag, safe reason, optional safe source ref, and timestamps.
- Added admin overview counts for pending, blocked, dry-run processed, failed, sent-placeholder, and latest safe delivery attempts.
- Added a Super Admin UI action to run the dry-run worker and preview latest safe delivery attempts.
- Added Firestore deny-by-default rules for messaging delivery attempts.
- Added Stage 23B source QA covering dry-run worker gates, placeholder adapters, admin route/UI, safe attempt fields, no provider calls, deny rules, and frozen MVP boundaries.

Strict boundary:

- No real email, SMS, or WhatsApp messages are sent.
- No Resend, Twilio, WhatsApp Cloud, paid messaging packages, provider webhooks, or external provider network calls were added.
- No phone numbers, email addresses, message bodies, provider payloads, tokens, vault refs, payment refs, raw student IDs, raw session IDs, private notes, journal text, trade data, answer keys, hidden candles, credentials, or AutoCopy internals are stored or exposed in browser responses.
- Payment, course, practice, journal, AutoCopy, Forex/CFD history, CRM, and live execution boundaries remain unchanged.

Verification:

```bash
npm run stage23b:qa
npm run stage23a:qa
npm run stage22b:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage21d:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE23B-MESSAGING-DRY-RUN-WORKER-HANDOFF
```

Recommended next stage:

- Stage 23C or Stage 24A: choose whether to freeze messaging delivery status next or begin external signal-source ingestion.

## Stage 23C - Messaging Preferences, Consent, And Suppression Safety Gates

Status: implemented source-level consent/preferences and suppression safety layer; real external messaging remains disabled.

What changed:

- Added student-owned reminder preferences for email, WhatsApp, SMS, practice assignments, courses, billing/access, and feedback/resubmission reminders.
- Added a protected student API and `/app` Reminder preferences card with clear in-app/dry-run-only copy.
- Added masked worker-readable preference summaries so dry-run worker eligibility can honor opt-outs without raw student IDs or contact details.
- Added a Super Admin suppression model/read path using masked refs only and admin counts/status previews.
- Updated message intent creation and dry-run worker processing to fail closed for channel opt-out, purpose opt-out, recipient suppression, contact unavailable/unverified, disabled provider gates, and dry-run-only posture.
- Added deny-by-default Firestore rules for messaging preferences, preference summaries, and suppressions.
- Added Stage 23C source QA for preference APIs, masked suppressions, worker-time rechecks, no contact/body/provider exposure, and no real external sends.

Strict boundary:

- No real email, SMS, or WhatsApp messages are sent.
- No Resend, Twilio, WhatsApp Cloud, SendGrid, Mailgun, Nodemailer, provider packages, webhooks, or external provider network calls were added.
- No phone numbers, email addresses, message bodies, provider payloads, tokens, vault refs, payment refs, raw student IDs, raw session IDs, private notes, hidden candles, answer keys, credentials, or AutoCopy internals are exposed in browser responses.
- Payment, course, practice, journal, AutoCopy, Forex/CFD history, CRM, and live execution boundaries remain unchanged.

Verification:

```bash
npm run stage23c:qa
npm run stage23b:qa
npm run stage23a:qa
npm run stage22b:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage21d:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE23C-MESSAGING-PREFERENCES-SUPPRESSION-HANDOFF
```

Recommended next stage:

- Stage 23D: messaging final acceptance freeze, or Stage 24A if the owner wants to begin external signal-source ingestion.

## Stage 23D - Messaging MVP Final Acceptance Freeze

Status: source-QA frozen. External messaging/reminders MVP is complete as a disabled-by-default, dry-run-only, consent-aware provider contract and safety layer.

What changed:

- Added final Stage 23D source acceptance QA covering Stage 23A provider contract, Stage 23B dry-run worker/placeholders, and Stage 23C preferences/suppression safety together.
- Confirmed external email, SMS, WhatsApp, and push delivery remain unavailable.
- Confirmed placeholder adapters fail closed outside dry-run.
- Confirmed worker processing rechecks provider gates, student preferences, suppression state, and contact readiness before placeholder delivery.
- Confirmed Super Admin messaging overview remains support-safe with masked refs/counts only.
- Confirmed student Reminder preferences remain signed-in-student scoped and do not collect contact details.
- Confirmed Firestore rules remain deny-by-default for messaging intents, attempts, preferences, preference summaries, suppressions, provider status, and audit paths.

Strict boundary:

- No real email, SMS, WhatsApp, or push notifications are sent.
- No Resend, Twilio, WhatsApp Cloud, SendGrid, Mailgun, Nodemailer, provider webhook, paid messaging package, or external provider network call was added.
- No phone numbers, email addresses, message bodies, provider payloads, tokens, vault refs, payment refs, raw student IDs, raw session IDs, private notes, hidden candles, answer keys, credentials, or AutoCopy internals are exposed.
- Payment, course, practice, manual journal, AutoCopy, Forex/CFD history, CRM, and live execution gates remain unchanged.

Verification:

```bash
npm run stage23d:qa
npm run stage23c:qa
npm run stage23b:qa
npm run stage23a:qa
npm run stage22b:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage21d:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF
```

Recommended next stage:

- Stage 24A: external master-trader / Telegram signal ingestion contract, signing, deduplication, and fail-closed ingestion.

## Stage 24A - External Master-Trader / Telegram Signal Ingestion Contract

Status: implemented. External signal ingestion now has a server-only, disabled-by-default contract for future master-trader, Telegram-style, webhook-style, and manual seed sources. This is a quarantine/review foundation only.

What changed:

- Added external signal source/candidate types for manual admin seed, Telegram-style channel, webhook-style source, and master-trader feed categories.
- Added disabled-by-default env gates and dry-run/fail-closed readiness:
  - `EXTERNAL_SIGNAL_INGESTION_ENABLED=false`
  - `EXTERNAL_SIGNAL_INGESTION_DRY_RUN=true`
  - `EXTERNAL_SIGNAL_INGESTION_PROVIDER=disabled`
  - `EXTERNAL_SIGNAL_SOURCE_ALLOWLIST_ENABLED=false`
  - `EXTERNAL_SIGNAL_TELEGRAM_ENABLED=false`
  - `EXTERNAL_SIGNAL_WEBHOOKS_ENABLED=false`
- Added server-only parser/deduplication helpers for conservative manual/mock candidate parsing.
- Added source allowlist and normalized candidate repository helpers with masked refs, fingerprints, parse warnings, and safe statuses.
- Added Super Admin-only external signal ingestion overview API and admin panel with safe counts/latest masked candidates only.
- Added Firestore deny-by-default rules for external signal source/candidate/provider/audit paths.
- Added Stage 24A source QA.

Strict boundary:

- No Telegram connection, bot token, scraping, webhook ingestion, external provider call, AI parsing, paid service, AutoCopy bridge, workspace signal publish, student signal broadening, or broker/exchange execution was added.
- Browser-visible records show masked refs/status only and never expose raw external messages, source account IDs, chat IDs, usernames, phone numbers, tokens, webhook secrets, provider payloads, credentials, payment refs, vault refs, or AutoCopy internals.
- Practice 18X, Course 19I, Ops 20D, Manual Journal 21D, Forex/CFD History 22B, Messaging 23D, payment gates, and execution gates remain frozen/unchanged.

Verification:

```bash
npm run stage24a:qa
npm run stage23d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage21d:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE24A-EXTERNAL-SIGNAL-INGESTION-CONTRACT-HANDOFF
```

Recommended next stage:

- Stage 24B: Telegram/master-trader parser mock expansion, moderation queue, and influencer-safe review workflow while keeping ingestion quarantined from AutoCopy/live execution.

## Stage 24B - External Signal Parser, Moderation, And Review Workflow

Status: implemented. External signal ingestion now has a Super Admin-only manual/mock parser and moderation workflow. Candidates can be created, risk-flagged, reviewed, rejected, quarantined, or marked preview-only, but they remain non-executable.

What changed:

- Extended external signal candidate records with parser version, risk flags, review status, review reason, reviewed-by safe admin ref, reviewed time, and bounded admin note metadata.
- Added bounded parser/risk checks for unsupported symbol, unsupported asset class, missing/invalid entry, missing stop loss, missing take profit, too many take profits, duplicate fingerprint, suspicious text-pattern placeholder, and workspace scope mismatch.
- Added Super Admin-only routes for manual/mock candidate creation, candidate review, and source allowlist upsert/disable.
- Added source allowlist controls that store masked source refs only and never store raw source IDs, chat IDs, credentials, tokens, or provider payloads.
- Upgraded the Super Admin external ingestion panel with a mock candidate form, status filter, safe moderation queue, preview-only/reject/quarantine actions, and source allowlist controls.
- Added Stage 24B source QA and package script.

Strict boundary:

- Preview-only external candidates do not publish workspace signals, reach students, trigger AutoCopy, call providers, connect Telegram/webhooks, scrape messages, run AI parsing, or create broker/exchange orders.
- Browser-visible records remain masked/status-only and do not expose raw external messages, source account IDs, chat IDs, usernames, phone numbers, tokens, webhook secrets, provider payloads, vault refs, or AutoCopy internals.
- Stage 18X Practice, Stage 19I Courses, Stage 20D Ops, Stage 21D Manual Journal, Stage 22B Forex/CFD History, Stage 23D Messaging, Stage 24A Contract, payment gates, and execution gates remain unchanged.

Verification:

```bash
npm run stage24b:qa
npm run stage24a:qa
npm run stage23d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage21d:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE24B-EXTERNAL-SIGNAL-REVIEW-WORKFLOW-HANDOFF
```

Recommended next stage:

- Stage 24C: reviewed external signal preview integration/freeze. Keep preview read-only and do not connect external candidates to executable workspace signals or AutoCopy unless a future explicit release prompt authorizes a separate, gated bridge.

## Stage 24C - External Signal Preview Integration And Ingestion MVP Freeze

Status: implemented. External ingestion now has a workspace-safe preview surface for Super Admin-approved preview candidates only, and the external master-trader / Telegram-style ingestion MVP is source-QA frozen.

What changed:

- Added a protected workspace API for read-only external signal previews.
- Added workspace-safe preview response records with normalized symbol, asset class, side, entry range, SL/TP, confidence, masked source ref, safe source label, risk flags, and timestamps only.
- Added a workspace preview panel with filters by symbol, asset class, source label, review status, and date.
- Labeled the preview surface clearly as external preview only, not a TradeHub signal, not student-visible, and not AutoCopy executable.
- Added final Stage 24C source acceptance QA and package script.

Strict boundary:

- Workspace preview shows only `approved_for_workspace_preview` candidates scoped to the influencer workspace.
- Preview records are read-only and have no publish, convert, route, order, AutoCopy, provider, Telegram, webhook, scraping, AI, student visibility, or live execution action.
- Browser-visible preview records do not expose raw external messages, raw source IDs, chat IDs, usernames, phone numbers, tokens, webhook secrets, provider payloads, vault refs, admin notes, reviewer refs, fingerprints, source safe refs, or AutoCopy internals.
- Stage 18X Practice, Stage 19I Courses, Stage 20D Ops, Stage 21D Manual Journal, Stage 22B Forex/CFD History, Stage 23D Messaging, payment gates, and execution gates remain unchanged.

Verification:

```bash
npm run stage24c:qa
npm run stage24b:qa
npm run stage24a:qa
npm run stage23d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage21d:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF
```

Recommended next stage:

- Stage 25A: controlled broad live AutoCopy production readiness audit and launch gates. Treat this as a new product area with explicit release gates, not a continuation of external signal preview.

## Stage 25A - Broad Live AutoCopy Production Readiness Audit And Launch Gates

Status: implemented. Stage 25A adds broad live AutoCopy readiness previews, launch-gate states, and operator runbook checklists without enabling broad live order execution.

What changed:

- Added a server-only broad live AutoCopy readiness helper for crypto Production Beta, Forex live canary, platform/workspace controls, student consent/access posture, vault/dry-run/order-call gates, kill switches, reconciliation readiness, and external signal preview separation.
- Added launch-gate states: `blocked`, `dry_run_only`, `canary_only`, `cohort_ready`, `broad_live_blocked`, and `broad_live_ready`.
- Added safe Super Admin, workspace, and student-facing readiness surfaces. Browser-visible records show only status/check/runbook summaries and never credentials, vault refs, provider payloads, raw account refs, broker passwords, or full order IDs.
- Added disabled-by-default broad live env defaults to `.env.example`.
- Added Stage 25A source QA and package script.

Strict boundary:

- Stage 25A is audit/runbook/readiness only. It does not enable broad live order calls, alter existing workers, route external signal previews into AutoCopy, publish external candidates, bypass student consent/payment gates, bypass kill switches, or change practice/course/ops/manual journal/messaging/Forex history frozen surfaces.
- Existing crypto production canary and Forex tiny live canary paths remain separate and gated. Broad rollout remains blocked by default.

Verification:

```bash
npm run stage25a:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE25A-BROAD-LIVE-AUTOCOPY-READINESS-HANDOFF
```

Recommended next stage:

- Stage 25B: controlled live AutoCopy cohort gate. This should add cohort eligibility/review posture only, not route live orders or change workers.

## Stage 25B - Controlled Live AutoCopy Cohort Gate

Status: implemented. Stage 25B adds a safe operator-controlled cohort gate/readiness preview for a future limited live AutoCopy rollout without enabling broad live execution.

What changed:

- Added controlled cohort status labels: `not_configured`, `blocked`, `dry_run_only`, `canary_required`, `eligible_for_review`, `approved_for_cohort`, `cohort_paused`, and `cohort_removed`.
- Added disabled-by-default cohort env gates: `BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED=false`, `BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED=false`, and `BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN=true`.
- Extended the Stage 25A server-only readiness helper with a bounded cohort preview that requires kill-switch, production vault/preflight, candidate eligibility, reconciliation, dry-run/order-call, and external-preview separation checks.
- Added safe Super Admin/workspace/student cohort visibility in existing readiness cards. Browser-visible copy stays status-only and does not expose raw student IDs, raw workspace internals, credentials, vault refs, provider payloads, account IDs, broker passwords, MetaAPI tokens, or raw order refs.
- Added deny-by-default Firestore placeholders for future cohort controls/audit records.
- Added Stage 25B source QA and package script.

Strict boundary:

- Cohort approval is a review gate only. It does not place live orders, change live order workers, connect external signal previews to executable signals, bypass consent/payment/entitlement gates, bypass kill switches, bypass vault readiness, or weaken dry-run defaults.
- Broad live AutoCopy remains blocked by default; crypto production canary and Forex live canary paths remain separate.

Verification:

```bash
npm run stage25b:qa
npm run stage25a:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE25B-LIVE-AUTOCOPY-COHORT-GATE-HANDOFF
```

Recommended next stage:

- Stage 25C: controlled crypto live AutoCopy cohort rollout only if the owner explicitly approves moving from cohort gate/readiness into a bounded rollout stage. Keep Forex and broad rollout separate.

## Stage 25C - Controlled Crypto Live AutoCopy Cohort Rollout

Status: implemented. Stage 25C adds a bounded Super Admin-only crypto live cohort dry-run action and support-safe candidate preview without enabling broad live order execution.

What changed:

- Added a server-only crypto cohort rollout worker for `ready_for_live` production crypto intents, capped to a tiny candidate window and exposed through a Super Admin-only API route.
- The worker rechecks existing production/cohort gates: paid Crypto AutoCopy, production consent, student/workspace/platform kill switches, production preflight, vault readiness, production env gates, Stage 25B cohort env gates, and safe symbol readiness.
- Added support-safe candidate summaries with masked `candidateRef` values, safe status/reason text, bounded counts, warnings, and rollback guidance.
- Added Super Admin UI controls/results for a crypto cohort dry-run. Workspace and student surfaces remain status-only; they cannot trigger cohort rollout.
- Added Stage 25C source QA and package script.

Strict boundary:

- Stage 25C is crypto-only and dry-run from the UI. It does not broaden live execution, does not add Forex rollout, does not connect external signal preview candidates to executable signals, does not place exchange orders, and does not expose credentials, vault refs, provider payloads, raw student IDs, raw workspace internals, or raw order refs.
- Submit mode remains rejected unless all cohort and production gates are explicitly opened and typed confirmation is supplied; this stage does not add a broad live worker or change existing canary/live production routing.

Verification:

```bash
npm run stage25c:qa
npm run stage25b:qa
npm run stage25a:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE25C-CRYPTO-LIVE-AUTOCOPY-COHORT-ROLLOUT-HANDOFF
```

Recommended next stage:

- Stage 25D: live AutoCopy reconciliation, incident, and rollback hardening before final freeze.

## Stage 25D - Live AutoCopy Reconciliation, Incident, And Rollback Hardening

Status: implemented. Stage 25D adds support-safe incident/reconciliation posture and rollback guidance for controlled live AutoCopy without enabling broad live execution.

What changed:

- Added a derived incident readiness model covering crypto production/canary, crypto cohort dry-run evaluations, and Forex live canary as separate streams.
- Added support-safe counts for stale attempts, review-needed records, blocked candidates, cohort dry-run audits, production reconciliation records, and Forex canary blocks.
- Added a Super Admin-facing incident/rollback section inside the broad live readiness card with kill-switch status, dry-run/order-call posture, rollback checklist, incident checklist, audit summaries, warnings, and bounded support-note policy.
- Added deny-by-default Firestore placeholders for future live incident, support review, and rollback note records.
- Added Stage 25D source QA and package script.

Strict boundary:

- Stage 25D is support/readiness hardening only. It does not enable broad live AutoCopy, create a broad live worker, add Forex broad rollout, execute orders, connect external signal previews to AutoCopy, or weaken payment, consent, entitlement, vault, preflight, kill-switch, pause, canary, or cohort gates.
- Browser-visible incident posture is support-safe and excludes credentials, vault refs, account IDs, raw student IDs, raw order refs, provider payloads, exchange response payloads, broker passwords, MetaAPI tokens, API keys, and AutoCopy internals.

Verification:

```bash
npm run stage25d:qa
npm run stage25c:qa
npm run stage25b:qa
npm run stage25a:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-22-STAGE25D-LIVE-AUTOCOPY-RECONCILIATION-INCIDENT-HANDOFF
```

Recommended next stage:

- Stage 25E: Live AutoCopy final acceptance freeze. Keep all rollout gates disabled by default unless a future explicit production launch prompt changes them.

## Stage 25E - Controlled Live AutoCopy MVP Final Acceptance Freeze

Status: implemented and source-QA frozen. Stage 25E closes the controlled live AutoCopy support layer with final source-level acceptance coverage across Stage 25A, Stage 25B, Stage 25C, and Stage 25D.

What changed:

- Added final Stage 25E acceptance QA for broad live readiness gates, controlled cohort gates, crypto cohort dry-run rollout, reconciliation/incident/rollback posture, Super Admin runbook visibility, workspace/student status-only copy, external signal preview isolation, and frozen foundation references.
- Verified fail-closed env defaults for broad live and cohort rollout gates remain disabled/dry-run by default.
- Verified the bounded crypto cohort worker remains Super Admin-only, candidate-limited, support-safe, and free of exchange adapter, credential loader, external signal, Telegram, webhook, Forex, or broad live worker coupling.
- Verified Forex live canary stays separate from crypto cohort and broad rollout readiness.
- Updated handoff docs and manual QA backlog to mark the controlled live AutoCopy MVP support layer as source-QA frozen.

Strict boundary:

- Stage 25E is an acceptance/freeze stage only. It does not enable broad live AutoCopy, create a broad live worker, add Forex broad rollout, execute orders, connect external signal previews to AutoCopy, or weaken payment, consent, entitlement, vault, preflight, kill-switch, pause, canary, or cohort gates.
- Browser-visible Stage 25 surfaces remain support-safe and exclude credentials, vault refs, account IDs, raw student IDs, raw order refs, provider payloads, exchange response payloads, broker passwords, MetaAPI tokens, API keys, and AutoCopy internals.

Verification:

```bash
npm run stage25e:qa
npm run stage25d:qa
npm run stage25c:qa
npm run stage25b:qa
npm run stage25a:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF
```

Recommended next stage:

- Choose the next product area separately. Controlled live AutoCopy support is source-QA frozen; do not broaden live execution unless a future explicit production launch prompt changes the gates after manual QA and owner approval.

## Stage 26A - Manual Browser QA Pack And Demo Readiness Fixes

Status: implemented. Stage 26A adds a practical manual browser QA/demo pack and source-level checks that the frozen MVP surfaces remain wired for a local demo.

What changed:

- Added `manual-demo-qa.md` with exact emulator, seed, and dev-server commands.
- Documented seeded local student, influencer/workspace, and Super Admin Auth emulator accounts.
- Organized seven must-test demo flows: student overview, practice terminal, manual journal, courses/proof, workspace dashboard, Super Admin readiness, and controlled live AutoCopy blocked/frozen posture.
- Added a concise influencer-facing presenter script and known deferred manual QA list.
- Added Stage 26A source QA to verify the demo pack, key routes, seeded credentials, frozen handoff references, and frozen acceptance scripts remain present.

Strict boundary:

- Stage 26A is documentation/demo-readiness only. It does not add product features, enable broad live AutoCopy, create workers, send messages, change payment/refund/payout/withdrawal behavior, add uploads/PDFs/AI/paid services/provider calls, weaken Firestore rules, or expose secrets, raw IDs, provider payloads, payment refs, broker passwords, MetaAPI tokens, API keys, or AutoCopy internals.

Verification:

```bash
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-23-STAGE26A-MANUAL-BROWSER-QA-DEMO-PACK-HANDOFF
```

Recommended next stage:

- Run the browser demo using `manual-demo-qa.md`, patch only concrete demo blockers, then choose the next product area separately.

## Stage 27A - Package Entitlements, Seat Caps, And Licence Model

Status: implemented. Stage 27A adds an internal package/licence model so TradeHub can sell private-quote workspace packages with server-derived seat-cap posture instead of relying only on pitch deck copy.

What changed:

- Added Launch Workspace, Pro Workspace, and Enterprise Workspace package/licence types with licence status, support window state, maintenance state, seat caps, active count, remaining seats, and over-limit posture.
- Added server-side helpers that derive package status from safe workspace/student records, with Launch capped at 50 active students, Pro capped at 500 active students, and Enterprise treated as custom-reviewed capacity unless an operator-provided cap exists.
- Added a fail-closed seat-cap helper and wired it into successful Paystack/Solana student activation so Launch/Pro caps block adding another active student while allowing an already-active student to renew.
- Added workspace UI showing current package, active student count, seat cap, remaining seats, over-limit warning, private quote/contact support prompt, and explicit copy that Trade Copier is a separate optional add-on.
- Added Super Admin package overview with bounded workspace scans, masked workspace refs, licence summaries, and over-limit counts.
- Added deny-by-default Firestore placeholders for package/licence storage paths.
- Added Stage 27A source QA.

Strict boundary:

- Stage 27A does not expose public prices in app UI, add refunds, payouts, withdrawals, wallet-transfer automation, payment settlement automation, uploads, paid hosting, PDFs, AI, messaging sends, provider calls, broad live AutoCopy, or Trade Copier inclusion in base packages.
- Browser-visible package surfaces show safe status/counts only and do not expose raw student IDs, raw payment refs, provider payloads, secrets, vault refs, account IDs, broker passwords, MetaAPI tokens, API keys, hidden candles, answer keys, private notes, or AutoCopy internals.
- Existing Paystack/Solana checkout and entitlement gates remain unchanged except read-only package visibility and reusable seat-cap checks.

Verification:

```bash
npm run stage27a:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-24-STAGE27A-PACKAGE-ENTITLEMENTS-SEAT-CAPS-HANDOFF
```

Recommended next stage:

- Run browser QA for package/seat status on `/workspace` and `/admin`, then decide whether Stage 27B should add a protected Super Admin package override workflow or move to the next product area.

## Stage 27B - Package Billing Terms, Maintenance Windows, And Admin Licence Ops

Status: implemented. Stage 27B adds internal support/maintenance/licence operations needed before selling lifetime workspace packages, without exposing public prices or adding money-movement automation.

What changed:

- Extended workspace package/licence records with licence start date, term type, included support window, maintenance renewal status/due date, support status, bounded admin note/status reason, and last reviewed timestamp.
- Added server-side helpers that derive support window state, maintenance state, licence health, workspace-safe prompts, and Super Admin summaries from safe package/student records.
- Added Super Admin-only licence ops route and panel controls to mark maintenance active, waived, custom review, or suspended from a masked workspace ref with bounded internal notes.
- Added workspace-safe visibility for support status, maintenance status, renewal due date, and contact TradeHub prompts while keeping pricing private quote/contact sales only.
- Added deny-by-default Firestore rules for licence ops paths.
- Added Stage 27B source QA covering support/maintenance statuses, masked admin refs, no public prices, no payment automation, and intact Stage 27A seat caps.

Strict boundary:

- Stage 27B does not collect licence payments, add refunds, payouts, withdrawals, wallet-transfer automation, settlement automation, Paystack/Solana checkout changes, public package prices, custom-domain implementation, uploads, PDFs, AI, messaging sends, external provider calls, Trade Copier inclusion in base packages, or broad live AutoCopy.
- Browser-visible package/licence surfaces show safe status, counts, masked workspace refs, and support prompts only.
- Super Admin licence notes are bounded/sanitized and must not include raw student IDs, raw workspace IDs, raw payment refs, provider payloads, secrets, vault refs, account IDs, broker passwords, MetaAPI tokens, API keys, hidden candles, answer keys, private notes, or AutoCopy internals.

Verification:

```bash
npm run stage27b:qa
npm run stage27a:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-24-STAGE27B-PACKAGE-BILLING-MAINTENANCE-OPS-HANDOFF
```

Recommended next stage:

- Run browser QA for package/licence status on `/workspace` and Super Admin `/admin`, then proceed to Stage 27C custom-domain/branding readiness only if those items will be promised in sales conversations.

## Stage 27C - Workspace Branding, Custom Domain Readiness, And White-Label Controls

Status: implemented. Stage 27C adds internal branding and custom-domain readiness controls for package sales conversations, without uploads, DNS automation, hosting-provider calls, public prices, or broad live AutoCopy changes.

What changed:

- Added package-aware branding/domain types for TradeHub-branded, co-branded, and white-label-ready workspaces, student-facing visibility state, custom-domain status, DNS checklist status, HTTPS logo URL metadata, bounded colors, and bounded admin review notes.
- Added server-side branding readiness helpers that sanitize display names, HTTPS logo URL metadata, brand colors, domain hostnames, DNS checklist copy, and package availability messages.
- Added workspace-safe branding/domain status on `/workspace`, including current display name, branding mode, student-facing preview state, logo metadata state, custom-domain readiness, DNS checklist summary, and contact TradeHub prompt.
- Added Super Admin branding/domain overview with masked workspace refs only, filters for requested/DNS pending/verifying/active/blocked/custom review, and bounded metadata-only review actions.
- Added deny-by-default Firestore rules for branding/domain ops and custom-domain readiness paths.
- Added Stage 27C source QA covering package-aware branding availability, HTTPS-only logo metadata, no uploads, no DNS/provider automation, no public prices, masked admin refs, and preserved frozen boundaries.

Strict boundary:

- Stage 27C does not upload logos, store files, provision DNS/SSL, call Vercel/Cloudflare/hosting providers, expose public package prices, collect licence payments, automate refunds/payouts/withdrawals, include Trade Copier in base packages, enable broad live AutoCopy, or weaken package/payment/entitlement/security gates.
- Browser-visible branding/domain surfaces show sanitized metadata, safe status labels, package availability copy, DNS checklist summaries, and masked workspace refs only.
- Super Admin branding/domain notes are bounded/sanitized and must not include raw student IDs, raw workspace IDs, payment refs, provider payloads, secrets, vault refs, account IDs, broker passwords, MetaAPI tokens, API keys, hidden candles, answer keys, private notes, or AutoCopy internals.

Verification:

```bash
npm run stage27c:qa
npm run stage27b:qa
npm run stage27a:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-24-STAGE27C-WORKSPACE-BRANDING-DOMAIN-WHITELABEL-HANDOFF
```

Recommended next stage:

- Browser-test `/workspace` and Super Admin `/admin` for package, licence, branding, domain, and Enterprise readiness, then continue to Stage 27E integration request workflow before Stage 27I/27J sales freeze if Enterprise remains in the deck.

## Stage 27D - Enterprise Deployment And SLA Readiness Model

Status: implemented. Stage 27D adds contract-scoped Enterprise deployment, SLA, backup/restore, data-residency, and rollback readiness metadata without provisioning infrastructure, changing DNS, collecting licence payments, or enabling live execution.

What changed:

- Added Enterprise deployment/SLA types for shared TradeHub cloud, isolated-tenant-ready, dedicated-deployment-ready, custom-contract modes, deployment review statuses, SLA statuses, backup/restore states, data-residency state, and masked Super Admin overview records.
- Added server-side Enterprise readiness helpers that compute workspace-safe and admin-safe deployment/SLA posture from the internal package/licence model.
- Added workspace-safe Enterprise readiness copy on `/workspace`, including package availability, deployment status, SLA posture, backup/restore state, data-residency status, contract-scope prompt, and compact readiness checklist.
- Added Super Admin Enterprise deployment/SLA panel with masked workspace refs only, filters for Enterprise/requested/scoping/security review/contract ready/active/blocked/custom review, and bounded metadata-only actions.
- Added Super Admin metadata route for Enterprise deployment review actions and deny-by-default Firestore rules for Enterprise deployment/readiness/ops paths.
- Added Stage 27D source QA covering contract-scoped copy, no infrastructure/provider automation, no public prices, masked admin refs, bounded notes, and preserved frozen boundaries.

Strict boundary:

- Stage 27D does not provision cloud infrastructure, create isolated tenants, create dedicated deployments, configure DNS/SSL, call hosting/cloud providers, collect licence payments, automate refunds/payouts/withdrawals, include Trade Copier in base packages, enable broad live AutoCopy, or weaken payment/entitlement/security gates.
- Browser-visible Enterprise surfaces show sanitized metadata, safe status labels, package availability copy, checklists, and masked workspace refs only.
- Super Admin Enterprise notes are bounded/sanitized and must not include raw student IDs, raw workspace IDs, payment refs, provider payloads, secrets, vault refs, account IDs, broker passwords, MetaAPI tokens, API keys, hidden candles, answer keys, private notes, or AutoCopy internals.

Verification:

```bash
npm run stage27d:qa
npm run stage27c:qa
npm run stage27b:qa
npm run stage27a:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-24-STAGE27D-ENTERPRISE-DEPLOYMENT-SLA-HANDOFF
```

Recommended next stage:

- Continue Stage 27E Enterprise integration request workflow, then Stage 27I package terms/pricing deck alignment and Stage 27J final browser QA/pre-sales acceptance freeze.

## Stage 27E - Enterprise Integration Request Workflow

Status: implemented. Stage 27E adds a contract-scoped Enterprise integration request/intake workflow without building CRM, payment, analytics, broker, Telegram/Discord, LMS, data-export, or provider adapters.

What changed:

- Added Enterprise integration request types for category, status, priority, estimated complexity, safe provider label/hostname metadata, data sensitivity flags, security review flag, legal/SLA dependency flag, bounded workspace-visible notes, and bounded internal admin notes.
- Added server-side Enterprise integration request helpers that sanitize and bound text, reject secret-like or URL-like freeform content, validate public hostnames, enforce Enterprise-package availability, and hash request/workspace refs for browser-safe display.
- Added protected workspace Enterprise integration request create/list API routes and a workspace `/workspace` intake section. Launch and Pro workspaces see contact TradeHub / Enterprise upgrade copy only.
- Added Super Admin Enterprise integration queue with masked workspace/request refs, filters, bounded metadata-only status actions, security/legal review flags, and workspace-visible note updates.
- Added deny-by-default Firestore rules for Enterprise integration request/ops paths.
- Added Stage 27E source QA covering Enterprise-only create, masked admin refs, secret rejection, no adapters/provider calls, no public prices, and preserved frozen boundaries.

Strict boundary:

- Stage 27E does not build real CRM/payment/analytics/broker/Telegram/Discord/LMS/data-export adapters, collect credentials, collect API keys, collect webhook secrets, call external providers, automate DNS/hosting/cloud infrastructure, collect licence payments, expose public prices, include Trade Copier in base packages, connect external signal preview to AutoCopy, or enable broad live AutoCopy.
- Browser-visible Enterprise integration surfaces show sanitized request metadata, safe hostname labels, safe status labels, workspace-visible notes, and masked refs only.
- Super Admin integration notes are bounded/sanitized and must not include raw student IDs, raw workspace IDs, credentials, tokens, webhook secrets, provider payloads, payment refs, secrets, vault refs, account IDs, broker passwords, MetaAPI tokens, API keys, hidden candles, answer keys, private notes, or AutoCopy internals.

Verification:

```bash
npm run stage27e:qa
npm run stage27d:qa
npm run stage27c:qa
npm run stage27b:qa
npm run stage27a:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-24-STAGE27E-ENTERPRISE-INTEGRATION-REQUEST-HANDOFF
```

Recommended next stage:

- Continue Stage 27I package terms/pricing deck alignment and sales readiness freeze, then Stage 27J final browser QA/pre-sales acceptance freeze. Build Stage 27F/27G/27H only if the sales promise changes to include real external sends, real Telegram/master-trader ingestion, or live AutoCopy execution.

## Stage 27I - Package Sales Readiness Smoke Pack

Status: implemented. Stage 27I adds a source-level package sales readiness smoke pack for the Launch, Pro, and Enterprise package model without adding new product features or public pricing.

What changed:

- Added a cross-stage package-sales QA script covering Stage 27A seat caps, Stage 27B support/maintenance/licence ops, Stage 27C branding/domain readiness, Stage 27D Enterprise deployment/SLA metadata, and Stage 27E Enterprise integration request metadata.
- Verified Launch remains capped at 50 active students, Pro remains capped at 500 active students, and Enterprise remains custom-reviewed/custom-capacity.
- Verified `/workspace` has package/licence, branding/domain, Enterprise readiness, and Enterprise integration request surfaces.
- Verified Super Admin has package/licence, branding/domain, Enterprise deployment/SLA, and Enterprise integration panels with masked refs and metadata-only actions.
- Verified Launch/Pro cannot use Enterprise integration intake and instead see Enterprise/contact TradeHub copy.
- Verified Firestore rules continue to deny direct browser access to package/licence, branding/domain, Enterprise deployment/SLA, and Enterprise integration ops paths.
- Verified frozen MVP references remain intact and `stage27i:qa` is wired.

Strict boundary:

- Stage 27I does not expose public prices in app UI, add licence checkout/payment collection, automate refunds/payouts/withdrawals/settlements, bundle Trade Copier into base packages, upload logos/files, provision DNS/SSL/hosting/cloud infrastructure, build real Enterprise adapters, collect credentials/tokens/webhook secrets, send messages, generate PDFs, add AI, or enable broad live AutoCopy.
- Stage 27I is a smoke/freeze layer only; actual browser QA remains deferred to Stage 27J/manual demo testing.

Verification:

```bash
npm run stage27i:qa
npm run stage27e:qa
npm run stage27d:qa
npm run stage27c:qa
npm run stage27b:qa
npm run stage27a:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-24-STAGE27I-PACKAGE-SALES-READINESS-SMOKE-HANDOFF
```

Recommended next stage:

- Continue Stage 27J final browser QA and pre-sales acceptance freeze before using Launch, Pro, or Enterprise package claims in a live sales conversation.

## Stage 27J - Package Sales Readiness Final Freeze

Status: implemented/source-QA frozen. Stage 27J adds the final source-level acceptance freeze for the Launch, Pro, and Enterprise package-selling model, without adding product features, public prices, payment collection, or automation.

What changed:

- Added a final Stage 27J acceptance QA script that verifies the complete package-sales surface across Stage 27A seat caps, Stage 27B support/maintenance/licence metadata, Stage 27C branding/domain readiness, Stage 27D Enterprise deployment/SLA metadata, Stage 27E Enterprise integration intake, and Stage 27I sales smoke coverage.
- Verified Launch remains capped at 50 active students, Pro remains capped at 500 active students, and Enterprise remains custom-capacity/custom-agreement.
- Verified package sales app surfaces and the no-public-pricing pitch deck do not expose public package prices.
- Verified Trade Copier remains a separate optional add-on and is not bundled into Launch, Pro, or Enterprise.
- Verified workspace and Super Admin package/licence, branding/domain, Enterprise deployment/SLA, and Enterprise integration surfaces remain metadata-only, masked-ref-only where applicable, and Firestore deny-by-default.
- Verified Launch/Pro cannot use Enterprise integration intake and receive Enterprise/contact TradeHub copy instead.
- Verified frozen MVP references remain intact and `stage27j:qa` is wired.
- Updated manual QA backlog to group package-sales manual checks into Must Test Before Sales Demo, Nice To Test, and Later Regression.

Strict boundary:

- Stage 27J does not expose public prices in app UI, collect licence payments, automate refunds/payouts/withdrawals/settlements/invoices, bundle Trade Copier into base packages, upload logos/files, provision DNS/SSL/hosting/cloud infrastructure, build real Enterprise adapters, collect credentials/tokens/webhook secrets/private URLs, send messages, generate PDFs, add AI, connect external signal preview to AutoCopy, or enable broad live AutoCopy.
- Package Sales MVP is source-QA frozen. Before a live sales meeting, run the deferred browser sales-demo checklist and confirm commercial/legal wording.

Verification:

```bash
npm run stage27j:qa
npm run stage27i:qa
npm run stage27e:qa
npm run stage27d:qa
npm run stage27c:qa
npm run stage27b:qa
npm run stage27a:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-24-STAGE27J-PACKAGE-SALES-MVP-FINAL-HANDOFF
```

Recommended next stage:

- Stop adding package-sales features until the owner runs browser QA and reviews the pitch/commercial terms. Choose the next product area separately, or patch only concrete sales-demo blockers.

## Stage 28A - Demo Seed Pack

Status: implemented/source-QA ready. Stage 28A adds a deterministic local Firebase emulator seed pack so TradeHub can be browser-tested end to end with realistic Launch, Pro, Enterprise, student, workspace, Super Admin, course, practice, manual journal, and package-sales data before final demo QA.

What changed:

- Added `scripts/seed-demo-data.mjs` and the clear commands `npm run seed:demo` / `npm run stage28a:seed`.
- Seeded deterministic demo Auth users for Super Admin, Launch/Pro/Enterprise influencers, and active/pending/payment-issue student personas.
- Seeded deterministic Firestore records for Launch 50-seat, Pro 500-seat, and Enterprise custom-review package postures.
- Seeded workspace CRM lifecycle states, subscription/access summaries, package/licence/maintenance state, branding/domain readiness metadata, Enterprise deployment/SLA metadata, and an Enterprise integration request.
- Seeded demo course/lesson/progress/check/resource data, practice/backtesting data with one closed simulated trade, manual journal trades with mixed outcomes, assignment/cohort/feedback data, and notification state.
- Kept the seed idempotent with deterministic IDs, emulator-only safety defaults, merge upserts, and undefined-field cleanup.
- Added `scripts/qa-stage28a-demo-seed-pack.mjs` to verify seed wiring, deterministic IDs, coverage across product areas, no public package prices, no secrets/provider payloads, no live/provider calls, no Trade Copier bundling, and frozen script wiring.
- Updated the manual QA backlog and prompt summary with the Stage 28A handoff and demo seed instructions.

Strict boundary:

- Stage 28A does not seed real credentials, API keys, tokens, webhook secrets, vault refs, broker passwords, MetaAPI tokens, provider payloads, payment refs, account IDs, raw private provider data, or real student personal data.
- Stage 28A does not add public package prices, enable broad live AutoCopy, create live orders, call providers, send email/SMS/WhatsApp/push, call MetaAPI/Binance/Bybit/Paystack/Solana/Telegram/DNS/hosting/messaging providers, or weaken Firestore rules.
- Trade Copier remains a separate optional add-on in demo metadata and is not bundled into Launch, Pro, or Enterprise.

Verification:

```bash
npm run stage28a:qa
npm run stage27j:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Reference:

```text
TH-2026-08-24-STAGE28A-DEMO-SEED-PACK-HANDOFF
```

Recommended next stage:

- Run the browser demo QA pack against the seeded local emulator data, then patch only concrete browser/demo blockers. Do not add new product surfaces before the demo pass.

## Stage 28B - Playwright Browser QA Foundation

Status: implemented/source-QA ready. Stage 28B adds the first real Playwright browser QA foundation for TradeHub, using the Stage 28A demo seed pack and local emulator/dev-server setup.

What changed:

- Added Playwright as an explicit dev dependency and added `playwright.config.mjs`.
- Added `npm run browser:qa` for real browser smoke tests and `npm run stage28b:qa` for source-level infrastructure checks.
- Added browser helpers for seeded student, workspace/influencer, and Super Admin sign-in using the Stage 28A demo accounts.
- Added common browser assertions for page readiness, no server/runtime crash copy, no Next.js error overlay, no public Launch/Pro/Enterprise package prices, no raw demo IDs, and no secret-shaped rendered strings.
- Added smoke coverage for `/`, `/app`, `/app/practice`, `/app/courses`, `/app/journal`, `/workspace`, and `/admin`.
- Kept browser QA as an explicit command separate from `npm run build`, because it requires local Firebase emulators, seeded demo data, and a dev server.
- Updated the manual QA backlog and prompt summary with the Stage 28B handoff and browser QA run sequence.

Strict boundary:

- Stage 28B does not add product features, redesign UI, add real external calls, call MetaAPI/Binance/Bybit/Paystack/Solana/Telegram/messaging/DNS/hosting providers, send messages, seed or expose secrets, expose raw IDs, add public package prices, enable broad live AutoCopy, or weaken Firestore rules.
- Browser QA uses local routes and seeded emulator personas only.

Verification:

```bash
npm run stage28b:qa
npm run stage28a:qa
npm run stage27j:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Manual/browser QA command sequence:

```bash
npm run firebase:emulators
npm run seed:demo
npm run browser:qa
```

Reference:

```text
TH-2026-08-24-STAGE28B-PLAYWRIGHT-BROWSER-QA-FOUNDATION-HANDOFF
```

Recommended next stage:

- Add student-focused browser E2E coverage for the seeded demo routes, then run `npm run browser:qa:student` and `npm run browser:qa` against the local emulators and seeded demo data.

## Stage 28C - Student End-to-End Browser QA

Status: implemented/source-QA ready. Stage 28C adds real Playwright student E2E coverage on top of the Stage 28A seed pack and Stage 28B browser QA foundation.

What changed:

- Added a seeded student E2E spec for `/app`, `/app/practice`, seeded practice terminal/report routes, `/app/courses`, seeded course reader/proof routes, `/app/journal`, seeded manual trade review, reminder preferences, and cross-role blocking for `/workspace` and `/admin`.
- Added student browser helper utilities with deterministic demo IDs and student-specific privacy guards for provider payloads, vault refs, raw provider/payment fields, answer-key fields, and support-only internals.
- Added `npm run browser:qa:student` for the student-focused browser suite and `npm run stage28c:qa` for source-level guard checks.
- Kept full order placement, lesson completion, import/export mutation, and chart hover/pan interactions as manual browser follow-ups where selectors and data state are more fragile.
- Updated `manual-demo-qa.md`, `manual-test-backlog.md`, and `prompt/promptsumary.md` with the Stage 28C handoff and run sequence.

Strict boundary:

- Stage 28C adds browser QA infrastructure only. It does not add product features, redesign UI, call external providers, enable broad live AutoCopy, place orders, send messages, seed/expose secrets, add public package prices, or weaken Firestore rules.
- Student browser tests reuse the existing seeded local Auth/Firebase emulator personas and shared no-error/no-secret/no-price browser assertions.

Verification:

```bash
npm run stage28c:qa
npm run stage28b:qa
npm run stage28a:qa
npm run stage27j:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Manual/browser QA command sequence:

```bash
npm run firebase:emulators
npm run seed:demo
npm run browser:qa:student
npm run browser:qa
```

Reference:

```text
TH-2026-08-24-STAGE28C-STUDENT-BROWSER-E2E-HANDOFF
```

Recommended next stage:

- Run the student and full browser suites against local emulators, then patch only concrete browser/demo blockers.

## Stage 28D - Workspace And Super Admin End-to-End Browser QA

Status: implemented/source-QA ready. Stage 28D adds seeded Playwright browser E2E coverage for workspace/influencer and Super Admin demo surfaces on top of the Stage 28A seed pack and Stage 28B/28C browser QA foundation.

What changed:

- Added a workspace/admin E2E spec for `/workspace` and `/admin`, using the seeded Pro influencer and Super Admin personas.
- Added workspace/admin browser helper utilities with support-safe rendered-text guards for provider payloads, vault refs, raw payment/provider fields, raw seeded IDs, credentials, and execution internals.
- Workspace browser coverage checks the workspace shell, package/licence card, seat cap/private quote copy, Trade Copier add-on separation, Student CRM, practice insights, workspace drills, course visibility, branding/domain, Enterprise readiness, Enterprise integration posture, external preview, and wrong-role blocking for `/admin`.
- Super Admin browser coverage checks package/licence, branding/domain, Enterprise deployment/SLA, Enterprise integration, payment/support, messaging dry-run, external signal ingestion, live AutoCopy readiness/incident posture, and wrong-role behavior for `/app/journal`.
- Added `npm run browser:qa:workspace-admin` for the workspace/admin browser suite and `npm run stage28d:qa` for source-level guard checks.
- Updated `manual-demo-qa.md`, `manual-test-backlog.md`, and `prompt/promptsumary.md` with the Stage 28D handoff and run sequence.

Strict boundary:

- Stage 28D adds browser QA infrastructure only. It does not add product features, redesign UI, call external providers, enable broad live AutoCopy, place orders, send messages, seed/expose secrets, add public package prices, or weaken Firestore rules.
- Workspace/admin browser tests reuse the existing seeded local Auth/Firebase emulator personas and shared no-error/no-secret/no-price browser assertions.

Verification:

```bash
npm run stage28d:qa
npm run stage28c:qa
npm run stage28b:qa
npm run stage28a:qa
npm run stage27j:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Manual/browser QA command sequence:

```bash
npm run firebase:emulators
npm run seed:demo
npm run browser:qa:workspace-admin
npm run browser:qa:student
npm run browser:qa
```

Reference:

```text
TH-2026-08-24-STAGE28D-WORKSPACE-ADMIN-BROWSER-E2E-HANDOFF
```

Recommended next stage:

- Run the workspace/admin, student, and full browser suites against local emulators, then patch only concrete browser/demo blockers.

## Stage 28E - Browser QA Bug-Fix And UX Polish Pass

Status: implemented/source-QA ready. Stage 28E tightens the Stage 28A-D browser QA path without adding product features or changing business logic.

What changed:

- Centralized browser forbidden rendered-text checks in the shared Playwright assertions helper.
- Added a tolerant `assertSafeRoleBoundary` helper so wrong-role tests accept either a safe blocked page or safe redirect while still failing real crashes/leaks.
- Improved seeded-auth failure diagnostics with emulator/seed/dev-server guidance and visible text snippets.
- Updated student and workspace/admin flow helpers to reuse the shared no-secret/no-price/no-error and safe role-boundary helpers.
- Added `npm run stage28e:qa` for source-level browser QA polish checks.
- Updated manual runbooks with `npx playwright install chromium`, exact emulator/seed/dev-server/browser command order, reuse-server mode, auth-failure triage, and Playwright artifact locations.

Strict boundary:

- Stage 28E is polish/testability only. It does not add product features, redesign UI, call external providers, enable broad live AutoCopy, place orders, send messages, seed/expose secrets, add public package prices, or weaken Firestore rules.

Verification:

```bash
npm run stage28e:qa
npm run stage28d:qa
npm run stage28c:qa
npm run stage28b:qa
npm run stage28a:qa
npm run stage27j:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Manual/browser QA command sequence:

```bash
npx playwright install chromium
npm run firebase:emulators
npm run seed:demo
npm run dev:stage15f
npm run browser:qa
npm run browser:qa:student
npm run browser:qa:workspace-admin
```

Reference:

```text
TH-2026-08-24-STAGE28E-BROWSER-QA-POLISH-HANDOFF
```

Recommended next stage:

- Run the browser suites locally against emulators and patch only concrete browser-demo blockers.

## Stage 28F - Final Demo Readiness Freeze

Goal: freeze the internally buildable TradeHub demo-readiness path. This stage is final acceptance QA and runbook clarity only; it does not add product features, change business logic, redesign UI, call providers, or loosen any security boundary.

What Stage 28F adds:

- Added `npm run stage28f:qa`.
- Added `scripts/qa-stage28f-final-demo-readiness.mjs`.
- Final acceptance QA covers the deterministic demo seed command, Stage 28A seed coverage, Playwright config, browser QA commands, smoke/student/workspace-admin browser suites, shared auth/assertion helpers, no-error/no-overlay/no-secret/no-public-price guards, wrong-role boundary tests, exact local run sequence, browser failure triage/report locations, and frozen MVP references.
- Marked internal build/demo readiness as source-QA frozen in `plan.md`, `manual-test-backlog.md`, `manual-demo-qa.md`, and `prompt/promptsumary.md`.
- Reorganized final browser/manual demo readiness into:
  - Must Run Before Any Sales Demo
  - If Browser QA Fails
  - Known External Setup Still Required
  - Later Regression

Strict boundary:

- Stage 28F is a freeze/readiness stage only. It does not add new product surfaces, change payment/entitlement/package/practice/course/journal/CRM/Enterprise/AutoCopy/messaging/signal/live-execution logic, call external providers, enable broad live AutoCopy, send messages, place orders, expose or seed secrets/raw IDs/provider payloads, add public prices, or weaken Firestore rules.

Verification:

```bash
npm run stage28f:qa
npm run stage28e:qa
npm run stage28d:qa
npm run stage28c:qa
npm run stage28b:qa
npm run stage28a:qa
npm run stage27j:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Final browser QA runbook:

```bash
npx playwright install chromium
npm run firebase:emulators
npm run seed:demo
npm run clean:next
npm run dev:stage15f
npm run browser:qa:student
npm run browser:qa:workspace-admin
npm run browser:qa
```

Do not claim browser QA passed unless it actually ran. If browser QA fails, inspect `test-results` and `playwright-report`, record the failing route/persona/screenshot/trace, and fix concrete blockers in a follow-up bug-fix stage.

Reference:

```text
TH-2026-08-24-STAGE28F-FINAL-DEMO-READINESS-HANDOFF
```

Recommended next:

- Run the browser suites locally against emulators and seeded data, then patch only concrete browser/demo blockers or choose the next product area separately.

## Selected Remaining Build Plan

Owner decision: continue with only these four remaining areas.

1. Real Forex/CFD historical data provider.
2. External messaging/reminders outside the app.
3. External master-trader / Telegram signal ingestion.
4. Controlled broad live AutoCopy execution.

Explicitly removed from the remaining plan:

- Uploads, file hosting, paid video hosting, and stored media workflows.
- Refunds, payouts, withdrawals, wallet-transfer automation, or money-movement automation beyond existing payment verification/support visibility.
- AI grading, AI trade analysis, AI coaching, AI search, or AI-generated recommendations.

Recommended prompt count: 13 prompts for the safer path, or 11 prompts if final freeze stages are compressed. Use 13 unless speed becomes more important than isolation.

Recommended order:

1. Stage 22A: Real Forex/CFD Historical Provider Contract And Vault Gate. Completed.
2. Stage 22B: Real Forex/CFD Historical Provider Adapter, Cache, And Freeze. Completed.
3. Stage 23A: External Reminder Preferences, Consent, Templates, And Safe Queue. Completed.
4. Stage 23B: External Reminder Provider Adapter, Delivery Status, And Freeze. Dry-run worker completed.
4a. Stage 23C: Messaging Preferences, Consent, And Suppression Safety Gates. Completed.
4b. Stage 23D: Messaging MVP Final Acceptance Freeze. Completed.
5. Stage 24A: External Signal Source Model, Signing, Deduplication, And Fail-Closed Ingestion. Completed.
6. Stage 24B: Telegram/Master-Trader Parser, Moderation, And Influencer Review Queue. Completed.
7. Stage 24C: External Signal Preview Integration And Ingestion MVP Freeze. Completed.
8. Stage 25A: Broad Live AutoCopy Production Readiness Audit And Launch Gates. Completed.
9. Stage 25B: Controlled Live AutoCopy Cohort Gate. Completed.
10. Stage 25C: Controlled Crypto Live AutoCopy Cohort Rollout. Completed.
11. Stage 25D: Live AutoCopy Reconciliation, Incident, And Rollback Hardening. Completed.
12. Stage 25E: Live AutoCopy Final Acceptance Freeze. Completed/source-QA frozen.

Remaining estimate: Stage 27A, Stage 27B, Stage 27C, Stage 27D, Stage 27E, Stage 27I, and Stage 27J add internal package/licence status, seat caps, support windows, maintenance state, Super Admin licence ops, branding modes, custom-domain readiness, Enterprise deployment/SLA readiness, Enterprise integration request/intake metadata, source-level package-sales smoke coverage, and final package-sales acceptance. Stage 28A adds the deterministic local demo seed pack. Stage 28B adds the Playwright browser QA foundation. Stage 28C adds seeded student browser E2E coverage. Package Sales MVP is source-QA frozen; complete browser/manual sales-demo QA before selling.

Current frozen foundations remain:

- Practice 18X: `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`
- Courses 19I: `TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`
- Ops 20D: `TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF`
- Manual Journal 21D: `TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF`
- Forex/CFD History 22B: `TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF`
- Messaging 23D: `TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF`
- External Signal Ingestion 24C: `TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF`
- Controlled Live AutoCopy 25E: `TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF`
- Manual Browser Demo Pack 26A: `TH-2026-08-23-STAGE26A-MANUAL-BROWSER-QA-DEMO-PACK-HANDOFF`
- Package Entitlements 27A: `TH-2026-08-24-STAGE27A-PACKAGE-ENTITLEMENTS-SEAT-CAPS-HANDOFF`
- Package Billing/Maintenance 27B: `TH-2026-08-24-STAGE27B-PACKAGE-BILLING-MAINTENANCE-OPS-HANDOFF`
- Workspace Branding/Domain 27C: `TH-2026-08-24-STAGE27C-WORKSPACE-BRANDING-DOMAIN-WHITELABEL-HANDOFF`
- Enterprise Deployment/SLA 27D: `TH-2026-08-24-STAGE27D-ENTERPRISE-DEPLOYMENT-SLA-HANDOFF`
- Enterprise Integration Requests 27E: `TH-2026-08-24-STAGE27E-ENTERPRISE-INTEGRATION-REQUEST-HANDOFF`
- Package Sales Readiness Smoke 27I: `TH-2026-08-24-STAGE27I-PACKAGE-SALES-READINESS-SMOKE-HANDOFF`
- Package Sales MVP Final 27J: `TH-2026-08-24-STAGE27J-PACKAGE-SALES-MVP-FINAL-HANDOFF`
- Demo Seed Pack 28A: `TH-2026-08-24-STAGE28A-DEMO-SEED-PACK-HANDOFF`
- Playwright Browser QA Foundation 28B: `TH-2026-08-24-STAGE28B-PLAYWRIGHT-BROWSER-QA-FOUNDATION-HANDOFF`
- Student Browser E2E 28C: `TH-2026-08-24-STAGE28C-STUDENT-BROWSER-E2E-HANDOFF`
 
## Pre-Sales Package Completion Plan

Owner decision: before TradeHub starts selling the new lifetime packages, every promised package capability must either be built, source-QA checked, browser-smoked, or explicitly written as a contract-scoped custom service. Do not present a feature as included if it is only a placeholder, dry-run, readiness gate, or future integration.

Pricing package baseline:

- Creator Lifetime: NGN 15,000,000, up to 50 active students.
- Pro Lifetime: NGN 70,000,000, up to 500 active students.
- Enterprise: from NGN 150,000,000, custom agreement.

Current package readiness:

- Creator Lifetime is mostly built from frozen Practice 18X, Courses 19I, Ops 20D, Manual Journal 21D, Messaging 23D dry-run/in-app readiness, and Stage 26A demo pack.
- Pro Lifetime is mostly built from Creator plus assignments, cohorts, instructor feedback, practice analytics/reports, workspace-safe insights, external preview, and controlled AutoCopy readiness.
- Enterprise is only partially built because enterprise promises need tenant controls, contractual limits, custom domain/branding, dedicated deployment planning, integrations, SLA/maintenance terms, and explicit production launch gates.

### Not Yet Built From The Pricing Package

These items must be completed before selling them as included capabilities:

1. Seat and package entitlement enforcement.
   - Hard-enforce Creator up to 50 active students.
   - Hard-enforce Pro up to 500 active students.
   - Add package labels, over-limit states, upgrade prompts, admin override visibility, and source QA.
   - Do not rely only on pricing-page copy.

2. Package billing/licence terms and maintenance contract model.
   - Implemented in Stage 27B at the internal product level: licence term type, included support window, maintenance-renewal status, support status, bounded Super Admin notes, workspace-safe visibility, and masked admin licence ops.
   - Remaining commercial/legal work: final contract language, exact maintenance fee terms, and browser/manual QA before sales.
   - Stage 27B did not add refunds, payouts, withdrawals, wallet-transfer automation, public prices, or payment collection.

3. Custom domain and workspace branding.
   - Implemented in Stage 27C at the readiness/metadata level: package-aware brand mode, display name, HTTPS logo URL metadata, safe colors, student-facing visibility state, custom-domain status, DNS checklist status, workspace-safe visibility, and Super Admin masked-ref review actions.
   - Remaining implementation work before claiming live custom domains: real DNS provider workflow, SSL/hosting configuration, domain ownership proof process, and browser/manual QA.
   - Stage 27C does not enable arbitrary file uploads, paid storage, DNS automation, SSL provisioning, hosting-provider calls, or raw provider/domain internals.

4. White-label package controls.
   - Implemented in Stage 27C as readiness controls: Launch stays TradeHub-branded/light co-branded, Pro can be co-branded/white-label-ready, and Enterprise remains custom-reviewed.
   - Remaining sales/legal work: exact white-label terms, brand-use guidelines, domain responsibility, and manual QA before promising as production-active.
   - Stage 27C keeps all security, auth, payment, entitlement, data, and AutoCopy boundaries unchanged.

5. Real external messaging provider delivery.
   - Messaging is currently source-QA frozen as dry-run/no-send at Stage 23D.
   - To sell real email/SMS/WhatsApp reminders, add a separate provider implementation with consent, suppression, contact verification, rate limits, audit logs, vault secrets, and no message body leakage.
   - Keep in-app notifications available as the safe default until this is finished.

6. Real Telegram or master-trader ingestion.
   - External signal ingestion is currently frozen as safe mock/review/read-only preview at Stage 24C.
   - To sell real Telegram/master-trader ingestion, add a provider-specific ingestion worker, signature/webhook verification or approved bot setup, source allowlisting, dedupe, quarantine, moderation, and no direct AutoCopy execution.
   - External candidates must stay non-executable until a separately approved bridge is built.

7. Production live AutoCopy launch beyond dry-run/cohort support.
   - Controlled live AutoCopy is frozen at Stage 25E as readiness, gates, cohort dry-run, incident, and rollback support.
   - Broad live execution is not enabled.
   - Before selling live execution as included, complete owner-approved production launch stages with real browser QA, vault readiness, canary evidence, reconciliation evidence, kill-switch drills, and explicit order-call approval.
   - Forex broad live rollout must remain separate from crypto.

8. Dedicated infrastructure and enterprise deployment option.
   - Implemented in Stage 27D at the readiness/metadata level: shared cloud, isolated-tenant-ready, dedicated-deployment-ready, and custom-contract modes; deployment status; SLA posture; backup/restore responsibility; data-residency state; rollback checklist; workspace-safe visibility; and Super Admin masked-ref review actions.
   - Remaining implementation work before claiming active dedicated infrastructure: real deployment architecture, infrastructure/provider setup, security review, backup/restore drill evidence, support runbook evidence, signed SLA, and browser/manual QA.
   - Stage 27D does not provision cloud infrastructure, create tenants, configure DNS/SSL, call hosting/cloud providers, collect payments, automate money movement, or enable live execution.

9. Custom integrations framework.
   - Implemented in Stage 27E at the request/intake level: Enterprise workspaces can submit custom integration requests, Launch/Pro workspaces see Enterprise/contact copy, Super Admin can review/update statuses with masked refs, and request metadata stays support-safe.
   - Remaining implementation work before claiming live integrations: each specific adapter needs its own approved design, credential/vault boundary, provider contract, security review, and QA.
   - Stage 27E does not expose credentials, tokens, webhook secrets, provider payloads, raw workspace/student IDs, or customer private data in browser views.

10. Legal, SLA, and commercial documents.
    - Create package terms for lifetime licence, support scope, maintenance renewal, fair-use limits, student-seat definitions, data processing, uptime expectations, and excluded custom work.
    - Add browser-safe admin/workspace visibility for licence/support state.
    - Do not use "anything he wants" in the product or legal copy. Enterprise should say "custom agreement with negotiated capacity, infrastructure, support, integrations, and service terms."

11. Full browser/manual QA before sales.
    - Stage 26A created the manual demo pack, but full browser QA is still deferred.
    - Complete the manual browser flows in `manual-demo-qa.md` and `manual-test-backlog.md`.
    - Patch concrete demo blockers only, then run the relevant acceptance chain before using the deck for sales.

### Recommended Pre-Sales Stage Order

Use this order unless a production bug interrupts it:

1. Stage 27A: Package Entitlements, Seat Caps, And Licence Model.
2. Stage 27B: Package Billing Terms, Maintenance Windows, And Admin Licence Ops.
3. Stage 27C: Workspace Branding, Custom Domain Readiness, And White-Label Controls.
4. Stage 27D: Enterprise Deployment And SLA Readiness Model.
5. Stage 27E: Enterprise Integration Request Workflow.
6. Stage 27F: Real Messaging Provider Delivery Gate, only if external reminders will be sold as real sends.
7. Stage 27G: Real Telegram/Master-Trader Ingestion Gate, only if external ingestion will be sold as real ingestion.
8. Stage 27H: Live AutoCopy Production Launch Gate, only if live execution will be sold as enabled.
9. Stage 27I: Package Sales Readiness Smoke Pack. Completed/source-QA ready.
10. Stage 27J: Package Sales Readiness Final Freeze. Completed/source-QA frozen.

Recommended minimum before selling:

- Stage 27A, Stage 27B, Stage 27C, Stage 27I, and Stage 27J are implemented/source-QA ready before selling Launch/Creator or Pro.
- Stage 27D and Stage 27E are implemented/source-QA ready before selling Enterprise.
- Browser/manual sales-demo QA, final legal/commercial copy review, and owner approval are still required before a real sales conversation.
- Build Stage 27F only if promising real external email/SMS/WhatsApp sends.
- Build Stage 27G only if promising real Telegram/master-trader ingestion.
- Build Stage 27H only if promising live AutoCopy execution beyond controlled readiness/dry-run.

Strict boundary:

- Do not re-add removed upload/file-hosting, refund/payout/withdrawal automation, wallet-transfer automation, or AI features unless the owner explicitly reverses that decision in a new stage.
- Do not weaken frozen Practice 18X, Courses 19I, Ops 20D, Manual Journal 21D, Forex/CFD History 22B, Messaging 23D, External Signal Ingestion 24C, or Controlled Live AutoCopy 25E boundaries.
- Do not expose secrets, vault refs, raw student IDs, raw session IDs, provider payloads, payment payloads, broker passwords, MetaAPI tokens, API keys, hidden candles, answer keys, private notes, or AutoCopy internals in browser responses.

## Complaint Resolution Implementation

### Stage 29A - Student Home And Course Copy Simplification

Status: implemented/source-QA ready.

Reference: `TH-2026-08-24-STAGE29A-STUDENT-HOME-COURSE-SIMPLIFICATION-HANDOFF`

What changed:

- Removed the ordinary student-facing Reminder Preferences card from `/app`.
- Kept the dormant Stage 23 messaging backend and compatibility component, but normal student navigation no longer exposes reminder preferences, external email/SMS/WhatsApp copy, delivery/suppression copy, or dry-run messaging language.
- Refocused the student home around Courses, Signals, Copier, Journal, Practice, and Billing.
- Rewrote student Course list, lesson reader, resources, knowledge check, notes/bookmarks, completion, and proof copy into plain learning language.
- Added browser/source guards so Course screens are checked for prohibited engineering wording such as API, server-owned/server-side, metadata, Firestore, stage names, and source-QA.

Security/privacy boundaries:

- Course access, entitlement, published-course, lesson-lock, quiz, proof, and private-note ownership behavior remains unchanged.
- Answer keys remain hidden before submission.
- Private notes, bookmarks, and resume points remain student-owned.
- No real messaging sends, payments, uploads, AI, provider calls, or live execution behavior were added.

Next stage:

- Stage 29B was explicitly requested and is recorded below. Stage 29C remains pending.

### Stage 29B - Practice Hub And Sessions Navigation

Status: implemented/source-QA ready. Owner browser testing remains deferred.

Reference: `TH-2026-08-24-STAGE29B-PRACTICE-HUB-SESSIONS-HANDOFF`

What changed:

- Replaced the long default `/app/practice` stack with two primary choices: Backtesting Session and Sessions.
- Kept existing creation, analytics, assignments, strategies, import/export, archived sessions, and notifications in focused Practice views rather than loading every panel at once.
- Preserved session search, filters, sorting, bounded load-more behavior, terminal/review/report navigation, setup-only duplication, and archive/restore actions.
- Added a right-side session settings drawer with safe read-only setup and result details, keyboard Escape handling, and stable action controls.
- Added protected permanent deletion for standalone student-owned sessions. It requires exact session-name confirmation, deletes bounded session-owned records and deterministic practice-ledger records, and returns no deleted private records.
- Assignment/review-linked sessions cannot be permanently deleted and remain archive-only.
- Updated student Playwright coverage and Stage 18L/18X source compatibility checks for the new navigation and copy.

Security/privacy boundaries:

- The delete route uses `requireStudent`; repository ownership is derived from the authenticated actor and route session ID, never browser-supplied workspace/student IDs.
- Firestore browser rules remain deny-by-default for protected Practice paths.
- Practice remains simulated-only. No provider, broker/exchange, AutoCopy, payment, course, journal, or live-execution behavior changed.

Next stage:

- Stage 29C - Quick Session, Asset Catalog, And Strategy Simplification remains pending. Do not implement it until explicitly requested.

### Stage 29C - Quick Session, Verified Asset Catalogue, And Strategy Simplification

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Automated student browser QA passed on 25 August 2026 after refreshing the deterministic demo seed. Owner visual acceptance is still the gate before Stage 29C.1, Stage 29C.2, or Stage 29D.

Reference: `TH-2026-08-25-STAGE29C-QUICK-SESSION-ASSET-STRATEGY-HANDOFF`

What changed:

- Backtesting Session now opens a compact opaque-black dialog with name, balance, optional Strategy, verified asset selection, timeframe, dates, quick ranges, random start, and terminal-navigation choice.
- The protected Practice overview returns a safe catalogue of five Crypto pairs, seven Forex majors, and XAUUSD. Forex/Metals entries are disabled when the existing historical-data readiness gate is not configured.
- Session creation now validates the exact catalogue entry, timeframe, balance, date/range/candle limits, optional student-owned Strategy, and historical candle availability before writing a session.
- Sessions created with No strategy can place simulated orders normally; those orders remain in overall analytics without being assigned to a Strategy breakdown.
- Student candle responses omit provider names, provider symbols, and cache identifiers; those implementation details remain server-side.
- The local demo seed includes a deterministic bounded BTCUSDT candle cache so Playwright can create a real protected session without depending on an internet request.
- Ordinary student-facing Practice copy uses Strategy while internal `playbookId`, routes, storage, and analytics compatibility remain unchanged.
- Focused browser coverage checks Escape/backdrop/focus behavior, opaque modal styling, asset search/categories, unavailable assets, validation, duplicate-submit protection, Sessions highlighting, terminal navigation, and the Stage 29B settings drawer.
- Quick ranges now work backward from the selected End date and include +1Y. Random start immediately displays a bounded randomized date window and can be shuffled again before creation.

Preserved:

- Practice remains student-owned and simulated-only. No hidden candles, provider payloads, account IDs, secrets, AutoCopy coupling, payment changes, or live order execution were added.
- Stage 29B hub/session management, opaque settings drawer, setup-only duplication, archive/restore, protected deletion, and ledger-before-order cleanup remain intact.
- Stage 29C.1 is implemented below. Stage 29C.2 and Stage 29D remain pending.

Next stage:

- Stage 29C.1 was explicitly approved and is implemented below. Do not begin Stage 29C.2 or Stage 29D without owner acceptance.

### Stage 29C.1 - Dynamic Forex And CFD Asset Expansion

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-26-STAGE29C1-DYNAMIC-FOREX-CFD-CATALOGUE-HANDOFF`

What changed:

- Expanded the approved canonical Practice universe to 7 Forex majors, 21 Forex crosses, Gold, Silver, 6 index CFDs, and 2 energy CFDs.
- Added server-only MetaAPI utility symbol discovery and specification reads. Only approved provider matches with valid digits, tick size, volume bounds/step, and contract size become selectable.
- Added bounded discovery behavior: at most 2,000 provider symbols, four specification requests per batch, and a 15-minute in-memory safe catalogue cache.
- Kept provider aliases and broker suffixes private. Student responses contain canonical symbol, readable name, category, availability, and normalized simulation specs only.
- Added explicit Indices and Energies filters to Quick Session. Local emulator/dev QA uses the opt-in deterministic static demo provider; normal real-provider defaults remain disabled, dry-run, and vault-gated.
- Session creation rechecks current catalogue availability and candle availability before persistence, then stores a safe instrument snapshot used by sizing, P&L, exports, terminal/replay, and practice-ledger mapping.
- Added `npm run stage29c1:qa` plus student browser coverage across Forex cross, Metals, Indices, and Energies categories.

Preserved:

- No stocks, exchange futures, agriculture contracts, provider credentials, account IDs, broker aliases, raw provider payloads, private APIs, AutoCopy coupling, payment changes, or live execution were added.
- Crypto remains on its existing approved public-history path. Real Forex/CFD history still requires the Stage 22B platform utility gates and fails closed when unavailable.
- Stage 29B session management and Stage 29C quick-session behavior remain intact.

Next stage:

- Stop after Stage 29C.1 for owner testing. Stage 29C.2 Expanded Crypto Asset Catalogue and Stage 29D Practice Terminal reorganization remain pending.

### Stage 29C.2: Expanded Verified Crypto Asset Catalogue

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-26-STAGE29C2-EXPANDED-CRYPTO-CATALOGUE-HANDOFF`

What changed:

- Added a TradeHub-approved canonical allowlist of 66 unique USDT spot candidates spanning established Layer 1, Layer 2, DeFi, oracle, infrastructure, storage, payment, and other liquid assets.
- Added a server-only Binance public spot catalogue adapter. A pair becomes selectable only when its status is trading, quote is USDT, spot permission is present, and PRICE_FILTER, LOT_SIZE, and MIN_NOTIONAL/NOTIONAL values normalize safely.
- Added a bounded response limit, request timeout, normalized safe Firestore cache, and approximately 15-minute runtime cache. Raw exchange responses and filters are never stored or returned.
- New sessions and orders snapshot verified price precision, quantity precision, LOT_SIZE quantity step, tick size, quantity bounds, notional bounds, and practice-only copy. Risk sizing rounds down to the permitted step; SL/TP edits recheck ticks; partial closes conserve aligned quantity without drift.
- Patched Quick Session to use one compact Asset combobox. Its opaque-black catalogue mounts only when opened, preserves the selected instrument, supports counted categories, search, arrow-key selection, Escape precedence, outside-click dismissal, and a bounded non-clipping result list.
- Added 50 deterministic normalized emulator instruments and tick-aligned LINKUSDT H1 OHLC candles. Focused Playwright coverage creates one LINKUSDT session, opens Terminal, places an aligned simulated market order, partially closes it, checks order/P&L state, and removes the session while preserving the Stage 29C.1 USOIL flow.

Preserved:

- Practice remains student-owned and simulated-only. No private exchange API, credentials, derivatives, margin, leverage, AutoCopy coupling, raw provider payload, hidden candle, payment change, or live order behavior was added.
- Stage 29B session management, Stage 29C Quick Session safeguards, and Stage 29C.1 Forex/CFD discovery remain intact.

Next stage:

- Stage 29C.3 is implemented below. Stage 29D remains pending.

### Stage 29C.3: Broader Forex/CFD Asset Catalogue Completion

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-26-STAGE29C3-FOREX-CFD-CATALOGUE-HANDOFF`

Automated browser status: the seeded student Playwright suite passed 8/8 on 26 August 2026 against the local Auth/Firestore emulators and explicit static-demo provider. Owner visual acceptance remains deferred.

What changed:

- Expanded the approved Forex catalogue to 42 canonical candidates spanning majors, established crosses, and bounded regional pairs.
- Added canonical Gold, Silver, US30, NAS100, SPX500, GER40, UK100, JPN225, USOIL, UKOIL, and NATGAS catalogue entries. Legacy US500/JP225 session compatibility remains internal while new selection uses SPX500/JPN225.
- Kept every entry fail-closed. The disabled provider reports the broad catalogue as unavailable, the static demo exposes only deterministic normalized candles, and the real utility provider marks missing discoveries unavailable instead of omitting or fabricating them.
- Added conservative practice instrument specifications for the expanded Forex/CFD set, including price/quantity precision, tick size, quantity step, minimum size, and notional multiplier snapshots.
- Session creation now rechecks catalogue availability, timeframe/date validation, instrument specifications, and bounded normalized candles before persisting a student-owned simulated session.
- Added deterministic EURGBP and USOIL historical cache fixtures. Quick Session remains a collapsed searchable combobox and displays unavailable candidates with safe student-facing reasons.
- Expanded Playwright coverage for the 40+ Forex count, Metals/Indices/Energies categories, a disabled CFD state, and a configured static-demo USOIL session.

Preserved:

- Practice remains student-owned and simulated-only. Provider symbols, broker aliases, utility credentials, account IDs, raw provider payloads, AutoCopy, payments, and live execution remain outside browser responses and order paths.
- Stage 29C.2 Crypto catalogue, quantity-step sizing, and collapsed Asset picker behavior remain intact.

Next stage:

- Stage 29D is implemented below. Owner visual acceptance remains deferred.

### Stage 29D: Practice Terminal Visual Polish And FX Replay Inspired Layout

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-26-STAGE29D-PRACTICE-TERMINAL-VISUAL-POLISH-HANDOFF`

What changed:

- Reorganized the student terminal into a full-height, chart-first TradeHub workspace with an opaque compact toolbar, icon-based drawing rail, central chart, tabbed right utility panel, floating replay controls, and a compact trading/status bar.
- Mapped existing functionality into Object tree, Order, Go To, News and events, and Journal tabs without changing order, drawing, bookmark, challenge, report, or reflection behavior.
- Kept only currently supported timeframe controls and supported drawing tools. Unsupported tools are not presented as working features.
- Reduced chart obstruction by replacing large order/drawing/annotation overlays with bounded terminal chips and positioning replay controls above the bottom event lane.
- Added stable terminal test hooks and Playwright assertions for the shell, toolbar, tool rail, chart, replay controls, bottom bar, and utility tabs.

Preserved:

- Practice remains student-owned and simulated-only. Existing instrument-aware sizing, SL/TP validation, partial closes, completed-session locks, revealed-candle indicators, and Stage 18G timeScale-based event positioning remain wired.
- No copied branding or assets, real news, private provider calls, credentials, AutoCopy coupling, payments, or live execution were added.

Next stage:

- Stop for owner visual acceptance before beginning the Journal, Copier, Workspace, or Admin redesign stages.

### Stage 29D.1: Practice Terminal Workstation Visual Upgrade

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-27-STAGE29D1-PRACTICE-TERMINAL-WORKSTATION-VISUAL-UPGRADE-HANDOFF`

What changed:

- Isolated the terminal route from the global TradeHub header/footer and retained a full-viewport opaque-black workstation shell.
- Enlarged the Lucide tool rail to 44px controls with clear selected, locked, hidden, unavailable, and focus states.
- Added the full requested timeframe strip while keeping unsupported historical intervals disabled instead of changing provider behavior.
- Added chart-type, Order, Go To, Events, Journal, Report, and utility-panel controls to the dense top toolbar.
- Added a bounded 24-candle warm-up for untouched active sessions with no orders. It advances only the protected revealed index and never returns candles beyond that boundary.
- Replaced `fitContent()` with adaptive logical ranges and slimmer spacing so early sessions retain realistic chart scale.
- Moved replay controls near the top of the chart, tightened the footer, and made the opaque utility panel collapsible on desktop and narrow layouts.

Preserved:

- Practice remains student-owned and simulated-only. Existing order lifecycle, instrument sizing, indicators, drawings, bookmarks, reports, event-marker timeScale alignment, and completed-session locks remain intact.
- No copied branding/assets, private exchange calls, student MetaAPI credentials, provider payloads, AutoCopy coupling, payment changes, or live execution were added.

Next stage:

- Stop for owner desktop, narrow-screen, and mobile visual acceptance before beginning another product-area redesign.

### Stage 29D.2: Practice Terminal Candle Reliability Patch

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-27-STAGE29D2-PRACTICE-TERMINAL-CANDLE-RELIABILITY-HANDOFF`

What changed:

- Fixed the terminal/replay candle-read path so existing practice sessions can reuse their already-normalized historical candle cache even after the short provider-cache freshness window has passed.
- Kept new session creation strict: a new session still requires protected catalogue, instrument, timeframe, range, and candle validation before it can be saved.
- Added a local-emulator-only deterministic Crypto candle fallback when Binance public candles cannot be reached during demo testing. This supports approved Crypto symbols such as ETHUSDT without adding production fake data.
- Added deterministic ETHUSDT demo candle cache alongside the existing BTCUSDT and LINKUSDT demo caches.
- Added source QA coverage for expired-cache replay, empty-cache rejection, emulator-only fallback, ETHUSDT demo cache, and unchanged security boundaries.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only.
- No hidden candles, private provider APIs, credentials, AutoCopy coupling, payment changes, or live execution were added.

Next stage:

- Owner should retest the failing ETHUSDT terminal. ETHUSDT terminal should reveal candles in local demo testing after emulators/dev server are running and the browser is refreshed.

### Stage 29D.3: Practice Terminal Trading Dock And Chart Density Polish

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-27-STAGE29D3-PRACTICE-TERMINAL-TRADING-DOCK-DENSITY-HANDOFF`

What changed:

- Reworked the bottom trading dock so Buy and Sell are larger round controls, the calculated quantity field is wider, and the quick ticket action sits beside them like a trading workstation control strip.
- Replaced boxed footer stats with compact inline account metrics for balance, equity, realized PnL, and unrealized PnL.
- Increased chart density so desktop, narrow, and mobile views show more candles by default and the zoom action feels less chunky.
- Enlarged the left drawing/tool rail controls from small square buttons to mature workstation-sized Lucide controls.
- Kept the right utility panel, order ticket, replay controls, simulated order lifecycle, drawings, events, journal, report, and revealed-candle boundary intact.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only.
- No copied FX Replay branding/assets, private provider calls, hidden candles, AutoCopy coupling, payment changes, credentials, or live execution were added.

Next stage:

- Owner should visually retest the terminal at full width, zoomed chart view, narrow browser width, and Safari/iOS. If accepted, move to the next complaint-roadmap section instead of continuing terminal polish.

### Stage 29D.4: Practice Terminal Order Ticket Popout Polish

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-27-STAGE29D4-PRACTICE-TERMINAL-ORDER-POPOUT-HANDOFF`

What changed:

- Changed the desktop Order ticket from a cramped right-panel form into an opaque chart overlay launched from the dedicated Order control.
- Added a Place Order header, Preset affordance, close control, larger desktop form controls, contained scrolling, and stable popout QA hooks.
- Kept Objects, Go To, News, and Journal available in the right utility panel when the order ticket is closed.
- Kept small-screen behavior responsive with the existing utility drawer layout.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker or exchange order path, copied FX Replay branding/assets, private provider call, hidden candle exposure, AutoCopy coupling, payment change, credential exposure, or live execution behavior was added.

Next stage:

- Owner should retest the Order popout from the dedicated Order control. If accepted, move to the next complaint-roadmap section.

### Stage 29D.5: Practice Terminal Order Trigger Cleanup And Quick Buy/Sell Behavior

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D5-PRACTICE-TERMINAL-ORDER-TRIGGER-CLEANUP-HANDOFF`

What changed:

- Bottom Buy/Sell now submit quick simulated market orders from the latest revealed close and current terminal risk/SL/TP values instead of opening the detailed order popout.
- Added dock-level success/error feedback for quick Buy/Sell failures and accepted simulated orders.
- Only the dedicated Order control opens the detailed Place Order popout.
- Timeframe changes, Indicators, Go To, News, Journal, Objects, fullscreen, replay controls, and drawing tools do not open the Order popout.
- Nonfunctional terminal tools remain visibly disabled with safe labels.
- Student browser coverage now checks quick Buy/Sell, Order-tab popout opening, unrelated-control behavior, and simulated-only copy.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker or exchange order path, private provider call, hidden candle exposure, AutoCopy coupling, payment change, credential exposure, or live execution behavior was added.

Next stage:

- Owner should retest quick Buy/Sell and the Order popout in a real browser. Keep Stage 29C.3 and Stage 29D follow-up work separate unless a new focused bug is reported.

### Stage 29D.6: Practice Terminal Quick Trade And Tool Feedback Patch

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D6-PRACTICE-TERMINAL-QUICK-TRADE-TOOLS-HANDOFF`

What changed:

- Quick Buy/Sell uses safe default SL/TP when the detailed ticket is empty, so a student can place a quick simulated market trade after candles are revealed.
- If the detailed ticket already has valid directional SL/TP values, quick Buy/Sell keeps using those custom values.
- The bottom quantity preview now falls back to the quick-trade quantity instead of showing zero when custom SL/TP fields are empty.
- Tool rail clicks now show visible feedback for cursor, zoom, lock, visibility, and supported drawing/note tools.
- Supported drawing/note tools open Journal/Review so the student can finish adding the object instead of feeling like the button did nothing.
- Coming-soon tools remain disabled and honest.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker or exchange order path, private provider call, hidden candle exposure, AutoCopy coupling, payment change, credential exposure, or live execution behavior was added.

Next stage:

- Owner should retest quick Buy/Sell without SL/TP, then click each visible rail/top/right/bottom control and confirm it either acts visibly, opens the intended panel, or is clearly disabled.

### Stage 29D.7: Practice Terminal Interactive Tools And Clean Order History

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D7-PRACTICE-TERMINAL-INTERACTIVE-TOOLS-HISTORY-HANDOFF`

What changed:

- The chart now shows compact BUY/SELL order chips instead of a cluttered single order chip with extra price/count text.
- Clicking an order chip selects that simulated order, opens the Objects panel, and shows that order alone until Show all is clicked.
- Supported chart tools now work directly from the left rail: horizontal line, vertical marker, zone, text note, and measure can click the chart to place supported objects.
- Saved chart objects render as selectable overlays on the chart and can still be edited or deleted from Objects.
- Right-side Objects and Journal panels now describe the actual workflow instead of telling the student to import from review tools.
- Trend line is implemented in Stage 29D.9; brush/freehand and magnet remain disabled/coming soon until a proper drawing engine is built for them.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No live execution, broker/exchange order path, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle exposure, payment change, or credential exposure was added.

Next stage:

- Owner should retest order chips, selected-order detail, chart-click placement for each supported tool, and right-panel tab behavior before moving to the next complaint-roadmap section.

### Stage 29E: Shared App Full-Preview Layout Stabilization

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29E-SHARED-APP-FULL-PREVIEW-LAYOUT-HANDOFF`

What changed:

- Widened the shared student app shell so normal `/app` pages use the available full-preview width instead of feeling trapped in a narrow centered column.
- Delayed optional student side panels until larger viewports so the main content does not get squeezed on Safari preview, iPad-size windows, or split-screen widths.
- Changed shared text wrapping so normal words and labels do not collapse into letter-by-letter vertical columns.
- Kept a dedicated token-breaking utility for genuine long technical tokens when those need to wrap safely.
- Updated shared buttons so action labels stay on one line and remain readable.
- Simplified the signed-in app header so `/app`, `/workspace`, and `/admin` no longer show the full landing/demo navigation across the top.
- Rebuilt the Practice Sessions card layout so session identity, stats, and actions no longer compete for one compressed row.
- Added source QA coverage for full-preview width, session-card stability, non-wrapping buttons, and the specific letter-by-letter wrapping regression.

Preserved:

- No product behavior, route protection, payment, provider, practice execution, AutoCopy, course, journal, workspace, admin, or Firestore rule behavior changed.
- The fullscreen Practice Terminal remains separate from the normal app shell.

Next stage:

- Owner should retest `/app/practice` Sessions at full preview first, then quickly scan `/app`, `/app/courses`, `/app/journal`, `/workspace`, and `/admin` for any remaining compressed text or confusing oversized sections.

### Stage 29D.8: Practice Terminal Compact Side Panel

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D8-PRACTICE-TERMINAL-COMPACT-SIDE-PANEL-HANDOFF`

What changed:

- Changed the Practice Terminal right utility tabs to compact icon tabs with accessible labels and tooltips.
- Added a single active panel title inside the panel so tabs no longer read like cramped joined text.
- Removed duplicated recent-order previews from the Object tree summary.
- Changed the Practice orders section to show short order rows by default.
- Full order detail now opens only after the student clicks a chart order chip or a short order row.
- Show all returns to the short order list instead of keeping many large order cards open.
- Kept selected-order focus, order stats, close controls, SL/TP edits, partial-close controls, Journal, Go To, News, and object counts intact.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party assets, hidden candle exposure, payment change, or credential exposure was added.

Next stage:

- Owner should retest the right panel with several simulated orders: default collapsed order rows, one expanded order after click, Show all, Objects, Order, Go To, News, and Journal tabs.

### Stage 29D.9: Professional Practice Terminal Chart Tools Engine

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D9-PRACTICE-TERMINAL-CHART-TOOLS-ENGINE-HANDOFF`

What changed:

- Promoted the left-rail chart tools from placeholder-style controls into real practice drawing tools.
- Trend Line, Horizontal Line, Vertical Marker, Rectangle Zone, Text Note, Fibonacci Retracement, and Measure now place student-owned chart objects directly from chart clicks.
- Trend Line, Zone, Fibonacci, and Measure use a two-click placement flow with clear first-point and second-point feedback.
- Saved objects render as selectable chart overlays and keep using chart time-scale coordinates so they follow pan, zoom, replay steps, and timeframe changes.
- The Objects panel now shows compact object-tree rows for orders, drawings, events, and bookmarks, with one selected-object editor instead of repeated large drawing cards.
- Selected drawings can be edited by label, text, color, event link, candle/price coordinates, and deleted from the Objects panel.
- Escape cancels active placement or clears selection; Delete/Backspace removes the selected drawing when the user is not typing.
- Bottom Buy/Sell remain quick simulated market-order buttons and do not open the Order popout.

Preserved:

- Practice remains student-owned, revealed-candle-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle exposure, payment change, or credential exposure was added.

Next stage:

- Owner should retest the terminal drawing workflow in a real browser: place each chart object, select from the object tree, edit/delete one drawing, pan/zoom, and confirm quick Buy/Sell plus Order popout behavior remain correct.

### Stage 29D.10: Practice Terminal Drawing Capture Reliability

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D10-PRACTICE-TERMINAL-DRAWING-CAPTURE-HANDOFF`

What changed:

- Added a dedicated chart capture layer while a drawing tool is active, so Safari and canvas overlay behavior cannot silently swallow placement clicks.
- Pointer coordinates are converted into bounded candle/time and price values, then passed into the existing student-owned drawing persistence flow.
- Kept the Lightweight Charts click subscription as a fallback for environments where native chart clicks continue to work.
- Preserved the one-click and two-click drawing flows introduced in Stage 29D.9.
- Updated source QA and demo/manual checklists for the exact browser failure reported by the owner.

Preserved:

- Practice remains student-owned, revealed-candle-only, and simulated-only.
- No live execution, broker/exchange order path, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle exposure, payment change, or credential exposure was added.

Next stage:

- Owner should retest Safari drawing placement for Horizontal Line, Vertical Marker, Text Note, Trend Line, Zone, Fibonacci, and Measure before moving to the next complaint-roadmap section.

### Stage 29D.11: Practice Terminal Advanced Chart Tools Interaction Polish

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D11-PRACTICE-TERMINAL-ADVANCED-TOOLS-HANDOFF`

What changed:

- Added drag-first chart interactions for Trend Line, Rectangle Zone, Fibonacci Retracement, Measure, and Zoom, while keeping click fallback behavior.
- Moved Trend Line, Horizontal price line, and Vertical line under a compact Lines menu.
- Marked Ray, Extended Line, Horizontal Ray, and Cross Line as disabled coming-soon tools so unfinished tools are not presented as working.
- Improved Fibonacci drawings with mature colored levels/bands and support for multiple saved Fibonacci objects.
- Added Text tool editing from the chart: click to type a bounded note, save it to the chart, then select/edit/delete the saved text note.
- Added Measure/Ruler drag rectangles with up/down color treatment and compact summaries for difference, percent, and candle count.
- Added drag-rectangle Zoom, a visible Zoom out control, and Escape cancellation for active chart actions.
- Added selected-delete and clear-all drawing actions that only affect practice drawings.
- Reduced right object panel density with All, Orders, Drawings, Events, and Bookmarks filters plus compact rows before detail views.
- Added `stage29d11:qa`.

Preserved:

- Practice remains student-owned, revealed-candle-only, and simulated-only.
- Bottom Buy/Sell remain quick simulated market-order buttons; only the Order control opens the detailed order popout.
- No live broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle exposure, payment change, or credential exposure was added.

Next stage:

- Owner should retest the advanced chart tools after a clean dev-server/browser restart to avoid stale Next chunks, then move to the next complaint-roadmap section if accepted.

### Stage 29D.12: Practice Terminal Clear Drawings And Fibonacci De-Clutter

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D12-PRACTICE-TERMINAL-CLEAR-DRAWINGS-FIB-DECLUTTER-HANDOFF`

What changed:

- Changed the left rail trash action into a direct Clear chart drawings control for the current practice session.
- Clear chart drawings removes every tool-created practice drawing annotation currently stored for the session, including Fibonacci, lines, zones, text notes, and measure drawings.
- Clear chart drawings does not remove orders, candles, events, bookmarks, reports, assignment feedback, or journal records.
- Added optimistic clear-all cleanup with rollback if any protected delete request fails.
- De-cluttered Fibonacci overlays: unselected Fibonacci drawings stay visible but quiet; full level labels and price values appear only on the selected Fibonacci.
- Replaced the noisy top chart drawing-history strip with one selected-drawing chip.
- Added `stage29d12:qa`.

Preserved:

- Practice remains student-owned, revealed-candle-only, and simulated-only.
- No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle exposure, payment change, or credential exposure was added.

Next stage:

- Owner should retest multiple Fibonacci drawings and the left rail Clear chart drawings action before moving to the next complaint-roadmap section.

### Stage 29D.13: Practice Terminal Trendline Interaction And Line Tool Menu Fix

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D13-PRACTICE-TERMINAL-TRENDLINE-MENU-HANDOFF`

What changed:

- Tightened Trend Line into a drag-to-draw chart tool with pointer down, live preview, and pointer up save using the drag start/end points.
- Kept Horizontal price line and Vertical line inside the Lines menu rather than as standalone rail tools.
- Opening the Lines menu now clears stale selected-object state so the Objects panel does not keep showing an unrelated previous drawing.
- Tool switching cancels unfinished placement state, and locked drawings block new placements with clear copy.
- Clear chart drawings remains scoped to tool-created drawings only and preserves candles, simulated orders, events, bookmarks, reports, session data, and journal data.
- Quiet labels remain for unselected line objects; selected trendlines show endpoint handles.
- Added `stage29d13:qa`.

Preserved:

- Practice remains student-owned, revealed-candle-only, and simulated-only.
- No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle exposure, payment change, or credential exposure was added.

Next stage:

- Owner should retest drag-drawing several trendlines, menu-only horizontal/vertical lines, object selection, and clear-all drawings before moving to any Stage 29D follow-up.

### Stage 29D.14: Practice Terminal Drawing Reliability Patch

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-29-STAGE29D14-PRACTICE-TERMINAL-DRAWING-RELIABILITY-HANDOFF`

What changed:

- Tightened the ref-backed drag state used by terminal chart tools so pointer down, pointer move, and pointer up share the same in-flight draft.
- Kept the elevated drawing capture layer above chart and object overlays whenever a drawing or zoom tool is active.
- Opening the Lines menu now clears stale active tool, drawing error, selected drawing, selected order, and unfinished placement state before the user chooses Trend Line, Horizontal price line, or Vertical line.
- No-candle tool selection resets back to Select and shows a reveal-candle message instead of leaving a stale tool active.
- clear chart drawings resets selected drawing/order state, line/delete menus, placement state, and active tool state while removing all tool-created drawings.
- clear chart drawings stays scoped away from candles, simulated orders, events, bookmarks, completion state, reports, and journal records.
- Tightened Stage 29D.13 compatibility QA and added `stage29d14:qa`.

Preserved:

- Practice remains student-owned, revealed-candle-only, and simulated-only.
- No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle exposure, payment change, or credential exposure was added.

Next stage:

- Owner should restart the dev server, hard refresh, then retest Lines > Trend Line press-drag-release, Horizontal/Vertical line placement, and Clear chart drawings before more terminal polish.

### Stage 29D.15: Practice Terminal Responsive Workstation

Status: owner-accepted with Stage 29D on 31 August 2026.

- The real terminal uses the full viewport without the global app header/footer and avoids a giant blank or document-scrolled layout.
- The chart remains the primary surface at laptop and tablet widths; the utility panel no longer squeezes candles or the price axis.
- The left rail remains vertically scrollable without clipping its fixed Lines and Delete popovers.
- The bottom utility drawer remains available below `xl`; the `xl` side panel remains available at wide workstation widths.
- The bottom dock and floating replay controls remain usable without covering essential chart content.
- Stable grid/flex minimums, `min-w-0`, truncation, and overflow guards prevent character-by-character label collapse and horizontal page overflow.
- Candles, axes, toolbar controls, order state, indicators, drawing tools, and replay remain readable at the accepted laptop/tablet breakpoints.
- Stage 29D.15 layout guards remain embedded in `stage29d16:qa`, and laptop/tablet Chromium plus WebKit automation remains supporting evidence for the accepted real Chrome and Safari layout.
- This shell is frozen: future work must preserve the fullscreen terminal, vertically scrolling left rail, bottom drawer below `xl`, and `xl` side panel unless a new reproducible defect is reported.

### Stage 29D.16: Practice Terminal KLineChart Drawing Tools

Status: owner-accepted with Stage 29D on 31 August 2026.

- The authenticated production terminal initializes KLineChart 10.0.3 with TradeHub-owned overlays. `@klinecharts/extension` remains installed for the isolated feasibility spike; lightweight-charts is absent from the real Practice Terminal.
- The chart receives only the authoritative revealed-candle slice. Direct future-index requests are clamped to the persisted session boundary, preserving the 24-candle warm-up and server-authoritative replay.
- Trend Line uses a first-click unsaved anchor, button-free solid preview, and second-click persistence. Completion, Escape, pointer cancellation, tool switching, and navigation all restore Select truthfully.
- Default Trend draft, saved geometry, selected endpoints, and reload restoration use versioned saturated blue `#2962ff`; legacy old-default Trends convert narrowly while deliberate custom colors remain unchanged.
- Versioned `klinecharts_v1` points preserve legacy drawing records and support overlays anywhere in the plotting canvas, including empty space before and after revealed candles, without requesting future data.
- Native KLine overlays are the sole saved-geometry renderer and own selection/control points. Endpoint movement persists authoritative points and restores without visual drift.
- Horizontal and Vertical lines place at the clicked chart coordinate. Zone, Measure, Fibonacci, and Zoom Rectangle use their actual drag anchors and return to Select after one completed use.
- A TradeHub-owned bounded Fibonacci replaces the stock full-pane overlay; its 0, 23.6, 38.2, 50, 61.8, 78.6, and 100 percent levels and translucent fills stop at the two selected x anchors.
- Measure is blue upward and red downward. Zoom Rectangle records a coherent baseline and the visible Zoom Out control restores a sane viewport after replay advances.
- Text Note uses a compact chart-anchored automatic editor with no Save/Cancel controls. Valid outside completion persists once; blank/too-short and Escape persist nothing; failed persistence retains the exact text and error.
- Intentional Text Note newlines survive creation, persistence, retrieval, editing, reload, compact wrapping, and bounded rendering without a permanent oversized card.
- Pointer cancellation releases capture, clears Trend/drag/text/native-move drafts and previews, saves no drawing, and restores Select through the shared cancellation path.
- Lines and Delete use viewport-clamped fixed popovers outside the scrolling rail. Browser geometry checks prove they extend beyond the rail, stay inside the viewport, and receive real pointer hits.
- Delete selected removes only the active drawing. Clear chart drawings is one bounded atomic student-scoped drawing-only batch and reconciles authoritative state after a committed response is lost.
- Drawing deletion never removes candles, orders, events, bookmarks, completion state, reports, journal records, or non-drawing annotations.
- SMA/EMA render in the candle pane; RSI, TradeHub ATR, and Volume MA use explicit lower panes and revealed-only values. Enable/removal behavior is browser-covered.
- Initial data fits once. Next Candle and Play preserve bar spacing and historical pan/zoom position while live-edge users can continue following the latest candle.
- Complete student coverage passed 10/10 in Chromium. Focused production drawing coverage passed 2/2 in WebKit at laptop/tablet sizes with real gestures, persistence/reload, delete/clear, zoom, reveal-boundary attacks, and cleanup.
- Cold login to Practice to Open terminal passed twice at WebKit laptop and tablet viewports from independent seeded server states; navigation uses one shared atomic guard and exact-path settlement.
- Stage 29D.15 responsive markers and breakpoints remain protected by `stage29d16:qa`.
- Practice remains student-owned, revealed-candle-only, and simulated-only, with no AutoCopy, live execution, provider, credential, payment, or hidden-candle boundary change.

### Stage 29D.17: Practice Terminal Owner Acceptance Closure And Complaint-Roadmap Reconciliation

Status: owner-accepted, closed, and frozen on 31 August 2026.

Reference: `TH-2026-08-31-STAGE29D17-PRACTICE-TERMINAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

- On 31 August 2026, the owner confirmed the corrected Practice Terminal works in real Chrome and Safari.
- Stage 29D.15 responsive-workstation behavior and Stage 29D.16 KLineChart drawing behavior are owner-accepted.
- The accepted production architecture is KLineChart 10.0.3 with TradeHub-owned overlays.
- Trend, compact automatic Text Notes, bounded Fibonacci, directional Measure, Zoom Rectangle/Out, selected deletion, atomic drawing-only clear, indicators, replay, navigation, and laptop/tablet responsive behavior are accepted.
- Practice remains student-owned, server-authoritative revealed-candle-only, and simulated-only. No live execution, AutoCopy, payment, provider, credential, or hidden-candle boundary changed.
- Stage 29D is closed and frozen unless a new reproducible defect is reported.
- Stage 29E remains the completed Shared App Full-Preview Layout Stabilization stage and is not renamed or overwritten.
- The reconciled remaining complaint sequence is Stage 29F Journal redesign, 29G Crypto Journal Sync, 29H Forex/MT5 Journal Sync, 29I Copier, 29J Signals, 29K Telegram, 29L Workspace, 29M Super Admin, and 29N final freeze.
- Stage 29F was explicitly owner-accepted on 3 September 2026 after the Journal visual layout, My Trades/Backtesting separation, numerical reconciliation, bounded-cohort warning, and zero/one/multi-point Equity behavior were accepted. Stage 29F is closed and frozen. Stage 29G Crypto Journal Sync is implemented/source-QA ready with external provider acceptance pending; Stage 29H remains unstarted.

### Stage 29E: Shared App Full-Preview Layout Stabilization

Status: completed and source-QA ready.

- Shared student, workspace, and admin surfaces retain readable full-preview layouts without compressed labels or text.
- This completed shared-layout stage is not renamed or replaced by the Journal roadmap.

### Stage 29F: Journal Product Redesign And Data Separation

Status: owner-accepted, closed, and frozen on 3 September 2026. The owner accepted the Stage 29F Journal visual layout, My Trades/Backtesting separation, numerical reconciliation, bounded-cohort warning, and zero/one/multi-point Equity behavior.

Reference: `TH-2026-09-03-STAGE29F-JOURNAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

- `/app/journal` defaults to read-only `My Trades`; `Backtesting` is a separately loaded simulated-only view.
- Closure rule: `/app/journal` remains read-only, manual trade entry stays removed, My Trades and Backtesting remain financially separated, and Journal Sync remains independent from Copier.
- Manual CRUD, CSV import/export, archive/delete, manual review links, and AI Insight are absent from the main Journal while historical compatibility data and protected APIs remain preserved.
- Provider order state is separate from public Journal lifecycle. A filled entry remains open unless an authoritative provider-confirmed closure exists; only authoritative closed trades affect realized KPIs, equity, drawdown, and calendars.
- The connected-history repository reads a student-scoped, newest-first bounded window, computes analytics over the complete filtered match set before visible-row slicing, and reports scanned, matched, visible, `hasMore`, and truncation metadata.
- Journal Sync readiness is independent from Copier exchange connections, Forex provisioning, entitlements, and execution permissions. Stage 29G adds the dedicated read-only crypto Journal Sync lane; Forex/MT5 sync remains unstarted until Stage 29H.
- Deterministic browser coverage proves open, filled-entry, partial, closed-win, and closed-loss normalization, copied/provider-placed labels, filters, KPI/equity/calendar results, privacy, cleanup, and wrong-role protection.
- Backtesting now uses one shared closed-order net-result calculation across session KPIs, equity/drawdown, daily/monthly results, symbol and strategy breakdowns, and recent-session rows. Persisted fees replace the estimated fee component while spread and slippage assumptions remain additive, preventing fee double counting; the seeded gross `+1,500` less `48` costs reconciles to net `+1,452` everywhere.
- Net-result calculation now requires explicit authoritative session assumptions; there is no missing-session zero-cost fallback. One bounded session-backed order cohort drives `hasClosedTrades`, session results, equity/drawdown, calendars, symbol/strategy results, challenge results, and recent/best/worst session summaries. Orders whose session is outside the bounded window are excluded everywhere and reported through safe cohort counts.
- Backtesting now places a restrained coverage warning before its KPI strip whenever bounded order records are excluded because their authoritative sessions are unavailable. The warning is absent for complete cohorts, uses singular/plural safe counts only, and exposes no session, order, student, workspace, or diagnostic data.
- The shared Equity chart now keeps zero points as the honest empty state, renders one authoritative completed result as a visible marker with a labelled final-equity value, and preserves the existing equity/drawdown paths for two or more points. The seeded Backtesting result renders final equity `101,452` instead of instructing the student to complete another trade.
- Practice remains owner-accepted and frozen. Stage 29F is now owner-accepted, closed, and frozen. Stage 29G has a Journal-only crypto sync implementation ready for adviser review; Stage 29H Forex/MT5 Journal Sync remains unstarted.

### Stage 29G: Crypto Journal Sync

Status: implemented/source-QA ready. External provider acceptance and owner acceptance remain pending because no approved real read-only Binance or Bybit account has been exercised yet.

Reference: `TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`

- Added a Journal-only crypto connection model for Binance and Bybit read-only account history. This does not require Copier purchase, AutoCopy entitlement, execution permission, `exchange_connections`, or Forex provisioning.
- Added protected student Journal Sync APIs for overview/connect, sync now, and disconnect under `/api/student/journal/crypto-sync`.
- Added a separate `journal_crypto_keys` credential namespace. Production storage fails closed unless the configured production vault posture is ready; local/mock storage remains development-only.
- Provider adapters use fixed allowlisted Binance and Bybit hosts and contain only permission/history reads: Binance read-only checks use `/sapi/v1/account/apiRestrictions`, Binance history uses symbol-scoped `/api/v3/myTrades`, Bybit key checks use `/v5/user/query-api`, and Bybit spot history uses bounded `/v5/execution/list` windows.
- The adviser-correction pass tightened Bybit V5 GET auth to the timestamp/API-key/receive-window/query-string signature model, accepts legitimate read-only permission arrays while requiring `readOnly === 1`, rejects every nonzero Bybit `retCode`, rejects malformed or mutation-capable Binance permissions including `enableFixApiTrade` and `enablePortfolioMarginTrading`, retrieves Binance history through documented <=24-hour `startTime`/`endTime` windows without combining `fromId`, walks Bybit history backward through bounded seven-day windows plus `nextPageCursor`, and reports skipped/truncated/incomplete history truthfully.
- Provider responses are normalized server-side into provider-confirmed Journal history records. Raw provider payloads, account IDs, credential material, vault refs, and source identifiers are not returned to the browser.
- Spot lifecycle reconstruction is conservative: a provider `filled` execution is not a closed Journal trade by itself. Fill-derived spot round trips remain performance-ineligible unless an authoritative starting-basis/closure checkpoint exists. Missing fees remain unknown, unsupported fee currencies taint the affected lot/symbol, base-asset fees reduce received quantity, unknown starting inventory, unmatched sells, incomplete history, and truncation stay open/partial or performance-ineligible instead of inventing realized P&L.
- Sync imports are bounded by approved symbols, history duration, page/window count, a global per-sync provider request budget, record count, response bytes, decimal length, timeouts, retries, and capped `Retry-After` backoff. Imported rows use opaque deterministic server keys scoped to the Journal connection identity for retry-safe idempotency, while copied/Journal dedupe uses a separate server-only provider execution identity derived from stable raw provider order/execution values available to both ingestion paths. The identity never combines masked refs, raw student ids, raw workspace ids, or internal connection ids with provider execution refs.
- Complete replacement snapshots and incremental delta syncs are distinguished explicitly. Empty successful incremental syncs retain existing history, while incremental new records stage the prior active generation rows plus the new delta so a sell after a prior-watermark buy does not lose its position context.
- Complete snapshots are written through generation-specific import entries plus a single active generation pointer and Firestore batches below 500 writes. Staging never overwrites active-generation documents; readers query the active generation at Firestore query time before browser-visible limits are applied. The pointer flips only after every staging chunk succeeds, abandoned staging generation cleanup is connection-scoped, lease-aware, and age-bounded, and truncated, skipped, malformed, rate-limited, budget-exhausted, or otherwise incomplete provider snapshots stay partial and cannot delete or replace the last complete snapshot.
- Bounded Binance crawling now records safe crawl progress separately from the active history pointer. Partial crawls freeze one boundary, carry per-symbol completed watermarks through later runs, may append to a hidden pending generation, and promote watermarks only after every selected symbol reaches the frozen boundary. The Journal reader continues using the last active generation until a later complete run flips the pointer.
- Credential and selected-symbol changes are treated as synchronization configuration changes. Every credential mutation, including same API key plus rotated secret, coordinates with the sync lease through a short-lived config lock; exact no-op submissions use a server-keyed credential mutation identifier and can avoid unnecessary credential-version creation. Production fails closed if the keyed mutation posture is unavailable, and legacy records without the new identifier are treated conservatively as replacements. Replacement rejects while a valid sync is running, sync rejects while replacement owns the config lock, sync loads only the exact credential version marker captured in connection metadata, the vault refuses stale/pending/retired/discarded/revoked/mismatched markers before provider requests, and the final commit rechecks owner-token, lock ownership, credential fingerprint, and credential version. Successful replacement activates the new credential metadata before retiring the previous Secret Manager/local version. If post-activation retirement fails, the new connection remains active and one idempotent server-only retryable cleanup task is recorded for the old version; repeated cleanup failures are bounded and never target the active version. Failed replacement discards only the attempted version and restores the previous working credential metadata/version. Replacement resets or retires active generation, pending generation, crawl progress, and watermarks before new credentials or symbol selections become ready so one provider account or symbol set cannot inherit another account's history.
- First-time Journal Crypto connection creation is serialized through an atomically created `verifying` placeholder with an owned configuration lock. Credential storage and final activation are bound to that owner token, final activation verifies the expected pending credential marker plus no active sync/disconnect state, concurrent same-label first-create requests cannot both store credentials, concurrent first-create requests cannot exceed the connection limit, and expired abandoned placeholders can be recovered by a later owner-safe verification.
- Guard phrase for future QA: credential replacement resets or retires active and pending imported history before replacement becomes ready.
- Generation activation clears lease metadata from the activated generation, and old generations are retired only after verifying the connection pointer no longer references them.
- Shared server-only provider execution identities reconcile existing provider-confirmed copied ledger records at execution/order-leg level. A copied buy plus provider-manual sell keeps the unmatched sell as execution-only history instead of discarding it or counting it as another open position merely because one leg matched Copier.
- Each sync re-verifies read-only permissions, applies a student-scoped owner-token single-flight lease/cooldown, captures the credential fingerprint/version marker at sync start, verifies the same marker again in the final commit transaction, enforces a total sync work timeout shorter than the lock lease, rechecks lock ownership and disconnected state before ledger commit, and uses bounded/direct connection lookup. Incremental per-connection watermarks avoid normal rescans of the full history window after successful complete snapshots. Disconnect disables sync first and then deletes cloud secret material or erases local ciphertext/sensitive metadata, with cleanup failures recorded as durable support-safe records. The deterministic fake provider transport hard-fails in production, newly stored credentials are revoked if first-time connection metadata creation fails, and production credential replacement uses Secret Manager version pinning so a failed replacement can discard the failed version and preserve the previous working credential. Credential cleanup retries are invoked from the authenticated server-owned Journal Sync overview path, query only due retryable tasks oldest-first, claim a bounded batch with an owner-token lease, recheck action, target, owning connection, active marker, and lease before any vault call, then run the exact task action: `discard_failed_replacement` uses discard only and `retire_previous_version` uses retirement only. The worker resolves/fails/backoffs/final-fails without exposing cleanup actions, targets, credential markers, or lock owners to the browser.
- `/app/journal` keeps the owner-accepted Stage 29F layout and adds a compact My Trades Journal Sync panel with safe states only: verifying, ready, syncing, partial, failed, and disconnected. Backtesting remains unchanged and financially separate.
- Firestore browser rules deny direct access to Journal crypto credentials, connection metadata, sync runs, and import records.
- Existing provider-confirmed copied ledger history may still appear in My Trades, but it never establishes Journal Sync readiness. Dedicated Journal Sync readiness comes only from `journal_crypto_connections`.
- Added Firestore emulator-backed repository lifecycle coverage that invokes the actual exported connect/sync/disconnect/overview repository functions with injected deterministic provider/vault dependencies. It covers first-time placeholder serialization, same-logical-connection first-create races, first-create marker drift, concurrent connection-limit enforcement, abandoned placeholder recovery, production-wired cleanup invocation, action-specific failed-replacement discard retry, previous-version retirement retry, due-only oldest-first cleanup selection, future/resolved/blocked/final-failed starvation prevention, cleanup worker claim/lease concurrency, active-target and changed-active-marker cleanup blocking before vault calls, bounded cleanup final failure, active-sync credential replacement races, same-key secret rotation during sync, replacement-first config-lock blocking, expired-config-lock stale-marker rejection, real/local vault stale/retired/discarded/revoked marker rejection, concurrent same-key replacements, keyed exact no-op detection, changed-secret replacement, successful previous-version retirement, failed-replacement rollback/discard, bounded cleanup retry/dedupe/success, selected-symbol removal/addition resets, failed staging chunks, active-pointer visibility, simultaneous connections, disconnect during sync, repeated multi-run eight-symbol Binance crawling, copied execution dedupe, and execution-only unmatched sells.
- Stage 29H Forex/MT5 Journal Sync remains unstarted.
