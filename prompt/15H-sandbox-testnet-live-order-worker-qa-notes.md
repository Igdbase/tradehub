# Prompt 15H - Sandbox/Testnet Live Order Worker QA Notes

Stage 15H implements a sandbox/testnet-only exchange order lifecycle proof for Binance and Bybit personal exchange accounts.

Production live trading remains blocked. `CRYPTO_EXECUTION_LIVE_ENABLED` does not enable production trading. `CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED=true` is required before the Super Admin live-sandbox worker can call sandbox/testnet exchange order endpoints.

## What Was Implemented

- Live-sandbox execution records under protected workspace paths.
- Live-sandbox routing from newly published TradeHub crypto signals.
- Super Admin-only bounded worker route for `ready_for_live` + `executionMode: live_sandbox` + `environment: sandbox` intents.
- Super Admin-only bounded reconciliation route.
- Super Admin-only cancellation route for sandbox/testnet attempts.
- Binance and Bybit sandbox/testnet order submit, status, and cancel adapter methods.
- Emulator-safe deterministic seed and QA scripts.
- Firestore rules denial coverage for live-sandbox controls, consents, allowlists, intents, attempts, reconciliation records, and audit events.
- Support-safe previews added to student, workspace, and admin crypto execution overview responses.

## Commands

Start Firebase emulators in one terminal:

```bash
npm run firebase:emulators
```

Seed and QA the local live-sandbox fixture:

```bash
npm run stage15h:seed
npm run stage15h:qa
npm run firebase:rules:test
```

Run the app against emulators:

```bash
npm run dev:stage15f
```

Run code verification:

```bash
npm run typecheck
npm run lint
npm run build
```

## Fixture IDs

- Workspace: `ws_stage15f_paper_beta`
- Binance sandbox student: `student_stage15f_binance_sandbox`
- Bybit sandbox student: `student_stage15f_bybit_sandbox`
- Sandbox-preferred student: `student_stage15f_sandbox_preferred`
- Funded blocked student: `student_stage15f_funded_blocked`
- Paused student: `student_stage15f_paused`
- Ready Binance intent: `live_sandbox_stage15h_binance_ready`
- Ready Bybit intent: `live_sandbox_stage15h_bybit_ready`
- Production rejection fixture: `live_sandbox_stage15h_production_rejected`
- Completed preview attempt: `live_attempt_live_sandbox_stage15h_completed_preview_1`

## Optional Real Testnet Integration

Real exchange calls are skipped unless all of the following are true:

- `CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED=true`
- The worker is run by a verified Super Admin route.
- The intent is `ready_for_live`.
- The intent has `executionMode: live_sandbox`.
- The intent has `environment: sandbox`.
- The connection is a verified sandbox/testnet Binance or Bybit connection.
- Encrypted sandbox/testnet credentials are available server-side through the credential vault.

Production keys and `environment: production` records are rejected regardless of env vars.

## Records Shown Vs Hidden

Shown in support-safe summaries:

- exchange;
- sandbox environment;
- symbol;
- side;
- order type;
- notional;
- intent/attempt/reconciliation status;
- safe exchange order IDs and client order IDs;
- sanitized failure code/message;
- timestamps.

Hidden from all UI/API summaries:

- API keys;
- API secrets;
- credential reference paths;
- encrypted blobs;
- signatures;
- raw exchange request/response payloads;
- service-account values.

## Production Blockers Still In Force

- No production live worker exists.
- No production live route exists.
- Production exchange connections are not worker-consumable.
- `CRYPTO_EXECUTION_LIVE_ENABLED` remains ineffective for production trading.
- Stage 16 entitlement and personal-account posture remain required.
- Funded-account and prop-firm students remain blocked.
- Firestore client SDK reads/writes for protected live-sandbox records remain denied.

## Manual QA Checklist

- Student copier view shows paper history and live-sandbox preview without secrets.
- Influencer workspace shows paper and live-sandbox routing summaries after publishing a crypto signal.
- Super Admin workspace crypto preview shows live-sandbox intents, attempts, reconciliation records, and audit events.
- Super Admin live-sandbox worker requires workspace ID and stays bounded.
- Worker with `CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED` unset skips exchange submission.
- Production rejection fixture remains non-consumable.
- Funded and paused students remain blocked.
- Firestore rules test denies direct client access to all live-sandbox records.
