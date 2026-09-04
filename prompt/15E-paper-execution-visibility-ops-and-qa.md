# Prompt 15E - Paper Execution Visibility, Ops Controls, And QA Hardening

You are building **TradeHub Stage 15E**. Stages 01-14 produced the MVP-shaped product. Stage 16 was intentionally completed before Stage 15 and added server-trusted entitlement gating. Stage 15A added the crypto execution data model and server boundary. Stage 15B added student Binance/Bybit connection setup, permission verification, encrypted/fail-closed credential handling, and paper-mode preferences. Stage 15C added the crypto risk engine and signal routing into paper intents. Stage 15D added a super-admin-only paper worker that consumes `ready_for_paper` intents and creates paper order attempts only.

This prompt continues **Prompt 15** as a **crypto-first Auto-Copy execution foundation** before forex. Your job is to make the paper execution system visible, supportable, and manually QA-ready across student, influencer workspace, and Super Admin surfaces.

Do not add live trading. Do not call Binance/Bybit order endpoints. Do not add `ready_for_live`. Do not make `CRYPTO_EXECUTION_LIVE_ENABLED` effective. This stage is about paper execution observability, safe worker controls, bounded diagnostics, mature UI, and QA hardening.

---

## Current Verified State

The repo should already include Stage 15A-15D foundations:

- `src/types/crypto-execution.ts`
- `src/lib/crypto-execution/crypto-execution-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/credential-vault.ts`
- `src/lib/crypto-execution/crypto-risk-engine.ts`
- `src/lib/crypto-execution/crypto-signal-routing.ts`
- `src/lib/crypto-execution/crypto-execution-worker.ts`
- `src/lib/crypto-execution/exchanges/*`
- `src/app/api/student/crypto-execution/overview/route.ts`
- `src/app/api/student/crypto-execution/connections/route.ts`
- `src/app/api/student/crypto-execution/connections/[connectionId]/refresh/route.ts`
- `src/app/api/student/crypto-execution/connections/[connectionId]/disable/route.ts`
- `src/app/api/student/crypto-execution/preferences/route.ts`
- `src/app/api/workspace/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/worker/run/route.ts`
- updated student copier UI for Binance/Bybit connection and paper preferences
- updated workspace signal UI that reports paper routing summaries

The Stage 15C/15D safety patches must already be present:

- risk engine prefers sandbox/testnet verified connections while platform/workspace `sandboxOnly` is active;
- risk engine enforces `signal_directional_levels`;
- the worker queries `ready_for_paper`;
- the worker only processes intents with `paperTradingOnly: true`;
- non-paper or non-ready intents are skipped with a support-safe audit event;
- the worker no longer imports or calls `getExchangeOrderPlacementAdapter`;
- there is no `ready_for_live` intent status;
- current Stage 15 remains paper execution only.

Before editing, confirm those are still true. If any are false, patch them first.

---

## Read First

Before writing code, read these repository files:

- `plan.md`
- `prompt/promptsumary.md`
- `prompt/15A-crypto-auto-copy-data-model-and-server-boundary.md`
- `prompt/15B-student-binance-bybit-connection-and-permission-verification.md`
- `prompt/15C-risk-engine-and-signal-routing.md`
- `prompt/16-multi-tier-expansion-and-advanced-feature-gating.md`
- `files/tradehub-02-features.md`
- `files/tradehub-03-tech.md`
- `files/tradehub-07-security-review.md`
- `README.md`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/crypto-execution.ts`
- `src/types/entitlements.ts`
- `src/types/student-app.ts`
- `src/types/workspace-dashboard.ts`
- `src/lib/entitlements/student-entitlements.ts`
- `src/lib/crypto-execution/crypto-execution-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/crypto-risk-engine.ts`
- `src/lib/crypto-execution/crypto-signal-routing.ts`
- `src/lib/crypto-execution/crypto-execution-worker.ts`
- `src/app/api/student/crypto-execution/overview/route.ts`
- `src/app/api/workspace/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/worker/run/route.ts`
- `src/components/student-app/student-copier-client.tsx`
- `src/components/workspace/signal-management-section.tsx`
- `src/components/workspace/student-management-section.tsx`
- `src/app/(influencer)/workspace/workspace-page-client.tsx`
- `src/app/(super-admin)/admin/admin-page-client.tsx`
- `src/components/admin/*`
- `src/app/globals.css`

Treat `src/types/entitlements.ts` and `src/lib/entitlements/student-entitlements.ts` as the entitlement source of truth.

Treat `files/tradehub-02-features.md` and `files/tradehub-07-security-review.md` as product/security source of truth for the Signal Alerts vs Auto-Copy split, kill switches, broker credential safety, and support visibility.

---

## Stage Goal

At the end of Stage 15E:

- students can see their paper Auto-Copy readiness, recent paper intents, paper order attempts, blocked reasons, and pause state without seeing secrets;
- influencers can see workspace-level paper routing outcomes, student copier readiness, blocked counts, completed paper attempts, and recent signal delivery/execution results;
- Super Admin can inspect platform-wide crypto execution health, run the paper worker for a specific workspace, see bounded worker results, and review support-safe execution audit events;
- all execution-related list panels show a bounded preview, defaulting to at most 4 visible rows, with internal panel scrolling instead of making the whole page grow endlessly;
- long emails, payment IDs, wallet addresses, exchange connection IDs, signal IDs, intent IDs, and order attempt IDs stay inside their containers;
- no raw secrets, credential refs, encrypted blobs, signed payloads, or raw exchange responses are exposed;
- Firestore rules remain deny-by-default for protected execution data;
- Stage 16 entitlement logic remains the authority for Auto-Copy access;
- Stage 15 remains paper-only.

---

## What This Stage Should NOT Do

Do **not**:

- place live Binance or Bybit orders;
- call `/api/v3/order`, `/v5/order/create`, `placeBinanceOrder`, or `placeBybitOrder`;
- add `ready_for_live`, live queue handling, live order attempts, live sizing, or reconciliation against real exchange orders;
- make `CRYPTO_EXECUTION_LIVE_ENABLED` activate live execution;
- add forex, FX Blue, cTrader, MT4, or MT5 execution logic;
- allow funded-account or prop-firm students to become Auto-Copy executable;
- bypass Stage 16 entitlement checks;
- bypass Stage 15B permission checks;
- expose API keys, API secrets, credential references, encrypted secret refs, raw exchange payloads, signatures, or service-account details;
- weaken Firestore rules;
- add client Firestore reads or writes for protected execution collections;
- run unbounded collection scans;
- turn support diagnostics into influencer/student-visible secret or ops data.

This is a **paper visibility and operations prompt**, not a live exchange execution prompt.

---

## Product And Security Truths To Preserve

### Execution Truth

- Stage 15E observes paper execution only.
- `ready_for_paper` plus `paperTradingOnly: true` is the only worker-consumable state.
- Paper order attempts represent simulated execution outcomes, not exchange order placement.
- Worker controls belong to Super Admin only.

### Entitlement Truth

- `autoCopy` access must come from `resolveStudentEntitlements`.
- Funded-account, prop-firm, unentitled, inactive, trial-blocked, paused, or alerts-only students must remain Signal Alerts only where applicable.
- UI can explain why Auto-Copy is unavailable, but must not infer access from client-only data.

### Support Truth

- Support users need enough context to debug:
  - student display name or email when available;
  - workspace and tier;
  - signal pair/direction/status;
  - intent status;
  - paper order attempt status;
  - risk decision result;
  - sanitized failure code and safe message;
  - timestamps.
- Support users must not see:
  - exchange API keys;
  - exchange API secrets;
  - credential refs;
  - encrypted blobs;
  - raw exchange responses;
  - signed payloads;
  - private service-account material.

### UI Truth

- TradeHub should feel like a serious creator operations dashboard.
- Lists that can accumulate should not make the whole website scroll forever.
- Each list panel should show 4 rows by default and scroll internally when there are more.
- Use mature dense layouts, clear headers, aligned metadata, safe wrapping, and empty/loading/error states.
- Avoid cramped pills, ultra-narrow badges, and text escaping borders.

---

## Required Architecture

Keep the protected server shape:

```text
Student / Influencer / Super Admin UI
  -> Firebase Auth ID token
  -> role-scoped Next.js API route
  -> Firebase Admin SDK verifies actor and workspace scope
  -> server repository reads bounded execution collections
  -> mappers redact and summarize support-safe data
  -> UI renders bounded lists and diagnostics
```

Do not move execution authority or protected reads into the browser.

---

## Implementation Requirements

### 1. Extend Safe Types And Mappers

Extend `src/types/crypto-execution.ts` only as needed with support-safe summaries, for example:

- `CryptoExecutionIntentSummary`
- `CryptoOrderAttemptSummary`
- `CryptoRiskDecisionSummary`
- `CryptoExecutionAuditEventSummary`
- student/workspace/admin paper execution history response shapes
- worker run request/response UI summary shape, if missing

Do not include secret-bearing fields.

Mapper requirements:

- Redact by construction, not by UI convention.
- Normalize unknown/missing timestamps.
- Normalize unknown/missing IDs to support-safe strings.
- Include bounded flags when list limits are reached.
- Include warnings when records are missing expected joins.

### 2. Add Bounded Repository Reads

In `src/lib/crypto-execution/crypto-execution-repository.ts` or a focused new server-only module, add bounded read helpers for:

- student paper execution history;
- workspace paper execution operations summary;
- admin paper execution operations summary;
- recent execution audit events;
- recent paper order attempts;
- recent risk decisions;
- recent intents by status.

Hard requirements:

- Default visible list size should be 4.
- API read limit may be slightly larger for pagination or "recent" context, but keep it bounded.
- No unbounded scans across all workspaces, all students, or all execution collections.
- Prefer direct workspace-scoped paths and collection group queries only if indexes/rules are clear and safe.
- If a compound index is needed, update `firestore.indexes.json`.
- Keep protected Firestore rules deny-by-default for client access.

Suggested paths already in use:

```text
/workspaces/{workspaceId}/execution_intents/{intentId}
/workspaces/{workspaceId}/order_attempts/{orderAttemptId}
/workspaces/{workspaceId}/risk_decisions/{decisionId}
/workspaces/{workspaceId}/execution_audit_events/{eventId}
/workspaces/{workspaceId}/students/{studentId}/exchange_connections/{connectionId}
/workspaces/{workspaceId}/students/{studentId}/execution_preferences/current
/workspaces/{workspaceId}/execution_controls/current
/platform_execution_controls/current
```

### 3. Student Copier Visibility

Update the student copier surface and/or student crypto execution overview route so an eligible student can see:

- readiness state;
- active/paper-only mode;
- pause/resume state;
- verified exchange connection summaries;
- recent paper intents;
- recent paper order attempts;
- recent risk-blocked reasons;
- last paper worker result if relevant and support-safe;
- clear empty state when no signal has routed yet.

UI requirements:

- Show at most 4 recent rows per section before internal scrolling.
- Long IDs and symbols must wrap or truncate safely.
- No secrets or credential refs.
- Funded-account or alerts-only students should see locked reasons and no credential/order details beyond their own safe state.

Likely files:

- `src/app/api/student/crypto-execution/overview/route.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/components/student-app/student-copier-client.tsx`
- `src/app/(student)/app/copier/page.tsx`

### 4. Influencer Workspace Visibility

Update the influencer workspace crypto execution view so the educator can see workspace-scoped paper execution operations:

- paper routing totals;
- ready/completed/expired/blocked counts;
- student copier readiness counts;
- recent paper attempts;
- recent risk-blocked decisions;
- recent routed signals and intent counts;
- student names/emails where already available and workspace-scoped;
- tier, rail, entitlement posture, and risk posture when safe;
- empty states when no routed crypto signal exists.

Important:

- Influencer should not see raw exchange secrets, credential refs, raw adapter errors, or super-admin-only diagnostics.
- Influencer can see support-safe student/payment/course context only for their workspace.
- Lists should be bounded and internally scrollable.
- Keep the mature spacious workspace layout improvements from prior dashboard work.

Likely files:

- `src/app/api/workspace/crypto-execution/overview/route.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/app/(influencer)/workspace/workspace-page-client.tsx`
- `src/components/workspace/signal-management-section.tsx`
- `src/components/workspace/student-management-section.tsx`
- optional new `src/components/workspace/crypto-execution-ops-section.tsx`

### 5. Super Admin Ops Panel

Add or improve a Super Admin crypto execution operations panel.

It should show:

- platform control state;
- workspace execution health sample;
- ready-for-paper count;
- completed paper count;
- risk-blocked count;
- recent paper worker run results;
- recent execution audit events;
- recent failed/skipped paper intents;
- exchange adapter readiness metadata, but not secrets;
- a workspace ID input or workspace selector for running the paper worker;
- a guarded "Run paper worker" action that calls `POST /api/admin/crypto-execution/worker/run`.

Worker run control requirements:

- Super Admin only.
- Require explicit workspace ID.
- Default limit must stay bounded by server limit.
- Show safe success/failure summary after a run.
- Do not auto-run on page load.
- Do not add a cron, queue, or live worker.
- Do not expose service account or credential details.

Likely files:

- `src/app/api/admin/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/worker/run/route.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/app/(super-admin)/admin/admin-page-client.tsx`
- optional new `src/components/admin/crypto-execution-ops-panel.tsx`

### 6. Internal Scrolling For Accumulating Lists

Apply the list behavior across execution and admin/workspace sections that can accumulate, including but not limited to:

- execution audit events;
- paper intents;
- order attempts;
- risk decisions;
- worker run results;
- application pipeline;
- audit preview;
- payment operations previews;
- settlement previews;
- student lists;
- signal lists;
- course lists.

Rules:

- Show 4 visible rows by default.
- If more rows exist, the list container scrolls internally.
- The whole page should not become the scroll container for every accumulated list.
- Do not hide important empty/error/loading states.
- Do not make badges or buttons ultra-narrow.
- Use `minmax`, `min-width`, `overflow-wrap:anywhere`, `word-break`, `text-overflow`, `line-clamp`, or internal scroll utilities where appropriate.
- Keep mobile gutters comfortable.
- Avoid nested-card clutter.

Likely files:

- `src/app/globals.css`
- `src/components/admin/application-pipeline.tsx`
- `src/components/admin/audit-log-preview.tsx`
- `src/components/admin/paystack-payment-ops.tsx`
- `src/components/admin/solana-settlement-ledger.tsx`
- `src/components/workspace/student-management-section.tsx`
- `src/components/workspace/course-visibility-section.tsx`
- `src/components/workspace/signal-management-section.tsx`
- `src/components/student-app/student-copier-client.tsx`

### 7. Optional Adapter Split Cleanup

If low-risk, split permission adapter exports from order-placement adapter exports so permission-only repository paths do not import the order-placement functions through a shared index.

Acceptable approaches:

- keep `src/lib/crypto-execution/exchanges/index.ts` permission-only for Stage 15E;
- move order placement exports to `src/lib/crypto-execution/exchanges/order-placement.ts`;
- or remove order placement exports until a later approved live stage.

Do not break typecheck. Do not remove code that the current tests/build require unless you update imports safely.

Acceptance:

- `crypto-execution-repository.ts` only imports permission-check adapters.
- paper worker does not import order-placement adapters.
- no client module imports order-placement adapters.

### 8. Manual QA Seed Notes

Add a short QA note either in the prompt response or a small docs file if the repo already has a suitable docs area. The note should cover:

- Paystack/entitlement active student with paper opt-in;
- verified sandbox Binance connection;
- verified sandbox Bybit connection;
- newer production connection plus older sandbox connection while sandbox-only is active;
- published crypto buy signal with valid levels;
- published crypto sell signal with valid levels;
- invalid directional levels blocked;
- funded-account student remains alerts-only;
- paused student blocked;
- workspace kill switch blocks;
- platform kill switch blocks;
- paper worker creates paper attempt and marks intent `completed_paper`;
- non-paper intent with `ready_for_paper` is skipped, not executed;
- Super Admin worker run requires workspace ID and shows bounded result.

Do not add fake secrets to docs.

---

## API Response Requirements

All new or extended API responses must be:

- support-safe;
- bounded;
- role-scoped;
- workspace-scoped where applicable;
- free of secrets and credential refs;
- explicit about warnings and missing joins;
- clear about paper-only state.

Do not return:

- raw exchange payloads;
- API keys;
- API secrets;
- credential ref paths;
- encrypted secret refs;
- signed request data;
- service-account values;
- raw Firebase Admin errors.

---

## Acceptance Criteria

Stage 15E is complete when:

- Student copier view shows recent paper execution history and blocked reasons safely.
- Influencer workspace view shows paper routing and paper execution operations for its workspace only.
- Super Admin view can run the bounded paper worker for a workspace and inspect safe results.
- Accumulating list panels show 4 visible rows with internal scrolling when more exist.
- Long IDs/emails/handles/symbols stay inside borders across mobile and desktop.
- No pending live execution path is added.
- `ready_for_live` has no matches.
- `ready_for_paper` is only used for paper-only handling.
- Worker still cannot call Binance/Bybit order endpoints.
- Firestore rules are not weakened.
- Stage 16 entitlement checks remain intact.

---

## Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run firebase:rules:test
```

Run scans:

```bash
rg -n "ready_for_live|ready_for_paper|paperTradingOnly|completed_paper|queued_paper" src/lib/crypto-execution src/types/crypto-execution.ts src/app
rg -n "placeBinanceOrder|placeBybitOrder|getExchangeOrderPlacementAdapter|/api/v3/order|/v5/order/create" src api
rg -n "credentialRefPath|encryptedSecretRef|apiSecret|apiKey|serviceAccount|private_key" src/app src/components src/lib/crypto-execution
```

Expected scan posture:

- `ready_for_live` has no matches.
- `ready_for_paper` routes into paper-only worker handling.
- order placement functions are not imported by the worker or client code.
- secret-name matches, if any, are restricted to server-only vault, adapter, validation, or one-time credential form state.
- no UI response or audit payload exposes secrets or credential refs.

---

## Final Response Required From Builder

When finished, report:

- exact files changed;
- what student, influencer, and Super Admin can now see;
- how accumulating lists are bounded and scrolled;
- what payment/execution/credential records remain hidden;
- whether order-placement adapter exports were split or left as-is, and why;
- verification results for typecheck, lint, build, and rules test;
- scan results for live execution and secret exposure;
- manual QA checklist status.

If manual QA cannot be fully run because seeded Firebase data or real exchange sandbox credentials are missing, say that directly and list the exact scenarios still needing data.
