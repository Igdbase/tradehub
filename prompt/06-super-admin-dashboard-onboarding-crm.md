# Prompt 06 - Super Admin Dashboard and Onboarding CRM

You are building **TradeHub Stage 06**. Stages 01-05 already created the Next.js scaffold, locked design system, typed mock/domain layer, marketing application flow, Firebase Email/Password login, auth provider, role gates, `/login`, `/access-pending`, Firestore emulator config, and a server-only Super Admin bootstrap script.

Your job now is to turn `/admin` into the real owner/operator control room for onboarding applications, vetting, workspace creation status, activation milestones, platform summaries, payment-rail overview, disputes, risk flags, and audit visibility.

Build on the current codebase. Do not replace the design system. Do not remove the Stage 05 auth foundation. Do not open Firestore rules. Do not move admin reads into client-side Firestore queries.

This stage should answer the product question: **"How do we see and manage the data of our onboarders?"**

---

## Current Setup State

The owner has already created:

- Firebase project on Spark/free plan.
- Firebase web app config in `.env.local` from the temporary `firbaseconfig.js`.
- Email/Password auth.
- First Firebase Auth user.
- Firestore database `(default)` in production mode.
- Firestore rules locked with `allow read, write: if false;`.

Stage 05 added:

- `firebase` and `firebase-admin`.
- Firebase client initialization from env variables.
- Auth provider and role claims hydration.
- `/login`.
- `/access-pending`.
- Role gates for `/admin`, `/workspace`, `/workspace/onboarding`, and `/app`.
- `scripts/bootstrap-super-admin.mjs`.
- `firebase.json`, `.firebaserc`, `firestore.rules`, and emulator scripts.

Known limitation:

- The real `firebase:bootstrap-super-admin` may not have run yet if `SUPER_ADMIN_EMAIL` and Admin SDK credentials are missing.
- Firebase emulators may not run yet if Java or Firebase CLI auth is missing locally.

Do not block implementation because of missing local credentials. Build the real server-side path, fail safely when credentials are missing, and keep a clearly labeled mock/development fallback for UI proof only.

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
- `files/tradehub-marketing-blueprint.md`
- `asset/tradehub-colors.html`
- `prompt/01-project-scaffold.md`
- `prompt/02-locked-design-system.md`
- `prompt/03-mock-data-domain-models.md`
- `prompt/04-marketing-landing-application-flow.md`
- `prompt/05-authentication-role-routing.md`
- `prompt/promptsumary.md`
- `.env.example`
- `README.md`
- `package.json`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `src/types/*`
- `src/data/*`
- `src/lib/mock-selectors.ts`
- `src/lib/firebase/*`
- `src/components/auth/*`
- `src/app/(public)/page.tsx`
- `src/components/marketing/application-form.tsx`
- `src/app/(super-admin)/admin/page.tsx`
- `src/app/(super-admin)/admin/admin-page-client.tsx`
- `src/components/ui/*`
- `src/components/layout/*`

Treat `files/tradehub-03-tech.md` and `files/tradehub-06-setup.md` as the backend/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat Stage 03 mock data as the fallback/development source only, not as proof of production persistence.

---

## Stage Goal

At the end of this stage:

- `/admin` is a polished Super Admin CRM and operations dashboard.
- Super Admin API routes verify Firebase ID tokens server-side with Admin SDK.
- Admin reads and writes use server-side Admin SDK only, not client Firestore.
- Firestore rules remain locked to clients.
- The public application form can submit to a server route that creates a `workspace_applications` document when Admin SDK credentials are configured.
- The admin dashboard can list, filter, search, inspect, and update workspace applications.
- Dashboard totals read from summary-shaped data, not full collection scans.
- The UI clearly shows whether data is coming from Firestore/Admin SDK or mock fallback.
- Application status changes create audit entries.
- No payment, Solana, Telegram, Cloud Functions, or copier integrations are added yet.
- Prompt 07 can build influencer onboarding from approved/created workspace records without rewriting the owner CRM.

---

## What This Stage Should NOT Do

Do **not**:

- enable Blaze/pay-as-you-go,
- enable Cloud Functions,
- add real Paystack SDK calls,
- add real Solana Pay SDK calls,
- add Telegram bot token handling,
- create live payment charges,
- collect bank account details,
- collect wallet private keys or seed phrases,
- collect broker/exchange credentials,
- open Firestore rules with `allow read, write: if true`,
- move Super Admin reads into client Firestore SDK queries,
- trust the client role gate as the API security boundary,
- let users assign themselves roles,
- use `localStorage` or query params for role/admin access,
- auto-approve applications from the public form,
- auto-create influencer Auth users,
- auto-create live workspaces from public submissions,
- scan full Firestore collections for dashboard totals,
- add realtime listeners to dashboards,
- store large files, videos, or images in Firestore,
- break the Stage 04 marketing page or Stage 05 login flow.

---

## Required Architecture

Use this pattern:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls /api/admin/* with Authorization: Bearer <idToken>
  -> Next.js API route verifies token using Firebase Admin SDK
  -> API route confirms custom claim role === "super_admin"
  -> API route uses Admin SDK to read/write Firestore
```

For public application submit:

```text
Public application form
  -> POST /api/applications
  -> server validates and sanitizes payload
  -> server writes /workspace_applications/{applicationId} with Admin SDK
  -> client receives safe success response
```

Firestore client SDK should not be used for Super Admin data in this prompt.

---

## Server-Only Firebase Admin Layer

Create a clean server-only Admin SDK layer.

Suggested files:

```text
src/lib/firebase/admin.ts
src/lib/firebase/admin-auth.ts
src/lib/firebase/admin-errors.ts
```

Requirements:

- Initialize Admin SDK only on the server.
- Support `FIREBASE_SERVICE_ACCOUNT_KEY`.
- Support `GOOGLE_APPLICATION_CREDENTIALS`.
- Never import this layer from client components.
- Never print service account JSON.
- Return clear configuration errors when credentials are missing.
- Verify Firebase ID tokens for admin API routes.
- Require `role === "super_admin"` for `/api/admin/*`.
- Do not require `workspaceId` for Super Admin.

Add a helper such as:

```ts
requireSuperAdmin(request: Request): Promise<VerifiedSuperAdmin>
```

It should:

- read `Authorization: Bearer <token>`,
- verify the token with Admin SDK,
- check `role === "super_admin"`,
- return safe user info like `uid` and `email`,
- throw/return `401` for missing/invalid token,
- throw/return `403` for valid token without Super Admin claim.

---

## Data Source Strategy

Create a repository/data-source boundary so the UI does not care whether data came from Firestore or mock data.

Suggested files:

```text
src/lib/admin/admin-repository.ts
src/lib/admin/firestore-admin-repository.ts
src/lib/admin/mock-admin-repository.ts
src/lib/admin/admin-mappers.ts
src/lib/admin/admin-validation.ts
src/types/admin-api.ts
```

Requirements:

- Firestore repository uses Admin SDK only.
- Mock repository uses Stage 03 data only for local UI proof.
- The API response must include a source label:

```ts
type AdminDataSource = "firestore" | "mock_fallback";
```

- If Admin SDK credentials are missing, `/api/admin/*` should fail safely or return mock fallback only in development.
- Never silently claim mock data is real production data.
- Show a visible banner on `/admin` when using mock fallback.

Recommended fallback rule:

- In development: allow mock fallback with a visible warning.
- In production: do not use mock fallback for admin API; return configuration error.

---

## Firestore Collections For This Stage

Use the PRD schema and keep it minimal.

Primary collection:

```text
/workspace_applications/{application_id}
```

Fields:

```ts
{
  applicationId: string;
  name: string;
  email: string;
  primaryPlatform?: "telegram" | "whatsapp" | "instagram" | "x" | "youtube" | "discord" | "website" | "other";
  handleOrChannel: string;
  audienceSize: number;
  market: "forex" | "crypto" | "both";
  studentAccountMix: "personal" | "prop_firm" | "both" | "unknown";
  monetizationMethod: string;
  productOfferings?: Array<"courses" | "signals" | "mentorship" | "community">;
  currentCustomerCount?: number;
  solanaPayInterest?: boolean;
  noResultsPromiseAccepted: boolean;
  notes: string;
  status: "new" | "vetting" | "approved" | "rejected" | "workspace_created" | "activated";
  vettingOutcome: "pending" | "approved" | "watchlist" | "rejected";
  vettingNotes: string;
  setupFeeStatus: "not_required" | "pending" | "paid" | "waived";
  workspaceId?: string;
  source: "landing_page" | "referral" | "manual";
  workspaceCreationStatus: "not_started" | "queued" | "created";
  createdAt: string;
  updatedAt: string;
  firstPayingStudentAt?: string;
}
```

Summary collection:

```text
/platform_summaries/current
```

Fields:

```ts
{
  activeWorkspaceCount: number;
  activeStudentCount: number;
  monthlyGrossRevenueNgn: number;
  monthlyPlatformRevenueNgn: number;
  paystackVolumeNgn: number;
  solanaVolumeUsdc: number;
  openDisputeCount: number;
  pendingApplicationCount: number;
  riskFlagCount: number;
  latestSignalAt?: string;
  updatedAt: string;
}
```

Audit collection:

```text
/audit_log/{event_id}
```

Fields:

```ts
{
  eventId: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  targetType: "workspace_application" | "workspace" | "summary" | "risk_flag" | "dispute";
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}
```

Optional read-only supporting collections for admin display if already modeled:

- `/workspace_summaries/{workspace_id}`
- `/workspaces/{workspace_id}`
- `/workspaces/{workspace_id}/disputes/{dispute_id}`

Do not over-expand Firestore in this prompt.

---

## API Routes

Add API routes under the Next.js App Router.

Suggested routes:

```text
src/app/api/applications/route.ts
src/app/api/admin/overview/route.ts
src/app/api/admin/applications/route.ts
src/app/api/admin/applications/[applicationId]/route.ts
src/app/api/admin/audit-log/route.ts
```

### `POST /api/applications`

Public route for the marketing application form.

Requirements:

- Validate payload server-side.
- Require `noResultsPromiseAccepted === true`.
- Sanitize strings by trimming and limiting length.
- Normalize email to lowercase.
- Generate server-side `applicationId`.
- Set initial state:
  - `status: "new"`
  - `vettingOutcome: "pending"`
  - `vettingNotes: ""`
  - `setupFeeStatus: "not_required"` or sensible default from current model
  - `workspaceCreationStatus: "not_started"`
  - `source: "landing_page"`
  - `createdAt` and `updatedAt`
- Write using Admin SDK if configured.
- Return only safe response fields.
- Do not expose internal vetting notes publicly.
- Do not let public users set `status`, `vettingOutcome`, `setupFeeStatus`, `workspaceId`, or `workspaceCreationStatus`.
- Include a simple bot honeypot field if changing the form is practical.
- If Admin SDK is not configured, fail clearly and let the UI show "not persisted yet" in development.

### `GET /api/admin/overview`

Super Admin only.

Requirements:

- Verify ID token and `super_admin` claim.
- Read `/platform_summaries/current` if available.
- Read only small, limited support lists if needed.
- Do not scan all students, payments, journals, or applications to compute totals.
- If summary is missing, return a safe empty summary plus warning instead of scanning everything.

### `GET /api/admin/applications`

Super Admin only.

Requirements:

- Verify ID token and `super_admin` claim.
- Support query params:
  - `status`
  - `q`
  - `source`
  - `limit`
  - `cursor`
- Default limit: `25`.
- Maximum limit: `50`.
- Sort by `createdAt desc` or `updatedAt desc`.
- No unbounded list.
- If full text search is not available, implement basic search against loaded limited results and clearly document the limitation.

### `PATCH /api/admin/applications/[applicationId]`

Super Admin only.

Requirements:

- Verify ID token and `super_admin` claim.
- Allow only admin-managed fields:
  - `status`
  - `vettingOutcome`
  - `vettingNotes`
  - `setupFeeStatus`
  - `workspaceCreationStatus`
  - `workspaceId`
  - `firstPayingStudentAt`
- Validate state transitions so impossible states are not silently accepted.
- Always update `updatedAt`.
- Write an audit log entry for every change.
- Return the updated application.
- Do not allow changing applicant email/name/audience fields from this endpoint unless intentionally added with validation.

### `GET /api/admin/audit-log`

Super Admin only.

Requirements:

- Verify ID token and `super_admin` claim.
- Return latest audit events only.
- Default limit `25`, max `50`.

---

## Admin UI Requirements

Upgrade `/admin` from the current Stage 05 shell into a real operator dashboard.

Required sections:

1. **Source/status banner**
   - Shows `Firestore live`, `Mock fallback`, or `Admin SDK not configured`.
   - If mock fallback, make it visually clear that the data is not production.

2. **Platform summary**
   - Active workspaces.
   - Active students/subscribers.
   - Monthly gross revenue.
   - Monthly platform revenue.
   - Paystack volume.
   - Solana/USDC volume.
   - Pending applications.
   - Open disputes.
   - Risk flags.

3. **Application pipeline**
   - Status tabs: New, Vetting, Approved, Rejected, Workspace Created, Activated.
   - Search by name/email/handle.
   - Filter by market/source/Solana interest if practical.
   - Paginated list.
   - Clear empty states.

4. **Application detail panel**
   - Applicant identity.
   - Channel/platform.
   - Audience size.
   - Market.
   - Student account mix.
   - Product offerings.
   - Monetization method.
   - Solana Pay interest.
   - Notes.
   - No-results-promise confirmation.
   - Vetting notes.
   - Setup fee status.
   - Workspace creation status.

5. **Admin actions**
   - Move to vetting.
   - Approve.
   - Reject with vetting note.
   - Mark setup fee paid/waived/pending.
   - Queue workspace creation.
   - Mark workspace created.
   - Mark activated / first paying student.
   - Save vetting notes.

6. **Payment rail overview**
   - Paystack default rail.
   - Solana Pay/USDC optional rail.
   - Counts/volume from summary or mock fallback.
   - No real payment actions yet.

7. **Trust and safety**
   - Open disputes.
   - Risk flags.
   - Workspaces requiring review.
   - Keep actions mostly view-only unless the model already supports updates.

8. **Audit preview**
   - Latest admin actions.
   - Actor, action, target, timestamp.

Design requirements:

- Keep the Stage 02/04 premium TradeHub visual language.
- Make it feel like a real command center, not a plain table dump.
- Use glass cards, status badges, stat chips, and focused panels.
- Dark/light theme must work.
- Mobile layout must not break, but dense admin UX can prioritize tablet/desktop.
- No purple SaaS gradients.

---

## Public Application Form Wiring

Update the Stage 04 application form so it can submit to `POST /api/applications`.

Requirements:

- Keep existing client validation.
- Add server validation.
- Show a loading state.
- Show success only after the API responds successfully.
- If Admin SDK is not configured in development, show a clear non-persisted/development message.
- Do not log full application payload to the console.
- Do not save the application to localStorage.
- Do not expose the applicant's submission to public reads.

After a successful persisted submission:

- Show application reference ID.
- Explain that the application goes to the Super Admin onboarding queue.
- Keep next-step copy: vetting review, short call, setup fee/manual approval, workspace creation.

---

## Workspace Creation Boundary

This prompt may support workspace creation status, but it should not fully build influencer onboarding.

Allowed:

- Queue workspace creation.
- Create or assign a `workspaceId` string.
- Mark `workspaceCreationStatus` as `queued` or `created`.
- Display activation milestones.
- Optionally create a minimal `/workspaces/{workspace_id}` shell via Admin SDK only if the implementation is clean and safe.

Not allowed:

- Create influencer Auth users automatically.
- Assign influencer custom claims automatically without a deliberate operator action and script.
- Collect Paystack bank details.
- Collect Telegram bot tokens.
- Collect Solana private keys.
- Launch student invite access.
- Build the influencer onboarding wizard. That is Prompt 07.

---

## Firestore Rules And Indexes

Keep `firestore.rules` safe.

Acceptable Stage 06 production rule posture:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Because this stage uses Admin SDK server routes, clients do not need direct Firestore access.

If indexes are needed, add them to `firestore.indexes.json`.

Likely indexes:

- `workspace_applications`: `status asc`, `createdAt desc`
- `workspace_applications`: `source asc`, `createdAt desc`
- `workspace_applications`: `updatedAt desc`

Do not deploy rules or indexes unless explicitly requested.

---

## Quota And Cost Guardrails

This stage must preserve the Firestore free-tier/quota strategy.

Requirements:

- Default page size: `25`.
- Maximum page size: `50`.
- No unbounded list queries.
- No dashboard scans across all users/students/payments/journals.
- No realtime listeners.
- Use `/platform_summaries/current` for dashboard totals.
- If summary is missing, show empty/unknown summary rather than scanning every collection.
- Admin dashboard can manually refresh.
- Public application create should be one write plus one optional audit/log write at most.
- Admin status update should write the application and one audit entry.
- Keep Stage 03 mock data only as visible fallback, not hidden production behavior.

---

## Security Requirements

Required:

- Verify Super Admin at the API layer with Admin SDK.
- Keep `RoleGate` for UX, but do not treat it as backend security.
- Never import `firebase-admin` into client components.
- Never expose service account credentials.
- Never log ID tokens.
- Never log service account JSON.
- Never trust client-provided status fields on public application submit.
- Never allow public reads of applications.
- Never allow public users to list applications.
- Never use `dangerouslySetInnerHTML` for applicant/admin text.
- Sanitize and validate all text fields.
- Add audit log entries for admin writes.
- Return safe error messages without leaking stack traces or secrets.

Security checks before closing:

- No `allow read, write: if true`.
- No `firebase-admin` import from files containing `"use client"`.
- No service account JSON in `src/`.
- No Firestore client reads in admin CRM.
- No localStorage role/admin shortcuts.
- No raw user-provided HTML rendering.

---

## Suggested Implementation Shape

You may adjust if the current app suggests a better structure, but keep the boundaries clean:

```text
src/
  app/
    api/
      applications/
        route.ts
      admin/
        overview/
          route.ts
        applications/
          route.ts
          [applicationId]/
            route.ts
        audit-log/
          route.ts
    (super-admin)/
      admin/
        page.tsx
        admin-page-client.tsx
  components/
    admin/
      admin-source-banner.tsx
      admin-stat-grid.tsx
      application-detail-panel.tsx
      application-filters.tsx
      application-pipeline.tsx
      audit-log-preview.tsx
      payment-rail-overview.tsx
      trust-safety-panel.tsx
  lib/
    admin/
      admin-api-client.ts
      admin-repository.ts
      firestore-admin-repository.ts
      mock-admin-repository.ts
      admin-mappers.ts
      admin-validation.ts
    firebase/
      admin.ts
      admin-auth.ts
      admin-errors.ts
  types/
    admin-api.ts
```

Client admin components should fetch API routes with the current Firebase ID token from the Auth provider/client auth helper.

Server API routes should verify the ID token again. Do not trust the browser.

---

## README Updates

Update `README.md` with:

- how to run Stage 06 locally,
- how to sign in,
- why `/admin` needs a Super Admin claim,
- how to run `npm run firebase:bootstrap-super-admin`,
- what env vars are required for Admin SDK,
- how to know if `/admin` is using Firestore or mock fallback,
- how to test a public application submission,
- how to avoid Firestore quota waste.

Do not ask the user to paste passwords.

---

## Verification Requirements

Before closing Stage 06, run:

```bash
npm run lint
npm run typecheck
npm run build
```

Then start the dev server:

```bash
npm run dev
```

Smoke test these routes:

- `/`
- `/login`
- `/admin`
- `/access-pending`
- `/workspace`
- `/workspace/onboarding`
- `/app`
- `/join/apexfx`
- `/design-system`
- `/terms`
- `/privacy`
- `/risk-disclosure`
- `/data-use`

API checks:

- Signed-out request to `/api/admin/overview` returns `401`.
- Signed-in non-super-admin request returns `403` or access-pending behavior.
- Super Admin request returns overview data or a clear config/fallback state.
- Public invalid application submit returns validation errors.
- Public valid application submit either persists to Firestore or clearly reports Admin SDK not configured in development.
- Admin application update writes audit log when Admin SDK is configured.

Manual UI checks:

- `/admin` does not expose CRM data while signed out.
- `/admin` still requires `super_admin`.
- Source banner accurately says Firestore vs mock fallback.
- Application status filters work.
- Application detail panel opens.
- Vetting notes can be edited and saved when API is configured.
- Empty/config-missing states are clear and not scary.
- Dark/light theme works.
- Mobile does not break.

Security checks:

```bash
rg -n "allow read, write: if true|localStorage.*role|dangerouslySetInnerHTML|firebase-admin" src firestore.rules
```

Expected:

- no permissive Firestore rule,
- no localStorage role shortcut,
- no unsafe HTML rendering,
- `firebase-admin` only appears in server-only modules/API routes/scripts.

Also check:

- no Paystack secret keys,
- no Solana private keys or seed phrases,
- no Telegram bot tokens,
- no raw YouTube lesson URLs,
- no broker credentials,
- no service account JSON committed.

---

## Response Format When Finished

When you finish, reply with:

- the dev server URL and any port note,
- the main route to inspect first,
- key files changed,
- whether admin data is Firestore-backed or mock fallback,
- whether public application submit persisted or is waiting on Admin SDK credentials,
- whether Super Admin bootstrap is complete or still waiting on credentials,
- a concise proof checklist with PASS/FAIL items,
- parked notes for Prompt 07.

The recommended next prompt after this stage is:

**Prompt 07 - Influencer Onboarding Wizard**
