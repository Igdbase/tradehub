# TradeHub — Setup Guide & Pre-Launch Checklist
**Document:** 06 of 06  
**Version:** 2.6 | **Last Updated:** July 2026

> **v2.4:** Incorporates fixes from the security & risk review (document 07) — KMS-based envelope encryption replaces the single static broker-key approach, plus new checklist items for withdrawal-permission validation, webhook idempotency, rules testing, backups, and dependency scanning. See document 07 for the full rationale behind each change.
>
> **v2.5:** Adds optional Solana Pay / USDC checkout setup, verification checks, and Super Admin onboarding-data requirements.
>
> **v2.6:** Adds Firebase Spark/free-tier setup guidance and Firestore quota guardrails for pagination, summary documents, custom claims, emulator-first development, limited realtime listeners, and milestone-based writes.

Complete every item in this document before a single line of application code is written and before the first influencer is onboarded. The order matters — some steps depend on earlier ones.

---

## Step 1: Domain & DNS

**Register your domain**
- Register `tradehub.com` (or your chosen domain) at Namecheap, Cloudflare Registrar, or Dynadot.
- Recommended: use Cloudflare Registrar — it offers at-cost pricing and makes DNS management simple.

**DNS records to add:**

| Type | Name | Value | Purpose |
|---|---|---|---|
| A or CNAME | `@` | Vercel IP / alias | Root domain |
| CNAME | `*` | `cname.vercel-dns.com` | Wildcard for all influencer subdomains |
| TXT | `@` | (from Vercel domain verification) | Domain ownership proof |
| TXT | `mail` | (from Resend) | Email sender verification |

The wildcard CNAME record is what makes `john.tradehub.com`, `mike.tradehub.com`, etc. resolve automatically without adding each influencer's subdomain manually.

**SSL:** Vercel auto-provisions Let's Encrypt certificates for both the root domain and all wildcard subdomains once DNS propagates. No manual certificate management needed.

---

## Step 2: Vercel (Hosting)

1. Create a free account at **vercel.com**.
2. Connect your GitHub repository (create the Next.js project first — see Step 8).
3. In Vercel project settings → **Domains**, add:
   - `tradehub.com`
   - `*.tradehub.com` (wildcard — requires Vercel Pro plan)
4. **Upgrade to Vercel Pro** ($20/month) before going live. Wildcard subdomains require the Pro plan. The Hobby (free) plan does not support them.
5. Set all environment variables (see §Master Environment Variables below) in Vercel Dashboard → Settings → Environment Variables. Do this before your first deployment.

---

## Step 3: Firebase

**Create two projects — one for production, one for development:**

1. Go to **console.firebase.google.com**
2. Create project: `tradehub-prod`
3. Create project: `tradehub-dev`

Never run development or testing against the production project. Never test Paystack webhooks against production student data.

For Prompt 05, stay on the Firebase **Spark/free plan** unless a later prompt explicitly needs a paid-only feature. Authentication, Firestore, local emulator development, and Admin SDK setup can be started without upgrading to Blaze. Cloud Functions, scheduled jobs, heavy production traffic, phone/SMS auth, and some hosting/deployment choices may require billing later.

### Firestore

In each project:
1. Enable Firestore → **Production mode** (not test mode — test mode allows public reads/writes with no authentication).
2. Choose region: check Firebase's current region list. For Nigeria, `europe-west1` has historically been the nearest with Firestore support — verify at setup time.
3. After creating the database, immediately deploy the Security Rules from document 03 before allowing any traffic.

### Firestore Free-Tier / Quota-Safe Defaults

Use these defaults from the first real Firebase prompt:

1. Develop against the Firebase Emulator first. Do not point local development at production Firestore.
2. Keep list queries paginated at 25 records by default, 50 maximum.
3. Create dashboard summary documents before building large dashboards:
   - `/platform_summaries/current`
   - `/workspace_summaries/{workspace_id}`
4. Store `role` and `workspaceId` in Firebase custom claims after account provisioning so basic route/rule checks avoid extra Firestore reads.
5. Use direct document paths for known records instead of collection-wide scans.
6. Keep public workspace applications create-only. Public users can submit an application; they cannot read or list applications.
7. Do not enable realtime listeners by default. Use them only for live signal surfaces where realtime is product-critical.
8. Save lesson progress only on milestones: started, 80% watched, completed, quiz submitted, or meaningful exit. Do not save playback progress every few seconds.
9. Store one signal document per workspace/tier. Do not fan out one signal document per student during the MVP foundation.
10. Do not store files, videos, large images, or bulky attachments inside Firestore.
11. Add explicit `limit()` clauses to every list query.
12. Track daily Firestore usage during early builds: reads, writes, deletes, storage, and outbound transfer.

### Firebase Authentication

1. Enable **Email/Password** provider.
2. Enable **Multi-Factor Authentication (MFA)** — go to Authentication → Sign-in method → Multi-factor authentication. Required for influencer accounts and for any student who links a broker/exchange.
3. Google OAuth will be added in Phase 2.

For Prompt 05, create your first Super Admin user manually in Firebase Authentication, then use a local Admin SDK bootstrap script to set custom claims such as:

```json
{
  "role": "super_admin"
}
```

Influencer and student users should receive claims only after their workspace/student record exists:

```json
{
  "role": "influencer",
  "workspaceId": "ws_apexfx"
}
```

```json
{
  "role": "student",
  "workspaceId": "ws_apexfx"
}
```

### Firebase Cloud Functions

Do not enable Cloud Functions during Prompt 05 unless the implementation explicitly needs them. Cloud Functions require the **Blaze (pay-as-you-go) plan**, so they are intentionally deferred until payment, scheduled billing, Telegram, trade sync, and copier execution stages.

Functions to build at MVP when those later prompts arrive:

| Function name | Trigger | Purpose |
|---|---|---|
| `paystackWebhook` | HTTP (Paystack POST) | Handle all Paystack webhook events |
| `trialBillingScheduler` | Scheduled (hourly) | Initiate charges when trial periods end |
| `tradeSyncScheduler` | Scheduled (every 15 min) | Sync trade history from connected exchanges |
| `telegramBotHandler` | HTTP or pub/sub | Receive and parse Telegram bot messages |
| `copierExecutionWorker` | Cloud Tasks queue | Execute individual trades (one task per student) |
| `signalBroadcaster` | Firestore trigger (on signal create) | Fan out signal to all eligible students' queues |

### Firebase Storage

1. Enable Storage.
2. Set Storage Security Rules: only authenticated influencers can upload to `/logos/{workspaceId}/` and only files under 200KB.

### Environment variables from Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT_KEY       ← JSON string, server-only, NEVER expose to client
```

---

## Step 4: Paystack

### Your main account

1. Sign up at **paystack.com** with your business details.
2. Complete business verification — required before live transactions.
3. Link your bank account for settlements.
4. Go to Settings → API Keys & Webhooks:
   - Copy your **Secret Key** and **Public Key**.
   - Set your **Webhook URL**: `https://tradehub.com/api/paystack/webhook`
   - Copy the **Webhook Secret** (used to verify every incoming webhook via HMAC-SHA512).
5. Enable only the webhook events you need (check current Paystack docs for exact event names): charge success, subscription cancellation, payment failure, dispute/chargeback creation.

### Per-influencer setup (done when you onboard each influencer)

1. Collect from the influencer: their Paystack business name, settlement bank name, and account number.
2. Create a **Paystack Subaccount** via Dashboard → Subaccounts → Create.
3. Store the returned `subaccount_code` in their Firestore `/workspaces/{workspace_id}` document.
4. Create a **Split** via Dashboard → Payment Splits → Create:
   - Type: percentage
   - Your account: 10%
   - Influencer subaccount: 90%
5. Store the returned `split_code` in their Firestore workspace document.

### Environment variables:

```
PAYSTACK_SECRET_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
PAYSTACK_WEBHOOK_SECRET
```

---

## Step 4B: Solana Pay / USDC Checkout (Optional Rail)

Paystack remains the default MVP checkout. Add Solana Pay as an optional crypto rail for approved workspaces, investor/partner positioning, and students who prefer wallet payment.

### Platform wallet setup

1. Create a platform-controlled Solana wallet dedicated to platform-fee USDC receipts.
2. Fund it with a tiny amount of SOL for rent/transaction needs if required by the implementation.
3. Create or confirm the associated USDC token account for the platform wallet.
4. Store the platform wallet address in environment variables.
5. Never store a platform wallet private key in the browser. If signing is needed, sign server-side only with tightly scoped secrets.

### Per-influencer setup

1. Collect the influencer's Solana wallet address.
2. Confirm the wallet can receive USDC on Solana.
3. Require a wallet-signature verification or a tiny challenge payment before enabling Solana checkout.
4. Store the verified wallet in `solanaPayoutWallet`.
5. Set `solanaPayEnabled: true` only after verification.

### Dependencies

```bash
npm install @solana/pay @solana/web3.js @solana/spl-token
```

### Required behavior

- Use USDC on Solana for subscription payments by default, not volatile SOL.
- Quote the student's naira tier price into USDC at checkout time and expire the quote quickly.
- Build the Solana Pay transaction request server-side.
- Include two USDC transfer instructions in the transaction: influencer share and platform fee.
- Verify transaction signature, reference, USDC mint, amount, recipients, and idempotency before activating access.

### Environment variables

```
NEXT_PUBLIC_SOLANA_NETWORK=devnet          # devnet | mainnet-beta
SOLANA_RPC_URL=
SOLANA_USDC_MINT=
PLATFORM_SOLANA_USDC_WALLET=
SOLANA_PAYMENT_QUOTE_TTL_SECONDS=600
```

---

## Step 5: Telegram Bot Infrastructure

No platform-level Telegram account is needed. Each influencer creates their own bot. The process to walk influencers through in the onboarding wizard:

1. Open Telegram and message **@BotFather**
2. Send `/newbot`
3. Choose a name for the bot (e.g. "Apex FX Signals")
4. Choose a username (e.g. `@ApexFXSignalsBot`) — must end in "bot"
5. BotFather returns a **Bot Token** in the format: `1234567890:ABCDefghIJKlmNoPQRstUvwXyz`
6. Influencer pastes this token into the workspace setup wizard
7. Platform stores it **AES-256 encrypted** in Firestore and connects the bot

**Install Telegraf.js in the project:**
```bash
npm install telegraf
```

**Signal parsing:** the bot listens for messages matching the structured SIGNAL format. Non-matching messages are silently ignored.

**Scaling:** At MVP (<25 workspaces), long-polling per workspace bot is fine inside Cloud Functions. Before exceeding ~25 bots, migrate to webhook-based delivery (each bot registers a webhook URL with Telegram).

---

## Step 6: Exchange APIs (Trade Copier — Crypto)

No platform-level Binance or Bybit account is needed. Students supply their own Trade-Only API keys. The platform needs:

1. Knowledge of the Binance REST API and Bybit REST API for order placement, account balance reading, and position management. Read their documentation before building the copier execution worker.
2. **Withdrawal-permission validation on link:** before accepting a key, call the exchange's own permissions endpoint (both Binance and Bybit expose this) to confirm withdrawal permission is actually disabled. Reject the key with a clear fix-it message if it isn't — don't rely on the student having labeled it "Trade-Only" correctly themselves.
3. **Envelope encryption via Google Cloud KMS**, in place of a single static application-level key:

```bash
# One-time setup — create a key ring and root key in KMS
gcloud kms keyrings create tradehub-secrets --location=global
gcloud kms keys create broker-root-key --location=global \
  --keyring=tradehub-secrets --purpose=encryption
```

On each broker key link: generate a fresh per-credential data key, encrypt the student's API key/secret with it, then encrypt that data key with the KMS root key before storing both ciphertexts in Firestore. Rotating the root key in KMS re-wraps the stored data keys — it never requires touching or re-encrypting the underlying broker credentials. This is the rotation path a single static key (the original MVP plan) didn't have: that approach explicitly couldn't be rotated without re-encrypting every stored secret at once, which meant a leaked key could never practically be retired.

The same scheme covers the Telegram bot token and any other sensitive stored secret — one consistent approach, not a separate static key per secret type.

**Environment variables:**
```
GOOGLE_APPLICATION_CREDENTIALS     ← service account scoped to KMS encrypt/decrypt only
KMS_KEY_RING
KMS_ROOT_KEY
```

---

## Step 7: Resend (Email)

1. Sign up at **resend.com**
2. Add and verify your sending domain: `mail.tradehub.com` (or `noreply.tradehub.com`) — follow Resend's DNS verification steps (adds TXT and CNAME records).
3. Retrieve your API key.

**Email templates to build at MVP:**

| Template | Trigger |
|---|---|
| Welcome / signup confirmation | Student creates account |
| Payment receipt | Successful charge |
| Subscription renewal reminder | 3 days before renewal |
| Past-due warning | Payment fails |
| Grace period expiry (24h notice) | 2 days after past-due |
| Access suspended | Grace period ends |
| New signal alert (optional) | Signal posted (student opt-in) |
| Workspace setup (influencer) | Workspace created by Super Admin |

**Environment variables:**
```
RESEND_API_KEY
RESEND_FROM_ADDRESS              ← e.g. noreply@tradehub.com
```

---

## Step 8: Development Environment

### Required local tools

```bash
# Check versions
node --version        # 18.x or 20.x LTS required
npm --version         # 9+
```

### Install global tools

```bash
npm install -g firebase-tools      # Firebase CLI
npm install -g vercel              # Vercel CLI
```

### Create the Next.js project

```bash
npx create-next-app@latest tradehub --typescript --tailwind --app --src-dir
cd tradehub
```

### Install all dependencies

```bash
# Core
npm install firebase
npm install @firebase/firestore @firebase/auth @firebase/storage @firebase/functions

# Bot
npm install telegraf

# Payments
npm install @paystack/inline-js

# Optional Solana payment rail
npm install @solana/pay @solana/web3.js @solana/spl-token

# Email
npm install resend

# State
npm install zustand

# Charts
npm install recharts

# UI base
npx shadcn@latest init           # Follow the prompts; choose "New York" style

# Encryption
npm install crypto                # Built into Node — no install needed
npm install @google-cloud/kms     # Envelope encryption for broker keys / bot tokens
```

### Initialize Firebase

```bash
firebase login
firebase init
# Prompt 05/free-tier foundation: select Firestore and Emulators.
# Storage is optional until logo upload is built.
# Skip Functions until payment/scheduler/Telegram/copier stages require Blaze.
# Project: tradehub-dev (for local work)
```

### Create `.env.local`

```bash
# Copy this to .env.local — NEVER commit this file
# Add it to .gitignore immediately

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=

PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=

NEXT_PUBLIC_SOLANA_NETWORK=
SOLANA_RPC_URL=
SOLANA_USDC_MINT=
PLATFORM_SOLANA_USDC_WALLET=
SOLANA_PAYMENT_QUOTE_TTL_SECONDS=

GOOGLE_APPLICATION_CREDENTIALS=    # KMS envelope encryption — see Step 6
KMS_KEY_RING=
KMS_ROOT_KEY=

RESEND_API_KEY=
RESEND_FROM_ADDRESS=

NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPER_ADMIN_SECRET_PATH=           # Choose a non-guessable path, e.g. x7k2-admin
NODE_ENV=development
```

### Run Firebase Emulators locally

```bash
firebase emulators:start
# Auth:      http://localhost:9099
# Firestore: http://localhost:8080
# Storage:   http://localhost:9199 if Storage emulator is enabled
# Functions: http://localhost:5001 only after Functions are initialized later
```

Always develop against the emulators — never against the production Firebase project during development.

### Git setup

```bash
git init
echo ".env.local" >> .gitignore
echo "*.env" >> .gitignore
echo "firebase-service-account*.json" >> .gitignore
git add .
git commit -m "initial commit"
```

**Branching strategy:**
- `main` → production (auto-deploys to Vercel on push)
- `dev` → staging (deploys to a Vercel preview URL)
- Feature branches → PRs into `dev` only

Never push directly to `main`. Never commit any file containing credentials.

### Recommended VS Code extensions

- ESLint
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- Firebase Explorer
- Prisma (if you add a relational database later)

---

## Master Environment Variables

Every variable listed here must be set in both Vercel (production + preview) and `.env.local` (local development):

```bash
# ── Firebase (client-safe — NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ── Firebase (server-only — NEVER expose to browser)
FIREBASE_SERVICE_ACCOUNT_KEY=          # Full JSON as a string

# ── Paystack
PAYSTACK_SECRET_KEY=                   # Server-only
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=       # Client-safe
PAYSTACK_WEBHOOK_SECRET=               # Server-only

# ── Solana Pay / USDC (optional crypto rail)
NEXT_PUBLIC_SOLANA_NETWORK=            # devnet | mainnet-beta
SOLANA_RPC_URL=                        # Server-only RPC endpoint
SOLANA_USDC_MINT=                      # Server-only allow-listed token mint
PLATFORM_SOLANA_USDC_WALLET=           # Platform fee recipient wallet
SOLANA_PAYMENT_QUOTE_TTL_SECONDS=      # e.g. 600

# ── Encryption (envelope encryption via Google Cloud KMS — see Step 6)
GOOGLE_APPLICATION_CREDENTIALS=        # Server-only — KMS encrypt/decrypt role only
KMS_KEY_RING=                          # Server-only
KMS_ROOT_KEY=                          # Server-only

# ── Email
RESEND_API_KEY=                        # Server-only
RESEND_FROM_ADDRESS=                   # e.g. noreply@tradehub.com

# ── App config
NEXT_PUBLIC_APP_URL=                   # https://tradehub.com in production
SUPER_ADMIN_SECRET_PATH=               # Non-guessable URL segment
NODE_ENV=                              # production | development
```

---

## Pre-Launch Checklist

Complete every item before opening signups to the first influencer.

### Accounts & Infrastructure
- [ ] Domain registered, wildcard DNS (`*.tradehub.com`) configured
- [ ] Vercel Pro plan active, domain + wildcard connected, SSL confirmed active
- [ ] Firebase `tradehub-prod` project created
- [ ] Firebase `tradehub-dev` project created
- [ ] Firestore Security Rules deployed to prod (from document 03)
- [ ] Firebase Auth enabled with MFA in prod
- [ ] Firebase Spark/free plan retained for Prompt 05 unless a paid-only feature is intentionally introduced
- [ ] Firebase Cloud Functions deployed to prod only when payment/scheduler/Telegram/copier stages require them
- [ ] Firebase Blaze plan active on prod project only before deploying paid-only Cloud Functions or other paid-only production infrastructure
- [ ] Paystack business account verified, bank account linked
- [ ] Paystack webhook URL set, webhook secret saved
- [ ] Optional Solana rail: platform USDC wallet created, RPC configured, USDC mint allow-listed, and devnet test payment verified
- [ ] Resend sending domain verified, test email sent successfully
- [ ] All environment variables set in Vercel (production environment)

### Policies (all must be live URLs before any signup)
- [ ] Terms of Service live at `tradehub.com/terms`
- [ ] Privacy Policy live at `tradehub.com/privacy`
- [ ] Risk Disclosure live at `tradehub.com/risk-disclosure`
- [ ] Data Use Policy live at `tradehub.com/data-use`
- [ ] Influencer Code of Conduct wired into workspace onboarding wizard (Step 2)
- [ ] All policies reviewed by a Nigerian lawyer

### Security
- [ ] KMS key ring + root key created; envelope encryption confirmed working end-to-end (encrypt, store, decrypt a test credential)
- [ ] Broker API keys confirmed never returned to any client (test via browser Network tab)
- [ ] Withdrawal-permission check confirmed rejecting a key that has withdrawal enabled
- [ ] Paystack webhook signature verification confirmed working (test with Paystack's test payload)
- [ ] Paystack webhook idempotency confirmed — replaying the same event ID does not double-process
- [ ] Solana payment verification confirmed — wrong mint, wrong amount, wrong recipient, expired quote, and replayed signature are all rejected
- [ ] MFA enforced on Super Admin account, **and** required by Security Rules (not just the sign-in UI) for influencer workspace writes
- [ ] Super Admin URL path is non-guessable and not linked from any public page; rate-limiting/lockout confirmed on the admin login itself, independent of path secrecy
- [ ] Firebase Security Rules: cross-workspace read confirmed blocked (test with two different workspace IDs)
- [ ] Firestore rules unit tests passing in CI (Firebase emulator), including the cross-workspace denial test above
- [ ] `youtubeUrl` confirmed absent from the client-readable lesson document entirely (moved to `/private/video`, `allow read: if false`)
- [ ] Lesson notes rich text confirmed sanitized against stored XSS (test with a `<script>` payload)
- [ ] CSV exports confirmed sanitized against formula injection (test with a field starting with `=`)
- [ ] Auto-Copy signal sanity bounds confirmed rejecting an out-of-range entry price; kill switch confirmed pausing execution instantly
- [ ] Alert confirmed firing on a test change to an influencer's Paystack settlement bank details
- [ ] Firestore daily export to Cloud Storage confirmed running
- [ ] Dependency scanning (`npm audit` / Dependabot) enabled in CI
- [ ] CSP / HSTS / X-Frame-Options headers confirmed present on responses
- [ ] Subdomain/alias deprovisioning step confirmed as part of workspace suspension/deletion (no dangling wildcard alias after offboarding)
- [ ] Super Admin service-account activity confirmed writing to `/audit_log`

### Firestore Quota Controls
- [ ] Local development uses Firebase Emulator by default, not production Firestore
- [ ] All Firestore list queries have explicit `limit()` values
- [ ] Student, application, payment, course, signal, journal, and dispute lists are paginated at 25-50 records per page
- [ ] `/platform_summaries/current` powers Super Admin dashboard totals instead of collection scans
- [ ] `/workspace_summaries/{workspace_id}` powers influencer dashboard totals instead of collection scans
- [ ] Firebase custom claims include `role` and the user's active `workspaceId` where applicable
- [ ] Public application form is create-only; no public application reads or listing
- [ ] Realtime listeners are limited to live product surfaces such as active signals, not every dashboard table
- [ ] Course progress writes occur only at milestones, not every few seconds of video playback
- [ ] Signal creation stores one workspace/tier signal document, not one immediate delivery document per student
- [ ] Firestore usage monitoring checked during QA: reads, writes, deletes, storage, and outbound transfer

### End-to-End QA
- [ ] Student signup flow: invite link → payment → dashboard (tested with Paystack test mode)
- [ ] Paystack split payment confirmed: 90% to influencer subaccount, 10% to your account
- [ ] Optional Solana flow: wallet checkout → USDC split transaction → server verification → dashboard access
- [ ] Telegram bot: signal posted in Telegram → appears in platform signals feed
- [ ] Auto-Copy: signal posted → trade executed in Binance testnet account
- [ ] Journal auto-sync: exchange sandbox trade history appears in student journal
- [ ] Subscription webhooks: activation, past-due, and cancellation all tested
- [ ] Trial billing: trial expires → charge fires → access continues (success path)
- [ ] Trial billing: trial expires → charge fails → access revoked (failure path)
- [ ] Prop firm disclaimer: shown and required before Signal Alerts activates
- [ ] Risk disclosure: shown and required, timestamped and stored in Firestore
- [ ] Light and dark mode: tested on iOS Safari and Android Chrome
- [ ] All five policy pages load correctly on mobile

### Before Each New Influencer Workspace
- [ ] Influencer identity verified
- [ ] Track record or audience proof reviewed
- [ ] Paystack subaccount created, `subaccount_code` stored in Firestore
- [ ] Paystack split created, `split_code` stored in Firestore
- [ ] If Solana checkout is enabled: influencer USDC wallet verified and `solanaPayoutWallet` stored in Firestore
- [ ] Workspace document created in Firestore with `vettingStatus: approved`
- [ ] Workspace setup email sent with login credentials
