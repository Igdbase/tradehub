# Prompt 08 - Influencer Dashboard and Management

You are building **TradeHub Stage 08**. Stages 01-07 already created the Next.js scaffold, locked design system, typed domain layer, marketing application flow, Firebase Email/Password auth, role gates, Super Admin CRM, workspace shell creation flow, and the influencer onboarding wizard backed by server-side Firebase Admin SDK routes.

Your job now is to turn `/workspace` into the real influencer control room for revenue visibility, student management, course visibility, signal drafting, activation status, and workspace operations.

Build on the current codebase. Do not replace the design system. Do not remove Stage 05 auth, Stage 06 admin boundaries, or Stage 07 onboarding flows. Do not open Firestore rules. Do not move workspace reads into client Firestore queries.

This stage should answer the product question: **"Once an influencer is approved and onboarded, how do they actually run their workspace?"**

---

## Current Setup State

The owner has already completed:

- Firebase project on Spark/free plan.
- Email/Password auth.
- Firestore database `(default)` in production mode.
- Firestore rules locked with `allow read, write: if false;`.
- Admin SDK service account configured locally.
- `super_admin` bootstrap script working.
- `influencer` bootstrap script working.

Stage 06 added:

- `/admin` with Firestore-backed Super Admin API routes.
- Public application persistence route.
- Workspace shell creation path for approved applications.
- Audit log writes through Admin SDK.

Stage 07 added:

- `/workspace/onboarding` as a real multi-step influencer activation wizard.
- Influencer-only API routes under `/api/workspace/onboarding*`.
- Workspace onboarding saves through verified server routes.
- Paystack readiness, pricing, conduct, branding, optional Telegram/Solana readiness, and first-course draft setup.
- Owner-review submission state after required onboarding steps are complete.

Known good current state:

- At least one influencer workspace may already exist locally with a valid `workspaceId` claim.
- Onboarding can save successfully to Firestore.
- Optional Telegram and Solana steps may remain pending without blocking the required onboarding review flow.

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
- `asset/tradehub-colors.html`
- `prompt/01-project-scaffold.md`
- `prompt/02-locked-design-system.md`
- `prompt/03-mock-data-domain-models.md`
- `prompt/04-marketing-landing-application-flow.md`
- `prompt/05-authentication-role-routing.md`
- `prompt/06-super-admin-dashboard-onboarding-crm.md`
- `prompt/07-influencer-onboarding-wizard.md`
- `prompt/promptsumary.md`
- `.env.example`
- `README.md`
- `package.json`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/*`
- `src/data/*`
- `src/lib/mock-selectors.ts`
- `src/lib/firebase/*`
- `src/lib/admin/*`
- `src/lib/workspace/*`
- `src/app/api/admin/*`
- `src/app/api/workspace/onboarding/*`
- `src/app/(influencer)/workspace/page.tsx`
- `src/app/(influencer)/workspace/workspace-page-client.tsx`
- `src/app/(influencer)/workspace/onboarding/*`
- `src/components/onboarding/*`
- `src/components/ui/*`
- `src/components/layout/*`

Treat `files/tradehub-03-tech.md` and `files/tradehub-06-setup.md` as the backend/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat Stage 07 workspace onboarding data as the live source of truth for workspace identity, readiness, pricing defaults, and first-course draft state.

---

## Stage Goal

At the end of this stage:

- `/workspace` is the real influencer dashboard, not just a preview shell.
- Influencer workspace data loads through server-side API routes that verify Firebase ID tokens and `workspaceId` claims.
- The page shows real workspace identity, onboarding status, revenue summary, student counts, course list, and signal management entry points.
- Student lists are workspace-scoped, paginated, and filterable without broad collection scans.
- Course data is loaded from the workspace course subcollection and reflects the Stage 07 draft if it exists.
- A safe signal composer exists for draft/publish workflow without Telegram delivery, Auto-Copy execution, or copier-side trading.
- The dashboard clearly shows when the workspace is still waiting on owner review, Paystack verification, or activation.
- Firestore rules remain locked to clients.
- Prompt 09 can build the full Course Hub on top of the course list and draft structures created here.

---

## What This Stage Should NOT Do

Do **not**:

- enable Blaze/pay-as-you-go,
- enable Cloud Functions,
- add real Paystack charge initiation,
- add Paystack webhooks,
- add real Solana checkout,
- add Telegram bot polling, webhooks, or broadcast sending,
- add broker/API key collection,
- add real Auto-Copy execution,
- add background schedulers,
- use client Firestore reads/writes for workspace dashboard data,
- scan all students/signals/courses in Firestore to compute totals,
- implement full-text search by broad collection scan,
- allow influencers to modify roles or claims,
- let one influencer read another workspace's records,
- break `/workspace/onboarding`,
- break `/admin`,
- fake live data if Firestore data exists,
- regress back to a pure mock-only workspace experience.

---

## Required Architecture

Use the same secure pattern from Stages 06 and 07:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls /api/workspace/* with Authorization: Bearer <idToken>
  -> API route verifies token with Admin SDK
  -> API route confirms role === "influencer"
  -> API route confirms token.workspaceId exists
  -> API route uses Admin SDK to read/write only that workspace's documents
```

Do not use the Firestore browser SDK for dashboard reads or writes.

`RoleGate` is still useful for UX, but the API route is the real security boundary.

---

## Firestore Shape For This Stage

Build on the Stage 07 shapes that already exist:

```text
/workspaces/{workspaceId}
/workspaces/{workspaceId}/onboarding/current
/workspaces/{workspaceId}/courses/{courseId}
```

Add or support these workspace-scoped records:

### Workspace summary document

```text
/workspaces/{workspaceId}/dashboard/current
```

Recommended fields:

```ts
{
  workspaceId: string;
  activeStudentsCount: number;
  trialStudentsCount: number;
  pastDueStudentsCount: number;
  monthlyRevenueNgn: number;
  lifetimeRevenueNgn: number;
  paystackVolumeNgn: number;
  solanaVolumeUsd: number;
  pendingSignalsCount: number;
  publishedSignalsCount: number;
  lastSignalAt?: string;
  courseCount: number;
  publishedCourseCount: number;
  draftCourseCount: number;
  averageCourseCompletionPercent: number;
  onboardingReviewSubmittedAt?: string;
  ownerApprovalStatus: "pending_review" | "approved" | "changes_requested";
  updatedAt: string;
}
```

If this summary doc is missing, return safe zeros plus a visible warning instead of scanning raw collections.

### Students

```text
/workspaces/{workspaceId}/students/{studentId}
```

Recommended fields:

```ts
{
  studentId: string;
  workspaceId: string;
  displayName: string;
  email?: string;
  tierId: string;
  status: "trial" | "active" | "past_due" | "paused" | "cancelled";
  paymentRail: "paystack" | "solana" | "manual" | "unknown";
  joinedAt: string;
  lastSeenAt?: string;
  courseCompletionPercent: number;
  signalAccess: boolean;
  autoCopyEligible: boolean;
}
```

### Signals

```text
/workspaces/{workspaceId}/signals/{signalId}
```

Recommended fields:

```ts
{
  signalId: string;
  workspaceId: string;
  status: "draft" | "published" | "cancelled";
  market: "forex" | "crypto";
  pair: string;
  direction: "buy" | "sell";
  entry: string;
  takeProfit: string;
  stopLoss: string;
  riskLabel: "low" | "medium" | "high";
  notes?: string;
  deliveryMode: "manual_review" | "alerts_only";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}
```

Do not create per-student delivery documents in this stage.

### Courses

Keep using:

```text
/workspaces/{workspaceId}/courses/{courseId}
```

The Stage 07 `draft_first_course` should appear naturally in the dashboard course list if it exists.

---

## API Routes

Add server-side workspace API routes. Suggested:

```text
src/app/api/workspace/dashboard/route.ts
src/app/api/workspace/students/route.ts
src/app/api/workspace/courses/route.ts
src/app/api/workspace/signals/route.ts
src/app/api/workspace/signals/[signalId]/route.ts
```

### `GET /api/workspace/dashboard`

Influencer only.

Requirements:

- Verify Firebase ID token.
- Require `role === "influencer"`.
- Require `workspaceId` claim.
- Load `/workspaces/{workspaceId}` directly.
- Load `/workspaces/{workspaceId}/onboarding/current` directly.
- Load `/workspaces/{workspaceId}/dashboard/current` directly.
- Return safe summary payload and warnings if summary doc is missing.
- Do not scan all students/courses/signals to compute totals.

### `GET /api/workspace/students`

Influencer only.

Requirements:

- Verify Firebase ID token.
- Query only `/workspaces/{workspaceId}/students`.
- Support `limit` with max `25`.
- Support status filter.
- Support simple search/filter without broad collection scans.
- If true indexed search is not available, filter within the paginated result set and state that limitation in code/comments or UI copy.
- Return cursor/next-page info.

### `GET /api/workspace/courses`

Influencer only.

Requirements:

- Verify Firebase ID token.
- Query only `/workspaces/{workspaceId}/courses`.
- Support `limit` with max `25`.
- Show draft vs published state.
- Include the Stage 07 first-course draft if present.

### `GET /api/workspace/signals`

Influencer only.

Requirements:

- Verify Firebase ID token.
- Query only `/workspaces/{workspaceId}/signals`.
- Support `limit` with max `25`.
- Support status filter: draft, published, cancelled, all.

### `POST /api/workspace/signals`

Influencer only.

Requirements:

- Verify Firebase ID token.
- Validate a structured signal payload.
- Create one signal document.
- Default to `draft` unless an explicit publish action is allowed.
- Write an audit entry if you already have a safe workspace audit helper.
- Do not send the signal anywhere yet.

### `PATCH /api/workspace/signals/[signalId]`

Influencer only.

Requirements:

- Allow narrow actions such as:
  - save draft edits,
  - mark published,
  - cancel signal.
- Keep the payload strict.
- Do not call Telegram or any broker API.

---

## Dashboard Requirements

Build `/workspace` as the influencer operations dashboard.

### 1. Workspace Home

The top of `/workspace` should show:

- workspace name and handle,
- onboarding/activation status,
- current approval/review state,
- revenue summary,
- student count summary,
- quick actions,
- course count,
- latest signal state,
- payment-rail readiness badges.

If onboarding review is pending or owner approval is still needed, show that clearly and keep the dashboard useful instead of dead-ending the user.

### 2. Student Management

Add an influencer-facing student list view or dashboard section with:

- paginated list,
- status pills,
- tier labels,
- payment rail label,
- joined date,
- completion percent,
- search input,
- status filter.

If the workspace has no students yet, show a high-quality empty state instead of fake records.

### 3. Course Visibility

Add a course list section that shows:

- draft courses,
- published courses,
- access tier,
- section counts,
- last updated date,
- clear CTA into the future course-management flow.

Do not build the full lesson editor here. Prompt 09 will do that.

### 4. Signal Composer

Add a safe influencer signal composer UI that can:

- create a structured signal draft,
- list recent signals,
- show draft/published/cancelled state,
- keep helper copy about manual review and copier safety.

Do not implement Telegram sending or live student fan-out here.

### 5. Revenue And Payment Rail Overview

Show:

- monthly revenue,
- lifetime revenue,
- Paystack volume,
- optional Solana volume,
- active/trial/past-due student counts,
- whether Paystack is still owner-pending.

Use the summary doc if it exists. If it does not, return zero-safe values with a warning banner.

### 6. Empty-State Quality

This dashboard will often load before real students/signals/courses exist.

Empty states should still feel intentional:

- no students yet,
- no published courses yet,
- no signals posted yet,
- owner review still pending,
- checkout not fully enabled yet.

Do not fill empty states with misleading fake production numbers.

---

## Auth And Role Requirements

- `/workspace` remains protected by `RoleGate`.
- All new `/api/workspace/*` routes must verify the Firebase ID token server-side.
- The verified token's `workspaceId` must be the only workspace scope used.
- Never accept `workspaceId` from query params or request body as authority.
- Signed-out users must not see protected workspace data.
- Non-influencer users must get `403` from influencer-only API routes.

---

## Quota And Cost Guardrails

Continue following the Firestore quota rules already added to the PRD:

- Use direct document paths whenever possible.
- Use paginated queries with `25` max page size.
- Use a summary document for dashboard totals.
- Do not add realtime listeners for the dashboard.
- Do not autosave every keystroke.
- Do not scan all students/signals/courses to calculate counts.
- Prefer empty-state rendering over synthetic read-heavy aggregation.

If a summary doc is missing, return zeros and a warning instead of generating expensive fallback scans.

---

## Security Requirements

- Keep `firestore.rules` locked to clients.
- Keep Firebase Admin SDK on the server only.
- Do not expose service account JSON.
- Do not log raw auth tokens.
- Do not store Telegram secrets.
- Do not store wallet private keys or seed phrases.
- Do not store broker credentials.
- Validate all signal payloads strictly.
- Keep signal notes text-only and sanitize lengths.
- Do not trust hidden form fields for permissions.
- Ensure one influencer cannot query another workspace's students, signals, or courses.

---

## Suggested Implementation Shape

You may adapt file names, but a structure like this is expected:

```text
src/app/(influencer)/workspace/page.tsx
src/app/(influencer)/workspace/workspace-page-client.tsx
src/app/api/workspace/dashboard/route.ts
src/app/api/workspace/students/route.ts
src/app/api/workspace/courses/route.ts
src/app/api/workspace/signals/route.ts
src/app/api/workspace/signals/[signalId]/route.ts
src/components/workspace/*
src/lib/workspace/dashboard-repository.ts
src/lib/workspace/dashboard-mappers.ts
src/lib/workspace/dashboard-validation.ts
src/lib/workspace/dashboard-api-client.ts
src/types/workspace-dashboard.ts
```

Prefer small focused components over one giant dashboard file.

Keep the visual language aligned with the locked Stage 02 tokens and the Stage 07 onboarding shell.

---

## README Updates

Update `README.md` with:

- how to run the app,
- the main influencer routes to inspect,
- what collections/docs this stage expects,
- how the dashboard behaves when summary/students/signals/courses are empty,
- what this stage intentionally does not implement yet.

---

## Verification Requirements

Before finishing, verify all of the following:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run dev`

Manual/runtime verification:

- `/workspace` loads for an authenticated influencer with a valid `workspaceId` claim.
- signed-out access to new `/api/workspace/*` routes returns `401`.
- wrong-role access to new `/api/workspace/*` routes returns `403`.
- dashboard reads are scoped to the token `workspaceId`.
- missing summary doc shows a warning plus zero-safe totals instead of collection scans.
- student, course, and signal lists use pagination limits rather than loading everything.
- no client Firestore reads/writes were added for dashboard data.
- Firestore rules remain locked.
- Stage 07 onboarding still works.
- `/workspace/onboarding` still loads and saves.

Security verification:

- no raw Telegram token storage,
- no broker credential storage,
- no wallet private key or seed phrase storage,
- no broad Firestore scans for search/totals,
- no role proof from `localStorage` or query params.

If any live Firestore collections are still empty, that is acceptable as long as the empty states are honest and polished.

---

## Response Format When Finished

When you finish, respond with:

1. the local dev URL,
2. the best route(s) to inspect first,
3. the key files changed,
4. whether the dashboard is reading live Firestore, empty-state live Firestore, or a labeled development fallback,
5. exact verification results for lint, typecheck, build, dev, and route/API checks,
6. any still-missing external setup needed from the owner,
7. the recommended next prompt.

Be explicit about what is real, what is empty-state, and what is still deferred.
