# TradeHub — Feature Specifications
**Document:** 02 of 06  
**Version:** 2.5 | **Last Updated:** July 2026

> **v2.4:** Incorporates fixes from the security & risk review (document 07) — Auto-Copy sanity checks and a kill switch, API key withdrawal-permission validation, lesson-notes XSS sanitization, CSV export sanitization, settlement-change fraud monitoring, and tighter workspace-offboarding sequencing. See document 07 for the full rationale behind each change.
>
> **v2.5:** Adds optional Solana Pay / USDC checkout and a clearer Super Admin onboarding-data dashboard.

---

## 5.1 Super Admin Panel

**Dashboard:** total active workspaces, total students, platform revenue, recent activity feed.

**Workspace Management:** list of workspaces (name, subdomain, student count, revenue, status), Create New Workspace (gated by vetting checklist), suspend/reactivate/delete.

**Onboarding CRM:** application list from the landing page, applicant contact details, audience size, market, account type mix (personal vs prop firm), monetization method, vetting notes, call outcome, setup-fee status, workspace creation status, and activation milestone ("first paying student").

**Revenue Analytics:** per-influencer breakdown, platform earnings over time, Paystack transaction log.

**Payment Rail Analytics:** Paystack volume, Solana Pay volume, per-rail conversion, failed checkout rate, refund/dispute rate, and platform fee collected per rail.

**Trust & Safety Queue:** open disputes, flagged influencers, chargeback rate per workspace.

**Platform Settings:** default revenue split, admin branding, manage super admin accounts, vetting checklist template, risk disclosure copy/version.

---

## 5.2 Influencer Workspace & Onboarding

**Onboarding Flow:**

0. **Vetting (pre-workspace):** identity verification + proof of track record or audience. You review and approve manually at MVP.
1. You create the workspace — influencer receives setup email with login credentials.
2. **Step 1 — Branding:** logo, brand colour, workspace name.
3. **Step 2 — Code of Conduct:** influencer reads and accepts (logged with timestamp).
4. **Step 3 — Telegram Bot Setup:** influencer creates bot via @BotFather, pastes token, platform verifies. One bot per workspace; no signal crossover possible.
5. **Step 4 — Pricing:** single-tier or multi-tier, set prices, set refund policy.
6. **Step 5 — First Course:** guided prompt to add first course.
7. **Done → Dashboard.**

**Dashboard Home:** student count, revenue this month, recent activity, quick links (add lesson / post signal / message members), 7-day inactive alerts.

---

## 5.3 Course Hub

Videos are hosted on the influencer's own YouTube account (set to **Unlisted**) and embedded inside the platform.

> ⚠️ **Correct framing for influencers:** Unlisted hides the video from search and the influencer's public channel, and the platform never displays the raw URL to students. But this is a **deterrent, not encryption** — a student who opens browser dev tools can still locate the video ID. Tell influencers: *"Unlisted keeps casual viewers out and keeps your content off competitors' radar — it will not stop a determined person."* For high-value paid content (e.g. ₦150,000 masterclasses), the Phase 2 path is Bunny.net with signed URLs that expire per-session.

**Course Structure:**
```
Course
  └── Section (e.g. "Week 1 — Foundations")
        └── Lesson (e.g. "What is a Pip?")
              ├── Video (embedded, Unlisted YouTube)
              ├── Description / Notes (rich text)
              ├── Attachments (Google Drive / Cloudinary links — paste URL, not upload)
              └── Quiz (optional, 1–5 questions)
```

**Creating a Lesson:** paste the Unlisted YouTube URL → auto-embed → add notes → optional attachments → optional quiz → toggle "require previous lesson" / "require quiz pass" → set tier access.

> ⚠️ **Security note:** Notes are rich text authored by the influencer and rendered to every student in the workspace. Sanitize on write **and** on render (e.g. DOMPurify) — never trust stored rich text as safe HTML. A compromised or malicious influencer account is otherwise a stored-XSS path into every one of their students' browsers.

**Course thumbnail:** auto-pulled from YouTube CDN via video ID — `img.youtube.com/vi/{VIDEO_ID}/maxresdefault.jpg`. Zero storage cost.

**Student view:** course library grid with progress bars and tier-locked badges, lesson view with embedded player, auto-complete at 80% watched, notes, quiz, next/previous navigation.

**Influencer-visible progress per student:** lessons watched, last active date, quiz scores, completion %, approximate time spent.

---

## 5.4 Member Management

**Members List:** Name, Email, Join Date, Tier, Status, Last Active, Course Progress % — searchable, filterable, exportable to CSV.

> ⚠️ **Security note:** Sanitize every exported field against spreadsheet formula injection — escape or prefix any value starting with `=`, `+`, `-`, or `@` before writing the CSV. Most influencers open exports directly in Excel/Sheets, where an unsanitized field can execute as a formula on open. Applies to the journal export in §5.6 as well.

**Individual Member Profile:** subscription details, course progress, signal/copier status, journal summary (respecting privacy), message button, flag for Trust & Safety.

**Broadcast Messaging:** all members or a filtered group (by tier, activity, status), delivered as in-app notification + optional email.

**Analytics:** active subscribers over time, churn rate, most-watched lessons, average course completion rate.

---

## 5.5 Trade Signals & Copier

> ⚠️ **Critical architecture note:** The majority of influencer students use **prop firm funded accounts** (FTMO, Apex, MyForexFunds, FundedNext, etc.). Virtually every prop firm's Terms of Service explicitly prohibits receiving external signals that are auto-copied into the account — this is classified as "group trading" and results in immediate account termination and loss of funded capital. The signal feature is therefore split into two delivery modes.

### The Two Modes

**Mode 1 — Auto-Copy** (personal/live accounts only)
Full automated execution — influencer posts a signal, platform executes the trade directly in the student's account. Only available for accounts the student fully owns with no external ToS restriction: personal live forex accounts and personal crypto exchange accounts.

**Mode 2 — Signal Alerts** (prop firm accounts and all other account types)
The signal is delivered instantly to the student's dashboard and as a push notification. The student sees the full trade setup and executes manually on their own platform. No auto-execution. No ToS violation.

> The influencer posts one signal. The platform routes it to Auto-Copy for students with a personal account linked, and simultaneously delivers it as a Signal Alert to prop firm students. One signal, two paths, no extra steps for the influencer.

### Platform Support Matrix

| Platform | Common use | Mode |
|---|---|---|
| Binance (personal) | Crypto | Auto-Copy ✅ |
| Bybit (personal) | Crypto | Auto-Copy ✅ |
| MT4/MT5 (personal live) | Forex | Auto-Copy ✅ via FX Blue (Phase 2) |
| cTrader (personal live) | Forex | Auto-Copy ✅ via cTrader Open API (Phase 2) |
| MT4/MT5 (prop firm) | FTMO, FundedNext | Signal Alert only ⚠️ |
| cTrader (prop firm) | Many modern prop firms | Signal Alert only ⚠️ |
| DXtrade (prop firm) | Growing number of prop firms | Signal Alert only ⚠️ |
| Match Trader (prop firm) | Modern prop firm platform | Signal Alert only ⚠️ |
| Tradovate (prop firm) | Apex, Topstep, futures | Signal Alert only ⚠️ |
| NinjaTrader (prop firm) | Futures prop firms | Signal Alert only ⚠️ |

### Signal Input (Influencer Side)

**Method 1 — Telegram Bot (MVP):** one dedicated bot per workspace via @BotFather. Structured format:
```
SIGNAL
Pair: XAUUSD
Action: BUY
Entry: 2310.50
SL: 2300.00
TP: 2340.00
Risk: 1%
```

**Method 2 — In-App Signal Form:** structured form (Market, Pair, Action, Entry, SL, TP, Risk %). Both methods can run simultaneously. The influencer never needs to know which delivery mode each student receives — routing is automatic.

### Signal Lifecycle

| Status | Auto-Copy effect | Signal Alert effect |
|---|---|---|
| `active` | Queued for execution | Displayed live on dashboard |
| `edited` | Corrected values used for pending; executed students notified | Alert updated in-place with change indicator |
| `cancelled` | No further executions | Alert marked cancelled |
| `closed` | Close order pushed to all accounts that copied it | Alert shows "Influencer has closed this trade" |

### Student Account Setup — Auto-Copy

**Crypto (Binance, Bybit):** student generates a Trade-Only API key, pastes it in-app. Platform verifies — including an authenticated check against the exchange's own permissions endpoint to confirm withdrawal permission is actually disabled, rejecting the key with a clear fix-it message if it isn't. Don't rely on the student having created the key correctly; both Binance and Bybit expose this permission status, so check it instead of trusting the label. Once accepted, stores AES-256 encrypted. Risk controls: max % per trade, max daily loss auto-pause, max open trades. Requires 2FA on the exchange account before linking.

**Forex personal MT4/MT5 (Phase 2):** broker server + account number + investor password via FX Blue API. Same risk controls and 2FA requirement.

**Forex personal cTrader (Phase 2):** OAuth-style connection via cTrader Open API using cTrader ID — no password sharing required.

### Student Account Setup — Signal Alerts

Student selects "I use a prop firm account" during onboarding. Chooses their platform (MT4/MT5, cTrader, DXtrade, Match Trader, Tradovate, NinjaTrader, or Other). **No credentials are entered.** The platform never connects to their prop firm account.

The student receives:
- Push notification the moment a signal is posted
- Full signal card in the Signals tab: pair, direction, entry, SL, TP, risk
- Optional personal Telegram forwarding if they enable it
- "Open my platform" deep link where applicable

Manual trades can be imported to their TradeHub journal via CSV export (all major platforms support this) or entered manually.

### Prop Firm Safety Disclaimer

Shown and explicitly accepted before Signal Alerts activates:

> *"TradeHub delivers trade signal ideas from your influencer for your reference. You are solely responsible for deciding whether to execute any trade on your funded account. Copying or mirroring trades in a way that violates your prop firm's Terms of Service — including any prohibition on group trading, external signals, or automated execution — is your responsibility alone. TradeHub does not auto-execute trades into prop firm accounts. Always check your prop firm's current Terms of Service before acting on any signal."*

### Execution Safeguards (Auto-Copy only)

- **Signal sanity bounds (checked before a signal ever enters the queue):** reject if `entry` is more than a configurable % from the live market price at time of posting (e.g. 3% for major FX pairs, wider for volatile crypto pairs). Catches both a hijacked Telegram account and an influencer fat-fingering a price or decimal.
- **Per-workspace signal-rate limit:** cap signals accepted per minute per workspace. A compromised account posting rapid-fire signals is contained rather than fanned out to every copying student before anyone reacts.
- **Kill switch:** both the influencer and Super Admin can pause all Auto-Copy execution for a workspace instantly. This is independent of any single signal's status and takes effect immediately — it's the circuit breaker for "something is wrong and I need execution stopped right now," not a per-trade control.
- Executions dispatched through a **Cloud Tasks queue** — never a synchronous loop.
- Max concurrent executions per workspace respects Binance/Bybit/FX Blue rate limits.
- 3 retries with exponential backoff on transient failures before marking `failed`.
- Student receives push notification on failure with specific reason and one-tap fix link.

### Influencer Copier Dashboard

Students on Auto-Copy (count, platform breakdown), students on Signal Alerts (count, platform breakdown), signal history, delivery success rate per mode, failed Auto-Copy executions with reason.

---

## 5.6 Trading Journal

### Auto-Population

**Crypto:** synced via exchange API every 15 minutes and on-demand; both copied and manual trades pulled in.

**Forex personal accounts:** copier trades auto-logged. Manual trades importable via MT4/MT5 / cTrader CSV export.

**Prop firm accounts:** student imports trades manually via CSV export from their prop firm platform, or enters them manually. No API connection to the prop firm.

### Journal Features (Student)

**Trade Log:** Date, Pair, Direction, Entry, Exit, P&L, R:R, Duration, Notes — filterable, colour-coded.

**Trade Tagging:** students tag trades by setup (e.g. breakout, fib level, trend), session (London/NY/Asia), and account type. Makes filtering by "what's actually working" possible instead of just a chronological list.

**Performance Dashboard:** win rate, average R:R, total P&L (week/month/all-time), best/worst day, most profitable pair, streaks, equity curve, P&L calendar heatmap (days coloured green/red by outcome).

**Privacy Controls:** global "hide my journal" toggle, per-trade private toggle.

### Journal Features (Influencer)

Per-student view respects privacy (full / hidden / partial with `[Hidden Trade]` placeholders). Aggregate view: % of students profitable this month, average win rate, most-traded pairs, opt-in performance leaderboard.

### Trading Calculators

Standalone utility — not gated behind broker linking. Position size, risk %, and R:R calculators that work from manual input. Useful from day one, strong reason for a free/Starter tier to feel generous.

### AI Journal Insights (Phase 2)

Runs against the student's tagged trade history to surface patterns (e.g. "your London-session trades win at 74% vs NY at 38%") and suggest what to review. Moved from Phase 3 because it is already proven in comparable products.

### Influencer Control

Tagging, Calculators, and AI Insights are each their own toggle in the tier feature list (§5.7). Influencer decides which tier gets which features. Nothing is platform-wide by default.

---

## 5.7 Tiered Monetization & Payments

### Pricing Configuration

**Option A — Single Price:** one subscription, all enabled features.

**Option B — Multi-Tier:** 2–3 tiers with name, price, description, and a **per-feature toggle list**: Course / Signal Alerts / Auto-Copy / Journal / Trade Tagging / Calculators / AI Insights. Every new feature added to the platform extends this same list — the influencer decides what goes in which tier.

**Billing:** monthly or annual (influencer's choice), annual discount optional.

### Payment Rails

**Paystack (default MVP rail):** card, bank, and local payment checkout for Paystack-supported markets. Paystack remains the default for Nigerian students and the simplest path for local settlement.

**Solana Pay / USDC (optional crypto rail):** student chooses "Pay with Solana" at checkout, connects a Solana wallet or scans a Solana Pay QR code, and pays the quoted subscription amount in USDC on Solana. This rail is optional per workspace and can also support a restrained "Powered by Solana" partner placement on the checkout screen or landing page.

Recommended Solana checkout behavior:
- Quote the workspace tier price in USDC at checkout time, with a short expiry window.
- Build the Solana Pay transaction server-side so the payment can include two USDC transfer instructions: influencer wallet receives their agreed share, platform wallet receives the platform fee.
- Store the transaction signature, reference, USDC amount, exchange-rate snapshot, split percentages, and credited subscription period in Firestore.
- Activate the subscription only after server-side verification confirms the transaction signature, reference, token mint, recipient wallets, and exact amount.
- If an influencer has not connected a verified Solana payout wallet, hide Solana checkout for that workspace.

**Influencer also controls:** free trial length (0/3/7/14 days), free preview tier, refund policy, "no card required" copy on free/trial tier.

### Free Trial — Implementation Note

Paystack has no native trial period (unlike Stripe). It must be built in-app:

1. Student selects a trial tier → platform creates the record with `subscriptionStatus: "trialing"` + `trialEndsAt` timestamp, and grants access immediately.
2. No Paystack charge yet.
3. A scheduled Cloud Function fires on `trialEndsAt` → initiates the actual charge.
4. If the student cancels before `trialEndsAt` or the charge fails → access revoked, no charge ever fires.

### Payment Flow

```
Student selects tier → /api/paystack/initiate-subscription
  → Create Paystack customer (if new)
  → If trial: set status "trialing", skip charge
  → Else: create plan + initiate charge with split_code → checkout URL

Paystack webhook → /api/paystack/webhook
  → Verify signature
  → charge.success → activate tier
  → subscription.disable → mark "cancelled", restrict after grace period
  → payment-failed → mark "past_due", start 3-day grace period
  → dispute/chargeback → suspend access, open dispute record, notify Super Admin
```

**Solana payment flow:**

```
Student selects tier → chooses "Pay with Solana"
  → /api/solana/create-payment-intent
  → Server creates quote + unique reference + Solana Pay transaction request
  → Student approves USDC transaction in wallet
  → /api/solana/verify-payment or payment watcher verifies on-chain transaction
  → If valid: activate tier, record split, send receipt
  → If expired/invalid: keep checkout pending or show retry
```

*(Confirm exact Paystack webhook event names against current API docs at build time.)*

### Influencer Payout

Paystack settles the influencer's 90% and your 10% independently on T+1 schedule. Neither party can delay or withhold the other's payment.

---

## 5.8 Trust, Safety & Compliance

### Influencer Vetting

Before a workspace is activated: identity verification, verifiable track record or audience proof, signed acceptance of the Influencer Code of Conduct (see document 05).

### Regulatory Exposure

Automated execution of a third party's trade signals can be treated as investment advice in some jurisdictions. Get Nigeria-specific legal review before the Auto-Copy feature goes live at meaningful scale. This is a flag, not legal advice.

### Disputes & Refunds

- In-app flow for a student to flag a transaction or report conduct — routes to influencer, escalates to Super Admin if unresolved.
- Refund policy is influencer-configured and shown at checkout.
- A Paystack chargeback reduces both splits proportionally and suspends access pending resolution.
- Repeated chargebacks auto-flag the workspace for Super Admin review.
- **Settlement-change alert:** any change to an influencer's Paystack subaccount settlement bank details triggers an immediate Super Admin notification, with a short confirmation hold before the new detail becomes active for payout. Hijacking the payout destination on a split-payment account is the most common fraud vector in marketplaces like this one — don't let it surface only in a monthly revenue dashboard.

### Workspace Offboarding

- Suspension/deletion disables logins, signal posting, and Auto-Copy execution **immediately** — there is no live-service gap between "suspended" and "export window." The 14 days that follow are read-only export access for the influencer and students, not continued live service.
- Subdomain routing and the Vercel domain alias are deprovisioned as part of this same step, before the export window closes — not left dangling afterward. A freed wildcard-subdomain alias is a subdomain-takeover risk: it can potentially be reclaimed and used to serve phishing content on a domain students already trust.
- Influencer can export their student list and course content before deletion completes.
- Already-settled payouts are unaffected.

### Account Security

- 2FA required for all influencer accounts and any student who links an exchange/broker.
- Re-authentication required to view or change a linked API key.
- Surface this visibly: small "Encrypted · 2FA protected" badge on account-linking screens.

### Student-Facing Onboarding

1. Student clicks invite link → redirected to influencer's subdomain signup.
2. Email + password (Google OAuth is Phase 2).
3. Choose tier → Paystack payment.
4. If tier includes signals/copier → accept risk disclosure + prop firm disclaimer before activation.
5. Land on personal dashboard.
6. Brief light/dark mode reveal moment on first load (2-second beat, not an extra step).
