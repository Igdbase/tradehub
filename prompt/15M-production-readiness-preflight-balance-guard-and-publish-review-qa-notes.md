# Stage 15M Production Readiness Preflight QA Notes

Stage 15M is a safety and product-clarity pass after the Stage 15L production canary bridge. It does not place real production orders and does not broaden production Auto-Copy.

## Implemented

- Super Admin production previews now include a support-safe readiness checklist:
  - env beta/order/dry-run/canary/vault state;
  - platform and workspace production beta/order/dry-run/kill-switch state;
  - student, exchange, and symbol allowlist presence;
  - paid Auto-Copy entitlement and personal-account posture when a student candidate is loaded;
  - production consent state;
  - verified production connection, withdrawal-disabled state, and permission freshness;
  - max order, daily notional, and open-order cap posture;
  - balance precheck status.
- Binance and Bybit now have server-only balance precheck adapters.
- The production canary worker blocks before order submission unless the server-only balance precheck returns `sufficient`.
- Student Production Beta UX now explains that consent is separate from Paper Auto-Copy/Testnet Proof and does not enable real orders by itself.
- Influencer signal publishing now shows a review panel with market, pair, direction, levels, delivery mode, expected routing mode, bounded eligible sample, and production gate reasons.

## Balance Precheck

Binance uses the signed Spot account endpoint and checks the quote asset `free` balance without returning or storing raw balances in student/influencer summaries.

Bybit uses the signed V5 wallet-balance endpoint for Unified Trading and checks the quote asset wallet balance minus locked amount without returning or storing raw balances in student/influencer summaries.

The normalized precheck statuses are:

- `sufficient`
- `insufficient`
- `unavailable`
- `credential_missing`
- `exchange_rejected`
- `not_supported_yet`

Any status other than `sufficient` fails closed before exchange order placement.

## Automated QA

Run:

```bash
npm run stage15m:qa
```

The QA script verifies:

- balance adapter types and server-only exports exist;
- Binance and Bybit balance prechecks use account/wallet balance endpoints;
- production canary checks balance before reaching the order adapter;
- support-safe preflight preview fields exist;
- student Production Beta copy remains explicit about consent, custody, and gates;
- influencer publish review exists;
- server market/pair and directional-level validation remain;
- Super Admin preflight copy states secrets/raw balances/full order IDs are not returned;
- client components do not import order-placement adapters;
- student/influencer default surfaces avoid Stage/fixture wording.

## Manual QA

Student:

- Open `/app/copier`.
- Confirm Production Beta says consent is separate from paper/testnet.
- Confirm consent, pause, resume, and revoke remain visible and usable.
- Confirm blocked reasons mention vault, allowlists, dry-run/order controls, caps, and balance precheck without raw balances or credential refs.

Influencer:

- Open `/workspace`.
- Confirm the signal form shows publish review before publishing.
- Confirm crypto `BTCUSDT` with valid directional levels shows crypto routing context.
- Confirm forex remains Signal Alerts only.
- Confirm invalid crypto/forex symbol mixing and invalid directional levels still fail before publish and server-side.

Super Admin:

- Open `/admin`.
- Load `ws_stage15f_paper_beta`.
- Confirm production readiness preflight is visible.
- Confirm balance precheck status is support-safe and raw balances/full exchange order IDs are not visible.
- Confirm production canary remains typed-confirmation and gate-blocked unless all 15L gates are deliberately opened.

## Still Requires Real Funds Later

A real production canary still requires a funded dedicated production Binance/Bybit account, withdrawal-disabled production API key, production Secret Manager vault readiness, all env and Firestore gates open, allowlists, active consent, caps, kill switches off, typed Super Admin confirmation, and explicit owner approval.
