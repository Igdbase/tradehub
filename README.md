# TradeHub Stage 14

TradeHub is a premium multi-tenant white-label SaaS platform for trading educators. Stage 14 is the MVP hardening pass: Paystack remains the default rail, optional Solana Pay / USDC remains settlement-ledger based, student journal summaries stay privacy-first, trust/safety stays bounded and auditable, policy pages are product-honest, and protected routes still run through server-side verified API boundaries while Firestore client rules stay locked.

## Included In This Stage

### Prompt 14 Hardening

- Student journal copy, privacy posture, and zero-safe summary behavior are now clearer and consistent between student home and `/app/journal`.
- Super Admin trust/safety now has production-shaped empty states, grouped counts, and protected CSV export with spreadsheet-formula sanitization.
- Public policy pages now reflect the real MVP product instead of stage-placeholder wording.
- Security headers now include a practical CSP posture without breaking current Paystack or YouTube flows.
- Responsive wrapping and overflow safety were tightened for policy pages, route headers, badges, and action chips.


- Next.js 14 App Router, TypeScript, Tailwind CSS, and locked TradeHub theme tokens.
- Firebase Email/Password login, auth provider, role gates, `/login`, and `/access-pending`.
- Server-only Firebase Admin SDK helpers for ID-token verification and Firestore access.
- `/admin`, `/workspace/onboarding`, `/workspace`, and the Stage 09 Course Hub from earlier stages.
- `/app` live student home using verified `/api/student/app/overview` data.
- `/app/courses` and `/app/courses/[courseId]` integrated into the responsive student shell.
- `/app/signals` published signal feed with prop-firm-safe mode language.
- `/app/copier` safe copier status surface with no broker or exchange secret collection.
- `/app/journal` privacy-aware journal summary shell.
- `/app/billing` Paystack-first subscription lifecycle status with optional Solana Pay / USDC quote flow for approved workspaces.
- `/app/billing/callback` Paystack reference verification callback.
- Server-side Paystack transaction initialize, verify, and webhook receipt processing.
- Admin-only Paystack reconcile action for pending or ambiguous intents.
- Server-side Solana quote creation, Solana Pay URL generation, RPC transaction verification, subscription activation, and settlement-ledger recording for operator-managed payout ops.
- Admin-only Solana settlement state updates for `pending_payout`, `settled`, and `cancelled`.
- Super Admin and influencer payment-readiness and recent-activity billing surfaces.
- Firestore rules remain locked to clients with `allow read, write: if false;`.

## Routes

- `/`
- `/login`
- `/access-pending`
- `/admin`
- `/workspace`
- `/workspace/onboarding`
- `/workspace/courses`
- `/workspace/courses/[courseId]`
- `/app`
- `/app/courses`
- `/app/courses/[courseId]`
- `/app/signals`
- `/app/copier`
- `/app/journal`
- `/app/billing`
- `/app/billing/callback`
- `/join/[handle]`
- `/design-system`
- `/terms`
- `/privacy`
- `/risk-disclosure`
- `/data-use`

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and keep it out of git. Public Firebase web config uses `NEXT_PUBLIC_FIREBASE_*`. Admin SDK credentials are server-only:

```text
SUPER_ADMIN_EMAIL=
INFLUENCER_EMAIL=
INFLUENCER_WORKSPACE_ID=
STUDENT_EMAIL=
STUDENT_WORKSPACE_ID=
STUDENT_TIER_ID=all
FIREBASE_SERVICE_ACCOUNT_KEY=
GOOGLE_APPLICATION_CREDENTIALS=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_DEFAULT_MONTHLY_PLAN_CODE=
NEXT_PUBLIC_SOLANA_NETWORK=devnet
SOLANA_RPC_URL=
SOLANA_USDC_MINT=
PLATFORM_SOLANA_USDC_WALLET=
SOLANA_PAYMENT_QUOTE_TTL_SECONDS=900
SOLANA_USDC_NGN_FX_RATE=
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

If the UI suddenly loads without styling, the usual cause is a stale `.next` cache after switching between `next dev` and `next build`. Reset the dev cache and restart:

```bash
npm run dev:reset
```

Avoid keeping an old `next dev` session alive after running `npm run build`.

## Paystack Test Mode Setup

Use Paystack test keys first:

```text
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_DEFAULT_MONTHLY_PLAN_CODE=
```

Notes:

- `PAYSTACK_SECRET_KEY` stays server-only.
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is safe for browser display/readiness checks, but checkout is initialized server-side.
- `PAYSTACK_WEBHOOK_SECRET` can be omitted if you want webhook verification to use the Paystack secret key.
- `PAYSTACK_DEFAULT_MONTHLY_PLAN_CODE` is optional and helps demo a monthly tier before each workspace tier has its own `paystackPlanCode`.
- Localhost cannot receive Paystack webhooks directly. Use a tunnel such as ngrok only for local webhook testing, or configure the production URL later.

Workspace tiers can also store `paystackPlanCode` directly under:

```text
/workspaces/{workspaceId}.tiers[].paystackPlanCode
```

## Solana Devnet Setup

Solana Pay is optional and only appears to students when the workspace and server are both ready:

```text
NEXT_PUBLIC_SOLANA_NETWORK=devnet
SOLANA_RPC_URL=
SOLANA_USDC_MINT=
PLATFORM_SOLANA_USDC_WALLET=
SOLANA_PAYMENT_QUOTE_TTL_SECONDS=900
SOLANA_USDC_NGN_FX_RATE=
```

Workspace readiness also requires:

```text
/workspaces/{workspaceId}.solanaPayEnabled=true
/workspaces/{workspaceId}.solanaPayoutWallet=<public wallet only>
/workspaces/{workspaceId}.rails[].rail="solana"
/workspaces/{workspaceId}.rails[].status="enabled"
```

Stage 13 keeps the safe platform-collect MVP:

- The student pays configured USDC to `PLATFORM_SOLANA_USDC_WALLET`.
- The payment intent records platform and influencer split accounting.
- A verified Solana payment writes a settlement ledger record for payout ops.
- The workspace payout wallet is verified as a public destination for later settlement.
- Admin can mark settlement records as pending, settled, or cancelled with a bounded note/reference.
- TradeHub does not collect private keys, seed phrases, broker credentials, or wallet exports.
- TradeHub does not claim automatic on-chain split payout yet.

## Required Claims

Student app access requires:

```json
{
  "role": "student",
  "workspaceId": "ws_example"
}
```

The student API uses the Firebase UID as the default student document ID unless a `studentId` custom claim exists.

## Bootstrap Helpers

Operator bootstrap scripts:

```bash
npm run firebase:bootstrap-super-admin
npm run firebase:bootstrap-influencer
npm run firebase:bootstrap-student
```

The student bootstrap:

- assigns `{ role: "student", workspaceId, studentId, tierId }` custom claims,
- ensures `/workspaces/{workspaceId}/students/{studentId}` exists,
- uses the Firebase UID as `studentId` unless one already exists in claims.

## Stage 15H Sandbox/Testnet Crypto Execution

Stage 15H proves the Binance/Bybit order lifecycle against sandbox/testnet records only. Production live trading remains disabled, and `CRYPTO_EXECUTION_LIVE_ENABLED` does not enable production order placement.

Use emulator-safe fixtures:

```bash
npm run stage15h:seed
npm run stage15h:qa
```

Run Firestore denial tests:

```bash
npm run firebase:rules:test
```

Optional real sandbox/testnet exchange calls require:

```text
CRYPTO_EXECUTION_TESTNET_ORDERS_ENABLED=true
```

The live-sandbox worker still rejects production exchange connections and only processes `ready_for_live` intents with `executionMode: live_sandbox` and `environment: sandbox`.

## Stage 15I Production Live Beta Gate

Stage 15I adds a tiny production live beta gate for TradeHub-published crypto signals only. It is disabled and dry-run by default. External master-trader account ingestion, forex, leverage, margin, futures, OCO, TP/SL automation, and broad production rollout remain deferred.

## Stage 15L Production Credential Vault And Canary

Stage 15L adds a Google Cloud Secret Manager credential-vault mode and a separate Super-Admin production canary path. This is not broad production Auto-Copy.

Production credential storage requires:

```text
CRYPTO_CREDENTIAL_STORAGE_MODE=cloud_secret_manager
CRYPTO_CREDENTIAL_PRODUCTION_VAULT_READY=true
CRYPTO_CREDENTIAL_SECRET_MANAGER_PROJECT_ID=
CRYPTO_CREDENTIAL_SECRET_MANAGER_PREFIX=tradehub-crypto
```

The real-money canary requires every production gate plus typed Super Admin confirmation:

```text
CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=true
CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=true
CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=false
CRYPTO_EXECUTION_PRODUCTION_CANARY_ENABLED=true
CRYPTO_EXECUTION_PRODUCTION_CANARY_MAX_ORDER_USDT=5
```

The canary worker is limited to one allowlisted spot `BUY` market order with quote-notional sizing, defaulting to at most `5 USDT`. It still requires Stage 16 Auto-Copy entitlement, paid/personal-account posture, production consent, production connection verification, withdrawals disabled, platform/workspace order controls, allowlists, caps, and kill switches off. `CRYPTO_EXECUTION_LIVE_ENABLED` remains ineffective for production order placement.

Automated QA does not call real exchanges or Google Cloud:

```bash
npm run stage15l:qa
```

Emulator-safe validation:

```bash
npm run stage15i:seed
npm run stage15i:qa
npm run firebase:rules:test
```

Production order calls require all of these before any future real-money beta run:

```text
CRYPTO_EXECUTION_PRODUCTION_BETA_ENABLED=true
CRYPTO_EXECUTION_PRODUCTION_ORDERS_ENABLED=true
CRYPTO_EXECUTION_PRODUCTION_DRY_RUN=false
CRYPTO_EXECUTION_PRODUCTION_MAX_ORDER_USDT=25
CRYPTO_CREDENTIAL_STORAGE_MODE=cloud_secret_manager
CRYPTO_CREDENTIAL_PRODUCTION_VAULT_READY=true
```

Firestore platform/workspace production controls, workspace/student/exchange/symbol allowlists, fresh production permission verification, withdrawal-disabled keys, active paid Auto-Copy entitlement, personal-account posture, student production consent, caps, and kill switches are still checked server-side. `CRYPTO_EXECUTION_LIVE_ENABLED` remains insufficient by itself.

Stage 15L implements a Google Cloud Secret Manager vault adapter and a separate typed-confirmed canary path. Stage 15I dry-run records remain safe no-exchange-call attempts unless the stricter 15L canary gates are deliberately opened.

## Stage 15J Consent And Symbol Validation

Stage 15J closes the manual QA gaps found after the production beta gate:

- workspace signals are market-aware, so `EURUSD` cannot be saved or routed as a crypto execution symbol and `BTCUSDT` cannot be saved as forex;
- crypto paper, live-sandbox, and production dry-run routing fail closed with `crypto_symbol_invalid_for_market` for mismatched or unsupported symbols;
- student production live beta consent, pause, resume, and revoke actions run through server-side API routes, not direct client Firestore writes;
- production consent still does not enable real orders while dry-run, production vault, order env, allowlist, cap, and Super Admin gates are blocked;
- execution preview panels mask/shorten long refs and keep accumulating lists bounded.

Emulator-safe validation:

```bash
npm run stage15j:qa
```

## Stage 15K Crypto Completion

Stage 15K marks the crypto Auto-Copy section complete up to the approved beta boundary:

- student copier uses product-facing `Paper Auto-Copy`, `Testnet Proof`, and `Production Beta` language;
- influencer workspace crypto ops summarizes execution readiness without fixture-heavy diagnostics;
- Super Admin remains the deeper diagnostic surface for paper, testnet, production dry-run, reconciliation, and audit state;
- Binance Spot Testnet has a real `filled_live` proof recorded in the Stage 15H completion note;
- Bybit Testnet reached the exchange and failed safely with sanitized insufficient-balance state because the test account had `0` usable USDT;
- production trading remains blocked by dry-run, order-env, vault, allowlist, consent, entitlement, cap, and kill-switch gates;
- forex execution and external master-trader ingestion remain deferred.

Emulator-safe completion validation:

```bash
npm run stage15k:qa
```

Completion evidence:

```text
prompt/15K-crypto-execution-completion-qa-notes.md
prompt/15K-crypto-execution-completion-note.md
```

## Stage 15M Production Preflight And Balance Guard

Stage 15M keeps production trading blocked by default while making the readiness posture clearer:

- Super Admin workspace previews show a support-safe production readiness checklist for env gates, vault readiness, platform/workspace controls, allowlists, consent, entitlement, connection health, caps, and balance precheck status.
- Production canary now performs a server-only Binance/Bybit balance precheck before the exchange order adapter can be reached. If balance is insufficient, unavailable, rejected, or credential loading fails, the canary records a sanitized failed attempt and does not submit an order.
- Student Production Beta copy explains that consent is separate from paper/testnet, TradeHub does not custody funds, and real orders still require vault, allowlist, dry-run/order, cap, Super Admin, and balance gates.
- Influencer signal publishing includes a market/direction/levels/routing review with bounded eligible-student context. Forex later gains paper simulation in Stage 15O, while demo/live broker execution remains deferred.

No real production order is placed by Stage 15M QA. Real production canary testing still requires owner approval, a funded dedicated production exchange account, withdrawal-disabled production API key, allowlisted workspace/student/exchange/symbol, production vault readiness, dry-run disabled, and typed Super Admin confirmation.

Emulator-safe validation:

```bash
npm run stage15m:qa
```

## Stage 15N Cross-Asset Auto-Copy Foundation

Stage 15N extracts a shared Auto-Copy preference model for crypto and future forex while keeping execution authority server-side:

- Students can save shared execution mode, risk sizing, stale-signal policy, market pause/revoke posture, fairness disclosure, and suitability acknowledgment.
- Crypto routing now respects confirm-before-execute and stale-signal policy before creating paper/testnet/production-gated execution records.
- Forex preferences are shared by the paper simulation lane added in Stage 15O. Live/demo broker execution remains deferred until a later MetaAPI prompt.
- Influencer signal publishing shows bounded full-auto, confirmation-required, alerts-only, and blocked shared preference posture.
- Shared Auto-Copy preference, confirmation, stale-decision, and audit paths remain denied to client Firestore SDK access.

Emulator-safe validation:

```bash
npm run stage15n:qa
```

## Stage 15O Forex Paper Auto-Copy Foundation

Stage 15O adds a forex paper-only lane on top of the shared Auto-Copy model:

- Valid published forex signals can create bounded forex paper intents for eligible full-auto students.
- Confirm-before-execute and stale confirmation create protected confirmation records instead of direct paper attempts.
- Alerts-only, paused, revoked, stale-expired, unentitled, funded-account, prop-firm, or risk-blocked students stay out of forex paper execution.
- Super Admin can run a bounded forex paper worker that records simulated attempts only.
- Student, influencer, and Super Admin surfaces show support-safe forex paper previews.
- Protected forex paper intent, attempt, risk decision, and audit paths remain denied to client Firestore SDK access.

No MetaAPI token storage, broker connection, Telegram ingestion runtime, demo forex trade, or live forex order is active in Stage 15O.

Validation:

```bash
npm run stage15o:qa
```

## Stage 15P Forex Broker / MetaAPI Connection Foundation

Stage 15P adds safe forex connection readiness without enabling broker execution:

- Developer proof routes can submit MetaAPI token/account metadata through protected server API routes, but the normal student product flow no longer asks for MetaAPI token or MetaAPI account ID after Stage 15R.
- TradeHub verifies support-safe MetaAPI account metadata server-side and stores token material only through the server-only vault boundary or fails closed.
- Student, influencer, and Super Admin surfaces show connection readiness counts, status, and safe audit context without token refs, broker account IDs, raw balances, or raw provider payloads.
- Forex paper Auto-Copy from Stage 15O keeps working, but no MetaAPI trade, demo broker trade, live forex order, Telegram ingestion runtime, or broker password collection is active.
- Protected forex token, connection, and audit paths remain denied to client Firestore SDK access.

Local fixture verification can use explicit mock mode:

```text
FOREX_EXECUTION_MOCK_METAAPI=true
```

Validation:

```bash
npm run stage15p:qa
```

## Stage 15R Billing-Gated Forex AutoCopy Provisioning Foundation

Stage 15R corrects the normal Forex AutoCopy product architecture:

- Ordinary course students and unpaid users cannot create Forex AutoCopy provisioning records.
- Paid Forex AutoCopy students can submit MT4/MT5 broker server, login, password, platform, and optional label through a protected server route.
- The current provider is mock/dry-run only. Broker passwords are not stored in Firestore, MetaAPI accounts are not created, terminals are not deployed, and no demo/live forex order is placed.
- Student and influencer surfaces do not show MetaAPI token/account ID fields, broker passwords, credential refs, vault refs, raw provider payloads, or raw broker details.
- Super Admin can inspect support-safe provisioning requests, mock provisioned accounts, cleanup state, and audit events.
- Stage 15Q demo proof now requires paid Forex AutoCopy provisioning before a demo intent or worker attempt can proceed.

Validation:

```bash
npm run stage15r:qa
```

## Stage 15S Forex AutoCopy Checkout + Subscription Lifecycle Gate

Stage 15S connects the Forex AutoCopy paid marker to a protected Paystack checkout lifecycle:

- Student checkout writes support-safe Paystack intent records under `/workspaces/{workspaceId}/forex_autocopy_payment_intents/{paymentIntentId}`.
- Verification updates `/workspaces/{workspaceId}/students/{studentId}/forex_autocopy_subscriptions/current`.
- Supported states are `active_paid`, `payment_pending`, `payment_failed`, `past_due`, `cancelled`, and `expired`.
- Only `active_paid` unlocks MT4/MT5 broker provisioning and forex demo proof gates.
- Cancelled, expired, and past-due states disable existing mock provisioning without MetaAPI account creation, terminal deployment, or broker order calls.
- Student, influencer, and Super Admin previews show masked refs and aggregate status only. Broker login/password, raw broker server, MetaAPI IDs/tokens, vault refs, raw payment payloads, and secrets stay hidden.

Configuration:

```text
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE=PLN_your_forex_autocopy_plan_code
PAYSTACK_FOREX_AUTOCOPY_CHECKOUT_EMAIL=
FOREX_AUTOCOPY_PRICE_NGN=25000
```

`PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE` must be a dedicated Paystack recurring plan for the TradeHub Forex AutoCopy add-on, separate from the default course/membership plan. Checkout fails closed with a safe configuration message when this value is missing, and no Paystack call or local payment intent is created.

`PAYSTACK_FOREX_AUTOCOPY_CHECKOUT_EMAIL` is optional. In local Firebase emulator + Paystack test mode, TradeHub automatically replaces seeded `.test` fixture emails with a Paystack-valid `example.com` test email for checkout initialization; production still uses the real student email.

Validation:

```bash
npm run stage15s:qa
```

## Stage 15T Crypto AutoCopy Checkout + Subscription Lifecycle Gate

Stage 15T gives Crypto AutoCopy the same TradeHub-owned add-on model as Forex AutoCopy:

- Student checkout writes support-safe Paystack intent records under `/workspaces/{workspaceId}/crypto_autocopy_payment_intents/{paymentIntentId}`.
- Verification updates `/workspaces/{workspaceId}/students/{studentId}/crypto_autocopy_subscriptions/current`.
- Supported states are `active_paid`, `payment_pending`, `payment_failed`, `past_due`, `cancelled`, and `expired`.
- Stage 16 AutoCopy entitlement, paid course subscription, and personal-account posture still apply before purchase.
- Only `active_paid` unlocks Binance/Bybit setup, crypto AutoCopy controls, production consent, and crypto paper routing.
- Existing exchange connection metadata is not enough for routing unless paid Crypto AutoCopy billing is active.
- No new exchange order calls, production-live expansion, API-secret exposure, or custody behavior is added.

Configuration:

```text
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYSTACK_CRYPTO_AUTOCOPY_PLAN_CODE=PLN_your_crypto_autocopy_plan_code
PAYSTACK_CRYPTO_AUTOCOPY_CHECKOUT_EMAIL=
CRYPTO_AUTOCOPY_PRICE_NGN=25000
```

`PAYSTACK_CRYPTO_AUTOCOPY_PLAN_CODE` must be a dedicated Paystack recurring plan for the TradeHub Crypto AutoCopy add-on, separate from the default course/membership plan and separate from Forex AutoCopy.

Validation:

```bash
npm run stage15t:qa
```

## Student Data Shape

Stage 13 reads these live Firestore paths through server-side API routes:

```text
/workspaces/{workspaceId}
/workspaces/{workspaceId}/students/{studentId}
/workspaces/{workspaceId}/courses/{courseId}
/workspaces/{workspaceId}/signals/{signalId}
/workspaces/{workspaceId}/students/{studentId}/course_progress/{courseId}
/workspaces/{workspaceId}/students/{studentId}/lesson_progress/{lessonId}
/workspaces/{workspaceId}/students/{studentId}/subscriptions/current
/workspaces/{workspaceId}/payment_intents/{paymentIntentId}
/workspaces/{workspaceId}/solana_settlements/{settlementId}
/solana_settlements/{settlementId}
/paystack_webhooks/{eventId}
```

Optional summary docs reduce repeated reads:

```text
/workspaces/{workspaceId}/students/{studentId}/app_summary/current
/workspaces/{workspaceId}/students/{studentId}/journal_summary/current
```

If summary docs are missing, student routes show honest zero-safe states and warnings instead of scanning broad collections or inventing mock data.

## Student APIs

Student-only APIs:

```text
GET /api/student/app/overview
GET /api/student/courses
GET /api/student/courses/[courseId]
POST /api/student/courses/[courseId]/lessons/[lessonId]/progress
GET /api/student/signals
GET /api/student/copier
GET /api/student/journal/summary
GET /api/student/billing/overview
POST /api/student/billing/checkout
GET /api/student/billing/verify
POST /api/student/billing/solana/checkout
GET /api/student/billing/solana/verify
POST /api/paystack/webhook
GET /api/admin/payments/overview
POST /api/admin/payments/paystack/[paymentIntentId]/reconcile
PATCH /api/admin/payments/solana-settlements/[settlementId]
GET /api/workspace/billing/overview
```

Every protected route verifies the Firebase ID token server-side, requires the matching role, and scopes reads/writes to the token `workspaceId` where applicable. The browser never provides a trusted workspace ID.

Admin and workspace billing overview routes require `super_admin` and `influencer` claims respectively. The Paystack webhook route verifies the `x-paystack-signature` HMAC before writing receipts or updating subscription state.

## Payment Operations Hardening

Super Admin payment ops are bounded recent-activity windows, not full accounting scans:

- `/api/admin/payments/overview` returns latest payment intents, latest Solana settlement records, recent Paystack webhook receipts, and a small ops summary.
- If a collection-group index is missing, the admin page shows a controlled warning instead of crashing. Deploy indexes from `firestore.indexes.json`.
- Paystack reconciliation verifies the real Paystack reference server-side before changing subscription state. Admin cannot manually assert that a payment succeeded.
- Reconciliation is idempotent. Already verified intents return an audit-friendly no-op response.
- Solana settlement updates change only the ops ledger status. They do not send on-chain funds.
- Influencers see workspace billing readiness, latest intents, and Solana settlement state as read-only.

## Responsive Student Shell

The student app now uses a responsive shell:

- Phone: compact app-like card stack with bottom navigation.
- Tablet and desktop: expanded workspace layout with a left navigation rail, wider dashboard grids, and side panels.
- Course reader: lesson content and lesson navigation split cleanly on wider screens.

The old narrow mobile-only shell is no longer the final `/app` experience.

## Course And Progress Behavior

- Published courses remain backed by the Stage 09 Course Hub APIs.
- Student progress is saved only on explicit milestone actions: `started`, `watched_80`, `completed`, and `quiz_passed`.
- No per-second video progress writes are used.
- Safe YouTube embeds still use `https://www.youtube-nocookie.com/embed/{videoId}`.
- Lesson notes render as plain text. Raw HTML is not rendered.

## Billing Behavior

- Student checkout creates one `payment_intents` document, then initializes a Paystack transaction server-side.
- The student is redirected to Paystack using the returned authorization URL.
- `/app/billing/callback?reference=...` verifies the reference with Paystack before updating the student subscription.
- `charge.success` webhooks can update the same subscription path idempotently.
- `invoice.payment_failed`, `subscription.disable`, and `subscription.not_renew` update subscription status when workspace/student metadata is available.
- Super Admin can recheck a pending/ambiguous Paystack intent with Paystack; only confirmed success updates access.
- TradeHub stores Paystack references, customer/subscription codes, plan codes, and access status. It does not collect card details or bank account numbers.
- Optional Solana checkout creates a pending `rail: "solana"` intent with NGN amount, USDC quote, FX snapshot, quote expiry, reference, platform wallet, workspace payout wallet, and split accounting.
- Solana verification uses server-side RPC to find a confirmed transaction by reference and checks USDC mint, platform wallet token balance increase, amount, transaction status, and quote expiry.
- Verified Solana payments update the same student subscription document with `rail: "solana"` and the verified signature.
- Verified Solana payments write settlement records that Super Admin can mark pending, settled, or cancelled as a manual ops workflow.

## Stage 14 Verification Focus

Inspect these routes after `npm run dev`:

- `/`
- `/admin`
- `/workspace`
- `/app`
- `/app/journal`
- `/terms`
- `/privacy`
- `/risk-disclosure`
- `/data-use`

Confirm these behaviors:

- policy pages show production-shaped product copy, not stage placeholders;
- `/app/journal` stays honest when summary data is missing and clearly labels privacy posture;
- admin trust/safety shows controlled empty states instead of crashing when disputes or risk flags are empty;
- protected trust/safety CSV export downloads only while signed in as `super_admin`;
- signed-out `GET /api/student/journal/summary` and `GET /api/admin/trust-safety/export` fail closed with `401`;
- Firestore rules remain locked and no protected client Firestore reads were added.

## Deferred On Purpose

- No Telegram delivery.
- No broker or exchange credential collection.
- No real Auto-Copy execution.
- No full journal trade table or analytics engine.
- No client-side Firestore reads or writes for protected student data.
- No automatic on-chain influencer split payout yet.

## Verification

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Useful signed-out API checks:

```bash
curl -i http://localhost:3000/api/student/app/overview
curl -i http://localhost:3000/api/student/courses
curl -i http://localhost:3000/api/student/signals
curl -i http://localhost:3000/api/student/copier
curl -i http://localhost:3000/api/student/journal/summary
curl -i http://localhost:3000/api/student/billing/overview
curl -i -X POST http://localhost:3000/api/student/billing/checkout \
  -H 'content-type: application/json' \
  -d '{"tierId":"all"}'
curl -i -X POST http://localhost:3000/api/student/billing/solana/checkout \
  -H 'content-type: application/json' \
  -d '{"tierId":"all"}'
curl -i 'http://localhost:3000/api/student/billing/solana/verify?paymentIntentId=pi_fake'
curl -i http://localhost:3000/api/admin/payments/overview
curl -i http://localhost:3000/api/workspace/billing/overview
curl -i -X POST http://localhost:3000/api/admin/payments/paystack/pi_fake/reconcile
curl -i -X PATCH http://localhost:3000/api/admin/payments/solana-settlements/solset_fake
```

Expected signed-out result is `401`. Valid student requests must include the signed-in user's Firebase ID token.

Webhook signature testing requires a raw body and valid `x-paystack-signature`; unsigned webhook requests should fail.

## Quota Guardrails

- Student lists cap at bounded page sizes.
- Dashboard totals prefer summary documents.
- Missing summaries return zero-safe data and warnings, not broad scans.
- Student progress writes only on explicit milestone actions.
- Billing checkout creates one intent write before Paystack initialize, then one status/audit update after Paystack responds.
- Solana checkout creates one quote/intent write, and verification writes only when a controlled status changes.
- Webhooks are stored idempotently by event fingerprint.
- No realtime listeners are used for student dashboards.
- Firestore rules remain locked because protected reads go through Admin SDK server routes.

## Stage 15Q Forex Demo Proof

Forex now has a demo-only MetaAPI proof lane behind server-side gates:

- `FOREX_EXECUTION_DEMO_ENABLED=false` by default.
- `FOREX_EXECUTION_DEMO_ORDER_CALLS_ENABLED=false` by default.
- `FOREX_EXECUTION_DEMO_DRY_RUN=true` by default.
- Super Admin must type `RUN_FOREX_DEMO` before the demo worker route runs.

Normal QA does not require MetaAPI credentials or broker funds:

```bash
npm run stage15q:qa
```

Production/live forex execution, Telegram ingestion, external master-trader ingestion, broker password storage, and client-side execution remain deferred.

## Remaining Launch Risks

- Paystack still needs a public production webhook URL outside localhost.
- Optional Solana still records settlement-ledger obligations instead of auto-sending influencer payouts on-chain.
- Trust/safety and payment feeds still depend on bounded Firestore indexes; missing indexes surface controlled warnings rather than crashes.
- Full journal trade-entry CRUD, raw journal export, Telegram delivery, and live copier execution remain intentionally out of MVP scope.

## KIMWAY Ownership And Founder Agreement Note

<!-- KIMWAY_AGREEMENT_NOTE_START -->

This product is treated as a Company Product under KIMWAY TECH LTD.

The founders have agreed to use the current KIMWAY founder sharing framework:

- 70% of KIMWAY TECH LTD is allocated to the current founders based on the agreed contribution score.
- 30% of KIMWAY TECH LTD is reserved as the Future Contribution Pool.
- The 30% Future Contribution Pool is divided into four annual review pools of 7.5% each.
- The 70% current founder allocation vests over four years.
- After the first 12 months of active contribution, 25% of each founder's allocation from the 70% pool vests.
- The remaining 75% of each founder's allocation from the 70% pool vests monthly or quarterly over the next 36 months.
- If a founder leaves, stops contributing, or is removed/sacked according to the final legal process, the founder keeps only vested shares.
- Any unvested remaining shares return to the remaining pool and are redistributed according to the agreed sharing system then in use.

Founder ownership applies to KIMWAY TECH LTD as the parent company. It does not mean personal ownership of this individual product, its codebase, brand, assets, customers, documents, or intellectual property.

TradeHub also has a separate investor boundary:

- The TradeHub investor owns only 3% of TradeHub.
- The investor does not own 3% of KIMWAY TECH LTD.
- The investor does not own RecordKeep, SchoolPilot, GradePilot, or future KIMWAY products.

<!-- KIMWAY_AGREEMENT_NOTE_END -->
