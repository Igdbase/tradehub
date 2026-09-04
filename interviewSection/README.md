# TradeHub Interview Study Guide

Use this file as your one-hour cram sheet before the sponsor interview.

## 1. One-Sentence Positioning

TradeHub is a multi-tenant white-label platform for trading educators: branded onboarding, billing, courses, signals, and student access in one product.

## 2. What Is Actually Built Now

These are safe claims you can make:

- Super admin onboarding CRM is built.
- Influencer workspace onboarding is built.
- Influencer course publishing is built.
- Student app shell, courses, signals, copier, journal, and billing surfaces are built.
- Paystack test checkout is working end-to-end.
- Paystack callback verification is working end-to-end.
- Solana / USDC is optional, not default.
- Solana quote creation is working.
- Solana local on-chain verification is working.
- Verified Solana payments create a settlement-ledger record for the 90 / 10 split.
- The app is locally verified, not yet publicly deployed as a production app.

## 3. The Honest Production Truth

### Stage 11 — Paystack

This is real and production-shaped.

- Student checkout is created server-side.
- Paystack callback is verified server-side.
- Webhook signature validation exists.
- Subscription access is updated after verification.

For real production, you replace:

- `PAYSTACK_SECRET_KEY` with a live secret key
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` with a live public key
- `PAYSTACK_DEFAULT_MONTHLY_PLAN_CODE` with a real live plan code if needed
- localhost callback / webhook setup with your deployed public URL

### Stage 12 — Solana

This is real, but the current production truth is:

- The student can use an optional USDC rail.
- TradeHub creates the Solana Pay request server-side.
- TradeHub verifies the payment server-side.
- The platform wallet receives the USDC today.
- TradeHub records the influencer 90% share in a settlement ledger.
- TradeHub does **not** auto-send the influencer share on-chain yet.

That means it is production-usable only if you are okay with:

- platform-collect first
- later payout / settlement ops for the influencer share

It is **not** honest to say:

- "Solana already auto-splits the money on-chain."

## 4. What Stack / Languages / Tools Did We Use?

### Core app stack

- Next.js 14 App Router
- TypeScript
- React 18
- Tailwind CSS

### Auth / data

- Firebase Authentication
- Firestore
- Firebase Admin SDK on the server

### Payment rails

- Paystack API
- Solana Pay request flow
- `@solana/web3.js`
- `@solana/spl-token`

### Why this stack?

- Next.js + TypeScript gave fast product iteration with clear route structure.
- Firebase Auth made role-gated access simple for admin, influencer, and student surfaces.
- Firestore fit the multi-tenant document model well.
- Paystack is the right local rail for Nigeria-first launch.
- Solana is the optional borderless USDC rail for approved workspaces.

## 5. The Exact Code Map

### Student billing UI

- [`src/components/billing/student-billing-client.tsx`](../src/components/billing/student-billing-client.tsx)

### Paystack server logic

- [`src/lib/billing/billing-repository.ts`](../src/lib/billing/billing-repository.ts)
- [`src/lib/paystack/paystack-client.ts`](../src/lib/paystack/paystack-client.ts)
- [`src/app/api/paystack/webhook/route.ts`](../src/app/api/paystack/webhook/route.ts)
- [`src/lib/paystack/paystack-webhook.ts`](../src/lib/paystack/paystack-webhook.ts)
- [`src/app/(student)/app/billing/callback/page.tsx`](../src/app/(student)/app/billing/callback/page.tsx)

### Solana server logic

- [`src/lib/solana/solana-client.ts`](../src/lib/solana/solana-client.ts)
- [`src/lib/billing/billing-repository.ts`](../src/lib/billing/billing-repository.ts)
- [`src/app/api/student/billing/solana/checkout/route.ts`](../src/app/api/student/billing/solana/checkout/route.ts)
- [`src/app/api/student/billing/solana/verify/route.ts`](../src/app/api/student/billing/solana/verify/route.ts)

### Admin visibility

- [`src/app/api/admin/payments/overview/route.ts`](../src/app/api/admin/payments/overview/route.ts)
- [`src/components/admin/payment-rail-overview.tsx`](../src/components/admin/payment-rail-overview.tsx)
- [`src/components/admin/solana-settlement-ledger.tsx`](../src/components/admin/solana-settlement-ledger.tsx)

### Local Solana helper scripts

- [`scripts/configure-local-solana.mjs`](../scripts/configure-local-solana.mjs)
- [`scripts/send-local-solana-test-payment.mjs`](../scripts/send-local-solana-test-payment.mjs)

## 6. How Paystack Works In TradeHub

Tell it simply:

1. Student chooses a tier in `/app/billing`.
2. TradeHub creates a `payment_intent` in Firestore.
3. TradeHub initializes checkout server-side with Paystack.
4. Paystack sends the student to pay.
5. Paystack returns to `/app/billing/callback`.
6. TradeHub verifies the reference server-side.
7. Subscription access is updated.
8. Webhooks also exist for server-side reconciliation.

Safe line to say:

> "We do not trust the browser as proof of payment. The callback only triggers server-side verification."

## 7. How Solana Works In TradeHub

Tell it simply:

1. Student opens `/app/billing`.
2. If the workspace is approved for Solana, the optional USDC rail appears.
3. Student selects a tier.
4. TradeHub creates a Solana quote server-side.
5. The quote includes:
   - NGN amount
   - USDC amount
   - expiry
   - reference
   - platform wallet
   - workspace payout wallet
   - split accounting metadata
6. Student pays the platform wallet in USDC.
7. TradeHub verifies the transaction server-side by reference.
8. TradeHub updates the student's subscription.
9. TradeHub writes a settlement-ledger record showing the influencer's 90% due.

Safe line to say:

> "The current Solana MVP is platform-collect plus server-side verification plus settlement-ledger accounting."

## 8. How We Tested Solana Locally

This is the exact local story.

### Environment used

- Local Solana validator
- Local SPL token mint behaving like test USDC
- Local platform wallet
- Local influencer payout wallet
- Real TradeHub app flow creating the quote

### Local test flow

1. Start local validator.
2. Configure Solana CLI to localhost.
3. Airdrop local SOL.
4. Create a local token mint with 6 decimals.
5. Mint test token balance.
6. Put local Solana env values into `.env.local`.
7. Mark the workspace Solana-ready.
8. Sign in as the student.
9. Open `/app/billing`.
10. Create a Solana quote.
11. Send the token payment.
12. Verify the payment from the app.
13. Confirm:
    - subscription updated
    - verified state shown in the UI
    - settlement ledger entry shown in admin

### Useful commands

```bash
npm run dev:reset
npm run firebase:configure-local-solana -- --workspace ws_idris --payout-wallet <PUBKEY> --platform-split 10
npm run solana:test:pay -- --workspace ws_idris --reference <REFERENCE>
```

### Important note

We tested this on local validator because free devnet funding can be unreliable. That does **not** reduce the validity of the integration logic; it just makes local repeatable testing possible.

## 9. What Must Change For Real Production

### Paystack production checklist

- deploy the app to a public domain
- use live Paystack keys
- use live Paystack plan code(s)
- configure live callback URL
- configure live webhook URL
- verify subaccount / split setup for payouts
- confirm production webhook signature verification

### Solana production checklist

- use a real production RPC endpoint
- use the real USDC mint for the target network
- use a real platform receiving wallet
- ensure each approved workspace has a public payout wallet
- decide payout ops model:
  - manual settlement from ledger, or
  - later automated payout
- monitor quote expiry, verification failures, and settlement status

## 10. Best Short Answers To Hard Questions

### "What languages and tools did you use?"

> "Next.js 14, TypeScript, React, Tailwind, Firebase Auth, Firestore through the Admin SDK, Paystack APIs, and Solana web3.js plus SPL Token utilities."

### "How exactly did you integrate Solana?"

> "TradeHub creates Solana quotes server-side, builds a Solana Pay request with a reference, verifies the on-chain payment server-side, updates the subscription, and records the 90 / 10 split in a settlement ledger."

### "Is Solana the default rail?"

> "No. Paystack is the default rail for the Nigeria-first launch. Solana is the optional USDC rail for approved workspaces."

### "Does Solana already auto-pay the influencer?"

> "Not yet. The platform wallet receives the payment now, and TradeHub records the influencer share cleanly in a settlement ledger for payout ops."

### "Why is that still okay?"

> "Because accounting truth comes before payout automation. We built the verified accounting layer first so the payout logic can be trusted."

### "Is this all just mock data?"

> "No. The current app still has some non-critical placeholder surfaces, but Paystack checkout and Solana verification were both tested through the real implemented flows."

### "Why did you choose Paystack first?"

> "Because Nigeria-first launch needs the most trusted local rail. Solana is strategically important as the borderless optional rail, but Paystack is the most practical default for the launch market."

### "What is still missing before real production?"

> "Public deployment, ops hardening, live monitoring, and first real paying workspaces. The architecture and payment flows are already shaped for that move."

## 11. Demo Routes To Memorize

- `/admin`
- `/workspace`
- `/workspace/onboarding`
- `/workspace/courses`
- `/app`
- `/app/courses`
- `/app/billing`
- `/app/billing/callback`

## 12. What To Say If They Ask About Safety

> "Client Firestore rules stay locked. Sensitive payment verification is server-side. Browser redirects are never trusted as proof of payment. Solana verification checks the reference and on-chain transaction details before access changes."

## 13. Official Links You Can Mention

### Solana

- Solana Pay spec: https://docs.solanapay.com/spec
- Solana Pay merchant transfer request: https://docs.solanapay.com/core/transfer-request/merchant-integration
- Solana RPC `getSignaturesForAddress`: https://solana.com/docs/rpc/http/getsignaturesforaddress
- Solana RPC `getTransaction`: https://solana.com/docs/rpc/http/gettransaction

### Paystack

- Paystack subscriptions: https://paystack.com/docs/payments/subscriptions/

## 14. One Final Reminder

For the Solana sponsor interview, your strongest posture is:

- be honest
- show what is real
- do not overclaim production
- explain why Paystack is the local-first rail
- explain why Solana is the scalable second rail
- show that you already tested the hard part locally
