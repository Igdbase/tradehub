# Stage 15G - Live Execution State Machine

This state machine is a proposal for future live execution. Do not add these statuses to runtime TypeScript until Stage 15H implements sandbox/testnet behavior.

## State Namespaces

Paper states remain unchanged and separate:

- `created`
- `risk_blocked`
- `ready_for_paper`
- `queued_paper`
- `completed_paper`
- `cancelled`
- `expired`

Future live states use a live-specific namespace and should live on live-specific records or live-specific fields:

- `proposed_live`
- `blocked_live`
- `ready_for_live`
- `queued_live`
- `submitting_live`
- `submitted_live`
- `partially_filled_live`
- `filled_live`
- `rejected_live`
- `cancel_requested`
- `cancel_submitted`
- `cancelled_live`
- `expired_live`
- `reconcile_required`
- `failed_live`

## Actor Permissions

System routing:

- May create `proposed_live`, `blocked_live`, and `ready_for_live`.
- Must include a risk decision and gate snapshot.

System worker:

- May move `ready_for_live` to `queued_live`, `submitting_live`, `submitted_live`, `partially_filled_live`, `filled_live`, `rejected_live`, `reconcile_required`, `failed_live`, `cancel_submitted`, and `cancelled_live`.
- Must be server-only, bounded, idempotent, and kill-switch aware.

Student:

- May request live consent, pause, revoke consent, and request cancellation where product policy allows.
- Does not directly write intent status.

Influencer/workspace owner:

- May publish/cancel signals and enable workspace pause.
- Does not directly write per-student live status.

Super Admin:

- May enable/disable live gates, force block, force cancellation workflow, and close incidents.
- Does not bypass audit requirements.

## Preconditions

`proposed_live` requires:

- Published crypto signal.
- TradeHub-published instruction, not external master-account ingestion.
- Candidate student belongs to workspace.

`ready_for_live` requires:

- Stage 16 Auto-Copy entitlement allowed.
- Active paid subscription.
- Personal-account posture.
- Workspace approved.
- Platform/workspace/student live beta allowlisted.
- Live consent current and not revoked.
- Student live pause off.
- Platform/workspace/symbol/exchange kill switches off.
- Production exchange connection verified.
- Withdrawals confirmed disabled.
- Trading permission present.
- Permission verification fresh.
- Symbol allowlisted.
- Order sizing and notional caps passed.
- Idempotency keys derived.

`queued_live` requires:

- Worker has claimed the intent in a transaction.
- No existing non-terminal order attempt for the same exchange client order ID.
- No kill switch became active after readiness.

`submitting_live` requires:

- Credential was loaded server-side.
- Request built from normalized adapter input.
- Attempt record created with deterministic client order ID before or atomically with submission claim.

## Valid Transitions

```text
proposed_live
  -> blocked_live
  -> ready_for_live

ready_for_live
  -> queued_live
  -> expired_live
  -> blocked_live
  -> cancel_requested

queued_live
  -> submitting_live
  -> cancel_requested
  -> blocked_live

submitting_live
  -> submitted_live
  -> rejected_live
  -> reconcile_required
  -> failed_live

submitted_live
  -> partially_filled_live
  -> filled_live
  -> rejected_live
  -> expired_live
  -> cancel_requested
  -> reconcile_required
  -> failed_live

partially_filled_live
  -> filled_live
  -> cancel_requested
  -> cancel_submitted
  -> cancelled_live
  -> reconcile_required

cancel_requested
  -> cancel_submitted
  -> cancelled_live
  -> filled_live
  -> reconcile_required
  -> failed_live

cancel_submitted
  -> cancelled_live
  -> filled_live
  -> partially_filled_live
  -> reconcile_required

reconcile_required
  -> submitted_live
  -> partially_filled_live
  -> filled_live
  -> rejected_live
  -> cancelled_live
  -> expired_live
  -> failed_live
```

Invalid transitions:

- Paper states cannot transition into live states.
- `filled_live`, `cancelled_live`, `rejected_live`, `expired_live`, and non-retryable `failed_live` are terminal unless Super Admin opens a reconciliation correction record.
- `blocked_live` cannot become `ready_for_live` without a new full gate evaluation.

## Terminal States

Terminal success:

- `filled_live`
- `cancelled_live`

Terminal blocked/rejected:

- `blocked_live`
- `rejected_live`
- `expired_live`
- `failed_live` when non-retryable

Non-terminal investigation:

- `reconcile_required`
- `partially_filled_live`
- `cancel_requested`
- `cancel_submitted`

## Retry Semantics

Retryable after reconciliation:

- Network timeout where submission certainty is unknown.
- Exchange 5xx or temporary unavailable.
- Rate-limit response after backoff and concurrency reduction.
- Worker crash before exchange submission is proven.

Non-retryable without new student/operator action:

- Insufficient balance.
- Permission revoked.
- Key deleted.
- Withdrawal permission ambiguous or enabled.
- Invalid symbol.
- Precision/lot-size violation after fresh filters.
- Student consent revoked.
- Funded/prop-firm posture detected.
- Kill switch active.

Unknown submission:

- Move to `reconcile_required`.
- Query by exchange client order ID before any retry.
- Do not submit a second order while the first client order ID is unresolved.

## Cancel Semantics

Cancellation can be requested by:

- Student pause or revoke.
- Super Admin action.
- Workspace kill switch.
- Platform kill switch.
- Signal cancellation.
- Intent expiry.
- Exchange incident automation.

Cancel behavior:

- For intents before submission, transition directly to `cancelled_live`.
- For submitted/open attempts, write `cancel_requested`, then `cancel_submitted` after exchange cancel request.
- If the order fills while cancel is in flight, record fill and move to `filled_live` or `partially_filled_live` plus incident/audit context.
- If exchange cancel status is unknown, move to `reconcile_required`.

## Idempotency Keys

Live intent key:

```text
crypto-live-intent:{workspaceId}:{signalId}:{studentId}:{connectionId}:{signalVersionHash}
```

Order attempt key:

```text
crypto-live-attempt:{liveIntentId}:{attemptNumber}
```

Exchange client order ID:

```text
thl_{shortHash(liveIntentId + attemptNumber)}
```

Rules:

- Store the exchange client order ID before submission.
- Reuse the same client order ID for reconciliation of the same attempt.
- Never create a second attempt while a prior attempt is `submitting_live`, `submitted_live`, `partially_filled_live`, `cancel_requested`, `cancel_submitted`, or `reconcile_required`.

## Audit Events

Every transition writes a support-safe audit event:

- `live.intent.proposed`
- `live.intent.blocked`
- `live.intent.ready`
- `live.intent.queued`
- `live.order.submitting`
- `live.order.submitted`
- `live.order.partially_filled`
- `live.order.filled`
- `live.order.rejected`
- `live.cancel.requested`
- `live.cancel.submitted`
- `live.cancelled`
- `live.expired`
- `live.reconcile.required`
- `live.failed`

Audit payloads must never include API keys, secrets, signatures, credential refs, encrypted blobs, raw exchange responses, or service-account data.

## Paper Separation Rule

Stage 15H must prove that:

- The paper worker still queries only `ready_for_paper`.
- The live sandbox/testnet worker never queries paper statuses.
- Live statuses do not appear in client Firestore rules as readable records.
- Public UI can display support-safe live summaries only through API routes.
