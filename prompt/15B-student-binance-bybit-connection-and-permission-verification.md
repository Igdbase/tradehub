# Prompt 15B - Student Binance/Bybit Connection And Permission Verification

You are building **TradeHub Stage 15B**. Stages 01-14 produced the MVP-shaped product. Stage 16 was intentionally completed before Stage 15 and added the server-trusted entitlement model. Stage 15A then added the crypto execution vocabulary, server-only repository/read boundaries, overview routes, and Firestore-denied execution collections.

This prompt continues **Prompt 15** as a **crypto-first Auto-Copy execution foundation** before forex. Your job is to build the student Binance/Bybit connection flow and permission verification layer.

Do not place live trades. Do not create signal fan-out. Do not add execution workers. Do not call Binance/Bybit order endpoints. This prompt only lets an eligible student submit a Binance/Bybit personal exchange key for server-side permission verification, stores no plaintext secrets, records support-safe connection metadata, and lets the student manage paper-mode preferences and pause state.

---

## Current Verified State

The repo should already include Stage 15A files:

- `src/types/crypto-execution.ts`
- `src/lib/crypto-execution/crypto-execution-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/app/api/student/crypto-execution/overview/route.ts`
- `src/app/api/workspace/crypto-execution/overview/route.ts`
- `src/app/api/admin/crypto-execution/overview/route.ts`

The existing Stage 15A boundary must be preserved:

- protected execution data flows through server-side Admin SDK routes only;
- Firestore client access to exchange connections, execution preferences, execution controls, intents, order attempts, risk decisions, and audit events stays denied;
- API responses return support-safe metadata only;
- Stage 16 entitlement logic remains the gate for Auto-Copy access;
- funded-account and prop-firm students stay Signal Alerts only;
- no Binance/Bybit live order placement exists.

Before adding 15B, confirm that `resolveCryptoExecutionReadiness` in `src/lib/crypto-execution/crypto-execution-validation.ts` enforces both `platformControl.sandboxOnly` and `workspaceControl.sandboxOnly`. If either flag is true, readiness must not return `live_ready` or `paperTradingOnly: false`. If that fix is missing, make it first.

---

## Read First

Before writing code, read these repository files:

- `plan.md`
- `prompt/promptsumary.md`
- `prompt/15A-crypto-auto-copy-data-model-and-server-boundary.md`
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
- `src/lib/crypto-execution/crypto-execution-mappers.ts`
- `src/lib/crypto-execution/crypto-execution-validation.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/entitlements/student-entitlements.ts`
- `src/lib/student-app/student-app-repository.ts`
- `src/lib/student-app/student-app-mappers.ts`
- `src/app/api/student/crypto-execution/overview/route.ts`
- `src/app/(student)/app/copier/page.tsx`
- `src/components/student-app/student-copier-client.tsx`
- `src/components/student-app/student-shell.tsx`
- `src/components/ui/*`
- `api/binance-client.js`
- `api/bybit-client.js`

Also check current official exchange documentation before implementing endpoint details:

- Binance API key permission / restrictions documentation
- Binance signed request authentication documentation
- Bybit V5 API key information documentation
- Bybit V5 authentication/signature documentation

Known primary doc locations as of this prompt:

- `https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/account#get-api-key-permission`
- `https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade`
- `https://bybit-exchange.github.io/docs/v5/user/apikey-info`
- `https://bybit-exchange.github.io/docs/v5/order/create-order`

Use those only as primary-source starting points. Re-check them during implementation because exchange APIs change.

---

## Stage Goal

At the end of Stage 15B:

- an eligible personal-account student can open the copier/crypto execution setup surface;
- the student can select Binance or Bybit;
- the student can submit an API key and secret through a one-time secure server route;
- the server verifies the key against the exchange permission endpoint;
- keys with withdrawal permission are rejected;
- unknown or unparseable permission responses fail closed;
- valid connection metadata is recorded as support-safe `exchange_connections` data;
- secret storage is server-only, encrypted, or explicitly unavailable/fail-closed;
- no raw API key, secret, signature, credential reference, or raw exchange payload is returned to the browser;
- student execution preferences can be saved in paper mode only;
- student pause/resume works for crypto Auto-Copy readiness;
- Stage 16 entitlements and Stage 15A readiness remain the authority;
- no live Binance/Bybit order placement is added.

---

## What This Stage Should NOT Do

Do **not**:

- place live Binance or Bybit orders;
- import or expose `placeBinanceOrder` or `placeBybitOrder` from the old `api/*.js` files;
- add signal fan-out into execution intents;
- add execution workers or queues;
- add order attempt creation from a real signal;
- add forex, FX Blue, cTrader, MT4, or MT5 logic;
- allow funded-account or prop-firm students to connect Auto-Copy execution credentials;
- weaken Firestore rules;
- add browser Firestore reads/writes for protected execution collections;
- store plaintext API keys in Firestore, logs, localStorage, sessionStorage, cookies, URLs, analytics, or audit events;
- return encrypted secret references to clients;
- mark a connection as production-live-ready while platform or workspace controls are sandbox-only;
- silently fall back to mock verification in production.

This is a **connection and permission-verification prompt**, not a trading prompt.

---

## Product And Security Truths To Preserve

### Entitlement Truth

- Auto-Copy access must flow from `resolveStudentEntitlements`.
- `autoCopy` feature access is required but not sufficient.
- A student must also have personal-account risk posture.
- Funded-account / prop-firm students remain Signal Alerts only.
- Do not infer feature access in client code.

### Secret Truth

- Exchange API secrets are high-risk broker/exchange credentials.
- A one-time browser form may collect a key/secret only long enough to submit to a protected API route.
- The server must clear, avoid logging, and never return raw secrets.
- Store only encrypted secret material or a safe encrypted-secret reference.
- If the repo has no safe KMS/envelope helper available, fail closed for real credential persistence and return a clear setup error. Do not store plaintext "temporarily".

### Permission Truth

- Do not trust the student to have created a trade-only key correctly.
- Verify through the exchange's authenticated permission endpoint.
- Reject withdrawal-enabled keys.
- If withdrawal state cannot be confidently determined, reject or mark failed.
- Record only sanitized status, failure code, and safe fix-it message.

### Execution Truth

- Stage 15B can make the student `paper_ready`.
- Stage 15B must not create live execution.
- Later prompts can add signal routing and workers after risk checks are built.

---

## Required Architecture

Keep the protected route shape used elsewhere:

```text
Browser
  -> Firebase Auth signs student in
  -> client gets ID token
  -> client calls /api/student/crypto-execution/*
  -> API route verifies token with Firebase Admin SDK
  -> route confirms student workspace scope
  -> route resolves Stage 16 entitlements from trusted records
  -> route verifies risk posture and Auto-Copy eligibility
  -> route talks to Binance/Bybit from server-only adapter code
  -> route stores encrypted credential material or fails closed
  -> route writes support-safe metadata through Admin SDK
  -> route returns redacted metadata only
```

Use `import "server-only";` in server-only credential/adaptor modules if the repo supports it.

---

## Implementation Requirements

### 1. Add Server-Only Exchange Adapter Layer

Create a server-only exchange adapter layer under a path such as:

- `src/lib/crypto-execution/exchanges/types.ts`
- `src/lib/crypto-execution/exchanges/binance-adapter.ts`
- `src/lib/crypto-execution/exchanges/bybit-adapter.ts`
- `src/lib/crypto-execution/exchanges/index.ts`

The adapter layer should expose permission verification only in this prompt.

Recommended normalized interface:

```ts
export type ExchangePermissionCheckInput = {
  apiKey: string;
  apiSecret: string;
  environment: "sandbox" | "production";
};

export type ExchangePermissionCheckResult = {
  ok: boolean;
  exchange: "binance" | "bybit";
  permissionVerification: "passed" | "failed";
  withdrawalPermission: "confirmed_disabled" | "detected_enabled" | "unknown";
  keyFingerprint?: string;
  safeMessage: string;
  sanitizedFailureCode?: string;
  sanitizedFailureReason?: string;
};
```

Requirements:

- Use official signing rules for each exchange.
- Use request timeouts.
- Normalize exchange errors.
- Do not throw raw exchange bodies into API responses.
- Do not log keys, secrets, signatures, or raw payloads.
- Fail closed on ambiguous permission responses.
- Keep order placement out of this adapter for now.

You may use `api/binance-client.js` and `api/bybit-client.js` as reference material, but do not import them into client components. Prefer converting the relevant permission-check logic into TypeScript server-only modules.

### 2. Binance Permission Verification

Implement Binance permission verification using current official Binance documentation.

Expected behavior:

- Make a signed authenticated permission/restriction request with the submitted key.
- Confirm withdrawal permission is disabled.
- Reject if withdrawal permission is enabled.
- Reject if the response shape is missing the fields needed to determine withdrawal state.
- Reject invalid, expired, IP-restricted, or under-permissioned keys with a support-safe message.
- Record `permissionVerification: "passed"` and `withdrawalPermission: "confirmed_disabled"` only when the server can prove it.

Do not implement Binance order placement.

### 3. Bybit Permission Verification

Implement Bybit permission verification using current official Bybit V5 documentation.

Expected behavior:

- Make a signed authenticated API-key information request with the submitted key.
- Scan permission categories defensively for withdrawal-related permissions.
- Reject if any withdrawal-related permission is present.
- Reject if permissions cannot be confidently parsed.
- Reject invalid, expired, IP-restricted, or under-permissioned keys with a support-safe message.
- Record `permissionVerification: "passed"` and `withdrawalPermission: "confirmed_disabled"` only when the server can prove it.

Do not implement Bybit order placement.

### 4. Add Credential Storage Boundary

Create a server-only credential storage helper such as:

- `src/lib/crypto-execution/credential-vault.ts`

Requirements:

- It must never store plaintext secrets.
- It must return a safe credential metadata result for repository writes.
- It should support a real encrypted storage mode if the repo already has KMS/envelope helpers or if adding the required dependency is acceptable in this task.
- If real encrypted storage cannot be implemented safely in this local repo, fail closed for production credential persistence and make the error explicit.
- A local metadata-only mode is acceptable only for development and must not mark production credentials as stored or executable.
- The API route must never return `credentialRefPath`, `encryptedSecretRef`, raw key, raw secret, or encrypted blob to the client.

Prefer adding environment placeholders to `.env.example` only if needed, for example:

- `CRYPTO_EXECUTION_ENABLED=`
- `CRYPTO_EXECUTION_MOCK_EXCHANGE=`
- `CRYPTO_CREDENTIAL_STORAGE_MODE=`
- `CRYPTO_CREDENTIAL_LOCAL_ENCRYPTION_KEY=`

If you add a local encryption mode, name it honestly and keep it disabled by default. Do not let local test settings imply production safety.

### 5. Extend Repository Functions

Extend `src/lib/crypto-execution/crypto-execution-repository.ts` or create focused repository modules for:

- listing safe student connections;
- creating/verifying a connection from a one-time submitted key;
- disabling/deleting a connection;
- saving student execution preferences;
- pausing/resuming student crypto execution;
- writing execution audit events;
- returning updated overview data after mutations.

All writes must go through Firebase Admin SDK.

Every mutating function must:

- verify the student actor;
- resolve workspace, student record, subscription, and Stage 16 entitlements;
- block funded-account/prop-firm students;
- block students without Auto-Copy entitlement;
- respect platform/workspace kill switches for readiness;
- sanitize all inputs;
- write support-safe audit events;
- return redacted overview data.

### 6. Add Student API Routes

Add protected student API routes such as:

- `POST /api/student/crypto-execution/preferences`
- `POST /api/student/crypto-execution/connections`
- `POST /api/student/crypto-execution/connections/[connectionId]/refresh`
- `POST /api/student/crypto-execution/connections/[connectionId]/disable`

Route names can vary if the repo has a better convention, but keep them grouped under `/api/student/crypto-execution`.

Requirements:

- Use `requireStudent`.
- Return `apiJson` / `apiError` consistently with existing routes.
- Never return secrets or credential refs.
- Use safe error messages.
- Keep responses compatible with the existing student overview route.
- Add idempotency where practical for duplicate connection submissions.

Do not add public routes for exchange verification.

### 7. Update Student UI

Update the student copier / crypto execution surface so an eligible student can manage paper-mode crypto setup.

Likely files:

- `src/components/student-app/student-copier-client.tsx`
- possibly a new `src/components/student-app/student-crypto-execution-client.tsx`
- possibly `src/app/(student)/app/copier/page.tsx`

UI requirements:

- Keep the TradeHub dark premium style.
- Make it clear this is Binance/Bybit personal exchange setup.
- Show that live trading is not enabled while platform/workspace controls are sandbox-only.
- Show current readiness state.
- Show existing connection metadata safely: exchange, environment, status, last verified date, permission state, withdrawal state, key fingerprint if present.
- Provide one-time submit fields for API key and secret.
- Use `autocomplete="off"` for secret fields.
- Clear secret form state after submit, success, or error.
- Require risk acknowledgement before submit.
- Require personal exchange account acknowledgement.
- Include student paper-mode risk preferences:
  - max risk percent per trade;
  - max daily loss percent;
  - max open trades;
  - allowed symbols;
  - pause/resume.
- Do not show raw API key, raw secret, signatures, encrypted secret refs, or raw exchange responses.
- Do not add giant explanatory marketing copy; use concise operational UI text.
- Ensure long IDs, fingerprints, emails, symbols, and messages stay inside their containers.

Ineligible students should see a clear locked or alerts-only state, not the key submission form.

### 8. Firestore Rules And Indexes

Keep client access denied for execution collections.

If 15B adds new collections, add explicit deny rules for them, for example credential metadata or secret vault reference collections.

Only add Firestore indexes if the new code needs compound queries. Prefer direct document paths and bounded subcollection reads.

Do not weaken existing rules.

### 9. Audit Events

Write support-safe audit events for:

- connection verification attempted;
- connection verified;
- connection rejected;
- connection disabled;
- preferences updated;
- student paused;
- student resumed.

Audit events must not include:

- raw API key;
- raw secret;
- HMAC signature;
- full request URL with signed query;
- raw exchange response;
- encrypted secret blob;
- secret reference path.

### 10. Manual QA Helpers

If the repo has no test exchange keys, add a safe development-only mock path only if it is disabled by default and clearly marked as mock.

Mock mode rules:

- must require an explicit env var;
- must never run in production mode;
- must mark connections as sandbox/mock only;
- must never set `environment: "production"` or `live_ready`;
- must be obvious in UI/support metadata.

If you cannot implement mock mode safely, do not add it. The final answer can describe that real Binance/Bybit keys are required for manual QA.

---

## Acceptance Criteria

### Student Eligibility

- Auto-Copy entitled personal-account students can see the Binance/Bybit setup form.
- Funded-account or alerts-only students cannot see or submit exchange credentials.
- Students without Auto-Copy entitlement receive a clear locked reason from server-derived entitlements.

### Connection Verification

- Binance keys are checked server-side against Binance permission data.
- Bybit keys are checked server-side against Bybit API-key permission data.
- Withdrawal-enabled keys are rejected.
- Ambiguous permission responses fail closed.
- Invalid keys are rejected with safe messages.
- Verified keys produce safe connection metadata only.

### Secret Handling

- No plaintext API key or secret is stored in Firestore.
- No raw key or secret is logged.
- No key, secret, signature, credential ref, or encrypted blob is returned to the client.
- Missing secure storage fails closed for real credentials.

### Preferences

- Student can save paper-mode risk preferences.
- Student can pause and resume crypto Auto-Copy readiness.
- Preferences stay bounded and sanitized.
- `paperTradingOnly` remains true unless a later live-execution prompt explicitly changes the policy.

### Readiness

- Readiness continues to respect Stage 16 entitlements.
- Readiness respects platform and workspace kill switches.
- Readiness respects platform/workspace sandbox-only controls.
- Stage 15B can reach `paper_ready`; it must not enable real live execution.

### UI

- Student UI is mature, readable, and responsive.
- Text and long metadata stay inside bordered containers.
- No raw secrets or secret refs appear after submit.
- Ineligible and error states are clear.

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

Also manually verify:

- eligible personal-account student can open the setup UI;
- funded/prop-firm student cannot submit exchange credentials;
- saving paper preferences updates overview state;
- pause/resume changes readiness;
- invalid Binance key fails safely;
- invalid Bybit key fails safely;
- withdrawal-enabled key path rejects if tested with real credentials;
- API responses contain no `apiSecret`, raw `apiKey`, `credentialRefPath`, `encryptedSecretRef`, `signature`, or raw exchange response;
- Firestore rules still deny client access to protected execution collections.

Use `rg` to check that raw secret field names are not returned from API response types/components.

---

## Final Response Requirements

When finished, report:

- exact files changed;
- exact API routes added;
- whether secure credential storage is fully implemented, metadata-only, or fail-closed pending KMS setup;
- how Binance permission verification works;
- how Bybit permission verification works;
- what records are written on success and rejection;
- what is shown to eligible vs ineligible students;
- confirmation that no live order placement was added;
- verification results for typecheck, lint, build, and rules test;
- manual QA checklist results or remaining blockers.
