# Prompt 09 - Course Hub and Lesson Management

You are building **TradeHub Stage 09**. Stages 01-08 already created the Next.js scaffold, locked design system, typed domain layer, marketing application flow, Firebase Email/Password auth, role gates, Super Admin CRM, influencer onboarding wizard, and the influencer dashboard with live workspace reads through server-side Firebase Admin SDK routes.

Your job now is to turn the course foundation into a real Course Hub for both the influencer and the student experience.

Build on the current codebase. Do not replace the design system. Do not remove Stage 05 auth, Stage 06 admin boundaries, Stage 07 onboarding flows, or Stage 08 workspace dashboard APIs. Do not open Firestore rules. Do not move course data into client Firestore queries.

This stage should answer the product question: **"How do influencers structure lessons safely, and how do students actually consume those lessons inside TradeHub?"**

---

## Current Setup State

The owner has already completed:

- Firebase project on Spark/free plan.
- Email/Password auth.
- Firestore database `(default)` in production mode.
- Firestore rules locked with `allow read, write: if false;`.
- Admin SDK service account configured locally.
- Working Super Admin and influencer bootstrap scripts.

Stage 07 added:

- `/workspace/onboarding`.
- Workspace branding, conduct, pricing, Paystack readiness, optional Telegram/Solana, and first-course draft creation.
- A Firestore-backed draft course shell, typically `draft_first_course`.

Stage 08 added:

- `/workspace` real influencer dashboard.
- Workspace student, course, and signal sections backed by verified API routes.
- Honest empty states for live Firestore data.
- Signal draft saving through server-side routes.

Known good current state:

- At least one influencer workspace may exist locally with a valid `workspaceId` claim.
- The influencer dashboard can already show the draft course created during onboarding.
- There are no dedicated influencer course editor pages yet.
- The student app shell still uses mock selectors and has not been converted into a real course-reading experience.

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
- `src/lib/workspace/*`
- `src/app/api/workspace/*`
- `src/app/(influencer)/workspace/*`
- `src/app/(student)/app/*`
- `src/components/onboarding/*`
- `src/components/workspace/*`
- `src/components/ui/*`
- `src/components/layout/*`

Treat `files/tradehub-03-tech.md` and `files/tradehub-06-setup.md` as the backend/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat the Stage 07 first-course draft and the Stage 08 course list as the starting state for this prompt.

---

## Stage Goal

At the end of this stage:

- influencers can manage courses through real course pages, not just a dashboard card,
- students can open a real course list and lesson reader backed by live workspace data,
- lesson content supports safe YouTube embedding without storing raw YouTube URLs,
- course access honors the student's tier and lesson locking rules,
- lesson progress writes are milestone-based and quota-safe,
- notes render safely without raw HTML injection,
- attachments are metadata-only and safely validated,
- quiz-ready fields exist without requiring a full exam engine,
- Stage 10 can build the fully branded student app shell on top of a real course backend instead of mocks.

---

## What This Stage Should NOT Do

Do **not**:

- enable Blaze/pay-as-you-go,
- enable Cloud Functions,
- upload videos or files to Firebase Storage,
- store large binary assets in Firestore,
- store raw YouTube URLs directly in saved lesson documents,
- add Vimeo, Loom, or arbitrary embed providers,
- add live chat, comments, certificates, or communities,
- add full quiz scoring analytics,
- add downloadable secret files,
- use client Firestore reads/writes for course data,
- track video playback every second,
- store progress on every seek/play/pause event,
- scan broad collections for course totals,
- allow one workspace to access another workspace's courses,
- break `/workspace`, `/workspace/onboarding`, or `/app`,
- regress the student app into a generic layout that ignores the locked visual system.

---

## Required Architecture

Use the same secure pattern already established:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls verified API routes with Authorization: Bearer <idToken>
  -> API route verifies token with Admin SDK
  -> API route confirms role and workspace scope
  -> API route reads/writes only direct workspace documents
```

For influencer course management:

```text
/api/workspace/courses/*
```

For student course consumption:

```text
/api/student/courses/*
```

Do not use the Firestore browser SDK for course CRUD or student lesson progress.

---

## Firestore Shape For This Stage

Build on the existing course shape but make it production-shaped enough for the next stages.

Primary course collection:

```text
/workspaces/{workspaceId}/courses/{courseId}
```

Recommended saved shape:

```ts
{
  courseId: string;
  workspaceId: string;
  title: string;
  description: string;
  thumbnailVideoId?: string;
  accessTier: "all" | string;
  published: boolean;
  status: "draft" | "published" | "archived";
  sections: Array<{
    sectionId: string;
    title: string;
    order: number;
    lessons: Array<{
      lessonId: string;
      title: string;
      youtubeVideoId?: string;
      notes: string;
      order: number;
      requiresPrevious: boolean;
      attachments: Array<{
        label: string;
        url: string;
      }>;
      quiz?: {
        questions: Array<{
          question: string;
          options: string[];
          correctIndex: number;
        }>;
      };
      requiresQuizPass: boolean;
      durationLabel?: string;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}
```

Notes:

- If a YouTube URL is pasted, parse it into `youtubeVideoId` before persistence.
- Do not persist the raw full YouTube lesson URL.
- Keep lessons nested inside the course document for this MVP stage unless the current codebase clearly requires a different shape.
- Keep the document size reasonable; do not turn one course into a giant knowledge base.

### Student progress

Use milestone-based progress docs such as:

```text
/workspaces/{workspaceId}/students/{studentId}/lesson_progress/{lessonId}
```

Recommended fields:

```ts
{
  workspaceId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  watchedPercent: 0 | 80 | 100;
  completed: boolean;
  quizScore?: number;
  quizPassed?: boolean;
  startedAt?: string;
  completedAt?: string;
  lastWatched: string;
}
```

Rules:

- Save only milestone progress such as started, 80 percent, completed.
- Do not stream per-second playback position into Firestore.

Optional course summary per student:

```text
/workspaces/{workspaceId}/students/{studentId}/course_progress/{courseId}
```

Recommended fields:

```ts
{
  workspaceId: string;
  studentId: string;
  courseId: string;
  completedLessonCount: number;
  lessonCount: number;
  overallPercent: number;
  lastLessonId?: string;
  updatedAt: string;
}
```

If you create this summary, update it only when lesson milestones change.

---

## API Routes

Add or expand server-side API routes. Suggested:

```text
src/app/api/workspace/courses/route.ts
src/app/api/workspace/courses/[courseId]/route.ts
src/app/api/student/courses/route.ts
src/app/api/student/courses/[courseId]/route.ts
src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts
```

### `GET /api/workspace/courses`

Influencer only.

Requirements:

- Verify Firebase ID token.
- Require `role === "influencer"`.
- Scope by token `workspaceId`.
- Return course list with summary metadata.
- Support `limit` with max `25`.
- Support simple search/filter within safe bounds.

### `POST /api/workspace/courses`

Influencer only.

Requirements:

- Create a course shell or promote a Stage 07 draft into the fuller course shape.
- Validate title, description, access tier, and initial sections.
- Default new courses to draft.
- Audit-log important course creation actions if the workspace audit helper already exists.

### `GET /api/workspace/courses/[courseId]`

Influencer only.

Requirements:

- Return the full course document for editor use.
- Scope by token `workspaceId`.
- Return `404` if missing.

### `PATCH /api/workspace/courses/[courseId]`

Influencer only.

Requirements:

- Allow narrow safe updates such as:
  - course metadata,
  - sections,
  - lessons,
  - attachments,
  - publish/unpublish/archive state.
- Validate all nested arrays strictly.
- Parse YouTube URLs into IDs before save if the UI allows pasted URLs.
- Reject unsupported embeds or malformed lesson payloads.

### `GET /api/student/courses`

Student only.

Requirements:

- Verify Firebase ID token.
- Require `role === "student"`.
- Resolve the student's workspace scope from verified claims or existing student record shape.
- Return only published courses accessible to that student tier.
- Return course progress summaries if available.

### `GET /api/student/courses/[courseId]`

Student only.

Requirements:

- Return the course with lesson lock states:
  - available,
  - locked by previous lesson,
  - locked by tier,
  - locked by unpublished state.
- Do not return unpublished courses to normal students.
- Include the student's saved lesson progress.

### `POST /api/student/courses/[courseId]/lessons/[lessonId]/progress`

Student only.

Requirements:

- Accept only milestone-style updates such as:
  - `started`,
  - `watched_80`,
  - `completed`,
  - optional `quiz_passed`.
- Validate that the lesson belongs to the course and the course belongs to the student's workspace.
- Update lesson progress and optional course summary.
- Keep writes intentionally sparse.

---

## Influencer Course Hub Requirements

Build real influencer course management routes and UI.

Suggested routes:

```text
/workspace/courses
/workspace/courses/[courseId]
```

Requirements:

- course list page with draft/published state,
- create course CTA,
- edit existing course CTA,
- clear display of access tier,
- section counts,
- last updated date,
- publish/unpublish action,
- safe lesson editor for sections and lessons.

The first-course draft from Stage 07 should flow naturally into this hub. If `draft_first_course` exists, the user should be able to open and continue editing it instead of recreating it.

### Lesson editor requirements

Each lesson should support:

- title,
- YouTube input that is normalized to `youtubeVideoId`,
- plain-text or safely rendered notes,
- `requiresPrevious` lock,
- attachment label + URL metadata,
- optional quiz-ready structure,
- order within section.

Do not use raw HTML for notes. Do not use `dangerouslySetInnerHTML`.

Attachments must:

- be metadata only,
- use `https://` URLs only,
- reject `javascript:`, `data:`, and similar unsafe schemes.

### Publish rules

- A course can be published only if it has at least one section and one lesson.
- Lessons missing title or video ID should block publish.
- A draft can still be saved with incomplete fields.
- The UI should explain clearly why publish is blocked if required parts are missing.

---

## Student Course Experience Requirements

Build real student course routes and UI.

Suggested routes:

```text
/app/courses
/app/courses/[courseId]
```

Use the existing mobile-first student visual language already present in `/app`.

Requirements:

- course list screen,
- course detail screen,
- lesson list grouped by section,
- locked/unlocked lesson states,
- lesson reading/watch page or inline lesson experience,
- progress bar and completed counts,
- safe notes rendering,
- attachment links,
- explicit completion controls.

### Lesson locking rules

Support:

- `requiresPrevious`: next lesson stays locked until the previous one is complete,
- optional quiz-ready gate if `requiresQuizPass` is true,
- access-tier gating based on student tier,
- unpublished lessons/courses hidden from students.

### Progress UX

Use simple explicit or milestone-based controls such as:

- `Start lesson`,
- `Mark 80% watched`,
- `Mark complete`.

You may simulate milestone progression through buttons or controlled UX if full video event integration would create noisy writes.

Do not write progress on every second of playback.

---

## YouTube And Content Safety Requirements

If the influencer pastes any of these:

- standard YouTube watch URL,
- short YouTube URL,
- embed URL,

parse the value and store only the YouTube video ID.

Rules:

- reject unsupported hosts,
- reject malformed IDs,
- never persist full raw watch URLs as the canonical lesson field,
- render with a safe YouTube embed approach such as `youtube-nocookie.com`,
- do not allow arbitrary iframe URLs.

Notes rendering:

- render as plain text with line breaks or a restricted sanitized format,
- do not render raw HTML,
- sanitize length and structure server-side.

---

## Quiz-Ready State Requirements

Do not build a full certification engine yet.

But the schema and UI should be ready enough for later stages:

- optional quiz question list,
- optional `requiresQuizPass`,
- optional stored `quizScore` / `quizPassed` in lesson progress.

You may keep quiz authoring simple in this stage. The key goal is structural readiness, not advanced grading features.

---

## Auth And Role Requirements

- Influencer course routes remain protected by `RoleGate`.
- Student course routes remain protected by a student role gate if available.
- All new API routes must verify Firebase ID tokens server-side.
- The verified token scope must determine workspace access.
- Never accept `workspaceId` from the browser as authority.
- Signed-out users must receive `401`.
- Wrong-role users must receive `403`.

If the student role bootstrap flow is not fully live yet, still implement the real verified route path and fail safely where setup is missing.

---

## Quota And Cost Guardrails

Continue following the Firestore quota rules already added to the PRD:

- use direct document paths whenever possible,
- paginate course lists with `25` max page size,
- keep lesson progress milestone-based,
- do not autosave on every keystroke,
- do not scan all progress docs to render one screen,
- use course summary docs only if they provide real savings,
- do not duplicate huge lesson content across collections.

Prefer explicit save buttons in the influencer editor.

---

## Security Requirements

- Keep `firestore.rules` locked to clients.
- Keep Firebase Admin SDK on the server only.
- Do not expose service account JSON.
- Do not log raw auth tokens.
- Do not allow arbitrary embed hosts.
- Do not store raw YouTube watch URLs as the canonical persisted field.
- Do not render raw HTML lesson notes.
- Validate attachment URLs strictly.
- Do not expose unpublished courses to students.
- Do not allow one workspace to edit or read another workspace's courses.

---

## Suggested Implementation Shape

You may adapt file names, but a structure like this is expected:

```text
src/app/(influencer)/workspace/courses/page.tsx
src/app/(influencer)/workspace/courses/[courseId]/page.tsx
src/app/(student)/app/courses/page.tsx
src/app/(student)/app/courses/[courseId]/page.tsx
src/app/api/workspace/courses/route.ts
src/app/api/workspace/courses/[courseId]/route.ts
src/app/api/student/courses/route.ts
src/app/api/student/courses/[courseId]/route.ts
src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts
src/components/course-hub/*
src/components/student-courses/*
src/lib/course-hub/*
src/types/course-hub.ts
```

Prefer focused components and validators over one giant course editor file.

Preserve the existing TradeHub look and feel. The student course screens should feel like a natural extension of the current mobile shell, not a generic LMS theme.

---

## README Updates

Update `README.md` with:

- the new course routes to inspect,
- what data is expected in Firestore,
- how YouTube lesson input is normalized,
- how lesson progress is saved,
- what is intentionally deferred to later prompts.

---

## Verification Requirements

Before finishing, verify all of the following:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run dev`

Manual/runtime verification:

- `/workspace/courses` loads for a valid influencer account,
- `/workspace/courses/[courseId]` opens and can edit a draft course,
- the Stage 07 draft course can be opened and refined,
- pasted YouTube input is normalized safely,
- invalid YouTube/attachment inputs are rejected with clear validation,
- publish is blocked when required lesson structure is missing,
- `/app/courses` loads for a valid student account or fails safely if student setup is not yet present,
- published courses are visible to students,
- unpublished courses are hidden from students,
- lesson locking rules behave correctly,
- progress writes are milestone-based and succeed through verified routes.

Security verification:

- signed-out access to all new course APIs returns `401`,
- wrong-role access returns `403`,
- Firestore rules remain locked,
- no client Firestore reads/writes were added for course data,
- no raw HTML lesson rendering,
- no raw arbitrary embed persistence.

If live student data is not fully configured locally, be explicit about what was verified through code/build checks vs what still needs a real student account.

---

## Response Format When Finished

When you finish, respond with:

1. the local dev URL,
2. the best course routes to inspect first,
3. the key files changed,
4. whether influencer and student course views are reading live Firestore, honest empty-state live data, or a clearly labeled fallback,
5. exact verification results for lint, typecheck, build, dev, and route/API checks,
6. any still-missing owner setup needed for full student verification,
7. the recommended next prompt.

Be explicit about what is real, what is still empty-state, and what remains deferred.
