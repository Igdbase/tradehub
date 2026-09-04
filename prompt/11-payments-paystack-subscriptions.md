# Prompt 11 - Payments: Paystack Subscriptions

You are building **TradeHub Stage 11**. Stages 01-10 already created the Next.js scaffold, locked design system, typed domain layer, marketing application flow, Firebase Email/Password auth, role gates, Super Admin CRM, influencer onboarding wizard, influencer dashboard, Course Hub, live student course access, and a responsive student app shell.

Your job now is to add the default local payment rail: **Paystack subscriptions**.

Build on the current codebase. Do not replace the design system. Do not remove Stage 05 auth, Stage 06 Admin SDK boundaries, Stage 07 onboarding, Stage 08 workspace APIs, Stage 09 course APIs, or Stage 10 student shell. Do not open Firestore rules. Do not move payment reads or writes into client Firestore queries.

This stage should answer the product question: **"How does a student safely subscribe to an influencer workspace using Paystack, and how does TradeHub track access without lying about payment state?"**

---

## Current Setup State

The owner has already completed:

- Firebase project on Spark/free plan.
- Email/Password auth.
- Firestore database `(default)` in production mode.
- Firestore rules locked with `allow read, write: if false;`.
- Admin SDK service account configured locally.
- Working Super Admin bootstrap script.
- Working influencer bootstrap script.
- Working student bootstrap script.
- Stage 10 browser validation confirmed that `/app`, `/app/courses`, `/app/signals`, `/app/copier`, and `/app/journal` work.

Stage 10 added:

- `/app` live student home through `/api/student/app/overview`.
- `/app/courses` and `/app/courses/[courseId]` integrated into the responsive student shell.
- `/app/signals`, `/app/copier`, and `/app/journal`.
- One-time forced Firebase token refresh/retry for stale student ID tokens.
- Student route layouts that work on phone, tablet, and desktop.

Known current limitation:

- Paystack account, Paystack test keys, Paystack plans, and webhook public URL may not be configured yet.
- The app is currently local-only unless the owner has deployed it separately.
- Localhost cannot receive Paystack webhooks directly without a public tunnel or deployed staging URL.

Do not block local UI/API implementation because live Paystack credentials are missing. Build safe config-aware behavior that clearly says whether Paystack is configured.

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
- `prompt/01-project-scaffold.md`
- `prompt/02-locked-design-system.md`
- `prompt/03-mock-data-domain-models.md`
- `prompt/04-marketing-landing-application-flow.md`
- `prompt/05-authentication-role-routing.md`
- `prompt/06-super-admin-dashboard-onboarding-crm.md`
- `prompt/07-influencer-onboarding-wizard.md`
- `prompt/08-influencer-dashboard-and-management.md`
- `prompt/09-course-hub-and-lesson-management.md`
- `prompt/10-student-mobile-app-shell.md`
- `prompt/promptsumary.md`
- `.env.example`
- `README.md`
- `package.json`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/*`
- `src/lib/firebase/*`
- `src/lib/workspace/*`
- `src/lib/student-app/*`
- `src/lib/course-hub/*`
- `src/app/api/student/*`
- `src/app/(student)/app/*`
- `src/components/student-app/*`
- `src/components/student-courses/*`
- `src/components/ui/*`
- `src/components/layout/*`

Also check the official Paystack documentation for current requirements before implementing API calls:

- Paystack subscriptions
- Paystack transaction initialize and verify
- Paystack plans
- Paystack webhooks and `x-paystack-signature`

Treat `files/tradehub-03-tech.md` and `files/tradehub-06-setup.md` as the backend/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat Stage 10 student routes as the live product shell that payments must plug into.

---

## Stage Goal

At the end of this stage:

- Paystack test-mode subscription initiation is implemented through server-side API routes.
- Student billing UI exists inside the student app, using the Stage 10 shell.
- Students can see tier, subscription status, renewal/past-due/trial state, and Paystack checkout readiness.
- A student can request a Paystack checkout URL for a selected workspace tier when Paystack is configured.
- Payment intent and subscription records are written through Admin SDK server routes only.
- Paystack webhook route exists and verifies `x-paystack-signature`.
- Webhook processing is idempotent and updates subscription/payment records safely.
- Public/test configuration missing states are honest and not scary.
- Super Admin and influencer dashboards show enough payment/subscription state to support operations.
- Firestore rules remain locked to clients.
- Prompt 12 can add optional Solana Pay / USDC without rewriting the subscription model.

---

## What This Stage Should NOT Do

Do **not**:

- enable Blaze/pay-as-you-go,
- enable Cloud Functions,
- add Solana checkout,
- add Telegram delivery,
- add broker/exchange credential collection,
- add real Auto-Copy execution,
- collect or store card numbers,
- collect or store bank account numbers inside TradeHub,
- expose Paystack secret keys to the browser,
- put Paystack secret keys in committed files,
- hardcode live Paystack keys,
- fake successful payment if Paystack is not configured,
- mark subscriptions active from client input,
- trust callback query params as proof of payment,
- use client Firestore reads/writes for payments,
- open Firestore rules with `allow read, write: if true`,
- scan all students/payments/subscriptions for dashboard totals,
- add noisy realtime listeners for billing,
- silently run live charges if the owner intended test mode.

Use Paystack test mode first. If the owner provides live keys later, the same code path should still require explicit env configuration and safe webhook verification.

---

## Required Setup From Owner

Prompt 11 can be implemented without all setup being complete, but full end-to-end Paystack verification needs:

1. Paystack business/test account.
2. Paystack test secret key:

```text
PAYSTACK_SECRET_KEY=sk_test_...
```

3. Optional public key if a client-side inline flow is intentionally used:

```text
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
```

4. Workspace tier plan codes or permission for the app to create test plans:

```text
PAYSTACK_DEFAULT_MONTHLY_PLAN_CODE=
```

Prefer storing plan codes per workspace tier in Firestore rather than relying only on global env vars.

5. Webhook URL:

```text
https://your-public-url.com/api/paystack/webhook
```

Localhost cannot receive Paystack webhooks directly. Use a staging deployment or a tunnel only for testing.

6. Paystack webhook signature verification using the Paystack secret key. If a separate webhook secret is not supported by Paystack, use `PAYSTACK_SECRET_KEY` for HMAC verification. Do not invent a weaker shared secret.

Update `.env.example` if needed, but do not commit real keys.

---

## Required Architecture

Use the secure pattern already established:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls /api/student/billing/* with Authorization: Bearer <idToken>
  -> API route verifies token with Firebase Admin SDK
  -> API route confirms role === "student"
  -> API route scopes all work to token.workspaceId and token.studentId
  -> API route uses Admin SDK and server-side Paystack calls
```

For webhooks:

```text
Paystack
  -> POST /api/paystack/webhook
  -> route reads raw request body
  -> route verifies x-paystack-signature using HMAC SHA512 and Paystack secret key
  -> route returns 200 quickly after validation and idempotent persistence
  -> route updates Firestore through Admin SDK only
```

Do not use Firestore browser SDK for billing data.

Do not trust Paystack callback query params as final payment proof. Callback pages can show "verifying payment", but real status must come from transaction verification and/or webhook events.

---

## Environment Requirements

Ensure `.env.example` contains:

```text
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
```

Notes:

- `PAYSTACK_SECRET_KEY` is server-only.
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is optional and browser-visible by design.
- If Paystack uses the secret key for webhook signature verification, document that `PAYSTACK_WEBHOOK_SECRET` is unused or optional.
- Never import server-only env variables into client components.
- Never print keys in logs or API responses.

If Paystack config is missing:

- Student billing UI should show "Paystack test mode is not configured yet."
- Checkout initiation should return a clear `503 paystack_not_configured`.
- Build should still pass.

---

## Firestore Shape For This Stage

Build minimally and keep records direct-path or bounded.

### Workspace tier payment config

Existing workspace tiers live on:

```text
/workspaces/{workspaceId}
```

Extend each tier safely if needed:

```ts
{
  tierId: string;
  name: string;
  description: string;
  priceNgn: number;
  billingPeriod: "monthly" | "annual";
  features: Array<"course" | "signalAlerts" | "autoCopy" | "journal" | "tagging" | "calculators" | "aiInsights">;
  featured?: boolean;
  paystackPlanCode?: string;
}
```

Do not require the student to create plans. Plan creation is operator/system-owned.

### Student subscription record

Use:

```text
/workspaces/{workspaceId}/students/{studentId}/subscriptions/current
```

Recommended fields:

```ts
{
  workspaceId: string;
  studentId: string;
  tierId: string;
  tierLabel: string;
  status: "inactive" | "trialing" | "active" | "past_due" | "non_renewing" | "cancelled" | "expired";
  rail: "paystack";
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  paystackEmailToken?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  graceEndsAt?: string;
  nextPaymentDate?: string;
  latestPaymentIntentId?: string;
  latestReference?: string;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Payment intents

Use:

```text
/workspaces/{workspaceId}/payment_intents/{paymentIntentId}
```

Recommended fields:

```ts
{
  paymentIntentId: string;
  workspaceId: string;
  studentId: string;
  tierId: string;
  rail: "paystack";
  status: "pending" | "checkout_opened" | "verified" | "failed" | "abandoned" | "cancelled";
  amountNgn: number;
  currency: "NGN";
  reference: string;
  paystackAccessCode?: string;
  paystackAuthorizationUrl?: string;
  paystackPlanCode?: string;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  splitCode?: string;
  subaccountCode?: string;
  platformSplitPercent: number;
  influencerSplitPercent: number;
  metadata: {
    workspaceId: string;
    studentId: string;
    tierId: string;
  };
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  failureReason?: string;
}
```

### Paystack webhook events

Use:

```text
/paystack_webhook_events/{eventId}
```

Recommended fields:

```ts
{
  eventId: string;
  event: string;
  reference?: string;
  subscriptionCode?: string;
  invoiceCode?: string;
  workspaceId?: string;
  studentId?: string;
  processed: boolean;
  duplicate: boolean;
  receivedAt: string;
  processedAt?: string;
}
```

Never store full raw webhook payloads if they include sensitive payment authorization details. Store only the safe fields needed for idempotency and audit.

### Audit log

Continue using:

```text
/audit_log/{eventId}
```

Write audit events for:

- checkout intent created,
- Paystack transaction verified,
- subscription activated,
- payment failed/past due,
- subscription cancelled/non-renewing,
- webhook rejected by signature,
- duplicate webhook ignored.

---

## API Routes

Add or update server routes.

Suggested structure:

```text
src/app/api/student/billing/overview/route.ts
src/app/api/student/billing/checkout/route.ts
src/app/api/student/billing/verify/route.ts
src/app/api/paystack/webhook/route.ts
src/app/api/admin/payments/overview/route.ts
src/app/api/workspace/billing/overview/route.ts
```

### `GET /api/student/billing/overview`

Student only.

Requirements:

- Verify Firebase ID token.
- Require `role === "student"`.
- Require `workspaceId`.
- Load workspace directly.
- Load student record directly.
- Load `/subscriptions/current` directly.
- Return tiers that are available for checkout.
- Return Paystack readiness status.
- Return current subscription state.
- Return warnings if Paystack is not configured or workspace tiers lack plan codes.
- Do not scan payment intents.

### `POST /api/student/billing/checkout`

Student only.

Requirements:

- Verify Firebase ID token.
- Require `role === "student"`.
- Require `workspaceId`.
- Accept only `{ tierId }` from the browser.
- Validate the tier belongs to the signed-in student's workspace.
- Validate the tier has a valid NGN price and billing period.
- Validate Paystack is configured.
- Use existing `paystackPlanCode` where available.
- If this stage creates plans automatically, do it server-side only and write the plan code back to the tier config. Prefer requiring operator-created plan codes unless clean auto-create is implemented.
- Create a payment intent first with `pending`.
- Call Paystack transaction initialize with:
  - student email,
  - amount in kobo,
  - plan code if using subscriptions,
  - unique reference,
  - callback URL,
  - metadata containing workspaceId, studentId, tierId, paymentIntentId.
- Include split/subaccount code only if workspace Paystack readiness has verified codes.
- Store only safe response fields: authorization URL, access code, reference.
- Return checkout URL to the client.
- Do not mark subscription active here.

### `GET /api/student/billing/verify`

Student only.

Requirements:

- Verify Firebase ID token.
- Accept `reference`.
- Load matching payment intent scoped to token workspace/student.
- Call Paystack transaction verify server-side if Paystack is configured.
- If Paystack confirms `success`, update payment intent and subscription idempotently.
- If not successful, return pending/failed state honestly.
- Do not trust callback query params without server verification.

### `POST /api/paystack/webhook`

Public Paystack route, but signature-protected.

Requirements:

- Read raw request body.
- Verify `x-paystack-signature` with HMAC SHA512 and Paystack secret key.
- Return `401` or `400` for invalid signatures/malformed payloads.
- Return `200` for valid duplicate events without reprocessing.
- Store a safe webhook-event receipt.
- Handle at least:
  - `charge.success`
  - `subscription.create`
  - `invoice.create`
  - `invoice.payment_failed`
  - `invoice.update`
  - `subscription.not_renew`
  - `subscription.disable`
- Use metadata/reference/subscription code to locate the workspace/student/payment intent.
- Update subscription status and payment intent idempotently.
- Avoid long-running work. Persist and return quickly.

### `GET /api/admin/payments/overview`

Super Admin only.

Requirements:

- Verify `super_admin`.
- Prefer summary documents.
- Return Paystack config mode: configured/missing/test/live if detectable from key prefix.
- Return latest bounded payment intents, max 25.
- Return totals from summary docs, not broad scans.

### `GET /api/workspace/billing/overview`

Influencer only.

Requirements:

- Verify `role === "influencer"`.
- Scope by token `workspaceId`.
- Return workspace payment readiness, tier plan-code status, latest bounded subscription/payment summaries.
- Do not expose Paystack secret keys, raw authorization payloads, or full card/bank data.

---

## Paystack Client Layer

Create a small server-only Paystack client.

Suggested files:

```text
src/lib/paystack/paystack-client.ts
src/lib/paystack/paystack-errors.ts
src/lib/paystack/paystack-validation.ts
src/lib/paystack/paystack-webhook.ts
src/lib/paystack/paystack-mappers.ts
src/types/payments.ts
```

Requirements:

- Use `fetch` directly unless a dependency is truly needed.
- Do not install Paystack packages unless there is a strong reason.
- Keep `PAYSTACK_SECRET_KEY` server-only.
- Detect missing config with a clear typed error.
- Support test/live key prefix awareness only for display/safety, not security.
- Never log Paystack secret keys.
- Never return raw Paystack authorization objects to the browser.
- Use idempotency around references and webhook event IDs.

---

## Student Billing UI

Add student-facing routes:

```text
/app/billing
/app/billing/callback
```

Integrate them into the Stage 10 student shell navigation or quick links.

### `/app/billing`

Student only.

Required sections:

- Current subscription status.
- Tier cards from the workspace.
- Paystack readiness banner.
- Trial/grace/past-due state.
- Clear renewal date or next-payment date if known.
- Subscribe/change plan CTA.
- Link back to courses and home.

Tier cards should show:

- tier name,
- price in NGN,
- billing interval,
- included features,
- whether Paystack plan code is ready,
- current tier badge,
- disabled CTA if Paystack is missing/not ready.

### `/app/billing/callback`

Student only.

Requirements:

- Read `reference` from URL.
- Call `/api/student/billing/verify`.
- Show verifying state.
- Show success only after server verification.
- Show pending/failed state honestly.
- Link back to `/app`, `/app/courses`, and `/app/billing`.

Do not call Paystack directly from the client.

---

## Student App Integration

Update Stage 10 surfaces:

- `/app` should show subscription/tier/payment status more clearly.
- `/app/courses` should keep tier gating intact.
- `/app/copier` should keep showing payment rail, but should link to `/app/billing`.
- Add Billing to student navigation if it fits the current shell. If there is no room on mobile bottom nav, add it as a prominent card/CTA in Home and Account/Billing area rather than crowding the nav.

Do not break the existing student route checks.

---

## Admin And Influencer Integration

Update only as much as needed.

### Super Admin

In `/admin`, add or link a Paystack/payment operations view that shows:

- Paystack configured/missing/test mode state,
- bounded latest payment intents,
- pending/failed payments,
- past-due subscriptions,
- webhook processing warnings,
- no real secret values.

### Influencer Workspace

In `/workspace`, show:

- Paystack readiness,
- tier plan-code readiness,
- active/trial/past-due student counts if summary exists,
- latest bounded payment/subscription activity if available,
- clear owner-pending states if Paystack subaccount/split code is missing.

Do not build a full finance ledger here. Keep Prompt 11 focused on checkout/subscription foundation.

---

## Trial And Grace Period Rules

Support these statuses in code and UI:

- `inactive`
- `trialing`
- `active`
- `past_due`
- `non_renewing`
- `cancelled`
- `expired`

Rules:

- If a workspace tier has a configured free trial from Stage 07, the UI can show it.
- Do not grant trial access from a browser-only request unless a server route creates the subscription/trial record.
- Past-due should show a grace-period warning if `graceEndsAt` exists.
- Cancelled/non-renewing should preserve access until current period end if Paystack says the subscription is still paid through that period.
- Course/signals access checks should keep using subscription/tier status from trusted server data.

Do not build a scheduler in this prompt. If automated grace expiration needs scheduled work, document it as deferred.

---

## Webhook And Idempotency Requirements

Required:

- Verify signature before processing.
- Use event ID, reference, subscription code, or invoice code to prevent duplicate processing.
- Webhook replay should not duplicate payments or extend access twice.
- `charge.success` should update the matching payment intent and subscription.
- `invoice.payment_failed` should mark subscription `past_due` and set/retain grace state.
- `subscription.not_renew` should mark `non_renewing`.
- `subscription.disable` should mark `cancelled` or `expired` depending on event details.
- Unknown events should be recorded as ignored, not crash the route.

Webhook response behavior:

- Invalid signature: reject.
- Valid duplicate: return `200`.
- Valid known event: persist safe update and return `200`.
- Valid unknown event: record minimal receipt and return `200`.

---

## Firestore Rules And Security Boundary

Keep production `firestore.rules` locked:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Because this stage uses Admin SDK routes, clients do not need direct Firestore access.

Do not deploy rules unless explicitly asked.

---

## Quota And Cost Guardrails

Requirements:

- Direct document reads for current student subscription.
- Bounded latest payment lists, max 25.
- No broad scans for admin or influencer totals.
- Prefer summary docs for payment totals.
- No realtime billing listeners.
- No scheduled billing scanner in this prompt.
- One payment intent write before Paystack initialize.
- One update on verified payment.
- One safe webhook receipt per Paystack event.
- One audit entry for important payment state changes.

---

## Security Requirements

Required:

- Keep Paystack secret key server-only.
- Never expose secret keys in client bundles.
- Never log Paystack secret keys.
- Never log full webhook payloads if they include sensitive authorization details.
- Never store raw card numbers or bank account numbers.
- Never trust client-provided paid/active status.
- Never trust callback URL params as payment proof.
- Verify Paystack webhook signatures.
- Verify Paystack transactions server-side.
- Keep route role checks at the API layer.
- Scope student billing by token `workspaceId` and `studentId`.
- Do not allow one student to read another student's subscription/payment records.
- Do not allow influencers to modify student payment status directly.
- Do not use localStorage/query params as payment authority.
- No `dangerouslySetInnerHTML` for payment/user text.

Security checks before closing:

```bash
rg -n "PAYSTACK_SECRET_KEY|sk_live_|sk_test_|allow read, write: if true|dangerouslySetInnerHTML|localStorage.*payment|localStorage.*role|firebase/firestore|card_number|bank_account|authorization_code" src firestore.rules scripts README.md .env.example
```

Expected:

- no real Paystack secret keys,
- no permissive Firestore rule,
- no client Firestore reads/writes for payments,
- no raw card/bank collection,
- no unsafe HTML rendering for payment text.

It is acceptable for `.env.example` and server-only env helpers to mention placeholder variable names.

---

## Suggested Implementation Shape

You may adapt names, but keep boundaries clean:

```text
src/
  app/
    api/
      student/
        billing/
          overview/
            route.ts
          checkout/
            route.ts
          verify/
            route.ts
      paystack/
        webhook/
          route.ts
      admin/
        payments/
          overview/
            route.ts
      workspace/
        billing/
          overview/
            route.ts
    (student)/
      app/
        billing/
          page.tsx
          callback/
            page.tsx
  components/
    billing/
      student-billing-client.tsx
      billing-tier-card.tsx
      billing-status-card.tsx
      billing-callback-client.tsx
  lib/
    billing/
      billing-api-client.ts
      billing-repository.ts
      billing-validation.ts
      billing-mappers.ts
    paystack/
      paystack-client.ts
      paystack-errors.ts
      paystack-webhook.ts
      paystack-mappers.ts
  types/
    payments.ts
```

Keep only interactive billing components as client components.

Server API routes must verify Firebase ID tokens again.

---

## README Updates

Update `README.md` with:

- Paystack test-mode setup,
- required env vars,
- how to start the app,
- how to inspect `/app/billing`,
- how Paystack checkout works,
- why callback is not final proof,
- how to configure webhook URL,
- why localhost needs a tunnel or staging deployment for webhooks,
- what records are written in Firestore,
- what is intentionally deferred to Prompt 12+.

Do not ask the owner to paste secret keys into chat.

---

## Verification Requirements

Before finishing, verify all of the following:

```bash
npm run lint
npm run typecheck
npm run build
npm run dev
```

Manual/runtime route verification:

- `/`
- `/login`
- `/admin`
- `/workspace`
- `/workspace/onboarding`
- `/workspace/courses`
- `/app`
- `/app/courses`
- `/app/signals`
- `/app/copier`
- `/app/journal`
- `/app/billing`
- `/app/billing/callback`
- `/join/apexfx`
- `/design-system`
- `/terms`
- `/privacy`
- `/risk-disclosure`
- `/data-use`

Expected:

- public routes return `200`,
- protected pages render auth/role-appropriate states,
- Stage 10 student pages still work,
- `/app/billing` loads for a valid student account,
- missing Paystack config shows a clear not-configured state,
- no build-time crash if Paystack env vars are blank.

API checks:

- signed-out `GET /api/student/billing/overview` returns `401`,
- signed-out `POST /api/student/billing/checkout` returns `401`,
- signed-out `GET /api/student/billing/verify` returns `401`,
- wrong-role requests return `403`,
- student checkout with missing config returns clear `503 paystack_not_configured`,
- invalid tier checkout returns `400`,
- webhook invalid signature is rejected,
- webhook duplicate event is idempotent if a test payload is available,
- no route marks subscription active without server-side Paystack verification.

If Paystack test keys are configured:

- initialize checkout in test mode,
- confirm a Paystack authorization URL is returned,
- verify the payment reference after test payment,
- confirm payment intent and subscription records update,
- confirm `/app/billing/callback?reference=...` shows verified success only after server verification.

If Paystack test keys are not configured:

- do not fake success,
- report that real checkout verification is waiting on Paystack test credentials.

Security verification:

```bash
rg -n "sk_live_|sk_test_|allow read, write: if true|dangerouslySetInnerHTML|localStorage.*payment|localStorage.*role|from ['\\\"]firebase/firestore|onSnapshot|card_number|bank_account|authorization_code" src firestore.rules scripts README.md .env.example
```

Expected:

- no committed Paystack secret keys,
- no permissive Firestore rule,
- no client Firestore reads/writes for payment data,
- no stored card/bank details,
- no unsafe HTML rendering for user/payment text.

---

## Response Format When Finished

When you finish, respond with:

1. the local dev URL,
2. the best billing routes to inspect first,
3. the key files changed,
4. whether Paystack is configured or showing safe not-configured state,
5. whether checkout was test-verified or waiting on Paystack test keys,
6. whether webhook verification was tested locally or needs public tunnel/staging,
7. exact verification results for lint, typecheck, build, dev, route/API checks,
8. any still-missing owner setup needed,
9. the recommended next prompt.

Be explicit about what is real, what is test-mode only, and what remains deferred.

The recommended next prompt after this stage is:

**Prompt 12 - Payments: Solana Pay / USDC Checkout**
