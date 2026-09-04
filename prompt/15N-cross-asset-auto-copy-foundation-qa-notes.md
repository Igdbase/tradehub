# Prompt 15N - Cross-Asset Auto-Copy Foundation QA Notes

Stage 15N adds a shared Auto-Copy foundation across crypto and future forex without adding live forex execution, Telegram ingestion, or broad production trading.

## Implemented

- Shared cross-asset preference vocabulary for `crypto` and `forex`.
- Student-owned execution mode:
  - `full_auto`
  - `confirm_before_execute`
  - `alerts_only`
- Shared consent state:
  - `missing`
  - `accepted`
  - `paused`
  - `revoked`
- Shared sizing and risk controls:
  - `fixed_notional`
  - `risk_percent`
  - max risk per trade
  - max fixed notional
  - max daily loss
  - max open trades
  - allowed crypto symbols or forex pairs
- Stale signal policy:
  - expire after a bounded age
  - require student confirmation when stale
  - allow until manual cancel
- Confirmation foundation records for crypto when a student requires confirmation.
- Stale signal decision records for support-safe routing traces.
- Student UI controls for cross-asset Auto-Copy settings.
- Influencer publish review counts for full-auto, confirmation-required, alerts-only, and blocked shared preference posture.
- Explicit Firestore deny rules and rules-test coverage for shared Auto-Copy internals.

## Safety Boundary

- Existing crypto paper/testnet/production-gated paths remain in place.
- Confirm-before-execute prevents direct live intent creation.
- Stale-signal policy is enforced server-side before paper/testnet/production-gated routing creates execution-facing records.
- Forex preferences can be saved/read. Stage 15O later allows forex paper simulation, while live/demo broker execution remains deferred.
- No MetaAPI order execution was added.
- No Telegram ingestion runtime was added.
- No production crypto order was placed.
- No credential refs, vault refs, API keys, API secrets, raw balances, raw broker/exchange payloads, or full exchange order IDs are exposed to student or influencer surfaces.

## Protected Paths

Client SDK access remains denied for:

- `/workspaces/{workspaceId}/students/{studentId}/auto_copy_preferences/{market}`
- `/workspaces/{workspaceId}/auto_copy_confirmations/{confirmationId}`
- `/workspaces/{workspaceId}/stale_signal_decisions/{decisionId}`
- `/workspaces/{workspaceId}/auto_copy_audit_events/{eventId}`

All writes are expected to go through server-side Admin SDK API routes.

## QA Command

```bash
npm run stage15n:qa
```

The QA script verifies shared types, server-only preference writes, confirmation/stale routing behavior, sandbox/production gate checks, UI copy, Firestore-denied paths, and absence of client-side exchange/MetaAPI execution imports.

## Verification Result

Automated checks run during implementation:

- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run build` - passed.
- `npm run stage15n:qa` - passed.
- `npm run stage15l:qa` - passed.
- `npm run stage15m:qa` - passed.
- `npm run firebase:rules:test` - passed using the Firebase emulator wrapper.
- A seeded emulator sweep for `stage15f:qa`, `stage15h:qa`, `stage15i:qa`, `stage15j:qa`, and `stage15k:qa` passed after running deterministic Stage 15F/15H/15I seeds inside `firebase emulators:exec`.

Initial direct emulator-backed QA attempts from the sandbox failed with local `127.0.0.1:8080` connection restrictions or no active emulator. The passing run used the Firebase emulator wrapper to start and stop a temporary local emulator.

## Deferred

- MetaAPI forex credential/token connection.
- Live or demo forex execution.
- Telegram signal ingestion and parser.
- Student confirmation notifications.
- Confirmation action API and expiry worker.
- Broad production crypto Auto-Copy.
- External master-trader exchange account ingestion.
