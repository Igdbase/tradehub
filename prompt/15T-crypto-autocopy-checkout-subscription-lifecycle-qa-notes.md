# Stage 15T - Crypto AutoCopy Checkout + Subscription Lifecycle Gate QA Notes

Stage 15T makes Crypto AutoCopy a separate TradeHub-managed paid add-on, parallel to Forex AutoCopy.

## What Changed

- Student Crypto AutoCopy checkout opens through Paystack from `/app/copier`.
- Checkout requires `PAYSTACK_CRYPTO_AUTOCOPY_PLAN_CODE`; when it is missing, the server returns a safe configuration error before creating a payment intent or calling Paystack.
- Paystack return references are verified by `/api/student/crypto-execution/subscription/verify`.
- Verified payment writes `/workspaces/{workspaceId}/students/{studentId}/crypto_autocopy_subscriptions/current` with `status: active_paid`.
- Binance/Bybit setup, crypto AutoCopy preference changes, production consent, and crypto paper routing require active paid Crypto AutoCopy billing in addition to Stage 16 entitlement.
- Existing exchange connection metadata is not sufficient for routing when Crypto AutoCopy billing is inactive.
- Cancelling Crypto AutoCopy locks exchange setup and future routing without deleting historical support-safe records.

## Commands

```bash
npm run stage15t:qa
npm run typecheck
npm run lint
npm run build
```

## Configuration

```text
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYSTACK_CRYPTO_AUTOCOPY_PLAN_CODE=PLN_your_crypto_autocopy_plan_code
PAYSTACK_CRYPTO_AUTOCOPY_CHECKOUT_EMAIL=
CRYPTO_AUTOCOPY_PRICE_NGN=25000
```

The Crypto AutoCopy plan must be a dedicated Paystack test-mode recurring plan for the add-on, such as monthly NGN 25,000. Do not reuse the ordinary course/membership plan code or the Forex AutoCopy plan code.

## Manual Student QA

1. Sign in as a Stage 15 fixture student with AutoCopy entitlement.
2. Open `/app/copier`.
3. Confirm Crypto AutoCopy billing shows a locked state and purchase CTA.
4. Start Crypto AutoCopy checkout.
5. Complete Paystack test checkout.
6. Return to `/app/copier?cryptoReference=<reference>`.
7. Confirm payment verifies to `active_paid`.
8. Confirm Binance/Bybit connection setup and crypto AutoCopy controls unlock.
9. Cancel Crypto AutoCopy billing.
10. Confirm setup and routing gates lock again.

## Deferred

- Real production crypto live trading beyond the canary boundary.
- New exchange order placement behavior.
- Crypto AutoCopy bundles or combined Forex/Crypto pricing.
- Automatic Paystack webhook lifecycle mapping for Crypto AutoCopy renewal events.
