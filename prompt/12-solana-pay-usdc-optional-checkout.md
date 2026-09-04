# Prompt 12 - Payments: Solana Pay / USDC Optional Checkout

You are building **TradeHub Stage 12**. Stages 01-11 already created the Next.js scaffold, locked design system, typed domain layer, marketing flow, Firebase auth + role routing, Super Admin CRM, influencer onboarding, influencer dashboard, Course Hub, student app shell, and live **Paystack subscription checkout**.

Your job now is to add the investor-requested secondary rail: **optional Solana Pay / USDC checkout**.

This stage must **extend** Stage 11, not replace it.

Paystack remains the default rail.
Solana Pay remains optional, approved-workspace-only, and visually restrained.

Build on the current codebase. Do not remove Stage 05 auth, Stage 06 Admin SDK boundaries, Stage 07 onboarding, Stage 08 workspace APIs, Stage 09 course APIs, Stage 10 student shell, or Stage 11 Paystack billing. Do not open Firestore rules. Do not move protected data reads/writes into client Firestore queries.

This stage should answer the product question:

**"How does a student safely pay in USDC through Solana for an approved TradeHub workspace, while TradeHub verifies the payment server-side and keeps subscription state honest?"**

---

## Current Verified State

Stage 11 already established:

- Student billing UI inside `/app/billing`.
- Server-side Paystack checkout creation.
- Server-side Paystack callback verification.
- Idempotent Paystack webhook handling.
- Payment intent + subscription persistence through Admin SDK only.
- A real workspace billing tier model with per-tier `paystackPlanCode` support.

The repo already includes Solana placeholders:

- workspace-level Solana interest/readiness,
- a public Solana payout wallet onboarding step,
- `SolanaPaymentIntent` type placeholders,
- Solana env placeholders in `.env.example`,
- marketing/admin/workspace copy that treats Solana as optional.

What does **not** exist yet:

- real Solana checkout creation,
- real Solana quote generation,
- real on-chain payment verification,
- live student Solana billing UI,
- live Solana subscription activation path.

Do not rewrite Stage 11. Build Stage 12 as the Solana extension layer.

---

## Read First

Before writing code, read these repository files:

- `files/tradehub-01-overview.md`
- `files/tradehub-02-features.md`
- `files/tradehub-03-tech.md`
- `files/tradehub-04-design.md`
- `files/tradehub-05-policies.md`
- `files/tradehub-06-setup.md`
- `files/tradehub-07-security-review.md`
- `asset/tradehub-colors.html`
- `prompt/07-influencer-onboarding-wizard.md`
- `prompt/08-influencer-dashboard-and-management.md`
- `prompt/10-student-mobile-app-shell.md`
- `prompt/11-payments-paystack-subscriptions.md`
- `prompt/promptsumary.md`
- `.env.example`
- `README.md`
- `package.json`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/payments.ts`
- `src/types/workspace.ts`
- `src/types/onboarding.ts`
- `src/config/env.ts`
- `src/lib/firebase/*`
- `src/lib/billing/*`
- `src/lib/workspace/*`
- `src/app/api/student/billing/*`
- `src/app/api/admin/payments/overview/route.ts`
- `src/app/api/workspace/billing/overview/route.ts`
- `src/app/(student)/app/billing/*`
- `src/components/billing/*`
- `src/components/onboarding/solana-wallet-step.tsx`
- `src/components/workspace/workspace-overview.tsx`
- `src/components/admin/payment-rail-overview.tsx`
- `src/components/ui/*`

Also check the current official documentation before implementing anything Solana-specific:

- Solana Pay docs
- `@solana/pay`
- `@solana/web3.js`
- SPL Token / USDC transfer verification guidance
- current cluster + USDC mint requirements for the network you choose

Treat `files/tradehub-03-tech.md`, `files/tradehub-06-setup.md`, and `files/tradehub-07-security-review.md` as the backend/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat Stage 11 billing as live product foundation that must remain intact.

---

## Stage Goal

At the end of this stage:

- The student billing surface supports **Paystack first** and **optional Solana Pay / USDC**.
- Solana only appears for workspaces that are explicitly ready and approved.
- A student can request a Solana checkout quote for a workspace tier.
- TradeHub creates a server-side `rail: "solana"` payment intent with:
  - NGN amount,
  - USDC quote,
  - FX rate snapshot,
  - reference,
  - expiry,
  - platform wallet,
  - workspace payout wallet,
  - split accounting.
- The UI can show a Solana Pay URL / QR and a clear pending state.
- TradeHub verifies the on-chain payment **server-side** using RPC and reference-based lookup.
- Verified Solana payments safely update the student subscription path through Admin SDK only.
- Solana verification is idempotent.
- Workspace/Admin payment views show useful Solana state without broad collection scans.
- Missing-config states are honest and controlled.
- Prompt 13+ can build on this without rewriting billing again.

---

## Important Product Decision

For this MVP stage, prefer the **safe platform-collect pattern**:

- the student pays USDC to the **platform Solana wallet**,
- TradeHub records the influencer share and platform share in the payment intent,
- the workspace public payout wallet remains part of readiness + accounting,
- but TradeHub does **not** pretend it already supports automatic on-chain multi-recipient settlement unless that is truly implemented and fully verified.

In other words:

- keep the 90/10 split model in records,
- verify the public workspace payout wallet exists for approved Solana workspaces,
- but do not fake automatic influencer settlement if the code does not really execute it.

If you discover a clean, well-supported, wallet-compatible multi-output Solana Pay pattern and can verify it rigorously, you may use it.
Otherwise, stay with the safer platform-collect model.

Do not lie in the UI either way.

---

## What This Stage Should NOT Do

Do **not**:

- replace Paystack as the default rail,
- remove or weaken Stage 11 Paystack flows,
- build a custodial wallet product,
- collect or store wallet private keys,
- collect or store seed phrases,
- collect Phantom/Solflare exports,
- trust a client-submitted signature without server verification,
- trust a browser redirect as proof of payment,
- use client Firestore reads/writes for protected billing data,
- enable `allow read, write: if true`,
- add Telegram delivery,
- add broker/exchange credential collection,
- add real Auto-Copy execution,
- add background workers or Cloud Functions just to make this stage work,
- depend on a browser wallet adapter if a Solana Pay URL / QR flow is enough,
- silently enable Solana for every workspace,
- claim Solana is live when env/config is missing,
- invent fake "automatic split payout" language if only platform collection exists.

Keep the scope to **optional USDC checkout, server verification, and honest subscription state**.

---

## Required Setup From Owner

Prompt 12 should still implement safe UI/API behavior even if all live Solana setup is not present yet.

For real end-to-end Solana proof, the owner may need:

```text
NEXT_PUBLIC_SOLANA_NETWORK=devnet
SOLANA_RPC_URL=
SOLANA_USDC_MINT=
PLATFORM_SOLANA_USDC_WALLET=
SOLANA_PAYMENT_QUOTE_TTL_SECONDS=900
SOLANA_USDC_NGN_FX_RATE=
```

Notes:

- Start on `devnet` first.
- `SOLANA_RPC_URL` must stay server-only.
- `PLATFORM_SOLANA_USDC_WALLET` is the platform receiving wallet for this stage.
- `SOLANA_USDC_MINT` must match the selected network.
- `SOLANA_PAYMENT_QUOTE_TTL_SECONDS` controls quote expiry.
- `SOLANA_USDC_NGN_FX_RATE` is a deterministic fallback so local/dev proof does not depend entirely on a third-party price API.

If you optionally add a live FX quote source later, keep the env fallback and keep the quote logic server-side.

Update `.env.example` and `src/config/env.ts` if needed, but do not commit real secrets or live wallets unless they are intentionally public receiving addresses.

---

## Required Architecture

Follow the same secure pattern already used in Stage 11:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls /api/student/billing/solana/*
  -> API route verifies token with Firebase Admin SDK
  -> API route confirms role === "student"
  -> API route scopes all work to token.workspaceId and token.studentId
  -> API route uses server-side Solana/RPC logic only
```

Verification flow:

```text
Student starts Solana checkout
  -> TradeHub creates a pending Solana payment intent
  -> TradeHub returns Solana Pay URL + quote details
  -> student pays in wallet
  -> TradeHub verifies the transaction server-side by reference/signature/RPC
  -> TradeHub updates payment intent + subscription if valid
```

Do not rely on:

- client-side wallet claims alone,
- client-side localStorage,
- client-side transaction parsing,
- client-side Firestore writes,
- broad scans across unrelated workspace data.

---

## Suggested Route Structure

Keep `/app/billing` as the entry point.

Add a clean Solana path such as:

- `POST /api/student/billing/solana/checkout`
- `GET /api/student/billing/solana/verify?...`
- optional `GET /api/student/billing/solana/intent/[paymentIntentId]`
- optional student status page like `/app/billing/solana/[paymentIntentId]`

You may choose a slightly different route layout if it matches the current repo patterns better, but keep the surface obvious and consistent with Stage 11 billing.

Do not break:

- `/api/student/billing/overview`
- `/api/student/billing/checkout`
- `/api/student/billing/verify`
- `/app/billing`
- `/app/billing/callback`

---

## Firestore Shape For This Stage

Reuse the existing bounded billing shape.

Payment intents already live under:

```text
/workspaces/{workspaceId}/payment_intents/{paymentIntentId}
```

For Solana intents, make the `rail: "solana"` record real and usable:

```ts
{
  paymentIntentId: string;
  rail: "solana";
  workspaceId: string;
  studentId: string;
  tierId: string;
  status: "pending" | "verified" | "expired" | "failed" | "cancelled" | "abandoned";
  amountNgn: number;
  amountUsdc: number;
  fxRateSnapshot: number;
  reference: string;
  platformWallet: string;
  influencerWallet: string;
  split: {
    platformPercent: number;
    influencerPercent: number;
    platformAmountUsdc?: number;
    influencerAmountUsdc?: number;
  };
  quoteExpiresAt: string;
  expiresAt: string;
  verifiedAt?: string;
  verifiedSignature?: string;
  solanaNetwork: string;
  usdcMint: string;
  failureReason?: string;
  createdAt: string;
}
```

Student subscription state remains:

```text
/workspaces/{workspaceId}/students/{studentId}/subscriptions/current
```

Expand it safely so the subscription can reflect either rail honestly:

```ts
rail: "paystack" | "solana";
```

Add Solana-specific fields only if needed, for example:

- `latestSignature`
- `latestReference`
- `lastVerifiedAt`
- `currentPeriodStart`
- `currentPeriodEnd`

Do not create a needlessly wide payment schema.

---

## Workspace Eligibility Rules

Solana checkout should only be available when all of these are true:

- workspace is approved/usable,
- workspace has Solana rail status enabled or equivalent approved state,
- workspace has a valid public payout wallet stored,
- platform Solana wallet is configured,
- USDC mint is configured,
- quote source / FX fallback is available,
- student is properly authenticated,
- selected tier is valid for checkout.

If not ready:

- the student UI should explain that Solana is not available for this workspace,
- the API should return a controlled error,
- the page should not fake a live Solana button.

---

## Billing UI Requirements

Extend the existing billing UI rather than replacing it.

Student experience should support:

1. **Paystack first**
   - still visible,
   - still default,
   - still working exactly as before.

2. **Optional Solana card/rail**
   - visible only when eligible,
   - clearly marked as USDC,
   - clearly secondary to Paystack.

3. **Quote display**
   - NGN tier amount,
   - USDC quote,
   - expiry time,
   - readiness / warning copy.

4. **Payment action**
   - generate Solana Pay URL / QR,
   - give a copyable reference,
   - provide a clear "verify payment" action,
   - optionally short polling while the page stays open.

5. **Verification result**
   - pending,
   - verified,
   - expired,
   - wrong amount / wrong mint / wrong recipient / not found,
   - all shown as controlled UI states.

The screen must work on:

- phone width,
- tablet width,
- desktop width.

Do not make Solana the visual headline of the billing screen.

---

## Admin + Workspace Visibility

Add only bounded, useful visibility:

- workspace billing overview should show Solana readiness,
- workspace billing overview can show recent Solana intents,
- admin payment overview should include Solana warnings / verified volume,
- do not scan all historical records for totals if a summary doc or bounded page is enough.

If you need a summary doc, keep it lightweight and update it only at explicit billing state transitions.

---

## Verification Rules

Server-side Solana verification must check at least:

- the payment intent exists,
- it belongs to the signed-in student + workspace,
- it has not already been verified with the same signature,
- it is not already expired,
- the transaction references the expected Solana reference,
- the recipient wallet matches the expected platform wallet,
- the token mint matches configured USDC,
- the transferred amount is at least the quoted amount,
- the network/RPC cluster matches the configured environment.

Prefer finalized/confirmed transaction verification that is appropriate for the chosen RPC flow.

Do not accept payment based only on:

- a pasted signature,
- a client boolean,
- a query param,
- an unverified wallet event,
- a screenshot from a wallet.

---

## FX / Quote Behavior

TradeHub tiers are priced in NGN, so Stage 12 must produce a USDC quote.

Required behavior:

- quote generation is server-side,
- the quote is snapshot-based and stored on the payment intent,
- the quote expires after a bounded TTL,
- verification uses the stored quote snapshot,
- the UI explains when the quote has expired.

For MVP safety, support a deterministic env fallback:

```text
SOLANA_USDC_NGN_FX_RATE=
```

If you optionally add a live quote provider:

- keep it server-side only,
- keep the env fallback,
- fail gracefully when the provider is unavailable,
- do not make local development impossible without the provider.

---

## Security Constraints

Never:

- store private wallet keys,
- store seed phrases,
- store exchange API keys,
- put `SOLANA_RPC_URL` in client bundles,
- trust client-provided wallet metadata without server verification,
- weaken Firestore rules,
- move billing reads/writes into browser Firestore SDK calls.

If you add Solana packages, keep them minimal and server-appropriate.

Do not overbuild a wallet connection system if a Solana Pay URL / QR + server verification is enough for MVP.

---

## Expected Deliverables

At minimum, expect changes in areas like:

- `.env.example`
- `README.md`
- `src/config/env.ts`
- `src/types/payments.ts`
- `src/lib/billing/*`
- optional `src/lib/solana/*`
- `src/app/api/student/billing/*`
- `src/app/api/admin/payments/overview/route.ts`
- `src/app/api/workspace/billing/overview/route.ts`
- `src/components/billing/*`
- optional `src/app/(student)/app/billing/solana/*`

Keep the file structure consistent with the existing repo patterns.

---

## Manual Proof Checklist

Before you declare Stage 12 done, prove all of this:

### Core checks

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run dev`

### Signed-out safety

Confirm signed-out calls return `401`:

- `GET /api/student/billing/overview`
- `POST /api/student/billing/solana/checkout`
- `GET /api/student/billing/solana/verify?...`

### Config-aware safety

Confirm:

- missing Solana env returns a clear `503 solana_not_configured` (or equally explicit code),
- workspace without approved Solana readiness does not expose misleading live checkout,
- expired quote returns a controlled failure state,
- fake / unknown payment intent returns a controlled `404` or equivalent,
- fake / unverified transaction does not activate the subscription.

### Live UI checks

Confirm:

- `/app/billing` still renders with Paystack intact,
- Solana UI appears only when eligible,
- quote details render,
- Solana verify state renders without crashing,
- responsive layout works on desktop + phone widths.

### Optional real devnet proof

If the owner provides real devnet config and a test wallet, prove:

1. sign in as a student,
2. open `/app/billing`,
3. start Solana checkout,
4. open/scan the Solana Pay request,
5. complete payment,
6. verify the payment server-side,
7. confirm the subscription becomes active,
8. confirm workspace/admin billing surfaces reflect the verified Solana record.

If live devnet payment is not possible, say exactly which owner-side setup is still missing.

---

## Final Output Format

When you finish implementation, report back with:

1. dev server URL,
2. first route to inspect,
3. key files changed,
4. exact PASS/FAIL proof checklist,
5. what is still waiting on owner setup,
6. whether Prompt 13 can start without rewriting billing.

Be honest.

If Solana live proof was not possible, say that clearly.

Do not claim end-to-end success unless it was actually verified.
