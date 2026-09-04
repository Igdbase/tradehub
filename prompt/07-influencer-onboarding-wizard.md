# Prompt 07 - Influencer Onboarding Wizard

You are building **TradeHub Stage 07**. Stages 01-06 already created the Next.js scaffold, locked design system, typed mock/domain layer, marketing application flow, Firebase Email/Password auth, role gates, Super Admin bootstrap, server-side Admin SDK boundary, public application persistence, and the Super Admin onboarding CRM.

Your job now is to turn `/workspace/onboarding` into the guided influencer activation wizard for an approved workspace.

Build on the current codebase. Do not replace the design system. Do not remove Stage 05/06 auth and Admin SDK boundaries. Do not open Firestore rules. Do not store raw secrets.

This stage should answer the product question: **"Once I approve an onboarder, how does the influencer safely set up their workspace?"**

---

## Current Setup State

The owner has already completed:

- Firebase project on Spark/free plan.
- Email/Password auth.
- Firestore database `(default)` in production mode.
- Firestore rules locked with `allow read, write: if false;`.
- Admin SDK service account file configured locally.
- `super_admin` custom claim bootstrapped for the owner app-login account.
- `/admin` now opens in Firestore live mode.
- Public application submit can persist to Firestore.

Stage 06 added:

- Admin API routes under `/api/admin/*`.
- Public application route at `/api/applications`.
- Server-only Firebase Admin SDK helpers.
- Admin repository boundary with Firestore and mock fallback.
- Admin CRM UI with source banner, application list/detail/actions, audit preview, and payment rail overview.

Known harmless current state:

- `/platform_summaries/current` may still be missing, so admin totals can show zero instead of scanning collections. Keep that quota-safe behavior.

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
- `src/app/api/admin/*`
- `src/app/api/applications/route.ts`
- `src/components/auth/*`
- `src/app/(super-admin)/admin/admin-page-client.tsx`
- `src/app/(influencer)/workspace/page.tsx`
- `src/app/(influencer)/workspace/onboarding/page.tsx`
- `src/app/(influencer)/workspace/onboarding/workspace-onboarding-page-client.tsx`
- `src/components/ui/*`
- `src/components/layout/*`

Treat `files/tradehub-03-tech.md` and `files/tradehub-06-setup.md` as the backend/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat Stage 03 mock data as fallback/development context only. New onboarding saves should use server-side API routes and Admin SDK when credentials are configured.

---

## Stage Goal

At the end of this stage:

- `/workspace/onboarding` is a real guided wizard for an authenticated influencer with `role: "influencer"` and a `workspaceId` custom claim.
- Workspace onboarding data loads and saves through server-side API routes that verify Firebase ID tokens.
- Firestore rules remain locked to clients.
- The wizard supports branding, Code of Conduct acceptance, Telegram setup instructions, pricing setup, Paystack readiness, optional Solana public-wallet readiness, and a first-course prompt.
- Step completion is persisted in a quota-safe way: one explicit save per step, not noisy autosaves.
- Super Admin can prepare or verify the minimal workspace shell needed for the influencer.
- A server-only bootstrap path exists to assign an approved influencer Auth user the `influencer` role claim and `workspaceId`.
- No raw Telegram bot token, Paystack bank details, private wallet key, seed phrase, or broker credential is stored.
- Prompt 08 can build the influencer dashboard on top of this workspace setup without rewriting onboarding.

---

## What This Stage Should NOT Do

Do **not**:

- enable Blaze/pay-as-you-go,
- enable Cloud Functions,
- add real Telegram bot polling or webhooks,
- add real Paystack API calls,
- add real Paystack webhook handling,
- add Solana Pay transaction building,
- add Solana payment verification,
- collect or store Telegram bot tokens in plaintext,
- collect or store Paystack settlement bank/account numbers,
- collect or store Solana private keys or seed phrases,
- collect broker/exchange credentials,
- create student checkout/payment flows,
- create live course publishing workflows,
- upload files to Firebase Storage,
- store large images/files/videos in Firestore,
- open Firestore client rules,
- use client Firestore reads/writes for onboarding,
- let influencers assign themselves roles,
- use query params/localStorage as role or workspace proof,
- add realtime listeners to onboarding,
- write on every keystroke.

---

## Required Architecture

Use the same secure pattern introduced in Stage 06:

```text
Browser
  -> Firebase Auth client signs user in
  -> client gets ID token
  -> client calls /api/workspace/onboarding with Authorization: Bearer <idToken>
  -> API route verifies token with Admin SDK
  -> API route confirms role === "influencer"
  -> API route confirms token.workspaceId matches the workspace being loaded/saved
  -> API route uses Admin SDK to read/write Firestore
```

Do not use the Firestore browser SDK for onboarding data.

`RoleGate` is still useful for UX, but the API route is the real security boundary.

---

## Influencer Claim Bootstrap

An influencer needs this custom claim before `/workspace/onboarding` can open:

```json
{
  "role": "influencer",
  "workspaceId": "ws_example"
}
```

Add a server-only bootstrap script so the owner can assign the claim after approving an application and creating/choosing a workspace ID.

Suggested file:

```text
scripts/bootstrap-influencer.mjs
```

Suggested npm script:

```json
{
  "scripts": {
    "firebase:bootstrap-influencer": "node scripts/bootstrap-influencer.mjs"
  }
}
```

Use environment variables:

```text
INFLUENCER_EMAIL=
INFLUENCER_WORKSPACE_ID=
```

Behavior:

- Read `INFLUENCER_EMAIL`.
- Read `INFLUENCER_WORKSPACE_ID`.
- Use `FIREBASE_SERVICE_ACCOUNT_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`.
- Find the Firebase Auth user by email.
- Set/merge custom claims:

```json
{
  "role": "influencer",
  "workspaceId": "ws_example"
}
```

- Print a safe success message.
- Never ask for or print a password.
- Never print the service account JSON.
- If the user does not exist, tell the owner to create the Email/Password user first.

Do not let a public user trigger this. This is operator-only.

Optional: add a Super Admin API action for this later, but a script is enough for this stage.

---

## Firestore Shape For This Stage

Keep the data minimal and direct-path based.

Primary workspace document:

```text
/workspaces/{workspaceId}
```

Recommended fields:

```ts
{
  workspaceId: string;
  handle: string;
  name: string;
  ownerId: string;
  ownerEmail?: string;
  ownerDisplayName: string;
  summary: string;
  marketFocus: "forex" | "crypto" | "both";
  branding: {
    logoMark: string;
    logoUrl?: string;
    primaryColor: string;
    accentColor: string;
    heroLabel: string;
    telegramBotHandle?: string;
  };
  tiers: Array<{
    tierId: string;
    name: string;
    description: string;
    priceNgn: number;
    billingPeriod: "monthly" | "annual";
    features: Array<"course" | "signalAlerts" | "autoCopy" | "journal" | "tagging" | "calculators" | "aiInsights">;
    featured?: boolean;
  }>;
  settings: {
    singleTier: boolean;
    freeTrialDays: 0 | 3 | 7 | 14;
    noCardRequired: boolean;
    refundPolicy: string;
  };
  rails: Array<{
    rail: "paystack" | "solana";
    status: "enabled" | "disabled" | "pending_verification" | "partner_only";
    label: string;
    settlementNote: string;
  }>;
  vettingStatus: "pending" | "approved" | "rejected" | "suspended";
  paystackSubaccountCode?: string;
  paystackSplitCode?: string;
  solanaPayEnabled: boolean;
  solanaPayoutWallet?: string;
  solanaPartnerPlacementEnabled: boolean;
  platformSplitPercent: number;
  codeOfConductAcceptedAt?: string;
  riskDisclosureVersion: string;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
}
```

Onboarding progress document:

```text
/workspaces/{workspaceId}/onboarding/current
```

Recommended fields:

```ts
{
  workspaceId: string;
  applicationId?: string;
  currentStep: "branding" | "code_of_conduct" | "telegram_bot" | "pricing" | "paystack" | "solana_wallet" | "first_course" | "review";
  completedSteps: string[];
  stepStatus: Record<string, "upcoming" | "current" | "complete" | "optional" | "blocked">;
  updatedAt: string;
}
```

First course draft document, optional but useful:

```text
/workspaces/{workspaceId}/courses/{courseId}
```

Only create a safe draft shell:

```ts
{
  title: string;
  description: string;
  accessTier: "all" | string;
  published: false;
  sections: Array<{ id: string; title: string; order: number }>;
  createdAt: string;
  updatedAt: string;
}
```

Do not store raw YouTube URLs in this stage.

Audit log:

```text
/audit_log/{eventId}
```

Write audit entries for important onboarding saves, especially:

- code of conduct acceptance,
- Paystack subaccount/split code update,
- Solana wallet update,
- first-course draft creation,
- activation-ready review.

---

## API Routes

Add server-side API routes. Suggested:

```text
src/app/api/workspace/onboarding/route.ts
src/app/api/workspace/onboarding/step/route.ts
src/app/api/workspace/onboarding/course-draft/route.ts
src/app/api/admin/workspaces/route.ts
src/app/api/admin/workspaces/[workspaceId]/route.ts
```

### `GET /api/workspace/onboarding`

Influencer only.

Requirements:

- Verify Firebase ID token.
- Require `role === "influencer"`.
- Require `workspaceId` claim.
- Load `/workspaces/{workspaceId}` by direct document path.
- Load `/workspaces/{workspaceId}/onboarding/current` by direct document path.
- Return a safe payload for the wizard.
- If the workspace does not exist, return a clear "workspace not prepared yet" state.
- Do not scan all workspaces.

### `PATCH /api/workspace/onboarding/step`

Influencer only.

Requirements:

- Verify Firebase ID token.
- Require `role === "influencer"`.
- Require `workspaceId` claim.
- Allow only known onboarding steps.
- Validate each step payload strictly.
- Write only the relevant fields for that step.
- Update onboarding progress.
- Write at most one workspace/onboarding write plus one audit write per explicit save.
- Return updated workspace/progress.

### `POST /api/workspace/onboarding/course-draft`

Influencer only.

Requirements:

- Verify Firebase ID token.
- Create or update one draft course shell.
- Validate title/description/sections.
- Keep `published: false`.
- Do not accept raw YouTube URLs.
- Do not upload files.

### `POST /api/admin/workspaces`

Super Admin only.

Purpose: create a minimal workspace shell from an approved/workspace-created application so the influencer can start onboarding.

Requirements:

- Verify `super_admin` claim.
- Accept `applicationId`, `workspaceId`, `handle`, and initial owner email/display name.
- Ensure the application exists and is not rejected.
- Create `/workspaces/{workspaceId}` with safe defaults.
- Create `/workspaces/{workspaceId}/onboarding/current`.
- Optionally patch the application with `workspaceId` and `workspaceCreationStatus: "created"`.
- Write audit log.
- Do not auto-create Firebase Auth users.
- Do not auto-assign influencer claims from this route unless explicitly implemented as a separate Super Admin action.

### `PATCH /api/admin/workspaces/[workspaceId]`

Super Admin only.

Purpose: owner-side correction of workspace shell fields if needed.

Keep it narrow. Do not build full platform settings here.

---

## Wizard Step Requirements

Build `/workspace/onboarding` as a real multi-step wizard.

### 1. Workspace Branding

Fields:

- workspace name,
- handle/slug,
- owner display name,
- short summary,
- market focus,
- logo mark initials,
- hero label,
- accent color chosen from approved TradeHub-safe palette.

Rules:

- Validate handle as lowercase slug.
- Do not allow arbitrary external logo upload in this stage.
- Do not introduce new brand color systems. Use locked tokens and a tiny approved accent palette only.

### 2. Code of Conduct

Use the Influencer Code of Conduct from `files/tradehub-05-policies.md`.

Requirements:

- Display the full or well-structured Code of Conduct content.
- Require an explicit checkbox.
- Store `codeOfConductAcceptedAt`.
- Store `riskDisclosureVersion`.
- Write audit event.
- Do not let the user complete the wizard without accepting.

### 3. Telegram Bot Setup

Show the BotFather instructions from `files/tradehub-06-setup.md`:

- Open Telegram.
- Message `@BotFather`.
- Create bot with `/newbot`.
- Choose bot name and username.
- Copy token.

Safe MVP behavior:

- Collect and store `telegramBotHandle` only.
- Do **not** persist the raw Telegram bot token until KMS/envelope encryption and bot infrastructure are implemented.
- If you include a token field for UX preview, keep it masked, do not send it to the server, and clearly say token verification is deferred.
- Store status such as `telegramSetupStatus: "pending_token_encryption"` if useful.

Do not install Telegraf or run a bot in this prompt.

### 4. Pricing Setup

Fields:

- single-tier vs multi-tier,
- 1 to 3 tiers,
- tier name,
- description,
- NGN price,
- monthly or annual billing,
- features: course, signal alerts, auto-copy, journal, calculators,
- free trial days: 0, 3, 7, or 14,
- no-card-required flag,
- refund policy.

Rules:

- Validate price as positive integer.
- Do not create Paystack plans.
- Do not promise auto-copy for prop-firm accounts.
- Keep the Signal Alerts vs Auto-Copy split visible in helper copy.

### 5. Paystack Readiness

Fields:

- Paystack setup status,
- Paystack subaccount code,
- Paystack split code,
- settlement readiness notes.

Rules:

- Do not collect bank account numbers inside TradeHub in this stage.
- Do not call Paystack API.
- Explain that subaccount/split creation is still done by the owner/operator in Paystack dashboard.
- Store only `paystackSubaccountCode` and `paystackSplitCode` when available.
- If codes are missing, mark Paystack as pending.

### 6. Optional Solana Wallet

Fields:

- Solana Pay interest,
- public Solana wallet address for USDC payout,
- partner placement interest.

Rules:

- Public wallet address only.
- Never ask for seed phrase.
- Never ask for private key.
- Validate as a plausible public address format.
- Mark status as `pending_verification`; do not enable Solana checkout automatically.
- Keep copy restrained: optional Solana Pay / USDC rail, not main product headline.

### 7. First Course Prompt

Fields:

- first course title,
- short description,
- 2 to 5 section titles,
- intended access tier.

Rules:

- Create draft only.
- Do not publish.
- Do not store raw YouTube URLs.
- Prompt 09 will build full Course Hub.

### 8. Review And Activation Readiness

Show:

- completed steps,
- blocked steps,
- optional steps,
- safe next steps.

Allow the influencer to submit "Ready for owner review" only when required steps are complete:

- branding,
- Code of Conduct,
- pricing,
- Paystack readiness or explicit owner-pending status,
- first course draft.

Telegram and Solana can be pending depending on workspace configuration, but the UI must make that clear.

---

## Admin Integration Requirements

Update `/admin` only as much as needed to support Stage 07 handoff.

Acceptable additions:

- Button/action to create workspace shell from an approved application.
- Display workspace ID and onboarding status on application detail.
- Clear copy telling the owner to create an influencer Auth user and run the influencer bootstrap script.
- Link to `/workspace/onboarding` only for testing after influencer claim exists.

Do not overbuild Prompt 08 dashboard features here.

---

## Auth And Role Requirements

`/workspace/onboarding` must require:

- signed-in user,
- `role === "influencer"`,
- `workspaceId` claim present.

Expected behavior:

- Signed out: redirect/show login required.
- Super Admin: wrong-role state, not influencer wizard.
- Student: wrong-role state.
- Influencer without workspaceId: access pending.
- Influencer with workspaceId but missing workspace doc: "workspace not prepared yet."
- Influencer with workspace doc: wizard loads.

Add a refresh-claims action if needed.

---

## Quota And Cost Guardrails

Preserve the Firestore Spark/free-tier strategy.

Requirements:

- Use direct document paths for workspace and onboarding progress.
- Do not scan all workspaces.
- Do not scan all applications from the influencer route.
- No realtime listeners.
- No autosave on every keystroke.
- Save one step at a time.
- Limit audit preview/list calls if any.
- Do not store large blobs in Firestore.

---

## Security Requirements

Required:

- Verify influencer role at the API layer with Admin SDK.
- Verify `workspaceId` claim before reading/writing workspace data.
- Never import `firebase-admin` into client components.
- Never expose service account credentials.
- Never let users set their own role.
- Never trust workspaceId from query params when writing data.
- Never store raw Telegram bot token without encryption.
- Never store Paystack bank/account numbers.
- Never store wallet private keys or seed phrases.
- Never store broker credentials.
- Never use `dangerouslySetInnerHTML` for policy or user content.
- Sanitize and validate all strings.
- Clamp arrays and text lengths.
- Write audit log entries for sensitive onboarding saves.

Security checks before closing:

```bash
rg -n "allow read, write: if true|dangerouslySetInnerHTML|localStorage.*role|private_key|seed phrase|bot token" src firestore.rules
```

Expected:

- no permissive Firestore rule,
- no unsafe HTML rendering,
- no role shortcuts,
- no raw secret storage.

Also verify:

- `firebase-admin` only appears in server/API/script modules.
- `firestore.rules` remains locked or narrowly scoped.
- No Telegram/Paystack/Solana secret keys were added.

---

## Suggested Implementation Shape

You may adjust if the current codebase suggests a better structure, but keep the boundaries clean:

```text
src/
  app/
    api/
      workspace/
        onboarding/
          route.ts
          step/
            route.ts
          course-draft/
            route.ts
      admin/
        workspaces/
          route.ts
          [workspaceId]/
            route.ts
    (influencer)/
      workspace/
        onboarding/
          page.tsx
          workspace-onboarding-page-client.tsx
  components/
    onboarding/
      onboarding-shell.tsx
      onboarding-progress.tsx
      branding-step.tsx
      code-of-conduct-step.tsx
      telegram-step.tsx
      pricing-step.tsx
      paystack-step.tsx
      solana-wallet-step.tsx
      first-course-step.tsx
      review-step.tsx
  lib/
    workspace/
      onboarding-api-client.ts
      onboarding-validation.ts
      onboarding-mappers.ts
      workspace-admin-repository.ts
    firebase/
      influencer-auth.ts
  types/
    onboarding.ts
scripts/
  bootstrap-influencer.mjs
```

Keep only interactive wizard components as client components.

Server API routes should verify ID tokens again. Do not trust the browser.

---

## README Updates

Update `README.md` with:

- how Super Admin creates/prepares a workspace shell,
- how to create an influencer Firebase Auth user,
- how to set `INFLUENCER_EMAIL` and `INFLUENCER_WORKSPACE_ID`,
- how to run `npm run firebase:bootstrap-influencer`,
- how the influencer signs in and opens `/workspace/onboarding`,
- why Telegram tokens are not stored yet,
- why Paystack bank details are not collected in-app,
- why Solana wallet is public-address-only and pending verification.

---

## Verification Requirements

Before closing Stage 07, run:

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

- Signed-out `GET /api/workspace/onboarding` returns `401`.
- Super Admin token on `GET /api/workspace/onboarding` returns `403`.
- Influencer token without workspaceId returns access pending/`403`.
- Influencer token with workspaceId loads only that workspace.
- Influencer cannot pass another workspaceId and write to it.
- Step save validates invalid payloads with `400`.
- Valid step save updates the workspace/onboarding document and audit log.
- Course draft save creates `published: false`.

Manual UI checks:

- Super Admin can prepare a workspace shell from an approved application or the script path is clearly documented.
- Influencer can sign in and see the onboarding wizard.
- Branding step saves.
- Code of Conduct cannot complete without checkbox.
- Telegram step does not persist raw token.
- Pricing step validates prices and tiers.
- Paystack step stores only subaccount/split codes, not bank details.
- Solana step rejects private-key/seed-phrase style input and stores only public wallet address as pending verification.
- First-course prompt creates draft only.
- Review step shows completion/blocked state.
- Dark/light theme works.
- Mobile layout works.

Security checks:

```bash
rg -n "allow read, write: if true|dangerouslySetInnerHTML|localStorage.*role|firebase-admin|seed phrase|private key|telegramBotToken" src firestore.rules scripts
```

Expected:

- no permissive rule,
- no unsafe HTML rendering,
- no client role shortcut,
- `firebase-admin` only in server/API/script files,
- no raw Telegram token persistence,
- no private key or seed phrase handling.

---

## Response Format When Finished

When you finish, reply with:

- the dev server URL and any port note,
- the main route to inspect first,
- key files changed,
- how the owner prepares an influencer workspace,
- whether influencer claim bootstrap ran or is waiting on an influencer test account,
- whether onboarding data is Firestore-backed or fallback,
- a concise proof checklist with PASS/FAIL items,
- parked notes for Prompt 08.

The recommended next prompt after this stage is:

**Prompt 08 - Influencer Dashboard and Management**
