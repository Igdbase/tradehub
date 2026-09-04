# Stage 15G - Testnet Live Execution QA Checklist For Stage 15H

Stage 15H may start only after this design is reviewed and accepted. Stage 15H must remain sandbox/testnet-only.

## Setup

1. Re-check current Binance and Bybit official docs.
2. Configure sandbox/testnet credentials only.
3. Confirm production credential submission remains blocked.
4. Confirm `CRYPTO_EXECUTION_LIVE_ENABLED` does not enable production trading.
5. Start Firebase emulators and seed Stage 15F paper fixtures.
6. Add Stage 15H sandbox/testnet fixtures without real production secrets.
7. Run Firestore rules tests before and after live-sandbox migrations.

## Exchange Credentials

- Binance sandbox/testnet key exists and is verified against sandbox/testnet.
- Bybit testnet key exists and is verified against testnet.
- Production key is not accepted for sandbox/testnet worker runs.
- Withdrawal permissions are rejected or impossible on testnet.
- Trading permission is required.
- Permission response shape is parsed defensively.
- Stale verification blocks submission.
- Secret refs never appear in UI, API responses, logs, audit events, or screenshots.

## Live Consent And Gates

- Paper consent alone does not create live eligibility.
- Explicit live consent is required.
- Live consent records include disclosure version and timestamp.
- Revoked consent blocks new live sandbox intents.
- Student pause blocks new live sandbox intents.
- Funded-account and prop-firm students remain blocked.
- Past-due or inactive subscription blocks live sandbox execution.
- Platform allowlist required.
- Workspace allowlist required.
- Student allowlist required.
- Exchange allowlist required.
- Symbol allowlist required.
- Workspace approval required.

## Order Placement

- Binance sandbox/testnet market order succeeds with deterministic client order ID.
- Binance sandbox/testnet limit order succeeds with deterministic client order ID.
- Bybit testnet market order succeeds with deterministic order link ID.
- Bybit testnet limit order succeeds with deterministic order link ID.
- Orders are spot-only.
- Leverage/margin flags remain disabled.
- TP/SL values are recorded but not automatically placed unless separately approved.
- Unsupported order types are rejected before adapter submission.

## Idempotency

- Running the worker twice on the same ready live sandbox intent does not duplicate exchange orders.
- Existing attempt with client order ID causes worker to skip or reconcile, not resubmit.
- Duplicate client order ID exchange response triggers reconciliation.
- Worker crash simulation after submit but before final status can recover by client order ID.
- Repeated signal publish/update does not duplicate live sandbox intents for the same student and signal version.

## Risk And Sizing

- Fixed notional sizing passes for allowed symbols.
- Max notional blocks oversized orders.
- Daily max notional blocks after threshold.
- Max open orders blocks when threshold is reached.
- Max symbol exposure blocks repeated same-symbol exposure.
- Min notional failure is safe and support-visible.
- Precision/step-size failure is safe and support-visible.
- Insufficient balance is marked non-retryable until balance changes.
- USDT quote assumption is explicit.
- Non-USDT symbols are blocked unless allowlisted.

## Kill Switches And Cancellation

- Platform kill switch blocks new live sandbox intents.
- Workspace kill switch blocks new live sandbox intents.
- Student pause blocks worker processing.
- Symbol pause blocks matching symbol.
- Exchange pause blocks that exchange.
- Cancel before submission moves to cancelled safely.
- Cancel after submission calls sandbox/testnet cancel endpoint and records result.
- Fill while cancel is in flight records fill and reconciliation context.
- Emergency stop runbook can cancel or mark every open sandbox/testnet order for reconciliation.

## Reconciliation

- Submitted order is reconciled to accepted/submitted.
- Filled order is reconciled to filled.
- Partial fill is reconciled to partial.
- Cancelled order is reconciled to cancelled.
- Rejected order is reconciled to rejected with sanitized reason.
- Timeout becomes `reconcile_required`.
- Unknown exchange response becomes `reconcile_required`.
- Reconciliation queries are bounded.
- Student, influencer, and Super Admin previews remain support-safe.

## Firestore Rules And API Boundaries

- New live collections are denied to unauthenticated client SDK access.
- Student client SDK cannot read/write live consent, live intents, order attempts, reconciliation records, or credentials directly.
- Influencer client SDK cannot read/write protected live records directly.
- Super Admin client SDK cannot bypass protected live records directly.
- API routes verify Firebase ID tokens and role/workspace scope.
- Admin SDK is the only write path for protected live records.

## UI Checks

Student:

- Shows live ineligible state until consent, allowlist, and testnet connection pass.
- Shows sandbox/testnet label clearly.
- Shows pause/revoke controls.
- Shows order history without secrets.

Influencer:

- Shows workspace sandbox/testnet execution summary.
- Shows eligible, blocked, filled, failed, and reconciliation-required counts.
- Does not expose student private balances or credentials.

Super Admin:

- Can load workspace live sandbox preview.
- Can run bounded sandbox/testnet worker.
- Can inspect reconciliation queue.
- Can trigger kill switch and cancel workflow.
- Can see audit trail without raw exchange payloads.

## Required Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run firebase:rules:test
```

Stage 15H should add sandbox/testnet-specific seed and QA commands. They must not require production credentials.

## Required Scans

```bash
rg -n "ready_for_live|queued_live|submitted_live|filled_live" src scripts
rg -n "placeBinanceOrder|placeBybitOrder|getExchangeOrderPlacementAdapter|/api/v3/order|/v5/order/create" src scripts api
rg -n "credentialRefPath|encryptedSecretRef|apiSecret|apiKey|serviceAccount|private_key" src/app src/components src/lib/crypto-execution scripts
```

Expected Stage 15H posture:

- Live statuses appear only in sandbox/testnet code paths that are explicitly disabled for production.
- Order placement adapter is imported only by the sandbox/testnet live worker.
- No client component imports order placement.
- No secret-bearing field appears in public summaries.

## Production Beta Blockers

Production remains blocked until all are true:

- Sandbox/testnet order submit, cancel, and reconciliation are proven on Binance and Bybit.
- Duplicate-prevention tests pass.
- Kill-switch tests pass.
- Rules tests pass.
- Secret exposure scans are clean.
- Manual QA is complete for student, influencer, and Super Admin.
- Incident runbook is written.
- Legal/risk copy is approved.
- Super Admin explicitly approves Prompt 15I.
