# TradeHub Handoff - 2026-08-30

This handoff is for a fresh Codex chat continuing TradeHub without needing the previous conversation.

Latest known product reference:

`TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`

Current situation in plain English: TradeHub has many source-QA-frozen product foundations, demo data, and browser QA infrastructure. The Practice Terminal redesign is owner-accepted, closed, and frozen through Stage 29D.17 after real Chrome and Safari acceptance on 31 August 2026. Stage 29E remains the completed Shared App Full-Preview Layout Stabilization stage. Stage 29F Journal redesign was owner-accepted, closed, and frozen on 3 September 2026 with the seeded Chromium suite passing 10/10. Stage 29G Crypto Journal Sync is implemented/source-QA ready with external provider acceptance pending; Stage 29H Forex/MT5 Journal Sync remains unstarted.

Stage 29D.15 verification note: source QA, lint, build, typecheck, and seeded student Playwright QA passed on 30 August 2026. The first student browser run hit one cold-compile timeout on the manual journal review route, then the focused warmed rerun and full warmed suite passed. The owner accepted the responsive workstation in real Chrome and Safari on 31 August 2026.

Stage 29D.16 production correction verification note: the real Practice Terminal uses KLineChart 10.0.3 with TradeHub-owned overlays. `@klinecharts/extension` remains installed for the isolated feasibility spike and is not the production drawing renderer. The complete seeded student suite passes 10/10 in Chromium; focused production drawing correction coverage passes 2/2 in WebKit at laptop/tablet viewports, including unclipped Lines/Delete popovers. Cold login -> Practice -> Open terminal navigation also has separate twice-per-viewport WebKit coverage from independently seeded fresh dev-server processes. The owner accepted the corrected terminal in real Chrome and Safari on 31 August 2026.

## Repository Context

Workspace root:

`/Users/idrissuleiman/Developer/tradehub`

Important project traits:

- Next.js 14 app router project.
- Firebase Auth and Firestore are used for role and demo data flows.
- Firebase Admin SDK is used for server-owned writes.
- The production Practice Terminal uses KLineChart 10.0.3 with TradeHub-owned overlays. `@klinecharts/extension` remains installed for the isolated feasibility spike; `lightweight-charts` remains only in frozen/non-terminal compatibility code.
- Browser tests use Playwright.
- The repo often appears in this shell as not mounted as a Git repository, so do not rely on `git status` or `git diff`.
- Some screenshots/errors came from Safari and stale dev-server state. Always restart cleanly before trusting browser behavior.

## Must-Read Files For The Next Chat

Read these first:

- `prompt/promptsumary.md`
- `plan.md`
- `manual-test-backlog.md`
- `manual-demo-qa.md`
- `complaint.md`
- `complaint-resolution-roadmap.md`
- `package.json`

For the current active area, also read:

- `src/components/student-app/student-practice-client.tsx`
- `src/components/student-app/student-practice-terminal-client.tsx`
- `src/types/practice.ts`
- `src/lib/practice/practice-repository.ts`
- `src/lib/practice/practice-instrument-specs.ts`
- `src/lib/practice/historical-data-service.ts`
- `tests/browser/student-e2e.spec.mjs`
- `tests/browser/helpers/student-flows.mjs`

## Product State By Area

### Practice And Backtesting

Status: MVP source-QA frozen at Stage 18X, then heavily redesigned in Stage 29. The current owner-visible work is not fully accepted yet.

Completed:

- Practice/backtesting routes and APIs exist.
- Student-owned simulated practice sessions exist.
- Session creation, replay, terminal, report, journal integration, assignments, cohorts, feedback, notifications, and workspace aggregate views were built during Stages 18H through 18X.
- Practice remains simulated-only and revealed-candle-only.
- Stage 29A removed confusing student reminder UI from `/app`.
- Stage 29B replaced the long practice page with a focused hub:
  - `Backtesting Session`
  - `Sessions`
- Stage 29B added previous session management with settings drawer, duplication, archive/restore, and protected delete.
- Stage 29C added a quick-session modal with balance, strategy, assets, timeframe, date range, random start, and launch to terminal.
- Stage 29C.2 expanded crypto to 66 approved USDT spot candidates with public Binance `exchangeInfo` validation.
- Stage 29C.3 expanded Forex/CFD catalogue candidates:
  - 42 Forex
  - 2 Metals
  - 6 selectable Indices plus unavailable FRA40
  - 3 Energies
- Stage 29D through 29D.14 repeatedly polished the Practice Terminal and added chart tool logic.

Important practice files:

- `src/types/practice.ts`
- `src/lib/practice/practice-repository.ts`
- `src/lib/practice/practice-fill-engine.ts`
- `src/lib/practice/practice-instrument-specs.ts`
- `src/lib/practice/binance-public-spot-catalogue.ts`
- `src/lib/practice/practice-crypto-spot-allowlist.ts`
- `src/lib/practice/forex-cfd-history-provider-contract.ts`
- `src/lib/practice/metaapi-utility-history-adapter.ts`
- `src/lib/practice/historical-data-service.ts`
- `src/components/student-app/student-practice-client.tsx`
- `src/components/student-app/student-practice-terminal-client.tsx`
- `src/components/student-app/student-practice-replay-client.tsx`
- `src/components/student-app/student-practice-report-client.tsx`
- `src/components/workspace/workspace-practice-insights-section.tsx`
- `src/components/workspace/workspace-practice-assignments-section.tsx`
- `src/app/api/student/practice/sessions/route.ts`
- `src/app/api/student/practice/sessions/[sessionId]/route.ts`
- `src/app/api/student/practice/notifications/route.ts`
- `src/app/api/workspace/practice/cohorts/route.ts`

Resolved and owner-accepted Practice complaints:

- Stage 29D.16 implements two-click Trend Lines, multiple independent lines, Lines-menu Horizontal/Vertical placement, selected deletion, atomic drawing-only clear, multiline Text Notes, focused Fibonacci rendering, directional Measure styling, and Zoom Rectangle/Out.
- Stage 29D.15 preserves the full-height responsive workstation, bounded pre-xl drawer, xl side panel, readable chart minimum, and stable trade dock.
- Practice Sessions retain the full-preview row-layout guard that prevents letter-by-letter wrapping.
- Tool-honesty guards keep unsupported terminal controls disabled rather than presenting them as functional.
- Automated Chromium and WebKit checks pass as supporting evidence; real Safari and Chrome owner acceptance was confirmed on 31 August 2026.

Current design guidance for Practice Terminal:

- Do not try to clone FX Replay exactly.
- Use FX Replay screenshots as workflow inspiration only.
- Every visible tool must be either working or clearly disabled/coming soon.
- Prefer professional, compact chart workstation UX.
- Do not show internal engineering copy to students.
- Keep practice simulated-only.

Practice closure:

1. Stage 29D.15 and Stage 29D.16 are owner-accepted through Stage 29D.17.
2. Stage 29D is closed and frozen unless a new reproducible defect is reported.
3. Do not begin Stage 29F as part of Practice closure.

### Courses And Lessons

Status: Source-QA frozen at:

`TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`

Completed:

- Student course list and lesson reader.
- Search/filter and Continue Learning.
- Course authoring and lesson/module reordering.
- Completion progress and proof page.
- Browser print proof only, no server PDF.
- Lesson checks/quizzes with deterministic server-owned grading.
- Student private lesson notes, bookmarks, and resume points.
- HTTPS-only course resource metadata.
- Course discovery and launch polish.
- Workspace aggregate completion/readiness/resource visibility.

Important files:

- `src/types/course-hub.ts`
- `src/lib/course-hub/course-repository.ts`
- `src/lib/course-hub/course-validation.ts`
- `src/lib/course-hub/course-mappers.ts`
- `src/components/student-courses/student-course-list-client.tsx`
- `src/components/student-courses/student-course-reader-client.tsx`
- `src/components/student-courses/student-course-proof-client.tsx`
- `src/components/course-hub/course-list-client.tsx`
- `src/components/course-hub/course-editor-client.tsx`
- `src/components/workspace/course-visibility-section.tsx`
- `src/app/api/student/courses/[courseId]/completion/route.ts`
- `src/app/api/student/courses/[courseId]/lessons/[lessonId]/check/attempt/route.ts`
- `src/app/api/student/courses/learning-state/route.ts`
- `src/app/api/student/courses/[courseId]/lessons/[lessonId]/notes/route.ts`
- `src/app/api/student/courses/[courseId]/lessons/[lessonId]/bookmark/route.ts`
- `src/app/api/student/courses/[courseId]/lessons/[lessonId]/resume/route.ts`

User status:

- User said course behavior is mostly fine.
- Student-facing copy was simplified in Stage 29A.
- Keep removing engineering terms like API, server-owned, Firestore, metadata, stage, and source-QA from student-facing course screens.

### Workspace Ops, CRM, Payments, And Support

Status: Source-QA frozen at:

`TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF`

Completed:

- Workspace readiness summary.
- Student CRM lifecycle states.
- Influencer support actions and bounded internal notes.
- Safe billing/access indicators.
- Super Admin support overview.
- Payment support queue and reconciliation support.
- Masked payment/settlement/webhook refs.
- Firestore deny-by-default rules for direct browser access to sensitive ops paths.

Important files:

- `src/types/workspace-dashboard.ts`
- `src/lib/workspace/dashboard-mappers.ts`
- `src/lib/workspace/dashboard-validation.ts`
- `src/lib/workspace/dashboard-repository.ts`
- `src/components/workspace/workspace-overview.tsx`
- `src/components/workspace/student-management-section.tsx`
- `src/components/workspace/workspace-billing-panel.tsx`
- `src/components/admin/admin-support-overview.tsx`
- `src/components/admin/paystack-payment-ops.tsx`
- `src/components/admin/payment-support-queue.tsx`
- `src/components/admin/solana-settlement-ledger.tsx`
- `src/app/(super-admin)/admin/admin-page-client.tsx`
- `src/app/api/workspace/students/[studentId]/support/route.ts`

Known product complaint:

- Workspace page is too long and confusing.
- Influencer needs a real navigation shell with focused sections, not one endless scroll.
- Suggested sections:
  - Home
  - Students
  - Signals
  - Courses
  - Practice
  - Copier
  - Billing
  - Branding

### Manual Journal

Status: Manual Journal CRUD/analytics was source-QA frozen at:

`TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF`

But product direction changed after user review. Treat current manual CRUD as legacy/internal, not the final desired Journal product.

Completed:

- Private student-owned manual trade CRUD.
- Manual trade review chart.
- Analytics, daily P&L calendar, CSV import/export, JSON backup.
- Protected student APIs.

Important files:

- `src/types/manual-journal.ts`
- `src/lib/journal/manual-trade-validation.ts`
- `src/lib/journal/manual-trades-repository.ts`
- `src/lib/journal/account-linked-performance-ledger.ts`
- `src/components/student-app/student-journal-client.tsx`
- `src/components/student-app/student-manual-trade-review-client.tsx`
- `src/app/api/student/journal/manual-trades/route.ts`
- `src/app/api/student/journal/manual-trades/[tradeId]/route.ts`
- `src/app/api/student/journal/manual-trades/[tradeId]/review/route.ts`
- `src/app/api/student/journal/manual-trades/analytics/route.ts`
- `src/app/api/student/journal/manual-trades/export/route.ts`
- `src/app/api/student/journal/manual-trades/import/route.ts`
- `src/app/(student)/app/journal/trades/[tradeId]/page.tsx`

New product direction from user:

- Journal should not primarily be a manual trade-entry tool.
- Journal should show analytics from connected real accounts:
  - Bybit
  - Binance
  - MT5/Forex
  - any account linked to TradeHub for journal sync
- Journal-only account connection must be separate from paid Copier access.
- A student should be able to see journal performance without buying Copier.
- Journal should have:
  - `My Trades` as default connected-account analytics.
  - `Backtesting` as a second switchable view.
- `My Trades` should show real account trade summaries, P&L, equity curve, daily/monthly calendar, filters, and trade list.
- `Backtesting` should show the same style but from practice sessions.
- AI Insight should be future-only and removed from current UI.

Recommended future stages:

- Stage 29F: Journal product redesign and data separation.
- Stage 29G: Crypto Journal Sync, read-only Binance/Bybit history.
- Stage 29H: Forex/MT5 Journal Sync, read-only provider or bridge path.

### Forex/CFD Historical Provider

Status: Source-QA completed at:

`TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF`

Completed:

- Server-only Forex/CFD historical provider contract.
- Disabled-by-default env gates.
- MetaAPI utility historical adapter.
- Google Secret Manager loading for operator utility credentials only.
- Normalized candle cache only.

Important files:

- `src/lib/practice/forex-cfd-history-provider-contract.ts`
- `src/lib/practice/metaapi-utility-history-adapter.ts`
- `src/lib/practice/historical-data-service.ts`
- `.env.example`

Constraints:

- No student MetaAPI credentials for practice history.
- No raw provider payloads exposed or stored.
- Forex/CFD availability depends on real provider config and operator credentials.

### Messaging And Reminders

Status: Source-QA frozen at:

`TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF`

Completed:

- Server-only messaging provider contract.
- Dry-run/no-send worker.
- Fail-closed provider placeholders for email, WhatsApp, and SMS.
- Student preferences and suppression gates were built.
- Super Admin overview.

Important files:

- `src/types/messaging.ts`
- `src/lib/messaging/messaging-provider-contract.ts`
- `src/lib/messaging/message-intent-repository.ts`
- `src/lib/messaging/messaging-provider-adapters.ts`
- `src/lib/messaging/messaging-delivery-worker.ts`
- `src/app/api/admin/messaging/overview/route.ts`
- `src/app/api/admin/messaging/worker/run/route.ts`
- `src/app/api/student/messaging/preferences/route.ts`
- `src/components/admin/messaging-readiness-panel.tsx`
- `src/components/student-app/student-messaging-preferences-card.tsx`

Current UX decision:

- Ordinary student home should not show Reminder Preferences.
- Stage 29A removed the preferences card from `/app`.
- Keep backend dormant/compatible, but do not surface it to normal students unless explicitly reintroduced.

### External Signal Ingestion

Status: Source-QA frozen at:

`TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF`

Completed:

- External master-trader/Telegram-style ingestion contracts.
- Super Admin-only mock/manual candidates.
- Parser/moderation/review workflow.
- Source allowlist metadata.
- Workspace read-only preview for approved candidates.

Important files:

- `src/types/external-signal-ingestion.ts`
- `src/lib/signals/external-signal-ingestion-contract.ts`
- `src/lib/signals/external-signal-ingestion-repository.ts`
- `src/components/admin/external-signal-ingestion-panel.tsx`
- `src/components/workspace/external-signal-preview-section.tsx`
- `src/app/api/admin/signals/external-ingestion/overview/route.ts`
- `src/app/api/admin/signals/external-ingestion/candidates/route.ts`
- `src/app/api/admin/signals/external-ingestion/candidates/[candidateId]/review/route.ts`
- `src/app/api/admin/signals/external-ingestion/sources/route.ts`
- `src/app/api/workspace/signals/external-preview/route.ts`

Strict current decision:

- No Telegram connection yet.
- No webhooks yet.
- No scraping.
- No AI parsing.
- No signal publishing from external preview.
- No AutoCopy route from external preview.
- No student visibility for external preview.

### Controlled Live AutoCopy

Status: Source-QA frozen at:

`TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF`

Completed:

- Broad live AutoCopy readiness model and launch gates.
- Controlled live cohort gate.
- Crypto cohort dry-run worker route.
- Reconciliation, incident, and rollback support.
- Final acceptance QA.

Important files:

- `src/types/crypto-execution.ts`
- `src/lib/crypto-execution/broad-live-autocopy-readiness.ts`
- `src/lib/crypto-execution/crypto-execution-repository.ts`
- `src/lib/crypto-execution/crypto-live-production.ts`
- `src/components/crypto-execution/broad-live-autocopy-readiness.tsx`
- `src/components/admin/crypto-execution-ops-panel.tsx`
- `src/components/workspace/crypto-execution-ops-section.tsx`
- `src/components/student-app/student-copier-client.tsx`
- `src/app/api/admin/crypto-execution/live-production/cohort/run/route.ts`

Important user clarification:

- Earlier technical work reportedly placed a Bybit order path but failed due to insufficient funds.
- Forex MT5 execution was reportedly tested successfully.
- That does not mean the full intended multi-student paid Copier workflow is complete.
- The desired final flow is:
  - Student buys Copier separately.
  - Student chooses Forex setup or Crypto setup.
  - Student links the right account type with consent/risk checks.
  - Influencer publishes TradeHub signal or approved external signal source feeds signal.
  - Signal appears in student Signals.
  - If student has paid, configured, consented, and enabled matching Copier type, TradeHub can copy to the correct account only.

Strict current decisions:

- Broad live AutoCopy remains disabled.
- No broad live worker.
- Forex live canary remains separate.
- External signal preview remains non-executable.
- Trade Copier is separate from Launch/Pro/Enterprise packages.

### Package Sales, Licensing, Branding, Enterprise

Status: Source-QA frozen at:

`TH-2026-08-24-STAGE27J-PACKAGE-SALES-MVP-FINAL-HANDOFF`

Completed:

- Internal packages:
  - Launch: 50 active student cap.
  - Pro: 500 active student cap.
  - Enterprise: custom/agreement-scoped.
- Package/license types and server-derived state.
- Seat cap enforcement on student activation.
- Maintenance/support/license health.
- Branding and custom-domain readiness metadata.
- Enterprise deployment/SLA readiness model.
- Enterprise integration request workflow.
- Sales readiness smoke and final freeze.

Important files:

- `src/types/workspace-package.ts`
- `src/types/workspace.ts`
- `src/types/workspace-dashboard.ts`
- `src/types/admin-api.ts`
- `src/lib/workspace/workspace-package-licence.ts`
- `src/lib/workspace/workspace-package-licence-ops.ts`
- `src/lib/workspace/workspace-branding-readiness.ts`
- `src/lib/workspace/workspace-branding-domain-ops.ts`
- `src/lib/workspace/workspace-enterprise-readiness.ts`
- `src/lib/workspace/workspace-enterprise-deployment-ops.ts`
- `src/lib/workspace/workspace-enterprise-integration-requests.ts`
- `src/lib/workspace/workspace-enterprise-integration-ops.ts`
- `src/components/admin/workspace-package-overview-panel.tsx`
- `src/components/admin/workspace-branding-domain-panel.tsx`
- `src/components/admin/workspace-enterprise-readiness-panel.tsx`
- `src/components/admin/workspace-enterprise-integrations-panel.tsx`
- `src/app/api/admin/workspace-package-licences/route.ts`
- `src/app/api/admin/workspace-branding-domain/route.ts`
- `src/app/api/admin/workspace-enterprise-deployment/route.ts`
- `src/app/api/admin/workspace-enterprise-integrations/route.ts`
- `src/app/api/workspace/enterprise-integration-requests/route.ts`

Business decisions:

- Do not show package prices inside app UI.
- Pitch deck should show packages and included features, but prices should require contacting TradeHub.
- Internally discussed prices:
  - Launch: NGN 15m, 50 students.
  - Pro: NGN 70m, up to 500 students.
  - Enterprise: NGN 150m/custom, "anything he wants" but still subject to explicit scope/legal review.
- Trade Copier is not included in Launch, Pro, or Enterprise for now.
- Trade Copier is a separate student-paid add-on.

### Demo Seed And Browser QA

Status: Source-QA frozen at:

`TH-2026-08-24-STAGE28F-FINAL-DEMO-READINESS-HANDOFF`

Completed:

- Deterministic local Firebase emulator seed:
  - `npm run seed:demo`
  - `npm run stage28a:seed`
- Playwright config and browser QA suites.
- Student, workspace/influencer, and Super Admin browser flows.
- Browser safety assertions for:
  - no server errors
  - no Next.js error overlay
  - no public package prices
  - no raw seeded IDs
  - no obvious secret-like strings

Important files:

- `scripts/seed-demo-data.mjs`
- `playwright.config.mjs`
- `tests/browser/tradehub-smoke.spec.mjs`
- `tests/browser/student-e2e.spec.mjs`
- `tests/browser/workspace-admin-e2e.spec.mjs`
- `tests/browser/helpers/auth.mjs`
- `tests/browser/helpers/assertions.mjs`
- `tests/browser/helpers/student-flows.mjs`
- `tests/browser/helpers/workspace-admin-flows.mjs`
- `manual-demo-qa.md`

Known browser setup issues:

- `sh: playwright: command not found` means dependencies are not installed or `node_modules/.bin` is missing. Run `npm install`, then `npx playwright install chromium`.
- `Safari Can't Connect to the Server` means the dev server is not running on that port.
- `FirebaseError: auth/network-request-failed` means Firebase emulator/auth config is not reachable.
- `Cannot find module './1682.js'`, `./9276.js`, or vendor chunk errors usually mean stale `.next` output or mixed dev server state. Run `npm run clean:next`, restart the dev server, then hard refresh.

## Current Tests And Scripts

Core commands used across the project:

```bash
npm run typecheck
npm run lint
npm run build
```

Latest important source-QA scripts:

```bash
npm run stage29d14:qa
npm run stage29d15:qa
npm run stage29d13:qa
npm run stage29d12:qa
npm run stage29d11:qa
npm run stage29d10:qa
npm run stage29d9:qa
npm run stage29d8:qa
npm run stage29d7:qa
npm run stage29d6:qa
npm run stage29d5:qa
npm run stage29d4:qa
npm run stage29d3:qa
npm run stage29d2:qa
npm run stage29d1:qa
npm run stage29d:qa
npm run stage29c3:qa
npm run stage29c2:qa
npm run stage29c1:qa
npm run stage29c:qa
npm run stage29b:qa
npm run stage29a:qa
npm run stage29e:qa
```

Frozen foundation scripts:

```bash
npm run stage28f:qa
npm run stage27j:qa
npm run stage26a:qa
npm run stage25e:qa
npm run stage24c:qa
npm run stage23d:qa
npm run stage22b:qa
npm run stage21d:qa
npm run stage20d:qa
npm run stage19i:qa
npm run stage18x:qa
npm run stage15y:qa
```

Browser QA commands:

```bash
npx playwright install chromium
npm run firebase:emulators
npm run seed:demo
npm run clean:next
npm run dev:stage15f
npm run browser:qa:student
npm run browser:qa:workspace-admin
npm run browser:qa
```

Important note about browser QA:

- Browser QA has passed at various points, including student E2E `8/8` after some Stage 29 work.
- Do not claim browser QA passed for a new change unless it actually ran against a clean dev server, running Firebase emulators, and fresh demo seed.
- The user has repeatedly found issues through manual Safari testing after source QA passed.

## Constraints That Must Not Be Broken

Security and product boundaries:

- Practice/backtesting is simulated-only.
- Practice must never call live broker or exchange order endpoints.
- Practice must expose only revealed candles, never hidden/future candles.
- Do not expose raw provider payloads.
- Do not expose secrets, API keys, tokens, vault refs, account IDs, broker passwords, MetaAPI tokens, raw student IDs, raw workspace IDs, raw order refs, or payment refs.
- Workspace views must be aggregate-safe and must not expose private student records.
- Answer keys must not be exposed before quiz submission.
- Manual/private notes stay student-owned.
- No public package prices in app UI.
- Trade Copier stays a separate optional paid add-on, not part of Launch/Pro/Enterprise.
- External signal preview is not executable.
- Messaging remains dry-run/no-send unless a future real-provider stage is explicitly designed and approved.
- Broad live AutoCopy remains disabled.
- No refunds, payouts, withdrawals, wallet transfers, DNS/SSL/hosting automation, uploaded media, generated PDFs, AI analysis/grading, or paid external services should be introduced casually.

Implementation constraints:

- Use existing repo patterns.
- Use `apply_patch` for manual edits.
- Keep student-facing copy simple and product-focused.
- Avoid engineering words in student screens: API, Firestore, metadata, server-owned, source-QA, stage names.
- If a tool is visible, make it work or mark it disabled/coming soon.
- Do not add huge new abstractions unless they reduce real complexity.
- Do not remove or weaken frozen foundation behavior while fixing UI.

## User Preferences And Important Decisions

The user wants:

- Minimal, clear product screens.
- Sections navigable through focused tabs/shells, not endless scrolling.
- Practice/backtesting to feel close to FX Replay in workflow maturity.
- Quick Session to be clean and focused.
- Many assets where genuinely supported, especially crypto/forex/metals/indices/energy.
- Journal to show real connected-account analytics and backtesting analytics, not manual trade entry as the main product.
- Account linking for Journal to be separate from Copier payment.
- Copier UX to show purchase first, then Forex setup and Crypto setup.
- Signals to be clean cards with symbol, side, entry, SL, TP, copied/executed state, and proper routing boundaries.
- Workspace and Admin to have clear navigation sections.
- Responsive polish can wait until core flows work, but the current Practice Terminal is now a major concern.

The user does not want:

- Reminder Preferences visible on student home.
- AI Insight in Journal now.
- Public package prices in UI or pitch deck.
- Trade Copier bundled with Pro or other workspace packages.
- Admin pages that look like a long confusing pile of internals.
- Workspace pages that force scrolling through unrelated sections.

## Current Acceptance Status

### Stage 29D.16: Practice Terminal Drawing Tools Acceptance Fix

Status: owner-accepted with Stage 29D on 31 August 2026. The behavior below is the frozen regression baseline.

Expected behavior:

- Select Lines, then choose Trend Line.
- First-click the chart to place an unsaved anchor.
- Move the pointer with no button held to preview any practical length/slope.
- Second-click to persist exactly one line and return to Select.
- Multiple trend lines can be drawn.
- Horizontal Line and Vertical Line live inside Lines menu.
- Clear chart drawings atomically removes all saved chart drawings only.
- Selected object delete should also work when an object is selected.
- Clear/delete must not remove candles, orders, events, bookmarks, session, report, or journal records.
- Text tool must let user type naturally.
- Fibonacci should render cleanly with correct colored levels and not become unreadable after repeated use.
- Measure should show blue for positive/up and red for negative/down, with price difference, percent, bar count, and approximate duration.
- Zoom should use drag rectangle, zoom into selected region, and show `Zoom out`.

Changed files:

- `src/components/student-app/student-practice-terminal-client.tsx`
- `scripts/qa-stage29d16-practice-terminal-drawing-tools.mjs`
- focused Stage 29D.16 documentation and browser acceptance guards

Current handoff:

`TH-2026-08-31-STAGE29D17-PRACTICE-TERMINAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

### Stage 29D.15: Practice Terminal Responsive Layout

Status: owner-accepted with Stage 29D on 31 August 2026. The behavior below is the frozen regression baseline.

Expected behavior:

- At laptop/full preview widths, chart should not be squeezed by right panel.
- Right utility panel should become an overlay/drawer or collapse sooner.
- Terminal should use the full viewport and not show global app header/footer.
- Bottom dock should remain usable and not overlap chart content.
- Candles and price axis should remain readable.
- No horizontal overflow.
- No giant blank/scrolled layout.

Likely files:

- `src/components/student-app/student-practice-terminal-client.tsx`
- `src/components/student-app/student-practice-client.tsx`
- `scripts/qa-stage18h-practice-terminal-responsive-polish.mjs`
- `scripts/qa-stage29e-app-wide-layout-stability.mjs`

Recommended stage name:

`Stage 29D.15: Practice Terminal Responsive Workstation Layout`

Suggested handoff target:

`TH-2026-08-30-STAGE29D15-PRACTICE-TERMINAL-RESPONSIVE-WORKSTATION-HANDOFF`

### Problem 3: Practice Sessions Page Can Collapse Text Vertically

Symptoms from user screenshots:

- Session title/metadata text rendered one character per line.
- Full preview page became a narrow column in the center.
- Filters and session card content looked broken.

Likely cause:

- Grid/flex columns too narrow, text containers not protected by `min-width: 0`, truncation, and responsive breakpoints.

Fix:

- Give session rows/cards stable minimum widths.
- Add `min-w-0`, `truncate`, `overflow-hidden`, and responsive layout breakpoints.
- Avoid placing long metadata into narrow grid cells.
- Add QA guard checking vertical-letter collapse.

### Problem 4: Dev Server And Stale Chunk Failures

Errors seen:

- `Safari Can't Connect to the Server`
- `Cannot find module './1682.js'`
- `Cannot find module './9276.js'`
- `Cannot find module './vendor-chunks/@opentelemetry.js'`

Fix process:

```bash
npm run clean:next
npm run dev:stage15f
```

Then hard refresh browser. If port 3000 is stale, use the actual printed local URL or restart the server.

### Problem 5: Firebase Auth Emulator Failures

Errors seen:

- `FirebaseError: Firebase: Error (auth/network-request-failed).`
- Seeded login remains on `/login`.

Fix process:

```bash
npm run firebase:emulators
npm run seed:demo
```

Then sign in again.

Demo credentials used repeatedly:

- Student: `demo.student.active@example.test`
- Pro influencer: `demo.pro.influencer@example.test`
- Launch influencer: `demo.launch.influencer@example.test`
- Enterprise influencer: `demo.enterprise.influencer@example.test`
- Super Admin: `demo.superadmin@example.test`
- Password: `TradeHubDemo!123`

If Launch or Enterprise influencer password fails, reset emulators and rerun `npm run seed:demo`.

## Recommended Next Steps

Do not jump to new product areas yet. Finish the current Stage 29 complaint-resolution work first.

### Step 1: Accept Drawing Tools In Browser

Stage 29D.16 is owner-accepted through Stage 29D.17. Stage 29D is closed and frozen; Journal redesign begins separately at Stage 29F.

Acceptance goal:

- Make Trend Line two-click, preview-driven, and reliable.
- Move Horizontal/Vertical into Lines menu.
- Fix delete/clear-all behavior.
- Fix Fibonacci clutter/delete.
- Fix Text input.
- Fix Measure blue/red behavior.
- Fix Zoom rectangle and Zoom out.

Verification:

```bash
npm run stage29d16:qa
npm run stage29d15:qa
npm run stage29d14:qa
npm run stage29d13:qa
npm run stage29d11:qa
npm run stage18x:qa
npm run stage28f:qa
npm run stage15y:qa
npm run typecheck
npm run lint
npm run build
```

Manual owner test is required. Source QA is not enough for this.

### Step 2: Journal Redesign

Build a new stage after the terminal is accepted.

Goal:

- Remove manual trade entry as the main Journal workflow.
- Default Journal to connected-account analytics.
- Add Backtesting analytics tab using practice data.
- Keep Journal-only account linking separate from Copier.

Important: Do not require Copier purchase for Journal read-only account sync.

### Step 3: Copier And Signals UX

Build after Journal direction is clear.

Goal:

- Copier purchase-first page.
- After purchase, show Forex setup and Crypto setup.
- Signals page should show clean signal cards and correct copied/executed state.
- Keep execution guarded and separate from external previews.

### Step 4: Workspace And Super Admin Navigation

Goal:

- Replace long scroll pages with role-specific navigation shells.
- Workspace needs focused sections.
- Super Admin needs focused sections.
- Default views should show summary and urgent action only.

## Stage 29D.16 Completion Record

- The authenticated production terminal initializes KLineChart 10.0.3 with TradeHub-owned overlays. `@klinecharts/extension` remains installed for the isolated feasibility spike; lightweight-charts remains installed only for frozen/non-terminal compatibility and is absent from the real Practice Terminal.
- Pointer cancellation now releases capture, clears Trend/drag/text/native-move drafts, removes the native preview, saves no drawing, and restores Select through the shared cancellation path.
- Long Text Notes keep their original bounded multiline value while compact blue chart text wraps and truncates display rows inside its bounded hit area without a permanent card. The owner accepted this behavior in real Chrome and Safari on 31 August 2026.
- The chart receives only the authoritative revealed candle slice. Direct future-index requests are clamped to the persisted session boundary.
- Trend Line uses a first-click anchor, button-free solid preview, and second-click persistence; Fibonacci, Measure, Zone, and Zoom retain pointer-owned drags.
- Default Trend draft, saved geometry, selected endpoints, and reload restoration use versioned saturated blue `#2962ff`. Legacy unversioned Trends that inherited the old accent default render blue, while explicit user color choices remain unchanged.
- All drawing and zoom tools are one-shot and return to Select. Students reselect Trend before creating another independent line.
- Versioned `klinecharts_v1` points preserve legacy drawing records and allow overlays anywhere in the plotting canvas, including empty space before and after revealed candles.
- Native KLine overlays are the sole saved-geometry renderer and own selection/control points. Explicit interaction stacking and pointer-release reconciliation persist KLineChart's authoritative moved points across Chromium and WebKit.
- Lines and Delete render as viewport-clamped fixed popovers outside the scrolling rail. Chromium and WebKit laptop/tablet tests verify the menus extend beyond the rail, remain inside the viewport, and receive real pointer hits through `elementFromPoint`.
- Delete selected drawing and Clear chart drawings are distinct Delete-menu actions; clear-all is one bounded atomic student-scoped batch and reconciles authoritative state after a lost response.
- Text Note uses a compact chart-anchored automatic editor with no Save/Cancel controls. Outside completion writes one valid note, blank/too-short drafts and Escape write nothing, and failed persistence retains the editor, exact multiline text, and error.
- Intentional newlines survive creation, persistence, retrieval, editing, reload, and compact blue chart-text rendering while retaining bounded validation.
- A TradeHub-owned bounded Fibonacci replaces the stock full-pane overlay; all seven restrained retracement levels and translucent fills stop at its two x anchors.
- Measure is blue when dragged upward and red when dragged downward.
- Zoom Out sits above the active drawing capture layer and restores a sane baseline viewport after one or more Zoom Rectangle actions.
- One-shot tools return to Select after save, and Escape cancels only the active chart action.
- Complete student coverage passes 10/10 in Chromium. The focused production drawing suite passes 2/2 in WebKit at laptop/tablet sizes. It checks unclipped Lines/Delete bounds and pointer hits, first-click non-persistence, blue Trend draft/save/reload plus legacy-default conversion, empty pre/post-candle plotting, bounded Fibonacci geometry, compact automatic Text Note commit/blank dismissal/failure retention, every supported tool, one-shot restoration, native endpoint movement and exact reload restoration, selected delete, committed-response-loss clear reconciliation, Zoom Rectangle/Out, reveal-boundary attacks, and cleanup.
- Post-login navigation uses one cross-lifecycle atomic guard and one same-origin document redirect. Student helpers wait for exact-path network-idle settlement without fallback navigation.
- Quick Session, assignment, and resubmission terminal entry use the Next app router so cold route compilation cannot return the browser to Practice. The cold login -> Practice -> Open terminal flow passes twice at each WebKit laptop/tablet viewport from separate seed operations and fresh dev-server processes, with captured responses and protected cleanup.
- SMA/EMA use the KLineChart candle pane; RSI, TradeHub ATR, and Volume MA use explicit lower panes. Browser assertions verify indicator names, pane IDs, revealed-only result lengths, and removal.
- The first data load fits once. Next Candle and Play preserve bar spacing and the rendered x-coordinate of a historical anchor, live-edge viewports continue following, and Zoom Rectangle stores its baseline before mutation so Zoom Out remains coherent after replay.
- Stage 29D.15 responsive shell markers and breakpoints remain protected by the strengthened `stage29d16:qa`.
- Practice remains revealed-candle-only and simulated-only, with no AutoCopy, live execution, provider, credential, or payment change.

Current handoff:

`TH-2026-08-30-STAGE29D16-PRACTICE-TERMINAL-DRAWING-TOOLS-ACCEPTANCE-HANDOFF`

## Stage 29D.17 Owner Acceptance Closure Record

Reference: `TH-2026-08-31-STAGE29D17-PRACTICE-TERMINAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

- On 31 August 2026, the owner confirmed the corrected Practice Terminal works in real Chrome and Safari.
- Stage 29D.15 responsive-workstation behavior and Stage 29D.16 KLineChart drawing behavior are owner-accepted.
- The accepted architecture is KLineChart 10.0.3 with TradeHub-owned overlays. Trend, compact automatic Text Notes, bounded Fibonacci, directional Measure, Zoom Rectangle/Out, selected deletion, atomic clear, indicators, replay, navigation, and laptop/tablet responsive behavior are accepted.
- Practice remains student-owned, server-authoritative revealed-candle-only, and simulated-only. No live execution, AutoCopy, payment, provider, credential, or hidden-candle boundary changed.
- Stage 29D is closed and frozen unless a new reproducible defect is reported.
- Stage 29E remains the completed Shared App Full-Preview Layout Stabilization stage. The remaining complaint roadmap is Stage 29F Journal redesign, 29G Crypto Journal Sync, 29H Forex/MT5 Journal Sync, 29I Copier, 29J Signals, 29K Telegram, 29L Workspace, 29M Super Admin, and 29N final freeze.
- At the time of Stage 29D.17 closure, Stage 29F and later stages were unstarted and not accepted by that Practice closure. Current status below supersedes that historical note: Stage 29F is now owner-accepted, closed, and frozen as of 3 September 2026.

Current handoff:

`TH-2026-08-31-STAGE29D17-PRACTICE-TERMINAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

## Final Warning For New Codex

Stage 29D owner acceptance is complete. Future work should preserve the accepted terminal and reopen it only for a new reproducible defect.

For future terminal regressions, the accepted baseline is:

- The user can open Practice Terminal in Safari/Chrome.
- The layout is clean and not cramped.
- Tools do what their icons imply.
- Trend Line, Fib, Text, Measure, Zoom, and Delete behave in a way the user recognizes from professional charting tools.
- No confusing implementation copy appears.
- No security boundaries are weakened.

## Stage 29F Journal Redesign Completion Record

Reference: `TH-2026-09-03-STAGE29F-JOURNAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

- Stage 29F is owner-accepted, closed, and frozen on 3 September 2026, and automated Chromium browser QA passes. The owner accepted the Journal visual layout, My Trades/Backtesting separation, numerical reconciliation, bounded-cohort warning, and zero/one/multi-point Equity behavior.
- Closure rule: `/app/journal` remains read-only, manual trade entry stays removed, My Trades and Backtesting remain financially separated, and Journal Sync remains independent from Copier.
- `/app/journal` defaults to `My Trades` and lazily loads a separate `Backtesting` view.
- The main Journal no longer loads or shows manual CRUD, CSV import/export, archive/delete actions, manual review navigation, or AI Insight. Historical manual records and protected routes remain preserved.
- The new student-scoped connected-journal GET route only returns explicitly provider-confirmed real executions and omits raw workspace, student, source-record, connection, provider, credential, and diagnostic data.
- Provider execution status and public Journal lifecycle are separate. Raw `filled` is an open filled entry unless authoritative provider-confirmed closure exists; public lifecycle is `open`, `partial`, or `closed`.
- Realized P&L, win rate, average R, equity, drawdown, and calendar summaries use authoritative closed records only.
- Paper, testnet, sandbox, demo, practice, dry-run, blocked, failed, and unconfirmed ledger records cannot appear as real trades.
- Copied and provider-placed origins remain distinct. Journal Sync readiness is independent from Copier exchange connections, Forex provisioning, AutoCopy entitlement, and execution permissions.
- History uses a newest-first, student-scoped `updatedAt` query bounded to 200 records. Analytics use the complete filtered bounded result before the 100-row display slice, and responses report scanned, matched, visible, `hasMore`, and truncation metadata.
- Backtesting reuses the existing protected Practice analytics route and remains simulated-only and financially separate from My Trades.
- Backtesting uses one shared closed-order net-result calculation for session KPIs, equity/drawdown, daily/monthly, symbol, strategy, and recent-session results. Persisted fees replace the fee-bps estimate while spread and slippage remain additive; the seeded gross `+1,500` less `48` costs reconciles to net `+1,452` throughout, and an isolated `-108` case verifies loss and drawdown signs.
- The net-result helper requires explicit authoritative session assumptions and cannot substitute zero costs. Analytics use one bounded session-backed order cohort for every result and expose safe session/order/eligible/closed/excluded counts when unmatched orders are left out.
- Backtesting renders a restrained coverage warning before its KPIs only when unmatched bounded order records are excluded. It uses a correctly pluralized safe count and contains no session, order, student, workspace, or diagnostic details.
- The shared Equity chart treats zero, one, and multiple points truthfully. One completed trade renders a visible marker and labelled final equity without showing the empty-state instruction; the seeded Backtesting state renders `101,452`. Two or more points retain the existing equity and drawdown paths.
- Stage 29D remains owner-accepted and frozen. Stage 29G Crypto Journal Sync is implemented/source-QA ready with external provider acceptance pending. Stage 29H is not started.
- Source QA, Stage 29E, Stage 29D.17, typecheck, lint, build, deterministic seed, and the complete corrected Chromium rerun pass. The 10/10 browser run includes zero/one-point Equity assertions, final equity `101,452`, isolated open/filled-entry/partial/closed-win/closed-loss fixtures, net `+1,452` reconciliation, the isolated `-108` loss/drawdown case, consistent exclusion of a closed unmatched-session order, absent/present safe coverage-warning assertions, continued exclusion of its `+9,999` value from every result, filters, lifecycle KPIs, equity/calendar values, source labels, fixture cleanup, Journal dataset separation, no manual-trades request, responsive width, and wrong-role protection. Owner acceptance was confirmed on 3 September 2026; Stage 29F is closed and frozen.

Current handoff:

`TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`

## Stage 29G Crypto Journal Sync Completion Record

Reference: `TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`

Status: implemented/source-QA ready. External Binance/Bybit provider acceptance and owner acceptance remain pending.

- Added dedicated student-owned Journal Sync for Binance and Bybit read-only crypto history.
- The system does not require Copier purchase, AutoCopy entitlement, execution permission, execution `exchange_connections`, or Forex provisioning.
- Added protected student APIs under `/api/student/journal/crypto-sync` for overview/connect, sync now, and disconnect.
- Added a separate `journal_crypto_keys` credential namespace. Production fails closed unless vault configuration is explicitly ready; local/mock storage is development-only.
- Provider adapters are server-only and use fixed Binance/Bybit hosts. They contain only permission and history reads: Binance `/sapi/v1/account/apiRestrictions` and `/api/v3/myTrades`; Bybit `/v5/user/query-api` and `/v5/execution/list`.
- The correction pass implements Bybit V5 GET auth with timestamp/API key/receive-window/query-string signing, requires `readOnly === 1`, accepts legitimate read-only permission arrays, rejects every nonzero Bybit `retCode`, rejects malformed or mutation-capable Binance permissions including `enableFixApiTrade` and `enablePortfolioMarginTrading`, retrieves Binance history through documented <=24-hour `startTime`/`endTime` windows without combining `fromId`, and walks Bybit history backward through bounded seven-day windows plus `nextPageCursor`.
- Sync is bounded by approved symbols, history duration, page count, window count, record count, response bytes, decimal length, timeouts, retries, and capped `Retry-After` backoff.
- Imports use opaque deterministic server keys scoped to the Journal connection identity and store only normalized provider-confirmed Journal history. Copied/Journal dedupe uses a separate server-only provider execution identity derived from stable raw provider order/execution values that both ingestion paths can see; it does not combine masked refs, raw student ids, raw workspace ids, or internal connection ids with provider execution refs.
- Complete replacement snapshots and incremental delta syncs are distinct. Empty successful incremental syncs retain existing history, while incremental new records stage retained active-generation rows plus the new delta so a sell after a prior-watermark buy does not lose position context.
- Snapshots use generation-specific import entries, one active generation pointer, and Firestore write chunks below 500 operations. Staging never overwrites active-generation documents; readers query the active generation at Firestore query time before browser-visible limits are applied; the pointer flips only after every staging chunk succeeds; activation clears generation lease metadata; old generations are retired only after verifying the connection pointer no longer references them; abandoned staging generation cleanup is connection-scoped, lease-aware, and age-bounded. Bounded Binance crawl progress is stored separately from the active history pointer, freezes one crawl boundary, carries per-symbol completed watermarks through partial runs, and promotes only after every selected symbol reaches that boundary. Truncated, skipped, malformed, rate-limited, budget-exhausted, failed-staging, or otherwise incomplete provider snapshots remain partial and cannot delete or replace the last complete snapshot. No raw provider payloads, account ids, raw connection ids, credentials, vault refs, permissions, diagnostics, or source ids are returned to the browser.
- Credential and selected-symbol changes are synchronization configuration changes. Every credential mutation, including same API key plus rotated secret, coordinates with the sync lease through a short-lived config lock; exact no-op submissions use a server-keyed credential mutation identifier and can avoid unnecessary credential-version creation. Production fails closed if the keyed mutation posture is unavailable, and legacy records without the new identifier are treated conservatively as replacements. Replacement rejects while a valid sync is running, sync rejects while replacement owns the config lock, sync loads only the exact credential version marker captured in connection metadata, the vault refuses stale/pending/retired/discarded/revoked/mismatched markers before provider requests, and the final commit rechecks owner-token, lock ownership, credential fingerprint, and credential version. Successful replacement activates the new credential metadata before retiring the previous Secret Manager/local version. If post-activation retirement fails, the new connection remains active and one idempotent server-only retryable cleanup task is recorded for the old version; repeated cleanup failures are bounded and never target the active version. Failed replacement discards only the attempted version and restores the previous working credential metadata/version. Replacement resets or retires active generation, pending generation, crawl progress, and watermarks before new credentials or symbol selections become ready, preventing one account or symbol set from inheriting another account's imported history.
- First-time Journal Crypto connection creation is serialized with a student-scoped `verifying` placeholder and an owned configuration lock before any credential can activate. Credential storage and final activation are bound to that owner token; final activation verifies the expected pending credential marker, expected verifying state, no active sync lease, and no disconnect/revocation state. Concurrent first-time creates for the same exchange/account label cannot both store credentials, concurrent first-time creates cannot exceed the connection limit, failed first-create cleanup discards only the version created by that request, and expired abandoned placeholders recover through a later owner-safe verification.
- Credential cleanup retries are wired into the authenticated Journal Sync overview path. Each invocation queries only due retryable work ordered oldest-first, processes a bounded batch, atomically claims tasks with an owner-token lease, and rechecks cleanup action, target version, intended student connection, expected active marker, and lease ownership before any vault call. Failed replacement-version cleanup creates a targeted `discard_failed_replacement` task and the worker calls discard only; previous-version cleanup creates a targeted `retire_previous_version` task and the worker calls retirement only. Future, resolved, blocked, and final-failed tasks do not occupy the due batch. Successful retry resolves the existing task, repeated failures are deduped with bounded backoff/final-failure state, changed active markers block before vault work, and browser responses never return cleanup actions, targets, version markers, lock owners, vault refs, or internal details.
- Guard phrase for future QA: credential replacement resets or retires active and pending imported history before replacement becomes ready.
- Shared server-only provider execution identities reconcile existing provider-confirmed copied ledger records at execution/order-leg level, so the same execution cannot appear as both copied and provider-placed while a copied buy plus provider-manual sell still retains the unmatched sell as execution-only history that does not count as another open trade.
- The per-connection snapshot reconciliation plan is executable in QA and never reconciles from a partial provider result.
- Added Firestore emulator-backed repository lifecycle coverage that invokes the actual exported connect/sync/disconnect/overview repository functions with injected deterministic provider/vault dependencies. It covers first-time placeholder serialization, same-logical-connection first-create races, first-create marker drift, concurrent connection-limit enforcement, abandoned placeholder recovery, production-wired cleanup invocation, action-specific failed-replacement discard retry, previous-version retirement retry, due-only oldest-first cleanup selection, future/resolved/blocked/final-failed starvation prevention, cleanup worker claim/lease concurrency, active-target and changed-active-marker cleanup blocking before vault calls, bounded cleanup final failure, active-sync credential replacement races, same-key secret rotation during sync, replacement-first config-lock blocking, expired-config-lock stale-marker rejection, real/local vault stale/retired/discarded/revoked marker rejection, concurrent same-key replacements, keyed exact no-op detection, changed-secret replacement, successful previous-version retirement, failed-replacement rollback/discard, bounded cleanup retry/dedupe/success, selected-symbol removal/addition resets, failed staging chunks, active-pointer visibility, simultaneous connections, disconnect during sync, repeated multi-run eight-symbol Binance crawling, copied execution dedupe, and execution-only unmatched sells.
- Spot reconstruction remains conservative. Raw provider `filled` means an execution occurred, not that the Journal trade is closed. Fill-derived spot round trips remain performance-ineligible unless an authoritative starting-basis/closure checkpoint exists. Missing fees remain unknown, unsupported fee currencies taint the affected lot/symbol, base-asset fees reduce received quantity, and unknown starting inventory, unmatched sells, incomplete history, truncation, or malformed rows cannot create realized P&L.
- Every sync re-verifies read-only permissions, applies a student-scoped owner-token single-flight lease and cooldown, captures the credential fingerprint/version marker at sync start, verifies the same marker again in the final commit transaction, enforces a total sync work timeout shorter than the lease, rechecks lock ownership and disconnected state before ledger commit, uses bounded/direct connection lookup, and advances per-connection watermarks only after complete snapshots. Disconnect disables sync first and then deletes cloud secret material or erases local ciphertext/sensitive metadata; cleanup failure records a durable support-safe cleanup item and due cleanup retries are processed by the server-owned overview path with a leased, action-specific worker. The deterministic fake provider transport hard-fails in production, newly stored credentials are discarded/revoked if first-time connection metadata fails, and production credential replacement uses Secret Manager version pinning plus local versioned encrypted storage so a failed replacement can discard the failed version and preserve the previous working credential.
- `/app/journal` keeps the owner-accepted Stage 29F layout and adds a compact My Trades Journal Sync panel with safe states only. Backtesting remains unchanged and financially separate.
- Firestore browser rules deny direct access to Journal crypto credential, connection, sync-run, and import paths.
- No execution endpoints, live orders, AutoCopy routing, payments, Practice behavior, Course behavior, Signals behavior, messaging sends, or provider-private payload exposure was added.
- Stage 29H Forex/MT5 Journal Sync remains unstarted.

Current handoff:

`TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`
