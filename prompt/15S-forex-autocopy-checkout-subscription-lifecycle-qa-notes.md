# Stage 15S - Forex AutoCopy Checkout + Subscription Lifecycle Gate QA Notes

Stage 15S connects Forex AutoCopy provisioning to a TradeHub-managed add-on checkout lifecycle.

## What Changed

- Student Forex AutoCopy checkout opens through Paystack from `/app/copier`.
- Checkout requires `PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE`; when it is missing, the server returns a safe configuration error before creating a payment intent or calling Paystack.
- Paystack return references are verified by `/api/student/forex-execution/subscription/verify`.
- Verified payment writes `/workspaces/{workspaceId}/students/{studentId}/forex_autocopy_subscriptions/current` with `status: active_paid`.
- Non-active states remain locked:
  - `payment_pending`
  - `payment_failed`
  - `past_due`
  - `cancelled`
  - `expired`
- Cancelling Forex AutoCopy disables active mock provisioning records through the dry-run cleanup path.
- Workspace and Super Admin previews show bounded add-on payment/provisioning state with masked references only.

## Commands

```bash
npm run stage15r:qa
npm run stage15s:qa
npm run firebase:rules:test
```

If the Firestore emulator wrapper cannot start because port `8080` is already in use:

```bash
env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore-rules-stage15f.test.mjs
```

## Configuration

```text
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE=PLN_your_forex_autocopy_plan_code
PAYSTACK_FOREX_AUTOCOPY_CHECKOUT_EMAIL=
FOREX_AUTOCOPY_PRICE_NGN=25000
```

The Forex AutoCopy plan must be a dedicated Paystack test-mode recurring plan for the add-on, such as monthly NGN 25,000. Do not reuse the ordinary course/membership plan code.
`PAYSTACK_FOREX_AUTOCOPY_CHECKOUT_EMAIL` is optional; local emulator test checkout automatically avoids seeded `.test` fixture emails so Paystack can initialize the checkout.

## Manual Student QA

1. Sign in as a Stage 15 fixture student.
2. Open `/app/copier`.
3. Confirm unpaid Forex AutoCopy shows a locked state and purchase CTA.
4. Start Forex AutoCopy checkout.
5. Complete Paystack test checkout.
6. Return to `/app/copier?forexReference=<reference>`.
7. Confirm payment verifies to `active_paid`.
8. Confirm MT4/MT5 broker provisioning form unlocks.
9. Submit broker details and confirm the password is cleared and never shown.
10. Cancel Forex AutoCopy billing and confirm provisioning is disabled.

## Manual Influencer QA

- Open `/workspace`.
- Confirm Forex AutoCopy shows counts only:
  - paid students;
  - payment pending;
  - payment failed;
  - ready to connect;
  - mock provisioned;
  - disabled/failed.
- Confirm no broker login/password/server, MetaAPI token/account ID, vault ref, provider ref, or raw payment payload appears.

## Manual Super Admin QA

- Open `/admin`.
- Load `ws_stage15f_paper_beta`.
- Confirm Forex AutoCopy payment/provisioning ops are visible as bounded support-safe records.
- Confirm mock cleanup/audit events appear after cancellation.
- Confirm no raw broker credentials, MetaAPI tokens, vault refs, raw payment payloads, or provider payloads appear.

## Deferred

- Real MetaAPI account creation.
- MetaAPI terminal deployment.
- Forex demo/live execution for unpaid or unprovisioned students.
- Production/live forex order execution.
- Telegram signal ingestion.
