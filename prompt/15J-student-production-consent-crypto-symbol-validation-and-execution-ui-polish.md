# Prompt 15J - Student Production Consent, Crypto Symbol Validation, And Execution UI Polish

You are building **TradeHub Stage 15J**.

Stage 15I added a fail-closed production live beta gate, but manual browser QA exposed three follow-up issues:

1. A workspace signal could be saved as `market: "crypto"` while still using a forex pair such as `EURUSD`, and that bad record could appear inside crypto execution previews.
2. The student copier page exposes pause controls, but production live consent and revoke controls are not clear or usable from the student UI.
3. Student/workspace/admin execution panels are still too cramped. Some stat labels and pills wrap into vertical text and the surfaces still feel like diagnostic fixtures instead of a mature product.

Stage 15J must fix those issues without weakening the Stage 15I safety gates.

Do not enable production trading. Do not add real production exchange calls. Do not bypass Stage 16 entitlements. Do not weaken Firestore rules. Do not expose secrets. Do not implement external master-trader ingestion. Do not implement forex execution.

---

## Read First

Before editing, read:

- `plan.md`
- `prompt/promptsumary.md`
- `prompt/15I-production-live-beta-gate.md`
- `prompt/15I-production-live-beta-qa-notes.md`
- `prompt/15I-production-live-beta-runbook.md`
- `prompt/15H-sandbox-testnet-live-order-worker-completion-note.md`
- `README.md`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/crypto-execution.ts`
- `src/types/workspace-dashboard.ts`
- `src/types/entitlements.ts`
- `src/lib/entitlements/student-entitlements.ts`
- `src/lib/workspace/dashboard-validation.ts`
- `src/lib/workspace/dashboard-repository.ts`
- `src/lib/workspace/dashboard-mappers.ts`
- `src/lib/crypto-execution/crypto-risk-engine.ts`
- `src/lib/crypto-execution/crypto-signal-routing.ts`
- `src/lib/crypto-execution/crypto-live-sandbox.ts`
- `src/lib/crypto-execution/crypto-live-production.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/components/workspace/signal-management-section.tsx`
- `src/components/workspace/crypto-execution-ops-section.tsx`
- `src/components/admin/crypto-execution-ops-panel.tsx`
- `src/components/student-app/student-copier-client.tsx`
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
- `scripts/firestore-rules-stage15f.test.mjs`

Use the current repo, not remembered code shape. Preserve the 15I fail-closed production posture.

---

## Stage Goal

Close the manual QA gaps before any real production beta work:

- A forex pair like `EURUSD` must never be accepted as a crypto execution symbol.
- Existing invalid crypto execution preview rows must be repaired, hidden, or marked blocked in a support-safe way.
- Students must have a clear production live consent and revoke flow in the app.
- Pause must keep working.
- Execution dashboards must become readable, mature, and responsive.
- All safety gates from 15A-15I must remain intact.

---

## Non-Negotiable Safety Boundary

Do **not**:

- submit production exchange orders;
- make `CRYPTO_EXECUTION_LIVE_ENABLED` enough to place orders;
- make `CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED` usable without vault, consent, allowlists, controls, caps, and Super Admin worker gates;
- store or expose API keys/secrets in UI;
- expose credential refs, encrypted blobs, signed payloads, raw exchange responses, raw balances, or full exchange order IDs;
- allow client Firestore reads/writes for protected execution records;
- silently rewrite production records without an auditable repair path;
- weaken Stage 16 entitlement checks;
- route funded-account, prop-firm, alerts-only, trial, past-due, revoked, paused, stale-permission, withdrawal-enabled, or unallowlisted students into live execution;
- implement forex Auto-Copy;
- implement external master-trader account ingestion.

If a bad symbol, bad market, missing consent, ambiguous permission, or unsafe record is found, fail closed with support-safe copy.

---

## Problem 1 - Market-Aware Symbol Validation

Observed manual QA issue:

- The workspace signal list showed a published row like `EURUSD - buy`.
- That row appeared under crypto execution because it had crypto execution metadata even though `EURUSD` is a forex pair.

Fix this at multiple layers.

### Server Validation

Update `src/lib/workspace/dashboard-validation.ts` so signal validation is market-aware:

- If `market === "crypto"`, require a normalized crypto spot symbol or pair such as:
  - `BTCUSDT`
  - `ETHUSDT`
  - `BNBUSDT`
  - `SOLUSDT`
  - `BTC/USDT`
  - `ETH-USDT`
- If `market === "forex"`, require a forex-style major/minor pair such as:
  - `EURUSD`
  - `GBPUSD`
  - `USDJPY`
  - `XAUUSD`
- A forex-style symbol must not pass as crypto.
- A crypto-style symbol must not pass as forex unless it is explicitly part of a future supported forex/CFD model. Do not add that model in 15J.
- Error copy should say exactly what kind of pair is expected for the selected market.

Suggested helper shape:

```ts
normalizeSignalPairForMarket(pair, market)
isSupportedCryptoSpotSymbol(pair)
isSupportedForexPair(pair)
```

Keep the implementation conservative. Do not try to support every global market symbol yet.

### Workspace UI

Update `src/components/workspace/signal-management-section.tsx`:

- When market is `crypto`, default the pair field to `BTCUSDT` if empty or currently forex-looking.
- When market is `forex`, default the pair field to `EURUSD` if empty or currently crypto-looking.
- Show market-specific placeholder text:
  - crypto: `BTCUSDT, ETHUSDT`
  - forex: `EURUSD, GBPUSD`
- Prevent the UI from leaving `EURUSD` in the form when the user switches the market to crypto.
- Preserve explicit user input when it is valid for the selected market.

### Routing Guards

Update server routing and risk code so UI validation is not trusted:

- `src/lib/crypto-execution/crypto-risk-engine.ts`
- `src/lib/crypto-execution/crypto-signal-routing.ts`
- `src/lib/crypto-execution/crypto-live-sandbox.ts`
- `src/lib/crypto-execution/crypto-live-production.ts`

Crypto execution routing must require:

- `signal.market === "crypto"`;
- pair normalizes to a supported crypto spot symbol;
- pair is not forex-looking;
- symbol is in student/workspace/live allowlists where applicable.

If a bad historical record exists, do not create a new intent. Write a blocked risk/gate decision with safe reason such as:

```text
crypto_symbol_invalid_for_market
```

### Existing Bad Data Handling

Handle already-seeded or manually-created bad records.

Do not silently mutate real production history. Instead:

- Add a bounded emulator-safe repair or QA fixture path that either:
  - marks invalid `EURUSD` crypto execution intents as `cancelled` or blocked with a safe reason, or
  - hides invalid-market records from crypto execution previews and reports a warning.
- For local/manual QA fixtures, create a fresh valid crypto signal/intent using `BTCUSDT` so the student page no longer relies on the bad `EURUSD` row.
- Record the repair in QA notes.

Acceptance for this problem:

- Publishing `market=crypto`, `pair=EURUSD` fails validation.
- Publishing `market=forex`, `pair=BTCUSDT` fails validation.
- Direct server route attempts with mismatched market/pair fail even if the UI is bypassed.
- Crypto execution previews do not present `EURUSD` as a valid crypto execution opportunity.
- A fresh `BTCUSDT` crypto signal routes normally through paper/testnet/production dry-run gates.

---

## Problem 2 - Student Production Consent And Revoke UI

Observed manual QA issue:

- Student copier page shows pause and pause works.
- Production live consent and revoke controls are not visible or clearly usable.

Fix the student production live beta controls.

### API Routes

Add server-side student API routes for live production consent. Suggested routes:

```text
POST /api/student/crypto-execution/live-production/consent
POST /api/student/crypto-execution/live-production/revoke
POST /api/student/crypto-execution/live-production/pause
POST /api/student/crypto-execution/live-production/resume
```

If you choose fewer routes, keep the payload explicit and auditable.

Requirements:

- Require authenticated student role and workspace claims.
- Use Admin SDK server-side.
- Never allow client Firestore writes to protected consent records.
- Consent must be separate from paper/testnet consent.
- Revoke must block future production live routing.
- Pause must block future production live routing but preserve consent history.
- Resume must not bypass allowlist, entitlement, vault, order env, dry-run, or caps.
- Record support-safe audit events.
- Do not expose secrets or raw request fingerprints.

Consent record should include:

- `productionStatus: "accepted" | "paused" | "revoked"`
- `productionConsentVersion`
- `productionRiskDisclosureVersion`
- `productionAcceptedAt`
- `productionRevokedAt`
- `productionPausedAt`
- confirmation booleans:
  - personal account
  - not funded/prop-firm
  - withdrawals disabled
  - live loss risk understood
  - TradeHub does not custody funds

### Student UI

Update `src/components/student-app/student-copier-client.tsx`:

- Add a mature `Production live beta consent` panel near the production beta preview.
- Show current status: unavailable, not accepted, accepted, paused, revoked.
- Show why production still cannot trade: dry-run on, order env disabled, vault blocked, allowlist missing, etc.
- Add explicit action buttons:
  - `Accept live beta terms`
  - `Pause live beta`
  - `Resume live beta`
  - `Revoke live consent`
- Use checkboxes for required confirmations before accepting.
- Disable or explain actions that are not allowed yet.
- Keep paper pause controls separate from production live pause controls.
- Make it clear that accepting consent does **not** enable real trading while production gates are blocked.

Do not put secrets or credential refs into the UI.

### QA

Add Stage 15J QA coverage:

- student accepts production consent;
- student pauses production live beta;
- student resumes production live beta;
- student revokes production consent;
- revoked consent blocks routing;
- paused consent blocks routing;
- paper pause still works independently;
- accepting production consent does not enable live orders while vault/order env are blocked.

---

## Problem 3 - Execution UI Polish And Text Containment

Manual QA shows stat cards and pills still wrapping into cramped vertical text, especially:

- `RECENT INTENTS`
- `READY FOR PAPER`
- `RISK BLOCKED`
- `PAPER ATTEMPTS`
- `LIVE FLAG`
- `PRODUCTION INTENTS`
- long intent/order IDs

Clean up these surfaces:

- student copier
- workspace crypto execution ops
- Super Admin crypto execution ops
- paper execution preview
- live sandbox preview
- live production preview
- shared stat chip / badge styles if needed

Rules:

- Stat cards must use enough minimum width or switch to compact labels before text becomes vertical.
- Labels can wrap at sensible word boundaries but must not stack one letter per line.
- Long IDs should be truncated in UI with support-safe copy, not shown as giant blocks.
- Full raw IDs can remain server-side/admin-bound where appropriate; student/influencer should see masked IDs or short refs.
- Bounded lists show 4 rows and scroll inside the list container.
- The page should not become endlessly long because a list accumulated.
- Cards should not be nested unnecessarily.
- No text escapes borders.
- No buttons/pills become ultra-narrow.
- Keep the TradeHub dark premium style, but make the operational panels feel calm and mature.

Suggested improvements:

- Add a compact stat component variant for execution panels.
- Use `minmax(180px, 1fr)` or similar instead of too-small columns.
- Prefer `grid-template-columns: repeat(auto-fit, minmax(...))`.
- Use `overflow-wrap:anywhere` for IDs, but truncate/mask where possible.
- Use `line-clamp` or short display helpers for IDs.
- Add helper functions like `shortRef(id)`.

Acceptance for this problem:

- Desktop, tablet, and mobile widths do not show vertical one-letter stat labels.
- Student copier production beta section is readable.
- Paper/live sandbox/live production previews all keep text inside borders.
- Accumulating lists scroll internally with 4 visible rows.
- No secrets are revealed while shortening IDs.

---

## Firestore Rules

Keep protected execution records client-denied.

If new consent routes or records are added, update Firestore rules tests to prove client SDK denial for:

```text
/workspaces/{workspaceId}/students/{studentId}/live_consents/**
/workspaces/{workspaceId}/students/{studentId}/live_execution_preferences/**
/workspaces/{workspaceId}/live_gate_decisions/**
/workspaces/{workspaceId}/live_execution_intents/**
/workspaces/{workspaceId}/live_order_attempts/**
/workspaces/{workspaceId}/live_reconciliation_records/**
/workspaces/{workspaceId}/live_execution_audit_events/**
/broker_keys/**
```

Student consent mutations must go through API routes, not direct client Firestore writes.

---

## Seed And QA

Update or add deterministic emulator-safe fixtures.

Suggested scripts:

```text
scripts/qa-stage15j-student-consent-symbol-ui.mjs
```

Suggested package script:

```json
{
  "stage15j:qa": "node scripts/qa-stage15j-student-consent-symbol-ui.mjs"
}
```

The QA should prove:

- `EURUSD` cannot be published as crypto.
- `BTCUSDT` cannot be published as forex.
- bad market/pair records cannot create new crypto execution intents.
- existing invalid records are hidden/blocked/repaired with safe warnings.
- `BTCUSDT` crypto signal still creates valid paper/testnet/production dry-run records.
- student production consent accept/pause/resume/revoke state transitions work through server APIs.
- revoked and paused production consent block routing.
- paper pause remains separate from production pause.
- protected consent/execution records remain Firestore client-denied.
- production order calls remain disabled/fail-closed.

Do not require real exchange credentials for Stage 15J QA.

---

## Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run stage15f:qa
npm run stage15h:qa
npm run stage15i:qa
npm run stage15j:qa
npm run firebase:rules:test
```

Also run scans:

```bash
rg -n "EURUSD" src scripts
rg -n "credentialRef|encryptedSecretRef|apiSecret|ciphertext|authTag|exchangeOrderId" src/components src/app/api src/lib
rg -n "CRYPTO_EXECUTION_LIVE_ENABLED|CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED|CRYPTO_EXECUTION_PRODUCTION_DRY_RUN" src scripts
rg -n "api\\.binance\\.com|api\\.bybit\\.com|/api/v3/order|/v5/order/create" src scripts api
```

Expected posture:

- `EURUSD` may still exist in forex mock/demo data, but not in crypto execution seed/routing success fixtures.
- Secret refs remain server-only.
- Production order env remains gated and dry-run by default.
- Order endpoints remain isolated to server-only adapters/production worker code.

---

## Manual QA

Run localhost with emulators and Stage 15 fixtures.

Student QA:

- Sign in as `student_stage15f_binance_sandbox@example.test`.
- Open `/app/copier`.
- Confirm paper activity still works.
- Confirm production beta says disabled/gated by dry-run/order-env/vault.
- Accept production live consent.
- Confirm the page says consent accepted but live orders are still blocked by production gates.
- Pause production live beta.
- Resume production live beta.
- Revoke production live consent.
- Confirm revoked state is clear.
- Confirm no API key, secret, credential ref, encrypted blob, raw exchange response, raw balance, or full exchange order ID appears.

Influencer QA:

- Sign in as `stage15f.influencer@example.test`.
- Open `/workspace`.
- Try to publish `market=crypto`, `pair=EURUSD`; it should fail.
- Try to publish `market=forex`, `pair=BTCUSDT`; it should fail.
- Publish `market=crypto`, `pair=BTCUSDT`; it should succeed and route safely.
- Confirm no old `EURUSD` row appears as valid crypto execution.

Super Admin QA:

- Sign in as `stage15f.admin@example.test`.
- Open `/admin`.
- Load workspace `ws_stage15f_paper_beta`.
- Confirm production beta remains dry-run/vault-blocked.
- Confirm execution lists are bounded to 4 visible rows and scroll internally.
- Confirm labels do not stack vertically.

---

## Docs To Update

Update:

- `README.md`
- `plan.md`
- `prompt/promptsumary.md`
- `prompt/15I-production-live-beta-qa-notes.md` if needed

Create:

```text
prompt/15J-student-production-consent-crypto-symbol-validation-and-execution-ui-polish-qa-notes.md
```

---

## Acceptance Criteria

Stage 15J is complete only when:

- `EURUSD` cannot be saved or routed as a crypto execution symbol.
- Market/pair validation is enforced on both UI and server.
- Existing invalid crypto execution records are hidden, blocked, or repaired with support-safe audit/QA notes.
- A fresh `BTCUSDT` crypto signal still routes through paper/testnet/production dry-run gates.
- Student production consent, pause, resume, and revoke controls are visible and functional.
- Production consent remains separate from paper/testnet consent.
- Accepting consent does not enable production orders while production vault/order gates are blocked.
- Firestore rules still deny client SDK access to protected live records.
- Execution panels no longer show vertical stat labels or cramped IDs on desktop/tablet/mobile.
- Bounded execution lists show 4 visible rows and scroll internally.
- No secrets, credential refs, encrypted blobs, raw exchange payloads, raw balances, or full exchange order IDs appear in student/influencer UI.
- `npm run typecheck`, `npm run lint`, `npm run build`, Stage 15F/15H/15I/15J QA, and Firestore rules tests pass.

Final response must include:

- exact root cause of the `EURUSD` crypto execution row;
- exact files changed;
- how bad existing records are handled;
- what student consent/revoke controls were added;
- what production gates remain blocking real orders;
- UI containment/polish summary;
- verification results;
- manual QA checklist result;
- explicit statement that production live trading and external master-trader ingestion remain deferred.
