# Prompt 15P - Forex Broker / MetaAPI Connection Foundation QA Notes

Stage 15P adds a forex broker connection readiness foundation for future MetaAPI execution work.

## Implemented

- Student API routes:
  - `POST /api/student/forex-execution/connections`
  - `POST /api/student/forex-execution/connections/[connectionId]/refresh`
  - `POST /api/student/forex-execution/connections/[connectionId]/disable`
- Server-only MetaAPI metadata verification facade.
- Server-only forex token vault helpers:
  - `storeForexMetaApiToken`
  - `loadForexMetaApiToken`
  - `revokeForexMetaApiToken`
- Protected forex connection metadata:
  - `/workspaces/{workspaceId}/students/{studentId}/forex_connections/{connectionId}`
  - `/workspaces/{workspaceId}/forex_connection_audit_events/{eventId}`
  - `/broker_keys/{workspaceId}/students/{studentId}/forex_connections/{connectionId}`
- Student, influencer, and Super Admin support-safe forex connection readiness previews.

## MetaAPI Boundary

The adapter verifies account metadata only using MetaAPI's account-read boundary. It does not call trade, order, position sizing, broker balance, or Telegram ingestion paths.

Automated QA can use explicit local mock mode:

```bash
FOREX_EXECUTION_MOCK_METAAPI=true
```

Mock mode records metadata-only readiness and never stores a real token. Production token storage remains fail-closed unless the existing production vault/Secret Manager configuration is ready.

## Safety Boundary

- Forex remains paper/simulation-only.
- No demo forex order was added.
- No live forex order was added.
- No MetaAPI trade endpoint was added.
- No broker password field was added.
- No Telegram ingestion runtime was added.
- No raw MetaAPI token, vault ref, credential ref, broker account ID, raw provider response, raw balance, or broker payload is returned to student/influencer UI.

## QA Command

```bash
npm run stage15p:qa
```

The QA script verifies route presence, server-only vault usage, metadata-only adapter behavior, Stage 16 entitlement gating, protected Firestore paths, UI copy, and absence of client-side broker execution imports.

## Manual QA

1. Start emulators and dev app with Stage 15 fixtures.
2. Sign in as an Auto-Copy-entitled personal-account student.
3. Open `/app/copier`.
4. In the Forex Connection section, submit a mock MetaAPI connection only with `FOREX_EXECUTION_MOCK_METAAPI=true`.
5. Confirm the page shows safe provider/environment/status/readiness metadata.
6. Confirm the token field clears after submit and the token is not displayed.
7. Refresh and disable the connection.
8. Open `/workspace` and confirm only readiness counts/status appear.
9. Open `/admin`, load the workspace, and confirm support-safe connection audit appears.

## Deferred

- MetaAPI trade execution.
- Broker demo/live orders.
- Broker password collection.
- Exact forex lot-size execution.
- Telegram signal ingestion runtime.
- Student confirmation action delivery.
- External master-trader ingestion.
