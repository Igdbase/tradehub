# Prompt 15A - Crypto Auto-Copy Data Model And Server Boundary

You are building **TradeHub Stage 15A**. Stages 01-14 already created the MVP-shaped product: Next.js App Router, locked design system, Firebase auth and role routing, Super Admin CRM, influencer onboarding and workspace dashboards, Course Hub, student app shell, Paystack subscriptions, optional Solana Pay / USDC checkout, payment operations, journal/trust-safety hardening, policy pages, and launch cleanup.

Stage 16 was intentionally completed before Stage 15. It added the server-trusted multi-tier entitlement model that Stage 15 must now reuse. Do not weaken or bypass that entitlement logic.

This prompt starts **Prompt 15**, but it is **crypto-first before forex**. The original roadmap called Prompt 15 "Forex Auto-Copy integrations"; the current product plan supersedes that ordering for this build: Binance and Bybit personal crypto exchange accounts are the clearest automation rails, so crypto Auto-Copy is being pulled forward first. Forex paths such as FX Blue, cTrader, MT4, and MT5 remain later work.

Your job in this prompt is to create the **data model, TypeScript vocabulary, repository layer, mappers, validation helpers, Firestore rule/index posture, and API route boundaries** for crypto Auto-Copy.

Do not place live trades. Do not collect or store real exchange API secrets yet. Do not wire Binance or Bybit clients into UI flows. This is the durable foundation that later prompts will connect to exchange permission checks, risk routing, workers, and dashboards.

---

## Current Verified State

The repo already has:

- server-trusted student entitlement logic in `src/types/entitlements.ts` and `src/lib/entitlements/student-entitlements.ts`;
- student copier status as a safety/eligibility surface in `src/app/(student)/app/copier/page.tsx`, `src/components/student-app/student-copier-client.tsx`, and `src/app/api/student/copier/route.ts`;
- protected student data flowing through server-side Admin SDK repositories such as `src/lib/student-app/student-app-repository.ts`;
- protected workspace data flowing through server-side Admin SDK repositories such as `src/lib/workspace/dashboard-repository.ts`;
- Signal Alerts and Auto-Copy entitlement states already separated by tier and risk posture;
- Paystack as the default payment rail and Solana as an optional, separate checkout rail;
- early exchange idea files in `api/binance-client.js` and `api/bybit-client.js`.

Treat the current copier UI as **eligibility and safety posture only**. It must not become an exchange trading UI in this prompt.

Treat `api/binance-client.js` and `api/bybit-client.js` as future server-only adapter reference material. Do not import them into client components. Do not call `placeBinanceOrder` or `placeBybitOrder` in this prompt.

---

## Read First

Before writing code, read these repository files:

- `plan.md`
- `prompt/promptsumary.md`
- `prompt/16-multi-tier-expansion-and-advanced-feature-gating.md`
- `files/tradehub-02-features.md`
- `files/tradehub-03-tech.md`
- `files/tradehub-07-security-review.md`
- `README.md`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/entitlements.ts`
- `src/types/student-app.ts`
- `src/types/signals.ts`
- `src/types/workspace.ts`
- `src/types/workspace-dashboard.ts`
- `src/lib/entitlements/student-entitlements.ts`
- `src/lib/student-app/student-app-repository.ts`
- `src/lib/student-app/student-app-mappers.ts`
- `src/components/student-app/student-copier-client.tsx`
- `src/app/(student)/app/copier/page.tsx`
- `src/app/api/student/copier/route.ts`
- `src/app/(influencer)/workspace/workspace-page-client.tsx`
- `src/lib/workspace/dashboard-repository.ts`
- `src/lib/workspace/dashboard-mappers.ts`
- `src/lib/workspace/dashboard-validation.ts`
- `api/binance-client.js`
- `api/bybit-client.js`

Also check current official documentation before implementing if you add or reshape any framework-sensitive behavior:

- Next.js App Router route handlers
- Firebase Admin SDK and Firestore security rules
- Firestore index and collection-group query guidance
- Google Cloud KMS or Secret Manager guidance for the future encrypted-secret reference shape

Treat `files/tradehub-02-features.md`, `files/tradehub-03-tech.md`, and `files/tradehub-07-security-review.md` as product/security source of truth.

Treat `src/types/entitlements.ts` and `src/lib/entitlements/student-entitlements.ts` as the entitlement source of truth for Auto-Copy eligibility.

---

## Stage Goal

At the end of this stage, TradeHub has a safe crypto execution foundation without live trading:

- typed data models for Binance/Bybit exchange connection metadata;
- typed data models for credential metadata and future encrypted-secret references;
- typed data models for student execution preferences and pause state;
- typed data models for signal execution intents;
- typed data models for risk decisions;
- typed data models for order attempts;
- typed data models for execution audit events;
- typed data models for workspace and platform kill switches;
- server-only repositories and mappers that read/write those records through Firebase Admin SDK;
- API route boundaries that return safe, redacted, support-friendly metadata only;
- Firestore rules that keep credential and execution collections server-controlled;
- index additions only where bounded queries require them;
- clear verification that no live Binance/Bybit order placement exists yet.

This stage should make later prompts easier and safer. Prompt 15B can add the student connection and permission-verification flow. Prompt 15C can add risk routing. Prompt 15D can add the worker and order adapters. Prompt 15E can add dashboards and support visibility.

---

## What This Stage Should NOT Do

Do **not**:

- place live Binance or Bybit orders;
- call exchange order endpoints;
- collect exchange API keys in a browser form;
- store real exchange API keys or secrets;
- expose exchange credentials, secret references, signatures, request payloads, or raw exchange responses to clients;
- add browser-trusted Firestore reads or writes for protected execution data;
- weaken Firestore rules;
- bypass Firebase Admin SDK API routes;
- bypass or duplicate Stage 16 entitlement logic;
- allow funded-account or prop-firm students into executable Auto-Copy;
- add forex, FX Blue, cTrader, MT4, or MT5 integration;
- change Paystack or Solana payment behavior;
- implement a queue worker;
- fan out signal publishing into per-student execution in this prompt;
- add dashboards that imply live execution already works;
- create a fake "connected" state that suggests real exchange verification has happened.

This is a **schema and server-boundary prompt**, not a trading prompt.

---

## Core Product Truth To Preserve

### Entitlements

- Auto-Copy eligibility must come from server-trusted Stage 16 entitlements.
- `autoCopy` tier access is necessary but not sufficient for execution.
- A student also needs a personal-account risk posture, an opted-in execution preference, an accepted risk disclosure, healthy exchange connection metadata, no student pause, no workspace kill switch, and no platform kill switch.
- Funded-account and prop-firm students stay Signal Alerts only.

### Crypto Scope

- Stage 15A models Binance and Bybit personal exchange accounts only.
- Solana remains a payment rail only; it is not an exchange trading rail here.
- Forex integration stays deferred.

### Secrets

- Exchange API secrets must never enter client-trusted state except in a future one-time secure submit flow.
- Secrets must never be logged.
- Secrets must never be returned by API routes.
- Stage 15A should model encrypted-secret references and credential metadata, but should not implement real secret storage unless the repo already has a safe KMS-backed helper.
- If a placeholder secret path is required, store metadata only and name the future storage state honestly, such as `not_configured` or `pending_secure_storage`.

### Execution

- Signal publishing must not synchronously place orders.
- Later execution must happen through a server-side worker or queue.
- Every future order attempt must be idempotent, auditable, retry-aware, and kill-switch aware.
- Stage 15A only defines those records and safe server boundaries.

---

## Required Architecture

Keep the same protected route shape used by earlier stages:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls /api/student/*, /api/workspace/*, or /api/admin/*
  -> API route verifies token with Firebase Admin SDK
  -> route confirms role and workspace scope
  -> route resolves Stage 16 entitlements from trusted data
  -> route reads/writes execution records through Firebase Admin SDK only
  -> route returns redacted, support-safe metadata
```

Do not use localStorage, query params, client-only flags, or browser Firestore access as execution authority.

---

## Implementation Requirements

### 1. Add A Shared Crypto Execution Type Vocabulary

Create a focused type module, preferably:

- `src/types/crypto-execution.ts`

The exact naming can vary if the repo has a stronger convention, but keep it explicit and easy to discover.

Define types for at least:

- `CryptoExchangeId`: `binance | bybit`
- `CryptoExchangeEnvironment`: `sandbox | production`
- `CryptoExecutionAccountKind`: `personal_exchange`
- `ExchangeConnectionStatus`: `not_connected | pending_verification | verified | rejected | disabled | error`
- `CredentialStorageState`: `not_collected | metadata_only | pending_encrypted_storage | encrypted_reference_ready | rotation_required | revoked`
- `PermissionVerificationStatus`: `not_checked | passed | failed | stale`
- `WithdrawalPermissionState`: `unknown | confirmed_disabled | detected_enabled`
- `StudentExecutionOptInState`: `not_started | opted_in_paper | live_requested | live_enabled | paused | disabled`
- `ExecutionIntentStatus`: `created | risk_blocked | ready_for_paper | queued_paper | completed_paper | cancelled | expired`
- `OrderAttemptStatus`: `not_started | queued | sent | acknowledged | partially_filled | filled | failed | timed_out | cancelled | reconciled`
- `RiskDecisionStatus`: `allowed | blocked | requires_review`
- `ExecutionKillSwitchScope`: `platform | workspace | student`
- `ExecutionAuditAction` for connection, preference, intent, risk, order, retry, reconciliation, and kill-switch events

Model records for:

- `ExchangeConnectionRecord`
- `ExchangeCredentialMetadataRecord`
- `StudentExecutionPreferencesRecord`
- `SignalExecutionIntentRecord`
- `CryptoOrderAttemptRecord`
- `ExecutionRiskDecisionRecord`
- `ExecutionAuditEventRecord`
- `WorkspaceExecutionControlRecord`
- `PlatformExecutionControlRecord`

Every record should include enough identifiers for safe support/debugging:

- `workspaceId`
- `studentId` where applicable
- `connectionId` where applicable
- `signalId` where applicable
- `intentId` where applicable
- `orderAttemptId` where applicable
- timestamps such as `createdAt`, `updatedAt`, `verifiedAt`, `decidedAt`, `expiresAt`
- `createdBy` or `updatedBy` metadata where applicable

Do not include raw `apiKey`, raw `apiSecret`, signed URLs, HMAC signatures, private request bodies, or raw exchange error payloads in any client-facing type.

### 2. Define Firestore Collection Shape

Use a Firestore shape that keeps sensitive execution data server-controlled and queryable without broad scans.

Recommended shape:

```text
/workspaces/{workspaceId}/students/{studentId}/exchange_connections/{connectionId}
  exchange
  environment
  accountKind
  status
  connectionLabel
  credentialMetadataId
  credentialRefPath
  permissionVerification
  withdrawalPermission
  lastVerifiedAt
  lastHealthCheckAt
  disabledAt
  disabledReason
  createdAt
  updatedAt

/workspaces/{workspaceId}/students/{studentId}/execution_preferences/current
  optInState
  paperTradingOnly
  studentPaused
  studentPausedAt
  maxRiskPercentPerTrade
  maxDailyLossPercent
  maxOpenTrades
  allowedSymbols
  riskDisclosureAcceptedAt
  propFirmDisclosureAcceptedAt
  updatedAt
  updatedBy

/workspaces/{workspaceId}/execution_intents/{intentId}
  signalId
  studentId
  connectionId
  exchange
  market
  symbol
  side
  orderType
  status
  idempotencyKey
  sourceSignalVersion
  riskDecisionId
  paperTradingOnly
  createdAt
  updatedAt
  expiresAt

/workspaces/{workspaceId}/order_attempts/{orderAttemptId}
  intentId
  signalId
  studentId
  connectionId
  exchange
  status
  idempotencyKey
  attemptNumber
  exchangeOrderId
  exchangeClientOrderId
  sanitizedFailureCode
  sanitizedFailureReason
  requestedAt
  acknowledgedAt
  completedAt
  updatedAt

/workspaces/{workspaceId}/risk_decisions/{decisionId}
  intentId
  signalId
  studentId
  connectionId
  status
  checks
  blockedReason
  decidedAt
  decidedBy

/workspaces/{workspaceId}/execution_audit_events/{eventId}
  action
  actorType
  actorId
  workspaceId
  studentId
  targetType
  targetId
  before
  after
  safeMessage
  createdAt

/workspaces/{workspaceId}/execution_controls/current
  workspaceId
  killSwitchEnabled
  killSwitchReason
  pausedBy
  pausedAt
  resumedAt
  updatedAt

/platform_execution_controls/current
  killSwitchEnabled
  killSwitchReason
  pausedBy
  pausedAt
  resumedAt
  updatedAt

/broker_keys/{workspaceId}/students/{studentId}/connections/{connectionId}
  encryptedApiKey
  encryptedApiSecret
  encryptedDataKey
  kmsKeyVersion
  exchange
  createdAt
  rotatedAt
```

In Stage 15A, the `/broker_keys/.../connections/...` shape may be modeled in types and locked in rules, but it should not receive real secrets unless a real KMS-backed encryption helper already exists.

Prefer direct document reads and bounded list queries. Do not create a design that requires scanning all students for every dashboard load.

### 3. Add Server-Only Mappers And Repositories

Add a new server-side library area, preferably:

- `src/lib/crypto-execution/crypto-execution-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`

Use existing repository patterns from:

- `src/lib/student-app/student-app-repository.ts`
- `src/lib/workspace/dashboard-repository.ts`
- `src/lib/billing/billing-repository.ts`

Repository requirements:

- use `getFirebaseAdminClients()` only;
- verify student, influencer, or admin actor scope before accessing records;
- resolve Stage 16 student entitlements before returning execution readiness;
- return redacted metadata only;
- normalize missing documents into safe default states;
- avoid raw Firestore documents leaking directly into route responses;
- use bounded limits for list queries;
- include helpers to build stable IDs and idempotency keys for future worker use.

Suggested repository functions:

- `getStudentCryptoExecutionOverview(actor)`
- `getWorkspaceCryptoExecutionOverview(actor, options)`
- `getAdminCryptoExecutionOverview(actor, options)`
- `getStudentExecutionReadiness(actor)`
- `mapExchangeConnectionRecord(record, ids)`
- `mapStudentExecutionPreferencesRecord(record, ids)`
- `mapWorkspaceExecutionControlRecord(record, workspaceId)`
- `mapPlatformExecutionControlRecord(record)`
- `buildExecutionIntentId({ workspaceId, signalId, studentId, connectionId })`
- `buildOrderAttemptIdempotencyKey({ workspaceId, signalId, studentId, connectionId, intentId })`

Mutation helpers may be added for future use, but do not expose a live connection, key-submit, or order-placement flow in this prompt.

### 4. Add Safe API Route Boundaries

Add route handlers that prove the server boundary exists and return redacted setup/readiness metadata.

Recommended minimal routes:

- `src/app/api/student/crypto-execution/overview/route.ts`
- `src/app/api/workspace/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/overview/route.ts`

Each route should:

- verify the actor with the existing auth helper for that role;
- call a server-only repository;
- return `apiJson` or the repo's existing API response pattern;
- return no secrets and no exchange raw responses;
- include `ok: true`, source metadata/warnings if the local pattern uses it, and safe status fields.

Student response should include:

- entitlement state for Auto-Copy;
- risk posture;
- execution mode/readiness state;
- exchange connection metadata list;
- current preferences, if present;
- workspace/platform kill-switch state;
- paper-trading-only flag;
- explicit reasons when execution is unavailable.

Workspace response should include:

- workspace kill-switch state;
- counts or small bounded samples for connection statuses and execution readiness;
- warnings if summary docs are missing;
- no student secrets.

Admin response should include:

- platform kill-switch state;
- bounded workspace health samples or zero-safe placeholder counts;
- no secrets.

Do not add UI in this prompt unless a route needs a tiny existing client call adjustment to avoid broken imports. The dashboards come later.

### 5. Preserve Entitlement And Funded-Account Guardrails

Read execution readiness from:

- `resolveStudentEntitlements`
- `getFeatureEntitlement(entitlements, "autoCopy")`
- `riskPosture`
- subscription status
- workspace tier feature state

If Auto-Copy is not `allowed`, execution readiness must be blocked.

If `riskPosture` is `funded_account`, execution readiness must be alerts-only or blocked, even if the tier includes Auto-Copy.

If `riskPosture` is `unknown`, do not mark the student executable. Return a clear reason that personal-account status must be confirmed later.

Do not create new client-side tier checks that compete with Stage 16.

### 6. Add Firestore Rules For New Sensitive Paths

Update `firestore.rules` to keep new execution-sensitive paths server-controlled.

At minimum:

- deny all client reads/writes to `/broker_keys/{workspaceId}/students/{studentId}/connections/{connectionId}`;
- deny all client reads/writes to `/platform_execution_controls/{documentId}`;
- deny direct client writes to execution intent, order attempt, risk decision, audit event, and execution control documents;
- only allow client reads if the existing app intentionally exposes a safe document directly. Prefer denying direct reads and routing through Admin SDK APIs instead.

Given current TradeHub architecture, the safest default is:

```javascript
allow read, write: if false;
```

for all credential and execution-control collections, with API routes serving redacted views.

Do not broaden existing workspace/student rules while adding these paths.

### 7. Add Indexes Only When Needed

Update `firestore.indexes.json` only for queries this prompt actually introduces.

Likely bounded query shapes:

- workspace execution intents by `status` and `updatedAt`;
- workspace order attempts by `status` and `updatedAt`;
- student exchange connections by `status` and `updatedAt`;
- workspace audit events by `createdAt`.

Avoid speculative index sprawl. If you do not add a query, do not add its index.

### 8. Add Mock Or Empty-State Data Carefully

If the local UI needs data to avoid empty server responses, prefer zero-safe repository defaults over fake connected exchanges.

Allowed:

- `not_connected`
- `not_collected`
- `metadata_only`
- `paperTradingOnly: true`
- `killSwitchEnabled: false`
- warning strings that explain missing records

Not allowed:

- fake API key fingerprints that look real;
- fake verified Binance/Bybit accounts;
- fake live order attempts;
- fake exchange order IDs;
- UI copy that says trading is enabled.

### 9. Keep Old Exchange Client Files Quarantined

Do not delete `api/binance-client.js` or `api/bybit-client.js`.

Do not import them from client code.

Do not call their order placement functions.

If you reference them, add comments or docs that they are future server-only adapter material for Prompt 15B/15D.

If TypeScript code needs adapter interfaces in Stage 15A, define interfaces only. Leave real exchange implementation for later prompts.

---

## Suggested File Changes

Likely new files:

- `src/types/crypto-execution.ts`
- `src/lib/crypto-execution/crypto-execution-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/app/api/student/crypto-execution/overview/route.ts`
- `src/app/api/workspace/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/overview/route.ts`

Likely updated files:

- `firestore.rules`
- `firestore.indexes.json`, only if new queries require indexes
- `src/types/student-app.ts`, only if copier response types need safe readiness metadata
- `src/lib/student-app/student-app-repository.ts`, only if existing copier overview should include a safe pointer to crypto execution readiness
- `.env.example`, only if you add placeholder names for future KMS/secret configuration. Do not require real keys for this prompt.

Avoid broad UI edits in this stage.

---

## Security Requirements

- No exchange secrets in UI state, route responses, logs, analytics, warnings, audit event `before`/`after`, or thrown errors.
- No raw exchange responses in route responses.
- No browser Firestore access to protected execution data.
- No live exchange order call paths.
- No entitlement bypass.
- No funded-account execution path.
- No unbounded Firestore scans.
- No synchronous signal fan-out.
- No new public route that exposes workspace/student execution metadata.
- API responses must be redacted and support-safe.

---

## Manual QA Checklist

After implementation, verify:

- Student crypto execution overview returns a zero-safe `not_connected` or equivalent state for a student with no connection records.
- Student overview reports Auto-Copy blocked when Stage 16 entitlement says `locked_by_tier`, `locked_by_subscription`, `alerts_only`, or `feature_not_enabled`.
- Funded-account or prop-firm posture remains Signal Alerts only.
- Workspace crypto execution overview does not expose secrets.
- Admin crypto execution overview does not expose secrets.
- Firestore rules deny direct client access to broker/exchange credential paths.
- Firestore rules deny direct client writes to execution intent/order/risk/audit/control paths.
- `api/binance-client.js` and `api/bybit-client.js` are not imported by client components.
- No route calls `placeBinanceOrder` or `placeBybitOrder`.
- No browser UI says live trading is enabled.

---

## Verification Commands

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

If a Firestore rules test harness exists in the repo, also run it. If it does not exist, document that rules were updated but automated rules tests are still a follow-up.

Before closing, report:

- files added/changed;
- which API boundaries exist;
- whether any Firestore indexes were added and why;
- confirmation that no live exchange order placement was added;
- confirmation that Stage 16 entitlement logic remains the execution gate;
- verification command results.

---

## Completion Bar

This prompt is complete only when the repo has a durable, typed, server-only crypto execution foundation and the builder can honestly say:

> Prompt 15A added the Binance/Bybit Auto-Copy data model and protected server boundary. It does not collect exchange secrets, verify API keys, route published signals into execution, or place live orders yet.
