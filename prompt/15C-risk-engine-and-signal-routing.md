# Prompt 15C - Crypto Risk Engine And Signal Routing

You are building **TradeHub Stage 15C**. Stages 01-14 produced the MVP-shaped product. Stage 16 was intentionally completed before Stage 15 and added server-trusted entitlement gating. Stage 15A added the crypto execution data model and server boundary. Stage 15B added student Binance/Bybit connection setup, permission verification, encrypted/fail-closed credential handling, and paper-mode preferences.

This prompt continues **Prompt 15** as a **crypto-first Auto-Copy execution foundation** before forex. Your job is to add the risk engine and signal routing layer.

When an influencer publishes a **crypto** signal, TradeHub should decide which students would receive a paper Auto-Copy execution intent and why. Eligible personal exchange students with verified Binance/Bybit metadata can receive paper execution intents. Funded-account, alerts-only, unentitled, paused, unconnected, or risk-blocked students must not receive executable intents.

Do not place live trades. Do not call Binance/Bybit order endpoints. Do not add a worker or queue that sends orders. Do not create real exchange order attempts. This prompt creates idempotent **paper execution intents**, **risk decisions**, and **support-safe audit events** only.

---

## Current Verified State

The repo should already include Stage 15A and 15B foundations:

- `src/types/crypto-execution.ts`
- `src/lib/crypto-execution/crypto-execution-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/credential-vault.ts`
- `src/lib/crypto-execution/exchanges/*`
- `src/app/api/student/crypto-execution/overview/route.ts`
- `src/app/api/student/crypto-execution/connections/route.ts`
- `src/app/api/student/crypto-execution/connections/[connectionId]/refresh/route.ts`
- `src/app/api/student/crypto-execution/connections/[connectionId]/disable/route.ts`
- `src/app/api/student/crypto-execution/preferences/route.ts`
- `src/app/api/workspace/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/overview/route.ts`
- updated student copier UI for Binance/Bybit connection and paper preferences

The Stage 15B patch should already be present:

- sandbox/testnet is the default student connection environment;
- production exchange keys are blocked while platform or workspace `sandboxOnly` is active;
- invalid or missing `environment` fails validation instead of becoming `production`;
- no live order placement exists.

Preserve all of that.

---

## Read First

Before writing code, read these repository files:

- `plan.md`
- `prompt/promptsumary.md`
- `prompt/15A-crypto-auto-copy-data-model-and-server-boundary.md`
- `prompt/15B-student-binance-bybit-connection-and-permission-verification.md`
- `prompt/16-multi-tier-expansion-and-advanced-feature-gating.md`
- `files/tradehub-02-features.md`
- `files/tradehub-03-tech.md`
- `files/tradehub-07-security-review.md`
- `README.md`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/crypto-execution.ts`
- `src/types/entitlements.ts`
- `src/types/workspace-dashboard.ts`
- `src/lib/entitlements/student-entitlements.ts`
- `src/lib/crypto-execution/crypto-execution-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/credential-vault.ts`
- `src/lib/workspace/dashboard-repository.ts`
- `src/lib/workspace/dashboard-validation.ts`
- `src/lib/workspace/dashboard-mappers.ts`
- `src/app/api/workspace/signals/route.ts`
- `src/app/api/workspace/signals/[signalId]/route.ts`
- `src/components/workspace/signal-management-section.tsx`
- `src/components/student-app/student-copier-client.tsx`
- `api/binance-client.js`
- `api/bybit-client.js`

Treat `src/types/entitlements.ts` and `src/lib/entitlements/student-entitlements.ts` as the entitlement source of truth.

Treat `files/tradehub-02-features.md` and `files/tradehub-07-security-review.md` as product/security source of truth for the Signal Alerts vs Auto-Copy split, kill switches, and broker credential safety.

---

## Stage Goal

At the end of Stage 15C:

- publishing a crypto signal can trigger bounded server-side paper-routing;
- draft signals do not create execution intents;
- forex signals do not create crypto execution intents;
- cancelled signals do not create new execution intents;
- already-published signals do not duplicate intents on repeated publish actions;
- eligible personal exchange students receive idempotent paper execution intents;
- every candidate student gets a support-safe risk decision, or at minimum every intent candidate gets a decision explaining allowed/blocked state;
- funded-account and alerts-only students stay Signal Alerts only;
- student pause, workspace kill switch, platform kill switch, sandbox-only controls, missing connection, stale permissions, withdrawal risk, symbol allowlist, and risk settings are enforced before an intent becomes `ready_for_paper`;
- workspace/admin/student overview responses can show summary counts for paper routing without exposing secrets;
- no live exchange order is sent;
- no worker or queue sends orders;
- no `CryptoOrderAttemptRecord` is created for real exchange execution in this prompt.

---

## What This Stage Should NOT Do

Do **not**:

- place live Binance or Bybit orders;
- call `/api/v3/order`, `/v5/order/create`, `placeBinanceOrder`, or `placeBybitOrder`;
- add an execution worker that sends exchange orders;
- create real order attempts;
- add forex, FX Blue, cTrader, MT4, or MT5 routing;
- let funded-account or prop-firm students receive Auto-Copy execution intents;
- bypass Stage 16 entitlement checks;
- bypass Stage 15B exchange permission checks;
- expose exchange secrets, credential refs, signed payloads, encrypted blobs, or raw exchange responses;
- weaken Firestore rules;
- add client Firestore reads/writes for protected execution data;
- run unbounded scans across all students or all execution collections;
- silently pretend all students were processed if the bounded routing window was reached.

This is a **paper intent and risk decision prompt**, not an exchange execution prompt.

---

## Product And Security Truths To Preserve

### Signal Routing Truth

- One influencer signal can produce two paths:
  - Auto-Copy paper intent for eligible personal exchange students.
  - Signal Alert visibility only for funded, alerts-only, unentitled, paused, unconnected, or blocked students.
- The influencer should not manually decide each student path.
- A crypto signal only routes crypto exchange intents.
- Forex signal routing remains later work.

### Entitlement Truth

- `autoCopy` feature access must come from `resolveStudentEntitlements`.
- Tier access alone is not enough.
- Student risk posture must be `personal_account`.
- Subscription state must be active enough for Auto-Copy according to Stage 16.
- Funded-account and prop-firm students must remain alerts-only.

### Connection Truth

- A student needs a verified Binance/Bybit connection.
- The connection must have `permissionVerification: "passed"`.
- The connection must have `withdrawalPermission: "confirmed_disabled"`.
- Disabled, rejected, stale, unknown, or errored connections are not executable.
- Production connections should still not become live execution while platform/workspace sandbox controls are active.

### Risk Truth

- A risk decision should explain why an intent was allowed or blocked.
- Risk checks must be deterministic, support-safe, and auditable.
- A later worker should be able to consume only `ready_for_paper` intents without re-deriving basic eligibility from scratch.

---

## Required Architecture

Keep the protected server shape:

```text
Influencer publishes signal
  -> /api/workspace/signals verifies influencer with Firebase Admin SDK
  -> workspace signal repository validates and writes signal
  -> if signal is newly published and market is crypto:
       server-side routing evaluates bounded student candidates
       Stage 16 entitlements are resolved per candidate
       Stage 15B connection/preferences/readiness are checked
       risk decision is written
       idempotent paper execution intent is written only when allowed
       support-safe audit event is written
  -> response includes safe routing summary
```

Do not move execution authority to the browser.

---

## Implementation Requirements

### 1. Extend Crypto Execution Types

Extend `src/types/crypto-execution.ts` only as needed.

Likely additions:

- `CryptoSignalRoutingSummary`
- `CryptoSignalRoutingResult`
- `CryptoRiskCheckKey`
- optional execution intent/risk decision response summaries

Keep all new response types support-safe.

Do not include:

- API key;
- API secret;
- credential ref path;
- encrypted secret reference;
- raw exchange response;
- signed request payload.

### 2. Add Risk Evaluation Helpers

Create a focused server-side module such as:

- `src/lib/crypto-execution/crypto-risk-engine.ts`

The risk engine should evaluate a published workspace signal plus one student candidate.

Required checks:

- signal is `published`;
- signal `market` is `crypto`;
- signal has entry, take-profit, and stop-loss;
- signal pair/symbol can be normalized to the same format used in student `allowedSymbols`;
- Stage 16 Auto-Copy entitlement access is `allowed`;
- student risk posture is `personal_account`;
- student preference is opted into paper mode, not disabled and not paused;
- workspace kill switch is off;
- platform kill switch is off;
- workspace/platform sandbox-only state is respected;
- verified exchange connection exists;
- connection permission check passed;
- withdrawals confirmed disabled;
- connection not disabled/rejected/error;
- symbol allowlist permits the signal if the student configured an allowlist;
- max risk per trade is within server-bounded preference limits;
- max open trades and daily loss checks are represented in the decision, even if Stage 15C can only mark them as `requires_review` or conservative `allowed` because no fills/order ledger exists yet.

Use `ExecutionRiskCheck[]` and `ExecutionRiskDecisionRecord` style data already defined in Stage 15A.

Fail closed when data is missing or ambiguous.

### 3. Add Signal Routing Repository Functions

Add server-only functions under `src/lib/crypto-execution`, for example:

- `routePublishedCryptoSignalForPaperExecution`
- `evaluateCryptoSignalCandidate`
- `buildCryptoSignalRoutingSummary`

Inputs should include:

- verified influencer actor;
- newly saved `WorkspaceSignalRecord`;
- previous signal status if patching an existing signal;
- routing reason such as `created_published` or `patched_published`.

Routing should run only when:

- signal market is `crypto`;
- signal status is `published`;
- the signal was newly published in this mutation, not already published before the request.

Draft saves should return an empty/no-op routing summary.

Cancelled signals should not create new intents. If cancelled signal handling needs to affect existing intents, only mark it as a later prompt unless it can be done safely without worker/order behavior.

### 4. Candidate Student Selection

Select candidate students from the workspace using bounded reads.

Requirements:

- Do not scan unbounded collections.
- Use a clear limit constant, such as `CRYPTO_ROUTING_CANDIDATE_LIMIT`.
- Prefer students that could plausibly be eligible, but do not rely on client-trusted fields.
- For each candidate, read only the trusted documents needed:
  - student record;
  - subscription/current;
  - execution_preferences/current;
  - exchange_connections, bounded and sorted/filtered safely;
  - workspace/platform execution controls.
- If the bounded candidate limit is reached, return and/or persist a warning that routing was bounded.

This local implementation can be free-tier-friendly and bounded. A later scale prompt can move large routing into Cloud Tasks.

### 5. Intent Creation

For each allowed candidate, create or merge a `SignalExecutionIntentRecord`.

Requirements:

- Use deterministic/idempotent IDs. Prefer the existing `buildExecutionIntentId`.
- Use deterministic idempotency keys for future worker consumption.
- Store under:

```text
/workspaces/{workspaceId}/execution_intents/{intentId}
```

or an existing Stage 15A path if already chosen.

Intent status:

- `ready_for_paper` when all required checks pass.
- `risk_blocked` only if you intentionally store blocked intents. Otherwise blocked students can have only risk decisions.

Intent must include:

- workspaceId;
- signalId;
- studentId;
- connectionId;
- exchange;
- market: `crypto`;
- symbol;
- side;
- orderType;
- idempotencyKey;
- paperTradingOnly: true;
- entitlement snapshot;
- riskDecisionId;
- createdAt;
- updatedAt;
- expiresAt if useful.

Do not set `paperTradingOnly: false` in Stage 15C.

Do not create `CryptoOrderAttemptRecord` except perhaps a non-execution placeholder is already part of the Stage 15A vocabulary. Prefer no order attempts until 15D.

### 6. Risk Decision Records

Write risk decision records under:

```text
/workspaces/{workspaceId}/risk_decisions/{decisionId}
```

Requirements:

- Use deterministic IDs where possible, such as `risk_{intentId}` or `risk_{signalId}_{studentId}_{connectionId}`.
- Store all check results.
- Store `status: "allowed"` only when an intent is created as `ready_for_paper`.
- Store `status: "blocked"` for clear blockers.
- Store `status: "requires_review"` only when the system cannot safely decide but wants to preserve a support trace.
- Never include secrets or raw exchange responses.

### 7. Audit Events

Write support-safe audit events for:

- routing started;
- intent created;
- risk blocked;
- routing bounded;
- routing completed.

If the existing `ExecutionAuditAction` union needs additional action values, add them explicitly.

Audit events must not include:

- API keys;
- secrets;
- credential refs;
- encrypted blobs;
- signatures;
- raw exchange responses.

### 8. Hook Into Workspace Signal Publish

Update `src/lib/workspace/dashboard-repository.ts` carefully.

Hook routing after a signal is successfully written or in the same batch if practical.

Cases:

- `createWorkspaceSignal` with `publish: true` and `market: "crypto"` should trigger routing.
- `patchWorkspaceSignal` where previous status was not `published` and next status is `published` and market is `crypto` should trigger routing.
- Saving a draft should not route.
- Publishing a forex signal should not route crypto intents.
- Re-saving an already published signal should not duplicate intents.
- Cancelling should not create new intents.

Make the response include a safe optional routing summary if it fits the existing API response shape. If adding to `WorkspaceSignalMutationResponse`, keep it optional and support-safe.

### 9. Workspace/Admin/Student Overview Summary

Enhance crypto execution overview summaries enough for operators to see that routing exists.

Possible additions:

- recent paper intents count;
- risk blocked count;
- ready-for-paper count;
- last routed signal timestamp;
- bounded routing warning count.

Keep reads bounded.

Do not add huge dashboards in this prompt.

### 10. Firestore Rules And Indexes

Keep client access denied.

If new collections or paths are added, add explicit deny rules.

If compound queries are needed, add minimal indexes to `firestore.indexes.json`. Prefer direct document IDs and bounded simple reads where possible.

Do not weaken the final deny rule.

### 11. UI Touches

Keep UI work small.

Allowed:

- show a safe routing summary after publishing a crypto signal;
- show small workspace/admin/student counts if already easy from overview APIs;
- show that paper routing happened and live execution is still deferred.

Not allowed:

- live order buttons;
- worker controls;
- manual “execute now” buttons;
- exchange order history that implies real orders were sent.

---

## Acceptance Criteria

### Routing Trigger

- Creating a draft signal creates no execution intents.
- Publishing a forex signal creates no crypto execution intents.
- Publishing a crypto signal triggers bounded paper routing.
- Publishing an already-published signal again does not duplicate intents.
- Cancelling a signal creates no new intents.

### Eligibility

- Auto-Copy entitled personal-account students with verified Binance/Bybit connection metadata can receive paper intents.
- Funded-account students remain Signal Alerts only.
- Alerts-only students do not receive execution intents.
- Students without active enough subscription/entitlement do not receive execution intents.
- Paused students do not receive execution intents.
- Workspace/platform kill switches block intent creation.
- Missing/stale/failed exchange permission checks block intent creation.
- Withdrawal-enabled or unknown withdrawal state blocks intent creation.

### Risk Decisions

- Each created intent has an allowed risk decision.
- Blocked candidates produce support-safe blocked decisions or a bounded blocked summary.
- Risk decisions explain the checks that passed or failed.
- No secrets or raw exchange payloads appear in decisions or audit events.

### Idempotency

- Re-running the same publish path does not duplicate intents.
- Intent IDs and idempotency keys are deterministic.
- Existing allowed intents are merged or left stable safely.

### Execution Boundary

- No Binance/Bybit order endpoints are called.
- No live order placement code is imported into app/lib routes.
- No real order attempts are created.
- All intents are `paperTradingOnly: true`.

---

## Verification Required

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run firebase:rules:test
```

If `npm run firebase:rules:test` still only echoes the existing placeholder, report that exactly.

Also run code scans:

```bash
rg -n "placeBinanceOrder|placeBybitOrder|/api/v3/order|/v5/order/create" src
rg -n "apiSecret|apiKey|credentialRefPath|encryptedSecretRef|ciphertext|authTag|signature" src/app src/components src/types src/lib/crypto-execution
```

Interpret the second scan carefully: secret field names may exist in server-only validation/adapters/vault code, but must not appear in client response types, UI output, audit payloads, or workspace/admin/student public summaries.

Manual QA checklist:

- publish a crypto draft as draft: no intents;
- publish a crypto signal with no eligible students: routing summary shows zero allowed;
- publish a crypto signal with an eligible sandbox-connected student: one `ready_for_paper` intent and one allowed risk decision;
- publish with student paused: blocked/no intent;
- publish with workspace kill switch enabled: blocked/no intent;
- publish with funded-account student: alerts-only/no intent;
- republish or patch an already-published signal: no duplicate intent;
- verify student/workspace/admin APIs never return secret refs or raw exchange data.

---

## Final Response Requirements

When finished, report:

- exact files changed;
- where routing hooks were added;
- Firestore paths used for intents, risk decisions, and audit events;
- the bounded candidate limit;
- what creates an intent vs what blocks one;
- how idempotency is guaranteed;
- what is still deferred to 15D;
- confirmation that no live order placement was added;
- verification results for typecheck, lint, build, and rules test;
- manual QA checklist results or blockers.
