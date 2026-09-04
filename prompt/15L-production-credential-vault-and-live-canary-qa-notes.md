# Prompt 15L - Production Credential Vault And Live Canary QA Notes

Stage 15L adds the first controlled bridge from production dry-run to one real-money production canary. It does not enable broad production Auto-Copy.

## Implemented

- `CRYPTO_CREDENTIAL_STORAGE_MODE=cloud_secret_manager` stores production Binance/Bybit credential payloads in Google Cloud Secret Manager.
- Firestore stores only server-only broker key metadata under denied `broker_keys/**` paths.
- Local encrypted credential storage remains available for local sandbox/testnet development and remains disabled in production.
- `/api/admin/crypto-execution/live-production/canary/run` runs at most one Super-Admin-confirmed production canary attempt.
- `/api/admin/crypto-execution/live-production/canary/reconcile` reconciles only canary-marked production attempts.
- `/api/admin/crypto-execution/live-production/canary/orders/[attemptId]/cancel` cancels only canary-marked production attempts.
- Normal production dry-run worker remains separate.

## Required Production Env Gates

```text
CRYPTO_CREDENTIAL_STORAGE_MODE=cloud_secret_manager
CRYPTO_CREDENTIAL_PRODUCTION_VAULT_READY=true
CRYPTO_CREDENTIAL_SECRET_MANAGER_PROJECT_ID=<project>
CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=true
CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=true
CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=false
CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED=true
CRYPTO_EXECUTION_PRODUCTION_CANARY_MAX_ORDER_USDT=5
```

`CRYPTO_EXECUTION_LIVE_ENABLED` remains ineffective for production order placement.

## Firestore Gates

- Platform production beta enabled.
- Workspace production beta enabled.
- Platform/workspace production order calls enabled.
- Platform/workspace dry-run disabled.
- Platform/workspace kill switches off.
- Student/exchange/symbol allowlists present.
- Student production consent accepted, not paused or revoked.
- Student has active paid Auto-Copy entitlement and personal-account posture.
- Production exchange connection verified recently with withdrawals confirmed disabled.

## Manual Canary Steps

Do not run automatically. Run only after code review and explicit owner approval.

1. Use a dedicated production Binance or Bybit account with tiny funds.
2. Create a production API key with trading enabled and withdrawals disabled.
3. Prefer IP restriction if the deployment egress is stable.
4. Submit the key once through the student production connection flow.
5. Confirm the credential is stored through Secret Manager and not Firestore plaintext.
6. Enable one workspace, one student, one exchange, and one `BTCUSDT` or equivalent allowlisted symbol.
7. Keep `CRYPTO_EXECUTION_PRODUCTION_CANARY_MAX_ORDER_USDT` at `5` or less.
8. Publish a valid crypto `BUY` signal. `SELL` is blocked in 15L as `production_canary_sell_deferred`.
9. In Super Admin, type `RUN_LIVE_CANARY` and run the canary.
10. Immediately reconcile with `RECONCILE_LIVE_CANARY`.
11. Record the masked order ref, symbol, exchange, notional, final status, and emergency-stop result.

## Automated QA

```bash
npm run stage15l:qa
```

The automated QA checks source gates only. It does not require Google Cloud credentials, production exchange credentials, or real exchange calls.

## Hidden From Student/Influencer UI

- API keys and secrets.
- Vault resource names.
- Credential refs.
- Encrypted blobs.
- Signatures.
- Raw exchange payloads.
- Raw balances.
- Full exchange order IDs.

## Still Deferred

- Broad production Auto-Copy.
- Production `SELL` canary support.
- Balance precheck before production canary order placement.
- TP/SL/OCO/bracket order automation.
- Leverage, futures, margin, derivatives, transfers, withdrawals, and batch orders.
- Forex execution.
- External master-trader account ingestion.
