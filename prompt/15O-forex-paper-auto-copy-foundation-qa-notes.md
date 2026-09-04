# Prompt 15O - Forex Paper Auto-Copy Foundation QA Notes

Stage 15O adds a forex paper-only Auto-Copy lane using the shared Stage 15N preference, consent, execution-mode, sizing, and stale-signal foundation.

## Implemented

- Protected forex paper records:
  - `/workspaces/{workspaceId}/forex_paper_intents/{intentId}`
  - `/workspaces/{workspaceId}/forex_paper_attempts/{attemptId}`
  - `/workspaces/{workspaceId}/forex_risk_decisions/{decisionId}`
  - `/workspaces/{workspaceId}/forex_execution_audit_events/{eventId}`
- Newly published valid forex signals route through bounded server-side paper evaluation.
- Stage 16 Auto-Copy entitlement remains the access gate.
- Funded-account, prop-firm, paused, revoked, alerts-only, stale-expired, unentitled, or risk-blocked students do not receive forex paper intents.
- `full_auto` creates `ready_for_forex_paper` intents.
- `confirm_before_execute` creates protected confirmation records instead of direct paper attempts.
- Stale-signal policy can route normally, require confirmation, or expire/skip.
- Super Admin-only forex paper worker records simulated attempts and marks intents `completed_forex_paper`.
- Student, influencer, and Super Admin surfaces show bounded support-safe forex paper previews.

## Safety Boundary

- Forex remains paper-only.
- No MetaAPI token storage was added.
- No broker credential collection was added.
- No Telegram ingestion runtime was added.
- No broker, demo, or live forex order is called.
- No real production crypto order was placed.
- No credential refs, vault refs, API keys, API secrets, MetaAPI tokens, raw balances, broker payloads, raw exchange payloads, or full order IDs are exposed to student or influencer surfaces.

## Protected Paths

Client SDK access remains denied for:

- `/workspaces/{workspaceId}/forex_paper_intents/{intentId}`
- `/workspaces/{workspaceId}/forex_paper_attempts/{attemptId}`
- `/workspaces/{workspaceId}/forex_risk_decisions/{decisionId}`
- `/workspaces/{workspaceId}/forex_execution_audit_events/{eventId}`
- `/workspaces/{workspaceId}/auto_copy_confirmations/{confirmationId}`
- `/workspaces/{workspaceId}/stale_signal_decisions/{decisionId}`
- `/workspaces/{workspaceId}/students/{studentId}/auto_copy_preferences/{market}`

All protected reads/writes remain routed through server-side Admin SDK API routes.

## QA Command

```bash
npm run stage15o:qa
```

The QA script verifies the forex paper model, strict market-aware signal validation, Stage 16 entitlement/risk/stale/confirmation routing hooks, paper-only worker boundary, UI copy, Firestore-denied paths, indexes, and absence of client-side MetaAPI/broker/exchange execution imports.

## Manual QA

Use the Stage 15F emulator fixtures and sign in through the existing local auth flow.

- Student: open `/app/copier`, switch Auto-Copy controls to Forex, choose full-auto or confirm-before-execute, save, and confirm the page says forex is paper simulation only.
- Influencer: open `/workspace`, publish a valid forex signal such as `EURUSD` with valid levels, and confirm publish review shows forex paper simulation posture.
- Super Admin: open `/admin`, load workspace `ws_stage15f_paper_beta`, run `Run forex paper`, and confirm simulated attempts appear without broker/MetaAPI credentials.

## Deferred

- MetaAPI trade execution and broker account execution.
- Live or demo forex execution.
- Telegram signal ingestion and parser.
- Student confirmation action API and notification delivery.
- Exact broker lot-size calculation.
- FX Blue, cTrader, MT4, MT5, and prop-firm copying.
- Broad production crypto Auto-Copy.
- External master-trader exchange or broker ingestion.
