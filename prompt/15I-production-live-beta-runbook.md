# Prompt 15I Production Live Beta Runbook

Stage 15I is a tiny, fail-closed production live beta gate for TradeHub-published crypto signals only. It is not a broad production rollout.

## Pre-Flight Checklist

- Confirm Stage 16 Auto-Copy entitlement is active for the student.
- Confirm the student is paid, active, and personal-account only.
- Confirm funded-account, prop-firm, trial, past-due, cancelled, paused, revoked, alerts-only, or unallowlisted students are blocked.
- Confirm production Binance/Bybit key has trading permission and withdrawals disabled.
- Confirm production permission verification is fresh.
- Confirm production credential storage is KMS/cloud-secret backed, not `local_encrypted`.
- Confirm `CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=false` only after a dry-run proof is reviewed.
- Confirm max order cap is tiny, normally 10 to 25 USDT.

## Enable Gates

Enable in this order:

1. Platform Firestore control: `/platform_live_execution_controls/current.productionBetaEnabled=true`.
2. Workspace Firestore control: `/workspaces/{workspaceId}/live_execution_controls/current.productionBetaEnabled=true`.
3. Production allowlists:
   - `/workspaces/{workspaceId}/live_allowlists/production_students`
   - `/workspaces/{workspaceId}/live_allowlists/production_exchanges`
   - `/workspaces/{workspaceId}/live_allowlists/production_symbols`
4. Server env:
   - `CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=true`
   - `CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=true`

Do not enable production order calls until dry-run evidence is reviewed.

## Worker And Reconciliation

Super Admin only:

- Dry-run worker: `POST /api/admin/crypto-execution/live-production/worker/run`
- Reconciliation: `POST /api/admin/crypto-execution/live-production/reconcile/run`
- Cancel attempt: `POST /api/admin/crypto-execution/live-production/orders/{attemptId}/cancel`

All calls require a workspace ID. Lists and worker runs are bounded.

## Emergency Stop

Set one or more:

- `/platform_live_execution_controls/current.killSwitchEnabled=true`
- `/workspaces/{workspaceId}/live_execution_controls/current.killSwitchEnabled=true`
- Student production consent `productionStatus="paused"` or `"revoked"`
- Remove student/exchange/symbol from production allowlists
- Restore `CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=true`
- Remove `CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED`

Then run production reconciliation and capture audit evidence.

## Support Copy

- Live trading can lose money.
- TradeHub does not custody funds.
- Students remain responsible for their connected exchange accounts.
- Exchange API withdrawals must be disabled.
- Execution price, fill, latency, profit, and availability are not guaranteed.
- Funded-account and prop-firm capital is not eligible.

## Rollback Checklist

- Disable platform and workspace production beta controls.
- Enable platform and workspace kill switches.
- Revoke or pause student production consent.
- Remove production allowlists.
- Confirm no unsettled production attempts remain without `reconcile_required` visibility.
- Record a support-safe audit note and screenshot Super Admin preview state.
