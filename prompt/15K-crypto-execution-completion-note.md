# Prompt 15K Crypto Execution Completion Note

Stage 15K closes the crypto Auto-Copy section up to the approved beta boundary. It productizes the student, influencer, and Super Admin surfaces, adds a completion QA script, and records the final handoff state before forex work begins.

Production live trading remains blocked.

## Supported Crypto Workflow Now

Student:

- Can view server-derived Auto-Copy eligibility from Stage 16 entitlements.
- Can connect Binance or Bybit personal exchange metadata through server routes.
- Can use Paper Auto-Copy readiness, risk preferences, and pause/resume.
- Can see bounded paper activity and risk-blocked reasons.
- Can see Testnet Proof activity from sandbox/testnet lifecycle records.
- Can accept, pause, resume, and revoke Production Beta consent.
- Cannot trigger production real-money orders from consent alone.

Influencer:

- Can publish crypto signals using supported spot symbols such as `BTCUSDT`.
- Can publish forex signals such as `EURUSD` as Signal Alerts only.
- Cannot publish `EURUSD` as a crypto execution symbol.
- Cannot publish `BTCUSDT` as forex.
- Cannot publish invalid directional levels:
  - buy requires take profit above entry and stop loss below entry;
  - sell requires take profit below entry and stop loss above entry.
- Can see workspace-level Paper Auto-Copy, Testnet Proof, and gated Production Beta summaries without secrets.

Super Admin:

- Can load workspace-scoped crypto previews for `ws_stage15f_paper_beta`.
- Can inspect paper execution, testnet lifecycle, production dry-run beta, risk decisions, and audit events.
- Can run bounded paper worker, testnet worker/reconciliation, and production dry-run controls.
- Can see support-safe Binance/Bybit proof and failure state without raw secrets or full exchange order IDs in UI-level summaries.

## Production Gates Still Blocking Real-Money Orders

Production order submission remains blocked unless a later approved prompt intentionally completes all of these:

- production-grade KMS/cloud-secret credential vault;
- `CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=true`;
- `CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=false`;
- production vault readiness flag/control;
- platform production beta enabled;
- workspace production beta enabled;
- Super Admin allowlists for workspace, student, exchange, and symbol;
- active paid Auto-Copy entitlement;
- personal-account risk posture;
- student Production Beta consent accepted and not paused/revoked;
- fresh production exchange permission verification;
- withdrawals confirmed disabled;
- notional, daily, symbol, open-order, and failure caps;
- platform/workspace/student/exchange/symbol kill switches off;
- bounded Super Admin production worker execution.

`CRYPTO_EXECUTION_LIVE_ENABLED` remains insufficient for production execution.

## Binance Testnet Proof

Stage 15H recorded a real Binance Spot Testnet BTCUSDT lifecycle proof:

- real Binance sandbox/testnet key verified through server-side permission checks;
- Super Admin testnet worker submitted a BTCUSDT order;
- TradeHub recorded an intent and order attempt reaching `filled_live`;
- no API key, secret, credential ref, encrypted blob, signed payload, raw exchange response, or service-account value was exposed to student/influencer UI.

Evidence is in `prompt/15H-sandbox-testnet-live-order-worker-completion-note.md`.

## Bybit Testnet Proof

Stage 15H also reached the real Bybit Testnet order endpoint:

- real Bybit sandbox/testnet key verified through server-side permission checks;
- Super Admin testnet worker submitted a BTCUSDT request;
- Bybit returned sanitized failure code `bybit_order_ret_170131`;
- safe diagnostics showed the test account had `0` usable USDT in Unified Trading.

This is non-blocking for Stage 15K because the TradeHub path reached Bybit and failed safely due to missing testnet funds, not due to routing, credential storage, permission verification, or secret exposure.

## Productization Completed In 15K

- Student copier copy now uses product labels: `Paper Auto-Copy`, `Testnet Proof`, `Production Beta`, `Connection`, `Risk Preferences`, and `Activity`.
- Workspace crypto operations copy now explains Paper Auto-Copy, Testnet Proof, gated Production Beta, and that forex remains Signal Alerts only.
- Shared preview cards use shorter labels, masked refs, bounded four-row lists, and less fixture-heavy wording.
- Non-admin execution previews scrub stale Stage 15F/15H and fixture wording from old emulator/support records before display.
- Fresh Stage 15F/15H seed labels and safe messages were generalized so browser QA no longer renders fixture wording by default.
- Gated Production Beta previews no longer show `submitted live` or `filled live` labels on student/influencer surfaces unless production real-money execution gates are actually open. They show safer labels such as `production dry-run`, `gated preview`, `recorded beta check`, and `review needed`.
- Super Admin keeps the deeper diagnostic surface while still separating paper, testnet, and production dry-run beta sections.
- The Stage 15K QA script checks product copy, symbol validation, directional-level validation, production gates, masked refs, seeded crypto state, and documented Binance/Bybit proof.

## Protected Data Still Hidden

Student, influencer, and UI-level Super Admin previews must not expose:

- API keys;
- API secrets;
- credential refs;
- encrypted blobs;
- signed payloads;
- raw exchange responses;
- raw balances;
- full exchange order IDs;
- service-account values.

Protected execution collections remain accessed through Admin SDK API routes, not client Firestore reads/writes.

## Forex Deferred

Forex Auto-Copy is intentionally not part of Binance/Bybit crypto execution. Forex signals can exist as Signal Alerts only. FX Blue, cTrader, MT4, MT5, and broker copy trading remain future work.

## External Master-Trader Ingestion Deferred

TradeHub-published trade instructions remain the supported route. External Binance/Bybit master-account order ingestion remains deferred because it requires private stream ingestion, order/fill deduplication, position matching, latency handling, reconciliation, and stronger incident semantics.

## Verification

Final local command results from the Stage 15K verification pass:

```text
npm run typecheck: passed
npm run lint: passed
npm run build: passed
npm run stage15f:seed: passed against local Firestore emulator
npm run stage15f:seed-auth: passed against local Auth emulator
npm run stage15f:qa: passed
npm run stage15h:seed: passed
npm run stage15h:qa: passed; no real sandbox/testnet exchange calls because CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED was not true
npm run stage15i:seed: passed
npm run stage15i:qa: passed; no real production exchange calls
npm run stage15j:qa: passed
npm run stage15k:qa: passed after the non-admin fixture/debug wording and gated production-status follow-up patch
npm run firebase:rules:test: wrapper could not start because Firestore emulator port 8080 was already taken
env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore-rules-stage15f.test.mjs: passed against the active emulator
```

Safety scans were run:

```text
rg -n "ready_for_live|queued_live|submitted_live|filled_live|failed_live|CRYPTO_EXECUTION_PRODUCTION|CRYPTO_EXECUTION_LIVE_ENABLED" src scripts .env.example README.md
rg -n "api/v3/order|/v5/order/create|placeBinanceOrder|placeBybitOrder|getExchangeOrderPlacementAdapter" src scripts api
rg -n "apiSecret|secretRef|encryptedSecret|encryptedKey|credentialRef|privateKey|exchangeOrderId|rawExchange|signature" src scripts
rg -n "EURUSD|BTCUSDT|crypto_symbol_invalid_for_market|signal_directional_levels" src scripts prompt README.md
```

Scan posture:

- Live status strings appear in protected live-sandbox/live-production code and QA/seed scripts.
- Order endpoint strings remain isolated to server-only exchange adapters/order-placement files and legacy `api/*.js`.
- Secret-related terms remain in server-only vault/adapters/repository/validation, one-time student credential form state, tests, and unrelated Paystack/Solana verification paths.
- `EURUSD` appears in forex examples, validation, QA, and prompts, not as crypto execution success.

## Manual QA Result

Current baseline from manual QA:

- Student copier cleared for production consent, revoke, pause, resume, and paper/testnet visibility.
- Super Admin workspace preview cleared.
- Influencer market validation cleared for `EURUSD` as forex alerts only and invalid crypto `EURUSD` returning `400`.
- Directional-level publishing was patched after manual QA found invalid `BTCUSDT` buy levels could publish and then risk-block later.

Final browser QA should use `prompt/15K-crypto-execution-completion-qa-notes.md`.

## Next Recommended Prompt

Begin forex planning only after this crypto completion note is accepted. Do not start production real-money expansion without a separate approved production-vault/live-beta prompt.
