# Prompt 15Q - Forex Demo Execution Proof QA Notes

Stage 15Q adds a MetaAPI demo-only proof lane for forex Auto-Copy.

## Implemented

- Protected forex demo records:
  - `/platform_forex_demo_controls/current`
  - `/workspaces/{workspaceId}/forex_demo_controls/current`
  - `/workspaces/{workspaceId}/forex_demo_intents/{intentId}`
  - `/workspaces/{workspaceId}/forex_demo_order_attempts/{attemptId}`
  - `/workspaces/{workspaceId}/forex_demo_reconciliation_records/{recordId}`
  - `/workspaces/{workspaceId}/forex_demo_gate_decisions/{decisionId}`
  - `/workspaces/{workspaceId}/forex_demo_audit_events/{eventId}`
- Server-only MetaAPI demo trade adapter seam.
- Forex demo routing for newly published valid forex signals.
- Super Admin-only forex demo worker, reconciliation, and cancellation routes.
- Student, influencer, and Super Admin support-safe demo previews.
- Firestore rules denial and ordered query indexes for the demo paths.

## Default Safety

- `FOREX_EXECUTION_DEMO_ENABLED=false`
- `FOREX_EXECUTION_DEMO_ORDER_CALLS_ENABLED=false`
- `FOREX_EXECUTION_DEMO_DRY_RUN=true`
- Worker requires typed confirmation: `RUN_FOREX_DEMO`
- Cancel requires typed confirmation: `CANCEL_FOREX_DEMO`
- Mock MetaAPI metadata-only connections cannot be executed.
- Production MetaAPI connections are rejected by the demo worker.
- Production/live forex remains unavailable.

## Commands

```bash
npm run stage15q:qa
npm run firebase:rules:test
npm run typecheck
npm run lint
npm run build
```

If the Firestore emulator wrapper cannot start because port `8080` is already in use:

```bash
env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore-rules-stage15f.test.mjs
```

## Optional MetaAPI Demo Manual QA

Run only after explicit owner approval and with a dedicated MetaAPI demo account:

1. Store a demo MetaAPI connection for an entitled personal-account student.
2. Enable env gates:
   - `FOREX_EXECUTION_DEMO_ENABLED=true`
   - `FOREX_EXECUTION_DEMO_ORDER_CALLS_ENABLED=true`
   - `FOREX_EXECUTION_DEMO_DRY_RUN=false`
3. Enable platform/workspace forex demo controls.
4. Publish a valid forex signal such as `EURUSD buy` with TP above entry and SL below entry.
5. In Super Admin, load the workspace and type `RUN_FOREX_DEMO`.
6. Run the forex demo worker.
7. Run forex demo reconciliation.
8. Capture the TradeHub masked provider ref and MetaAPI-side demo account evidence.

Never use a production broker account for Stage 15Q.

## Visible vs Hidden

Student and influencer previews may show:

- Pair, side, status, dry-run/demo label, small volume/notional, timestamps, masked provider refs, safe failure codes/messages.

Hidden from all client-facing surfaces:

- MetaAPI token, token vault refs, provider account ID, raw broker payloads, raw balances, signatures, service-account material, and full provider order IDs.

## Deferred

- Production/live forex execution.
- MetaAPI production order placement.
- Telegram ingestion runtime.
- External master-trader ingestion.
- Broker password collection.
