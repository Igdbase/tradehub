# Prompt 13 - Payments Hardening, Subscription Lifecycle, and Settlement Operations

You are building **TradeHub Stage 13**. Stages 01-12 already created the Next.js scaffold, locked design system, typed domain layer, marketing flow, Firebase auth + role routing, Super Admin CRM, influencer onboarding, influencer dashboard, Course Hub, student app shell, Paystack subscription checkout, and optional Solana Pay / USDC checkout with settlement-ledger recording.

Your job now is to harden the payment system **after first checkout**.

Do not rebuild Stage 11 or Stage 12 from scratch.
Do not change the product truth:

- **Paystack remains the default rail**
- **Solana remains optional**
- **verified Solana currently records settlement ops; it does not auto-send influencer payout on-chain**

Build on the current codebase. Do not open Firestore rules. Do not move protected billing reads/writes into client Firestore queries.

This stage should answer the product question:

**"After a student starts paying, how does TradeHub keep subscription state, reconciliation, and settlement operations honest without pretending automation that does not exist?"**

---

## Current Verified State

Stage 12 already established:

- Student billing lives in `/app/billing`.
- Paystack checkout is created server-side.
- Paystack callback verification exists.
- Paystack webhook receipt handling exists.
- Solana quote creation is server-side.
- Solana verification is server-side.
- Verified Solana payments create settlement-ledger records.
- Admin has a payment rail overview and Solana settlement ledger view.
- Workspace billing overview exists.

Known current reality:

- Some admin/workspace billing surfaces are still overview-level rather than operations-grade.
- Paystack lifecycle visibility is still shallow compared with what an owner needs after real usage starts.
- Solana settlements are recorded, but settlement operations still need clearer admin workflows.
- Firestore index gaps can still cause controlled warnings in admin payment feeds.

Do not remove working flows. Tighten them.

---

## Read First

Before writing code, read these files in the repository:

- `files/tradehub-01-overview.md`
- `files/tradehub-02-features.md`
- `files/tradehub-03-tech.md`
- `files/tradehub-04-design.md`
- `files/tradehub-05-policies.md`
- `files/tradehub-06-setup.md`
- `files/tradehub-07-security-review.md`
- `asset/tradehub-colors.html`
- `prompt/10-student-mobile-app-shell.md`
- `prompt/11-payments-paystack-subscriptions.md`
- `prompt/12-solana-pay-usdc-optional-checkout.md`
- `prompt/promptsumary.md`
- `.env.example`
- `README.md`
- `package.json`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/payments.ts`
- `src/types/admin-api.ts`
- `src/types/workspace.ts`
- `src/config/env.ts`
- `src/lib/billing/*`
- `src/lib/paystack/*`
- `src/lib/solana/*`
- `src/lib/firebase/*`
- `src/app/api/student/billing/*`
- `src/app/api/paystack/webhook/route.ts`
- `src/app/api/admin/payments/overview/route.ts`
- `src/app/api/workspace/billing/overview/route.ts`
- `src/app/(student)/app/billing/*`
- `src/components/billing/*`
- `src/components/admin/payment-rail-overview.tsx`
- `src/components/admin/solana-settlement-ledger.tsx`
- `src/components/workspace/workspace-overview.tsx`
- `src/app/(super-admin)/admin/admin-page-client.tsx`
- `src/app/(influencer)/workspace/workspace-page-client.tsx`

Also check current official docs before implementing payment-hardening details:

- Paystack transaction verify
- Paystack subscriptions
- Paystack webhook events and signature validation
- Solana Pay reference verification behavior
- Firestore collection-group indexes and query limits

Treat `files/tradehub-03-tech.md`, `files/tradehub-06-setup.md`, and `files/tradehub-07-security-review.md` as the backend/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat Stage 11 and Stage 12 billing flows as already-real foundation.

---

## Stage Goal

At the end of this stage:

- Admin payments become operations-usable, not just proof-of-concept visible.
- Workspace billing becomes clearer about current readiness, latest billing state, and warnings.
- Student billing shows a cleaner subscription lifecycle state.
- Paystack payment records can be manually reconciled safely when callback/webhook timing is messy.
- Solana settlement records can be marked through a controlled payout-ops workflow.
- Settlement state changes create audit events.
- Billing views stay bounded and index-safe.
- Missing index or missing config states stay controlled and readable.
- Prompt 14 can focus on trust/safety, journal/policy hardening, and launch prep instead of rewriting billing again.

---

## What This Stage Should NOT Do

Do **not**:

- replace Paystack as the default rail,
- remove or weaken Solana verification,
- introduce client-side billing writes,
- store card numbers, bank details, private keys, seed phrases, or wallet exports,
- fake auto-split payout on Solana,
- build a full accounting ERP,
- add Cloud Functions just to make this stage work,
- add cron/queue workers just to close lifecycle gaps,
- open Firestore rules,
- add broad collection scans for dashboards,
- add realtime listeners for billing feeds,
- add Telegram signal delivery here,
- rewrite course, signal, or student shells outside billing-related touchpoints.

This stage is about **payment ops truth**, not unrelated feature expansion.

---

## Core Product Decisions To Keep Honest

### Paystack

- Browser redirect is never final proof.
- Server-side verify stays the source of truth.
- Webhook receipts remain idempotent.
- Subscription access changes must come from controlled server writes only.

### Solana

- Platform wallet receives USDC in the MVP path.
- Influencer share is recorded in settlement data.
- Settlement status is an ops workflow, not an auto-transfer claim.
- UI copy must remain honest about this.

### Lifecycle

- A checkout can be pending, verified, failed, expired, abandoned, or cancelled.
- A subscription can be inactive, trialing, active, past_due, non_renewing, cancelled, or expired.
- The UI should explain these states instead of hiding them.

---

## Required Architecture

Keep the same secure pattern already used in earlier billing stages:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls /api/student/billing/* or admin/workspace billing routes
  -> API route verifies token with Firebase Admin SDK
  -> route confirms role and workspace scope
  -> route uses Admin SDK and server-side Paystack/Solana helpers
```

Do not bypass this with localStorage flags, unsigned query params, or client Firestore calls.

---

## Required Stage Work

### 1. Admin Payment Operations Hardening

Improve the super admin payments surface so it can support real ops after first payments begin.

Add or improve:

- latest recent payment intents feed with bounded page size,
- clear rail/status chips,
- reference/payment-intent IDs that do not overflow cards,
- controlled warning when the payment-intents collection-group query needs an index,
- latest verified Solana settlements with clearer operational status,
- better summary cards for:
  - latest intents,
  - verified Paystack records,
  - verified Solana records,
  - pending Solana payouts,
  - latest amount,
  - rail readiness.

Do not scan the entire project data set just to compute totals.

If the collection-group query needs an index:

- fail softly,
- tell the operator what is missing,
- update `firestore.indexes.json` and docs if needed,
- do not crash the full admin page.

### 2. Paystack Manual Reconciliation Flow

Implement a safe admin-only way to reconcile a Paystack payment intent that is still pending or ambiguous.

This should be server-side only.

Expected behavior:

- Admin can trigger a controlled "recheck / reconcile" action for a Paystack payment intent.
- The route verifies the Paystack reference again server-side.
- If Paystack confirms success and the intent is still behind, TradeHub updates the intent/subscription safely.
- If Paystack still does not confirm success, return an honest non-success result.
- Reconciliation must be idempotent.
- Reconciliation must create an audit event.

Suggested shape:

- `POST /api/admin/payments/paystack/[paymentIntentId]/reconcile`

You may choose a better route shape if it matches the repo conventions.

Do not trust admin-entered raw state.
The server must still verify against Paystack.

### 3. Solana Settlement Operations

Build the next honest step after Stage 12:

- Admin can mark a settlement as:
  - `pending_payout`
  - `settled`
  - `cancelled`

Support:

- payout note,
- payout completed timestamp,
- optional payout signature / transfer reference.

Expected behavior:

- This changes only settlement-ops state.
- It does not pretend to send on-chain funds automatically.
- It writes to the settlement record through Admin SDK only.
- It creates an audit event.

Suggested route:

- `PATCH /api/admin/payments/solana-settlements/[settlementId]`

Workspace view should stay read-only unless you have a very good reason otherwise.
The influencer should be able to **see** settlement state, but not mark platform payouts complete.

### 4. Workspace Billing View Hardening

Improve the influencer workspace billing overview so it reads like a real operating panel.

It should clearly show:

- whether Paystack split readiness is complete,
- whether a plan code is present per tier,
- latest payment intents for that workspace,
- latest Solana settlement records for that workspace,
- useful warnings,
- current lifecycle reality without fake totals.

Make sure long references, notes, and statuses do not overflow their cards.

### 5. Student Billing Lifecycle Clarity

Improve the student billing experience so subscription state is easier to understand.

Add or tighten:

- clear lifecycle status badge,
- clearer next payment / current period / trial / grace explanation,
- honest "verifying / pending / failed / expired" handling,
- safer callback copy,
- better behavior when Paystack verify succeeds but webhook has not arrived yet,
- better behavior when a Solana quote expires,
- clean empty states when no current subscription exists yet.

Do not add a full billing history table unless it is small, bounded, and clearly useful.
Keep the student surface simple.

### 6. Webhook and Receipt Visibility

If the repo does not already expose enough receipt visibility, add bounded visibility for recent webhook receipts in admin ops.

The goal is not a giant log explorer.
The goal is operational clarity:

- what came in,
- whether it was processed,
- whether it was duplicate,
- what workspace/student/reference it matched.

Keep it bounded and index-safe.

### 7. Docs and Setup Hardening

Update:

- `README.md`
- `.env.example`
- `firestore.indexes.json` if required

Document:

- any required Paystack reconciliation behavior,
- any new admin-only payout-settlement workflow,
- any required Firestore index,
- what is still intentionally manual in Solana settlement ops.

---

## Data Expectations

Build on the existing billing records instead of inventing a second billing system.

Use the current types in `src/types/payments.ts` where possible.

If you extend the data model, keep it minimal and typed:

- `PaystackWebhookReceipt`
- `PaystackPaymentIntent`
- `SolanaSettlementRecord`
- `StudentSubscription`

The existing settlement fields are already close to what you need:

- `status`
- `payoutCompletedAt`
- `payoutSignature`
- `payoutNote`

Prefer extending current records over creating duplicate "ops copy" collections unless a mirrored platform-level index-safe collection is already part of the billing shape.

---

## Security Requirements

Keep these hard rules:

- All protected billing operations stay behind verified Firebase ID tokens.
- Super admin routes require `role === "super_admin"`.
- Workspace routes require `role === "influencer"` plus token workspace scope.
- Student routes require `role === "student"`.
- No client-side direct Firestore reads/writes for billing.
- No raw secrets in UI.
- No private key handling in the app.
- No permissive Firestore rule changes.
- Reconciliation and settlement state changes must be auditable.
- Reconciliation must verify against real source-of-truth rails, not client claims.

If you add notes fields, sanitize and bound them.

---

## Quota / Query Guardrails

- Use bounded page sizes, such as 25.
- Prefer direct document paths and targeted collection queries.
- Do not scan all students or subscriptions for billing totals.
- Treat admin feeds as recent-activity windows, not full ledgers.
- Missing indexes should produce warnings, not full-page failures.
- Keep webhook receipts idempotent and bounded.
- Keep settlement queries bounded.

---

## Required Routes / Components / Files To Touch

You do not have to use these exact files only, but the completed stage should likely touch:

- `src/lib/billing/billing-repository.ts`
- `src/lib/billing/billing-mappers.ts`
- `src/lib/billing/billing-validation.ts`
- `src/types/payments.ts`
- `src/app/api/admin/payments/overview/route.ts`
- new admin payment ops route(s)
- `src/app/api/workspace/billing/overview/route.ts`
- `src/components/admin/payment-rail-overview.tsx`
- `src/components/admin/solana-settlement-ledger.tsx`
- `src/components/billing/student-billing-client.tsx`
- `src/components/billing/billing-callback-client.tsx`
- `src/app/(super-admin)/admin/admin-page-client.tsx`
- `src/app/(influencer)/workspace/workspace-page-client.tsx`
- `README.md`
- `.env.example`
- `firestore.indexes.json`

Stay consistent with the current folder structure and API/client patterns.

---

## Manual Verification Expectations

Before closing the stage, manually prove:

### Billing safety

1. Signed-out access to new admin/workspace billing ops routes returns `401`.
2. Firestore rules remain locked.
3. No client Firestore billing reads/writes were introduced.

### Paystack ops

4. Existing Paystack checkout still works.
5. Existing callback verification still works.
6. Admin recent payment feed loads or shows a controlled index warning.
7. A Paystack reconcile action returns a safe result and does not corrupt existing verified data.

### Solana ops

8. Existing verified Solana settlement records still appear in admin.
9. Admin can mark a pending settlement as settled with a note/signature/reference.
10. Workspace billing view reflects the updated settlement state in a read-only way.

### Student lifecycle clarity

11. Student billing status copy makes sense for:
    - no subscription,
    - active,
    - pending verification,
    - expired quote,
    - failure / safe-failure states.

### Boundedness

12. No broad unbounded collection scans were added for billing ops panels.

---

## Required Command Checks

Run and report:

```bash
npm run lint
npm run typecheck
npm run build
```

Also smoke-check the live routes you touched in dev mode.

Minimum signed-out checks:

```bash
curl -i http://localhost:3000/api/admin/payments/overview
curl -i http://localhost:3000/api/workspace/billing/overview
curl -i -X POST http://localhost:3000/api/admin/payments/paystack/pi_fake/reconcile
curl -i -X PATCH http://localhost:3000/api/admin/payments/solana-settlements/solset_fake
```

If your route names differ, adapt the checks accordingly.

Expected signed-out result is `401`.

---

## Output Requirements

When you finish, report:

1. exact files changed,
2. whether admin payment ops now load fully or still need a Firestore index,
3. whether Paystack reconcile exists and how it behaves,
4. whether Solana settlement status can now be updated,
5. whether student billing lifecycle copy is clearer,
6. the result of `lint`, `typecheck`, and `build`,
7. what still remains intentionally manual for real production ops.

Be explicit about any blocker.
Do not say a payout is automatic if it is still a ledger + admin workflow.

---

## Prompt 14 Readiness

This stage should leave the codebase ready for **Prompt 14 - Journal, trust/safety, policies, and launch hardening** by ensuring:

- billing rails are already stable enough,
- admin/workspace billing ops are understandable,
- settlement state is operationally visible,
- subscription lifecycle truth is no longer muddy,
- later launch hardening can focus on trust, policy, disputes, audit, and release readiness instead of backfilling payment basics.
