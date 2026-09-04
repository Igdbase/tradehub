# Prompt 15L - Production Credential Vault And Live Canary Completion Note

Stage 15L is implemented as a controlled production canary bridge. No real production order was placed during implementation.

## Current Supported Workflow

1. Paid, entitled, personal-account students can submit production Binance/Bybit credentials through the server route after permission verification.
2. Production credentials are stored in Google Cloud Secret Manager when `CRYPTO_CREDENTIAL_STORAGE_MODE=cloud_secret_manager` and production vault readiness is explicitly enabled.
3. TradeHub-published crypto signals can create production-live intents only through the existing Stage 15I gate stack.
4. Super Admin can run a separate production canary route with typed `RUN_LIVE_CANARY` confirmation.
5. The canary worker processes at most one ready production intent, supports spot `BUY` market orders only, clamps notional to 5 USDT by default, reserves an order attempt before exchange submission, and records support-safe results.
6. Canary reconciliation and cancel routes target canary-marked records only and require typed confirmation.

## Production Gates Still Required

- `CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED=true`
- `CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=true`
- `CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=true`
- `CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=false`
- `CRYPTO_CREDENTIAL_STORAGE_MODE=cloud_secret_manager`
- `CRYPTO_CREDENTIAL_PRODUCTION_VAULT_READY=true`
- Secret Manager project configured and reachable through ADC or service runtime identity.
- Platform/workspace production beta controls enabled.
- Platform/workspace production order calls enabled.
- Platform/workspace dry-run disabled.
- Platform/workspace kill switches off.
- Student, exchange, and symbol allowlists present.
- Active production consent, not paused or revoked.
- Stage 16 Auto-Copy entitlement allowed.
- Active paid personal-account posture.
- Fresh verified production connection.
- Withdrawals confirmed disabled.

`CRYPTO_EXECUTION_LIVE_ENABLED` remains ineffective for production order placement.

## What Remains Hidden

Student and influencer previews do not expose API keys, API secrets, Secret Manager names, credential refs, encrypted blobs, signatures, raw exchange payloads, raw balances, or full exchange order IDs. Super Admin UI receives only support-safe masked refs and statuses.

## Manual Canary Status

No real production canary was run in this implementation turn. The remaining manual steps are:

1. Configure Secret Manager and production env gates.
2. Connect one dedicated production exchange account with tiny funds.
3. Allowlist one workspace, student, exchange, and symbol.
4. Publish one valid crypto `BUY` signal.
5. Run the Super Admin canary with `RUN_LIVE_CANARY`.
6. Reconcile with `RECONCILE_LIVE_CANARY`.
7. Confirm emergency-stop controls after the run.

## Deferred

- Broad production Auto-Copy rollout.
- Production sell canaries.
- Balance precheck before canary submission.
- TP/SL/OCO/bracket automation.
- Leverage, futures, margin, derivatives, transfers, withdrawals, batch orders, and percent-balance sizing.
- Forex execution.
- External master-trader ingestion.
