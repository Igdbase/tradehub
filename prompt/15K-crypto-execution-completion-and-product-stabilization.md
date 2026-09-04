# Prompt 15K - Crypto Execution Completion And Product Stabilization

You are building **TradeHub Stage 15K**.

Stage 15A through 15J built the crypto Auto-Copy foundation, paper execution, sandbox/testnet lifecycle proof, fail-closed production beta gate, student production consent controls, market-aware symbol validation, and directional level validation.

Stage 15K is the crypto section completion pass before forex work begins.

This is not a new execution-expansion prompt. It is a product stabilization, QA closure, and documentation prompt. The goal is to make the crypto execution surfaces feel finished, understandable, safe, and ready to hand off as "crypto complete up to the approved beta boundary."

Do not enable production trading. Do not add broad real-money order execution. Do not implement forex execution. Do not implement external master-trader order ingestion. Do not weaken Stage 16 entitlement gates or Firestore rules.

---

## Read First

Before editing, read:

- `plan.md`
- `prompt/promptsumary.md`
- `README.md`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `prompt/15G-live-execution-safety-design-output.md`
- `prompt/15G-live-execution-state-machine.md`
- `prompt/15G-live-execution-testnet-qa-checklist.md`
- `prompt/15H-sandbox-testnet-live-order-worker-completion-note.md`
- `prompt/15H-sandbox-testnet-live-order-worker-qa-notes.md`
- `prompt/15I-production-live-beta-gate.md`
- `prompt/15I-production-live-beta-qa-notes.md`
- `prompt/15I-production-live-beta-runbook.md`
- `prompt/15J-student-production-consent-crypto-symbol-validation-and-execution-ui-polish.md`
- `prompt/15J-student-production-consent-crypto-symbol-validation-and-execution-ui-polish-qa-notes.md`
- `src/types/crypto-execution.ts`
- `src/types/workspace-dashboard.ts`
- `src/types/entitlements.ts`
- `src/lib/entitlements/student-entitlements.ts`
- `src/lib/workspace/signal-symbols.ts`
- `src/lib/workspace/dashboard-validation.ts`
- `src/lib/workspace/dashboard-repository.ts`
- `src/lib/workspace/dashboard-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/crypto-risk-engine.ts`
- `src/lib/crypto-execution/crypto-signal-routing.ts`
- `src/lib/crypto-execution/crypto-live-sandbox.ts`
- `src/lib/crypto-execution/crypto-live-production.ts`
- `src/components/student-app/student-copier-client.tsx`
- `src/components/workspace/signal-management-section.tsx`
- `src/components/workspace/crypto-execution-ops-section.tsx`
- `src/components/admin/crypto-execution-ops-panel.tsx`
- `src/components/crypto-execution/paper-execution-preview.tsx`
- `src/components/crypto-execution/live-sandbox-execution-preview.tsx`
- `src/components/crypto-execution/live-production-execution-preview.tsx`
- `src/components/ui/stat-chip.tsx`
- `src/components/ui/badge.tsx`
- `src/app/globals.css`
- `scripts/seed-stage15f-paper-beta.mjs`
- `scripts/seed-stage15h-live-sandbox.mjs`
- `scripts/seed-stage15i-production-live-beta.mjs`
- `scripts/qa-stage15f-paper-beta.mjs`
- `scripts/qa-stage15h-live-sandbox.mjs`
- `scripts/qa-stage15i-production-live-beta.mjs`
- `scripts/qa-stage15j-student-consent-symbol-ui.mjs`
- `scripts/firestore-rules-stage15f.test.mjs`

Use the current repo state, not remembered code shape.

---

## Current Manual QA Baseline

Treat this as the starting truth:

- Student copier manual QA is cleared for production consent, revoke, pause, resume, and paper/testnet visibility.
- Influencer manual QA is cleared for market-aware symbol separation:
  - `EURUSD` is allowed as `forex - alerts only`.
  - `EURUSD` must not appear as crypto execution.
  - `BTCUSDT` is allowed as crypto.
- The 15J patch now blocks invalid directional levels before publish:
  - Buy requires TP above entry and SL below entry.
  - Sell requires TP below entry and SL above entry.
- Super Admin workspace preview loads for `ws_stage15f_paper_beta`.
- Binance Spot Testnet has one real `filled_live` proof.
- Bybit Testnet reached the exchange order endpoint and returned a sanitized insufficient-balance failure because the test account had `0` usable USDT in Unified Trading. This is acceptable for Stage 15K and should be documented, not treated as a blocker.

---

## Stage Goal

Finish the crypto Auto-Copy section up to the safe beta boundary:

- Make student, influencer, and Super Admin crypto execution surfaces feel like a mature product, not a fixture/debug dashboard.
- Keep the useful operational visibility, but move deep diagnostics to Super Admin only.
- Remove or relabel fixture-heavy wording from student and influencer surfaces.
- Keep lists bounded and internally scrollable.
- Keep all text inside cards, pills, buttons, tabs, stat boxes, and panels.
- Make production status impossible to misunderstand: production beta is gated, dry-run/vault-blocked by default, and not broadly live.
- Write completion evidence that clearly says what crypto now supports, what is proven, what is deferred, and what blocks production.
- Prepare the codebase and docs so the next major section can be forex without mixing forex into Binance/Bybit crypto execution.

---

## Non-Negotiable Safety Boundary

Do not:

- Enable production Binance or Bybit order placement.
- Make `CRYPTO_EXECUTION_LIVE_ENABLED` sufficient for production trading.
- Disable production dry-run defaults.
- Bypass production vault readiness.
- Add a real KMS/cloud-secret production vault adapter unless explicitly requested in a later prompt.
- Collect or display raw API keys, API secrets, credential refs, encrypted blobs, signatures, raw balances, raw exchange responses, or full exchange order IDs.
- Weaken Firestore rules.
- Add client Firestore writes for protected execution records.
- Bypass Stage 16 entitlements, paid status, personal-account posture, student consent, allowlists, kill switches, caps, or withdrawal-disabled checks.
- Implement forex Auto-Copy, MT4, MT5, cTrader, FX Blue, or broker copy trading.
- Implement external master-trader account ingestion or private exchange stream mirroring.
- Hide execution failures from Super Admin diagnostics.

---

## Problem 1 - Productize Student Crypto Auto-Copy

The student copier screen should help a paying student understand:

- whether crypto Auto-Copy is available for them;
- whether their Binance/Bybit connection is verified;
- whether paper/testnet execution has activity;
- whether production live beta is locked, consented, paused, revoked, or blocked;
- why production cannot place real orders yet.

Clean up the student UI:

- Remove fixture-looking labels from normal student surfaces, such as:
  - `Stage 15F`
  - `Stage 15H`
  - `Stage 15I`
  - `fixture`
  - `sandbox proof`
  - raw seeded IDs
- Use product labels instead:
  - `Paper Auto-Copy`
  - `Testnet Proof`
  - `Production Beta`
  - `Connection`
  - `Risk Preferences`
  - `Activity`
- Keep technical proof visible only in a calm support-safe way:
  - `Binance testnet order filled`
  - `Bybit testnet order reached exchange, blocked by testnet balance`
  - `Production dry-run only`
- Hide long intent/order/risk/audit IDs by default.
- Show short refs only when helpful.
- Use disclosure/details or Super Admin-only diagnostics for deep IDs.
- Keep consent, pause, resume, and revoke controls understandable and separated from paper/testnet preferences.
- Make sure accepting production consent never visually implies production is live while vault/order gates remain blocked.

Acceptance:

- A student can understand their crypto Auto-Copy posture in less than a minute.
- No secret, full credential ref, full exchange order ID, or raw exchange payload is visible.
- Production beta looks locked/gated unless every production gate is actually enabled.
- Paper/testnet activity is clear but not overwhelming.
- Student UI does not mention local fixture stage names except in an explicitly QA-only/admin-only note.

---

## Problem 2 - Productize Influencer Crypto Operations

The influencer workspace should help the creator understand:

- whether crypto Auto-Copy is ready for their workspace;
- how many students are eligible or blocked;
- whether a crypto signal can route to paper/testnet/dry-run production;
- why candidates were blocked in aggregate;
- what recent crypto execution activity happened.

Clean up the influencer workspace crypto panels:

- Keep signal creation clear and strict:
  - crypto pairs use supported crypto spot symbols;
  - forex pairs remain forex alerts only;
  - invalid buy/sell levels cannot publish.
- Do not show raw diagnostics as the primary surface.
- Summarize execution health:
  - eligible candidates;
  - routed paper intents;
  - testnet attempts;
  - blocked risk decisions;
  - production beta gated.
- Keep detailed risk/audit rows bounded to four visible records with internal scrolling.
- Use short, readable labels for blocked reasons.
- Do not show fixture phrases like `Stage 15F fixture` in the default influencer UI.
- Do not show raw student IDs, raw payment IDs, full exchange refs, or credential refs.
- Make it clear that forex is not part of Binance/Bybit Auto-Copy yet.

Acceptance:

- Influencer can publish a valid `BTCUSDT` crypto signal and see clean execution summary.
- Influencer cannot publish `BTCUSDT` as forex or `EURUSD` as crypto.
- Influencer cannot publish invalid directional levels.
- `EURUSD` may appear only as `forex - alerts only`, never as crypto execution.
- Execution cards and badges do not become cramped or vertical.

---

## Problem 3 - Super Admin As The Diagnostic Surface

Super Admin should keep the deeper operational truth that student/influencer surfaces hide.

Preserve or improve Super Admin diagnostics for:

- platform paper overview;
- workspace paper preview;
- live sandbox/testnet preview;
- production beta preview;
- worker run results;
- reconciliation;
- risk decisions;
- audit events;
- protected path denial confidence;
- Bybit insufficient-balance status;
- Binance filled testnet proof.

But make Super Admin easier to operate:

- Keep workspace ID input obvious.
- Show when a workspace preview is loaded.
- Keep all bounded lists internally scrollable.
- Use short refs with access to safe details where useful.
- Clearly separate:
  - paper;
  - sandbox/testnet;
  - production dry-run beta;
  - platform/source health;
  - trust/audit.
- Do not let admin panels imply production trading is active.
- Keep full raw secrets hidden even from UI-level Super Admin previews.

Acceptance:

- Loading `ws_stage15f_paper_beta` works.
- Admin can see crypto completion proof without reading raw Firestore.
- Production remains visibly disabled/dry-run/vault-blocked.
- Bybit insufficient-balance proof is documented as non-blocking for Stage 15K.

---

## Problem 4 - UI Containment And Responsive Finish

Perform a final execution UI containment pass across:

- student copier;
- influencer workspace crypto ops;
- signal management;
- Super Admin crypto ops;
- paper execution preview;
- live sandbox preview;
- live production preview;
- stat chips;
- badges;
- buttons;
- tabs;
- cards;
- bounded list containers.

Rules:

- Long IDs, emails, handles, wallet addresses, order refs, and signal names must wrap, truncate, or use short refs safely.
- Pills and buttons must not become tall/narrow vertical text.
- Stat labels must not break into one-letter-per-line layouts.
- Use `minmax()`, `min-width`, `overflow-wrap:anywhere`, `word-break` only where appropriate, `text-overflow`, and stable responsive grid constraints.
- Bounded record lists should show no more than four visible rows and scroll internally.
- The whole page should not become the only scroll surface for every accumulating list.
- Keep the dark premium TradeHub style.
- Do not add decorative clutter.

Acceptance:

- Desktop, tablet, and mobile widths remain readable.
- No bordered card has text escaping its border.
- No list growth causes the whole dashboard to feel stuck or endless.
- No control label is forced into vertical text.

---

## Problem 5 - Seed, QA, And Completion Evidence

Add a Stage 15K completion layer.

Expected files:

- `scripts/qa-stage15k-crypto-completion.mjs`
- `prompt/15K-crypto-execution-completion-qa-notes.md`
- `prompt/15K-crypto-execution-completion-note.md`

Update:

- `package.json`
- `README.md`
- `plan.md`
- `prompt/promptsumary.md`
- any Stage 15I/15J QA notes that need final status clarification

The QA script should verify, without real exchange credentials:

- crypto symbol validation remains in place;
- forex symbols are not accepted as crypto;
- crypto symbols are not accepted as forex;
- directional level validation remains in place;
- protected Firestore execution paths remain denied to client SDK contexts through the rules test command;
- production beta remains fail-closed by default;
- production order env flags are not sufficient without vault/control/allowlist/consent/cap gates;
- student production consent state can be represented without enabling real orders;
- safe preview mappers do not expose credential refs, encrypted blobs, raw API secrets, raw exchange payloads, or full exchange order IDs;
- invalid-market records are hidden or marked blocked, not presented as valid execution opportunities;
- Bybit insufficient-balance proof is treated as non-blocking completion evidence.

If any existing seed data still includes stale invalid records, do not silently rewrite real production-shaped records. For emulator fixtures, either reset/reseed deterministic fixtures or mark invalid records as QA-only/blocked with support-safe audit notes.

---

## Verification Commands

Run:

```bash
npm run typecheck
npm run lint
npm run build
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

If `npm run firebase:rules:test` cannot start because the emulator port is already occupied, run the equivalent direct denial test against the active emulator and report the exact command:

```bash
env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore-rules-stage15f.test.mjs
```

Also run safety scans:

```bash
rg -n "ready_for_live|queued_live|submitted_live|filled_live|failed_live|CRYPTO_EXECUTION_PRODUCTION|CRYPTO_EXECUTION_LIVE_ENABLED" src scripts .env.example README.md
rg -n "api/v3/order|/v5/order/create|placeBinanceOrder|placeBybitOrder|getExchangeOrderPlacementAdapter" src scripts api
rg -n "apiSecret|secretRef|encryptedSecret|encryptedKey|credentialRef|privateKey|exchangeOrderId|rawExchange|signature" src scripts
rg -n "EURUSD|BTCUSDT|crypto_symbol_invalid_for_market|signal_directional_levels" src scripts prompt README.md
```

Scan expectations:

- Order endpoint strings stay isolated to server-only exchange adapters/order-placement files and legacy `api/*.js`.
- No client UI imports order-placement.
- Production status strings may exist in protected production dry-run/gate code, but production trading remains blocked by default.
- `CRYPTO_EXECUTION_LIVE_ENABLED` is not sufficient for production execution.
- `EURUSD` remains allowed only in forex examples/validation/QA, not as crypto execution success.
- Secret-related terms should be limited to server-only vault/adapters/repository/validation, tests, and one-time input state.

---

## Manual Browser QA

Use:

```bash
npm run clean:next
npm run dev:stage15f
```

If port `3000` is in use and Next starts on `3001`, use `http://localhost:3001`.

### Student

Open:

```text
/login?next=%2Fapp%2Fcopier
```

Sign in as the Stage 15F Binance sandbox student.

Confirm:

- connection status is readable;
- paper/testnet activity is readable;
- production beta remains locked/gated;
- consent, pause, resume, revoke still work;
- no raw secrets, credential refs, encrypted blobs, raw exchange payloads, raw balances, or full exchange IDs are visible;
- no fixture-heavy copy appears in the default student surface;
- no `EURUSD` appears as crypto execution.

### Influencer

Open:

```text
/workspace
```

Confirm:

- `market=crypto`, `pair=EURUSD` is rejected;
- `market=forex`, `pair=EURUSD` is allowed only as forex alerts;
- `market=crypto`, `pair=BTCUSDT`, valid buy levels can publish;
- invalid buy/sell levels are blocked before publish;
- crypto execution summary is readable;
- bounded lists scroll internally;
- no raw execution IDs dominate the UI;
- no fixture-heavy copy appears in the default influencer surface.

### Super Admin

Open:

```text
/admin
```

Load:

```text
ws_stage15f_paper_beta
```

Confirm:

- workspace preview loads;
- paper, testnet, and production beta sections are clearly separated;
- Binance testnet filled proof is visible in support-safe form;
- Bybit insufficient-balance proof is documented in support-safe form;
- production beta remains disabled/dry-run/vault-blocked;
- lists are bounded and internally scrollable;
- stat labels do not wrap vertically.

---

## Completion Note Requirements

Create `prompt/15K-crypto-execution-completion-note.md` with:

- current supported crypto workflow;
- what a student can do now;
- what an influencer can do now;
- what Super Admin can verify now;
- exact production gates still blocking real-money orders;
- exact reason Bybit filled proof is not required for Stage 15K;
- proof that Binance testnet reached `filled_live`;
- proof that Bybit reached the exchange and failed safely due to insufficient testnet funds;
- evidence that forex is intentionally deferred;
- evidence that external master-trader ingestion is intentionally deferred;
- verification command results;
- manual QA result;
- next recommended prompt after crypto completion.

The note should be plain, operational, and useful for a future chat.

---

## Acceptance Criteria

Stage 15K is complete only when:

- Crypto Auto-Copy is productized across student, influencer, and Super Admin views.
- Fixture/debug language is removed or restricted to Super Admin/QA notes.
- Student production consent/pause/resume/revoke still works.
- Influencer signal validation still blocks invalid market symbols and invalid directional levels.
- `EURUSD` never appears as crypto execution success.
- `BTCUSDT` valid crypto signals still work.
- Paper execution remains working.
- Binance testnet proof remains documented.
- Bybit insufficient-balance proof is documented as non-blocking.
- Production live trading remains blocked by 15I gates.
- No secrets or full credential refs are exposed in UI.
- Firestore rules remain deny-by-default for protected execution paths.
- Bounded lists and stat labels are responsive and mature.
- `npm run typecheck`, `npm run lint`, `npm run build`, Stage 15F/15H/15I/15J/15K QA, and Firestore rules tests pass or have an exact emulator-port fallback command that passes.
- Manual browser QA passes for student, influencer, and Super Admin.

Final response must include:

- exact files changed;
- what was productized in student, influencer, and Super Admin surfaces;
- what fixture/debug wording was removed or moved;
- what crypto workflow is now considered complete;
- what remains deferred to production vault/KMS and explicit live beta approval;
- what remains deferred to forex;
- what remains deferred to external master-trader ingestion;
- verification results;
- manual QA results;
- explicit statement that production live trading remains blocked.
