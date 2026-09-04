# Prompt 15K QA Notes

Stage 15K is the crypto Auto-Copy completion pass before forex work begins. It does not enable production trading.

## Commands

Run with the Firestore/Auth emulators available:

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
npm run typecheck
npm run lint
npm run build
```

If `npm run firebase:rules:test` cannot start because another emulator owns port `8080`, run the equivalent denial test against the active emulator:

```bash
env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore-rules-stage15f.test.mjs
```

## Stage 15K QA Script

`npm run stage15k:qa` verifies:

- non-admin execution previews scrub stale Stage 15F/15H and fixture wording from old emulator/support records;
- fresh seed labels/messages use product-safe copy for browser QA;
- gated Production Beta previews do not render `submitted live` or `filled live` while production order env, dry-run, or vault gates are blocking;
- crypto/forex symbol validation is still market-aware;
- buy/sell directional level validation remains in workspace POST/PATCH validation;
- paper, testnet, and production dry-run routing still block invalid crypto symbols;
- invalid-market historical rows are hidden with support-safe warnings;
- student and workspace default UI copy uses product labels instead of prompt/fixture labels;
- student production consent controls remain visible and do not imply production orders are active;
- shared preview cards use masked refs and product labels;
- production vault, dry-run, and order-env gates are still represented;
- seeded crypto signal data uses `BTCUSDT`, not `EURUSD`;
- `EURUSD` is not worker-consumable as crypto execution;
- production consent state is explicit and no-custody/loss-risk confirmations are represented;
- no real exchange credentials or production order calls are used.

## Manual Browser QA

Student:

- Sign in as `student_stage15f_binance_sandbox@example.test`.
- Open `/app/copier`.
- Confirm `Paper Auto-Copy`, `Testnet Proof`, and `Production Beta` sections are readable.
- Confirm consent, pause, resume, and revoke still work.
- Confirm accepting Production Beta consent does not make production look live while dry-run/order-env/vault gates are blocked.
- Confirm no raw API key, API secret, credential ref, encrypted blob, raw exchange response, raw balance, or full exchange order ID appears.
- Confirm no `EURUSD` appears as a crypto execution opportunity.

Influencer:

- Sign in as `stage15f.influencer@example.test`.
- Open `/workspace`.
- Confirm `market=crypto`, `pair=EURUSD` is rejected.
- Confirm `market=forex`, `pair=EURUSD` is allowed only as forex Signal Alerts.
- Confirm `market=forex`, `pair=BTCUSDT` is rejected.
- Confirm `market=crypto`, `pair=BTCUSDT` with valid buy/sell levels can publish.
- Confirm invalid buy/sell directional levels are blocked before publish.
- Confirm execution panels use readable product labels and bounded internal scrolling.

Super Admin:

- Sign in as `stage15f.admin@example.test`.
- Open `/admin`.
- Load `ws_stage15f_paper_beta`.
- Confirm paper, Testnet Proof, and Production Beta sections are clearly separated.
- Confirm Binance testnet `filled_live` proof is visible in support-safe form.
- Confirm Bybit insufficient-balance proof is visible/documented in support-safe form.
- Confirm production remains dry-run/vault/order-env blocked.
- Confirm lists are bounded and labels do not stack vertically.

## Current Manual Baseline

- Student copier manual QA cleared for production consent, revoke, pause, resume, and paper/testnet visibility.
- Super Admin workspace preview cleared for `ws_stage15f_paper_beta`.
- Influencer market validation cleared for crypto/forex separation.
- The final directional-level gap was patched so invalid buy/sell levels fail before publish.
- A follow-up manual QA pass found fixture/debug wording in default student/influencer views and live-looking production labels in gated Production Beta previews. That is now patched with UI scrubbing, product-safe seed labels, and safer gated production labels.
- Binance Spot Testnet has a real `filled_live` proof.
- Bybit Testnet reached the order endpoint and failed safely with sanitized insufficient-balance state because the test account had `0` usable USDT in Unified Trading.

## Still Deferred

- Production KMS/cloud-secret credential vault.
- Approved production live beta run with real-money accounts.
- Forex Auto-Copy, FX Blue, cTrader, MT4, and MT5.
- External master-trader exchange account ingestion.
