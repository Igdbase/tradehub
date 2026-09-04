# Prompt 10 - Student App Shell and Workspace Experience

You are building **TradeHub Stage 10**. Stages 01-09 already created the Next.js scaffold, locked design system, typed domain layer, marketing application flow, Firebase Email/Password auth, role gates, Super Admin CRM, influencer onboarding wizard, influencer dashboard, and a live Course Hub with student lesson progress.

Your job now is to turn the student side into the real branded student product experience, not just a mobile-width shell with leftover Stage 03 mock data.

Build on the current codebase. Do not replace the design system. Do not remove Stage 05 auth, Stage 06 admin boundaries, Stage 07 onboarding flows, Stage 08 workspace data patterns, or Stage 09 live course routes. Do not open Firestore rules. Do not move student reads into client Firestore queries.

This stage should answer the product question: **"Once a student signs in, what does the real TradeHub product feel like on both phone and desktop?"**

---

## Current Setup State

The owner has already completed:

- Firebase project on Spark/free plan.
- Email/Password auth.
- Firestore database `(default)` in production mode.
- Firestore rules locked with `allow read, write: if false;`.
- Admin SDK service account configured locally.
- Working Super Admin bootstrap script.
- Working influencer bootstrap script.
- Working student bootstrap script.

Stage 08 added:

- `/workspace` as a real influencer dashboard backed by verified API routes.
- Workspace-scoped signal, course, and student management.

Stage 09 added and has already been manually validated:

- `/workspace/courses` and `/workspace/courses/[courseId]` for influencer course editing and publishing.
- `/app/courses` and `/app/courses/[courseId]` for live student course access.
- Student lesson progress saving with milestone-based writes.
- Lesson locking and tier access checks.
- A fallback for the student published-course query if the Firestore composite index is not created yet.

Known good current state:

- Student login works with a real `student` claim and `workspaceId`.
- `/app/courses` shows at least one published course when it exists.
- The student lesson reader can save `started` and `completed` progress and unlock the next lesson.
- `/app` still uses `src/lib/mock-selectors.ts` for home-shell content.
- The current `MobileAppShell` is intentionally capped at `max-w-[430px]`, which is acceptable on phones but too narrow to count as the final desktop/tablet experience.

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
- `prompt/08-influencer-dashboard-and-management.md`
- `prompt/09-course-hub-and-lesson-management.md`
- `prompt/promptsumary.md`
- `.env.example`
- `README.md`
- `package.json`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/*`
- `src/lib/firebase/*`
- `src/lib/course-hub/*`
- `src/lib/workspace/*`
- `src/lib/mock-selectors.ts`
- `src/app/api/student/*`
- `src/app/(student)/app/*`
- `src/components/student-courses/*`
- `src/components/layout/mobile-app-shell.tsx`
- `src/components/ui/*`
- `src/components/layout/*`

Treat `files/tradehub-03-tech.md` and `files/tradehub-06-setup.md` as the backend/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat Stage 09 as the real live backend starting point for student course access.

---

## Stage Goal

At the end of this stage:

- `/app` is no longer driven by Stage 03 mock selectors.
- the student experience is **mobile-first on phones** and **properly expanded on tablet/desktop**, not just a narrow centered phone preview,
- the student home route shows live workspace/student/course/signal/journal summary data through verified server routes,
- the student navigation feels like one branded product across Home, Courses, Signals, Copier, and Journal surfaces,
- the existing live Course Hub from Stage 09 is preserved and visually integrated into the improved student shell,
- the student can see real published signal cards scoped to their workspace,
- the student can see a safe copier status surface that reflects eligibility and mode without executing trades,
- the student can see a journal summary surface with privacy-aware read-only information,
- the student app feels like the influencer's product, not a generic admin page or a developer preview,
- Prompt 11 can build payment/subscription experiences on top of a polished student-facing shell.

---

## The Important Clarification For This Stage

This stage is **not** allowed to treat the current narrow mobile shell as the final desktop experience.

You must support both:

### Phone

- Keep the strong mobile-first product feel.
- Retain bottom navigation / app-shell behavior where appropriate.
- Preserve the premium card-based student experience.

### Tablet and Desktop

- Expand the student app into a responsive layout that uses larger screen real estate intentionally.
- Do **not** leave desktop as only a 430px centered phone mockup unless that mockup is paired with meaningful expanded surrounding content.
- It is acceptable to keep a mobile-shaped core card stack **inside** a wider desktop workspace, but the overall page must feel designed for larger screens.

Good desktop directions include:

- a two-column or three-column composition,
- a wider home dashboard with hero card + activity panels,
- a persistent left rail or top nav for student sections,
- a split layout for reader pages where lesson navigation and progress can sit beside content.

The desktop version must still preserve the student app identity and not become a generic SaaS admin dashboard.

---

## What This Stage Should NOT Do

Do **not**:

- enable Blaze/pay-as-you-go,
- enable Cloud Functions,
- add real payment initiation,
- add Paystack checkout,
- add Solana checkout,
- add Telegram delivery,
- add real Auto-Copy execution,
- collect exchange secrets or broker credentials in this stage,
- add client Firestore reads/writes,
- broad-scan entire collections to build student dashboards,
- fake live data when real workspace data exists,
- break `/app/courses` or `/app/courses/[courseId]`,
- remove student role protections,
- remove the shared design system,
- regress the student experience into a plain white dashboard or purple-on-black AI-default UI,
- leave desktop as only a tiny centered phone shell with no larger-screen adaptation.

---

## Required Architecture

Use the same secure pattern already established:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls verified /api/student/* routes with Authorization: Bearer <idToken>
  -> API route verifies token with Admin SDK
  -> API route confirms role === "student"
  -> API route confirms workspace scope from token claims
  -> API route reads only direct workspace/student documents or bounded workspace queries
```

Do not use the Firestore browser SDK for student app data.

`RoleGate` remains useful for UX, but the API route remains the real security boundary.

---

## Student Routes To Build or Upgrade

Use these as the target student surface set:

- `/app` — real student home
- `/app/courses` — keep and visually integrate Stage 09
- `/app/courses/[courseId]` — keep and improve where needed without regressing behavior
- `/app/signals` — real student signal feed
- `/app/copier` — safe student copier/status surface
- `/app/journal` — journal summary and privacy shell

If the current route structure suggests a better naming pattern, keep it consistent, but the student must have clearly reachable surfaces for Home, Courses, Signals, Copier, and Journal.

---

## What `/app` Should Become

The current `/app` page still uses mock selectors. Replace that with live student/workspace data.

The student home should feel like the "overview" screen for the student's relationship with the influencer workspace.

Recommended live sections:

- workspace/influencer identity hero,
- tier badge,
- course progress summary,
- latest live or most recent published signal,
- copier mode / eligibility status,
- journal summary card,
- quick links into Courses, Signals, Copier, and Journal,
- optional notices such as past due / inactive / access warnings.

Prefer a composition that works like:

- **phone:** one-column premium card stack,
- **tablet:** one main column + one supporting column,
- **desktop:** wider dashboard layout with deliberate grouping, not stretched phone cards.

---

## Student Data Model Expectations For This Stage

Do not invent a full new database if the current shape already supports the view. Reuse the current live Firestore model where possible.

### Safe live sources already available or expected

- `/workspaces/{workspaceId}`
- `/workspaces/{workspaceId}/students/{studentId}`
- `/workspaces/{workspaceId}/courses/{courseId}`
- `/workspaces/{workspaceId}/signals/{signalId}`
- `/workspaces/{workspaceId}/students/{studentId}/course_progress/{courseId}`
- `/workspaces/{workspaceId}/students/{studentId}/lesson_progress/{lessonId}`

### Recommended summary-style additions

If needed, add one or more summary-style documents such as:

```text
/workspaces/{workspaceId}/students/{studentId}/app_summary/current
/workspaces/{workspaceId}/students/{studentId}/journal_summary/current
```

Use summary docs when they reduce repeated reads. Do not create a noisy per-view write pattern.

Recommended `app_summary/current` shape:

```ts
{
  workspaceId: string;
  studentId: string;
  tierId: string;
  tierLabel: string;
  courseProgressPercent: number;
  completedCourseCount: number;
  liveSignalsCount: number;
  latestSignalAt?: string;
  journalPnl30dNgn?: number;
  journalWinRate30d?: number;
  copierMode: "auto_copy" | "signal_alerts_only";
  copierStatus: "active" | "paused" | "not_connected" | "not_eligible";
  updatedAt: string;
}
```

Recommended `journal_summary/current` shape:

```ts
{
  workspaceId: string;
  studentId: string;
  totalTrades30d: number;
  winRate30d: number;
  averageRiskReward30d: number;
  pnl30dNgn: number;
  bestPair?: string;
  updatedAt: string;
}
```

If these summary docs are missing, return honest empty states or safe zeros rather than broad unbounded queries.

---

## Signals Surface Requirements

Build a real student-facing Signals surface using workspace-scoped published signal data.

Student signal cards should feel premium and concise:

- pair,
- action,
- entry,
- stop loss,
- take profit,
- risk label,
- status,
- timestamp,
- market badge,
- whether the account is in Signal Alerts mode or Auto-Copy mode.

Important:

- no trade execution in this stage,
- no Telegram send in this stage,
- no student-side signal posting,
- no pretending prop-firm accounts are Auto-Copy eligible.

If the student account is not eligible for Auto-Copy, say so clearly and frame the surface as manual Signal Alerts.

---

## Copier Surface Requirements

Build a student-facing Copier surface that explains status and safety without collecting secrets in this stage.

This surface should show:

- whether the student is on personal account mode or prop-firm safe mode,
- whether Auto-Copy is eligible,
- current copier status,
- risk language about personal-account-only Auto-Copy,
- fallback explanation for Signal Alerts only accounts,
- space for future connection/setup actions without implementing live broker/exchange wiring here.

This stage is about product shell and clarity, not execution plumbing.

---

## Journal Surface Requirements

Build a student-facing Journal summary route that is live-data-ready but still scope-safe for MVP.

For this stage:

- show summary stats,
- show privacy state,
- show a small recent-performance summary or insight,
- keep it read-only or near-read-only unless a current safe API route already exists,
- avoid introducing a full analytics engine or full trade table if the backend is not ready.

Prompt 14 will deepen journal analytics and launch hardening. This stage should create the right student experience shell, not the full final journal system.

---

## Design Requirements

Respect the locked design system exactly.

Use the existing student visual language, but improve the layout quality:

- true black / restrained light mode support,
- hero card as a premium object,
- frosted glass cards,
- accent only where the system allows it,
- meaningful screen transitions,
- careful typography and tabular numerals,
- mobile-first interactions that do not look awkward on desktop.

Important design rule for this stage:

- on **phones**, the student app can remain compact and app-like,
- on **desktop/tablet**, do not just center a narrow 430px container and stop there.

You may keep a phone-like content rail as one part of the composition, but the whole page must feel intentionally designed for larger screens.

Possible direction:

- desktop shell with a wider content region,
- left-side nav or top segmented nav,
- main dashboard grid,
- secondary side panels for signals / journal / next lesson.

Preserve the student feel. Do not turn it into the influencer dashboard.

---

## Required API Boundaries

Prefer adding or upgrading verified student API routes such as:

```text
/api/student/app/overview
/api/student/signals
/api/student/copier
/api/student/journal/summary
```

These routes should:

- verify Firebase ID tokens with Admin SDK,
- confirm `role === "student"`,
- confirm `workspaceId` and `studentId`,
- read only that student's workspace data,
- return safe empty states when data is incomplete,
- avoid unbounded scans.

If a more efficient shape already exists in the repo, reuse it instead of duplicating logic.

---

## Mock Data Migration Requirement

The current `/app` route imports from `src/lib/mock-selectors.ts`.

At the end of this stage:

- `/app` must no longer depend on Stage 03 mock selectors for its main content,
- the student home shell should use live verified API reads,
- any remaining mock-only student content must be clearly isolated and justified,
- Stage 09 live course routes must continue working without regression.

---

## Security Requirements

Carry forward all existing safety rules:

- no client Firestore access for protected student data,
- no workspace crossover,
- no raw secrets in UI flows,
- no stored HTML injection,
- no broad query patterns that quietly burn Firestore quota,
- no false Auto-Copy promises for prop-firm students,
- no hidden reliance on `localStorage` for authorization,
- no role selection in the browser.

If summary docs are missing, return visible warnings or empty states rather than lying with fake data.

---

## Responsive Acceptance Standard

This stage is not complete unless it is manually checked at both sizes:

### Phone width

- navigation feels app-like,
- hero, cards, tabs, and reader flows remain comfortable,
- no horizontal overflow,
- bottom navigation feels intentional.

### Desktop/tablet width

- layout expands meaningfully,
- sections do not feel stranded in a tiny centered column,
- information density improves responsibly,
- the student experience still looks premium and branded.

---

## Verification Requirements

Before closing the stage, the implementation must prove all of the following:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run dev`

Manual / route verification:

- `/app` loads as a real student home surface while signed in as a student.
- `/app/courses` still loads the published course list.
- `/app/courses/[courseId]` still loads the lesson reader and preserves Stage 09 progress behavior.
- `/app/signals` returns a real student signal surface or an honest empty state.
- `/app/copier` returns a real student copier/safety surface.
- `/app/journal` returns a real student journal summary surface.
- signed-out `/api/student/*` routes return `401`.
- student routes do not regress to mock-only roleless behavior.
- no client Firestore reads/writes were added for protected student data.
- desktop and mobile layouts were both checked explicitly.

The final response for this stage should clearly state:

- which student routes are live,
- which student surfaces still use summary/empty-state fallbacks,
- whether `/app` still imports mock selectors or not,
- whether the desktop/tablet adaptation was implemented,
- whether any Firestore indexes or summary docs are still recommended next steps.

---

## Prompt 11 Readiness

This stage should leave the codebase ready for **Prompt 11 - Payments: Paystack subscriptions** by ensuring:

- the student shell is now a real product surface,
- the student's current tier and access status are visible,
- student-facing routes exist for the places where subscription state will later matter,
- the app no longer depends on Stage 03 mock student-home content.
