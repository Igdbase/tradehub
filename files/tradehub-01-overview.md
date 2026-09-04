# TradeHub — Product Overview & Business Model
**Document:** 01 of 06  
**Version:** 2.6 | **Last Updated:** July 2026

> **v2.4:** Incorporates one fix from the security & risk review (document 07) — the Super Admin Access framing below now makes explicit that the hidden URL path is a deterrent layered on top of real authentication, not a substitute for it. See document 07 for the full rationale, and documents 02/03/06 for the rest of the v2.4 fixes (encryption key management, Auto-Copy safeguards, fraud monitoring, and more).
>
> **v2.5:** Adds an optional Solana Pay / USDC checkout path and makes the platform-owner onboarding/data dashboard explicit. Paystack remains the default Nigeria-first rail; Solana is an additional crypto rail and partner surface, not a replacement.
>
> **v2.6:** Adds a quota-conscious Firestore operating model for the real backend foundation: paginated reads, dashboard summary documents, custom-claim role/workspace checks, emulator-first development, and milestone-based writes.

---

## What Is TradeHub?

TradeHub is a **multi-tenant, white-label SaaS platform** built for trading influencers (forex and crypto). Each influencer who purchases a workspace gets a fully isolated, branded platform they can sell to their own audience — without any visible trace of TradeHub underneath.

From the student's perspective, they are using **their influencer's own product**. From the influencer's perspective, they own a fully featured trading education and signals platform. From your perspective, you are running a scalable SaaS business collecting a revenue share on every student payment.

---

## Core Value Proposition

| For Influencers | For Students |
|---|---|
| Own a professional platform in days, not months | Learn trading from their trusted influencer in one place |
| Earn from courses, signals, and community | Receive and act on expert trade signals |
| See exactly how their students are performing | Track their own trading performance over time |
| No technical setup — you handle it all | Simple, beautiful, mobile-first experience |

---

## The Three Pillars

1. **Course Hub** — YouTube-powered lesson platform with progress tracking, chapter locking, and quizzes. Videos play inside the platform; students never see a YouTube URL.
2. **Trade Signals** — Signals posted via Telegram or in-app, delivered as auto-copy (personal accounts) or manual alerts (prop firm accounts). See document 02 for the full architecture.
3. **Trading Journal** — Auto-populated trade history with performance analytics, tagging, and granular privacy controls.

---

## Business Model

You take a **percentage split on every student payment**. The default MVP rail is Paystack's Split Payment feature. A second optional rail, **Solana Pay using USDC on Solana**, can be enabled for workspaces that want crypto checkout or where a Solana partnership/investor requirement makes it strategically valuable.

**Recommended split:** 10% to platform (you) / 90% to influencer — negotiable per influencer.

### Payment Rails

| Rail | MVP Role | Notes |
|---|---|---|
| **Paystack** | Default checkout for Nigerian / Paystack-supported students | Handles cards, bank transfers, local settlement, and the normal automatic split. |
| **Solana Pay / USDC** | Optional crypto checkout and Solana partner surface | Student pays in USDC on Solana via wallet QR/deep link. The checkout transaction should split atomically: influencer wallet receives their share, platform wallet receives the platform fee. |

Use USDC, not volatile SOL, for subscriptions by default. If tier prices are stored in naira, the Solana checkout quotes a USDC amount at checkout time with a short expiry window. Any "Powered by Solana" placement should be attached to the crypto checkout, investor/partner section, or payment-option copy — not forced into every student screen.

**Why this works:**
- Zero barrier for influencers to get started — they only pay when they earn.
- You scale passively as their student base grows.
- Paystack handles the split in real time; no manual invoicing, no chasing payments.

### How Influencers Make Money

| Tier | Suggested Features | Influencer Sets Price |
|---|---|---|
| **Starter** | Course content only | e.g. ₦5,000/mo |
| **Pro** | Course + Trading Journal | e.g. ₦15,000/mo |
| **Elite** | All features + Trade Signals | e.g. ₦30,000/mo |

The influencer can also collapse everything into a **single flat price** — a toggle they control in their dashboard. All tier decisions are theirs. Nothing is hard-coded to a price point.

---

## System Architecture

### Multi-Tenancy

Every influencer workspace is **fully isolated** at the database layer. No student data, course data, trade data, or financial data is ever shared across workspaces.

```
PLATFORM OWNER (Super Admin)
        │
        ├── Influencer Workspace A  (workspace_id: inf_001)
        │       ├── subdomain: john.tradehub.com
        │       ├── branding: custom logo, colors
        │       ├── students: [student_A1, student_A2 ...]
        │       └── data: courses, journals, trades — ISOLATED
        │
        ├── Influencer Workspace B  (workspace_id: inf_002)
        │       └── ...
        │
        └── Influencer Workspace N ...
```

### Subdomain Routing

`[influencer-handle].tradehub.com` — the frontend reads the subdomain on load and pulls the correct workspace config. A student never sees another influencer's data.

### Invite Link System

`tradehub.com/join/[influencer-handle]` is the **only** student onboarding path — keeps workspace assignment clean and unambiguous.

### Super Admin Access

The super admin panel is accessed via a non-public, non-linked URL segment (e.g. `tradehub.com/x7k2-admin`). It returns a 404 to anyone who doesn't know the path, with your login required on top of that.

> ⚠️ **Security note (v2.4):** treat the hidden path the same way doc 02 treats YouTube Unlisted — a deterrent, not a control. It doesn't stop path-guessing or brute-force attempts on its own. Rate-limiting and account lockout on the admin login itself are required regardless of whether the path is ever discovered; MFA on the Super Admin account (already required — see doc 06) is the actual security boundary here, not the URL.

---

## User Roles & Permissions

### Role 1: Super Admin (You)

| Capability | Details |
|---|---|
| Create influencer workspaces | Provision new workspace, assign subdomain, configure Paystack split — only after vetting is complete |
| View all workspaces | See all influencers, student counts, revenue generated |
| View platform-wide revenue | Total earnings, per-influencer breakdown |
| Suspend/delete workspaces | Full control, including emergency suspension |
| Adjust revenue split per influencer | Override default 10% per agreement |
| Review disputes | Resolve escalated student/influencer disputes |
| View onboarding pipeline | See applications, vetting status, setup progress, pilot cohort notes, and conversion from application → approved workspace → first paying student |
| View workspace health data | See owner-level aggregate metrics across onboarded influencers: revenue, students, activation, churn, signal volume, disputes, chargebacks, and risk flags |

### Role 2: Influencer (Admin of their own workspace)

| Capability | Details |
|---|---|
| Full course management | Create/edit/delete courses, lessons, quizzes |
| Member management | View students, activity, subscription status |
| Signal posting | Post, edit, or cancel trade signals |
| Pricing configuration | Set tier names, prices, feature access, refund policy |
| Telegram bot setup | Connect their own Telegram bot token |
| Journal oversight | View student journals (respecting privacy settings) |
| Broadcast messaging | Send messages to all or selected students |
| Revenue dashboard | See earnings, active subscribers, churn rate |

Influencers accept the **Influencer Code of Conduct** during onboarding (see document 05 — Policies).

### Role 3: Student (End User)

| Capability | Details |
|---|---|
| Self-signup | Via influencer's invite link only |
| Course access | Based on subscribed tier |
| Account linking | For Auto-Copy (personal accounts only) or Signal Alerts (prop firm accounts) |
| Trading journal | Auto-populated or manual, personal stats, privacy controls |
| Subscription management | Upgrade/downgrade/cancel via Paystack |
| Privacy toggle | Per-trade or global journal privacy |
| Risk disclosure acceptance | Required before signals/copier activates |
| Dispute flagging | Can report a transaction or flag influencer conduct |

---

## MVP Scope

| Module | MVP |
|---|---|
| Super Admin | Create workspaces, view all, basic revenue summary, Trust & Safety queue |
| Influencer Workspace | Branding, Code of Conduct, onboarding wizard, dashboard |
| Course Hub | YouTube embed, sections/lessons, progress tracking, lesson locking |
| Member Management | Student list, individual profile, activity, flag-for-review |
| Trade Signals | Signal Alerts (all accounts) + Auto-Copy (Binance/Bybit only) + Telegram bot + in-app posting |
| Trading Journal | Auto-sync from exchange, trade log with tagging, basic stats, Calculators |
| Payments | Paystack single-tier subscription, split payment, webhooks, in-app trial; optional Solana Pay / USDC checkout for approved workspaces |
| Trust & Safety | Vetting checklist, risk disclosure flow, basic dispute flagging |
| Design System | Locked light/dark token system, hero card, signal-fill motion |

### Phase 2 — Post-Launch
- Forex auto-copy (FX Blue API + cTrader Open API)
- Multi-tier pricing and feature gating
- In-app quiz system
- Broadcast messaging
- Advanced journal analytics (heatmap, leaderboard)
- Bunny.net signed-URL video hosting for influencers who need stronger content protection
- AI-generated journal insights
- Mobile app (React Native)

### Phase 3 — Scale
- Custom domain support per influencer
- Affiliate program
- Opt-in student social feed
- Public API for influencer integrations
- Jurisdiction-by-jurisdiction regulatory review as new markets open

---

## Decisions Log

| # | Decision | Choice | Reasoning |
|---|---|---|---|
| 1 | Forex copier API | FX Blue Trade Copier API | Widest MT4/MT5 support, free tier, clean REST API |
| 2 | Paystack ownership | Influencer owns their account; you create a subaccount | Clean financial separation, Paystack enforces split automatically |
| 3 | Telegram bot | One dedicated bot per workspace | Complete signal isolation, created free via @BotFather |
| 4 | Failed payment grace | 3 days | Long enough to avoid panic churn, short enough to prevent abuse |
| 5 | Student auth | Email/password only for MVP | Simpler; Google OAuth Phase 2 |
| 6 | Influencer onboarding | One-time setup fee + manual activation | Filters non-serious leads; self-serve in Phase 2 |
| 7 | Design direction | Apple-grade premium: true black/white, titanium hero card, frosted glass, champagne gold, light + dark | Generic dark-terminal palettes are the AI default; materials and restraint read as premium |
| 8 | YouTube Unlisted | Described as deterrence, not protection | Avoids overpromising — a determined viewer can still find the URL via dev tools |
| 9 | Trade Copier architecture | Auto-Copy for personal accounts; Signal Alerts for prop firm accounts | Prop firm ToS universally prohibits external signal auto-execution; students risk account bans |
| 10 | Platform support | Added cTrader, DXtrade, Match Trader, Tradovate, NinjaTrader | These are what most prop firm students actually use |
| 11 | Paystack trial periods | Implemented in-app, not assumed native | Paystack has no built-in trial period; it must be built |
| 12 | Trust & Safety scope | Vetting, risk disclosure, and dispute flagging in MVP | Copy-trading puts the platform in the liability chain from day one |
| 13 | Regulatory posture | Flagged as potential investment-advisory trigger | Legal review needed before live Trade Copier at scale |
| 14 | Journal feature set | Trade tagging, Calculators, AI Insights — each influencer-toggleable | Closes gap against free journal competitors without locking to a price point |
| 15 | Video protection Phase 2 | Bunny.net signed-URL hosting | YouTube Unlisted cannot provide URL encryption; signed URLs can |
| 16 | Firestore quota posture | Quota-first backend design from Prompt 05 onward | Keeps early setup on Firebase Spark/free where possible and avoids unbounded reads, noisy writes, and unnecessary realtime listeners |
