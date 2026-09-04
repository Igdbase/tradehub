# Prompt 14 - Journal, Trust/Safety, Policies, and Launch Hardening

You are building **TradeHub Stage 14**. Stages 01-13 already created the Next.js scaffold, locked design system, typed domain layer, marketing flow, Firebase auth + role routing, Super Admin CRM, influencer onboarding, influencer dashboard, Course Hub, student app shell, Paystack subscriptions, optional Solana Pay / USDC checkout, and payment-hardening operations.

Your job now is to finish the **MVP hardening pass** around:

- student journal visibility and summary truth,
- Super Admin trust/safety and dispute visibility,
- production-shaped policy/legal pages,
- export and content safety,
- final responsive layout cleanup,
- security headers and launch QA framing.

Do not rebuild earlier stages. Tighten and complete them.

TradeHub is now close to MVP-ready. This stage should make the product safer, clearer, and more presentation-ready.

---

## Current Verified State

Stage 13 already established:

- Admin payment operations, reconciliation flows, and settlement-ledger visibility.
- Workspace billing readiness panels and settlement-state visibility.
- Student billing lifecycle clarity for Paystack and Solana.
- Audit events for billing and settlement operations.
- Existing public routes for `/terms`, `/privacy`, `/risk-disclosure`, and `/data-use`.
- Existing student journal shell and summary route.
- Existing Super Admin trust/safety panel and audit preview.

Known current reality:

- Some policy pages still carry placeholder or stage-era wording.
- Journal is summary-first and still needs stronger product-grade framing and privacy clarity.
- Trust/safety is visible, but still needs more operational shape and explicit risk/dispute handling language.
- Some responsive surfaces can still feel crowded or have text/layout overflow at smaller widths.
- Security and launch QA still need one clean pass across routes and data flows.

Do not undo working payment, auth, workspace, or course flows.

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
- `prompt/09-course-hub-and-lesson-management.md`
- `prompt/10-student-mobile-app-shell.md`
- `prompt/11-payments-paystack-subscriptions.md`
- `prompt/12-solana-pay-usdc-optional-checkout.md`
- `prompt/13-payments-hardening-subscription-lifecycle-settlement-operations.md`
- `prompt/promptsumary.md`
- `README.md`
- `.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- `src/app/(public)/terms/page.tsx`
- `src/app/(public)/privacy/page.tsx`
- `src/app/(public)/risk-disclosure/page.tsx`
- `src/app/(public)/data-use/page.tsx`
- `src/app/(student)/app/journal/page.tsx`
- `src/app/(student)/app/student-app-page-client.tsx`
- `src/app/(super-admin)/admin/admin-page-client.tsx`
- `src/app/api/student/journal/*`
- `src/components/student-app/student-journal-client.tsx`
- `src/components/admin/trust-safety-panel.tsx`
- `src/components/admin/audit-log-preview.tsx`
- `src/components/ui/policy-page.tsx`
- `src/lib/student-app/*`
- `src/lib/admin/*`
- `src/lib/routes.ts`
- `src/styles/tokens.css`
- `src/app/globals.css`
- `src/types/journal.ts`
- `src/types/student-app.ts`
- `src/types/admin-api.ts`
- `src/types/admin.ts`
- `src/types/users.ts`

Also check current official documentation before implementing the hardening details where useful:

- Next.js metadata and security header guidance
- Next.js App Router route handlers
- CSV injection/export safety guidance
- Firebase/Firestore indexing guidance where trust/safety queries are shaped

Treat `files/tradehub-03-tech.md`, `files/tradehub-05-policies.md`, `files/tradehub-06-setup.md`, and `files/tradehub-07-security-review.md` as the product/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat Stages 11-13 billing behavior as already-real foundation.

---

## Stage Goal

At the end of this stage:

- Student journal feels like a real protected product surface, not a placeholder summary card.
- Journal privacy and workspace visibility rules are honest and clearly explained.
- Super Admin trust/safety feels operational, with clearer dispute/risk summaries and safer empty/error states.
- Public policy pages are rewritten into production-shaped copy aligned with the MVP that now actually exists.
- CSV/export behavior is sanitized so spreadsheet formula injection is not introduced.
- Responsive overflow, cramped cards, and broken text wrapping are cleaned up across public, admin, workspace, and student routes touched by this stage.
- Launch-facing security headers and final QA notes are present.
- Prompt 15 can focus on post-MVP copier integrations instead of patching core MVP quality.

---

## What This Stage Should NOT Do

Do **not**:

- replace or weaken Paystack as the default rail,
- rewrite Solana checkout or payment verification logic,
- open Firestore rules,
- introduce client Firestore writes for protected admin/workspace/student data,
- add Telegram broadcasting,
- add real copier execution,
- add broker credential collection,
- store raw secrets in UI flows,
- add generic legal boilerplate that contradicts the actual MVP,
- fake dispute resolution automation that does not exist,
- fake journal features that are not implemented,
- break existing mobile-first shells by over-widening layouts,
- turn this into a total redesign.

This is a **hardening and launch-readiness** stage, not a platform rewrite.

---

## Core Product Truth To Preserve

### Journal

- Student journal data is student-scoped first.
- Privacy must remain explicit.
- Workspace-visible summaries must not imply that private trade-by-trade records are exposed.
- Journal stats should stay honest when summary docs are missing: zero-safe and clearly labeled.

### Trust and Safety

- Super Admin can see risk/dispute visibility and audit history.
- Trust/safety views should not require broad unsafe scans.
- Risk and dispute states must stay bounded, readable, and auditable.

### Policies

- Policy copy must match the product that actually exists now:
  - courses,
  - signals,
  - Signal Alerts vs copier posture,
  - journal privacy,
  - Paystack-first checkout,
  - optional Solana,
  - workspace/operator review,
  - account access and suspensions,
  - dispute handling,
  - non-custodial posture.

### Launch Readiness

- The app should not show overflowing text, clipped cards, or broken wrapping on key routes.
- Headers, metadata, and security defaults should be reasonable for a serious MVP.
- Empty states and warnings should stay controlled rather than crashing or implying fake data.

---

## Required Architecture

Keep the same secure boundary already used in earlier stages:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls /api/student/* or /api/admin/*
  -> API route verifies token with Firebase Admin SDK
  -> route confirms role and workspace scope
  -> route reads/writes through Admin SDK only
```

Do not bypass this with localStorage flags, raw query params, or client-side protected Firestore access.

---

## Implementation Requirements

### 1. Upgrade The Student Journal Surface

Strengthen `/app/journal` and the supporting student journal components so the route feels like a real MVP surface.

Requirements:

- Keep it summary-first; do not invent full trade-entry CRUD if it is not already supported.
- Show clearer journal privacy state:
  - private,
  - workspace-visible summary,
  - missing summary / zero-safe state.
- Make the copy explain exactly what is visible and what remains private.
- Improve stat presentation for:
  - total trades,
  - 30d P&L,
  - win rate,
  - average R:R,
  - best pair or most active pair where available.
- Use clean responsive layout that does not overflow small widths.
- Preserve mobile-first design language.

If summary data is missing, the page must stay honest and usable without pretending activity exists.

### 2. Tighten Journal Progress / Summary Truth

Where appropriate in the repository layer and student-facing mappers:

- make sure summary-derived values stay consistent,
- preserve zero-safe behavior,
- avoid conflicting labels between student home and journal route,
- do not scan large collections when a summary document should be used,
- keep any fallback bounded and explicit.

If there is an obvious consistency gap between student home and journal route, fix it in this stage.

### 3. Improve Super Admin Trust/Safety

Upgrade the trust/safety presentation on `/admin`.

Requirements:

- Keep the current `TrustSafetyPanel` direction, but make it more operational.
- Show clearer distinction between:
  - disputes,
  - risk flags,
  - audit trail.
- Improve empty states so "no records" feels intentional rather than unfinished.
- Preserve bounded queries and controlled warnings.
- Do not add fake moderation actions that do not exist.

Safe enhancements may include:

- better status badges,
- stronger timestamps,
- grouped counts,
- clearer review language,
- safer fallback copy when data sources are empty or index-limited.

### 4. Finalize Public Policy Pages

Replace the remaining placeholder/stage-era wording in:

- `/terms`
- `/privacy`
- `/risk-disclosure`
- `/data-use`

The copy should now reflect the real MVP product.

Requirements:

- Terms must address workspace access, subscriptions, suspensions, acceptable use, refunds where applicable, and operator review.
- Privacy must address identity, workspace membership, payments, operator review, analytics summaries, and journal privacy posture.
- Risk disclosure must clearly explain that courses/signals/journal insights are not guaranteed returns and that prop-firm/funded-account workflows have stricter posture.
- Data use must explain what is collected, what is optional, what remains protected, and what operators can see during onboarding, billing review, disputes, and trust/safety handling.

Do not generate fake legal counsel language or claim compliance regimes that are not actually implemented.
Write production-shaped, product-honest copy.

### 5. Add Export / CSV Sanitization Guardrails

If any current or near-stage export helpers exist or are easy to add safely for journal/admin data, sanitize exported values against spreadsheet formula injection.

Requirements:

- Prevent cells beginning with `=`, `+`, `-`, or `@` from being exported unsafely.
- Keep the implementation server-safe and reusable.
- If there is no current export endpoint yet, add a small shared utility plus at least one bounded export-ready path or documented hook that Prompt 15+ can reuse.

Do not build a huge reporting system here. Keep it minimal and correct.

### 6. Responsive Cleanup And Overflow Hardening

Do a focused visual cleanup on the routes touched by this stage:

- `/`
- `/admin`
- `/workspace`
- `/app`
- `/app/journal`
- `/terms`
- `/privacy`
- `/risk-disclosure`
- `/data-use`

Fix issues such as:

- text escaping card boundaries,
- pills/badges wrapping badly,
- side-by-side cards collapsing awkwardly,
- headings overflowing narrow screens,
- long labels not breaking correctly,
- action rows becoming unusable on mobile.

Do not redesign every page. Clean the rough edges and make the product feel interview/demo ready.

### 7. Security Headers And Launch Defaults

Add sensible production-shaped security defaults where appropriate for a Next.js MVP.

Consider:

- `X-Content-Type-Options`
- `Referrer-Policy`
- `X-Frame-Options` or CSP frame policy posture where appropriate
- a reasonable `Content-Security-Policy` if feasible without breaking YouTube embeds and current flows

If a full strict CSP would break the current MVP, prefer a clearly documented partial hardening step rather than a fake secure posture.

Do not break the app just to claim a stricter header set.

### 8. README Launch-Hardening Update

Update `README.md` so it clearly explains:

- what Prompt 14 hardened,
- what remains intentionally deferred,
- how to verify policy pages,
- how to verify journal summary behavior,
- how to verify trust/safety panels,
- any index/header/export caveats.

Keep the README concise and practical.

---

## Data / Query Rules

You must preserve the quota-safe guidance already adopted in the PRD and setup notes:

- use summary documents where possible,
- prefer bounded queries,
- avoid broad scans for dashboards,
- keep pagination where applicable,
- keep trust/safety/admin feeds bounded,
- do not introduce noisy realtime listeners,
- keep missing-index states controlled and human-readable.

If an index is required for a new bounded query, update `firestore.indexes.json` and document it.

---

## Design Rules

Preserve the locked TradeHub look:

- true black dark mode,
- soft neutral light mode,
- frosted glass surfaces,
- champagne-gold accents used sparingly,
- strong mobile-first product feel,
- tabular numerals where needed,
- clear focus-visible states,
- no generic template styling.

Any new policy or journal layout must still feel like TradeHub.

---

## Security Rules

These are non-negotiable:

- no client Firestore reads/writes for protected admin or workspace data,
- no `allow read, write: if true`,
- no raw secret exposure,
- no fake role checks in localStorage,
- no trusting browser-only state as proof of access/payment,
- no dangerous HTML rendering for notes or policy content,
- no unsanitized CSV export values,
- no claims that private student journal data is visible to the workspace if it is not.

If you add any export helper, sanitize it.

---

## Required Verification

Before closing the stage, run:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Then manually verify at least:

- `/`
- `/admin`
- `/workspace`
- `/app`
- `/app/journal`
- `/terms`
- `/privacy`
- `/risk-disclosure`
- `/data-use`

Also verify:

- signed-out student/admin journal-related protected APIs fail closed with `401`,
- policy pages render production-shaped copy, not stage placeholders,
- journal route has controlled zero-safe behavior if summary data is absent,
- trust/safety panel does not crash when lists are empty,
- no major text overflow remains on narrow/mobile widths,
- any added export path or utility safely neutralizes CSV formula prefixes,
- Firestore rules remain locked.

If an index is still missing, surface it as a controlled warning rather than a crash.

---

## Completion Standard

This stage is successful only if:

- the journal route feels real and privacy-honest,
- admin trust/safety looks operational,
- policy pages are no longer placeholders,
- responsive layout issues are visibly reduced,
- export safety is addressed,
- security defaults are improved without breaking the app,
- verification is explicit and honest,
- the repo is clearly ready to stop MVP work at Stage 14.

When done, report:

- the routes to inspect first,
- the exact files changed,
- the proof checklist with pass/fail,
- any intentionally deferred launch risks that still remain after Stage 14.
