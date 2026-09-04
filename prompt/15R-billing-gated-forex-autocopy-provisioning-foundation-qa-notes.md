# Prompt 15R - Billing-Gated Forex AutoCopy Provisioning Foundation QA Notes

Stage 15R realigns Forex AutoCopy with the approved billing architecture.

## Implemented

- Student-facing Forex AutoCopy setup now asks for MT4/MT5 broker details only after paid Forex AutoCopy is active.
- Normal student flow no longer asks for MetaAPI token, MetaAPI account ID, or vault references.
- Broker provisioning writes protected mock/dry-run records only:
  - `/workspaces/{workspaceId}/students/{studentId}/forex_provisioning/current`
  - `/workspaces/{workspaceId}/students/{studentId}/forex_provisioning_requests/{requestId}`
  - `/workspaces/{workspaceId}/forex_provisioned_accounts/{accountId}`
  - `/workspaces/{workspaceId}/forex_provisioning_audit_events/{eventId}`
- The mock provider does not call MetaAPI account creation, terminal deploy, demo order, or live order APIs.
- Broker passwords are accepted only for the one-time server request and are discarded in mock dry-run mode.
- Forex demo proof from 15Q now requires paid Forex AutoCopy provisioning before a ready demo intent or worker attempt can proceed.

## Billing Gate

Broker provisioning requires:

- authenticated student actor;
- workspace-scoped student record;
- Stage 16 Auto-Copy entitlement allowed;
- personal-account posture;
- active paid Forex AutoCopy subscription marker at `/students/{studentId}/forex_autocopy_subscriptions/current`;
- not trial-only, past-due, cancelled, expired, funded, or prop-firm;
- platform/workspace kill switches off.

## Hidden From Student And Influencer UI

- MetaAPI token;
- MetaAPI account ID;
- broker password after submit;
- credential refs;
- vault refs;
- raw broker server/login;
- raw provider payloads;
- broker balances;
- demo/live order controls.

## QA

Run:

```bash
npm run stage15r:qa
```

The QA script verifies the billing gate, productized MT4/MT5 form, mock-only provisioning repository, protected Firestore paths, demo worker provisioning guard, and absence of client-side broker execution authority.

## Still Deferred

- Real MetaAPI account creation.
- MetaAPI cloud terminal deploy.
- Broker demo/live execution for broad users.
- Telegram ingestion runtime.
- Forex live execution.
