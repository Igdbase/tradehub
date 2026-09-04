# TradeHub Manual Test Backlog

Reference: TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF

Last confirmed implementation checkpoint: Stage 29G, Crypto Journal Sync, implemented/source-QA ready with external Binance/Bybit provider acceptance and owner acceptance pending.

Operating mode: Idris is in school and does not have time for full manual QA. Codex will create builder prompts, inspect builder responses, and keep manual tests here as deferred checks. Do not block the roadmap on every manual test unless the builder changes risky business logic, security boundaries, payments, credentials, or execution paths.

## Source Of Truth

- Primary roadmap: `plan.md`
- Current completed QA scripts: package scripts through `stage29g:qa`
- Current product area: Stage 29G Crypto Journal Sync is implemented/source-QA ready for adviser review. Stage 29F Journal redesign and connected-account/Backtesting data separation remains owner-accepted, closed, and frozen on top of deterministic local/emulator demo data and Playwright student browser E2E. Practice remains owner-accepted and frozen; broad live execution remains disabled by default.
- Demo QA pack: `manual-demo-qa.md`
- Stage 29D is owner-accepted, closed, and frozen. Stage 29E remains the completed Shared App Full-Preview Layout Stabilization stage. Stage 29F is owner-accepted, closed, and frozen. Stage 29G Crypto Journal Sync is implemented/source-QA ready with external provider acceptance pending; Stage 29H remains unstarted.

Selected launch-expansion track status:

1. Real Forex/CFD historical data provider - completed/frozen at Stage 22B.
2. External messaging/reminders outside the app - completed/frozen at Stage 23D.
3. External master-trader / Telegram-style signal ingestion - completed/frozen at Stage 24C.
4. Controlled broad live AutoCopy execution - Stage 25A readiness audit, Stage 25B cohort gate, Stage 25C crypto cohort dry-run rollout, Stage 25D incident/reconciliation hardening, and Stage 25E final acceptance freeze completed.

Remaining prompt estimate:

- Recommended path: Stages 27A/27B/27C/27D/27E/27I/27J are source-QA complete. Complete browser/manual sales-demo QA before sales.

Removed from remaining plan:

- Uploads, file hosting, paid video hosting, and stored media workflows.
- Refunds, payouts, withdrawals, wallet-transfer automation, or money-movement automation beyond existing payment verification/support visibility.
- AI grading, AI trade analysis, AI coaching, AI search, or AI-generated recommendations.

## Reference Boundaries

Every practice/backtesting stage must stay practice-only unless a later approved prompt explicitly says otherwise.

- No AutoCopy execution coupling.
- No live broker/exchange execution.
- No private Binance/Bybit APIs.
- No MetaAPI student credentials for practice.
- No vault refs, raw provider payloads, account IDs, broker passwords, or secrets exposed to the browser.
- No paid PDF, screenshot, news, WhatsApp, SMS, email, storage, or market-data services.
- Historical/replay data must stay server-owned and forward-bias-safe.
- Firestore browser rules must remain deny-by-default for protected practice storage paths.

Course/lesson stages must preserve these boundaries unless a later approved prompt explicitly says otherwise.

- Student course reads must stay behind signed-in student API routes and existing entitlement/subscription/course access checks.
- Workspace course management must stay behind influencer workspace API routes and workspace-scoped Admin SDK reads/writes.
- Student lesson progress must remain student-owned and protected.
- Course notes must remain bounded/plain text in the current foundation.
- Attachments remain HTTPS URL metadata only; no uploads or paid storage.
- Do not add paid video hosting, file uploads, email/SMS/WhatsApp, AI grading, new payment flows, practice changes, AutoCopy changes, provider credentials, exchange/broker calls, vault behavior, or live execution behavior.

Workspace ops, CRM, payment, and support stages must preserve these boundaries unless a later approved prompt explicitly says otherwise.

- Workspace student CRM must stay workspace-scoped and show safe operational summaries only.
- Payment/support surfaces must mask browser-visible operational refs and must not show raw webhook payloads, authorization data, credentials, or full transaction IDs.
- Admin support summaries must stay aggregate-only unless a later explicit support-detail model is approved.
- Do not add refunds, payouts, withdrawals, wallet transfers, new payment providers, email/SMS/WhatsApp/push, uploads, PDFs, screenshots, paid services, provider credential flows, AutoCopy permission expansion, or live execution behavior.

Manual trading journal stages must preserve these boundaries unless a later approved prompt explicitly says otherwise.

- Manual trades must remain student-owned and private-first.
- Workspace users must not see raw manual trade rows, private notes, strategy details, lesson-learned text, or raw journal internals.
- Manual journal CRUD must stay separate from AutoCopy, practice/backtesting, account-linked ledgers, provider credentials, and execution systems.
- Do not import external broker/exchange trades, call MetaAPI/Binance/Bybit/Paystack/Solana/provider APIs, add AI grading/analysis, uploads, PDFs, screenshots, messaging, email/SMS/WhatsApp, paid services, or live execution behavior.
- Firestore browser rules must remain deny-by-default for protected manual journal trade paths.

## Local Test Setup

Terminal 1:

```bash
cd /Users/idrissuleiman/Developer/tradehub
./node_modules/.bin/firebase emulators:start --project trade-hub-4d8df --only auth,firestore
```

Terminal 2:

```bash
cd /Users/idrissuleiman/Developer/tradehub
npm run stage15f:seed
npm run stage15f:seed-auth
npm run clean:next
npm run dev:stage15f
```

Student login:

```text
student_stage15f_binance_sandbox@example.test
Stage15F!Pass123
```

Seeded login notes:

- Student: use the seeded credentials above.
- Influencer/workspace and Super Admin/operator accounts should come from the existing local seed/bootstrap output when configured; do not store live credentials or production secrets in this backlog.

Main route:

```text
/app/practice
```

Demo pack:

```text
manual-demo-qa.md
```

Stage 28A demo seed:

```bash
npm run seed:demo
```

Stage 28B browser QA:

```bash
npm run browser:qa
```

Stage 28C student browser QA:

```bash
npm run browser:qa:student
```

Stage 28D workspace/admin browser QA:

```bash
npm run browser:qa:workspace-admin
```

Stage 28E browser QA polish:

```bash
npm run stage28e:qa
```

Stage 28F final demo readiness freeze:

```bash
npm run stage28f:qa
```

Seeded demo users:

```text
Super Admin: demo.superadmin@example.test / TradeHubDemo!123
Launch influencer: demo.launch.influencer@example.test / TradeHubDemo!123
Pro influencer: demo.pro.influencer@example.test / TradeHubDemo!123
Enterprise influencer: demo.enterprise.influencer@example.test / TradeHubDemo!123
Active student: demo.student.active@example.test / TradeHubDemo!123
Pending student: demo.student.pending@example.test / TradeHubDemo!123
Payment issue student: demo.student.payment@example.test / TradeHubDemo!123
```

## Must Test Before Demo

Status: required before any live demo, but not blocking this source-level freeze pass.

Stage 26A demo pack status: `manual-demo-qa.md` now contains the exact local run commands, seeded credentials, route list, click-through script, and known deferred QA.
Stage 27A package/licence status: Launch has a 50 active-student cap, Pro has a 500 active-student cap, Enterprise is custom-reviewed, successful student activation is cap-checked server-side, public prices stay out of app UI, and Trade Copier remains a separate optional add-on.
Stage 27B package/licence ops status: support windows, maintenance renewal state, support status, bounded Super Admin notes, and masked licence ops are source-QA implemented without payment automation or public prices.
Stage 27C branding/domain status: TradeHub-branded, co-branded, and white-label-ready modes plus custom-domain readiness metadata are source-QA implemented without uploads, DNS/SSL automation, hosting-provider calls, public prices, or live execution changes.
Stage 27D Enterprise deployment/SLA status: contract-scoped deployment, SLA, backup/restore, data-residency, and rollback readiness metadata are source-QA implemented without infrastructure provisioning, cloud/hosting-provider calls, payment automation, public prices, or live execution changes.
Stage 27E Enterprise integration request status: Enterprise custom integration request/intake, workspace-safe request status, Super Admin masked-ref queue, and bounded notes are source-QA implemented without adapters, provider calls, credential collection, public prices, Trade Copier bundling, or live execution changes.
Stage 27I package sales readiness status: Launch, Pro, and Enterprise package-selling surfaces are source-smoked across seat caps, private quote/no-price UI, Trade Copier add-on separation, metadata-only package/licence/branding/domain/Enterprise/integration posture, deny-by-default Firestore paths, and frozen foundation references.
Stage 27J package sales final status: Package Sales MVP is source-QA frozen across package seat caps, no-price app/deck posture, Trade Copier add-on separation, metadata-only licence/support/maintenance/branding/domain/Enterprise/integration surfaces, Enterprise-only intake, Firestore denies, and frozen MVP references.
Stage 28A demo seed status: deterministic local Firebase emulator seed pack exists for Launch, Pro, Enterprise, Super Admin, influencer, student, CRM, package/licence, branding/domain, Enterprise SLA/deployment, Enterprise integration, course, practice, manual journal, assignment/cohort/feedback, and notification demo data. Seed is idempotent and uses safe local metadata only.
Stage 28B browser QA status: Playwright browser smoke infrastructure exists for `/`, `/app`, `/app/practice`, `/app/courses`, `/app/journal`, `/workspace`, and `/admin`, with seeded-user sign-in helpers and guards for runtime errors, Next.js overlays, public package prices, raw demo IDs, and secret-shaped rendered strings. Browser QA remains an explicit command and is not part of `npm run build`.
Stage 28C student browser QA status: Student-focused Playwright E2E tests now cover `/app`, `/app/practice`, the seeded Practice terminal/report, `/app/courses`, the seeded course reader/proof, Stage 29F `/app/journal` My Trades/Backtesting separation, and student-blocked `/workspace` and `/admin` access. Removed Reminder Preferences and manual-Journal controls are asserted absent. The tests reuse shared no-error/no-secret/no-price guards.
Stage 28D workspace/admin browser QA status: Workspace/Super Admin-focused Playwright E2E tests exist for `/workspace` and `/admin`, including workspace package/licence, CRM, practice, assignments, courses, branding/domain, Enterprise readiness/integration posture, Super Admin package/licence, payment/support, messaging, external signal, and live AutoCopy readiness panels. The tests reuse shared no-error/no-secret/no-price guards and verify workspace cannot access `/admin` plus Super Admin wrong-role behavior for `/app/journal`.
Stage 28E browser QA polish status: Browser helpers now centralize forbidden rendered-text checks, include tolerant safe role-boundary assertions, and provide clearer seeded-auth failure messages. Runbooks include exact command order, `npx playwright install chromium`, reuse-server mode, auth failure triage, and `test-results` / `playwright-report` artifact locations.
Stage 28F final demo readiness status: Internal build/demo readiness is source-QA frozen. The final acceptance guard verifies deterministic demo seed coverage, Playwright config, browser QA commands, smoke/student/workspace-admin suites, shared helpers, no-error/no-secret/no-public-price guards, wrong-role boundaries, exact local run sequence, failure triage/report locations, and frozen MVP references. Do not claim browser QA passed unless it actually ran.
Course/lesson MVP status: source-QA frozen at Stage 19I. Browser QA remains deferred.
Ops/CRM/payments/support MVP status: source-QA frozen at Stage 20D. Browser QA remains deferred.
Historical Manual Journal compatibility status: Stage 21A CRUD, Stage 21B review chart, Stage 21C analytics/import/export, and Stage 21D acceptance records and protected compatibility APIs remain preserved. They are not the current `/app/journal` product or demo flow.

Frozen ops/support reference: TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF.

- Run the local Firebase emulators and `npm run dev:stage15f`.
- Run `npm run seed:demo`.
- Run `npm run browser:qa:student` and review any student browser failure screenshots/traces.
- Run `npm run browser:qa:workspace-admin` and review any workspace/admin browser failure screenshots/traces.
- Run `npm run browser:qa` and review any full smoke failure screenshots/traces.
- If seeded sign-in fails, confirm emulators are running, rerun `npm run seed:demo`, restart `npm run dev:stage15f`, and inspect `test-results` plus `playwright-report`.
- Re-run `npm run seed:demo` once and confirm the demo data remains deterministic without uncontrolled duplicates.
- Sign in as the seeded student.
- Open `/app/practice`.
- Create/open a BTCUSDT terminal session.
- Create or select a practice playbook.
- Reveal candles in the terminal.
- Confirm event markers hover/click after pan/zoom.
- Submit and close a simulated order.
- Finish the session and add a reflection.
- Open report and browser print dialog.
- Open `/app/journal` and confirm `My Trades` is the default tab.
- Confirm Journal Sync shows only dedicated read-only Journal connections; Copier setup alone must not change that state.
- Confirm connected-account history shows only provider-confirmed records and distinguishes open, partial, and authoritatively closed trades.
- Confirm a provider-filled entry without confirmed closure remains open and does not affect realized P&L, win rate, equity, drawdown, or calendars.
- Exercise account, market, symbol, status, source, and date filters and confirm scanned/matched/visible/truncated reporting is clear.
- Switch to `Backtesting` and confirm simulated Practice analytics and session links appear without mixing with My Trades.
- Confirm `/app/journal` shows no manual CRUD, CSV import/export, archive/delete, manual review, or AI Insight controls and makes no manual-trades API request.
- Confirm another student/workspace cannot access raw connected Journal history or private diagnostics.
- Open `/workspace` and confirm aggregate-only insights/assignments/notifications.
- Confirm no hidden candles, raw provider payloads, credentials, vault refs, raw student/session IDs in workspace surfaces, or AutoCopy internals appear.

### Stage 28F Final Demo Readiness Freeze

Status: source-level final demo readiness is frozen. Real browser execution remains manual/local and must not be claimed as passed unless the Playwright commands actually run.

#### Must Run Before Any Sales Demo

- Start Firebase emulators with `npm run firebase:emulators`.
- Run `npm run seed:demo`.
- Run `npm run clean:next`.
- Start the app with `npm run dev:stage15f`.
- Install Chromium with `npx playwright install chromium` if needed.
- Run `npm run browser:qa:student`.
- Run `npm run browser:qa:workspace-admin`.
- Run `npm run browser:qa`.
- Confirm `/app`, `/app/practice`, `/app/courses`, `/app/journal`, `/workspace`, and `/admin` load with no runtime error, no Next.js overlay, no public package prices, and no secret-like rendered text.

#### If Browser QA Fails

- Do not mark browser QA as passed.
- Confirm emulators are running and rerun `npm run seed:demo`.
- Restart `npm run dev:stage15f`.
- Inspect `test-results` and `playwright-report`.
- Record the failing route, seeded persona, screenshot/trace location, and exact visible error.
- Fix failures in a follow-up browser/demo bug-fix stage.

#### Known External Setup Still Required

- Firebase Auth and Firestore emulators are required.
- The seeded demo data command must be rerun after emulator resets.
- Playwright Chromium must be installed locally.
- Browser QA is intentionally separate from `npm run build`.
- No production provider, payment, messaging, broker, DNS, hosting, or live execution setup is required for the local demo pack.

#### Later Regression

- Add mobile browser QA variants for the student terminal, course reader, journal review, workspace dashboard, and admin panels.
- Add browser assertions for chart interactions once stable chart selectors exist.
- Add malformed CSV/import browser checks.
- Add deeper two-student and two-workspace leakage browser tests.

### Stage 28C Student End-to-End Browser QA

Status: source-level browser test suite added; real browser execution is deferred until emulators/dev server are running.

Must test before demo:

- Run `npm run browser:qa:student` after starting emulators, seeding demo data, and starting the dev server.
- Confirm `/app` loads for `demo.student.active@example.test` and shows the current student navigation, course progress, Journal entry point, and copier safety without Reminder Preferences.
- Confirm `/app/practice` shows the seeded `BTCUSDT Demo Replay` session and practice-only copy.
- Confirm `/app/practice/practice_demo_closed_session/terminal` loads the terminal shell, chart area, simulated order ticket, indicators, Go To, and report links.
- Confirm `/app/practice/practice_demo_closed_session/report` loads the browser-printable practice report.
- Confirm `/app/courses` shows `Demo Trading Foundations`.
- Confirm `/app/courses/course_demo_foundations` shows the lesson reader, private learning desk, notes/bookmarks, and deterministic lesson check without exposing answer keys.
- Confirm `/app/courses/course_demo_foundations/proof` loads proof or safe unavailable state.
- Confirm `/app/journal` defaults to `My Trades`, reports Journal Sync honestly, and does not load or show manual-trade controls.
- Switch to `Backtesting` and confirm simulated Practice analytics remain separate from connected-account history.
- Confirm student access to `/workspace` and `/admin` is blocked with wrong-role copy.
- Confirm student cannot access /workspace as a workspace/influencer route.
- Confirm student cannot access /admin as a Super Admin route.
- Confirm practice terminal order placement remains manual follow-up; do not fake success in browser tests.

Nice to test:

- Submit a simulated practice order from a fresh active session.
- Complete a deterministic lesson check and re-open the proof route.
- Save/edit/delete a private lesson note and bookmark.
- Exercise My Trades filters and Backtesting session review/report links.

Later regression:

- Add mobile viewport variants for student Practice Terminal, course reader, and Stage 29F Journal workspace.
- Keep malformed manual CSV import testing in historical Stage 21 compatibility regression only; it is not a current `/app/journal` flow.
- Add browser tests for event marker hover after pan/zoom once chart selectors are stable.

### Stage 28D Workspace And Super Admin End-to-End Browser QA

Status: source-level browser test suite added; real browser execution is deferred until emulators/dev server are running.

Must test before demo:

- Run `npm run browser:qa:workspace-admin` after starting emulators, seeding demo data, and starting the dev server.
- Confirm `/workspace` loads for `demo.pro.influencer@example.test` with the workspace shell and no runtime error.
- Confirm workspace package/licence card shows Pro/seat cap/status copy, no public price, and Trade Copier separate optional add-on copy.
- Confirm workspace Student CRM shows lifecycle/search/support-safe summaries only.
- Confirm workspace practice insights, drills/assignments, cohorts/review queue, course visibility, and external preview sections show aggregate/masked data only.
- Confirm workspace branding/domain, Enterprise readiness, and Enterprise integration posture are metadata-only.
- Confirm Workspace cannot access /admin and is blocked with wrong-role copy.
- Confirm `/admin` loads for `demo.superadmin@example.test` with Super Admin shell and no runtime error.
- Confirm Super Admin package/licence, branding/domain, Enterprise deployment/SLA, and Enterprise integration panels render masked refs only.
- Confirm Super Admin payment/support, messaging dry-run, external signal ingestion, and live AutoCopy readiness/incident panels render safely.
- Confirm Super Admin wrong-role check for /app/journal returns the expected safe role boundary.
- Confirm browser pages expose no public package prices, raw seeded IDs, secrets, vault refs, raw payment refs, provider payloads, broker passwords, MetaAPI tokens, webhook secrets, raw student IDs, raw workspace IDs, raw order refs, or AutoCopy internals.

Nice to test:

- Repeat workspace browser QA with Launch and Enterprise seeded influencer personas by temporarily extending the auth helper/persona matrix.
- Exercise read-only filters in the workspace Student CRM, practice insights, course visibility, and external preview sections.
- Run the Super Admin dry-run messaging worker manually and confirm no real send occurs.

Later regression:

- Add mobile viewport variants for `/workspace` and `/admin`.
- Add browser tests for safe Super Admin note fields once stable selectors are available.

### Stage 28E Browser QA Bug-Fix And UX Polish Pass

Status: source-level polish added; real browser execution remains deferred until local emulators/dev server are running.

Must test before demo:

- Install Chromium with `npx playwright install chromium` if the local Playwright browser is missing.
- Start Firebase emulators with `npm run firebase:emulators`.
- Run `npm run seed:demo`.
- Start the dev server with `npm run dev:stage15f`.
- Run `npm run browser:qa`.
- Run `npm run browser:qa:student`.
- Run `npm run browser:qa:workspace-admin`.
- Confirm failures, if any, produce readable artifacts under `test-results` and `playwright-report`.
- If seeded sign-in fails, rerun `npm run seed:demo`, confirm the Auth emulator is still running, and restart `npm run dev:stage15f`.

Nice to test:

- Run with `TRADEHUB_BROWSER_REUSE_SERVER=true` against an already-running dev server.
- Run `TRADEHUB_BROWSER_BASE_URL=http://127.0.0.1:3000 npm run browser:qa` to confirm base URL override.

Later regression:

- Add test IDs only for major panels that prove unstable under real browser runs.
- Add mobile viewport projects after the desktop smoke is consistently green.
- Open `/app/courses`.
- Student finds a course, opens a lesson, saves note/bookmark, uses Continue Learning, passes required check, completes course, and prints proof.
- Locked course/search results do not reveal locked lesson/resource/check/private data.
- Open `/workspace/courses`.
- Workspace creates/edits/reorders/resources/checks/publishes/archives safely.
- Workspace sees only aggregate-safe course completion/readiness/resource/private-learning counts.
- Workspace onboarding overview renders safe readiness states.

### Stage 25A Broad Live AutoCopy Must Test Before Demo

- Super Admin opens the crypto execution ops panel and sees the broad live AutoCopy readiness overview.
- Super Admin confirms launch-gate states render as blocked/dry-run/canary/cohort-safe, not as an execution action.
- Super Admin reviews the runbook sections for before live cohort, before broad rollout, emergency disable, reconciliation review, and rollback.
- Workspace opens `/workspace` and sees only a safe broad live readiness summary.
- Student opens `/app/copier` and sees safe broad live status copy only.
- Confirm broad live remains blocked by default with env defaults disabled and dry-run on.
- Confirm crypto Production Beta canary and Forex live canary remain separate from broad rollout.
- Confirm external signal preview candidates cannot publish, route, execute, or trigger AutoCopy.
- Confirm no raw credentials, vault refs, account IDs, broker passwords, MetaAPI tokens, provider payloads, webhook payloads, full order refs, or AutoCopy internals appear in browser responses.

### Stage 20 Ops Must Test Before Demo

- Workspace readiness summary renders.
- Workspace student CRM search/filter works.
- Workspace student CRM lifecycle filter works for active, pending onboarding, payment/access issue, paused, inactive, and needs support.
- Open a workspace student safe detail row and confirm only masked support ref, readiness summaries, and safe counts appear.
- Mark support follow-up needed.
- Clear support follow-up.
- Add/edit bounded internal support note summary.
- Update student operational status if enabled.
- Confirm student cannot see workspace-only internal support note.
- Workspace student CRM does not expose private course/practice/journal/payment/provider internals.
- Workspace sees safe student billing/support indicators: unpaid/pending payment, active subscription, expired/cancelled subscription, verification pending, payment mismatch/admin review, and resolved issue.
- Workspace cannot view raw payment/provider references.
- Admin sees payment support queue.
- Admin can request Paystack recheck through the existing reconcile action where appropriate.
- Admin Solana settlement notes/status remain bounded and do not initiate payouts.
- Student payment checkout/verification behavior is unchanged.
- Browser-visible payment ops data contains only masked refs and safe status labels.
- Student billing status and verification empty/error states are clear.
- Admin payment overview shows safe masked operational data.
- Admin support overview and payment queue render.
- Admin support overview shows safe issue summaries only.
- Cross-role checks: student cannot access workspace/admin ops; workspace cannot access admin ops; admin surfaces stay Super Admin gated.
- Confirm no raw webhook payloads, credentials, vault refs, provider payloads, private journal/practice/course internals, or raw account IDs appear in browser responses.
- Frozen Practice and Course surfaces still open normally.

### Stage 29F Journal Must Test Before Demo

- Student opens `/app/journal` and sees `My Trades` selected by default.
- The zero state describes Journal Sync honestly and does not imply that Copier setup is a Journal connection.
- Populated QA fixtures normalize open, filled-entry, partial, closed-win, and closed-loss records correctly.
- Only authoritative closed trades affect realized KPIs, equity, drawdown, and daily/monthly calendars.
- Copied and provider-placed source labels remain distinct without exposing provider internals.
- Account, market, symbol, lifecycle, source, and date filters return truthful result-window counts.
- Switching to `Backtesting` loads simulated Practice analytics only; My Trades data is not mixed into it.
- A complete Backtesting cohort shows no coverage warning. If bounded order records lack authoritative sessions, a restrained warning appears before the KPIs with correctly pluralized safe counts only; excluded values affect no aggregate or session result.
- Zero Equity points retain the legitimate empty state. One completed trade renders a visible marker and final-equity value; the seeded Backtesting chart must show `101,452` without asking the student to complete another trade. Two or more points retain equity and drawdown paths.
- Recent Backtesting sessions link only to existing student-owned review/report routes.
- No manual trade creation/editing, CSV import/export, archive/delete, manual review, or AI Insight control appears on `/app/journal`.
- Loading `/app/journal` makes no `/api/student/journal/manual-trades*` request.
- Another student or workspace cannot read connected Journal rows or private diagnostics.
- Laptop and tablet layouts remain readable without horizontal overflow or compressed labels.

### Stage 29F Journal Nice To Test

- Exercise filtered-empty states for each My Trades filter.
- Confirm newest-first display and truthful `hasMore`/truncated messaging with a bounded history window.
- Open Backtesting session review/report links from laptop, tablet, and narrow widths.
- Confirm a Copier connection without Journal-safe history leaves Journal Sync not configured.

### Historical Stage 21 Manual Journal Compatibility Coverage

- Stage 21 manual records and protected APIs remain preserved pending a separate migration/archive decision.
- This is later regression coverage only, not a current sales demo flow, and no manual controls should be expected on `/app/journal`.
- Any direct compatibility-API regression must remain student-owned and continue excluding workspace access, provider payloads, credentials, vault refs, hidden candles, payment refs, and AutoCopy internals.

## Nice To Test

Status: valuable before investor/user demos, but not required for this source-level closeout.

### Stage 20B Workspace Student CRM Lifecycle And Support Actions

- Workspace opens Student CRM.
- Search by student name/email/support ref.
- Filter by lifecycle/status.
- Open student detail drawer/expanded row.
- Confirm only safe summaries appear.
- Mark support follow-up needed.
- Clear support follow-up.
- Add/edit bounded internal support note if implemented.
- Confirm student cannot see workspace-only internal support note.
- Confirm cross-workspace student data is not visible.
- Confirm no raw payment refs, provider payloads, secrets, journal entries, practice trade internals, or AutoCopy internals appear.

### Stage 20C Payment And Subscription Ops Reconciliation Support

- Workspace sees safe student billing/support indicators.
- Workspace cannot view raw payment/provider references.
- Admin sees payment support queue.
- Admin can request Paystack recheck through the existing reconcile action if implemented for the listed intent.
- Admin can use the existing bounded Solana settlement note/status controls without initiating payouts.
- Student payment checkout/verification behavior is unchanged.
- Cross-workspace access remains blocked.
- Browser-visible data contains only masked refs and safe status labels.

### Stage 20 Ops Nice To Test

- Test the Stage 20 workspace CRM at small laptop and tablet widths.
- Try a workspace with no students and confirm empty states are helpful.
- Try a workspace with mixed trial, active, paused, past due, and cancelled student records.
- Confirm support note save errors display clearly when text is too long.
- Confirm admin payment support queue empty state is clear when no payment issues exist.

- Test responsive terminal layouts on desktop, small laptop, tablet, and phone widths.
- Run practice import/export browser downloads and playbook CSV import from file and pasted text.
- Try XAUUSD and major Forex/CFD static demo sessions when provider env is configured.
- Compare two completed sessions and inspect analytics charts.
- Run the assignment/cohort/feedback/resubmission flow with separate student and workspace users.
- Confirm workspace calendar filters and student task inbox date states remain understandable.
- Test mobile course reader readability on phone/tablet widths.
- Test workspace course editor readability on smaller laptop/tablet widths.
- Test course proof browser print dialog and saved PDF through browser print only.
- Test a required lesson check failure and retry before completion.

## Later Regression

Status: keep for future releases, dependency upgrades, and broader QA passes.

### Stage 20 Ops Later Regression

- Re-run Stage 20 workspace/admin smoke after payment, entitlement, Firebase Auth, or role-claim changes.
- Re-run Stage 20 payment support queue checks after Paystack/Solana dependency changes.
- Re-run support note/action checks after Firestore rules changes.
- Confirm no refunds, payouts, withdrawals, wallet transfers, messaging, uploads, PDFs, external support tools, provider calls, or access-grant shortcuts appear.

- Terminal event marker hover after pan/zoom.
- Simulated order lifecycle across market, limit, stop, partial close, manual close, and invalid SL/TP.
- Finish/reflection/report/print.
- Journal practice summary.
- Workspace aggregate-only views.
- Assignment/cohort/feedback/resubmission flow.
- Import/export smoke.
- Re-run the full Stage 17/18 practice QA chain after major Next.js, Firebase, or chart library upgrades.
- Re-run course/lesson QA after entitlement, subscription, workspace routing, or Firebase Auth changes.
- Course search/filter/Continue Learning flow.
- Lesson notes/bookmarks/resume points ownership.
- Lesson check answer-key safety and required-check completion blocking.
- Workspace aggregate course stats and masked recent completion refs.
- HTTPS-only course resources and browser-print-only proof.

## Deferred Manual QA Details

### Stage 18G Event Markers

Status: needs one final visual smoke pass when available.

- Open a BTCUSDT Practice Terminal session.
- Reveal candles until event dots appear in the bottom event lane.
- Hover a green, amber, and red event dot without clicking; tooltip should appear.
- Click a dot; tooltip should pin.
- Click `x`; pinned tooltip should close.
- Pan and zoom the chart; event dots should move with their candle/time position.
- Replay to the end, then pan left/right; event dots should still align and hover should still work.
- Use impact/category filters; chart dots and right-drawer event list should both update.

### Stage 18H Responsive Terminal

Status: not manually completed on all device sizes.

- Desktop wide: chart remains primary, right drawer usable.
- Small laptop: stat labels do not wrap into vertical text.
- Tablet portrait/landscape: bottom or side panel remains reachable.
- Phone portrait: Ticket, Orders, Stats, Events, Tools, and Review tabs are reachable.
- Buy/Sell should act as quick simulated market buttons; the dedicated Order control opens/focuses the ticket panel.
- No fixed header/footer overlap should hide terminal controls.
- Event hover/click should still work after pan/zoom.
- Completed sessions should keep mutation actions locked.

### Global Practice Smoke

Status: run only when time allows.

- Create a BTCUSDT practice session.
- Open terminal mode.
- Select a playbook.
- Reveal candles.
- Place a simulated market order with SL/TP.
- Confirm order appears on chart and in drawer.
- Step/play forward.
- Partial close if open.
- Manual close remaining position.
- Finish session.
- Add reflection.
- Open `/app/journal` and confirm practice/backtesting summary is safe and separate from AutoCopy.

### Stage 18I Practice Import/Export

Status: implementation added; needs manual browser/download smoke pass when available.

- Export sessions CSV.
- Export simulated orders CSV.
- Export closed trade summaries CSV.
- Export playbooks CSV.
- Export annotations/reflections CSV.
- Export safe JSON backup and confirm it excludes hidden candles, provider payloads, vault refs, credentials, account IDs, broker passwords, MetaAPI tokens, exchange IDs, and AutoCopy internals.
- Import playbooks CSV from a file.
- Import playbooks CSV from pasted text.
- Confirm imported playbooks appear only for the signed-in student.
- Confirm import creates new sanitized playbooks and cannot overwrite another student's data.
- Try malformed CSV and confirm a safe error or bounded partial import result.

### Stage 18J Historical Data Provider Expansion

Status: implementation added; needs provider-config manual smoke pass when available.

- Confirm BTCUSDT still works from crypto historical data.
- Try XAUUSD/major Forex session with provider config missing; it should fail closed safely.
- Set `PRACTICE_FOREX_CFD_HISTORY_PROVIDER=tradehub_static_demo`, restart dev server, and create XAUUSD session.
- Try EURUSD, GBPUSD, USDJPY, AUDUSD, NZDUSD, USDCHF, and USDCAD session creation/fetch.
- If `PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP` is set, confirm a safe suffix like `XAUUSD:XAUUSDm` displays provider symbol metadata without changing canonical symbol.
- Confirm canonical symbol and provider symbol stay separate.
- Confirm no student MetaAPI credentials are used for practice data.
- Confirm no raw provider payloads, account IDs, vault refs, broker passwords, MetaAPI tokens, or AutoCopy internals appear in browser responses.

### Stage 18K Practice Instrument Specs And Sizing Accuracy

Status: implementation added; needs cross-symbol browser smoke pass when available.

- BTCUSDT simulated order still sizes and closes correctly.
- ETHUSDT simulated order uses crypto quantity/price precision if enabled in the session selector.
- XAUUSD static demo session shows gold/CFD-friendly precision, lots, ticks, notional, and P&L display.
- EURUSD and USDJPY sessions show Forex-friendly lots and pip/tick display.
- Invalid SL/TP levels still fail safely for buy and sell orders.
- Partial close and manual close preserve instrument-aware P&L/R calculations.
- Terminal and old replay route show compact instrument labels without vertical text stacking.
- Export/journal remain safe and do not expose hidden candles, provider internals, raw provider payloads, credentials, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.

### Stage 18L Practice Session Management Dashboard

Status: implementation added; needs browser dashboard smoke pass when available.

- Create multiple BTCUSDT sessions.
- Create one XAUUSD or Forex/CFD static demo session if provider env is configured.
- Search by session name and symbol.
- Filter active, completed, abandoned, and archived sessions.
- Filter by asset class, symbol, timeframe, challenge enabled, random start, and playbook.
- Sort by recently updated, created date, symbol, performance, and status.
- Use Load more if enough sessions exist.
- Duplicate a session and confirm only setup is copied.
- Confirm duplicate has no copied orders, notes, bookmarks, drawings, annotations, reflections, hidden candles, or ledger entries.
- Archive and restore a session.
- Confirm archived sessions are hidden by default and visible only under the Archived filter.
- Confirm terminal/replay routes still work after session management changes.
- Confirm no hidden candles, secrets, provider payloads, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals appear in browser responses.

### Stage 18M Practice Analytics And Session Comparison

Status: implementation added; needs multi-session analytics smoke pass when available.

- Create and finish several practice sessions with different outcomes.
- Confirm equity curve updates from closed simulated trades only.
- Confirm drawdown curve updates.
- Confirm daily P&L summary updates.
- Confirm symbol breakdown updates.
- Confirm playbook breakdown updates.
- Confirm best/worst sessions and recent completed sessions update.
- Confirm challenge pass/fail/active summary updates.
- Compare two sessions and confirm safe metrics: starting balance, ending balance/equity, net P&L, win rate, avg R, max drawdown, profit factor, expectancy, trades, playbook, symbol/timeframe, and challenge status.
- Confirm empty state when no closed simulated trades exist.
- Confirm no hidden candles, secrets, provider payloads, protected Firestore paths, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals appear in responses or UI.

### Stage 18N Practice Session Report And Print Review

Status: implementation added; needs browser print smoke pass when available.

- Open report from `/app/practice`.
- Open report from `/app/practice/[sessionId]`.
- Open report from `/app/practice/[sessionId]/terminal`.
- Print/save PDF through the browser print dialog only.
- Confirm active and completed sessions both render safely.
- Confirm no closed trades empty state appears for sessions without closed simulated orders.
- Confirm annotations, drawings, event-linked notes, reflection, and main lesson appear when present.
- Confirm challenge summary, playbook breakdown, assumptions, and best/worst trade display safely when available.
- Confirm report exposes no hidden candles, secrets, provider payloads, protected Firestore paths, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.

### Stage 18O Workspace-Safe Practice Insights

Status: implementation added; needs workspace browser smoke pass when available.

- Open `/workspace` as an influencer.
- Confirm Practice Insights section appears.
- Confirm empty state works with no practice data.
- Confirm aggregates update after students create and complete practice sessions.
- Confirm filters work for status, symbol, timeframe, and date range.
- Confirm recent completed session rows show masked student identifiers only.
- Confirm most practiced symbols and most used playbooks show aggregate counts only.
- Confirm no raw journal entries, full trade-by-trade history, hidden candles, secrets, provider payloads, protected Firestore paths, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals appear in responses or UI.

### Stage 18P Workspace Practice Assignments And Drills

Status: implementation added; needs workspace/student browser smoke pass when available.

- Workspace creates an active BTCUSDT practice assignment.
- Workspace creates a draft assignment and archives it.
- Student sees active assignment on `/app/practice`.
- Student starts a terminal session from the assignment.
- Confirm created session stores safe assignment metadata snapshot only.
- Student completes the assignment session.
- Workspace sees aggregate assignment progress update.
- Confirm assignment progress uses masked recent completions only.
- Confirm workspace cannot see raw student trades, notes, hidden candles, drawings, annotations, reflections, journal entries, secrets, provider payloads, protected Firestore paths, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.

### Stage 18Q Instructor Feedback And Rubric

Status: implementation added; needs workspace/student browser smoke pass when available.

- Workspace creates an assignment.
- Student starts and completes an assignment session.
- Workspace sees completed assignment summary in the instructor feedback area.
- Workspace opens/selects the feedback form and submits rubric feedback.
- Student sees feedback on `/app/practice`.
- Student opens `/app/practice/[sessionId]/report` and confirms instructor feedback appears in the printable report.
- Student opens terminal/review and confirms feedback appears without enabling mutations.
- Student opens `/app/journal` and confirms latest instructor feedback appears under Practice/backtesting.
- Workspace edits feedback and confirms the student-visible summary updates.
- Confirm student cannot see another student's feedback.
- Confirm workspace cannot see raw journal entries, hidden candles, raw order-by-order records, annotations, drawings, reflections, secrets, provider payloads, protected Firestore paths, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.

### Stage 18R Practice Assignment Review Queue And Resubmissions

Status: implementation added; needs workspace/student browser smoke pass when available.

- Workspace creates assignment.
- Student completes assignment session.
- Workspace sees it in the Practice Review Queue.
- Filter queue by assignment, needs review, feedback draft, feedback published, resubmission requested, and completed.
- Workspace saves draft feedback.
- Student cannot see draft feedback on practice, terminal, report, or journal.
- Workspace publishes feedback.
- Student sees published feedback on practice, terminal, report, and journal.
- Workspace requests resubmission with safe reason, optional due date, and optional rubric area.
- Student sees resubmission requested on `/app/practice`.
- Student starts resubmission.
- Confirm resubmission creates a fresh setup-only session.
- Confirm no orders, hidden candles, notes, drawings, bookmarks, annotations, reflections, or ledger records are copied.
- Confirm workspace sees aggregate reviewed/resubmission progress only.
- Confirm workspace cannot see raw student IDs, raw session IDs, raw journal entries, hidden candles, full trade history, secrets, provider payloads, protected Firestore paths, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.

### Stage 18S Practice Cohorts, Assignment Scheduling, And Student Task Inbox

Status: implementation added; needs workspace/student browser smoke pass when available.

- Workspace creates a practice cohort.
- Workspace adds/removes opaque student refs from cohort.
- Workspace archives/restores cohort status by updating cohort status.
- Workspace creates assignment targeted to that cohort.
- Student in cohort sees assignment in Practice Task Inbox.
- Student not in cohort does not see or start the assignment.
- Before availability start, student cannot start.
- After due date, assignment shows overdue but can start if close date has not passed.
- After close date, student cannot start.
- Student sees due soon, overdue, completed, feedback available, and resubmission requested task states.
- Workspace sees aggregate-safe cohort progress only: assigned, started, completed, overdue, reviewed, resubmission requested/completed.
- Confirm no raw private practice trades, journal entries, hidden candles, notes, drawings, annotations, reflections, provider payloads, credentials, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals are exposed.

### Stage 18T Cohort Roster Picker And Assignment Calendar Polish

Status: implementation added; needs workspace/student browser smoke pass when available.

- Workspace opens cohort manager.
- Workspace searches loaded students in roster picker.
- Workspace adds/removes students into a cohort using picker buttons/chips.
- Confirm cohort saves safe opaque refs only.
- Workspace creates a cohort-targeted scheduled assignment.
- Calendar/schedule view shows availability start, due date, close date, status, target cohorts, and aggregate-safe progress.
- Filter schedule by active/draft/archived, cohort, due soon, overdue, and closed.
- Student in cohort sees the task.
- Student outside cohort does not see the task.
- Before-start and after-close gates block safely.
- Overdue but not closed still allows start.
- Confirm workspace sees aggregate-safe progress only and no raw practice internals or secrets.

### Stage 18U In-App Practice Notifications And Task Reminders

Status: implementation added; needs workspace/student browser smoke pass when available.

- Student sees available assignment alert.
- Student sees due soon and overdue-open alerts.
- Student sees assignment closed alert without a start action.
- Student sees feedback published alert only after feedback is published.
- Student sees resubmission requested alert.
- Student sees resubmission due soon and overdue alerts when applicable.
- Student marks alert read and dismisses an alert.
- Workspace sees aggregate notification counts only: needs review, overdue, resubmissions requested, feedback drafts not published.
- Confirm alerts do not expose raw session IDs, raw student IDs, raw private trades, journal entries, hidden candles, notes, reflections, provider payloads, credentials, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.
- Confirm no email, SMS, WhatsApp, push, uploads, screenshots, PDFs, paid storage, or paid notification service is used.

### Stage 18V Practice MVP Freeze And Browser Smoke Pack

Status: source smoke pack added; needs complete browser demo smoke pass when available.

Reference: TH-2026-08-20-STAGE18V-PRACTICE-MVP-SMOKE-HANDOFF

- Run local emulator/dev server.
- Sign in as the seeded student.
- Open `/app/practice`.
- Create/use a practice playbook.
- Create/open a BTCUSDT terminal session.
- Reveal candles.
- Confirm terminal chart shell, order ticket, indicators, drawings, bookmarks, challenge, analytics, event markers, and report shortcut load safely.
- Confirm event markers hover/click after pan/zoom.
- Submit a simulated order.
- Close the simulated order.
- Finish the session and add reflection.
- Open `/app/practice/[sessionId]` and confirm completed review remains readable.
- Open `/app/practice/[sessionId]/report` and browser print dialog.
- Open `/app/journal` and confirm practice/backtesting summary remains safe and separate from AutoCopy.
- Open `/workspace` and confirm aggregate-only insights/assignments/notification counts.
- Confirm workspace surfaces do not expose raw student IDs, raw session IDs, raw trades, hidden candles, raw journal entries, notes/reflections beyond approved feedback surfaces, secrets, provider payloads, vault refs, account IDs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.
- Confirm no paid PDF, screenshot, upload, email, SMS, WhatsApp, push, news, analytics, storage, or market-data service is used.

### Stage 18W Practice Launch Copy, Empty States, And Onboarding Polish

Status: copy polish added; needs browser readability smoke pass when available.

Reference: TH-2026-08-20-STAGE18W-PRACTICE-LAUNCH-POLISH-HANDOFF

- New student opens `/app/practice` and understands next action.
- Student can follow the intended practice flow from playbook to report: create playbook, create/open session, reveal candles, submit simulated order, close order, finish session, review report/journal.
- Confirm no playbooks, no sessions, no assignments, no notifications, no analytics, no imported/exported data, and no recent order empty states are helpful and not misleading.
- Terminal labels make clear this is simulated only, revealed-candle-only, and no broker/exchange order is placed.
- Confirm indicators, events, drawings, and bookmarks read as learning tools.
- Assignment/task/notification states are understandable: available, due soon, overdue but still open, closed, completed, feedback published, and resubmission requested.
- Report empty states are clear for no closed trades, no reflection, no playbook activity, no instructor feedback, and no main lesson.
- Journal separates no AutoCopy activity from no practice/backtesting activity.
- Workspace copy remains aggregate-safe and privacy-safe.
- Confirm no hidden candles, raw student/session IDs in workspace surfaces, raw trades, raw journal text, secrets, provider payloads, vault refs, credentials, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals appear.

### Stage 18X Practice MVP Final Acceptance And Deferred QA Closeout

Status: source-level acceptance added; browser/manual QA remains deferred until demo prep.

Reference: TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF

- Full seeded student practice flow.
- Terminal event marker hover after pan/zoom.
- Simulated order lifecycle.
- Finish/reflection/report/print.
- Journal practice summary.
- Workspace aggregate-only views.
- Assignment/cohort/feedback/resubmission flow.
- Import/export smoke.
- Confirm final practice MVP remains practice-only, simulated-only, revealed-candle-only, and separated from AutoCopy/live execution.
- Confirm no hidden candles, secrets, provider payloads, credentials, vault refs, raw student/session IDs in workspace surfaces, paid services, or AutoCopy internals appear.

### Stage 19A Course And Lesson Experience Audit Foundation

Status: source-level course audit foundation added; needs browser/manual QA when available.

Reference: TH-2026-08-20-STAGE19A-COURSE-LESSON-AUDIT-HANDOFF

- Student opens `/app/courses`.
- Student opens a course and lesson.
- Locked course/lesson states behave safely.
- Workspace creates/edits course/lesson if supported.
- Progress and notes remain scoped to signed-in student.
- No cross-workspace course leakage.
- Confirm unpublished drafts stay hidden from students.
- Confirm published courses still respect tier/subscription/course access rules.
- Confirm lesson progress writes only to the signed-in student's milestone/progress records.
- Confirm previous-lesson locks still block progress until the previous lesson is complete.
- Confirm course editor stores YouTube IDs, plain-text notes, and HTTPS attachment metadata only.
- Confirm no paid video hosting, uploads, external messaging, AI grading, new payment flow, practice/AutoCopy change, provider credential, broker/exchange call, vault ref, or live execution behavior appears.

### Stage 19B Course Navigation And Lesson Authoring Ergonomics

Status: source-level navigation and authoring ergonomics added; needs browser/manual QA when available.

Reference: TH-2026-08-20-STAGE19B-COURSE-NAV-AUTHORING-HANDOFF

- Student opens `/app/courses` and uses search/filter navigation.
- Student confirms locked courses remain visible with access reasons and still route to access review.
- Student opens a course and uses previous/next lesson navigation.
- Student confirms current lesson highlight and course outline remain readable on desktop and mobile widths.
- Student confirms locked lessons remain locked and progress buttons do not bypass server-owned access checks.
- Progress update remains student-owned for the signed-in student.
- Workspace creates/edits a course.
- Workspace confirms draft/published/archived preview states are clear.
- Workspace reorders sections/modules safely.
- Workspace reorders lessons safely.
- Workspace removes a lesson only after confirmation.
- Workspace saves/publishes and confirms validation errors are clear.
- Cross-workspace course leakage does not occur.
- Confirm YouTube ID and HTTPS attachment validation stay bounded.
- Confirm no paid video hosting, uploads, external messaging, AI grading, new payment flow, practice/AutoCopy change, provider credential, broker/exchange call, vault ref, or live execution behavior appears.

### Stage 19C Course Progress, Completion, And Proof Of Completion

Status: source-level completion/proof layer added; needs browser/manual QA when available.

Reference: TH-2026-08-20-STAGE19C-COURSE-COMPLETION-PROOF-HANDOFF

- Student opens `/app/courses` and sees progress summaries.
- Student confirms course cards show lessons completed, total lessons, percent complete, next lesson, and completed/locked/in-progress state.
- Student opens a course and confirms the reader progress summary matches the course card.
- Student completes required lessons.
- Student sees completed state.
- Student opens completion/proof page or panel.
- Browser Print / Save proof works through the browser print dialog only.
- Incomplete courses show proof-not-ready state and disabled print action.
- Locked/unentitled courses do not produce completion proof.
- Workspace sees aggregate completion metrics.
- Workspace recent completions use masked/safe refs only.
- Workspace does not see raw student lesson-by-lesson activity unless a later approved stage adds a safe review surface.
- Cross-workspace course/progress leakage does not occur.
- Confirm no generated PDF files, file uploads, paid PDF/storage/video hosting, messaging, AI grading, new payment flow, practice/AutoCopy change, provider credential, broker/exchange call, vault ref, or live execution behavior appears.

### Stage 19D Lesson Checks And Quiz Readiness, No AI Grading

Status: source-level deterministic lesson checks added; needs browser/manual QA when available.

Reference: TH-2026-08-20-STAGE19D-LESSON-CHECKS-NO-AI-HANDOFF

- Workspace adds required multiple-choice lesson check.
- Workspace adds true/false and short text self-check questions.
- Workspace saves/publishes and sees clear validation if a required check has no objective question.
- Student opens lesson and cannot complete until passing required check.
- Student submits wrong answers and sees safe retry state with score and question numbers only.
- Student submits passing answers and lesson/course completion updates.
- Student proof works only after required checks pass.
- Workspace sees aggregate-safe readiness only: attempted count, passed count, average score, and masked recent completions.
- Confirm student APIs do not expose answer keys before submit.
- Confirm workspace cannot see raw student answers.
- Confirm cross-workspace leakage does not occur.
- Confirm no AI grading, proctoring, uploads, screenshots, generated PDFs, messaging, paid services, external quiz providers, file storage, practice/AutoCopy change, provider credential, broker/exchange call, vault ref, or live execution behavior appears.

### Stage 19E Student Lesson Notes, Bookmarks, And Resume Points

Status: source-level private student learning organization added; needs browser/manual QA when available.

Reference: TH-2026-08-20-STAGE19E-STUDENT-LESSON-NOTES-BOOKMARKS-HANDOFF

- Student creates, edits, deletes a private lesson note.
- Student creates/removes a lesson bookmark with an optional short label.
- Student saves a resume point and sees Continue learning on `/app/courses`.
- Student searches own notes/bookmarks from `/app/courses`.
- Locked lessons keep private learning actions disabled until the lesson is available.
- Another student cannot see or modify those notes/bookmarks/resume points.
- Workspace sees only aggregate-safe counts.
- Workspace Course Hub and Course Visibility show only aggregate-safe counts: students with notes, bookmarked lessons, and recent learning activity.
- Workspace cannot see raw note text, labels, raw student IDs, answer keys, or attempts.
- Workspace cannot see raw note text, bookmark labels, raw lesson position, raw student IDs, answer keys, or attempts.
- Cross-workspace course/learning-state leakage does not occur.
- Confirm no AI summarization, AI grading, uploads, screenshots, generated PDFs, messaging, paid services, external note providers, file storage, public sharing, practice/AutoCopy change, provider credential, broker/exchange call, vault ref, or live execution behavior appears.

### Stage 19F Course Resources And Attachments Polish

Status: source-level resource metadata polish added; needs browser/manual QA when available.

Reference: TH-2026-08-20-STAGE19F-COURSE-RESOURCES-ATTACHMENTS-HANDOFF

- Workspace adds lesson resource metadata with title, category, HTTPS URL, and optional description.
- Workspace edits/removes resource metadata.
- Workspace sees preview matching student resource card shape.
- Student sees grouped resource cards in the lesson reader.
- Student opens HTTPS resource link in a new tab.
- Invalid HTTP/non-HTTPS URL is rejected.
- Empty lesson shows the no lesson resources state.
- Locked lesson does not expose resource links.
- Workspace Course Hub and Course Visibility show aggregate resource counts only.
- Confirm no upload control, stored file, paid storage, paid video hosting, server-side PDF generation, external resource provider, public sharing, AI summarization, student click tracking, private notes, answer keys, student attempt data, raw student IDs, or cross-workspace leakage appears.

### Stage 19G Course Discovery, Lesson Search, And Learning Shortcuts

Status: source-level discovery/search polish added; needs browser/manual QA when available.

Reference: TH-2026-08-20-STAGE19G-COURSE-DISCOVERY-SEARCH-HANDOFF

- Student searches courses by title and description on `/app/courses`.
- Student filters courses by available, locked, in-progress, completed, and tier/level where present.
- Student sees Continue learning prominently when a resume point exists.
- Student sees clear empty states for no available courses, no bookmarked lessons, and no private notes.
- Student searches accessible lesson titles and section/module titles.
- Student searches safe resource titles/descriptions only for accessible lessons.
- Student searches own private note text and sees only own results.
- Locked course result does not expose locked lesson/resource/private data.
- Workspace searches and filters the Course Hub by draft/published/archived.
- Workspace filters by resources, check activity, and completions using aggregate-safe counts only.
- Confirm workspace sees no raw note text, bookmark labels, resume positions, answer keys, lesson attempts, raw student IDs, or cross-workspace data.
- Confirm no uploads, paid video hosting/storage, generated PDFs, messaging, AI search/summarization, public sharing, external search provider, analytics tracking, practice/AutoCopy change, provider credential, broker/exchange call, vault ref, or live execution behavior appears.

### Stage 19H Course Launch Polish And Smoke Pack

Status: source-level launch polish and smoke checks added; needs browser/manual QA when available.

Reference: TH-2026-08-20-STAGE19H-COURSE-LAUNCH-SMOKE-HANDOFF

- Student can find a course, open lesson, save note/bookmark, pass required check, complete course, and print proof.
- Student course proof uses browser Print / Save only; no generated PDF file is stored.
- Locked courses do not expose locked lesson/resource/check data.
- Workspace can create/edit/reorder/publish/archive course safely.
- Workspace can add HTTPS resource metadata and deterministic lesson checks.
- Workspace sees only aggregate-safe completion/readiness/resource/note counts.
- Mobile course reader is readable and navigation controls are usable.
- Workspace editor remains readable on smaller laptop/tablet widths.
- No cross-student or cross-workspace leakage occurs.
- Confirm no answer keys before submission, private notes/bookmarks/resume positions to workspace users, raw student IDs, AI grading, uploads, stored files, paid video hosting/storage, generated PDFs, messaging, public sharing, external search provider, click tracking, analytics tracking, practice/AutoCopy change, provider credential, broker/exchange call, vault ref, or live execution behavior appears.

### Stage 19I Course/Lesson MVP Final Acceptance Freeze

Status: Course/lesson MVP source-QA frozen; browser/manual QA deferred.

Reference: TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF

- Run the full Stage 19I acceptance chain before any course-related release candidate.
- Student can find a course, open lesson, save note/bookmark, use Continue Learning, pass required check, complete course, and print proof.
- Locked course/search results do not reveal locked lesson/resource/check/private data.
- Workspace creates/edits/reorders/resources/checks/publishes/archives safely.
- Workspace sees only aggregate-safe stats.
- Mobile course reader and workspace editor are readable.
- Cross-student and cross-workspace leakage checks remain required before demo.
- Future course prompts should be bug patches or explicitly approved new stages; otherwise choose another product area.

### Stage 20A Workspace Ops, Student CRM, Payments, And Support Audit Foundation

Status: source-level ops audit foundation added; needs browser/manual QA when available.

Reference: TH-2026-08-21-STAGE20A-OPS-CRM-PAYMENTS-SUPPORT-HANDOFF

- Workspace onboarding overview renders safe readiness states.
- Workspace student CRM search/filter works.
- Workspace student CRM shows safe support refs and operational counts only.
- Workspace student CRM does not expose private course notes, practice trades, journal entries, raw payment payloads, provider payloads, credentials, vault refs, broker passwords, MetaAPI tokens/account IDs, or exchange API keys/secrets.
- Student billing status and verification empty/error states are clear.
- Workspace and admin payment cards show masked operational references.
- Admin payment overview shows safe masked operational data.
- Admin support overview shows aggregate issue summaries only.
- Cross-role checks: student cannot access workspace/admin ops; workspace cannot access admin ops; admin surfaces stay Super Admin gated.
- Confirm no raw webhook payloads, credentials, vault refs, provider payloads, private journal/practice/course internals, raw account IDs, refunds, payouts, withdrawals, messaging, uploads, PDFs, paid services, or live execution actions were added.

### Stage 22A Real Forex/CFD Historical Provider Contract And Vault Gate

Status: source-level provider contract and gate foundation added; real provider adapter remains deferred to Stage 22B.

Reference: TH-2026-08-22-STAGE22A-FOREX-CFD-HISTORY-CONTRACT-HANDOFF

- BTCUSDT practice candles still work.
- Forex/CFD with real provider disabled fails closed safely.
- Static demo provider still works only when explicitly configured.
- Safe readiness preview shows no secrets/vault refs/account IDs/raw payloads.
- Unsupported symbol/timeframe/date range fails safely.
- No hidden unrevealed candles appear in browser responses.
- Confirm `PRACTICE_FOREX_CFD_REAL_HISTORY_ENABLED=false`, `PRACTICE_FOREX_CFD_HISTORY_PROVIDER=disabled`, and `PRACTICE_FOREX_CFD_HISTORY_DRY_RUN=true` keep real Forex/CFD fetching blocked by default.
- Confirm provider symbol mappings keep canonical symbols separate and accept only safe suffixes such as `XAUUSD:XAUUSDm`.
- Confirm no student MetaAPI credentials or broker passwords are collected or used for practice history.

### Stage 22B Server-Only Forex/CFD Historical Adapter MVP

Status: server-only MetaAPI utility historical adapter added behind Stage 22A gates; real-provider browser smoke remains deferred.

Reference: TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF

- BTCUSDT practice candles still work.
- Forex/CFD real provider disabled still fails closed.
- Static demo provider still works only when explicitly configured.
- With real provider env enabled and dry-run off, XAUUSD/EURUSD fetch bounded normalized candles.
- Provider symbol mapping works, for example `XAUUSD:XAUUSDm`.
- Invalid provider credentials, symbol, timeframe, or date range fail safely.
- Browser responses expose no raw provider payloads, vault refs, account IDs, tokens, broker passwords, or hidden candles.
- Confirm only platform/operator utility credentials from the server vault are used.
- Confirm historical candle cache records contain normalized candles only and no raw provider responses.

### Stage 23A External Messaging/Reminder Provider Contract And Gates

Status: server-only messaging provider contract, disabled-by-default gates, safe dry-run/blocked intent model, Super Admin readiness preview, and deny-by-default rules added. Real external delivery remains deferred.

Reference: TH-2026-08-22-STAGE23A-MESSAGING-PROVIDER-CONTRACT-HANDOFF

- Super Admin sees messaging disabled/readiness state.
- Dry-run message intents can be created safely from assignment/course/reminder scenarios when server gates allow dry-run recording.
- Browser responses show only masked refs, channel, purpose, status, dry-run flag, safe reason, and timestamps.
- No real external messages are sent.
- No phone, email, token, provider payload, payment ref, vault ref, message body, answer key, hidden candle, private note, or AutoCopy internal appears in browser responses.
- Confirm workspace/student surfaces do not expose contact details or messaging provider config.
- Confirm Firestore direct browser reads/writes for messaging intent/provider/audit paths remain denied.

### Stage 23B Messaging Dry-Run Delivery Worker And Provider Adapter Placeholders

Status: server-only dry-run worker, fail-closed provider placeholders, safe delivery attempt records, Super Admin worker action, expanded overview counts, and deny-by-default attempt rules added. Real external delivery remains disabled.

Reference: TH-2026-08-22-STAGE23B-MESSAGING-DRY-RUN-WORKER-HANDOFF

- Super Admin sees messaging worker dry-run controls.
- Create or seed dry-run message intents.
- Run worker.
- Confirm intents move to safe dry-run processed status when messaging is explicitly enabled in dry-run with a placeholder provider/channel gate.
- Confirm blocked/skipped intents remain safe when provider/channel gates are off.
- Confirm latest delivery attempts show masked refs only.
- Confirm no real external message is sent.
- Confirm no phone, email, token, provider payload, vault ref, payment ref, message body, raw student ID, raw session ID, private note, hidden candle, or AutoCopy internal appears in browser responses.
- Confirm Firestore direct browser reads/writes for messaging delivery attempt paths remain denied.

### Stage 23C Messaging Preferences, Consent, And Suppression Safety Gates

Status: student preference API/UI, masked preference summaries, suppression-safe admin preview, worker-time safety rechecks, and deny-by-default rules added. Real external delivery remains disabled.

Reference: TH-2026-08-22-STAGE23C-MESSAGING-PREFERENCES-SUPPRESSION-HANDOFF

- Student opens `/app` and sees Reminder preferences.
- Student disables email, WhatsApp, and SMS reminders.
- Student disables one reminder purpose such as practice assignments or feedback/resubmissions.
- Student saves preferences and refreshes to confirm settings persist.
- Dry-run intent creation respects channel opt-out with `student_channel_opted_out`.
- Dry-run intent creation respects purpose opt-out with `student_purpose_opted_out`.
- A masked suppressed recipient/channel blocks worker processing with `recipient_suppressed`.
- With no verified contact source configured, readiness stays `contact_unavailable` and delivery fails closed.
- Super Admin sees preference/suppression-safe counts only.
- Super Admin latest suppression preview shows masked refs only, no contact details.
- No real email, SMS, or WhatsApp message is sent.
- Browser responses show masked refs/status only and no phone, email, message body, provider payload, token, vault ref, payment ref, raw student/session ID, private note, hidden candle, answer key, credential, or AutoCopy internal.
- Confirm Firestore direct browser reads/writes for messaging preferences, preference summaries, suppressions, intents, and delivery attempts remain denied.

### Stage 23D Messaging MVP Final Acceptance Freeze

Status: messaging/reminders MVP is source-QA frozen. Real external delivery remains disabled; all browser messaging surfaces remain masked/status-only.

Reference: TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF

#### Messaging Manual QA - Must Test Before Demo

- Student opens `/app` and sees Reminder preferences.
- Student enables/disables email, WhatsApp, and SMS reminder channels.
- Student enables/disables practice assignment, course, billing/access, and feedback/resubmission reminder purposes.
- Student saves preferences and refreshes to confirm settings persist.
- Dry-run intent creation respects channel opt-out with `student_channel_opted_out`.
- Dry-run intent creation respects purpose opt-out with `student_purpose_opted_out`.
- Super Admin sees messaging readiness, preference summary counts, suppression counts, and no-contact-route counts only.
- Run the dry-run worker and confirm no real email, SMS, WhatsApp, or push message is sent.
- Confirm browser-visible messaging responses show no phone, email, message body, provider payload, token, vault ref, payment ref, raw student/session ID, private note, hidden candle, answer key, credential, or AutoCopy internal.

#### Messaging Manual QA - Nice To Test

- Seed or create an active masked suppression and confirm the worker blocks with `recipient_suppressed`.
- Confirm blocked/skipped intents remain safe when provider/channel gates are off.
- Confirm latest safe delivery attempts show masked refs only.
- Confirm latest safe suppression previews show masked refs only.
- Confirm default no verified contact route keeps delivery fail-closed with `contact_unavailable`.

#### Messaging Manual QA - Later Regression

- Confirm Firestore direct browser reads/writes for messaging preferences, preference summaries, suppressions, intents, delivery attempts, provider status, and audit paths remain denied.
- Confirm Super Admin messaging routes reject non-admin roles.
- Confirm student preference routes reject workspace/admin and cross-student access.
- Re-run Stage 23A/23B/23C/23D QA after any future real-provider messaging work.

### Stage 24A External Signal Ingestion Contract

Status: external signal ingestion foundation is implemented as a source-QA checked, disabled-by-default, contract-only quarantine layer. No real Telegram, webhook, provider, AutoCopy, or live execution behavior is enabled.

Reference: TH-2026-08-22-STAGE24A-EXTERNAL-SIGNAL-INGESTION-CONTRACT-HANDOFF

#### External Signal Ingestion Manual QA - Must Test Before Demo

- Super Admin opens the admin dashboard and sees the external signal ingestion readiness panel.
- Confirm readiness says ingestion is disabled/contract-only and cannot trigger AutoCopy or live execution.
- Seed or create a manual/mock external signal candidate through Admin SDK/server tooling only.
- Confirm duplicate candidate input is detected as `duplicate` or a safe duplicate reason.
- Confirm malformed candidate input is rejected or quarantined with safe parse warnings.
- Confirm browser-visible candidate previews show masked source refs only.
- Confirm no raw external message body, source account ID, chat ID, username, phone number, token, webhook secret, provider payload, credential, payment ref, vault ref, or AutoCopy internal appears.
- Confirm no student AutoCopy, workspace signal publish, or live execution path changes when candidates exist.

#### External Signal Ingestion Manual QA - Nice To Test

- Seed source allowlist records for manual admin seed, Telegram-style, webhook-style, and master-trader feed categories and confirm the panel displays safe labels only.
- Confirm source allowlist status and parser mode display without raw source identifiers.
- Confirm unsupported symbols/assets fail closed.
- Confirm cfd/forex/crypto canonical symbol validation remains conservative.

#### External Signal Ingestion Manual QA - Later Regression

- Confirm Firestore direct browser reads/writes for external signal source, candidate, provider status, and audit paths remain denied.
- Confirm `/api/admin/signals/external-ingestion/overview` rejects non-Super Admin roles.
- Re-run Stage 24A QA before any Stage 24B parser/moderation work.

### Stage 24B External Signal Parser, Moderation, And Review Workflow

Status: external signal ingestion moderation is implemented as a Super Admin-only, source-QA checked workflow. Candidates remain preview-only/non-executable and are not connected to workspace publishing, student visibility, AutoCopy, providers, or live execution.

Reference: TH-2026-08-22-STAGE24B-EXTERNAL-SIGNAL-REVIEW-WORKFLOW-HANDOFF

#### External Signal Review Manual QA - Must Test Before Demo

- Super Admin opens the external ingestion panel.
- Super Admin creates a mock BTCUSDT candidate with entry, SL, and TP.
- Super Admin creates the same mock candidate again and confirms duplicate fingerprint handling.
- Super Admin creates a candidate missing SL/no TP and confirms it lands in `needs_review` with safe risk flags.
- Super Admin creates an unsupported symbol candidate and confirms it is rejected safely.
- Super Admin marks a normalized candidate as preview-only and confirms copy says non-executable.
- Super Admin rejects and quarantines candidates.
- Confirm browser responses show masked refs only.
- Confirm no raw external message body, source account ID, chat ID, username, phone number, token, webhook secret, provider payload, credential, payment ref, vault ref, or AutoCopy internal appears.
- Confirm no workspace signal publishing, student signal visibility, AutoCopy routing, provider call, or live order occurs.

#### External Signal Review Manual QA - Nice To Test

- Create/update/disable a source allowlist record from the Super Admin panel.
- Confirm source records display safe labels, masked refs, parser mode, status, and allowed symbols only.
- Confirm workspace scope mismatch gets risk-flagged safely.
- Confirm too many take profits gets risk-flagged and bounded.
- Confirm suspicious safe text hint gets risk-flagged without storing a raw external message.

#### External Signal Review Manual QA - Later Regression

- Confirm candidate/source create/review routes reject non-Super Admin roles.
- Confirm Firestore direct browser reads/writes for external signal source, candidate, provider status, and audit paths remain denied.
- Re-run Stage 24A/24B QA before any Stage 24C preview integration work.

### Stage 24C External Signal Preview Integration And Ingestion MVP Freeze

Status: external signal ingestion MVP is source-QA frozen as a read-only preview workflow. Approved candidates may appear only as workspace-safe preview records and cannot become executable TradeHub signals, student signals, AutoCopy routes, provider calls, or live orders.

Reference: TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF

#### External Signal Preview Manual QA - Must Test Before Demo

- Super Admin creates a mock external candidate.
- Super Admin approves it for workspace preview.
- Workspace opens `/workspace` and sees only safe read-only preview metadata.
- Confirm preview cards say external preview only, not a TradeHub signal, not student-visible, and not AutoCopy executable.
- Confirm workspace can filter preview candidates by symbol, asset class, source label, review status, and date.
- Confirm workspace has no publish, convert, route, order, AutoCopy, or execution action for preview candidates.
- Confirm student routes do not show external preview candidates.
- Confirm rejected, quarantined, duplicate, received, parsed, and needs-review candidates do not appear in workspace preview.
- Confirm browser responses contain no raw external message body, raw source ID, chat ID, username, phone number, token, webhook secret, provider payload, credential, payment ref, vault ref, admin note, reviewer ref, fingerprint, source safe ref, or AutoCopy internal.

#### External Signal Preview Manual QA - Nice To Test

- Create preview candidates for crypto, forex, and CFD symbols and confirm canonical display stays safe.
- Confirm workspace-scoped candidates do not appear in a different workspace.
- Confirm source safe labels appear without raw source identifiers.
- Confirm empty state is clear when no approved preview candidates exist.

#### External Signal Preview Manual QA - Later Regression

- Confirm `/api/workspace/signals/external-preview` rejects students and unrelated roles.
- Confirm Firestore direct browser reads/writes for external signal source, candidate, provider status, and audit paths remain denied.
- Re-run Stage 24A/24B/24C QA before any future executable external-signal bridge is considered.

### Stage 25A Broad Live AutoCopy Production Readiness Audit And Launch Gates

Status: broad live AutoCopy readiness is implemented as an audit/runbook surface only. Broad live order execution remains disabled by default, and existing crypto production canary plus Forex tiny live canary paths remain separate.

Reference: TH-2026-08-22-STAGE25A-BROAD-LIVE-AUTOCOPY-READINESS-HANDOFF

#### Broad Live AutoCopy Readiness Manual QA - Must Test Before Demo

- Super Admin sees broad live AutoCopy readiness overview in admin execution ops.
- Workspace sees safe broad live readiness summary only.
- Student sees safe broad live status copy only.
- Confirm default state is broad live blocked or dry-run-only, not broad live executable.
- Confirm launch checks include platform/workspace kill switches, dry-run/order-call gates, vault readiness posture, consent/access posture, reconciliation readiness, and external signal preview separation.
- Confirm runbook sections include before live cohort, before broad rollout, emergency disable, reconciliation review, and rollback.
- Confirm no button or route enables broad live execution.

#### Broad Live AutoCopy Readiness Manual QA - Nice To Test

- Toggle local non-secret env values in a development sandbox and confirm labels change without calling providers or placing orders.
- Load a workspace with sampled students and confirm bounded student readiness counts appear without raw student data.
- Verify the student copier page remains readable on mobile after adding the broad live status card.

#### Broad Live AutoCopy Readiness Manual QA - Later Regression

- Re-run Stage 25A QA after any AutoCopy worker, production canary, Forex canary, external signal, payment, entitlement, or Firestore rule change.
- Re-check that external signal preview candidates remain non-executable before any future signal-ingestion bridge.
- Re-check that broad live env defaults remain disabled/dry-run in `.env.example`.

### Stage 25B Controlled Live AutoCopy Cohort Gate

Status: controlled live cohort gate/readiness preview is implemented as a review surface only. Cohort approval does not place live orders or change existing live workers.

Reference: TH-2026-08-22-STAGE25B-LIVE-AUTOCOPY-COHORT-GATE-HANDOFF

#### Controlled Cohort Gate Manual QA - Must Test Before Demo

- Super Admin sees cohort gate disabled by default.
- Super Admin can review eligible/blocked cohort posture safely.
- Confirm approving/reviewing cohort state does not enable broad live execution or place an order.
- Workspace sees aggregate/safe cohort readiness only.
- Student sees safe controlled-rollout copy only.
- Kill switch blocks cohort readiness.
- Dry-run/cohort order-call flags remain fail-closed by default.
- External preview signals cannot execute or seed cohort AutoCopy routing.
- Browser responses contain no raw credentials, provider payloads, vault refs, raw student IDs, raw workspace internals, raw order refs, or AutoCopy internals.

#### Controlled Cohort Gate Manual QA - Nice To Test

- Toggle local non-secret cohort env values in a development sandbox and confirm labels update without provider calls.
- Load a workspace with sampled readiness counts and confirm candidate counts stay bounded and support-safe.
- Verify student copier status remains readable on mobile with the cohort label.

#### Controlled Cohort Gate Manual QA - Later Regression

- Re-run Stage 25B QA after any live production canary, Forex canary, readiness, external signal, payment, entitlement, or Firestore rule change.
- Re-check that cohort env defaults remain `false`, `false`, and `true` in `.env.example`.
- Re-check that cohort Firestore paths remain deny-by-default unless a future protected Admin SDK route is explicitly approved.

### Stage 25C Controlled Crypto Live AutoCopy Cohort Rollout

Status: bounded Super Admin crypto cohort dry-run action is implemented. It does not enable broad live execution, does not include Forex rollout, and does not place exchange orders from the cohort UI.

Reference: TH-2026-08-22-STAGE25C-CRYPTO-LIVE-AUTOCOPY-COHORT-ROLLOUT-HANDOFF

#### Controlled Crypto Cohort Rollout Manual QA - Must Test Before Demo

- Super Admin sees the crypto cohort dry-run control in the crypto execution ops panel.
- Running the dry-run with a workspace ID checks at most the bounded candidate window.
- Candidate summaries show masked refs, safe status, symbol, exchange, side, order type, notional, and safe reason only.
- Blocked candidates explain missing paid Crypto AutoCopy, consent, vault, kill-switch, preflight, or readiness gates safely.
- Submitted count remains zero unless a future separately reviewed live path is explicitly opened.
- Workspace and student views remain status-only and cannot trigger cohort rollout.
- External signal preview candidates cannot execute or seed cohort AutoCopy routing.
- Browser responses contain no raw credentials, provider payloads, vault refs, raw student IDs, raw workspace internals, raw order refs, or AutoCopy internals.

#### Controlled Crypto Cohort Rollout Manual QA - Nice To Test

- Toggle local non-secret cohort env values in a development sandbox and confirm dry-run labels/warnings update without provider calls.
- Load a workspace with `ready_for_live` crypto intents and confirm candidate count remains capped.
- Confirm rollback note is visible after a cohort dry-run.

#### Controlled Crypto Cohort Rollout Manual QA - Later Regression

- Re-run Stage 25C QA after any production live worker, production canary, readiness, payment, entitlement, external signal, or Firestore rule change.
- Re-check that Forex live rollout remains separate and that no MetaAPI/Forex code is used by the crypto cohort path.
- Re-check that no exchange adapter or credential loader is imported into the Stage 25C worker slice.

### Stage 25D Live AutoCopy Reconciliation, Incident, And Rollback Hardening

Status: support-safe incident/reconciliation posture is implemented. It does not enable broad live execution, create a broad worker, add Forex broad rollout, or place orders.

Reference: TH-2026-08-22-STAGE25D-LIVE-AUTOCOPY-RECONCILIATION-INCIDENT-HANDOFF

#### Live AutoCopy Incident Hardening Manual QA - Must Test Before Demo

- Super Admin sees the support, incident, and rollback section inside the broad live readiness card.
- Crypto production/canary, crypto cohort dry-run, and Forex live canary streams render separately.
- Stale/review-needed/blocked counts are support-safe and bounded.
- Kill-switch and dry-run/order-call posture are visible.
- Rollback and incident checklists are visible.
- Support-note policy is visible and says notes must be bounded, sanitized, Super Admin-only, and free of provider internals.
- Workspace/student views remain status-only and cannot trigger incident, rollback, or live actions.
- Browser responses expose no raw credentials, provider payloads, vault refs, raw student IDs, raw workspace internals, raw order refs, exchange response payloads, or AutoCopy internals.

#### Live AutoCopy Incident Hardening Manual QA - Nice To Test

- Load a workspace with production reconciliation records and confirm the production stream shows review counts.
- Run a crypto cohort dry-run and confirm cohort audit summary counts update safely.
- Trigger existing kill switch state in a local sandbox and confirm incident status blocks rollout posture.

#### Live AutoCopy Incident Hardening Manual QA - Later Regression

- Re-run Stage 25D QA after any live production, canary, cohort, Forex canary, external signal, payment, entitlement, or Firestore rule change.
- Re-check new support/rollback/incident note paths remain deny-by-default until a future protected Super Admin route is explicitly approved.
- Re-check no exchange adapter, credential loader, MetaAPI token loader, or provider network call is added to the incident readiness helper.

### Stage 25E Controlled Live AutoCopy MVP Final Acceptance Freeze

Status: controlled live AutoCopy support layer is source-QA frozen. Stage 25E adds final acceptance coverage only; it does not enable broad live execution, create a broad live worker, add Forex broad rollout, or place orders.

Reference: TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF

#### Controlled Live AutoCopy Final Freeze Manual QA - Must Test Before Demo

- Super Admin sees final live AutoCopy readiness/freeze status in the crypto execution ops panel.
- Super Admin sees controlled cohort dry-run, production/canary reconciliation, incident, and rollback sections.
- Crypto cohort dry-run remains bounded and submits zero live orders unless a future owner-approved production launch changes explicit env/control gates.
- Forex live canary remains separate from crypto cohort and broad rollout posture.
- Workspace sees only safe/status readiness copy and cannot trigger rollout, incident, rollback, or live actions.
- Student sees only safe/status controlled-rollout copy and cannot trigger rollout, incident, rollback, or live actions.
- External signal preview remains non-executable and cannot publish, route, execute, or seed AutoCopy.
- Browser responses expose masked refs and safe status labels only.
- Confirm no broad live execution is enabled.

#### Controlled Live AutoCopy Final Freeze Manual QA - Nice To Test

- Toggle local non-secret dry-run/kill-switch states in a development sandbox and confirm readiness labels change without provider calls.
- Run a crypto cohort dry-run in local seed data and confirm candidate counts remain bounded and support-safe.
- Load workspace execution overview after the dry-run and confirm workspace view remains audit/status-only.

#### Controlled Live AutoCopy Final Freeze Manual QA - Later Regression

- Re-run Stage 25E QA after any crypto production, cohort, Forex canary, external signal, payment, entitlement, vault, Firestore rule, or AutoCopy worker change.
- Re-check `.env.example` keeps broad/cohort live env gates disabled and dry-run by default.
- Re-check no broad live worker route exists unless a future explicit production launch prompt approves it.
- Re-check external preview signals remain read-only and non-executable.

### Stage 26A Manual Browser QA Pack And Demo Readiness Fixes

Status: demo-readiness pack added. Stage 26A does not add product features or alter execution/payment/provider/security behavior.

Reference: TH-2026-08-23-STAGE26A-MANUAL-BROWSER-QA-DEMO-PACK-HANDOFF

#### Manual Browser Demo Pack - Must Test Before Demo

- Follow `manual-demo-qa.md` from a fresh emulator/dev-server run.
- Sign in as seeded student, influencer/workspace, and Super Admin using the documented local Auth emulator accounts.
- Complete the seven demo flows: student overview, practice terminal, manual journal, courses/proof, workspace dashboard, Super Admin readiness, and controlled live AutoCopy blocked/frozen check.
- Confirm the demo can be explained from `/workspace -> /app/practice -> /app/journal -> /app/courses -> /admin` without relying on hidden implementation details.
- Confirm browser surfaces show no secrets, raw IDs, provider payloads, payment refs, hidden candles, private notes, or AutoCopy internals.

#### Manual Browser Demo Pack - Nice To Test

- Run the browser demo at mobile/tablet widths for the student practice, journal, and course routes.
- Print the course proof and practice report through browser print.
- Run manual import/export smoke checks for practice and manual journal CSV flows.

#### Manual Browser Demo Pack - Later Regression

- Re-run Stage 26A QA after any route, auth seed, demo copy, frozen acceptance script, or package script change.
- Keep `manual-demo-qa.md` updated whenever seeded login routes or local run commands change.

### Stage 27A Package Entitlements, Seat Caps, And Licence Model

Status: internal package/licence model and safe package visibility are implemented. Public pricing is not shown in app UI, and Trade Copier remains separate from Launch, Pro, and Enterprise packages.

Reference: TH-2026-08-24-STAGE27A-PACKAGE-ENTITLEMENTS-SEAT-CAPS-HANDOFF

#### Package Licence Manual QA - Must Test Before Demo

- Workspace opens `/workspace` and sees package status and active student count.
- Launch package shows 50 active-student cap.
- Pro package shows 500 active-student cap.
- Enterprise package shows custom capacity/custom review state when no cap is configured.
- Attempting to activate a new student over the Launch/Pro active-seat cap fails closed with a safe support message.
- Over-limit workspace shows warning and contact/upgrade prompt.
- Super Admin opens `/admin` and sees package summary plus over-limit workspace count.
- Browser UI shows no public package prices.
- Trade Copier remains separate optional add-on copy.
- Cross-workspace access remains blocked.

#### Package Licence Manual QA - Nice To Test

- Seed or edit a local workspace doc with `packageLicense.packageTier` set to `launch`, `pro`, and `enterprise` and confirm labels update.
- Seed active students above a package cap and confirm workspace and Super Admin warnings are support-safe.
- Confirm package cards remain readable on smaller laptop/tablet widths.

#### Package Licence Manual QA - Later Regression

- Re-run Stage 27A QA after any workspace student-create, workspace dashboard, admin overview, payment entitlement, or Firestore rules change.
- Re-check no public package prices appear in browser UI after any pitch/pricing copy update.
- Re-check Trade Copier add-on stays separate from base workspace package entitlements.

### Stage 27B Package Billing Terms, Maintenance Windows, And Admin Licence Ops

Status: internal support/maintenance/licence ops are implemented. Browser UI remains private-quote only and does not collect licence payments, issue refunds, or automate payouts/settlements.

Reference: TH-2026-08-24-STAGE27B-PACKAGE-BILLING-MAINTENANCE-OPS-HANDOFF

#### Package Licence Ops Manual QA - Must Test Before Demo

- Workspace opens `/workspace` and sees package name, support status, maintenance renewal status, renewal due date, and contact TradeHub prompt without public prices.
- Super Admin opens `/admin` and sees licence ops list with masked workspace refs only.
- Super Admin filters licence ops by active, due soon, overdue, suspended, and custom review.
- Super Admin records a bounded licence note and marks maintenance active.
- Super Admin marks maintenance waived, custom review, and suspended in a local test workspace.
- Maintenance due/overdue/custom-review/support-limited states render safely on workspace and admin surfaces.
- Stage 27A seat caps still work after licence ops changes.
- Trade Copier remains a separate optional add-on.
- Cross-workspace access remains blocked.
- Browser UI shows no payment automation, public package prices, raw payment refs, provider payloads, secrets, raw student IDs, raw workspace IDs, vault refs, or AutoCopy internals.

#### Package Licence Ops Manual QA - Nice To Test

- Seed included support window dates in the past and within 30 days to confirm overdue/due-soon state derivation.
- Try an over-500-character Super Admin note and confirm it is bounded safely.
- Confirm admin licence cards remain readable on smaller laptop/tablet widths.

#### Package Licence Ops Manual QA - Later Regression

- Re-run Stage 27B QA after any package/licence helper, Super Admin overview, workspace overview, billing activation, or Firestore rules change.
- Re-check no public prices appear after any package deck/copy update.
- Re-check licence ops route remains Super Admin-only and masked-ref-only after any admin API refactor.

### Stage 27C Workspace Branding, Custom Domain Readiness, And White-Label Controls

Status: branding/domain readiness metadata is implemented. Browser UI remains upload-free, DNS/SSL-provider-free, private-quote only, and does not turn readiness into live custom-domain hosting.

Reference: TH-2026-08-24-STAGE27C-WORKSPACE-BRANDING-DOMAIN-WHITELABEL-HANDOFF

#### Branding And Domain Manual QA - Must Test Before Demo

- Workspace opens `/workspace` and sees current branding mode, display name, student-facing visibility state, logo metadata state, custom-domain status, DNS checklist summary, and contact TradeHub prompt.
- Launch package allows TradeHub-branded or light co-branded readiness only; white-label-ready state is not presented as available for Launch.
- Pro package shows co-branded and white-label-ready readiness controls as package-available, while custom domain remains admin-reviewed.
- Enterprise package shows custom-reviewed branding/domain readiness.
- Super Admin opens `/admin` and sees branding/domain overview with masked workspace refs only.
- Super Admin filters branding/domain records by requested, DNS pending, verifying, active, blocked, and custom review.
- Super Admin records a bounded branding/domain review note and updates domain status in a local test workspace.
- Invalid HTTP logo URL or invalid domain hostname fails closed or is hidden safely.
- Browser UI shows no public prices, file uploads, DNS provider controls, hosting provider calls, raw workspace IDs, raw student IDs, payment refs, provider payloads, secrets, vault refs, or AutoCopy internals.

#### Branding And Domain Manual QA - Nice To Test

- Seed local workspace docs with `branding.brandingMode` values `tradehub_branded`, `co_branded`, and `white_label_ready` and confirm package-aware copy updates.
- Seed `branding.customDomainStatus` values `requested`, `dns_pending`, `verifying`, `active`, `blocked`, and `custom_review` and confirm workspace/admin status tones and prompts.
- Confirm branding/domain cards remain readable on smaller laptop/tablet widths.

#### Branding And Domain Manual QA - Later Regression

- Re-run Stage 27C QA after any workspace branding mapper, workspace dashboard summary, Super Admin overview, admin branding route, package/licence helper, or Firestore rules change.
- Re-check no logo upload, DNS automation, SSL provisioning, Vercel/Cloudflare/provider call, or public package price appears after any sales-copy update.
- Re-check branding/domain route remains Super Admin-only and masked-ref-only after any admin API refactor.

### Stage 27D Enterprise Deployment And SLA Readiness Model

Status: Enterprise deployment/SLA readiness metadata is implemented. Browser UI remains contract-scoped, private-quote only, and does not provision infrastructure, call cloud/hosting providers, automate payments, or enable live execution.

Reference: TH-2026-08-24-STAGE27D-ENTERPRISE-DEPLOYMENT-SLA-HANDOFF

#### Enterprise Deployment Manual QA - Must Test Before Demo

- Workspace opens `/workspace` and sees Enterprise readiness, deployment mode/status, SLA posture, backup/restore state, data-residency state, and contract-scope prompt without public prices.
- Launch and Pro workspaces show standard TradeHub cloud posture and Enterprise agreement required copy.
- Enterprise workspace shows custom-reviewed or contract-scoped deployment/SLA readiness.
- Super Admin opens `/admin` and sees Enterprise deployment/SLA overview with masked workspace refs only.
- Super Admin filters Enterprise deployment records by Enterprise, requested, scoping, security review, contract ready, active, blocked, and custom review.
- Super Admin records a bounded Enterprise note and moves a local test workspace through requested, scoping, security review, ready for contract, active, blocked, and custom review states.
- Confirm workspace and admin copy do not promise automatic dedicated infrastructure, tenant creation, DNS/SSL setup, backup execution, or live execution.
- Browser UI shows no public prices, cloud provider controls, hosting provider calls, raw workspace IDs, raw student IDs, payment refs, provider payloads, secrets, vault refs, account IDs, broker passwords, MetaAPI tokens, API keys, hidden candles, private notes, or AutoCopy internals.

#### Enterprise Deployment Manual QA - Nice To Test

- Seed local workspace docs with `packageLicense.packageTier` set to `enterprise` and `enterpriseDeployment.deploymentStatus` values `requested`, `scoping`, `security_review`, `ready_for_contract`, `active`, `blocked`, and `custom_review`.
- Confirm SLA, backup/restore, data-residency, deployment checklist, and rollback checklist copy updates safely.
- Confirm Enterprise deployment cards remain readable on smaller laptop/tablet widths.

#### Enterprise Deployment Manual QA - Later Regression

- Re-run Stage 27D QA after any workspace package helper, workspace dashboard summary, Super Admin overview, admin Enterprise route, package/licence helper, or Firestore rules change.
- Re-check no infrastructure provisioning, tenant creation, DNS/SSL automation, cloud/hosting provider call, payment automation, live execution, or public package price appears after any sales-copy update.
- Re-check Enterprise deployment route remains Super Admin-only and masked-ref-only after any admin API refactor.

### Stage 27E Enterprise Integration Request Workflow

Status: Enterprise integration request/intake is implemented as support-safe metadata only. Browser UI remains private-quote only and does not build adapters, collect credentials, call providers, publish signals, or enable execution.

Reference: TH-2026-08-24-STAGE27E-ENTERPRISE-INTEGRATION-REQUEST-HANDOFF

#### Enterprise Integration Requests Manual QA - Must Test Before Demo

- Enterprise workspace opens `/workspace` and sees the Enterprise Integration Requests section.
- Enterprise workspace creates a CRM, analytics, broker, Telegram/Discord, external LMS, data export, or custom request with title, description, provider label, safe hostname, priority, sensitivity flags, security review flag, legal/SLA dependency flag, and estimated complexity.
- Launch and Pro workspaces see Enterprise/contact TradeHub copy instead of a custom integration request workflow.
- Workspace request create fails closed or sanitizes safely when the title/description/note contains private URLs, API keys, tokens, webhook secrets, broker passwords, vault refs, provider payload hints, or credentials.
- Workspace request create rejects invalid hostnames, localhost/private hosts, URL paths, query strings, credentials, or private URL shapes.
- Workspace sees safe request status, category, priority, provider label/hostname metadata, workspace-visible note, and review flags only.
- Super Admin opens `/admin` and sees the Enterprise integration queue with masked workspace refs and masked request refs only.
- Super Admin filters requests by category, status, priority, security review, and legal/SLA dependency.
- Super Admin records a bounded internal admin note and bounded workspace-visible note.
- Super Admin moves a request through triage, scoping, approved for build, blocked, completed, rejected, custom review, security review, and legal/SLA review states.
- Confirm browser UI shows no public prices, raw workspace IDs, raw student IDs, credentials, tokens, webhook secrets, provider payloads, payment refs, secrets, vault refs, account IDs, broker passwords, MetaAPI tokens, API keys, hidden candles, answer keys, private notes, or AutoCopy internals.
- Confirm no adapter, external provider call, public webhook receiver, messaging send, signal publish, AutoCopy route, or live order path is created.

#### Enterprise Integration Requests Manual QA - Nice To Test

- Seed a local Enterprise workspace and create multiple requests across categories and priorities to confirm filters and summary counts.
- Try long workspace/admin notes and confirm they are bounded.
- Confirm integration request cards remain readable on smaller laptop/tablet widths.

#### Enterprise Integration Requests Manual QA - Later Regression

- Re-run Stage 27E QA after any workspace package helper, workspace overview, Super Admin overview, Enterprise integration route/helper, admin API refactor, or Firestore rules change.
- Re-check no CRM/payment/analytics/broker/Telegram/Discord/LMS/data-export adapter, provider package, public webhook receiver, credential collection, or external call appears after any integration-related sales-copy update.
- Re-check integration routes remain workspace/Super-Admin protected, Admin SDK-backed, and masked-ref-only after any admin/workspace API refactor.

### Stage 27I Package Sales Readiness Smoke Pack

Status: package sales readiness smoke coverage is implemented. Launch, Pro, and Enterprise package surfaces are source-QA checked for seat caps, no public app prices, Trade Copier add-on separation, metadata-only readiness, Enterprise-only integration intake, deny-by-default storage paths, and frozen MVP references.

Reference: TH-2026-08-24-STAGE27I-PACKAGE-SALES-READINESS-SMOKE-HANDOFF

#### Package Sales Smoke Manual QA - Must Test Before Demo

- Open `/workspace` as a Launch workspace and confirm the package card shows Launch/Creator posture, 50 active-student cap, seats left, support/maintenance state, no price, and Trade Copier as a separate optional add-on.
- Open `/workspace` as a Pro workspace and confirm the package card shows 500 active-student cap, seats left, support/maintenance state, no price, and Trade Copier as a separate optional add-on.
- Open `/workspace` as an Enterprise workspace and confirm custom capacity, support/SLA, branding/domain, deployment/SLA, and integration request posture are contract-scoped/private-quote only.
- Confirm Launch and Pro workspaces see Enterprise/contact TradeHub copy instead of the Enterprise integration request form.
- Open `/admin` and confirm Super Admin sees package/licence, branding/domain, Enterprise deployment/SLA, and Enterprise integration readiness panels.
- Confirm Super Admin panels use masked workspace/request refs only.
- Confirm package, support, maintenance, branding/domain, Enterprise deployment/SLA, and integration actions are metadata-only and do not collect payment or trigger automation.
- Confirm browser UI shows no public package prices.
- Confirm browser UI shows no raw workspace IDs, raw student IDs, payment refs, provider payloads, secrets, vault refs, account IDs, broker passwords, MetaAPI tokens, API keys, private URLs, webhook secrets, hidden candles, answer keys, private notes, or AutoCopy internals.

#### Package Sales Smoke Manual QA - Nice To Test

- Seed package tiers `launch`, `pro`, and `enterprise` locally and confirm `/workspace` copy changes correctly for each package.
- Seed over-limit Launch/Pro workspaces and confirm workspace/admin warnings remain support-safe.
- Seed branding/domain, Enterprise deployment/SLA, and Enterprise integration records in blocked/custom-review/active states and confirm status tones stay readable.
- Test `/workspace` and `/admin` package sales panels on smaller laptop/tablet widths.

#### Package Sales Smoke Manual QA - Later Regression

- Re-run Stage 27I QA after any package/licence, workspace overview, admin overview, branding/domain, Enterprise deployment/SLA, Enterprise integration, Firestore rules, package deck, or sales-copy change.
- Re-check no public app prices appear after pitch/pricing deck edits.
- Re-check Trade Copier remains a separate optional add-on after any AutoCopy or package copy update.
- Re-check Launch/Pro cannot access Enterprise integration intake after any package helper or workspace route refactor.

### Stage 27J Package Sales Readiness Final Freeze

Status: Package Sales MVP is source-QA frozen. Launch, Pro, and Enterprise package-selling claims are source-checked against implementation, pitch/deck posture, metadata-only Enterprise readiness, private quote/no-price UI, and frozen foundation boundaries. Browser/manual sales-demo QA remains required before pitching.

Reference: TH-2026-08-24-STAGE27J-PACKAGE-SALES-MVP-FINAL-HANDOFF

#### Package Sales Final Manual QA - Must Test Before Sales Demo

- Open `/workspace` as a Launch workspace and confirm the package card shows Launch posture, 50 active-student cap, remaining seats, support/maintenance state, no public price, and Trade Copier as a separate optional add-on.
- Open `/workspace` as a Pro workspace and confirm the package card shows Pro posture, 500 active-student cap, remaining seats, support/maintenance state, no public price, and Trade Copier as a separate optional add-on.
- Open `/workspace` as an Enterprise workspace and confirm custom capacity, support/SLA, branding/domain, deployment/SLA, and integration request posture are contract-scoped/private-quote only.
- Confirm Launch and Pro workspaces cannot open the Enterprise integration request form and see contact/upgrade copy instead.
- Open `/admin` and confirm Super Admin sees package/licence, branding/domain, Enterprise deployment/SLA, and Enterprise integration readiness panels with masked refs only.
- Confirm package, support, maintenance, branding/domain, Enterprise deployment/SLA, and integration actions are metadata-only and do not collect payment, provision infrastructure, configure DNS/SSL, create uploads, build adapters, send messages, or trigger execution.
- Open the no-public-pricing pitch/deck source and confirm Launch is up to 50 active students, Pro is up to 500 active students, Enterprise is custom agreement, and no currency-number public prices are shown.
- Confirm Trade Copier is described as a separate optional add-on, not included in Launch, Pro, or Enterprise by default.
- Confirm browser UI shows no raw workspace IDs, raw student IDs, payment refs, provider payloads, secrets, vault refs, account IDs, broker passwords, MetaAPI tokens, API keys, private URLs, webhook secrets, hidden candles, answer keys, private notes, or AutoCopy internals.

#### Package Sales Final Manual QA - Nice To Test

- Seed one workspace per package tier and compare `/workspace` copy side by side.
- Seed support/maintenance states: active, due soon, overdue, waived, suspended, and custom review.
- Seed Enterprise deployment/SLA and integration request states: requested, scoping, ready/approved, blocked, rejected, completed, and custom review.
- Test `/workspace` and `/admin` package-sales panels at desktop, smaller laptop, tablet, and phone widths.
- Walk through the influencer sales demo script from `manual-demo-qa.md` and note any copy that feels too technical for a non-builder audience.

#### Package Sales Final Manual QA - Later Regression

- Re-run Stage 27J QA after any package/licence, workspace overview, admin overview, branding/domain, Enterprise deployment/SLA, Enterprise integration, Firestore rules, package deck, or sales-copy change.
- Re-check no public app/deck prices appear after commercial copy edits.
- Re-check Trade Copier remains a separate optional add-on after any AutoCopy, package, or pitch-deck update.
- Re-check Launch/Pro cannot access Enterprise integration intake after any package helper, workspace route, or entitlement refactor.
- Re-check package sales surfaces after any payment, entitlement, role/access, workspace student activation, or Super Admin overview change.

### Stage 28A Demo Seed Pack

Status: deterministic local/emulator demo seed pack is implemented. It seeds safe Launch, Pro, Enterprise, Super Admin, influencer, student, CRM, package/licence, branding/domain, Enterprise deployment/SLA, Enterprise integration, course, practice, manual journal, assignment/cohort/feedback, and notification metadata without public package prices, credentials, provider payloads, live execution state, or external calls.

Reference: TH-2026-08-24-STAGE28A-DEMO-SEED-PACK-HANDOFF

#### Demo Seed Pack Manual QA - Must Test Before Demo

- Start local Firebase emulators for Auth and Firestore.
- Run `npm run seed:demo`.
- Re-run `npm run seed:demo` and confirm deterministic records are upserted without uncontrolled duplicates.
- Sign in as `demo.student.active@example.test` with `TradeHubDemo!123`.
- Open `/app`, `/app/practice`, `/app/courses`, and `/app/journal`.
- Sign in as `demo.launch.influencer@example.test`, `demo.pro.influencer@example.test`, and `demo.enterprise.influencer@example.test` with `TradeHubDemo!123`.
- Open `/workspace` for each workspace persona and confirm Launch, Pro, and Enterprise package states render safely.
- Sign in as `demo.superadmin@example.test` with `TradeHubDemo!123`.
- Open `/admin` and confirm package/licence, branding/domain, Enterprise, support, AutoCopy readiness, messaging, external signal, and payment/support panels render with safe demo data.
- Confirm Launch shows a 50-seat posture, Pro shows a 500-seat posture, and Enterprise shows custom-review posture.
- Confirm Trade Copier remains a separate optional add-on and is not bundled into Launch, Pro, or Enterprise.
- Confirm browser UI shows no public package prices, real credentials, provider payloads, raw payment refs, vault refs, broker passwords, MetaAPI tokens, API keys, private URLs, webhook secrets, live execution state, or raw private provider data.

#### Demo Seed Pack Manual QA - Nice To Test

- Compare seeded active, pending-onboarding, and payment/access-issue student personas in workspace CRM.
- Open seeded course progress, lesson check, resource, practice session, manual journal analytics, and assignment feedback surfaces.
- Confirm seeded Enterprise integration request and SLA/deployment metadata remain request/readiness-only.
- Test the seeded demo on desktop, smaller laptop, tablet, and phone widths.

#### Demo Seed Pack Manual QA - Later Regression

- Re-run Stage 28A QA and `npm run seed:demo` after any auth, Firestore path, package/licence, workspace dashboard, course, practice, manual journal, assignment, notification, or admin panel schema change.
- Re-check that demo seed scripts never call providers, seed secrets, seed public package prices, enable live execution, or send external messages.

### Stage 28B Playwright Browser QA Foundation

Status: Playwright browser QA foundation is implemented. It adds local-dev browser smoke coverage for public, student, workspace, and Super Admin routes using Stage 28A seeded emulator users, with common guards for runtime crashes, Next.js overlays, public package prices, raw demo IDs, and secret-shaped rendered strings.

Reference: TH-2026-08-24-STAGE28B-PLAYWRIGHT-BROWSER-QA-FOUNDATION-HANDOFF

#### Playwright Browser QA Manual Steps - Must Test Before Demo

- Install dependencies if needed with `npm install`.
- Install the Playwright browser binary if needed with `npx playwright install chromium`.
- Start Firebase emulators: `npm run firebase:emulators`.
- In a second terminal, run `npm run seed:demo`.
- Run `npm run browser:qa`.
- Confirm Playwright opens and checks `/`, `/app`, `/app/practice`, `/app/courses`, `/app/journal`, `/workspace`, and `/admin`.
- Confirm student, workspace/influencer, and Super Admin sign-in helpers pass against the seeded Auth emulator users.
- Confirm failures show readable route names and retain trace/screenshot/video artifacts.
- Confirm rendered pages do not show public package prices, raw demo IDs, demo passwords, provider payloads, vault refs, API keys, broker passwords, webhook secrets, or live execution state.

#### Playwright Browser QA Manual Steps - Nice To Test

- Run `TRADEHUB_BROWSER_REUSE_SERVER=true npm run browser:qa` against an already-running local dev server.
- Run `TRADEHUB_BROWSER_BASE_URL=http://127.0.0.1:3000 npm run browser:qa` to confirm base URL override works.
- Add a temporary broken route locally and confirm the no-error-overlay assertion fails clearly, then revert the local break.

#### Playwright Browser QA Manual Steps - Later Regression

- Re-run `npm run browser:qa` after any auth, route guard, app shell, workspace shell, admin shell, package/licence, course, practice, journal, or dashboard layout change.
- Expand browser smoke coverage only after the first seeded route checks pass consistently.

### Stage 29A Student Home And Course Copy Simplification

Status: owner-accepted on 2026-08-25 after browser review and opaque-black settings-drawer correction.

Reference: TH-2026-08-24-STAGE29A-STUDENT-HOME-COURSE-SIMPLIFICATION-HANDOFF

#### Student Home And Course Copy Manual QA - Must Test Before Demo

1. Sign in as the active demo student.
2. Open `/app`.
3. Confirm Reminder Preferences and messaging-provider language are absent.
4. Confirm Courses, Signals, Copier, Journal, Practice, and Billing remain reachable.
5. Open `/app/courses`.
6. Open an available course and lesson.
7. Check locked, empty, quiz, resource, note, bookmark, completion, and proof states.
8. Confirm no API/server/metadata/Firestore/stage/source-QA wording appears.
9. Confirm answer keys remain hidden before submission.
10. Confirm private learning notes remain student-only.
11. Confirm student cannot access `/workspace` or `/admin`.

#### Student Home And Course Copy Manual QA - Nice To Test

- Run `npm run browser:qa:student` after starting emulators, seeding demo data, and starting the dev server.
- Check `/app/courses` on phone and tablet widths for readable filters, notes, bookmarks, and proof copy.
- Try an account with locked course access and confirm the copy says to contact the instructor without revealing locked lesson resources.

#### Student Home And Course Copy Manual QA - Later Regression

- Re-run Stage 29A QA after any student home, Course list, reader, proof, browser student test, messaging preference, or course access copy change.
- Re-check that dormant messaging preferences remain hidden from ordinary student surfaces unless a future explicit product decision reintroduces them.
- Re-check Course wording after any course authoring, quiz, resource, proof, or private learning data refactor.

### Stage 29B Practice Hub And Sessions Navigation

Status: implemented/source-QA ready. Owner browser testing remains deferred.

Reference: TH-2026-08-24-STAGE29B-PRACTICE-HUB-SESSIONS-HANDOFF

#### Practice Hub And Sessions Manual QA - Must Test Before Demo

1. Sign in as the active demo student and open `/app/practice`.
2. Confirm only the two main Practice choices are emphasized.
3. Open Backtesting Session and confirm the existing session-creation workflow remains available.
4. Return to the hub, open Sessions, and test search, status/symbol/timeframe filters, sorting, and load more when enough sessions exist.
5. Confirm each session shows its name, symbol, asset class, timeframe, status, progress, equity/P&L, strategy, challenge, and updated time when available.
6. Open a session settings drawer. Confirm it closes with the close control, backdrop, and Escape key, and that unsupported setup edits remain read-only.
7. Test Continue, review, report, duplicate setup, archive, and restore actions.
8. Delete a disposable standalone session by typing its exact name. Confirm the progress and success/error states are understandable and the deleted session disappears.
9. Confirm assignment/review sessions cannot be improperly deleted.
10. Confirm another student cannot access or delete the session and that wrong-role access remains blocked.

#### Practice Hub And Sessions Manual QA - Nice To Test

- Open More practice tools and confirm Assigned practice, Strategies, Analytics, Import/export, and Archived sessions remain reachable without crowding the default hub.
- Test the Practice hub, sessions view, settings drawer, and delete confirmation on laptop, tablet, and phone widths.
- Duplicate a completed standalone session and confirm only safe setup is copied, not orders, notes, drawings, bookmarks, reflections, or ledger records.

#### Practice Hub And Sessions Manual QA - Later Regression

- Re-run Stage 29B and Stage 18L QA after changes to Practice session routes, repository cleanup, assignments, feedback, ledger IDs, or the Practice dashboard.
- Re-check bounded deletion cleanup for orders, annotations/drawings, bookmarks, session records, and deterministic practice ledger entries.
- Re-check that assignment/review-linked sessions remain archive-only and direct browser Firestore access stays denied.

## Open Product Decisions

- Confirm MT5 symbols available from the future utility historical-data account.
- Confirm canonical crypto launch symbol set.
- Fold simulated-practice disclaimer into fintech/legal review.
- Decide final home for the `InstrumentSpec` sizing-adapter pattern.

## How We Stop And Resume

Stop point is the latest stage whose builder response says all required QA passed and whose script exists in `package.json`.

Current stop point:

```text
Stage 29C.2 - Expanded Verified Crypto Asset Catalogue
Reference: TH-2026-08-26-STAGE29C2-EXPANDED-CRYPTO-CATALOGUE-HANDOFF
```

Resume by asking Codex:

```text
Continue TradeHub from TH-2026-08-26-STAGE29C2-EXPANDED-CRYPTO-CATALOGUE-HANDOFF. Read complaint.md, complaint-resolution-roadmap.md, plan.md, manual-test-backlog.md, manual-demo-qa.md, prompt/promptsumary.md, package.json scripts, Stage 29C through 29C.2 Practice catalogue/snapshot code, the demo seed, and student browser tests first. Stage 29C.2 is implemented/source-QA ready; owner browser acceptance remains deferred. Stage 29C.3 and Stage 29D remain pending. Preserve student ownership, simulated-only Practice, provider fail-closed behavior, private broker aliases, deterministic offline browser QA, and Stage 29B session-management safety.
```

### Stage 29C Quick Session, Verified Asset Catalogue, And Strategy Simplification

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Automated browser status: `npm run browser:qa:student` passed 7/7 on 25 August 2026 after `npm run seed:demo`. The checks below remain for owner visual acceptance.

Reference: TH-2026-08-25-STAGE29C-QUICK-SESSION-ASSET-STRATEGY-HANDOFF

#### Quick Session Manual QA - Must Test Before Demo

1. Sign in as the active demo student and open `/app/practice`.
2. Open Backtesting Session and confirm the dialog surface is opaque black, compact, scrollable, and keyboard usable.
3. Close with Escape and by clicking the backdrop; confirm focus returns to Backtesting Session.
4. Search Crypto, Forex, and Metals by symbol and readable name.
5. Confirm BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, XRPUSDT, the seven Forex majors, and XAUUSD are the only advertised instruments.
6. Confirm unavailable Forex/Metals entries are disabled and show a safe explanation.
7. Create a session with No strategy, place a simulated order, and confirm it appears in overall results without a Strategy label; then repeat with a Strategy.
8. Test 15 minutes, 1 hour, 4 hours, and 1 day with ranges that stay within the displayed limits.
9. Test +1D, +1W, +1M, and +1Y; confirm each visibly changes the Initial date relative to the End date.
10. Turn on Random start and confirm both visible dates immediately change to a bounded historical window; use the shuffle control to choose another start.
11. Enter an invalid balance, reversed/equal dates, a future date, and an oversized range; confirm creation is blocked with clear copy.
12. Create with Open terminal after creation off and confirm the new session is highlighted in Sessions.
13. Create with Open terminal after creation on and confirm the new terminal route opens.
14. Double-click Create session once and confirm only one session is created.
15. Open Session settings and confirm the Stage 29B drawer remains opaque black.
16. Inspect the replay/terminal UI and browser responses; confirm no provider name, broker symbol suffix, cache hit, or cache identifier appears.

#### Quick Session Manual QA - Nice To Test

- Test the modal at phone portrait, phone landscape, tablet, small laptop, and wide desktop sizes.
- Run `npm run browser:qa:student` after starting emulators, running `npm run seed:demo`, and starting `npm run dev:stage15f`.
- Verify the deterministic seeded BTCUSDT cache supports the July 1-2, 2026 H1 browser scenario without internet access.
- Confirm long Strategy names and asset names truncate cleanly without moving buttons.

#### Quick Session Manual QA - Later Regression

- Re-run Stage 29C, Stage 29B, and Stage 18X QA after changing Practice session creation, historical limits, asset readiness, instrument specs, Strategy storage, or student Practice navigation.
- Re-check that unsupported stocks, exchange futures, agriculture, and leveraged tokens never appear without a later approved catalogue stage.
- Re-check that provider-disabled Forex/Metals cannot be selected or persisted.
- Stage 29C.1 and Stage 29C.2 are implemented below. Stage 29C.3 and Stage 29D remain pending.

### Stage 29C.1 Dynamic Forex And CFD Asset Expansion

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

#### Must Test Before Moving On

1. Start emulators, rerun `npm run seed:demo`, and start `npm run dev:stage15f`.
2. Sign in as the active demo student and open `/app/practice` -> Backtesting Session.
3. Confirm Forex includes majors and crosses such as EURUSD, EURGBP, GBPJPY, AUDCAD, and CADCHF.
4. Confirm Metals includes XAUUSD and XAGUSD.
5. Confirm Indices includes US30, US500, NAS100, GER40, UK100, and JP225.
6. Confirm Energies includes USOIL and UKOIL.
7. Search and select one instrument from each expanded category; confirm the form remains concise and no provider/broker wording appears.
8. Create at least one expanded static-demo session and confirm it opens in Terminal with sensible precision, lot labels, and simulated-only copy.
9. Confirm stocks, exchange futures, and agriculture instruments are absent.
10. Confirm no account ID, broker suffix, credential, token, vault reference, raw provider payload, or live-order action appears in the browser.

#### Real Provider Operator Acceptance - Deferred

- Configure the existing Stage 22B platform utility provider through server env/vault gates, never browser input.
- Confirm only approved symbols actually returned by the utility account and backed by a valid specification appear.
- Confirm broker suffix mapping remains private and canonical names are shown to students.
- Create bounded historical sessions for representative Forex cross, metal, index, and energy instruments.
- Confirm unavailable symbols/specifications/ranges fail closed without partially creating a session.

#### Later Regression

- Run `npm run stage29c1:qa`, `npm run stage29c:qa`, `npm run stage22b:qa`, and `npm run browser:qa:student` after changing discovery, provider aliases, specs, sizing, exports, or Quick Session categories.
- Stage 29C.2 is implemented below. Stage 29C.3 and Stage 29D remain pending until explicit approval.

### Stage 29C.2 Expanded Verified Crypto Asset Catalogue

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

#### Must Test Before Moving On

1. Start emulators, run `npm run seed:demo`, and start `npm run dev:stage15f`.
2. Sign in as the active demo student and open `/app/practice` -> Backtesting Session.
3. Confirm only the compact Asset field is visible initially, then open it with the chevron and confirm All is selected and Crypto shows at least 40 available pairs.
4. Search `LINKUSDT`; confirm one readable result appears, select it, and confirm the catalogue closes.
5. Confirm the Asset field shows `LINKUSDT · Chainlink / Tether`, reopening preserves that selection, and Escape closes only the catalogue while Quick Session remains open.
6. Create the July 1-2, 2026 H1 LINKUSDT session and confirm exactly one session appears under Sessions.
7. Open Terminal and confirm the instrument copy shows price 3 decimal places and quantity 2 decimal places.
8. Place a LINKUSDT simulated market order with tick-aligned SL/TP and confirm it is accepted with a step-aligned quantity.
9. Partially close the order and confirm closed plus remaining quantity equals the original quantity, the close event is step-aligned, and P&L/order state renders.
10. Try a non-tick-aligned SL/TP edit and confirm it fails safely.
11. Confirm the Stage 29C.1 USOIL session flow still works.
12. Confirm unavailable, suspended, malformed, futures, margin-only, leveraged, duplicate, and unapproved stablecoin pairs do not become selectable.
13. Inspect the browser response and UI for no raw filters, exchange response, provider payload, credential, cache ID, raw student/workspace ID, AutoCopy action, or live-order action.

#### Nice To Test

- Search representative Layer 1, Layer 2, DeFi, infrastructure, storage, and payment assets by both symbol and readable name.
- Verify category counts use available instruments only; click outside closes the catalogue; keyboard Enter/Space, arrows, Enter-to-select, and Escape work; and the bounded list remains usable on phone, tablet, and laptop widths.
- Run `TRADEHUB_BROWSER_REUSE_SERVER=true npm run browser:qa:student` after the deterministic seed and dev server are ready.

#### Later Regression

- Run `npm run stage29c2:qa`, `npm run stage29c1:qa`, `npm run stage29c:qa`, `npm run stage22b:qa`, and student browser QA after changing spot metadata validation, cache format, approved symbols, instrument snapshots, sizing, exports, or Quick Session.
- Recheck that stale or failed public metadata makes affected Crypto pairs unavailable instead of falling back to fabricated availability.
- Stage 29C.3 is implemented below. Stage 29D remains pending.

### Stage 29C.3 Broader Forex/CFD Asset Catalogue Completion

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-26-STAGE29C3-FOREX-CFD-CATALOGUE-HANDOFF

Automated browser status: `npm run browser:qa:student` passed 8/8 on 26 August 2026 after deterministic seeding and a correctly configured local dev server. The checklist below remains the owner visual/provider acceptance pass.

#### Must Test Before Moving On

1. Start emulators, run `npm run seed:demo`, and start `npm run dev:stage15f`.
2. Sign in as the active demo student and open `/app/practice` -> Backtesting Session.
3. Confirm the Asset catalogue is collapsed initially and opens above the Quick Session content without clipping.
4. Confirm Forex shows at least 40 available candidates in the configured static-demo environment.
5. Search representative Forex entries, including EURGBP and a non-major pair, and confirm readable canonical names appear.
6. Confirm Metals includes XAUUSD and XAGUSD; Indices includes US30, NAS100, SPX500, GER40, UK100, and JPN225; Energies includes USOIL, UKOIL, and NATGAS.
7. Search FRA40 and confirm it is disabled with a safe unavailable message rather than selectable.
8. Create the seeded EURGBP or USOIL static-demo H1 session for 1-2 July 2026 and confirm exactly one session is created.
9. Open Terminal and confirm instrument-aware price, quantity, tick/pip, sizing, P&L, report, journal, and export labels remain readable.
10. Disable the Forex/CFD provider and confirm the broad catalogue fails closed without creating a session.
11. Confirm provider aliases, utility account details, credentials, cache IDs, and raw payloads do not appear in browser responses or UI.
12. Confirm the Stage 29C.2 LINKUSDT order lifecycle and collapsed Asset picker still work.

#### Nice To Test

- Test search and keyboard selection across every category on phone, tablet, and laptop widths.
- With the approved utility-provider environment configured, verify discovered symbols become available and missing symbols remain disabled.
- Verify unsupported timeframe/date ranges fail safely before session persistence.

#### Later Regression

- Run `npm run stage29c3:qa`, `npm run stage29c2:qa`, `npm run stage29c1:qa`, `npm run stage22b:qa`, and student browser QA after changing provider discovery, canonical aliases, instrument specs, candle normalization, or Quick Session categories.
- Stage 29D remains pending.

### Stage 29D: Practice Terminal Visual Polish And FX Replay Inspired Layout

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-26-STAGE29D-PRACTICE-TERMINAL-VISUAL-POLISH-HANDOFF

#### Must Test Before Moving On

1. Start local Auth/Firestore emulators, run `npm run seed:demo`, then start `npm run dev:stage15f`.
2. Sign in as the active demo student, open `/app/practice`, and open a seeded or newly created terminal.
3. Confirm the first viewport is chart-first with a compact top toolbar, vertical desktop tool rail, opaque right utility panel, floating replay controls, and bottom trading/status bar.
4. Confirm the chart remains readable and no toolbar, event marker, replay control, axis, or bottom-bar content overlaps at laptop width.
5. Open Object tree, Order, Go To, News and events, and Journal. Confirm each tab shows its existing session tools and does not stack every panel at once.
6. Place a simulated Buy or Sell order with valid aligned SL/TP. Confirm the order appears in Object tree, can be focused, and P&L state renders.
7. Use a supported drawing/note tool, select it from Object tree, and delete it where allowed.
8. Pan and zoom the chart before and after replay steps. Confirm event dots move with candle time and hover/click details remain usable.
9. Use Go To and bookmarks, open Indicators, and open report/review/journal shortcuts.
10. Open a completed session and confirm mutation controls remain read-only.
11. Check tablet and phone widths. Confirm the chart remains usable above the tabbed panel and bottom bar has no horizontal page overflow.
12. Confirm the terminal contains no copied third-party branding, provider/private data, AutoCopy action, or live-order action.

#### Nice To Test

- Toggle fullscreen, test replay at each supported speed, and confirm the chart resizes cleanly.
- Test the terminal with BTCUSDT, LINKUSDT, EURGBP, and USOIL to confirm instrument-aware formatting remains readable.
- Run `TRADEHUB_BROWSER_REUSE_SERVER=true npm run browser:qa:student` against an already configured local server.

#### Later Regression

- Rerun Stage 18G event-marker QA and student browser QA after changing chart sizing, utility-panel width, event-lane offsets, or terminal breakpoints.
- Recheck order ticket, challenge status, drawings, bookmarks, report links, and completed-session locks after any terminal component refactor.

### Stage 29D.1: Practice Terminal Workstation Visual Upgrade

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-27-STAGE29D1-PRACTICE-TERMINAL-WORKSTATION-VISUAL-UPGRADE-HANDOFF

#### Must Test Before Moving On

1. Open an untouched active BTCUSDT terminal and confirm at least 24 revealed warm-up candles appear without exposing later candles.
2. Confirm the global TradeHub site header, footer, and dashboard spacing are absent from the terminal route.
3. Confirm 44px desktop tool controls and the horizontal narrow-screen rail remain readable, focusable, and labelled.
4. Confirm unsupported trend, brush, magnet, and unavailable timeframe controls are disabled rather than presented as working.
5. Test supported line, zone, text, measure, zoom, drawing lock, drawing visibility, and selected-drawing delete behavior.
6. Collapse and reopen the utility panel at desktop, tablet, portrait-phone, and landscape-phone sizes.
7. Confirm the top replay controls, chart axes, event lane, and bottom status bar never overlap incoherently.
8. Place and partially/full close a simulated order; confirm P&L and Object tree update normally.
9. Pan/zoom before and after stepping replay; confirm event markers remain aligned and interactive.
10. Open a completed session and confirm drawing/order mutations remain locked.
11. Confirm no copied branding, live execution action, provider payload, account detail, credential, token, or raw internal reference appears.

#### Nice To Test

- Test every supported timeframe and verify unsupported 1m, 3m, 5m, 30m, 2h, W, and M buttons explain their unavailable state.
- Test fullscreen entry/exit and browser zoom at 80%, 100%, and 125%.
- Compare BTCUSDT, LINKUSDT, EURGBP, and USOIL candle/axis formatting.

#### Later Regression

- Run `npm run stage29d1:qa`, Stage 29D/18G QA, and `npm run browser:qa:student` after changing chart ranges, shell routing, drawing tools, or responsive terminal dimensions.

### Stage 29D.2: Practice Terminal Candle Reliability Patch

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-27-STAGE29D2-PRACTICE-TERMINAL-CANDLE-RELIABILITY-HANDOFF

#### Must Test Before Moving On

1. Start Auth/Firestore emulators, run `npm run seed:demo`, and start the dev server.
2. Open the same ETHUSDT terminal that previously showed `0/0` and `TradeHub could not complete that request`.
3. Refresh the page and confirm ETHUSDT terminal should reveal candles in local demo testing.
4. Create a fresh ETHUSDT quick session and confirm the chart reveals the warm-up candles instead of staying blank.
5. Step forward, pan, and zoom; confirm candle count increases normally and event/drawing controls do not crash.
6. Confirm new session creation still rejects unavailable assets, invalid timeframes, invalid date ranges, and empty candle ranges.
7. Confirm browser responses show no hidden candles, secrets, provider payloads, account IDs, raw order refs, or live-execution actions.

#### Nice To Test

- Temporarily block public network access while emulators are running and confirm local Crypto demo sessions still open.
- Test BTCUSDT, ETHUSDT, LINKUSDT, and one Forex/CFD static-demo instrument after reseeding.

#### Later Regression

- Recheck terminal candle loading after changing cache TTL, Binance fetch behavior, emulator seed data, or session replay APIs.

### Stage 29D.3: Practice Terminal Trading Dock And Chart Density Polish

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-27-STAGE29D3-PRACTICE-TERMINAL-TRADING-DOCK-DENSITY-HANDOFF

#### Must Test Before Moving On

1. Open a seeded ETHUSDT or LINKUSDT Practice Terminal at full laptop width.
2. Confirm the bottom dock shows large round Buy and Sell controls, a wide quantity field, and a quick order-ticket button.
3. Click Buy and Sell and confirm the right Order panel focuses without placing any live order.
4. Zoom the chart and confirm candles remain dense enough to show surrounding market structure instead of becoming a single oversized candle view.
5. Confirm the left tool rail icons look larger and usable, not tiny.
6. Resize to a narrow browser width and confirm the dock, chart, and order panel remain usable without horizontal overflow.
7. Confirm simulated-only labels still appear and browser responses show no hidden candles, secrets, provider payloads, account IDs, raw order refs, or live-execution actions.

#### Nice To Test

- Test the same view in Safari on iPad-style width.
- Toggle the right utility panel and confirm the chart gets enough space.
- Place and close one simulated order to confirm the new dock still supports the existing workflow.

#### Later Regression

- Recheck dock sizing after changing terminal footer, chart spacing, tool rail width, or mobile layout rules.

### Stage 29D.4: Practice Terminal Order Ticket Popout Polish

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-27-STAGE29D4-PRACTICE-TERMINAL-ORDER-POPOUT-HANDOFF

#### Must Test Before Moving On

1. Open a seeded ETHUSDT, LINKUSDT, or Forex/CFD static-demo Practice Terminal at full laptop width.
2. Click the dedicated Order control and confirm the order ticket opens as an opaque chart overlay instead of a cramped right-sidebar form.
3. Confirm the popout shows Place Order, Preset, Practice only, side/type controls, entry, SL, TP, risk, size, notes, and Submit simulated order.
4. Click the close button and confirm the ticket closes back to the normal Objects utility tab without leaving ghost overlays.
5. Open the right-side Order tab and confirm it opens the same popout behavior.
6. Reveal at least one candle, submit a simulated order, and confirm no broker or exchange order is placed.
7. Resize to tablet and phone widths and confirm the responsive ticket remains usable without horizontal overflow.
8. Confirm browser responses show no hidden candles, secrets, provider payloads, account IDs, raw order refs, or live-execution actions.

#### Nice To Test

- Test the order popout in Safari/iOS where the right panel and bottom dock previously felt cramped.
- Try closing the ticket with Escape after a browser QA helper adds keyboard coverage later.

#### Later Regression

- Recheck this flow after changing the bottom Buy/Sell dock, right panel tabs, order form fields, or terminal z-index layering.

### Stage 29D.5: Practice Terminal Order Trigger Cleanup And Quick Buy/Sell Behavior

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29D5-PRACTICE-TERMINAL-ORDER-TRIGGER-CLEANUP-HANDOFF

#### Must Test Before Moving On

1. Open a fresh active Practice Terminal with revealed candles.
2. Open the dedicated Order control, enter valid SL/TP values, then close the popout.
3. Click bottom Buy and confirm a simulated Buy market order is created without opening the popout.
4. Click bottom Sell with sell-valid SL/TP values and confirm a simulated Sell market order is created without opening the popout.
5. Click the Order tab/control and confirm only that dedicated control opens the Place Order popout.
6. Change timeframe or click Indicators, Go To, News, Journal, Objects, fullscreen, replay controls, and drawing tools; confirm the Order popout does not open.
7. Confirm disabled tools are visibly disabled or marked coming soon.
8. Confirm no live execution, private provider data, hidden candles, secrets, AutoCopy action, or raw order refs appear.

#### Nice To Test

- Try quick Buy/Sell with missing SL/TP and confirm it uses safe default simulated levels after at least one candle is revealed.
- Retest on Safari with a mouse/trackpad to confirm the popout and dock actions remain distinct.

#### Later Regression

- Recheck this flow after changing terminal bottom dock handlers, utility tabs, order form state, or Playwright terminal selectors.

### Stage 29D.6: Practice Terminal Quick Trade And Tool Feedback Patch

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29D6-PRACTICE-TERMINAL-QUICK-TRADE-TOOLS-HANDOFF

#### Must Test Before Moving On

1. Open a fresh active Practice Terminal and reveal at least one candle.
2. Leave SL and TP empty, then click bottom Buy.
3. Confirm a simulated Buy market order is accepted with quick default SL/TP and the Order popout does not open.
4. Click bottom Sell and confirm the same quick simulated behavior.
5. Open the dedicated Order control, enter custom directional SL/TP, close it, and confirm quick Buy/Sell can still use custom levels.
6. Click cursor, horizontal line, vertical marker, zone, text, measure, zoom, lock, visibility, and delete controls.
7. Confirm working tools show visible dock feedback or open Journal/Review for placement.
8. Confirm coming-soon tools are disabled and do not pretend to work.
9. Confirm no live execution, private provider data, hidden candles, secrets, AutoCopy action, or raw order refs appear.

#### Nice To Test

- Retest tool feedback on Safari with a mouse/trackpad and on a narrow browser width.
- Use Journal/Review to add one drawing after selecting a tool from the rail.

#### Later Regression

- Recheck quick-trade defaults after changing risk sizing, instrument specs, tick validation, bottom dock rendering, or drawing controls.

### Stage 29D.7: Practice Terminal Interactive Tools And Clean Order History

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29D7-PRACTICE-TERMINAL-INTERACTIVE-TOOLS-HISTORY-HANDOFF

#### Must Test Before Moving On

1. Open an active Practice Terminal with at least one simulated order.
2. Confirm the chart history shows compact BUY/SELL order chips without price clutter or +count clutter.
3. Click a BUY or SELL order chip and confirm the right Objects panel opens.
4. Confirm the Practice orders section shows that selected order alone.
5. Click Show all and confirm the order list returns.
6. Select horizontal line, vertical marker, zone, text note, and measure from the left rail.
7. After each tool selection, click the chart and confirm a visible object appears on the chart.
8. Click each created chart object and confirm it opens for editing in Objects.
9. Delete a selected drawing and confirm it disappears.
10. Confirm brush and magnet stay visibly disabled/coming soon.
11. Confirm no live execution, private provider payloads, hidden candles, secrets, AutoCopy action, or raw order refs appear.

#### Nice To Test

- Retest chart-click drawing placement on Safari with a trackpad.
- Retest on tablet and phone widths, especially whether overlay labels stay readable.

#### Later Regression

- Recheck this flow after changing chart overlay positioning, order rendering, drawing APIs, or the right utility panel.

### Stage 29E: Shared App Full-Preview Layout Stabilization

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29E-SHARED-APP-FULL-PREVIEW-LAYOUT-HANDOFF

#### Must Test Before Moving On

1. Start the dev server and open `/app/practice` in full Safari preview.
2. Open the Sessions view.
3. Confirm session names, dates, progress, P&L, Strategy text, and action buttons do not stack letter-by-letter.
4. Confirm the Sessions page uses the available width and no longer looks like a tiny narrow column in the middle of the browser.
5. Confirm the signed-in app header no longer shows the full landing/demo navigation across `/app`, `/workspace`, or `/admin`.
6. Check `/app`, `/app/courses`, and `/app/journal` for the same full-preview width improvement.
7. Check `/workspace` and `/admin` quickly for normal paragraph/button wrapping.
8. Confirm buttons like Continue, Report, Duplicate setup, Archive, and Session settings stay readable.
9. Confirm genuine long token-like refs still do not force horizontal page overflow.

#### Nice To Test

- Resize the browser between full preview, split view, tablet width, and phone width.
- Test light and dark mode.
- Open a practice session settings drawer and confirm it remains opaque and readable.

#### Later Regression

- Rerun `npm run stage29e:qa`, `npm run stage29b:qa`, and browser QA after changing shared shells, text wrapping utilities, buttons, cards, or practice session rows.

### Stage 29D.8: Practice Terminal Compact Side Panel

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29D8-PRACTICE-TERMINAL-COMPACT-SIDE-PANEL-HANDOFF

#### Must Test Before Moving On

1. Open a Practice Terminal with several simulated orders.
2. Open the Objects panel.
3. Confirm the top tab strip uses compact icon buttons and does not show cramped joined labels like ObjectsOrderGo ToNewsJournal.
4. Confirm the panel shows one clear active title such as Object tree.
5. Confirm the Object tree summary shows counts only and does not duplicate order rows.
6. Confirm the Orders section shows short order rows such as Buy closed or Sell open by default.
7. Click one short order row and confirm only that one expanded order card appears.
8. Click Show all and confirm the view returns to the short order list.
9. Click a chart BUY/SELL order chip and confirm the same one-order detail opens.
10. Confirm Order, Go To, News, and Journal tabs still open the correct panels.
11. Confirm no live execution, private provider payloads, hidden candles, secrets, AutoCopy action, or raw order refs appear.

#### Nice To Test

- Retest on Safari split view and a narrow phone-width browser.
- Create more than 20 orders and confirm the hidden-count message appears instead of rendering a long stack of cards.

#### Later Regression

- Recheck after changing right panel width, order history, compact rows, chart chips, or terminal tabs.

### Stage 29D.9: Professional Practice Terminal Chart Tools Engine

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29D9-PRACTICE-TERMINAL-CHART-TOOLS-ENGINE-HANDOFF

#### Must Test Before Moving On

1. Open a Practice Terminal with revealed candles.
2. Select Trend Line and click two revealed chart points.
3. Select Fibonacci and click two revealed chart points.
4. Place a Horizontal Line, Vertical Marker, Rectangle Zone, Text Note, and Measure object.
5. Confirm each object renders on the chart and can be selected by clicking it.
6. Pan and zoom the chart and confirm objects stay aligned with their candle/time positions.
7. Open Objects and confirm compact rows show Orders, Drawings, Events, and Bookmarks without a pile of large cards.
8. Click one object row and confirm only that selected object expands into the editor.
9. Edit label/color/coordinates for one object and save.
10. Press Escape during placement and confirm placement cancels.
11. Select a drawing, press Delete, and confirm it is removed.
12. Confirm bottom Buy/Sell still submit quick simulated market orders without opening the Order popout.
13. Confirm the Order control remains the only normal way to open the detailed order popout.
14. Confirm hidden/future candles, provider payloads, secrets, AutoCopy actions, and live execution controls do not appear.

#### Nice To Test

- Place objects on crypto, Forex, metal, index, and energy practice sessions.
- Test the same tool flow on Safari, tablet width, and phone landscape.
- Create more than 20 drawings and confirm the compact object-tree hidden-count state remains readable.

#### Later Regression

- Recheck after changing chart click handling, time-scale positioning, drawing APIs, object tree rows, keyboard shortcuts, or right-panel layout.

### Stage 29D.10: Practice Terminal Drawing Capture Reliability

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29D10-PRACTICE-TERMINAL-DRAWING-CAPTURE-HANDOFF

#### Must Test Before Moving On

1. Open a Practice Terminal with revealed candles in Safari.
2. Select Horizontal Line and click inside the candle chart area.
3. Confirm a horizontal line appears and Drawings count increases from 0.
4. Select Vertical Marker and click inside the chart.
5. Confirm a vertical marker appears.
6. Select Trend Line, Rectangle Zone, Fibonacci, and Measure, then click two chart points for each.
7. Confirm first click shows the start-point message and second click creates the object.
8. Select Text Note and click the chart.
9. Confirm each created object appears in Objects as a compact row.
10. Pan, zoom, step replay, and confirm drawings stay aligned.
11. Press Escape while a tool is selected and confirm placement cancels.
12. Confirm chart clicks during drawing placement do not open Order, Go To, News, Journal, or unrelated panels.
13. Confirm no hidden candles, provider payloads, secrets, AutoCopy actions, or live execution controls appear.

#### Nice To Test

- Repeat on Chrome and a narrow Safari split-screen window.
- Try clicking near the right price axis and confirm placement stays bounded or safely ignored.

#### Later Regression

- Recheck after changing the chart container, overlays, z-indexes, Lightweight Charts version, object chips, or pointer handling.

### Stage 29D.11: Practice Terminal Advanced Chart Tools Interaction Polish

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29D11-PRACTICE-TERMINAL-ADVANCED-TOOLS-HANDOFF

#### Must Test Before Moving On

1. Start a fresh dev server and hard refresh the browser to avoid stale Next chunks from the previous terminal build.
2. Open a Practice Terminal with revealed candles.
3. Open the Lines menu and confirm Trend Line, Horizontal price line, and Vertical line are active.
4. Confirm Ray, Extended Line, Horizontal Ray, and Cross Line are disabled or marked coming soon.
5. Click a Trend Line start anchor, move with no button held, click the endpoint, and repeat to create multiple trend lines.
6. Drag Fibonacci and confirm mature colored levels/bands render; repeat to create multiple Fibonacci drawings.
7. Select Text, click the chart, type a bounded note, save it, then select/edit/delete that text note.
8. Drag Measure/Ruler upward and downward; confirm up uses blue/green styling, down uses red styling, and the summary shows price difference, percent, and candle count.
9. Select Zoom, drag a rectangle, confirm the chart zooms, then use Zoom out. Press Escape and confirm an active zoom/drawing action cancels.
10. Select one drawing and press Delete; confirm selected-delete and clear-all drawing choices do not remove orders, candles, events, or bookmarks.
11. Open Objects and confirm compact tabs/filters for All, Orders, Drawings, Events, and Bookmarks; details should expand only after selecting an item.
12. Confirm bottom Buy/Sell remain quick simulated orders and only the Order control opens the detailed order popout.
13. Confirm no hidden candles, provider payloads, secrets, AutoCopy actions, or live execution controls appear.

#### Nice To Test

- Repeat the drag tools in Safari with a real mouse/trackpad.
- Create several drawings and verify pan/zoom/replay keeps them aligned.
- Test narrow laptop and phone landscape widths for object panel density.

#### Later Regression

- Recheck after changing chart overlays, z-indexes, pointer capture, line menu controls, drawing persistence, zoom range logic, or object-tree filtering.

### Stage 29D.12: Practice Terminal Clear Drawings And Fibonacci De-Clutter

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29D12-PRACTICE-TERMINAL-CLEAR-DRAWINGS-FIB-DECLUTTER-HANDOFF

#### Must Test Before Moving On

1. Start a fresh dev server and hard refresh the browser to avoid stale Next chunks.
2. Open a Practice Terminal with revealed candles.
3. Create several Fibonacci retracements across different chart areas.
4. Confirm unselected Fibonacci drawings stay quieter and do not repeat full label/price stacks across the chart.
5. Click one Fibonacci and confirm only the selected Fibonacci shows full level labels and prices.
6. Add at least one Trend Line, Zone, Text Note, and Measure drawing.
7. Click the left rail Clear chart drawings trash button; this is the clear all chart drawings action.
8. Confirm every tool-created drawing disappears from the chart and Objects list.
9. Confirm orders, candles, events, bookmarks, reports, assignment feedback, and journal records remain untouched.
10. Repeat after pan, zoom, timeframe change, and replay stepping.
11. Confirm no hidden candles, provider payloads, secrets, AutoCopy actions, or live execution controls appear.

#### Nice To Test

- Recreate many Fibonacci drawings and confirm the chart remains readable before selecting one.
- Use the selected-drawing chip and Objects panel to focus a drawing before clearing all.
- Repeat in Safari split screen and Chrome desktop.

#### Later Regression

- Recheck after changing drawing labels, Fibonacci rendering, chart overlay z-indexes, annotation deletion, or Objects list filtering.

### Stage 29D.13: Practice Terminal Trendline Interaction And Line Tool Menu Fix

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-28-STAGE29D13-PRACTICE-TERMINAL-TRENDLINE-MENU-HANDOFF

#### Must Test Before Moving On

1. Open a Practice Terminal with revealed candles.
2. Select Lines menu > Trend Line.
3. Press, drag diagonally across the chart, and release.
4. Confirm the preview follows the pointer with no button held and the saved Trend Line uses the two clicked anchors.
5. Draw several trendlines with different slopes and lengths.
6. Select Lines menu > Horizontal price line and place one at a clicked price.
7. Select Lines menu > Vertical line and place one at a clicked candle/time.
8. Confirm Horizontal and Vertical lines are not standalone primary rail tools.
9. Pan, zoom, change timeframe, and step replay; confirm all line drawings stay aligned.
10. Open Objects, select one line row, and confirm only that line highlights.
11. Open the Lines menu and confirm the selected-object panel does not show a stale previous object.
12. Click the left Clear chart drawings trash button and confirm all chart drawings disappear.
13. Confirm candles, simulated orders, events, bookmarks, session data, reports, and journal data remain untouched.
14. Confirm no hidden candles, provider payloads, secrets, AutoCopy actions, or live execution controls appear.

#### Nice To Test

- Repeat in Safari with a real mouse or trackpad.
- Lock drawings, pick a line tool, and confirm new drawings are blocked with clear copy.
- Create many line objects and confirm Object filters remain readable.

#### Later Regression

- Recheck after changing chart pointer capture, Lines menu state, drawing persistence, selected-object editor copy, or clear-all drawing behavior.

### Stage 29D.14: Practice Terminal Drawing Reliability Patch

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: TH-2026-08-29-STAGE29D14-PRACTICE-TERMINAL-DRAWING-RELIABILITY-HANDOFF

#### Must Test Before Moving On

1. Stop the dev server, run `npm run clean:next`, restart `npm run dev:stage15f`, and hard refresh Safari/Chrome.
2. Open `/app/practice`, choose a session, and open Terminal.
3. Reveal enough candles for chart tools to be active.
4. Open Lines and confirm the side panel no longer shows a stale previous text/order/drawing selection.
5. Select Trend Line, click the start, move freely to any practical length/slope, and click the endpoint.
6. Confirm the saved trendline follows the two clicked start/end anchors.
7. Draw multiple trendlines with different lengths and slopes.
8. Open Lines again and place Horizontal price line and Vertical line from that same menu.
9. Click clear chart drawings.
10. Confirm all tool-created drawings disappear from the chart and Objects list.
11. Confirm candles, simulated orders, events, bookmarks, session data, reports, and journal data remain untouched.
12. Confirm no hidden candles, provider payloads, secrets, AutoCopy actions, or live execution controls appear.

#### Nice To Test

- Repeat in Safari split view and normal desktop width.
- Try selecting a text note, then opening Lines, and confirm the stale selected text note disappears from the side panel.
- Lock drawings, pick a line tool, and confirm new drawings are blocked with clear copy.

#### Later Regression

- Recheck after changing chart pointer capture, drawing capture z-index, Lines menu state, annotation deletion, selected-object handling, or terminal keyboard shortcuts.

### Stage 29D.15: Practice Terminal Responsive Workstation Layout

Status: owner-accepted with Stage 29D on 31 August 2026.

Reference: TH-2026-08-30-STAGE29D15-PRACTICE-TERMINAL-RESPONSIVE-WORKSTATION-HANDOFF

Automated browser status: seeded student Playwright QA passed 8/8 on 30 August 2026 after a warmed rerun. Real Chrome and Safari owner acceptance was confirmed on 31 August 2026.

#### Accepted Regression Checklist

1. Stop the dev server, run `npm run clean:next`, restart `npm run dev:stage15f`, and hard refresh Safari/Chrome.
2. Open `/app/practice`, choose Sessions, and confirm session titles/metadata do not collapse into letter-by-letter wrapping.
3. Open a Practice Terminal at full preview or laptop width.
4. Confirm the terminal uses the full viewport and the global app header/footer are not visible.
5. Confirm the right utility panel is not squeezing the chart at laptop widths; below xl it should open as a bottom drawer or start collapsed.
6. Confirm candles and the price axis remain readable with the utility panel open and closed.
7. Confirm the bottom Buy/Sell dock wraps cleanly and does not overlap the chart.
8. Resize to tablet width and narrow split view, then reopen Objects, Order, Go To, News, and Journal.
9. Confirm no horizontal page overflow, double scrollbar, giant blank space, hidden candles, provider payloads, secrets, AutoCopy actions, or live execution controls appear.

#### Nice To Test

- Toggle fullscreen after resizing.
- Open the Order ticket under 1280px and confirm it stays in the drawer flow instead of becoming a cramped overlay.
- At xl and wider, confirm the utility panel returns to a compact right-side workstation panel.

#### Later Regression

- Recheck after changing terminal breakpoints, shell overflow, side-panel widths, order-ticket popout classes, bottom dock layout, or Practice Sessions card layout.

### Stage 29D.16: Practice Terminal Drawing Tools Acceptance Fix

Status: owner-accepted with Stage 29D on 31 August 2026.

Reference: TH-2026-08-30-STAGE29D16-PRACTICE-TERMINAL-DRAWING-TOOLS-ACCEPTANCE-HANDOFF

Automated browser status: the complete seeded student suite passes 10/10 in Chromium. The focused production drawing suite passes 2/2 in WebKit at laptop/tablet viewports, including unclipped Lines/Delete bounds and real hit-testing. Separate cold-navigation WebKit coverage also passes twice per viewport from independent seeds and fresh servers. The owner accepted the corrected terminal in real Chrome and Safari on 31 August 2026.

#### Accepted Regression Checklist

1. Open a Practice Terminal and confirm exactly the server-authoritative 24-candle warm-up appears before advancing.
2. Open Lines and confirm its full menu is visible outside the tool rail and inside the viewport. Click the visible Trend Line row, draw using first click, button-free preview, and second click, then confirm it returns to Select. Reselect Trend to draw a second independent line.
3. Draw in empty plotting space before and after the revealed candles and confirm this never reveals another candle.
4. Confirm each Trend Line remains visible and independently selectable, move an endpoint, then place Horizontal price line and Vertical line from the Lines menu. Confirm each tool returns to Select.
5. Select one drawing, open the visible Delete menu outside the rail, and click Delete selected drawing; confirm only that drawing disappears.
6. Add more drawings, reopen Delete, and click Clear chart drawings; confirm every chart drawing disappears while candles, simulated orders, events, bookmarks, reports, journal data, and non-drawing annotations remain.
7. Select Text Note, click the chart, and confirm the compact chart-local editor has no Save/Cancel buttons. Enter `First line` and `Second line` on separate lines, click outside to commit once, edit it with another line, reload, and confirm every intentional line break survives.
8. Draw and remove Fibonacci, Zone, and Measure overlays; confirm Fibonacci levels remain bounded between both x anchors with restrained multilevel styling, Measure is blue upward and red downward, and every completed tool returns to Select.
9. Drag a Zoom Rectangle, confirm the viewport zooms to that range, then click the visible Zoom Out control and confirm a sane candle viewport returns.
10. After the first Trend Line anchor, press Escape and confirm the preview clears, nothing is saved, and Select is restored.
11. Repeat at laptop, tablet, and narrow split-view widths and confirm the Stage 29D.15 bottom drawer before xl and xl side panel remain intact.
12. Confirm only revealed candles are used and no live execution, AutoCopy, provider payload, secret, credential, or payment control appears.
13. Enable SMA, EMA, RSI, ATR, and Volume MA. Confirm SMA/EMA appear on the main chart, the remaining indicators use lower panes, and disabling each removes it.
14. Zoom and pan historically, reveal one candle, then use Play for several candles. Confirm bar spacing and the visible historical anchor do not move. Return to the live edge and confirm new candles continue following without losing zoom.
15. Apply Zoom Rectangle, reveal another candle, then use Zoom Out and confirm the pre-zoom baseline returns.
16. Confirm the Trend draft, completed line, selected endpoints, and reloaded line all use saturated blue `#2962ff`, with no switch back to the gold accent after the second click.
17. Open a blank Text Note and choose another tool; confirm no note is stored and the chosen tool activates. Repeat with Escape. Force a save failure and confirm the editor, exact multiline content, and error remain available to retry.

#### Nice To Test

- Repeat the two-click Trend Line interaction in real Safari and Chrome using a mouse or trackpad; confirm native endpoint handles match the pointer and survive reload, then drag-test Fibonacci, Measure, Zone, and Zoom separately.
- Visually compare the compact automatic Text Note editor and saved blue annotation at laptop/tablet widths; confirm neither behaves like a modal or permanently covers a large chart area.
- Simulate response loss after a committed Clear chart drawings operation and confirm deleted drawings are not visually restored.
- Repeat cold session creation manually in real Safari/Chrome and confirm the terminal remains open; automated WebKit laptop/tablet coverage now passes twice each with protected cleanup.

#### Later Regression

- Recheck after changing pointer capture, drawing persistence, Objects selection, chart overlay z-indexes, chart resize behavior, or responsive workstation breakpoints.

### Stage 29D.17: Practice Terminal Owner Acceptance Closure And Complaint-Roadmap Reconciliation

Status: owner-accepted, closed, and frozen on 31 August 2026.

Reference: TH-2026-08-31-STAGE29D17-PRACTICE-TERMINAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF

- The owner confirmed the Stage 29D.15 responsive workstation and Stage 29D.16 KLineChart tools in real Chrome and Safari.
- Trend placement and saturated-blue appearance, compact automatic multiline Text Notes, bounded Fibonacci, directional Measure, Zoom Rectangle/Out, Delete/Clear, indicators, replay, navigation, and laptop/tablet layouts are accepted.
- Existing Stage 29D.15 and Stage 29D.16 checklists remain here as later-regression coverage, not as pending owner acceptance.
- Practice remains student-owned, revealed-candle-only, and simulated-only. No live execution, AutoCopy, payment, provider, credential, or hidden-candle boundary changed.
- Do not reopen Stage 29D without a reproducible defect. Do not begin Stage 29F as part of this closure.

### Stage 29F: Journal Product Redesign And Data Separation

Status: owner-accepted, closed, and frozen on 3 September 2026. Automated Chromium browser QA passes, and the owner accepted the visual layout, My Trades/Backtesting separation, numerical reconciliation, bounded-cohort warning, and zero/one/multi-point Equity behavior.

Reference: TH-2026-09-03-STAGE29F-JOURNAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF

Automated browser note: after the lifecycle, P&L, coverage, and one-point Equity corrections, `npm run browser:qa:student` passed 10/10. The focused Journal case verified the genuine zero-point empty state; a visible seeded one-point Equity marker and final value `101,452`; open, filled-entry, partial, closed-win, and closed-loss normalization; copied/provider-placed labels; filters; authoritative-closed KPI/equity/calendar math; net `+1,452` agreement across API and rendered Backtesting surfaces; an isolated `-108` loss/drawdown case; exclusion of a closed order with no bounded authoritative session from every Backtesting aggregate; absent/present coverage-warning behavior with one safe excluded-record count; continued exclusion of the unmatched `+9,999` value from all results; Copier-independent Journal Sync status; fixture cleanup; dataset separation; DTO privacy; responsive width; and wrong-role protection. Owner acceptance was confirmed on 3 September 2026, and Stage 29F is closed and frozen.

Closure rule: `/app/journal` remains read-only, manual trade entry stays removed, My Trades and Backtesting remain financially separated, and Journal Sync remains independent from Copier.

#### Must Test Before Adviser Review

1. Sign in as the active demo student and open `/app/journal`.
2. Confirm `My Trades` is selected by default and `Backtesting` is the second compact tab.
3. Confirm there is no Add/Edit trade form, CSV import/export, archive/delete action, manual review link, or AI Insight panel.
4. Inspect Network and confirm `/app/journal` makes no request to `/api/student/journal/manual-trades*`.
5. Confirm seeded paper, testnet, demo, and unconfirmed production fixtures do not appear as real trades.
6. Confirm a provider `filled` entry remains Journal `open`, partial remains `partial`, and only an authoritative closure appears as `closed`.
7. Confirm realized P&L, win rate, average R, equity, drawdown, and calendar values use closed trades only.
8. Confirm the My Trades empty state is honest when no provider-confirmed execution exists and Journal Sync remains `not configured` even if Copier setup exists.
9. Confirm the history summary reports scanned, matched, and visible counts and warns when the bounded scan is truncated.
10. Open Backtesting and confirm Practice analytics load only then, with simulated-only copy, equity/drawdown results, daily calendar, symbol/strategy breakdowns, and report links.
11. For the seeded BTCUSDT result, confirm Simulated P&L, monthly results, BTCUSDT results, Demo Breakout results, and the recent session all show net `+1,452` rather than gross `+1,500`.
12. Confirm the single seeded closed Practice trade renders a visible Equity point and final equity `101,452`; the Backtesting empty-state instruction must be absent.
13. Confirm the clean My Trades zero-point dataset still shows its legitimate Equity empty state.
14. Before adding an unmatched fixture, confirm no coverage warning appears. After adding one unmatched order, confirm a visible warning before the KPIs reports one excluded bounded record without identifiers or diagnostics; that order must not affect `hasClosedTrades`, equity, calendars, symbol/strategy results, challenge results, or session rankings.
15. Switch between tabs and confirm real-account and simulated totals never mix.
16. Resize to laptop, tablet, and narrow widths; confirm tabs, KPI labels, filters, calendar, chart, and rows remain readable with no horizontal overflow.
17. Confirm a workspace or Super Admin account cannot open the student Journal or its connected-trades API.

#### Nice To Test

- Exercise every My Trades filter once confirmed real history exists.
- Check green/red outcome hierarchy with both profitable and losing provider-confirmed records.
- Confirm a provider-manual record is labelled `Placed at provider` while an AutoCopy result is labelled `Copied`.

#### Later Regression

- Recheck after Stage 29G crypto Journal Sync or Stage 29H Forex/MT5 Journal Sync adds approved read-only history ingestion.
- Recheck the historical manual-journal compatibility routes only if a separate migration/archive decision is approved.

### Stage 29G Crypto Journal Sync Must Test Before Adviser Review

Status: implemented/source-QA ready. External Binance/Bybit acceptance and owner acceptance remain pending.

1. Sign in as the active demo student and open `/app/journal`.
2. Confirm `My Trades` remains the default tab and `Backtesting` remains separate.
3. Confirm the compact `Journal Sync` area appears only inside `My Trades`.
4. Confirm Copier purchase, AutoCopy entitlement, execution permission, `exchange_connections`, and Forex provisioning are not required for Journal Sync readiness.
5. With dedicated Journal Sync disabled, confirm connect/sync fails safely and exposes no credentials, provider payloads, raw ids, vault refs, permissions, or diagnostics.
6. With approved local fake transport or real owner-approved read-only credentials, connect Binance/Bybit and select a bounded symbol list such as BTCUSDT and LINKUSDT.
7. Confirm write-capable or ambiguous provider permissions are rejected, including Binance mutation flags such as `enableFixApiTrade` and `enablePortfolioMarginTrading`.
8. Run Sync now and confirm only provider-confirmed crypto history appears in My Trades.
9. Confirm Binance history uses bounded <=24-hour time windows, never mixes `fromId` with `startTime`/`endTime`, and reports truncated or incomplete history safely.
10. Confirm a provider `filled` entry without authoritative closure remains `open`, partial stays `partial`, and fill-derived round trips stay performance-ineligible until starting-basis/closure evidence is authoritative.
11. Confirm copied history remains labelled `Copied`, imported provider-placed history is labelled `Placed at provider`, and the same raw provider execution does not appear as both copied and provider-placed.
12. Confirm partial sync states caused by truncation, skipped/malformed rows, rate limits, request-budget exhaustion, or staging failure do not replace the last complete Journal Sync snapshot or delete prior safe rows.
13. Confirm abandoned-generation cleanup is connection-scoped, lease-aware, and age-bounded so it never deletes another actively syncing connection's generation.
14. Confirm bounded Binance crawl progress resumes across repeated runs without exposing partial generations through the active Journal view.
15. Confirm an empty successful incremental sync keeps prior history visible, and a new incremental sell after a prior-watermark buy preserves the existing position context.
16. Confirm readers see only the active generation during staging, then see the new generation only after the pointer flips.
17. Confirm partial all-symbol crawls retain a frozen crawl boundary and promote watermarks only after every selected symbol has completed that boundary.
18. Confirm copied/Journal dedupe is execution-leg scoped: a copied buy can be deduped while an unmatched provider-manual sell remains visible as execution-only history and does not count as another open position.
19. Confirm first-time connection creation is serialized: a `verifying` placeholder appears before activation, a second simultaneous same exchange/account-label request fails safely, only one credential becomes active, and concurrent first-time creates cannot exceed the connection limit.
20. Confirm expired abandoned first-create placeholders recover safely without deleting or overwriting a later successful credential.
21. Confirm every credential mutation is locked, including the same API key with a rotated/new API secret. Credential replacement must be rejected while a valid sync lease exists, and sync must be rejected while a credential replacement owns the config lock. Exact no-op detection must use a server-keyed credential mutation identifier, not a direct secret hash.
22. Confirm a sync that started with one credential fingerprint/version can load only the exact credential version marker captured at lease start, cannot load pending replacement secret material after config-lock expiry, and cannot commit if the connection changes before final commit.
23. Confirm Secret Manager/local credential replacement is version-aware: successful replacement activates the new metadata before retiring the previous version; failed replacement discards only the attempted version and preserves the previous working credential; retirement cleanup failure creates one bounded `retire_previous_version` task for the old version, failed replacement-version discard creates one bounded `discard_failed_replacement` task for the unactivated attempted version, and neither exposes cleanup targets to the browser.
24. Confirm due credential cleanup retries run from an authenticated server-owned Journal Sync path, query only due retryable tasks oldest-first, claim only a small bounded batch with an owner-token lease, execute the correct discard-vs-retire vault operation, never touch the active credential, back off bounded failures, and leave final failures support-safe.
25. Confirm successful credential or symbol changes reset/retires active generation, pending generation, crawl progress, and watermarks before showing new history.
26. Confirm selected-symbol removal/addition resets or safely reconciles active generation, pending generation, crawl progress, and watermarks so removed symbols disappear.
27. Reload `/app/journal` and confirm safe connection status persists without showing keys, secrets, raw provider ids, raw student/workspace ids, payloads, cleanup targets, lock owners, credential markers, or diagnostics.
28. Disconnect Journal Sync and confirm syncing is disabled first, in-flight syncs cannot write afterward, credential cleanup completes or fails closed with support-safe status, and historical normalized display rows remain safe.
29. Confirm no order placement, cancellation, withdrawal, transfer, leverage, position mutation, AutoCopy execution, payments, Practice, Course, or Signals behavior changed.

#### Nice To Test

- Exercise Binance 429/Retry-After handling with fake transport and confirm capped safe retry behavior.
- Test duplicate provider fills and confirm retry-safe imports do not create duplicate visible rows.
- Test a copied-ledger provider execution and confirm Journal Sync skips or replaces its provider-placed duplicate without deleting the Copier row.
- Test large old/new import snapshots and confirm commits remain below Firestore's 500-write limit.
- Test first sync, empty second sync, incremental new records, buy-then-sell across two syncs, two concurrent connections, staging failure after one or more chunks, readers during staging, disconnect during sync, and partial/truncated sync preserving the last complete generation by invoking the actual exported repository functions against the Auth/Firestore emulator with deterministic provider/vault dependencies.
- Test active-sync replacement race rejection, same-key secret rotation during sync, replacement-first config-lock blocking, expired-config-lock stale-marker rejection, real/local vault stale/retired/discarded/revoked marker rejection, concurrent same-key replacements, keyed exact no-op detection, changed-secret replacement, successful previous-version retirement, failed-replacement rollback/discard, credential replacement reset, selected-symbol removal/addition reset, active/pending generation retirement, abandoned generation cleanup, failed chunk invisibility, pointer visibility before/after activation, simultaneous connections, disconnect during sync, repeated multi-run eight-symbol crawling, copied execution dedupe, and execution-only unmatched sells through the real repository exports in the Auth/Firestore emulator.
- Test failed connection metadata creation, failed replacement-version discard retry/dedupe/success, previous-version retirement retry/dedupe/success, due-batch ordering/starvation prevention, active-version and changed-active-marker cleanup blocking, and credential replacement rollback without exposing credentials, mutation identifiers, cleanup actions, cleanup targets, or vault refs.
- Test quote, base, and unsupported third-token fee currencies.
- Test unknown starting inventory and unmatched sells.

#### Later Regression

- Recheck after Stage 29H Forex/MT5 Journal Sync adds its own read-only history lane.
- Recheck after any provider SDK, credential-vault, or account-linked ledger refactor.
