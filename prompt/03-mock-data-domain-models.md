# Prompt 03 — Mock Data and Domain Models

You are building **TradeHub Stage 03**. Stage 01 created the Next.js scaffold. Stage 02 added the locked TradeHub design system, reusable UI primitives, and the `/design-system` preview route. Your job now is to create the typed product data foundation that later prompts can use without inventing models on the fly.

This stage is about **domain shape, realistic mock data, and data-driven route shells**. It is not Firebase yet. It is not auth yet. It is not Paystack, Solana, Telegram, or exchange integration yet.

Build on the current codebase. Do not replace the Stage 02 design system.

---

## Read First

Before writing code, read these files in the repository:

- `files/tradehub-01-overview.md`
- `files/tradehub-02-features.md`
- `files/tradehub-03-tech.md`
- `files/tradehub-04-design.md`
- `files/tradehub-05-policies.md`
- `files/tradehub-06-setup.md`
- `files/tradehub-07-security-review.md`
- `files/tradehub-prototype-student.html`
- `files/tradehub-prototype-influencer.html`
- `files/tradehub-landing.html`
- `asset/tradehub-colors.html`
- `prompt/01-project-scaffold.md`
- `prompt/02-locked-design-system.md`
- `prompt/promptsumary.md`
- `src/types/tradehub.ts`
- `src/components/ui/*`
- `src/components/layout/*`
- `src/app/(public)/page.tsx`
- `src/app/(super-admin)/admin/page.tsx`
- `src/app/(influencer)/workspace/page.tsx`
- `src/app/(influencer)/workspace/onboarding/page.tsx`
- `src/app/(student)/app/page.tsx`

Treat `files/tradehub-03-tech.md` as the source of truth for Firestore-shaped entities.
Treat the prototypes as reference for realistic values and product-facing labels.
Treat Stage 02 components as the design system you should feed with typed data.

---

## Stage Goal

Define TypeScript models and realistic seed/mock data for the MVP product:

- workspaces,
- workspace branding,
- pricing tiers,
- applications/onboarding pipeline,
- Super Admin metrics,
- influencer revenue and student metrics,
- students and subscriptions,
- courses, sections, lessons, progress, and quizzes,
- trade signals,
- copier settings and execution summaries,
- journal trades and analytics,
- disputes/trust-safety records,
- Paystack and Solana payment intent shapes.

Then refactor the current placeholder/shell routes so they consume these mock data modules instead of hardcoded one-off values.

At the end of this stage, Prompt 04 should be able to build the marketing/application page using the same domain types, and later prompts should be able to swap mock modules for Firebase/API-backed data without rewriting UI contracts.

---

## What This Stage Should NOT Do

Do **not**:

- add Firebase SDK wiring,
- create Firestore rules,
- add authentication,
- create real API routes for payments,
- add Paystack or Solana SDKs,
- add Telegram or exchange API logic,
- implement final CRUD flows,
- mutate real external data,
- introduce untyped JSON blobs where TypeScript models should exist.

This is still frontend-first, mock-data-driven development.

---

## Domain Modeling Requirements

Expand `src/types/tradehub.ts` or split it into focused files under `src/types/` if cleaner.

At minimum, model these concepts:

### Workspace

- `Workspace`
- `WorkspaceBranding`
- `WorkspaceSettings`
- `WorkspaceStatus`
- `WorkspaceTier`
- `WorkspaceFeatureKey`
- `PaymentRail`
- `PaymentRailStatus`

Must include fields from the PRD such as:

- `workspaceId`
- `handle`
- `name`
- `ownerId`
- `branding`
- `tiers`
- `settings`
- `vettingStatus`
- `paystackSubaccountCode`
- `paystackSplitCode`
- `solanaPayEnabled`
- `solanaPayoutWallet`
- `platformSplitPercent`

Use mock-safe fake values only. Do not put real secrets in mock data.

### Applications / Onboarding CRM

- `WorkspaceApplication`
- `ApplicationStatus`
- `SetupFeeStatus`
- `VettingOutcome`
- `OnboardingStep`
- `OnboardingProgress`

Include application data from the landing page prototype:

- name,
- email,
- handle/channel,
- audience size,
- market,
- student account mix,
- monetization method,
- notes,
- status,
- vetting notes,
- workspace creation status,
- first-paying-student activation.

### Users and Roles

- `UserRole`
- `SuperAdminProfile`
- `InfluencerProfile`
- `StudentProfile`
- `SubscriptionStatus`
- `AccountMode`
- `BrokerLinkedState`
- `PropFirmPlatform`

### Courses

- `Course`
- `CourseSection`
- `Lesson`
- `LessonAttachment`
- `LessonQuiz`
- `LessonProgress`

Keep YouTube data realistic:

- Store `youtubeVideoId` in client-readable mock lesson data.
- Do not store raw YouTube URLs in client-readable mock lesson objects, matching the PRD security correction.

### Signals and Copier

- `TradeSignal`
- `SignalStatus`
- `SignalSource`
- `MarketType`
- `TradeAction`
- `SignalExecutionSummary`
- `CopierSettings`
- `CopierStatus`
- `ExecutionMode`

Preserve the PRD distinction:

- Auto-Copy is only for personal accounts.
- Prop-firm accounts receive Signal Alerts only.

### Journal

- `JournalTrade`
- `TradeSource`
- `TradeDirection`
- `TradeTags`
- `JournalPrivacy`
- `JournalStats`
- `CalendarPnlDay`
- `JournalInsight`

Include fields for:

- pair,
- direction,
- entry/exit,
- P&L,
- R:R,
- source,
- tags,
- private flag,
- session.

### Payments

- `PaymentRail`
- `PaymentIntent`
- `PaystackPaymentIntent`
- `SolanaPaymentIntent`
- `PaymentIntentStatus`
- `PaymentSplit`
- `SubscriptionPlan`

Solana mock records must include:

- USDC amount,
- reference,
- signature placeholder,
- recipient wallet placeholders,
- quote expiry,
- split percentage.

Do not use real wallet addresses unless they are obvious fake placeholders.

### Trust and Safety

- `Dispute`
- `DisputeType`
- `DisputeStatus`
- `RiskFlag`
- `AuditEventSummary`

---

## Mock Data Requirements

Create a clear mock-data module, such as:

```text
src/data/
  mock-applications.ts
  mock-workspaces.ts
  mock-students.ts
  mock-courses.ts
  mock-signals.ts
  mock-journal.ts
  mock-payments.ts
  mock-admin.ts
  index.ts
```

Use realistic, product-shaped seed data. A good starting workspace can be `Apex FX`, matching the prototypes.

Include at least:

- 2-3 workspaces,
- 5-8 workspace applications in different pipeline states,
- 8-12 students across Starter, Pro, and Elite tiers,
- students using both Auto-Copy and Signal Alert modes,
- 3-4 courses with sections/lessons and progress,
- 5-8 signals with active, edited, cancelled, and closed states,
- copier stats and failed execution examples,
- 10-20 journal trades with win/loss distribution and tags,
- monthly revenue metrics,
- Paystack transaction samples,
- Solana payment intent samples,
- disputes/trust-safety queue samples.

Keep names and emails fake but realistic.
Use Nigerian/Naira examples where helpful, matching the PRD.

---

## Data Utility Requirements

Add small pure utility/selectors where useful, for example:

- get workspace by handle,
- get students by workspace,
- calculate active subscriber count,
- calculate revenue by tier,
- calculate platform split,
- calculate journal win rate,
- get latest signals,
- group onboarding applications by status,
- get payment rail totals.

Keep them deterministic and unit-test-friendly. Do not add a state management library in this stage.

Suggested location:

```text
src/lib/mock-selectors.ts
```

or focused modules under `src/data/`.

---

## Route Refactor Requirements

Refactor the current Stage 02 placeholder routes to consume typed mock data where sensible:

- `/` should use high-level product/workspace metrics from mock data.
- `/admin` should show Super Admin/platform metrics, onboarding pipeline counts, payment rail totals, and trust-safety samples.
- `/workspace` should show influencer workspace metrics, student counts, revenue, course summaries, and signal/copying overview.
- `/workspace/onboarding` should use typed onboarding steps, including Paystack and optional Solana wallet setup.
- `/app` should show a student-facing shell fed by mock student, course, signal, copier, and journal data.
- `/join/apexfx` should resolve the mock workspace by handle instead of hardcoding display values.
- `/design-system` may remain mostly visual, but can use a small typed sample if helpful.

Do not overbuild these pages. Keep them shell-like, but data-driven.

---

## Type Safety Requirements

- Avoid `any`.
- Prefer literal unions for status/type fields.
- Use `as const` only where it improves type inference without making data awkward.
- Export types and mock arrays in a way future stages can import cleanly.
- Keep UI components prop-driven; do not make components import global mock data directly unless they are page-level composition components.

---

## Security And Product Guardrails

Preserve these PRD constraints in the mock data shape:

- Multi-tenancy is always explicit through `workspaceId`.
- Raw YouTube URLs should not be part of client-readable lesson records.
- Broker/exchange API keys should never appear in mock data.
- Telegram bot tokens should never appear in mock data.
- Paystack secret keys and Solana private keys should never appear in mock data.
- Solana wallet values should be fake placeholders.
- Prop-firm students must not be modeled as Auto-Copy eligible.
- Super Admin onboarding/application records should be clearly separated from student-facing data.

---

## Suggested Source Additions

Use this as a guide, adjusting only if the codebase needs a cleaner structure:

```text
src/
  data/
    index.ts
    mock-admin.ts
    mock-applications.ts
    mock-courses.ts
    mock-journal.ts
    mock-payments.ts
    mock-signals.ts
    mock-students.ts
    mock-workspaces.ts
  lib/
    mock-selectors.ts
  types/
    tradehub.ts
```

If `src/types/tradehub.ts` becomes too large, split it into:

```text
src/types/
  workspace.ts
  users.ts
  courses.ts
  signals.ts
  journal.ts
  payments.ts
  admin.ts
  index.ts
```

Only split if it improves clarity.

---

## Verification

After implementation:

- run `npm run lint`
- run `npm run typecheck`
- run `npm run build`
- run `npm run dev`
- smoke-test the main routes
- confirm mock data imports do not increase the client bundle in silly ways
- report anything that could not be verified

Expected commands:

```bash
npm run lint
npm run typecheck
npm run build
npm run dev
```

You may also use simple local route smoke checks such as `curl`.

---

## Success Checks To Prove Everything Is OK

Before saying Stage 03 is complete, check all of the following and report the result clearly:

1. **Types check:** domain models exist for workspaces, applications, users, courses, signals, copier, journal, payments, and trust/safety.
2. **Mock data check:** realistic mock data exists for every major MVP surface and includes more than one workspace.
3. **Multi-tenancy check:** mock records include `workspaceId` where needed and selectors filter by workspace/handle.
4. **Security-shape check:** mock data contains no API keys, bot tokens, private keys, raw broker credentials, or raw YouTube URLs on lesson objects.
5. **Solana/Paystack check:** mock payment records include both Paystack and optional Solana Pay examples without real secrets.
6. **Route data check:** `/`, `/admin`, `/workspace`, `/workspace/onboarding`, `/app`, and `/join/apexfx` consume typed mock data instead of only hardcoded one-off strings.
7. **Lint check:** `npm run lint` passes.
8. **Typecheck check:** `npm run typecheck` passes.
9. **Build check:** `npm run build` passes.
10. **Route smoke check:** required routes return successful responses in dev mode.
11. **Prompt 04 readiness check:** the marketing/application prompt can now use typed application/workspace models without inventing new shapes.

If any check fails, do not mark the stage complete. Fix it, or explain the blocker precisely.

---

## Definition Of Done

Stage 03 is done when:

- TypeScript domain models cover the MVP data shape.
- Mock data is realistic, multi-tenant, and PRD-aligned.
- Current shell routes consume typed mock data.
- No external services are integrated.
- No secrets or sensitive credentials exist in mock data.
- Lint, typecheck, and build pass.
- Prompt 04 can build the production-shaped marketing page and application flow using these models.

---

## Final Response Expected From The AI

When finished, respond with:

- what domain model files were created or updated,
- what mock-data modules were created,
- which routes now consume typed mock data,
- the verification checklist with PASS/FAIL results,
- any known dependency/security notes that remain parked,
- the next recommended prompt: **Prompt 04 — Marketing landing page and application flow**.
