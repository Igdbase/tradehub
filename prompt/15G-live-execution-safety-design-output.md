# Stage 15G - Live Execution Safety Design Output

Stage 15G is a design-only gate. It does not approve live order placement, does not add live statuses to TypeScript, and does not make `CRYPTO_EXECUTION_LIVE_ENABLED` effective. Stage 15 remains paper-only until a later reviewed prompt implements sandbox/testnet live execution.

## External Documentation Reviewed

- Binance Spot trade endpoints: `https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade`
- Binance API key permission endpoint: `https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/account#get-api-key-permission`
- Binance Spot user data stream: `https://developers.binance.com/en/docs/products/spot/user-data-stream`
- Bybit V5 create order: `https://bybit-exchange.github.io/docs/v5/order/create-order`
- Bybit V5 API key information: `https://bybit-exchange.github.io/docs/v5/user/apikey-info`
- Bybit V5 private order stream: `https://bybit-exchange.github.io/docs/v5/websocket/private/order`

These docs must be re-checked in Stage 15H because exchange order, permission, testnet, websocket, rate-limit, and error semantics can change.

## 1. Live Scope Decision

The first live path must be TradeHub-published trade instructions only.

An influencer publishes a structured TradeHub signal. TradeHub validates that instruction, derives eligible student-specific live intents, and a future server-side worker submits orders only for those approved intents. The influencer does not choose individual student execution paths; Stage 16 entitlements, student consent, connection health, risk limits, and live beta controls decide the route.

External master-account order ingestion is explicitly deferred. It requires private exchange stream ingestion, fill deduplication, position matching, latency handling, partial-fill reconciliation, cancel collision handling, and stronger incident semantics. It should not be the first live beta.

## 2. Roles And Approval Gates

Student:

- Can request live Auto-Copy, accept live risk terms, connect a production Binance/Bybit key, set live limits, pause live execution, and revoke live consent.
- Cannot enable live execution alone.
- Cannot bypass entitlement, subscription, risk posture, allowlist, kill switch, or permission checks.

Influencer/workspace owner:

- Can publish TradeHub trade instructions.
- Can request workspace live beta review and pause workspace execution.
- Can see workspace-level support-safe execution outcomes.
- Cannot see API keys, secrets, credential refs, balances, raw exchange payloads, or private account details.

Super Admin:

- Owns platform live beta enablement, workspace allowlist, student allowlist, exchange allowlist, symbol allowlist, notional caps, kill switches, incident controls, and production rollout approvals.
- Can run future sandbox/testnet worker controls in 15H and production controls only in a later approved production beta stage.

System worker:

- Can process only live intents whose status and gate snapshot prove they passed every server-side check.
- Must be server-only, idempotent, bounded, auditable, and kill-switch aware.

Required approval gates before a live intent can become executable:

- Platform live beta enabled.
- Workspace live beta enabled and workspace vetting approved.
- Student explicitly re-consented for live trading.
- Student is allowlisted for live beta.
- Exchange and environment are allowlisted.
- Symbol is allowlisted.
- Per-order, daily, and open exposure caps pass.
- Platform/workspace/student/symbol/exchange kill switches are off.
- Subscription and Stage 16 entitlement allow Auto-Copy.

## 3. Student Live Consent

Paper consent must never imply live consent. Live consent is a separate record and UI action.

Required live consent fields:

- `workspaceId`, `studentId`, `consentVersion`, `acceptedAt`.
- `source`: `student_app`.
- Safe request metadata if already available: hashed IP, user agent family, device label, Firebase UID, and app version. Do not store raw fingerprints if the app has no policy cover for them.
- Confirmations:
  - The connected account is the student's personal exchange account.
  - The account is not funded, prop-firm, copy-trading pool, or third-party-managed capital.
  - Withdrawals are disabled on the connected API key.
  - Live orders can lose money.
  - Price, fill, latency, profit, and availability are not guaranteed.
  - TradeHub does not custody funds.
- `revokedAt`, `revokedBy`, `studentPausedLive`, `studentPausedLiveAt`.

Live consent expires or becomes stale when the risk disclosure version changes, the production connection rotates, the student's risk posture changes, the workspace is suspended, or the subscription becomes non-active.

## 4. Live Entitlement And Billing Gate

Live eligibility must preserve Stage 16:

- Active paid subscription. Trial access should be paper-only unless Super Admin explicitly allows live trial beta for a tiny internal test.
- Auto-Copy tier entitlement is `allowed`.
- Risk posture is `personal_account`.
- No past-due, cancelled, expired, or unknown subscription block.
- No funded-account or prop-firm posture.
- Workspace is approved and not suspended.
- Platform, workspace, and student are live-beta allowlisted.
- Safe production exchange connection exists.

Paystack remains the default payment rail. Solana remains optional checkout/settlement and is separate from exchange trading. Solana wallet state must not be used as exchange authority.

## 5. Live Intent State Machine

Live statuses are proposed only. They must not be added to runtime types until Stage 15H implements sandbox/testnet behavior.

The proposed live state machine is documented in `prompt/15G-live-execution-state-machine.md`.

Paper statuses remain separate:

- `ready_for_paper`, `queued_paper`, and `completed_paper` are paper-only.
- A paper intent cannot be upgraded in-place into a live intent.
- Live intents should use a separate mode, separate idempotency namespace, and separate gate snapshot.

## 6. Order Sizing Rules

First production beta recommendation:

- Spot only.
- No leverage, no margin borrowing, no derivatives.
- Quote asset limited to USDT first.
- Default sizing should be fixed notional or low percent-balance, not full risk-per-trade automation.
- Hard caps should be lower than student-configured values when platform beta caps are stricter.

Sizing rules:

- Fixed notional: e.g. `10-50 USDT` per signal in the first production beta.
- Percent balance: optional later; cap at a low percentage and use fresh balance snapshots.
- Risk-per-trade: defer until reliable live balance, fill, open-order, and stop-loss semantics are reconciled.
- Min notional: enforce exchange symbol filters before submission.
- Max notional: enforce per order, per symbol, per student, per workspace, and platform-wide.
- Daily max notional: rolling UTC day cap per student and workspace.
- Max open orders: count open TradeHub-originated orders plus recent unknown states.
- Max open symbol exposure: block repeated same-symbol exposure unless signal explicitly closes or reduces.
- Max failed attempts: auto-pause student live execution after a small threshold, such as 3 failures in 24 hours.
- Precision and step size: fetch and cache exchange instrument filters; round down quantities and reject if rounding would violate notional or risk intent.
- Insufficient balance: no retry unless a fresh balance later proves sufficient; alert student with a safe message.

## 7. Supported Order Types

Stage 15H should test a minimal sandbox/testnet surface:

- Spot market buy using quote quantity where supported.
- Spot limit order with explicit price and quantity.
- No leverage or margin.
- No derivatives.
- No automatic TP/SL exchange orders in the first testnet worker unless both exchanges are normalized safely.

TP/SL recommendation:

- Stage 15H should record intended TP/SL in the live intent but not place attached TP/SL orders by default.
- TradeHub-managed follow-up orders require reconciliation, cancel collision handling, and position/exposure tracking, so they should be a later prompt.
- Exchange-native OCO/TP/SL support can be evaluated after the basic order lifecycle is proven on both exchanges.

## 8. Exchange Connection Requirements

Production live connection must be separate from sandbox/testnet connection.

Requirements:

- Production key verified separately against the production environment.
- Withdrawals confirmed disabled.
- Trading permission confirmed present.
- Permission shape must be understood; ambiguous responses fail closed.
- Fresh verification timestamp, recommended max age 24 hours for production live.
- IP restrictions recommended where feasible and visible as support-safe metadata.
- Testnet/sandbox and production credential refs must not be interchangeable.
- Secret refs, encrypted blobs, API keys, signatures, and raw exchange responses remain server-only.

Binance design notes:

- Permission verification should use the signed API key permission endpoint and require `enableWithdrawals === false`.
- For spot MVP, require spot trading permission and treat margin/futures/options permissions as a warning or blocker depending on beta policy.

Bybit design notes:

- API key info includes read/write posture, permission groups, IP binding metadata, and expiry metadata.
- Require spot trade permission, reject read-only keys for live trading, reject wallet/withdrawal-like permissions, and fail closed on unparseable permission shapes.

## 9. Idempotency And Duplicate Prevention

Use deterministic identifiers:

- Live intent ID: `live_{workspaceId}_{signalId}_{studentId}_{connectionId}_{signalVersionHash}`.
- Risk decision ID: `risk_{liveIntentId}`.
- Order attempt ID: `attempt_{liveIntentId}_{attemptNumber}`.
- Exchange client order ID: short deterministic ID per exchange limit, e.g. `thl_{base32Hash(intentId_attempt)}`.

Rules:

- Repeated signal publish/update events must not create duplicate live intents for the same student, connection, and signal version.
- Worker transaction must claim the intent before submitting to the exchange.
- Worker rerun must check for an existing order attempt with an exchange client order ID before submission.
- If the process crashes after exchange submission but before Firestore write, reconciliation must query by exchange client order ID before retrying.
- Duplicate client order ID errors should trigger reconciliation, not blind retry.

## 10. Cancellation And Emergency Stop

Kill switches:

- Platform kill switch: blocks new live intents, stops worker claims, and queues cancel-open-orders review for active live orders.
- Workspace kill switch: same at workspace scope.
- Student pause: blocks new live intents and worker processing for that student.
- Symbol pause: blocks new orders for one symbol and marks pending intents blocked.
- Exchange pause: blocks one exchange if its API, status, or rate limits degrade.

Cancel workflow:

- `cancel_requested` can be created by student pause/revoke, workspace owner pause, Super Admin action, signal cancellation, expiry, or incident automation.
- `cancel_submitted` means an exchange cancel request was sent.
- `cancelled_live` is terminal only after exchange confirmation or reconciliation proves no open order remains.
- If an order fills while cancellation is in flight, record the fill and raise `reconcile_required`.

Emergency runbook:

1. Enable platform or workspace kill switch.
2. Stop live worker claims.
3. Snapshot open intents and submitted attempts.
4. Submit bounded cancel requests for open orders.
5. Reconcile every unknown or in-flight order.
6. Notify affected students with support-safe copy.
7. Preserve audit trail and incident record.

## 11. Reconciliation And Monitoring

Reconciliation must exist before production:

- Query submitted attempts by bounded status windows.
- Prefer exchange order/user-data streams for real-time updates, with REST status checks as fallback.
- Record fills, partial fills, rejections, expirations, cancel states, unknown states, and exchange-side timestamps.
- Never store raw exchange payloads in public summaries; keep sanitized snapshots only.

Cadence:

- Immediate reconciliation after submit.
- Short polling for `submitting_live` and `submitted_live`, e.g. every 15-60 seconds in sandbox/testnet.
- Daily sweep for stale or unknown attempts.

Dashboards:

- Student: personal live status, safe order history, failure reason, pause/revoke controls.
- Influencer: workspace counts and signal execution summary without balances or credentials.
- Super Admin: open live queue, failures, stale reconciliation, exchange health, cancel controls, kill switches, and incident trail.

Alerts:

- Unknown exchange response.
- Worker crash during submit window.
- Duplicate client order ID.
- Permission revoked.
- Spike in rejects, timeouts, rate limits, or insufficient balance.
- Any open order after emergency stop SLA.

## 12. Failure Handling

- Exchange timeout: mark `reconcile_required`; query by client order ID before retry.
- Network failure before submit certainty: retry only if no attempt was acknowledged and no matching client order ID is found.
- Rate limit: exponential backoff, reduce worker concurrency, pause exchange if sustained.
- Insufficient balance: non-retryable until balance changes; notify student and optionally auto-pause.
- Invalid symbol: non-retryable; block symbol/workspace until fixed.
- Precision or lot-size error: non-retryable for that attempt; update symbol filter cache.
- Market unavailable: retry only if exchange indicates transient maintenance; otherwise block.
- Permission revoked or key deleted: disable connection, revoke live readiness, notify student.
- Account restricted: pause student live execution and escalate.
- Duplicate client order ID: reconcile by client order ID.
- Unknown exchange response: `reconcile_required`, no duplicate retry.
- Worker crash after exchange submission: reconciliation must recover by client order ID before another submit.
- Firestore write failure after exchange submission: incident severity high; reconciliation must recreate support-safe attempt record from exchange status.

## 13. Firestore And API Migration Plan

Proposed protected records for later implementation:

```text
/platform_live_execution_controls/current
/workspaces/{workspaceId}/live_execution_controls/current
/workspaces/{workspaceId}/students/{studentId}/live_consents/current
/workspaces/{workspaceId}/students/{studentId}/live_execution_preferences/current
/workspaces/{workspaceId}/live_execution_intents/{intentId}
/workspaces/{workspaceId}/live_order_attempts/{attemptId}
/workspaces/{workspaceId}/live_reconciliation_records/{recordId}
/workspaces/{workspaceId}/live_incidents/{incidentId}
/workspaces/{workspaceId}/live_allowlists/{documentId}
```

Rules:

- Client Firestore read/write remains denied.
- API routes use Admin SDK only.
- New indexes must be bounded around `status`, `updatedAt`, `studentId`, `signalId`, and `exchange`.
- Avoid collection-group production scans for live workers; process one workspace or queue shard at a time.

## 14. UI And Ops Plan

Student:

- Show live eligibility and every missing gate.
- Separate paper consent from live consent.
- Show production exchange connection status and last verification time.
- Show live risk limits and current pause/revoke state.
- Show live order history with sanitized status and failure messages.
- Never show secrets, credential refs, raw payloads, signatures, or balances unless a separate privacy-approved balance feature is designed.

Influencer:

- Show workspace live beta status.
- Show eligible, blocked, paused, failed, and filled counts.
- Show signal-level execution summary.
- Do not show private student account balances or credential details.

Super Admin:

- Manage platform/workspace/student/exchange/symbol live gates.
- Manage allowlists and max notional caps.
- Run sandbox/testnet worker controls in 15H.
- Inspect reconciliation queue, incidents, audit events, and bounded previews.
- Run emergency stop and cancel-open-orders workflows.

## 15. Legal, Risk, And Product Copy

Required copy themes:

- Live trading can lose money.
- TradeHub does not custody funds.
- Exchange API withdrawals must be disabled.
- Students remain responsible for their connected exchange accounts.
- Funded-account and prop-firm accounts are not eligible.
- Live Auto-Copy can be paused or revoked.
- No execution price, fill, latency, profit, or availability is guaranteed.
- Exchange outages, rate limits, account restrictions, insufficient balances, and API changes can prevent execution.

Avoid marketing claims. Keep the language operational and plain.

## 16. Stage 15H Acceptance Criteria

Stage 15H must prove sandbox/testnet only:

- Binance sandbox/testnet order is submitted and reconciled.
- Bybit testnet order is submitted and reconciled.
- Duplicate worker runs do not duplicate exchange orders.
- Kill switch blocks future orders before submit.
- Cancel path works in sandbox/testnet.
- Reconciliation updates submitted, filled, partial, rejected, expired, and unknown states.
- Failure cases are safe and support-safe.
- No secrets leak into UI, logs, audit payloads, or API responses.
- Firestore rules deny client access to new protected live collections.
- Funded/prop-firm students remain blocked.
- Live status is unavailable without explicit live consent and allowlist.

## Deferred To Later Prompts

- Stage 15H: sandbox/testnet live order worker only.
- Stage 15I: production live beta gate.
- Later: exchange-native TP/SL/OCO, external master trader order ingestion, forex, MT4, MT5, cTrader, FX Blue, and production reconciliation scale-out.
