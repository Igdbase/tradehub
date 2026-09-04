# Prompt 15J QA Notes

Stage 15J fixes three manual QA gaps without enabling production trading.

## What Changed

- Workspace signal validation is market-aware:
  - crypto accepts supported spot symbols such as `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, and slash/hyphen variants that normalize to those symbols;
  - forex accepts supported pairs such as `EURUSD`, `GBPUSD`, `USDJPY`, and `XAUUSD`;
  - mismatched market/pair submissions fail with market-specific validation copy.
- Crypto paper, live-sandbox, and production dry-run routing all require a supported crypto spot symbol.
- Bad historical crypto execution preview rows are hidden with a support-safe warning instead of being presented as valid crypto opportunities.
- Student production live consent is separate from paper and sandbox/testnet consent.
- Student production live consent actions are server routes:
  - `POST /api/student/crypto-execution/live-production/consent`
  - `POST /api/student/crypto-execution/live-production/pause`
  - `POST /api/student/crypto-execution/live-production/resume`
  - `POST /api/student/crypto-execution/live-production/revoke`
- Execution panels use wider stat grids, safer badges, bounded lists, and shortened refs.

## Commands

```bash
npm run stage15f:seed
npm run stage15f:seed-auth
npm run stage15h:seed
npm run stage15i:seed
npm run stage15j:qa
npm run firebase:rules:test
npm run typecheck
npm run lint
npm run build
```

Run the earlier QA scripts too before production beta review:

```bash
npm run stage15f:qa
npm run stage15h:qa
npm run stage15i:qa
```

## Manual Browser QA

Student:

- Sign in as `student_stage15f_binance_sandbox@example.test`.
- Open `/app/copier`.
- Confirm paper activity is still visible and paper pause/resume still works.
- Confirm the production live beta consent panel is visible.
- Accept production live beta terms with all five confirmations.
- Confirm the page says consent is accepted but production orders remain blocked by dry-run/order-env/vault gates.
- Pause, resume, and revoke production live beta consent.
- Confirm no API key, secret, credential ref, encrypted blob, raw exchange response, raw balance, or full exchange order ID appears.

Influencer:

- Sign in as `stage15f.influencer@example.test`.
- Open `/workspace`.
- Try to publish `market=crypto`, `pair=EURUSD`; it should fail.
- Try to publish `market=forex`, `pair=BTCUSDT`; it should fail.
- Publish `market=crypto`, `pair=BTCUSDT`; it should route through paper/testnet/production dry-run gates safely.
- Confirm old invalid-market rows are not shown as valid crypto execution rows.

Super Admin:

- Sign in as `stage15f.admin@example.test`.
- Open `/admin`.
- Load workspace `ws_stage15f_paper_beta`.
- Confirm production remains dry-run/vault/order-env blocked.
- Confirm execution preview lists show four visible rows and scroll internally.
- Confirm stat labels and status badges do not stack vertically on desktop, tablet, or mobile widths.

## Existing Bad Data Handling

Stage 15J does not silently rewrite production history. Existing invalid-market execution rows are hidden from crypto execution previews and the preview warning tells support that invalid-market rows were suppressed. Fresh routing writes blocked risk/gate decisions with `crypto_symbol_invalid_for_market`.

For emulator QA, use fresh `BTCUSDT` signals instead of relying on any old `EURUSD` crypto rows.

## Production Blockers Still In Force

- `CRYPTO_EXECUTION_LIVE_ENABLED` remains insufficient.
- `CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED` remains disabled for automated QA.
- `CRYPTO_EXECUTION_PRODUCTION_DRY_RUN` remains on by default.
- Production credential storage remains fail-closed until a real KMS/cloud-secret vault adapter exists.
- Funded-account, prop-firm, alerts-only, trial, past-due, revoked, paused, stale-permission, withdrawal-enabled, unallowlisted, and invalid-symbol paths remain blocked.

Production live trading and external master-trader ingestion remain deferred.
