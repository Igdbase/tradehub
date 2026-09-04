# Prompt 05 - Firebase Auth Foundation and Role Routing

You are building **TradeHub Stage 05**. Stages 01-04 already created the Next.js scaffold, locked design system, typed mock/domain layer, and influencer-facing marketing/application flow.

Your job now is to connect the app to Firebase safely and build the authentication, role-routing, protected-route, emulator, and owner-bootstrap foundation.

Build on the current codebase. Do not replace the design system. Do not rewrite the marketing page. Do not loosen production Firestore rules just to make development easier.

This stage should make the app feel like a real platform with a real login foundation, while still being careful, quota-conscious, and not pretending unfinished backend modules are production-ready.

---

## Current Firebase Setup

The Firebase console has already been created by the owner.

Known setup state:

- Firebase project exists on Spark/free plan.
- Web app config exists and was temporarily saved in `firbaseconfig.js`.
- Project ID is `trade-hub-4d8df`.
- Email/Password authentication is enabled.
- First Firebase Auth user has been manually created.
- Firestore database `(default)` exists.
- Firestore was created in production mode.
- Current Firestore rules are locked with `allow read, write: if false;`.

Important:

- Do not ask for the user's password.
- Do not require Blaze/pay-as-you-go.
- Do not enable Cloud Functions.
- Do not enable SMS/MFA in this prompt.
- Do not enable Google OAuth in this prompt.
- Do not enable Gemini, Analytics, or other extra Firebase services.
- Treat `firbaseconfig.js` as a temporary reference only. Do not import it directly into app code.

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
- `prompt/promptsumary.md`
- `.env.example`
- `firbaseconfig.js`
- `package.json`
- `src/config/env.ts`
- `src/lib/routes.ts`
- `src/types/*`
- `src/data/*`
- `src/lib/mock-selectors.ts`
- `src/app/(public)/page.tsx`
- `src/app/(public)/join/[handle]/page.tsx`
- `src/app/(super-admin)/admin/page.tsx`
- `src/app/(influencer)/workspace/page.tsx`
- `src/app/(influencer)/workspace/onboarding/page.tsx`
- `src/app/(student)/app/page.tsx`
- `src/components/ui/*`
- `src/components/layout/*`
- `src/components/marketing/*`

Treat `files/tradehub-03-tech.md` and `files/tradehub-06-setup.md` as the backend/security source of truth.

Treat `files/tradehub-04-design.md`, `asset/tradehub-colors.html`, and `src/styles/tokens.css` as locked visual law.

Treat the Stage 03 mock layer as the current product data source. Do not replace every dashboard with Firestore reads in this prompt.

---

## Stage Goal

At the end of this stage:

- Firebase client SDK is installed and initialized from environment variables.
- Firebase Auth Email/Password login is working.
- Auth state is available through a clean provider/hook.
- `/login` exists and matches the TradeHub design system.
- `/admin`, `/workspace`, `/workspace/onboarding`, and `/app` are role-gated at the UI/routing layer.
- Users without a role claim see a safe "role pending" or "access pending" state.
- A server-only bootstrap script exists to set the first owner account as `super_admin`.
- Firebase emulator config exists so development can happen without touching live Firestore quota.
- Firestore rules are represented in the repo and remain locked or tightly scoped.
- The app still builds and all existing public routes still work.

This stage is the bridge from frontend demo to real backend foundation.

---

## What This Stage Should NOT Do

Do **not**:

- add real payment integrations,
- add Paystack SDKs,
- add Solana SDKs,
- add Cloud Functions,
- require Firebase Blaze plan,
- create broad Firestore reads,
- add realtime Firestore listeners,
- open Firestore with `allow read, write: if true`,
- switch Firestore to test mode,
- store service account JSON in client code,
- expose `FIREBASE_SERVICE_ACCOUNT_KEY` to the browser,
- store Firebase config directly inside React components,
- import `firbaseconfig.js` into the app,
- create fake admin backdoors,
- create localStorage role overrides that could be mistaken for security,
- collect or store passwords anywhere,
- create real workspace/student/payment documents from the browser,
- change the locked TradeHub colors,
- break Stage 04 marketing/application flow.

Route guards are UX only. Firestore Security Rules and server-side Admin SDK paths are the real security boundaries.

---

## Required Dependencies

Install only what is needed for this stage:

```bash
npm install firebase firebase-admin
```

If you add emulator rules tests, use a lightweight dev dependency only if needed:

```bash
npm install -D @firebase/rules-unit-testing
```

Do not install Paystack, Solana, Telegraf, Cloud Functions, or Storage SDK packages in this prompt.

---

## Environment Setup Requirements

Move Firebase web config out of `firbaseconfig.js` and into environment variables.

Do not paste actual config values into committed source files.

Update `.env.example` if needed with:

```text
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

SUPER_ADMIN_EMAIL=
FIREBASE_SERVICE_ACCOUNT_KEY=
```

Create or update `.env.local` for local development using the values from `firbaseconfig.js`.

Rules:

- `.env.local` must be gitignored.
- `NEXT_PUBLIC_FIREBASE_*` values may be used by client code.
- `FIREBASE_SERVICE_ACCOUNT_KEY` is server-only and must never be imported by client files.
- `SUPER_ADMIN_EMAIL` is used only by the bootstrap script.
- Do not commit real `FIREBASE_SERVICE_ACCOUNT_KEY`.
- If the service account key is missing, the bootstrap script should fail with a clear message and not partially write anything.

After env migration, `firbaseconfig.js` should either remain unused with a note, or be removed only if the config has safely been copied into `.env.local`. Do not delete it before preserving the values.

---

## Firebase Client Foundation

Create a clean Firebase client layer, for example:

```text
src/lib/firebase/client.ts
src/lib/firebase/auth.ts
src/lib/firebase/errors.ts
```

Requirements:

- Initialize Firebase app once.
- Read config only from `NEXT_PUBLIC_FIREBASE_*`.
- Export `auth`.
- Do not initialize Firestore globally unless needed.
- If Firestore is initialized, do not attach realtime listeners in this stage.
- Provide friendly error mapping for common auth errors:
  - invalid email,
  - wrong password,
  - user not found,
  - too many attempts,
  - network failure.

If environment variables are missing:

- In development, show a clear developer-facing configuration error.
- In production build, avoid crashing static public pages that do not need Firebase.

---

## Auth Provider And Hooks

Create an auth provider that can be used by protected surfaces.

Suggested structure:

```text
src/components/auth/auth-provider.tsx
src/components/auth/auth-guard.tsx
src/components/auth/role-gate.tsx
src/lib/auth/use-auth-user.ts
src/types/auth.ts
```

The auth state should expose:

```ts
type TradeHubRole = "super_admin" | "influencer" | "student";

type AuthSession = {
  status: "loading" | "signed_out" | "signed_in";
  uid: string | null;
  email: string | null;
  role: TradeHubRole | null;
  workspaceId: string | null;
  claimsLoaded: boolean;
};
```

Claims should come from the Firebase ID token:

- `role`
- `workspaceId`

Do not read role from Firestore for basic route gating. The PRD intentionally uses custom claims to save reads and keep route/rule checks cheap.

Add a way to refresh claims after bootstrap, such as signing out/in or calling `getIdTokenResult(user, true)`.



## Login Page

Add a public login route:

```text
src/app/(public)/login/page.tsx
```

If a different route-group structure fits the current app better, use it, but keep the route at `/login`.

Login requirements:

- Email field.
- Password field.
- Submit button.
- Loading state.
- Friendly error messages.
- Return-to/next URL support with a safe whitelist.
- Link back to `/`.
- Match Stage 02/04 TradeHub design.
- Work in dark and light themes.
- No generic Firebase UI package.
- No Google login button in this prompt.
- No password reset flow unless simple and safe.

After sign-in:

- If role is `super_admin`, route to `/admin`.
- If role is `influencer`, route to `/workspace`.
- If role is `student`, route to `/app` or the requested safe next path.
- If role is missing, route to an access-pending state.

Add a sign-out action to the shared header or protected page shell.



## Role-Gated Surfaces

Gate these routes:

- `/admin` requires `super_admin`.
- `/workspace` requires `influencer`.
- `/workspace/onboarding` requires `influencer`.
- `/app` requires `student`.

When signed out:

- Show a polished auth-required state or redirect to `/login?next=...`.

When signed in with the wrong role:

- Show a clear "wrong workspace or role" state.
- Do not show sensitive mock admin/student data behind the wrong role.

When signed in but role claims are missing:

- Show an "access pending" state.
- Explain that the account exists but has not yet been assigned a TradeHub role.
- Include a button to refresh session/claims.

Important:

- Do not create fake role dropdowns.
- Do not let users choose their own role.
- Do not use query params to grant roles.
- Do not use localStorage to grant roles.

The pages can still use Stage 03 mock data after a valid role gate passes. Prompt 06 and later prompts will replace specific surfaces with real Firestore reads carefully.

---

## First Owner Bootstrap

Create a server-only bootstrap script to set the first Firebase Auth user as Super Admin.

Suggested file:

```text
scripts/bootstrap-super-admin.mjs
```

Suggested npm script:

```json
{
  "scripts": {
    "firebase:bootstrap-super-admin": "node scripts/bootstrap-super-admin.mjs"
  }
}
```

Behavior:

1. Read `SUPER_ADMIN_EMAIL`.
2. Read `FIREBASE_SERVICE_ACCOUNT_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`.
3. Initialize Firebase Admin SDK.
4. Find the Firebase Auth user by email.
5. Set custom claims:

```json
{
  "role": "super_admin"
}
```

6. Print a safe success message that does not include secrets.

Failure behavior:

- If `SUPER_ADMIN_EMAIL` is missing, print a clear instruction.
- If service account credentials are missing, print a clear instruction.
- If user is not found, tell the owner to create the Firebase Auth user first.
- Never print the service account JSON.
- Never ask for or print a password.

Do not require this script to run successfully during normal `npm run build`.

---

## Emulator-First Development

Add Firebase emulator configuration so local backend testing does not touch live quota.

Suggested files:

```text
firebase.json
.firebaserc
firestore.rules
firestore.indexes.json
```

Suggested npm scripts:

```json
{
  "scripts": {
    "firebase:emulators": "firebase emulators:start --only auth,firestore",
    "firebase:rules:test": "echo \"Add Firestore rules tests in Prompt 06\""
  }
}
```

If you add a real rules test now, verify at least:

- unauthenticated reads are denied,
- unauthenticated writes are denied,
- public users cannot list `workspace_applications`,
- client cannot read `platform_summaries/current`,
- client cannot read `broker_keys`.

Do not connect normal local development to production Firestore by default.

Add a clear README section explaining:

- how to fill `.env.local`,
- how to start the Next.js app,
- how to start Firebase emulators,
- how to bootstrap the first Super Admin,
- how to refresh claims after bootstrap.

---

## Firestore Rules For This Stage

Keep production rules safe.

Minimum acceptable `firestore.rules` for Stage 05:

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

If you add a more complete rules file from `files/tradehub-03-tech.md`, it must still:

- deny all server-only collections to clients,
- use custom claims for role/workspace checks,
- keep public applications create-only or fully server-only,
- prevent client writes to payment status,
- prevent client access to broker keys,
- prevent client access to platform summaries,
- avoid broad unauthenticated reads.

For this prompt, it is acceptable and preferred to keep production Firestore fully locked until real Firestore write paths are deliberately introduced.

Do not deploy rules unless the user explicitly asks you to deploy them.

---

## Workspace And Invite Routing Foundation

Preserve `/join/[handle]` as the student invite route.

Add helper logic for future workspace resolution:

```text
src/lib/workspace-resolution.ts
```

It should support:

- extracting workspace handle from `/join/[handle]`,
- future subdomain parsing,
- localhost-safe behavior,
- no network reads in this stage.

Example behavior:

- `localhost:3000/join/apexfx` resolves `apexfx`.
- `apexfx.tradehub.com` should resolve `apexfx` in the future.
- `tradehub.com` or `localhost:3000` has no workspace handle.

Do not implement real wildcard-domain production routing yet. Just create a clean foundation that later prompts can use.

---

## Quota And Cost Guardrails

This prompt must respect the Firestore quota strategy added to the PRD.

Implement these rules in code and docs:

- No unbounded Firestore list queries.
- No dashboard collection scans.
- No realtime Firestore listeners.
- No progress writes.
- No application writes to production Firestore yet unless done through a clearly defined create-only/server-safe path.
- No file/video/blob storage in Firestore.
- Use custom claims for role/workspace route checks.
- Use emulator-first docs and config.
- Keep Stage 03 mock data for dashboard/page content until later prompts intentionally replace each surface.

If you add repository helpers for future Firestore reads, they must require explicit `limit()` values and should default to 25 records.

---

## Security Requirements

Security is more important than convenience in this stage.

Required:

- Keep client and server Firebase code separated.
- Keep Admin SDK in server-only script files.
- Never import `firebase-admin` into client components.
- Never expose `FIREBASE_SERVICE_ACCOUNT_KEY`.
- Never log tokens, passwords, or service account JSON.
- Never trust role from query params, localStorage, cookies set by the browser, or form input.
- Never allow users to assign themselves a role.
- Never use `dangerouslySetInnerHTML` for user-controlled text.
- Keep Firestore rules locked or narrowly scoped.
- Keep protected route copy clear that route gating is not the only security layer.

Also check:

- no Paystack secret keys,
- no Solana private keys or seed phrases,
- no Telegram bot tokens,
- no raw YouTube lesson URLs,
- no real broker credentials.

---

## Suggested Implementation Shape

You may adjust if the current app suggests a better structure, but keep the separation clean:

```text
src/
  app/
    (public)/
      login/
        page.tsx
    (super-admin)/
      admin/
        page.tsx
    (influencer)/
      workspace/
        page.tsx
        onboarding/
          page.tsx
    (student)/
      app/
        page.tsx
  components/
    auth/
      auth-provider.tsx
      auth-guard.tsx
      login-form.tsx
      role-gate.tsx
      access-pending.tsx
  lib/
    firebase/
      client.ts
      auth.ts
      errors.ts
    workspace-resolution.ts
  types/
    auth.ts
scripts/
  bootstrap-super-admin.mjs
firebase.json
.firebaserc
firestore.rules
firestore.indexes.json
```

Keep only components that need Firebase Auth state as client components.

Keep the marketing page mostly server-rendered.

---

## UX Requirements

The auth experience should feel like TradeHub, not a default Firebase sample.

Required:

- premium glass/metal login surface,
- clear copy for different account types,
- risk-aware footer copy,
- dark/light theme compatibility,
- keyboard accessible form controls,
- visible focus states,
- mobile-safe layout,
- no layout shift while auth is loading,
- clear loading/signed-out/signed-in states,
- sign-out visible on protected surfaces.

Access pending copy should say the account exists but still needs workspace/role activation. Do not tell users to edit Firebase or choose their own role.

---

## Verification Requirements

Before closing Stage 05, run:

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

Expected:

- public routes still return `200`,
- `/login` loads and matches the design system,
- invalid login shows a friendly error,
- protected routes do not show protected content to signed-out users,
- signed-in users without role claims see access pending,
- role gates are enforced for `super_admin`, `influencer`, and `student`,
- sign-out works,
- theme toggle still works,
- no TypeScript errors,
- no ESLint warnings or errors,
- production build completes.

If credentials are available, also verify:

```bash
npm run firebase:bootstrap-super-admin
```

Expected bootstrap behavior:

- sets `{ role: "super_admin" }` on the configured Firebase Auth user,
- does not print secrets,
- asks user to sign out/in or refresh claims after success.

If emulators are configured, verify:

```bash
npm run firebase:emulators
```

and document the local emulator ports.

Security checks:

- `firbaseconfig.js` is not imported by source code,
- `.env.local` is not committed,
- no service account JSON appears in client source,
- no `allow read, write: if true` exists in `firestore.rules`,
- no public route grants roles from query params/localStorage,
- no Firestore collection scans were added,
- no realtime Firestore listeners were added.

---

## Response Format When Finished

When you finish, reply with:

- the dev server URL and any port note,
- the main route to inspect first,
- key files changed,
- exactly what Firebase pieces are connected,
- whether the Super Admin bootstrap ran or is waiting on credentials,
- a concise proof checklist with PASS/FAIL items,
- any parked notes for Prompt 06.

The recommended next prompt after this stage is:

**Prompt 06 - Super Admin Dashboard and Onboarding CRM**
