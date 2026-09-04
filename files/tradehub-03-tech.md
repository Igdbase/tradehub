# TradeHub — Tech Stack, Database & Payment Architecture
**Document:** 03 of 06  
**Version:** 2.6 | **Last Updated:** July 2026

> **v2.4:** Incorporates fixes from the security & risk review (document 07) — envelope encryption via KMS in place of a single static key, a corrected Firestore rule for the lesson video URL, MFA enforcement at the rules layer, webhook idempotency, Super Admin audit logging, and new backup/monitoring requirements. See document 07 for the full rationale behind each change.
>
> **v2.5:** Adds optional Solana Pay / USDC checkout, Solana payment verification requirements, and Super Admin onboarding-data collections.
>
> **v2.6:** Adds Firestore free-tier/quota guardrails: pagination, dashboard summary documents, custom claims for role/workspace checks, emulator-first development, limited realtime listeners, and milestone-based writes.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router) — native subdomain routing, SSR for fast initial loads.
- **Styling:** Tailwind CSS — utility-first, themed per workspace using the design token system (document 04).
- **UI Components:** shadcn/ui as a base, restyled per the design system — never used unstyled out of the box.
- **Charts:** Recharts — journal equity curve, P&L charts, influencer analytics.
- **State Management:** Zustand — lightweight, works cleanly with Next.js App Router.

### Backend
- **Primary Backend:** Firebase (Firestore, Auth, Cloud Functions, Storage).
- **API Routes:** Next.js API routes — signal parsing, trade execution triggers, Paystack webhook handling.
- **Job Queue:** Google Cloud Tasks — rate-limit-aware copier execution dispatch. Never a synchronous fan-out loop across hundreds of student accounts.
- **Trade Copier (crypto):** Binance REST API + Bybit REST API.
- **Trade Copier (forex, Phase 2):** FX Blue Trade Copier API (MT4/MT5) + cTrader Open API.
- **Telegram Bot:** Telegraf.js — one instance per influencer workspace.

> **Scaling note on Telegram bots:** At MVP scale (under 20 workspaces), long-polling per bot inside Cloud Functions is acceptable. Plan the migration to webhook-based delivery before exceeding ~25 concurrent bot instances — polling N bots concurrently doesn't scale cleanly on serverless infrastructure past that point.

### Database & Auth
- **Database:** Firebase Firestore (NoSQL, real-time, auto-scaling).
- **Authentication:** Firebase Authentication — email/password at MVP, Google OAuth in Phase 2, multi-factor authentication (2FA) required for influencer accounts and broker-linked student accounts. This is enforced both at sign-in and in Security Rules — see the rules section below.
- **Secrets & Key Management:** broker API credentials use **envelope encryption** — a fresh per-credential data key wraps each student's API key/secret, and that data key is itself encrypted by a root key held in **Google Cloud KMS**. Not a single static application-level key: see document 06, Step 6, for the rationale (a single static key was the original MVP plan and had no rotation path).
- **File Storage:** Cloudinary for course lesson attachments (influencer pastes a shareable link — platform stores the URL only, not the file). Firebase Storage only for compressed influencer logos (max 200KB).
- **Real-time:** Firestore listeners — live signal notifications, journal updates, in-app activity feed.

### Payments
- **Default processor:** Paystack — Subaccounts + Split Payment API.
- **Optional crypto rail:** Solana Pay with USDC on Solana — wallet QR/deep-link checkout, server-built transaction requests, and server-side transaction verification before access is granted.
- **Webhooks:** Paystack → Next.js API route → Firebase Function → subscription/dispute status update.
- **Solana payment watcher:** Next.js API route or scheduled Firebase Function verifies payment references/signatures through a trusted Solana RPC provider before subscription activation.

> Verify exact Paystack webhook event names against current API docs at build time. Don't hardcode assumptions from this document.

### Infrastructure
- **Hosting:** Vercel — wildcard subdomain support (`*.tradehub.com`), auto-scaling, auto-SSL.
- **Serverless Functions:** Firebase Cloud Functions — trade sync scheduler, Paystack webhook handler, Telegram bot logic, Cloud Tasks workers, trial billing scheduler.
- **Environment:** Single Firebase project, namespace-isolated per workspace (not a project per influencer — single project is more cost-efficient and easier to manage).

### Notifications
- **In-app:** Firestore real-time listeners.
- **Email:** Resend — transactional only (signup confirmation, payment receipt, signal alert, renewal reminder, past-due warning).
- **Push:** Firebase Cloud Messaging — used for signal alerts and copier failure notifications.

### Storage Cost Strategy

| Content Type | Where It Lives | Cost |
|---|---|---|
| Course videos | YouTube (Unlisted embed) | ₦0 |
| Course thumbnails | YouTube CDN auto-pulled by video ID | ₦0 |
| Lesson attachments | Google Drive / Cloudinary (influencer pastes link) | ₦0 |
| Influencer logos | Firebase Storage (max 200KB compressed on upload) | ~₦0 |
| All structured data (trades, signals, users, disputes) | Firestore text/numbers | ~$1–3/mo at 10k students |
| Broker/exchange API keys | Firestore, envelope-encrypted (KMS-wrapped data key per credential) | Negligible |

**Projected Firebase bill:**
- 20 influencers, 1,000 students → under **$3/month**
- 100 influencers, 10,000 students → under **$15/month**

Enable Firestore offline persistence to cut read counts 60–70% at scale.

### Firestore Quota And Cost Guardrails

The MVP should be built to survive the Firebase Spark/free tier during development and early pilot usage. The biggest early risk is not authentication volume; it is accidental Firestore overuse through unbounded reads, realtime listeners, and noisy writes.

Design rules:

- Use pagination everywhere. Default to 25 records per page and never exceed 50 records per page without an explicit product reason.
- Use dashboard summary documents for totals, revenue, counts, workspace health, payment-rail totals, onboarding status, latest signal, and recent activity instead of scanning whole collections on every page load.
- Use Firebase custom claims for `role` and, where appropriate, `workspaceId`, so role checks and basic route gating do not require extra Firestore reads.
- Save course progress only on meaningful milestones: started, 80% watched, completed, quiz submitted, and last watched timestamp at coarse intervals. Do not write every few seconds of video playback.
- Store one signal document per workspace/tier. Do not create one signal-delivery document per student unless a later stage proves it is necessary for audit or execution tracking.
- Use realtime listeners only where live updates are product-critical, such as currently active signals or in-app signal alerts. Dashboards, CRM lists, payments, and journal analytics should use manual refresh or server-rendered snapshots by default.
- Use the Firebase Emulator for development and automated tests so local experiments do not consume production or development-project quota.
- Keep the public application form as create-only: public users can submit an application but cannot list or read applications.
- Use direct document paths when possible instead of broad collection queries.
- Add explicit query limits to every Firestore list query.
- Never store files, videos, large images, or bulky attachments inside Firestore documents.

Quota-sensitive implementation examples:

- Bad: Super Admin dashboard reads every student, payment, and journal trade to compute totals.
- Good: Super Admin dashboard reads `/platform_summaries/current` and paginated recent items.
- Bad: Student app writes lesson progress every 3 seconds while a video plays.
- Good: Student app writes when a lesson starts, reaches 80%, completes, or when the user exits after meaningful progress.
- Bad: One new signal creates 1,000 student notification documents immediately.
- Good: One signal document is created under the workspace; eligible students read the signal feed, and later execution workers create only the records they truly need.

---

## Firebase Data Architecture

### Full Firestore Collection Structure

```
/workspaces/{workspace_id}
  ├── name
  ├── handle                          (subdomain slug, e.g. "apexfx")
  ├── ownerId                         (Firebase Auth UID of influencer)
  ├── branding: {
  │     logo,                         (Firebase Storage URL)
  │     primaryColor,
  │     accentColor
  │   }
  ├── telegramBotToken                (envelope-encrypted — same KMS-backed scheme as broker keys, not a separate static key)
  ├── paystackSubaccountCode
  ├── paystackSplitCode
  ├── solanaPayEnabled                (bool)
  ├── solanaPayoutWallet              (verified USDC recipient wallet for influencer)
  ├── solanaPartnerPlacementEnabled   (bool — optional "Powered by Solana" surface)
  ├── platformSplitPercent            (default: 10)
  ├── tiers: [
  │     {
  │       id, name, price,
  │       billingPeriod,              (monthly | annual)
  │       features: []                (course | signalAlerts | autoCopy | journal |
  │                                    tagging | calculators | aiInsights)
  │     }
  │   ]
  ├── settings: {
  │     singleTier: bool,
  │     freeTrial: int,               (0 | 3 | 7 | 14 days)
  │     noCardRequired: bool,
  │     refundPolicy: string
  │   }
  ├── vettingStatus                   (pending | approved | rejected | suspended)
  ├── codeOfConductAcceptedAt         (timestamp)
  └── riskDisclosureVersion           (string — version of the disclosure copy used)


/platform_summaries/current
  ├── activeWorkspaceCount
  ├── activeStudentCount
  ├── monthlyGrossRevenueNgn
  ├── monthlyPlatformRevenueNgn
  ├── paystackVolumeNgn
  ├── solanaVolumeUsdc
  ├── openDisputeCount
  ├── pendingApplicationCount
  ├── riskFlagCount
  ├── latestSignalAt
  └── updatedAt

  NOTE: Super Admin dashboards read this summary document first instead of
  scanning all workspaces, students, payments, disputes, and journals. Writes
  happen through Admin SDK/server code only.


/workspace_summaries/{workspace_id}
  ├── activeStudentCount
  ├── trialingStudentCount
  ├── pastDueStudentCount
  ├── monthlyGrossRevenueNgn
  ├── monthlyInfluencerRevenueNgn
  ├── monthlyPlatformRevenueNgn
  ├── paystackPaymentCount
  ├── solanaPaymentCount
  ├── latestSignalId
  ├── latestSignalAt
  ├── openDisputeCount
  ├── courseCompletionAverage
  ├── healthStatus                    (healthy | watch | risk)
  └── updatedAt

  NOTE: Influencer dashboards read this summary document and then paginate
  recent students/signals/payments. They do not scan full workspace collections
  to calculate totals on page load.


/workspaces/{workspace_id}/students/{student_id}
  ├── email
  ├── displayName
  ├── subscriptionTier
  ├── subscriptionStatus              (active | trialing | cancelled | past_due)
  ├── subscriptionStart               (timestamp)
  ├── subscriptionRenewDate           (timestamp)
  ├── trialEndsAt                     (timestamp — null if no trial)
  ├── paystackCustomerCode
  ├── accountMode                     (auto_copy | signal_alerts)
  ├── brokerLinked: {
  │     type,                         (crypto | forex_personal | prop_firm)
  │     exchange,                     (binance | bybit | mt4 | mt5 | ctrader |
  │                                    dxtrade | matchtrade | tradovate | ninjatrader | other)
  │     apiKeyRef,                    (Firestore path to encrypted key doc)
  │     status                        (linked | unlinked | error)
  │   }
  ├── propFirmDisclosureAcceptedAt    (timestamp)
  ├── copierActive                    (bool)
  ├── copierSettings: {
  │     maxRiskPercent,
  │     maxDailyLoss,
  │     maxOpenTrades
  │   }
  ├── journalPrivacy: {
  │     globalPrivate: bool
  │   }
  ├── twoFactorEnabled                (bool)
  └── riskDisclosureAcceptedAt        (timestamp)


/workspaces/{workspace_id}/courses/{course_id}
  ├── title
  ├── description
  ├── thumbnail                       (YouTube CDN URL, auto-pulled)
  ├── accessTier                      (tier id or "all")
  ├── published                       (bool)
  └── sections: [ { id, title, order } ]


/workspaces/{workspace_id}/courses/{course_id}/lessons/{lesson_id}
  ├── title
  ├── youtubeVideoId                  (used to build the embed/thumbnail — see security note below)
  ├── notes                           (rich text — sanitized on write and on render, see doc 02)
  ├── order
  ├── requiresPrevious                (bool)
  ├── attachments: [ { label, url } ] (Google Drive / Cloudinary URLs)
  ├── quiz: {
  │     questions: [
  │       { question, options: [], correctIndex }
  │     ]
  │   }
  └── requiresQuizPass                (bool)


/workspaces/{workspace_id}/courses/{course_id}/lessons/{lesson_id}/private/video
  ├── youtubeUrl                       (raw URL — see security note below)

  NOTE — security correction (v2.4): the raw URL previously lived as a field on the
  lesson document itself, with a Security Rule intended to hide just that field from
  students. That rule was non-functional: Firestore Security Rules can only allow or
  deny a whole document on read, never redact individual fields, so "hide this one
  field" is not something the rules layer can actually do. The raw URL now lives in
  this separate path, which students have zero read access to (see rules below) —
  the same pattern already used for /broker_keys.
  This is distinct from, and does not change, the Unlisted/dev-tools caveat in §5.3
  of document 02: youtubeVideoId is still needed client-side to render the embed, so
  a determined viewer can still reconstruct the watch URL from it. That limitation is
  accepted by design (Decision #8, doc 01) and is what Bunny.net signed URLs (Phase 2)
  are meant to close. This fix closes a different, lower-effort gap: bulk-scriptable
  reads of the raw URL field straight off Firestore, bypassing the app entirely.


/workspaces/{workspace_id}/progress/{student_id}/lessons/{lesson_id}
  ├── watchedPercent
  ├── completed                       (bool — set true at 80% watched)
  ├── quizScore
  ├── quizPassed                      (bool)
  └── lastWatched                     (timestamp)


/workspaces/{workspace_id}/signals/{signal_id}
  ├── postedBy                        (influencer workspace_id)
  ├── market                          (forex | crypto)
  ├── pair                            (e.g. XAUUSD, BTCUSDT)
  ├── action                          (buy | sell)
  ├── entry
  ├── stopLoss
  ├── takeProfit
  ├── riskPercent
  ├── timestamp
  ├── source                          (telegram | in_app)
  ├── status                          (active | edited | cancelled | closed)
  ├── editHistory: [
  │     { field, oldValue, newValue, timestamp }
  │   ]
  └── executionSummary: {
        autoCopyTotal,
        autoCopySuccess,
        autoCopyFailed,
        signalAlertsDelivered
      }


/workspaces/{workspace_id}/journal/{student_id}/trades/{trade_id}
  ├── pair
  ├── direction                       (buy | sell)
  ├── entryPrice
  ├── exitPrice
  ├── lotSize
  ├── pnl
  ├── riskReward
  ├── openTime
  ├── closeTime
  ├── source                          (copied | manual | imported)
  ├── signalId                        (if source = copied)
  ├── notes                           (student personal notes)
  ├── isPrivate                       (bool)
  └── tags: {
        setup,                        (e.g. "breakout", "fib level", "trend")
        session,                      (london | ny | asia)
        account                       (e.g. "prop firm", "personal")
      }


/workspaces/{workspace_id}/journal/{student_id}/insights/{insight_id}
  ├── summary                         (AI-generated text)
  ├── basedOnTagFilter
  └── generatedAt                     (timestamp)


/workspaces/{workspace_id}/disputes/{dispute_id}
  ├── raisedBy                        (student_id | "system")
  ├── type                            (transaction | conduct | chargeback)
  ├── relatedId                       (transaction or signal id)
  ├── status                          (open | escalated | resolved)
  ├── resolution                      (text)
  ├── createdAt                       (timestamp)
      └── resolvedAt                      (timestamp)


/workspace_applications/{application_id}
  ├── name
  ├── email
  ├── handleOrChannel
  ├── audienceSize
  ├── market                          (forex | crypto | both)
  ├── studentAccountMix               (personal | prop_firm | both | unknown)
  ├── monetizationMethod
  ├── notes
  ├── status                          (new | vetting | approved | rejected | workspace_created | activated)
  ├── vettingNotes
  ├── setupFeeStatus                  (not_required | pending | paid | waived)
  ├── workspaceId                     (null until created)
  ├── source                          (landing_page | referral | manual)
  ├── createdAt
  └── updatedAt


/payment_intents/{payment_intent_id}
  ├── rail                            (paystack | solana)
  ├── workspaceId
  ├── studentId
  ├── tierId
  ├── status                          (pending | verified | expired | failed)
  ├── amountNgn
  ├── amountUsdc                      (Solana only)
  ├── fxRateSnapshot                  (Solana only)
  ├── solanaReference                 (Solana only — unique payment reference)
  ├── solanaSignature                 (Solana only — filled after verification)
  ├── influencerWallet                (Solana only)
  ├── platformWallet                  (Solana only)
  ├── splitPercent
  ├── expiresAt
  ├── createdAt
  └── verifiedAt


/processed_solana_transactions/{signature}
  ├── paymentIntentId
  ├── workspaceId
  ├── studentId
  ├── amountUsdc
  ├── verifiedAt
  └── rawReference


/broker_keys/{workspace_id}/students/{student_id}
  ├── encryptedApiKey                 (AES-256 encrypted string)
  ├── encryptedApiSecret              (AES-256 encrypted string)
  └── exchange                        (binance | bybit | mt4 | mt5 | ctrader)

  NOTE: This sub-collection is in a separate top-level path from /workspaces
  specifically so Security Rules can be written more restrictively.
  Keys are NEVER returned to any client — only read by Cloud Functions server-side.
```

---

## Firebase Security Rules

These rules enforce workspace isolation and protect sensitive data. Deploy these before allowing any user traffic.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── WORKSPACES ──────────────────────────────────────────
    match /workspaces/{workspaceId} {

      // Influencer can read their own workspace config
      allow read: if request.auth != null
        && request.auth.uid == resource.data.ownerId;

      // Writes — including payout/split config — require a completed second factor.
      // MFA is required by policy (see Database & Auth above) but policy alone
      // doesn't stop a token obtained before MFA enrollment; enforce it here too.
      allow write: if request.auth != null
        && request.auth.uid == resource.data.ownerId
        && request.auth.token.firebase.sign_in_second_factor != null;

      // ── STUDENTS ─────────────────────────────────────────
      match /students/{studentId} {
        // Student can read/write their own document
        allow read, write: if request.auth != null
          && request.auth.uid == studentId;

        // Influencer can read all students in their workspace
        allow read: if request.auth != null
          && isInfluencerOf(workspaceId);

        // Influencer cannot write student subscription fields
        allow write: if false;
      }

      // ── COURSES ──────────────────────────────────────────
      match /courses/{courseId} {
        // Influencer can create/edit/delete courses
        allow read, write: if request.auth != null
          && isInfluencerOf(workspaceId);

        // Students can read published courses their tier grants access to
        allow read: if request.auth != null
          && isStudentOf(workspaceId)
          && resource.data.published == true;

        match /lessons/{lessonId} {
          // Students can read the lesson document directly — it no longer contains
          // youtubeUrl at all (see schema change above), so there's nothing left to
          // hide at the field level here.
          allow read: if request.auth != null
            && isStudentOf(workspaceId);

          // Influencer can read/write all lesson fields
          allow read, write: if request.auth != null
            && isInfluencerOf(workspaceId);

          // ── PRIVATE VIDEO URL — separate path, zero client read access ──
          match /private/video {
            allow read, write: if false;   // Cloud Functions service account only
          }
        }
      }

      // ── PROGRESS ─────────────────────────────────────────
      match /progress/{studentId}/lessons/{lessonId} {
        allow read, write: if request.auth != null
          && request.auth.uid == studentId;

        allow read: if request.auth != null
          && isInfluencerOf(workspaceId);
      }

      // ── SIGNALS ──────────────────────────────────────────
      match /signals/{signalId} {
        allow read, write: if request.auth != null
          && isInfluencerOf(workspaceId);

        allow read: if request.auth != null
          && isStudentOf(workspaceId);
      }

      // ── JOURNAL ──────────────────────────────────────────
      match /journal/{studentId}/trades/{tradeId} {
        // Student can read/write own trades
        allow read, write: if request.auth != null
          && request.auth.uid == studentId;

        // Influencer can read non-private trades only
        allow read: if request.auth != null
          && isInfluencerOf(workspaceId)
          && resource.data.isPrivate == false
          && !isGlobalPrivate(workspaceId, studentId);
      }

      // ── DISPUTES ─────────────────────────────────────────
      match /disputes/{disputeId} {
        // Student can create a dispute but not read others
        allow create: if request.auth != null
          && isStudentOf(workspaceId);

        // Influencer can read disputes in their workspace
        allow read: if request.auth != null
          && isInfluencerOf(workspaceId);

        // Super Admin reads via privileged service account — not client rules
      }
    }

    // ── BROKER KEYS — SERVER-SIDE ONLY ──────────────────────
    match /broker_keys/{workspaceId}/students/{studentId} {
      // No client reads EVER — only Cloud Functions service account
      allow read, write: if false;
    }

    // ── SUMMARY DOCS — QUOTA-SAFE DASHBOARD READS ───────────
    match /platform_summaries/current {
      allow read, write: if false;    // Super Admin panel via Admin SDK only
    }

    match /workspace_summaries/{workspaceId} {
      allow read: if request.auth != null
        && isInfluencerOf(workspaceId);
      allow write: if false;          // Updated by server/Admin SDK only
    }

    // ── OWNER / PAYMENT OPS — SERVER-SIDE ONLY ───────────────
    match /workspace_applications/{applicationId} {
      allow read, write: if false;    // Super Admin panel via Admin SDK only
    }

    match /payment_intents/{paymentIntentId} {
      allow read, write: if false;    // API routes create/verify; clients do not trust-write status
    }

    match /processed_solana_transactions/{signature} {
      allow read, write: if false;    // idempotency ledger for server-side Solana verification
    }

    // ── HELPER FUNCTIONS ────────────────────────────────────
    function isInfluencerOf(workspaceId) {
      return request.auth.token.role == "influencer"
        && request.auth.token.workspaceId == workspaceId;
    }

    function isStudentOf(workspaceId) {
      return request.auth.token.role == "student"
        && request.auth.token.workspaceId == workspaceId;
    }

    function isGlobalPrivate(workspaceId, studentId) {
      return get(/databases/$(database)/documents/workspaces/$(workspaceId)/students/$(studentId))
        .data.journalPrivacy.globalPrivate == true;
    }
  }
}
```

The helper functions intentionally rely on Firebase custom claims for `role` and `workspaceId`. That keeps common authorization checks cheap and avoids an extra Firestore `get()` on every protected read. If a user can belong to multiple workspaces in a later phase, update the claim shape deliberately rather than falling back to broad collection scans.

**Super Admin access** is handled via a Firebase Admin SDK service account used only in the server-side super admin panel — never exposed to any client. The service account bypasses all Security Rules by design.

> ⚠️ **Security note (v2.4):** Bypassing all rules by design means this credential is the single highest-value secret in the system, and nothing was logging what it was used for. Every read or write made through it is now logged — actor, action, target document, timestamp — to an append-only `/audit_log` collection that no client-facing code path can write to or delete from. `FIREBASE_SERVICE_ACCOUNT_KEY` gets the same handling as the KMS root key above: restricted access, planned rotation, never logged or echoed anywhere (including error messages).

---

## Payment Architecture (Paystack)

### Setup Per Influencer Workspace

1. Influencer creates their own Paystack account and links their settlement bank — they control their money directly.
2. You create a **Paystack Subaccount** for them via the Paystack Dashboard or API using their business name, settlement bank, and account number.
3. Store the returned `subaccount_code` in their Firestore workspace document.
4. Create a **Paystack Split** configuration: 90% → influencer subaccount, 10% → your main account.
5. Store the returned `split_code` in their workspace document.
6. Every subsequent charge for that workspace uses this `split_code` — Paystack enforces the split at transaction time. Neither party can delay or withhold the other's payment.

### Subscription Initiation Flow

```
Student selects tier
  ↓
POST /api/paystack/initiate-subscription
  ↓
  → Create Paystack customer (if new) using student email
  → If free trial:
      Set Firestore subscriptionStatus = "trialing"
      Set trialEndsAt = now + trial days
      Grant tier access immediately
      Schedule billing via Cloud Tasks
      Return to dashboard (no Paystack redirect)
  → If paid:
      Create Paystack plan (amount, interval, currency)
      Initiate charge with split_code attached
      Return Paystack checkout URL
      Redirect student to checkout
```

### Webhook Handler

```
POST /api/paystack/webhook
  ↓
  1. Verify HMAC-SHA512 signature using PAYSTACK_WEBHOOK_SECRET
     → Reject with 401 if invalid
  ↓
  2. Check the event ID against /processed_webhook_events
     → If already seen, return 200 and stop here. Paystack can and does
       redeliver events — without this check, a redelivered charge.success
       or dispute event gets processed twice.
  ↓
  3. Route by event type:

  charge.success
    → Set subscriptionStatus = "active"
    → Set subscriptionTier
    → Unlock tier features

  subscription.disable  (or cancellation event — check Paystack docs)
    → Set subscriptionStatus = "cancelled"
    → Restrict access after current period ends (grace: end of billing cycle)

  invoice.payment_failed  (or equivalent)
    → Set subscriptionStatus = "past_due"
    → Start 3-day grace period
    → Send past-due email via Resend

  dispute.create  (or chargeback equivalent)
    → Suspend student access
    → Create /disputes record in Firestore
    → Send Super Admin notification

  4. Record the event ID in /processed_webhook_events before returning 200
```

## Payment Architecture (Solana Pay / USDC)

Solana checkout is optional per workspace. Paystack remains the default rail; Solana is used for students who prefer crypto payment and for any investor/partner requirement around Solana visibility.

### Setup Per Influencer Workspace

1. Influencer adds a Solana wallet address that can receive USDC.
2. Platform sends a tiny verification challenge or requires the influencer to sign a wallet message before enabling Solana payout.
3. Store the verified wallet in `solanaPayoutWallet`.
4. Enable `solanaPayEnabled` only after wallet verification, risk disclosure copy, and refund-policy copy are complete.
5. Optional: enable `solanaPartnerPlacementEnabled` to show restrained "Powered by Solana" copy on checkout/landing surfaces.

### Solana Subscription Flow

```
Student selects tier
  ↓
POST /api/solana/create-payment-intent
  ↓
  → Confirm workspace has solanaPayEnabled = true
  → Quote Naira tier price into USDC with short expiry
  → Create /payment_intents/{id} with status = "pending"
  → Generate unique Solana Pay reference
  → Return Solana Pay transaction request / QR payload
  ↓
Student approves wallet transaction
  ↓
POST /api/solana/verify-payment
  ↓
  → Fetch transaction from trusted RPC
  → Verify signature, reference, USDC mint, exact amount, recipients, and split
  → Check /processed_solana_transactions/{signature} for idempotency
  → Mark payment intent "verified"
  → Set subscriptionStatus = "active"
  → Record processed signature
  → Send receipt
```

### Split Strategy

The Solana Pay transaction request should contain two USDC transfer instructions in the same transaction:

| Recipient | Amount |
|---|---|
| Influencer verified USDC wallet | 90% by default |
| Platform USDC wallet | 10% by default |

This avoids platform custody and keeps the Solana rail aligned with the Paystack split model. If a future Solana partner provides a hosted gateway with native split settlement, it can replace this transaction-request implementation without changing the product surface.

### Solana Failure / Edge Cases

- If the quote expires before payment confirms, keep the student on checkout and ask them to refresh the quote.
- If the transaction uses the wrong token mint, wrong amount, wrong recipients, or missing reference, do not activate access.
- If a transaction is confirmed but verification fails due to RPC outage, leave the intent pending and retry from the payment watcher.
- Crypto payments are final at the rail level; refunds must be handled as a manual USDC return flow or an equivalent Paystack/local refund when agreed by the influencer.

### Trial Billing Cloud Function

```javascript
// Runs on a scheduled cron (every hour or daily)
// Checks for trials ending within the next billing window

exports.processTrialBilling = onSchedule('every 1 hours', async () => {
  const now = admin.firestore.Timestamp.now();
  const trialsDue = await db.collectionGroup('students')
    .where('subscriptionStatus', '==', 'trialing')
    .where('trialEndsAt', '<=', now)
    .get();

  for (const doc of trialsDue.docs) {
    const student = doc.data();
    // Initiate Paystack charge for this student
    // On success: set status to "active"
    // On failure: set status to "cancelled", revoke access
  }
});
```

### Non-Functional Requirements

**Performance**
- Page load < 2s on 4G mobile.
- Signal delivery < 5 seconds from post to push notification.
- Journal sync: every 15 minutes automatic, on-demand within 30 seconds.

**Security**
- Broker API keys encrypted via envelope encryption (per-credential data key wrapped by a KMS root key) — never returned to any client, Cloud Functions only.
- Re-authentication required to view or change a linked API key.
- Paystack webhook signature verified on every webhook call, with idempotency on event ID to prevent double-processing of redelivered events.
- Solana payments verified server-side before access is granted: validate transaction signature, unique reference, USDC mint, recipient wallets, split amounts, expiration window, and idempotency by signature. Never trust a client-supplied "paid" status.
- Firebase Security Rules enforce workspace isolation at the database level, with MFA second-factor required (in the rules themselves, not just at sign-in) for any write to a workspace's payout/split configuration.
- Firestore Security Rules covered by automated unit tests (Firebase emulator) in CI, including an explicit cross-workspace read-denial test — the single-project, rules-only isolation model means a regression here is a cross-tenant breach, not a contained one.
- All Super Admin service-account activity logged to an append-only audit collection.
- Lesson notes (rich text) sanitized on write and on render to prevent stored XSS from influencer-authored content.
- CSV exports (member lists, journal data) sanitized against spreadsheet formula injection.
- Content-Security-Policy, HSTS, and X-Frame-Options headers set on all responses; CSP allow-lists the YouTube embed origin and nothing else by default.
- HTTPS across all subdomains (Vercel auto-provisions).

**Reliability (Auto-Copy)**
- Signal sanity bounds checked before a signal enters the queue: reject if entry price is more than a configurable % from live market price at time of posting.
- Per-workspace signal-rate limit to contain a compromised Telegram account or repeated posting error.
- Influencer- and Super-Admin-level kill switch to pause all execution for a workspace instantly, independent of the queue.
- Cloud Tasks queue — never synchronous fan-out.
- Max concurrent executions per workspace respects exchange rate limits.
- 3 retries with exponential backoff before marking `failed`.
- Student push notification within seconds of any failure.

**Operational Resilience**
- Firestore: daily scheduled export to Cloud Storage, retained 30 days, as a recovery path independent of any built-in point-in-time recovery.
- Dependency vulnerability scanning (`npm audit` / Dependabot) running in CI — this stack handles payment and broker credentials, so supply-chain hygiene isn't optional.
- Alerting (e.g. Sentry plus a paging channel) on: copier execution failure spikes, webhook processing stalls, and any change to an influencer's Paystack settlement bank details. The last of these is the most common fraud vector in split-payment marketplaces and should page the Super Admin immediately, not just appear in a dashboard later.
- Subdomain/domain-alias deprovisioning is a hard step in workspace suspension/deletion (see document 02, Workspace Offboarding) — a freed wildcard subdomain left dangling is a takeover risk.

**Scalability**
- Firestore, Vercel, and Cloud Functions all scale automatically.
- Migrate Telegram bots from long-polling to webhooks before exceeding ~25 workspaces.

**Availability**
- Target uptime: 99.5%.
- Firebase and Vercel both offer SLA-backed uptime.
- Telegram bots reconnect automatically on disconnect.
