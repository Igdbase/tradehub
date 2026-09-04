# TH-2026-07-31-STAGE15S-FOREX-CHECKOUT-HANDOFF

Use this reference in a new Codex chat:

`TH-2026-07-31-STAGE15S-FOREX-CHECKOUT-HANDOFF`

Instruction for the next builder: continue TradeHub in `/Users/idrissuleiman/Developer/tradehub`. Read this note first, then inspect the current repository before editing. Also preserve the original continuation reference `TH-2026-07-13-STAGE16-HANDOFF`.

## Non-Negotiable Guardrails

- Preserve Stage 16 entitlement logic.
- Preserve server-side Firebase Admin SDK access patterns.
- Do not weaken Firestore rules.
- Do not expose API keys, MetaAPI tokens, broker passwords, vault refs, raw Paystack payloads, raw broker payloads, service-account data, full exchange order IDs, or full provider account refs.
- Browser/client code must not place exchange, MetaAPI, broker, demo, or live orders.
- Paystack remains the default payment rail. Solana remains optional and separate.
- Crypto AutoCopy and Forex AutoCopy are independent student add-ons owned by TradeHub.
- TradeHub must never create MetaAPI cloud accounts for unpaid/course-only students.
- Infrastructure spend starts only after infrastructure revenue.

## Product Architecture Decision

TradeHub has two automation products:

- Crypto AutoCopy: Binance/Bybit first, using TradeHub's own execution engine and exchange adapters.
- Forex AutoCopy: MT4/MT5 through MetaAPI in Phase 1, later replaceable with a TradeHub Forex Gateway.

Influencers pay for workspace/platform access and revenue share. Influencers do not pay MetaAPI costs. Students pay separately for Crypto AutoCopy and Forex AutoCopy. Forex AutoCopy billing must gate any MetaAPI provisioning.

Forex lifecycle:

1. Student buys ordinary course/membership: no MetaAPI account is created.
2. Student buys Forex AutoCopy add-on: student enters MT4/MT5 login, broker password, and broker server.
3. TradeHub backend creates/provisions the MetaAPI account only after paid Forex AutoCopy is active.
4. When subscription expires/cancels, TradeHub disables AutoCopy and pauses/deletes provider resources when supported.

## Stage Progress So Far

- 15A: server-only crypto execution foundation.
- 15B: Binance/Bybit connection and permission verification foundation.
- 15C: crypto paper routing from published crypto signals.
- 15D: paper-only worker boundary.
- 15E: paper visibility and ops hardening.
- 15F: paper beta seed data, QA scripts, and Firestore rules tests.
- 15G: docs-only live execution safety design.
- 15H: sandbox/testnet live order lifecycle proof. Binance testnet reached real filled proof; Bybit testnet reached exchange and showed insufficient balance behavior.
- 15I: production live beta gate, fail-closed.
- 15J: student consent/revoke/pause/resume plus market-aware crypto/forex symbol validation.
- 15K: crypto completion/productization pass. Production live trading still blocked.
- 15L: production canary bridge with Secret Manager vault gate. No real production order placed.
- 15M: production readiness preflight and balance guard.
- 15N: cross-asset AutoCopy preference foundation for crypto and forex.
- 15O: forex paper AutoCopy lane. No broker execution.
- 15P: MetaAPI connection readiness foundation. Metadata only, no trade calls.
- 15Q: MetaAPI demo-only execution proof lane behind server gates. No real demo order was run.
- 15R: billing-gated Forex AutoCopy provisioning foundation. MT4/MT5 broker details form appears only after active paid Forex AutoCopy marker. Dry-run/mock only, no MetaAPI resource created.
- 15S: Paystack Forex AutoCopy checkout and subscription lifecycle gate.

## Current Stop Point

The user is testing Stage 15S manually.

Manual items 1-6 are reported working, but step 7 is blocked:

- Student opens `/app/copier`.
- Student sees `Purchase Forex AutoCopy`.
- Clicking it calls `POST /api/student/forex-execution/subscription/checkout`.
- The route returns `502`.
- UI shows failed payment ops cards:
  - `Forex AutoCopy checkout`
  - `failed`
  - `Forex AutoCopy Paystack checkout could not be opened.`

Terminal showed:

```text
POST /api/student/forex-execution/subscription/checkout 502
```

## Likely Root Cause

The `.env.local` was discussed but should be re-read safely by the next builder without printing secrets.

Known safe facts from the conversation:

- `PAYSTACK_SECRET_KEY` appears to be set.
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` appears to be set.
- `PAYSTACK_DEFAULT_MONTHLY_PLAN_CODE` appears to be set.
- `FOREX_AUTOCOPY_PRICE_NGN=25000` is set.
- `PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE` was missing or empty.
- `NEXT_PUBLIC_APP_URL=http://localhost:3000` appears to exist, possibly duplicated.
- `APP_URL` may be missing.

Most likely cause: the Forex AutoCopy checkout route requires a dedicated Paystack plan code for the Forex AutoCopy add-on, but `PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE` is not configured.

The next builder should inspect these files:

- `src/app/api/student/forex-execution/subscription/checkout/route.ts`
- `src/lib/crypto-execution/forex-autocopy-subscription-repository.ts`
- `scripts/qa-stage15s-forex-autocopy-checkout-lifecycle.mjs`
- `.env.example`
- `README.md`

## Test Accounts

Password for all seeded emulator users:

```text
Stage15F!Pass123
```

Important users:

```text
student_stage15f_binance_sandbox@example.test
stage15f.influencer@example.test
stage15f.admin@example.test
```

Workspace:

```text
ws_stage15f_paper_beta
```

## Local Run Commands

Terminal 1, keep running:

```bash
cd /Users/idrissuleiman/Developer/tradehub
npm run firebase:emulators
```

Terminal 2:

```bash
cd /Users/idrissuleiman/Developer/tradehub
npm run stage15f:seed
npm run stage15f:seed-auth
npm run stage15h:seed
npm run stage15i:seed
npm run clean:next
npm run dev:stage15f
```

If ports are stuck, use this safer syntax:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:9099 -sTCP:LISTEN
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill -9 <PID>
```

Do not use the broken syntax the user tried earlier:

```bash
lsof -ti tcp:3000 tcp:3001 tcp:3002 tcp:8080 tcp:9099
```

## What Was Manually Confirmed

- Student copier loads when Firebase emulators and dev server are correct.
- Crypto sections are productized and gated.
- Forex broker setup is locked until Forex AutoCopy purchase.
- Influencer sees Forex provisioning counts only.
- Super Admin sees support-safe provisioning/audit only.
- Broker password, raw login, raw server, MetaAPI token, provider refs, and vault refs are not displayed.
- Mock provisioning cleanup was previously tested and showed cleanup complete.

## Next Builder Task

Fix or complete Stage 15S checkout configuration and error clarity.

Recommended tasks:

1. Re-read `.env.local` without printing secrets. Only report set/missing/masked values.
2. Confirm whether `PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE` is empty.
3. If missing, explain to the user that they need a Paystack test-mode recurring plan for Forex AutoCopy, likely monthly `NGN 25,000`, and must paste the `PLN_...` code into `.env.local`.
4. Improve fail-closed UX if the env is missing:
   - Return a clear safe error such as `Forex AutoCopy Paystack plan code is not configured yet.`
   - Do not call Paystack if the plan code is missing.
5. Prefer `APP_URL` for callbacks, fallback to `NEXT_PUBLIC_APP_URL`, fallback to `http://localhost:3000`.
6. Update `.env.example`, README, and Stage 15S QA notes if needed.
7. After env/code patch, restart dev server and retry `Purchase Forex AutoCopy`.
8. After checkout succeeds, verify the payment, confirm `active_paid`, unlock broker form, submit mock provisioning, then disable/cancel and confirm cleanup.

Expected `.env.local` lines after configuration:

```bash
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYSTACK_FOREX_AUTOCOPY_PLAN_CODE=PLN_your_forex_autocopy_plan_code
FOREX_AUTOCOPY_PRICE_NGN=25000
```

## Verification Required After Edits

Run:

```bash
npm run stage15s:qa
npm run typecheck
npm run lint
npm run build
```

If Firestore emulator port is already in use, run the direct rules fallback:

```bash
env FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore-rules-stage15f.test.mjs
```

## Deferred Work

Do not implement these yet unless explicitly requested:

- Real MetaAPI account provisioning that creates billable cloud terminals.
- Forex demo/live order execution.
- Telegram ingestion runtime.
- External master-trader ingestion.
- Broad production crypto live trading beyond the canary boundary.
- Final deployed production UX lock for Copier and Journal.

