# Prompt 16 - Multi-Tier Expansion and Advanced Feature Gating

You are building **TradeHub Stage 16**. Stages 01-14 already created the Next.js scaffold, locked design system, typed domain layer, marketing flow, Firebase auth + role routing, Super Admin CRM, influencer onboarding, influencer dashboard, Course Hub, student app shell, Paystack subscriptions, optional Solana Pay / USDC checkout, payment-hardening operations, journal/trust-safety hardening, policy pages, export sanitization, and launch-readiness cleanup.

**Important sequencing note:** Prompt 16 is being pulled forward **before Prompt 15** on purpose. The business need right now is stronger **monetization control, tier expansion, and feature entitlements**. Do not wait for real copier integrations before shaping the pricing model.

Your job now is to turn the current single-tier-friendly MVP into a real **multi-tier TradeHub product** with safe, server-trusted feature gating across student, workspace, billing, and admin surfaces.

Do not rebuild earlier stages. Extend them carefully.

TradeHub should leave this stage with clear, influencer-controlled packaging of access, and with the app consistently respecting those entitlements everywhere.

---

## Current Verified State

Stage 14 already established:

- Student app shell, live course route, signals route, copier safety surface, journal summary route, and billing route.
- Workspace onboarding, dashboard, billing readiness, student list, course management, and signal management.
- Paystack subscription activation, billing callback verification, and workspace tier plan-code wiring.
- Optional Solana Pay / USDC checkout with settlement-ledger recording.
- Public policy pages and launch hardening.
- Bounded admin payment operations and trust/safety visibility.

Known current reality:

- The MVP still behaves like a mostly **single-tier** product in too many places.
- Some feature availability is described in pricing data, but not fully enforced end-to-end.
- Student, workspace, and billing surfaces need one shared entitlement truth instead of scattered assumptions.
- Copier is still a **safe status surface only**. Real execution remains deferred.
- AI insights are still future-facing. They can be modeled in entitlements now without pretending the product exists already.

Do not undo working auth, billing, course, or journal flows.

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
- `prompt/10-student-mobile-app-shell.md`
- `prompt/11-payments-paystack-subscriptions.md`
- `prompt/12-solana-pay-usdc-optional-checkout.md`
- `prompt/13-payments-hardening-subscription-lifecycle-settlement-operations.md`
- `prompt/14-journal-trust-safety-policies-launch-hardening.md`
- `prompt/promptsumary.md`
- `README.md`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `src/app/(student)/app/page.tsx`
- `src/app/(student)/app/courses/page.tsx`
- `src/app/(student)/app/signals/page.tsx`
- `src/app/(student)/app/copier/page.tsx`
- `src/app/(student)/app/journal/page.tsx`
- `src/app/(student)/app/billing/page.tsx`
- `src/app/(influencer)/workspace/page.tsx`
- `src/app/(influencer)/workspace/courses/page.tsx`
- `src/app/(super-admin)/admin/page.tsx`
- `src/app/api/student/app/overview/route.ts`
- `src/app/api/student/courses/route.ts`
- `src/app/api/student/courses/[courseId]/route.ts`
- `src/app/api/student/signals/route.ts`
- `src/app/api/student/copier/route.ts`
- `src/app/api/student/journal/summary/route.ts`
- `src/app/api/student/billing/overview/route.ts`
- `src/app/api/student/billing/checkout/route.ts`
- `src/app/api/student/billing/solana/checkout/route.ts`
- `src/app/api/workspace/dashboard/route.ts`
- `src/app/api/workspace/students/route.ts`
- `src/app/api/workspace/courses/route.ts`
- `src/app/api/workspace/signals/route.ts`
- `src/app/api/workspace/billing/overview/route.ts`
- `src/components/billing/student-billing-client.tsx`
- `src/components/workspace/workspace-billing-panel.tsx`
- `src/components/workspace/student-management-section.tsx`
- `src/components/workspace/course-visibility-section.tsx`
- `src/components/workspace/signal-management-section.tsx`
- `src/components/student-app/student-shell.tsx`
- `src/components/student-app/student-copier-client.tsx`
- `src/components/student-app/student-signals-client.tsx`
- `src/components/student-app/student-journal-client.tsx`
- `src/components/student-courses/student-course-list-client.tsx`
- `src/components/student-courses/student-course-reader-client.tsx`
- `src/lib/billing/billing-repository.ts`
- `src/lib/billing/billing-validation.ts`
- `src/lib/student-app/student-app-repository.ts`
- `src/lib/student-app/student-app-mappers.ts`
- `src/lib/course-hub/course-repository.ts`
- `src/lib/course-hub/course-mappers.ts`
- `src/lib/workspace/dashboard-repository.ts`
- `src/lib/workspace/dashboard-mappers.ts`
- `src/lib/admin/admin-repository.ts`
- `src/lib/admin/admin-mappers.ts`
- `src/types/workspace.ts`
- `src/types/payments.ts`
- `src/types/student-app.ts`
- `src/types/courses.ts`
- `src/types/course-hub.ts`
- `src/types/signals.ts`
- `src/types/journal.ts`
- `src/types/workspace-dashboard.ts`
- `src/types/admin-api.ts`

Also check current official documentation before implementing where useful:

- Firestore indexing guidance
- Firestore collection-group query guidance
- Next.js App Router route handlers and metadata
- Paystack subscriptions/plan-code guidance if the tier plan-code model is extended

Treat `files/tradehub-02-features.md`, `files/tradehub-03-tech.md`, `files/tradehub-06-setup.md`, and `files/tradehub-07-security-review.md` as the product/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat Stages 11-14 as already-real product foundation.

---

## Stage Goal

At the end of this stage:

- TradeHub supports real **multi-tier workspace monetization** instead of mostly single-tier assumptions.
- Workspace pricing can represent **2-3 real tiers** with clean per-feature entitlements.
- Student access is enforced consistently across:
  - course library,
  - lesson reader,
  - signals,
  - copier safety surface,
  - journal summaries,
  - calculators/tagging/AI placeholders where applicable,
  - billing and subscription state.
- Influencer-facing surfaces clearly show which tiers unlock which features.
- Billing surfaces understand per-tier readiness instead of one flat subscription mindset.
- Admin can understand workspace packaging and monetization posture at a glance.
- Prompt 15 can later add copier integrations into a clean entitlement model instead of retrofitting monetization afterward.

---

## What This Stage Should NOT Do

Do **not**:

- implement real broker or exchange copier execution,
- collect broker credentials,
- weaken Paystack as the default rail,
- rewrite Solana verification or settlement logic,
- open Firestore rules,
- add client Firestore reads/writes for protected data,
- fake AI insights that do not exist yet,
- fake calculators or tagging depth that the current UI cannot honestly support,
- collapse all students into one “all access” assumption,
- hard-code one workspace’s tier names into platform logic,
- create broad unbounded scans just to compute tier counts,
- rebuild the visual system,
- turn this into a billing-processor rewrite.

This is a **monetization and entitlement hardening** stage, not a copier-execution stage.

---

## Core Product Truth To Preserve

### Pricing Truth

- The influencer decides whether the workspace is **single-tier** or **multi-tier**.
- Tier names, prices, descriptions, feature access, trial posture, and refund copy are workspace-controlled.
- TradeHub may provide smart defaults, but it must not silently override workspace monetization choices.

### Access Truth

- Course, signals, journal depth, copier eligibility, tagging, calculators, and AI insight visibility must flow from **trusted server-side entitlement data**.
- Browser UI must not be the source of truth for feature access.
- Students should see honest locked states instead of broken routes or fake access.

### Copier Truth

- “Auto-Copy” remains an entitlement concept and a safety posture in this stage.
- Real execution remains deferred to Prompt 15.
- Prop-firm / funded-account students should still remain on Signal Alerts posture where appropriate.

### Billing Truth

- Paystack remains default.
- Solana remains optional.
- Tier plan codes remain workspace-scoped.
- Subscription state and tier entitlements must stay server-trusted.

### Quota Truth

- Use summary docs and bounded queries where possible.
- Do not introduce broad scans for every tier breakdown.
- Keep progress/status derivation safe for Firebase free-tier-friendly development.

---

## Required Architecture

Keep the same secure boundary already used in earlier stages:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls /api/student/* or /api/workspace/* or /api/admin/*
  -> API route verifies token with Firebase Admin SDK
  -> route confirms role and workspace scope
  -> route resolves entitlements from trusted workspace tier + subscription data
  -> route returns already-gated data to the client
```

Do not move protected entitlement logic into localStorage, query params, or client-only conditionals.

---

## Implementation Requirements

### 1. Normalize The Tier And Entitlement Model

Strengthen the shared workspace/payment/domain types so tier logic becomes first-class and reusable.

Requirements:

- Define one consistent tier feature model shared across workspace, billing, and student access.
- Preserve the existing core feature list from the PRD:
  - `course`
  - `signalAlerts`
  - `autoCopy`
  - `journal`
  - `tagging`
  - `calculators`
  - `aiInsights`
- Add any small helper types needed for:
  - workspace pricing mode,
  - feature entitlement checks,
  - locked reason labels,
  - display-ready tier badges.
- Avoid duplicating slightly different feature enums across files.

The stage should leave the repo with one clear entitlement vocabulary.

### 2. Expand Workspace Pricing Beyond Single-Tier Assumptions

Upgrade workspace and onboarding/billing-facing pricing logic so multi-tier workspaces feel real.

Requirements:

- Support clean representation of:
  - single-tier workspaces,
  - 2-tier workspaces,
  - 3-tier workspaces.
- Preserve existing plan-code support per tier.
- Show readiness per tier, not only workspace-wide.
- Keep current safe onboarding defaults, but make multi-tier editing and display coherent.
- Make sure billing copy, workspace billing panels, and tier cards no longer imply that one workspace always has only one sellable tier.

Do not introduce noisy or unsafe write patterns. Keep saves intentional and bounded.

### 3. Add Server-Trusted Entitlement Resolution

Create or tighten a shared entitlement resolver that can be reused by student/workspace/admin data flows.

Requirements:

- Resolve student entitlements from:
  - verified workspace id,
  - trusted subscription tier id,
  - workspace tier definition,
  - subscription status.
- Return safe access decisions such as:
  - allowed,
  - locked_by_tier,
  - locked_by_subscription,
  - alerts_only,
  - feature_not_enabled.
- Prefer one reusable server-side helper over scattered inline checks.

This should become the trusted core for Prompt 15 and beyond.

### 4. Enforce Tier Access Across Student Routes

Strengthen the student experience so features respect tier access everywhere.

Required areas:

- `/app`
- `/app/courses`
- `/app/courses/[courseId]`
- `/app/signals`
- `/app/copier`
- `/app/journal`
- `/app/billing`

Requirements:

- Course list must show only accessible courses or clearly locked courses, depending on the current product direction already present in the repo.
- Lesson reader must not grant deeper access than the student’s tier allows.
- Signals surface must distinguish:
  - entitled signal access,
  - alerts-only posture,
  - locked feature state.
- Copier surface must distinguish:
  - feature not in tier,
  - feature in tier but execution not yet supported,
  - funded-account safety mode.
- Journal route and student home should reflect whether journal is included in the subscribed tier.
- Calculators/tagging/AI insight states can be represented as locked or “coming later in this tier” where honest, but do not fake implemented tools.

Every locked state should feel intentional, branded, and readable on mobile.

### 5. Reflect Multi-Tier Monetization In Billing

Upgrade billing data and UI so pricing feels like a real subscription catalog instead of a mostly flat renewal surface.

Requirements:

- Show multiple tier choices cleanly on `/app/billing`.
- Make current tier vs upgrade/downgrade choices understandable.
- Keep Paystack checkout server-side and tier-specific.
- Keep Solana quote generation tier-specific.
- Preserve current verified subscription lifecycle behavior.
- Ensure the chosen tier id is always validated server-side against the workspace before checkout.

If tier switching semantics are not fully implemented yet, keep the copy honest. It is better to say “start checkout for this tier” than to fake plan migration logic.

### 6. Improve Influencer Visibility Into Packaging And Student Mix

Upgrade influencer-facing dashboard/billing/student surfaces so the workspace owner can understand how their packaging works.

Requirements:

- Show clearer tier mix across students where bounded data already allows it.
- Show which tiers are checkout-ready and which are still pending plan codes or ops setup.
- Make course visibility cards and student rows feel consistent with multi-tier access.
- Where a student is on a tier that does not include a feature, reflect that honestly instead of showing zeroes that imply broken tracking.
- If a student has alerts-only posture, show that as policy/safety posture, not as a failed copier connection.

Avoid broad scans just to make the dashboard look fuller.

### 7. Improve Admin Visibility Into Workspace Monetization Shape

Upgrade `/admin` so Super Admin can understand packaging and entitlement posture without opening the workspace blindly.

Requirements:

- Show whether a workspace is:
  - single-tier,
  - multi-tier,
  - Paystack-ready,
  - Solana-approved or not,
  - copier-entitlement-capable or signals-only.
- Preserve bounded payment ops and settlement views from earlier stages.
- Surface missing tier plan codes or misconfigured tiers as controlled operational warnings.
- Do not build a giant reporting system here.

The goal is better operational visibility, not a new finance warehouse.

### 8. Keep Trial And Subscription Rules Honest

TradeHub docs already describe free-trial flexibility. Tighten the product shape around it without overpromising full automation if that foundation is still partial.

Requirements:

- Represent trial settings per workspace/tier clearly where supported.
- Keep access decisions tied to trusted subscription state.
- Do not grant fake browser-only trial access.
- If trial lifecycle automation remains partially deferred, show honest UI/state instead of pretending it is fully complete.

### 9. Locked States Must Feel Like Product, Not Failure

Where access is blocked by tier or subscription, the app should feel intentional.

Requirements:

- Add or refine locked cards, badges, and copy for:
  - course locked by tier,
  - signals unavailable in current tier,
  - copier not in plan,
  - journal not included,
  - calculators/tagging/AI insights not enabled.
- Preserve the TradeHub visual language.
- Keep mobile layout clean.
- Do not show raw error wording where a product lock state is the right experience.

### 10. Keep Prompt 15 Cleanly Supported

This stage must set up Prompt 15, not compete with it.

Requirements:

- Model `autoCopy` entitlement cleanly now.
- Do **not** add real execution.
- Make it obvious in code that Prompt 15 can later plug Binance/Bybit/FX Blue/cTrader execution into an existing gated surface.
- Leave safe status surfaces and risk language intact.

---

## Data / Query Rules

You must preserve the quota-safe guidance already adopted in the PRD and setup notes:

- use summary documents where possible,
- keep pagination and explicit limits,
- avoid broad dashboard scans,
- avoid realtime listeners unless already product-critical,
- keep billing, student, and admin queries bounded,
- resolve entitlements from direct workspace/subscription records rather than scanning unrelated collections.

If an index is required for a newly introduced bounded query, update `firestore.indexes.json` and document it.

---

## Design Rules

Preserve the locked TradeHub look:

- true black dark mode,
- frosted glass surfaces,
- champagne-gold accents used sparingly,
- soft mobile-first layouts,
- compact but readable monetization cards,
- strong status chips and locked-state treatment,
- no generic SaaS-pricing-template styling.

Multi-tier pricing and locked states must still feel like TradeHub, not a copied billing UI.

---

## Security Rules

These are non-negotiable:

- no client Firestore reads/writes for protected student, workspace, or admin data,
- no `allow read, write: if true`,
- no browser-only role or entitlement trust,
- no hard-coded “premium” logic detached from server data,
- no secret exposure,
- no fake auto-copy behavior,
- no plan-code assumptions without server validation,
- no broad collection scans just to derive tier eligibility,
- no misleading UI that claims a feature is active when the tier does not include it.

If access is denied, deny it server-side first and then render a clean product state.

---

## Required Verification

Before closing the stage, run:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Then manually verify at least:

- `/admin`
- `/workspace`
- `/app`
- `/app/courses`
- `/app/signals`
- `/app/copier`
- `/app/journal`
- `/app/billing`

Also verify:

- signed-out protected student/workspace/admin APIs fail closed with `401`,
- student billing shows more than one tier cleanly when the workspace is multi-tier,
- choosing a tier only starts checkout for valid workspace tiers,
- locked features show controlled product states instead of crashes,
- course/signals/copier/journal access reflect current entitlement truth,
- workspace billing shows plan-code readiness per tier,
- admin sees monetization posture without unsafe scans,
- Firestore rules remain locked,
- no major mobile overflow is introduced by extra pricing cards or feature lists.

If a missing index blocks an admin/workspace monetization view, show a controlled warning rather than crashing the route.

---

## Completion Standard

This stage is successful only if:

- TradeHub can honestly support single-tier and multi-tier workspaces,
- entitlement logic is centralized and server-trusted,
- student routes consistently respect tier access,
- influencer/admin monetization visibility is stronger,
- billing feels like a real tier catalog,
- Prompt 15 can later add copier integrations without redoing pricing/gating,
- verification is explicit and honest.

When done, report:

- the routes to inspect first,
- the exact files changed,
- the proof checklist with pass/fail,
- any intentionally deferred monetization or copier risks that still remain after Stage 16.
