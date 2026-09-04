# TradeHub Prompt Summary

This file is a living handoff summary for TradeHub. It is not the full prompt archive and it is not an instruction file by itself. Use it to understand what the original MVP covered, what has been added since, where the build currently stops, and what prompts should come next.

Current reference:

```text
TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF
```

Current implementation stop:

```text
Stage 29G - Crypto Journal Sync
```

Selected launch-expansion status:

```text
Four launch-expansion tracks were selected:
1. Real Forex/CFD historical data provider - completed at Stage 22B
2. External messaging/reminders outside the app - source-QA frozen at Stage 23D
3. External master-trader / Telegram-style signal ingestion - source-QA frozen at Stage 24C
4. Controlled broad live AutoCopy execution - Stage 25A readiness audit, Stage 25B cohort gate, Stage 25C crypto cohort dry-run rollout, Stage 25D incident/reconciliation hardening, and Stage 25E final acceptance freeze completed/source-QA frozen
```

Remaining prompt count:

```text
Stages 27A/27B/27C/27D/27E/27I/27J added internal package/licence status, seat caps, support windows, maintenance state, Super Admin licence ops, package-aware branding modes, custom-domain readiness metadata, Enterprise deployment/SLA readiness metadata, Enterprise integration request/intake metadata, package sales readiness smoke coverage, and final package-sales acceptance. Stage 28A adds deterministic local/emulator demo seed data for Launch, Pro, Enterprise, student, workspace, Super Admin, course, practice, manual journal, package, and Enterprise flows. Stage 28B adds Playwright browser QA infrastructure for real route smoke checks. Stage 28C adds seeded student browser E2E coverage across app home, practice, courses, journal, preferences, and cross-role blocking. Stage 28D adds seeded workspace and Super Admin browser E2E coverage across package/licence, CRM, practice/course/assignment, branding/domain, Enterprise, payment/support, messaging, external signal, and live AutoCopy readiness surfaces. Stage 28E tightens helper reuse, wrong-role reliability, auth diagnostics, and browser QA runbooks. Stage 28F freezes internal build/demo readiness with final source-level acceptance QA and final runbook categories. Package Sales MVP and internal demo readiness are source-QA frozen; complete real browser/manual sales-demo QA and commercial/legal review before sales.
```

Explicitly removed from the remaining plan:

- Uploads, file hosting, paid video hosting, and stored media workflows.
- Refunds, payouts, withdrawals, wallet-transfer automation, and money-movement automation beyond existing verification/support visibility.
- AI grading, AI trade analysis, AI coaching, AI search, and AI-generated recommendations.

Manual QA is intentionally deferred into:

```text
manual-test-backlog.md
```

The working roadmap source remains:

```text
plan.md
```

---

## Original MVP Boundary

The original MVP was planned as 14 prompts.

| Prompt | Stage | Original MVP Goal |
|---|---|---|
| 01 | Project scaffold and architecture baseline | Next.js 14 App Router, TypeScript, Tailwind, linting, folder structure, route groups, and environment templates. |
| 02 | Locked design system implementation | Shared TradeHub UI tokens, dark/light surfaces, typography, focus states, and motion rules. |
| 03 | Mock data and domain models | Typed models and seed/mock data for workspaces, students, courses, lessons, signals, journals, applications, payment intents, and revenue metrics. |
| 04 | Marketing landing page and application flow | Public landing page, application form, policy links, and investor-facing payment/partner references. |
| 05 | Authentication and role routing | Firebase Auth, role detection, protected routes, invite routing, and workspace resolution foundation. |
| 06 | Super Admin dashboard and onboarding CRM | Internal owner dashboard for applications, vetting, workspace creation, platform revenue, payments, disputes, and health. |
| 07 | Influencer onboarding wizard | Workspace setup, branding, Code of Conduct, Telegram bot token step, pricing, Paystack, optional Solana payout, and first-course prompt. |
| 08 | Influencer dashboard and management | Influencer home, student list/search/filter, alerts, revenue overview, course list, and signal posting UI. |
| 09 | Course Hub | Course/lesson CRUD, YouTube embed flow, lesson progress, locking rules, notes safeguards, attachments, and quiz-ready states. |
| 10 | Student mobile app shell | Student Home, Courses, Signals, Copier, Journal, theme toggle, hero card, and transitions. |
| 11 | Payments: Paystack subscriptions | Paystack checkout, webhook verification, splits, subscription status, grace states, and receipts. |
| 12 | Payments: Solana Pay / USDC checkout | Optional Solana Pay/USDC checkout, transaction/reference verification, split recipient checks, and idempotency. |
| 13 | Payments hardening and settlement operations | Payment reconciliation, lifecycle visibility, webhook clarity, subscription operations, and settlement workflows. |
| 14 | Journal, trust/safety, policies, and launch hardening | Journal stats, privacy controls, policy pages, CSV export sanitization, security headers, Firestore rules/tests plan, audit hooks, and final QA. |

Original MVP stop rule: stop after Stage 14 unless a specific investor/demo need pulls a post-MVP item forward.

---

## What We Added Beyond The Original MVP

These additions were not in the original Stage 01-14 MVP table, or were much smaller there and later expanded.

### AutoCopy And Execution Gates

- Stage 15A-15T: crypto AutoCopy foundations, Binance/Bybit setup, paper routing, sandbox/testnet proof, production beta gates, paid Crypto AutoCopy lifecycle, and production canary safety boundaries.
- Stage 15O-15X: Forex paper AutoCopy, MetaAPI demo proof, paid Forex AutoCopy provisioning, Paystack Forex lifecycle, production live-canary framework, and the corrected student UX where normal students enter broker details only, not MetaAPI tokens.
- Stage 15Y: account-linked Journal and AutoCopy Performance Ledger foundation.

Important boundary: broad production trading and production/live Forex are still not enabled by default. The system remains heavily gated with dry-run, vault, workspace/platform, consent, allowlist, and Super Admin controls.

### Practice / Backtesting Product

The backtesting section became a full practice product, not just a small journal add-on.

- Stage 17A: historical data and practice/backtesting foundation.
- Stage 17B: chart replay UI shell with server-side forward-bias-safe candle reveal.
- Stage 17C: simulated market/limit/stop orders and conservative fill engine.
- Stage 17D: order tickets, editable SL/TP, partial close, and practice ledger entries.
- Stage 17E: practice performance analytics.
- Stage 17F: playbooks and playbook performance.
- Stage 17G: completed-session review/reflection and completed-session locks.
- Stage 17H: practice annotations and main lesson.

### Practice Terminal

- Stage 18A: full-screen practice terminal shell.
- Stage 18B: terminal order ticket and fast simulated trade actions.
- Stage 18C: drawings/notes, horizontal lines, zones, vertical markers, and measurement placeholders.
- Stage 18D: revealed-candle-only indicators: SMA, EMA, RSI, ATR, and Volume MA.
- Stage 18E: navigation, bookmarks, timeframe selector, Go To, and random start.
- Stage 18F: practice challenge rules.
- Stage 18G: event markers with filters, hover/click details, bottom event lane, and chart-time positioning.
- Stage 18H: responsive terminal polish.

### Practice Data, Reports, And Management

- Stage 18I: safe practice import/export and playbook import.
- Stage 18J: historical provider expansion with practice Forex/CFD symbols and fail-closed static demo provider.
- Stage 18K: instrument specs and sizing accuracy for BTCUSDT, ETHUSDT, XAUUSD, and Forex majors.
- Stage 18L: practice session management dashboard with search, filters, archive, restore, and setup-only duplicate.
- Stage 18M: broader analytics and session comparison.
- Stage 18N: protected practice session report and browser-only Print / Save PDF.

### Workspace Practice Layer

- Stage 18O: workspace-safe aggregate practice insights.
- Stage 18P: workspace practice assignments and drills.
- Stage 18Q: instructor feedback and rubric.
- Stage 18R: review queue and resubmissions.
- Stage 18S: cohorts, assignment scheduling, and student task inbox.
- Stage 18T: cohort roster picker and assignment calendar polish.
- Stage 18U: in-app practice notifications and task reminders.
- Stage 18V: practice MVP freeze and browser smoke pack.
- Stage 18W: practice launch copy, empty states, and onboarding polish.
- Stage 18X: final practice MVP source acceptance, deferred manual QA organization, and next-area handoff.

Important boundary: workspace views remain aggregate-safe and masked. They must not expose raw student trades, hidden candles, raw journal entries, notes/reflections beyond approved feedback surfaces, provider payloads, credentials, account IDs, vault refs, broker passwords, MetaAPI tokens, exchange IDs, or AutoCopy internals.

### Course And Lesson Product Track

- Stage 19A - Course And Lesson Experience Audit Foundation: course and lesson experience audit foundation and new product-area start, with source-level QA for student course surfaces, workspace Course Hub management, entitlement/subscription gates, student-owned progress, validation boundaries, and clearer empty/helper copy. Reference: TH-2026-08-20-STAGE19A-COURSE-LESSON-AUDIT-HANDOFF.
- Stage 19B - Course Navigation And Lesson Authoring Ergonomics: course navigation, lesson outline, mobile reader polish, workspace reorder controls, safer lesson removal, and draft/published preview clarity. Reference: TH-2026-08-20-STAGE19B-COURSE-NAV-AUTHORING-HANDOFF.
- Stage 19C - Course Progress, Completion, And Proof Of Completion: course progress summaries, server-derived completion state, browser-printable completion proof, and aggregate-safe workspace completion visibility. Reference: TH-2026-08-20-STAGE19C-COURSE-COMPLETION-PROOF-HANDOFF.
- Stage 19D - Lesson Checks And Quiz Readiness, No AI Grading: deterministic lesson checks, server-owned objective grading, required-check completion gating, safe student attempt feedback, and aggregate-safe workspace readiness counts. Reference: TH-2026-08-20-STAGE19D-LESSON-CHECKS-NO-AI-HANDOFF.
- Stage 19E - Student Lesson Notes, Bookmarks, And Resume Points: private student notes, lesson bookmarks, resume points, Continue learning, own notes/bookmark search, and aggregate-safe workspace learning activity counts. Reference: TH-2026-08-20-STAGE19E-STUDENT-LESSON-NOTES-BOOKMARKS-HANDOFF.
- Stage 19F - Course Resources And Attachments Polish: HTTPS-only course resource metadata polish, grouped student resource cards, workspace editor resource previews, and aggregate-only resource counts. Reference: TH-2026-08-20-STAGE19F-COURSE-RESOURCES-ATTACHMENTS-HANDOFF.
- Stage 19G - Course Discovery, Lesson Search, And Learning Shortcuts: accessible-only lesson/resource search, richer `/app/courses` discovery filters, private learning shortcuts, and workspace aggregate-safe Course Hub filters. Reference: TH-2026-08-20-STAGE19G-COURSE-DISCOVERY-SEARCH-HANDOFF.
- Stage 19H - Course Launch Polish And Smoke Pack: course launch polish and source-level smoke coverage for student learning/proof flow, workspace instructor flow, core routes/APIs, and security boundaries. Reference: TH-2026-08-20-STAGE19H-COURSE-LAUNCH-SMOKE-HANDOFF.
- Stage 19I - Course/Lesson MVP Final Acceptance Freeze: course/lesson MVP is source-QA frozen with final acceptance QA for student/workspace flows, protected APIs, Firestore posture, and source-level privacy/security boundaries. Reference: TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF.

Important boundary: course/lesson work must not change payment gates, role security, practice/backtesting, AutoCopy, MetaAPI, Binance/Bybit, broker, vault, or live execution logic. Attachments/resources remain HTTPS URL metadata only; no paid video hosting, uploads, external messaging, AI grading, generated PDF storage, external quiz providers, external note/resource providers, external search providers, public note/resource sharing, click tracking, analytics tracking, or new payment flows were added in Stage 19A, Stage 19B, Stage 19C, Stage 19D, Stage 19E, Stage 19F, Stage 19G, Stage 19H, or Stage 19I.

### Workspace Ops, CRM, Payments, And Support Track

- Stage 20A - Workspace Ops, Student CRM, Payments, And Support Audit Foundation: started the ops product area after Practice and Courses were source-QA frozen. Added safe workspace readiness summaries, student CRM operational counts and support refs, masked payment reference display, aggregate-only admin support overview, and source-level QA for protected ops/payment/support boundaries. Reference: TH-2026-08-21-STAGE20A-OPS-CRM-PAYMENTS-SUPPORT-HANDOFF.
- Stage 20B - Workspace Student CRM Lifecycle And Support Actions: added server-derived CRM lifecycle states, safe detail summaries, aggregate readiness cards, protected workspace support follow-up/note/status actions, bounded internal support note validation, and explicit Firestore denies for direct browser access to workspace student CRM records. Reference: TH-2026-08-21-STAGE20B-WORKSPACE-STUDENT-CRM-LIFECYCLE-HANDOFF.
- Stage 20C - Payment And Subscription Ops Reconciliation Support: added workspace-safe billing issue indicators, admin payment support queue summaries, hashed/masked payment support refs, and clearer Super Admin reconciliation guidance while keeping existing checkout, Paystack/Solana verification, entitlement gates, refunds/payouts, provider behavior, and student billing unchanged. Reference: TH-2026-08-21-STAGE20C-PAYMENT-SUBSCRIPTION-OPS-HANDOFF.
- Stage 20D - Ops, CRM, Payments, And Support Final Smoke Freeze: final source-level smoke/acceptance pass for workspace readiness, CRM lifecycle/support actions, bounded internal notes, payment/subscription indicators, Super Admin support/payment queue, masked refs, Firestore deny rules, and frozen Stage 18X/19I boundaries. Reference: TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF.

Important boundary: Stage 20A, Stage 20B, Stage 20C, and Stage 20D do not add refunds, payouts, withdrawals, wallet transfers, new payment providers, messaging, uploads, PDFs, screenshots, paid services, external support tools, provider credential flows, AutoCopy permission expansion, or live execution behavior. Stage 20B support notes are workspace-only bounded summaries and are not student-facing. Stage 20C payment support queue items use safe hashed/masked refs and do not expose raw provider/payment payloads. Stage 20 ops/support MVP is source-QA frozen at Stage 20D. Practice/backtesting remains source-QA frozen at TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF, and the course/lesson MVP remains source-QA frozen at TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF.

### Manual Trading Journal Track

- Stage 21A - Manual Trading Journal CRUD Foundation: added private student-owned manual trade types, bounded server-side validation, protected student list/create/update/archive APIs, `/app/journal` manual trade CRUD UI with filters/search, server-derived P&L/R/outcome fields, and Firestore deny-by-default protection for manual journal trade records. Reference: TH-2026-08-21-STAGE21A-MANUAL-JOURNAL-CRUD-HANDOFF.
- Stage 21B - Manual Trade Review Chart: added protected single-trade review API, `/app/journal/trades/[tradeId]` review page, chart panel with entry/exit/SL/TP price lines from approved practice historical candle providers, detailed metrics/notes/strategy/tags display, archived read-only state, and bounded private review editing shortcuts. Reference: TH-2026-08-21-STAGE21B-MANUAL-TRADE-REVIEW-CHART-HANDOFF.
- Stage 21C - Manual Journal Analytics, Calendar, Import/Export, And Final Polish: added protected private manual journal analytics, symbol/strategy/tag/emotion/mistake/setup-quality breakdowns, daily P&L calendar rows, manual trades CSV export, analytics CSV export, safe JSON backup, pasted CSV import with strict server validation, and `/app/journal` dashboard polish. Reference: TH-2026-08-21-STAGE21C-MANUAL-JOURNAL-ANALYTICS-FINAL-HANDOFF.
- Stage 21D - Manual Journal MVP Final Acceptance Freeze: final source-level acceptance pass for manual journal CRUD, review chart, analytics, calendar, import/export, safe backup, protected routes, Firestore posture, and source-level privacy/security boundaries. Reference: TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF.

Important boundary: Stage 21A, Stage 21B, Stage 21C, and Stage 21D are journal-only and execution/payment isolated. Manual trades remain student-owned and private-first. Workspace users do not see raw manual trade rows, review details, private notes, lesson learned text, tags, strategies, emotions, mistake categories, setup quality details, or raw student IDs. Stage 21B uses only approved practice historical candle services for chart context and fails closed when candles are unavailable. Stage 21C import/export is bounded, student-owned, and excludes hidden practice candles, AutoCopy internals, provider payloads, credentials, vault refs, account IDs, payment refs, webhook payloads, and secrets. Stage 21D marks the Manual Journal MVP as source-QA frozen. No broker/exchange execution, private Binance/Bybit APIs, student MetaAPI credentials, Paystack/Solana provider calls, AI analysis/grading, uploads, PDFs, screenshots, messaging, paid services, external trade providers, or AutoCopy internals were added.

### Real Forex/CFD Historical Data Provider Track

- Stage 22A - Real Forex/CFD Historical Provider Contract And Vault Gate: added a server-only Forex/CFD historical provider contract, disabled-by-default real-provider env gates, platform utility vault readiness checks, canonical/provider symbol mapping helpers, bounded request validation, normalized candle output expectations, safe provider readiness previews, and source QA while keeping real provider fetching disabled until Stage 22B. Reference: TH-2026-08-22-STAGE22A-FOREX-CFD-HISTORY-CONTRACT-HANDOFF.
- Stage 22B - Server-Only Forex/CFD Historical Adapter MVP: added the first server-only MetaAPI utility historical candle adapter behind Stage 22A gates, with Google Secret Manager credential loading, bounded provider requests, strict candle normalization, normalized-only cache storage, safe provider failures, static demo separation, and source QA. Reference: TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF.

Important boundary: Stage 22A said Stage 22B should add the real adapter behind these gates, and Stage 22B did so without changing practice replay or execution boundaries. Stage 22A/22B add platform-managed Forex/CFD historical data only. Practice/backtesting MVP remains source-QA frozen at Stage 18X. Manual Journal MVP remains source-QA frozen at Stage 21D. No live broker/exchange execution, AutoCopy execution change, private Binance/Bybit API use, student MetaAPI credentials, student broker passwords, student account IDs, vault refs, provider tokens, raw provider payloads, hidden candle exposure, paid services, uploads, screenshots, PDFs, AI, refunds, payouts, withdrawals, wallet-transfer automation, or Firestore rule weakening was added.

---

## Current Product Stage

We are now at:

```text
Stage 29G - Crypto Journal Sync
Reference: TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF
```

The current package scripts include QA through:

```text
npm run stage29g:qa
```

## Selected Remaining Roadmap

Use this order for future builder prompts unless a production bug interrupts it. The launch-expansion tracks through Stage 25E are now source-QA frozen, and Stage 26A added the browser demo pack.

1. Stage 25A: Broad Live AutoCopy Production Readiness Audit And Launch Gates. Completed.
2. Stage 25B: Controlled Live AutoCopy Cohort Gate. Completed.
3. Stage 25C: Controlled Crypto Live AutoCopy Cohort Rollout. Completed.
4. Stage 25D: Live AutoCopy Reconciliation, Incident, And Rollback Hardening. Completed.
5. Stage 25E: Controlled Live AutoCopy MVP Final Acceptance Freeze. Completed/source-QA frozen.
6. Stage 26A: Manual Browser QA Pack And Demo Readiness Fixes. Completed.
7. Stage 27A: Package Entitlements, Seat Caps, And Licence Model. Completed/source-QA ready.
8. Stage 27B: Package Billing Terms, Maintenance Windows, And Admin Licence Ops. Completed/source-QA ready.
9. Stage 27C: Workspace Branding, Custom Domain Readiness, And White-Label Controls. Completed/source-QA ready.
10. Stage 27D: Enterprise Deployment And SLA Readiness Model. Completed/source-QA ready.
11. Stage 27E: Enterprise Integration Request Workflow. Completed/source-QA ready.
12. Stage 27I: Package Sales Readiness Smoke Pack. Completed/source-QA ready.
13. Stage 27J: Package Sales Readiness Final Freeze. Completed/source-QA frozen.
14. Stage 28A: Demo Seed Pack. Completed/source-QA ready.
15. Stage 28B: Playwright Browser QA Foundation. Completed/source-QA ready.
16. Stage 28C: Student End-to-End Browser QA. Completed/source-QA ready.
17. Stage 28D: Workspace And Super Admin End-to-End Browser QA. Completed/source-QA ready.
18. Stage 28E: Browser QA Bug-Fix And UX Polish Pass. Completed/source-QA ready.
19. Stage 28F: Final Demo Readiness Freeze. Completed/source-QA frozen.

Recommended next: return Stage 29G for adviser review, then perform real read-only Binance/Bybit provider acceptance with approved non-production credentials before claiming provider or owner acceptance. Stage 29H Forex/MT5 Journal Sync remains unstarted and should not begin until Stage 29G is accepted or explicitly paused.

Do not resume the removed tracks unless the owner explicitly reverses this decision: uploads/file or video hosting, refunds/payouts/withdrawals automation, and AI features are out of the remaining plan.

Recent confirmed verification from builder responses:

- `npm run stage22b:qa`
- `npm run stage22a:qa`
- `npm run stage18w:qa`
- `npm run stage18x:qa`
- `npm run stage18v:qa`
- `npm run stage18u:qa`
- `npm run stage18t:qa`
- `npm run stage18s:qa`
- `npm run stage18r:qa`
- `npm run stage18p:qa`
- `npm run stage18o:qa`
- `npm run stage15y:qa`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run stage19a:qa`
- `npm run stage19b:qa`
- `npm run stage19c:qa`
- `npm run stage19d:qa`
- `npm run stage19e:qa`
- `npm run stage19f:qa`
- `npm run stage19g:qa`
- `npm run stage19h:qa`
- `npm run stage19i:qa`
- `npm run stage20a:qa`
- `npm run stage20b:qa`
- `npm run stage20c:qa`
- `npm run stage20d:qa`
- `npm run stage21a:qa`
- `npm run stage21b:qa`
- `npm run stage21c:qa`
- `npm run stage21d:qa`

Manual testing is still deferred because the owner is busy at school. Keep adding manual checks to `manual-test-backlog.md` instead of blocking progress on live manual QA.

Frozen foundations:

- Practice/backtesting MVP is frozen at Stage 18X.
- Course/lesson MVP is frozen at Stage 19I.
- Ops/CRM/payments/support MVP is frozen at Stage 20D.
- Manual Journal MVP is source-QA frozen at Stage 21D.
- Package Sales MVP is source-QA frozen at Stage 27J.
- Demo Seed Pack is source-QA ready at Stage 28A.

---

## Backtesting Finish Plan

The backtesting section is now closed out at Stage 18X. Keep this section as historical implementation context and move future roadmap work to a separately chosen TradeHub product area.

### Stage 18V - Practice MVP Freeze And Browser Smoke Pack

Purpose: Stop adding major practice/backtesting features and make the existing practice terminal reliable enough to demo.

Implemented scope:

- Add a source-level demo/smoke scenario for a student practice flow.
- Add route/workflow checks for `/app/practice`, terminal, report, journal, workspace insights, assignments, and notifications.
- Add lightweight smoke checks that require no paid services or external provider credentials.
- Record the full browser smoke checklist in `manual-test-backlog.md`.
- Confirm event markers, order ticket, indicators, drawings, assignment task inbox, notifications, reports, and journal links still load.
- Update `manual-test-backlog.md` with a short "must test before demo" list.

Strict boundary:

- No new major feature surface.
- No AutoCopy coupling.
- No live broker/exchange execution.
- No provider/private API calls beyond existing safe historical data behavior.

Reference:

```text
TH-2026-08-20-STAGE18V-PRACTICE-MVP-SMOKE-HANDOFF
```

### Stage 18W - Practice Launch Copy, Empty States, And Onboarding Polish

Purpose: make the practice product understandable to real students and instructors.

Implemented scope:

- Polished `/app/practice` first-run guidance and empty states for playbooks, sessions, assignments, notifications, analytics, import/export, and recent orders.
- Added the recommended student flow: create a playbook, create/start a session, open terminal, reveal candles, place a simulated order, finish session, and review report/journal.
- Clarified "practice only / simulated only / revealed candles only" copy in terminal, replay, report, journal, assignments, and workspace surfaces.
- Improved empty states for no closed trades, no reflection, no playbook activity, no instructor feedback, no AutoCopy activity, and no workspace aggregate data.
- Updated `manual-test-backlog.md`, `plan.md`, and the Stage 18W QA script.

Strict boundary:

- No paid messaging, PDF generation, uploads, screenshots, AI insights, or live execution.
- No broad redesign that risks the terminal layout.

Reference:

```text
TH-2026-08-20-STAGE18W-PRACTICE-LAUNCH-POLISH-HANDOFF
```

### Stage 18X - Practice MVP Final Acceptance And Deferred QA Closeout

Purpose: freeze the practice/backtesting MVP as demo-ready from source-level QA, organize deferred manual QA, and make the next product-area handoff clear.

Implemented scope:

- Added final source-level acceptance checks for the complete practice MVP surface: dashboard, terminal, replay, report, journal, workspace insights, assignments, cohorts, feedback, review queue, notifications, import/export, historical providers, instrument specs, print/report safety, and Firestore deny-by-default practice paths.
- Verified practice-only boundaries in source: simulated orders only, revealed-candle-only replay, no hidden candle export, no AutoCopy execution coupling, no live broker/exchange calls, no private Binance/Bybit APIs, no MetaAPI student credentials for practice, no secrets/vault refs/provider payloads, and no paid messaging/storage/PDF/screenshot services.
- Reorganized `manual-test-backlog.md` into Must Test Before Demo, Nice To Test, and Later Regression buckets while keeping exact local setup commands and seeded student login notes.
- Updated this prompt summary with the final practice MVP summary, what was added beyond the original MVP, and the instruction that the next product area should be chosen separately.

Status: practice/backtesting MVP is source-QA frozen. Manual browser QA remains intentionally deferred in `manual-test-backlog.md`.

```text
TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF
```

---

## Final Practice MVP Summary

The practice/backtesting product is now a TradeHub-native, practice-only chart replay system:

- Students create sessions for crypto or Forex/CFD practice.
- Candles reveal server-side by current index so future candles stay hidden.
- Crypto practice history uses public Binance data for supported crypto symbols.
- Forex/CFD practice history is fail-closed by default and can use the static demo provider when explicitly configured.
- Practice orders are simulated only.
- P&L, R, sizing, and costs use practice instrument specs and server-side validation.
- Playbooks, notes, drawings, indicators, events, bookmarks, reviews, reports, assignments, cohorts, feedback, resubmissions, and notifications are all practice-only.
- Journal integration shows safe practice/backtesting summaries separately from AutoCopy.
- Workspace/instructor views are aggregate-safe and masked.
- The practice MVP is source-QA frozen after Stage 18X.
- The next product area should be chosen separately instead of adding more major practice features.

Practice/backtesting remains source-QA frozen at:

```text
TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF
```

Explicitly out of scope for this backtesting MVP:

- Real broker/exchange order placement.
- AutoCopy execution.
- Student MetaAPI credentials for practice history.
- Hidden candle export.
- Raw provider payload exposure.
- Screenshots/uploads/PDF storage.
- Paid email/SMS/WhatsApp/push services.
- AI trade coaching.
- Multi-chart or multi-symbol terminal layouts.
- Admin-managed real economic calendar.
- Broker-grade real historical provider integration for all Forex/CFD symbols.

---

## Course/Lesson Current Status

Stage 19A started the course/lesson polish track after the practice MVP freeze. Stage 19B improved navigation and authoring ergonomics without changing the course security model. Stage 19C added server-derived completion and browser-print proof without generated files. Stage 19D added deterministic lesson checks without AI grading. Stage 19E added private student notes, bookmarks, and resume points. Stage 19F polished HTTPS-only course resources and attachments. Stage 19G added course discovery, accessible-only lesson/resource search, private learning shortcuts, and workspace aggregate-safe filters. Stage 19H added launch polish and source-level smoke coverage for the course MVP. Stage 19I freezes the course/lesson MVP after final source-level acceptance QA.

Current course/lesson system truth:

- Student `/app/courses` lists published workspace courses through signed-in student APIs.
- Student `/app/courses/[courseId]` loads a safe lesson reader through signed-in student APIs.
- Student course access remains gated by existing entitlement, subscription, tier, and course publish/status checks.
- Lesson order locking is server-enforced for lessons that require the previous lesson.
- Student progress writes remain student-owned under course/lesson progress paths.
- Workspace `/workspace/courses` and `/workspace/courses/[courseId]` remain influencer-only and workspace-scoped.
- Course validation bounds text, rejects HTML-ish notes/descriptions, normalizes YouTube IDs, and allows HTTPS attachment metadata only.
- Stage 19A improved empty/helper copy without redesigning the course system.
- Stage 19B adds `/app/courses` search/filter navigation, lesson outline/current lesson highlight, previous/next lesson controls, mobile reader polish, workspace section/lesson reordering, safer lesson removal confirmation, and draft/published preview clarity.
- Stage 19C adds source-of-truth progress summaries, completion status, `/app/courses/[courseId]/proof`, a protected completion proof API, browser-only print CSS, and workspace aggregate completion visibility with masked recent completion refs only.
- Stage 19D adds deterministic lesson checks with multiple choice, true/false, and ungraded self-check text; server-owned attempt grading; required-check completion gating; and aggregate-safe readiness counts for workspace users.
- Stage 19E adds private student lesson notes, bookmarks with safe labels/position metadata, resume points, Continue learning, private notes/bookmarks search, and aggregate-only workspace learning activity counts.
- Stage 19F adds resource categories, descriptions, safe hostnames, grouped student resource cards, editor previews, and aggregate-only resource counts without uploads or storage.
- Stage 19G adds `/app/courses` course search, availability/progress/locked/tier filters, accessible-only lesson/resource search, own private note/bookmark shortcuts, and workspace Course Hub search/status/resource/check/completion filters without exposing locked lesson data or private learning details.
- Stage 19H adds student learning-flow copy, proof fallback copy, instructor launch checklist copy, route/API smoke assertions, and course security-boundary checks without new major features.
- Stage 19I marks the course/lesson MVP source-QA frozen; future prompts should choose another product area unless specifically patching course bugs.

Recommended next Course/Lesson stage:

- Future prompts should choose another product area unless specifically patching course bugs.

---

## Ops/CRM/Payments/Support Current Status

Stage 20A starts the next product area after Practice and Courses are source-QA frozen.

Current ops system truth:

- Workspace `/workspace` and `/workspace/onboarding` remain influencer-only and workspace-scoped.
- Workspace student CRM loads through protected workspace APIs, applies bounded loaded-page search/filtering, and uses safe support refs for student rows.
- Workspace billing uses existing Paystack/Solana readiness and verified-payment summaries without exposing raw payment payloads in display cards.
- Student `/app/billing` remains signed-in-student scoped and keeps Paystack as the default checkout rail, with optional Solana verification only where already configured.
- Admin `/admin` remains Super Admin gated and now shows an aggregate-only support audit summary before detailed application, payment, execution, audit, and trust/safety panels.
- Browser-visible payment references in workspace/admin cards are masked for support use.
- Stage 20A adds no new money movement, messaging, provider credentials, AutoCopy permission expansion, or live execution.

Recommended next ops stage:

- Choose the next product area separately, or patch specific Stage 20 browser bugs after deferred manual QA.

---

## Messaging/Reminder Current Status

Stage 23A added the server-only messaging provider contract, disabled-by-default gates, safe message intent model, Super Admin readiness preview, and deny-by-default rules. Stage 23B added the dry-run delivery worker, fail-closed provider placeholders, safe delivery attempt records, and Super Admin worker controls. Stage 23C adds consent-aware student preferences, masked preference summaries, masked suppression safety, contact-unavailable fail-closed readiness, and worker-time opt-out/suppression rechecks. Stage 23D freezes the messaging/reminders MVP as source-QA complete while real external delivery remains disabled.

Current messaging/reminder system truth:

- External email, SMS, and WhatsApp sending remains disabled.
- The worker is dry-run only and uses placeholder adapters only.
- Student `/app` includes Reminder preferences for channels and reminder purposes.
- Student preference writes go through protected student APIs and are server-written.
- Worker-readable preference summaries use masked student refs only.
- Suppression records use masked refs only and are visible to Super Admin as counts/status only.
- Stage 23D marks the messaging/reminders MVP as source-QA frozen; messaging/reminders MVP is source-QA frozen.
- No phone numbers, email addresses, message bodies, provider payloads, vault refs, tokens, payment refs, raw student/session IDs, private notes, hidden candles, answer keys, credentials, or AutoCopy internals are exposed in browser responses.

Current messaging reference:

```text
TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF
```

Current external signal ingestion reference:

```text
TH-2026-08-22-STAGE24B-EXTERNAL-SIGNAL-REVIEW-WORKFLOW-HANDOFF
```

Stage 24A external signal ingestion summary:

- Stage 24A reference: `TH-2026-08-22-STAGE24A-EXTERNAL-SIGNAL-INGESTION-CONTRACT-HANDOFF`.
- Added server-only external signal ingestion types, contract helpers, source allowlist/candidate records, conservative manual/mock parser, and deduplication/fingerprint helper.
- Added disabled-by-default gates for external signal ingestion, Telegram-style sources, webhook-style sources, and source allowlists.
- Added Super Admin-only safe overview API/UI showing readiness, counts, masked refs, parse warnings, and candidate statuses only.
- Added Firestore deny-by-default rules for external signal sources, candidates, provider status, and audit paths.
- No Telegram connection, webhook ingestion, scraping, external provider call, raw external message browser exposure, AutoCopy bridge, workspace signal publish, student signal broadening, or live broker/exchange execution was added.

Stage 24B external signal ingestion summary:

- Added Super Admin-only manual/mock candidate creation, candidate review, rejection, quarantine, and preview-only moderation.
- Added parser version, review status, reviewed-by safe admin ref, reviewed time, review reason, bounded admin note, and risk flags to candidate records.
- Added bounded parser/risk checks for unsupported symbol/asset class, missing/invalid entry, missing SL, missing TP, too many TPs, duplicate fingerprint, suspicious safe text hint, and workspace scope mismatch.
- Added Super Admin source allowlist create/update/disable controls that store masked refs only.
- Updated the admin panel with mock parser form, candidate status filters, review actions, source allowlist controls, and explicit non-executable preview copy.
- No workspace signal publishing, student signal visibility, Telegram/webhook/provider call, AutoCopy routing, AI parsing, or live execution was added.

Stage 24C external signal ingestion summary:

- Stage 24C reference: `TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF`.
- Added a protected workspace-safe external signal preview API and `/workspace` preview panel for Super Admin-approved `approved_for_workspace_preview` candidates only.
- Workspace preview records include normalized signal metadata, safe source label, masked source ref, risk flags, and timestamps only.
- Preview is read-only and explicitly labeled external preview only, not a TradeHub signal, not student-visible, and not AutoCopy executable.
- Rejected, quarantined, duplicate, unreviewed, received, and parsed candidates stay out of workspace preview.
- No raw external messages, raw source IDs, chat IDs, usernames, phone numbers, tokens, webhook secrets, provider payloads, vault refs, admin notes, reviewer refs, fingerprints, source safe refs, AutoCopy internals, student visibility, provider calls, workspace signal publishing, or live execution was added.
- External master-trader / Telegram-style ingestion MVP is source-QA frozen at Stage 24C.
- Historical Stage 23D handoff pointed next to Stage 24A external master-trader / Telegram signal ingestion; that track is now completed and source-QA frozen at Stage 24C.
- Practice/backtesting MVP remains source-QA frozen at Stage 18X.
- Course/lesson MVP remains source-QA frozen at Stage 19I.
- Ops/CRM/payments/support MVP remains source-QA frozen at Stage 20D.
- Manual Journal MVP remains source-QA frozen at Stage 21D.
- Messaging/reminders MVP remains source-QA frozen at Stage 23D.

Stage 25A broad live AutoCopy readiness summary:

- Stage 25A reference: `TH-2026-08-22-STAGE25A-BROAD-LIVE-AUTOCOPY-READINESS-HANDOFF`.
- Added server-only broad live AutoCopy readiness helpers for crypto Production Beta, Forex live canary, platform/workspace controls, student consent/access posture, vault/dry-run/order-call gates, kill switches, reconciliation readiness, and external signal preview separation.
- Added launch-gate states: `blocked`, `dry_run_only`, `canary_only`, `cohort_ready`, `broad_live_blocked`, and `broad_live_ready`.
- Added Super Admin, workspace-safe, and student-safe readiness surfaces with runbook/checklist content for live cohort review, broad rollout review, emergency disable, reconciliation review, and rollback.
- Added disabled-by-default broad live env defaults and Stage 25A source QA.
- Stage 25A does not enable broad live order calls, alter workers, route external signal preview candidates into AutoCopy, bypass consent/payment gates, bypass kill switches, or expose secrets/provider internals.

Stage 25B controlled live AutoCopy cohort gate summary:

- Stage 25B reference: `TH-2026-08-22-STAGE25B-LIVE-AUTOCOPY-COHORT-GATE-HANDOFF`.
- Added controlled cohort status labels: `not_configured`, `blocked`, `dry_run_only`, `canary_required`, `eligible_for_review`, `approved_for_cohort`, `cohort_paused`, and `cohort_removed`.
- Added disabled-by-default cohort env gates: `BROAD_LIVE_AUTOCOPY_COHORT_APPROVALS_ENABLED=false`, `BROAD_LIVE_AUTOCOPY_COHORT_ORDER_CALLS_ENABLED=false`, and `BROAD_LIVE_AUTOCOPY_COHORT_DRY_RUN=true`.
- Extended the Stage 25A readiness helper with a bounded cohort preview that rechecks kill switches, production vault/preflight readiness, candidate eligibility, reconciliation posture, dry-run/order-call env, and external-preview separation.
- Added support-safe Super Admin/workspace/student cohort status copy through the existing readiness cards.
- Added deny-by-default Firestore placeholders for future cohort controls/audit records and Stage 25B source QA.
- Stage 25B does not enable broad live execution, alter workers, place orders, connect external signal previews to AutoCopy, bypass consent/payment/entitlement/kill-switch/vault gates, or expose secrets/provider internals.

Stage 25C controlled crypto live AutoCopy cohort rollout summary:

- Stage 25C reference: `TH-2026-08-22-STAGE25C-CRYPTO-LIVE-AUTOCOPY-COHORT-ROLLOUT-HANDOFF`.
- Added a bounded Super Admin-only crypto cohort rollout dry-run worker and route for production `ready_for_live` crypto intents.
- The worker rechecks paid Crypto AutoCopy billing, production consent, production preflight, vault readiness, platform/workspace/student kill switches, Stage 25B cohort gates, and crypto symbol readiness.
- Added support-safe admin UI showing masked `candidateRef` values, bounded counts, warnings, and rollback guidance.
- Stage 25C does not broaden live execution, does not add Forex rollout, does not place exchange orders from the cohort UI, does not connect external signal previews to AutoCopy, and does not expose secrets/provider internals.

Stage 25D live AutoCopy reconciliation, incident, and rollback hardening summary:

- Stage 25D reference: `TH-2026-08-22-STAGE25D-LIVE-AUTOCOPY-RECONCILIATION-INCIDENT-HANDOFF`.
- Added a derived support-safe incident readiness model covering crypto production/canary, crypto cohort dry-run evaluations, and Forex live canary as separate streams.
- Added Super Admin readiness UI for stale/review-needed/blocked counts, kill-switch status, dry-run/order-call posture, rollback checklist, incident checklist, audit summaries, warnings, and bounded support-note policy.
- Added deny-by-default Firestore placeholders for future live incident/support review/rollback note records.
- Stage 25D does not enable broad live execution, create a broad worker, add Forex broad rollout, execute orders, connect external signal previews to AutoCopy, or expose secrets/provider internals.

Stage 25E controlled live AutoCopy final acceptance freeze summary:

- Stage 25E reference: `TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF`.
- Added final acceptance QA for the complete Stage 25 surface: broad live readiness gates, controlled cohort gate, crypto cohort dry-run rollout, reconciliation/incident/rollback posture, Super Admin runbook visibility, workspace/student status-only copy, external signal preview isolation, and frozen foundation references.
- Confirmed fail-closed broad/cohort env defaults, bounded Super Admin crypto cohort dry-run behavior, Forex canary separation, and external preview non-executability at source level.
- Controlled live AutoCopy support layer is source-QA frozen. Broad live execution remains disabled by default and must not be broadened without a future explicit production launch prompt after manual QA and owner approval.

Stage 26A manual browser QA/demo readiness summary:

- Stage 26A reference: `TH-2026-08-23-STAGE26A-MANUAL-BROWSER-QA-DEMO-PACK-HANDOFF`.
- Added `manual-demo-qa.md` with exact local emulator, seed, Auth seed, and dev-server commands.
- Documented seeded local student, influencer/workspace, and Super Admin Auth emulator logins.
- Organized must-test demo flows across student overview, practice terminal, manual journal, courses/proof, workspace dashboard, Super Admin readiness, and controlled live AutoCopy blocked/frozen posture.
- Added a short influencer-facing presenter script plus known deferred manual QA.
- Added `stage26a:qa` to verify the demo pack, seeded routes/logins, frozen references, and frozen acceptance scripts remain wired.
- Stage 26A does not add product features, enable broad live AutoCopy, create workers, send messages, change payment/refund/payout/withdrawal behavior, add uploads/PDFs/AI/paid services/provider calls, weaken Firestore rules, or expose secrets/provider internals.

Stage 27A package entitlements, seat caps, and licence model summary:

- Stage 27A reference: `TH-2026-08-24-STAGE27A-PACKAGE-ENTITLEMENTS-SEAT-CAPS-HANDOFF`.
- Added internal package/licence types for Launch Workspace, Pro Workspace, and Enterprise Workspace.
- Launch is capped at 50 active students, Pro is capped at 500 active students, and Enterprise is custom-reviewed unless an operator-provided cap exists.
- Added server-side package status derivation from safe workspace/student records, including active count, remaining seats, over-limit state, licence status, support window state, maintenance state, and seat-cap enforcement on successful student activation.
- Added workspace package status UI and Super Admin aggregate package overview with masked workspace refs only.
- Added deny-by-default Firestore placeholders for package/licence paths and `stage27a:qa`.
- Stage 27A does not expose public prices, include Trade Copier in base packages, alter Paystack/Solana checkout or entitlement gates beyond read-only visibility/reusable cap checks, enable broad live AutoCopy, or expose secrets/private internals.

Stage 27B package billing terms, maintenance windows, and admin licence ops summary:

- Stage 27B reference: `TH-2026-08-24-STAGE27B-PACKAGE-BILLING-MAINTENANCE-OPS-HANDOFF`.
- Extended the package/licence model with licence start date, licence term type, included support window, maintenance renewal status/due date, support status, bounded admin status reason/note, and last reviewed timestamp.
- Added server-side support/maintenance/licence health derivation plus workspace-safe support prompts and maintenance summaries.
- Added Super Admin-only masked-ref licence ops to mark maintenance active, waived, custom review, or suspended, with bounded internal notes and deny-by-default licence ops paths.
- Added workspace-safe support/maintenance visibility without public prices, payment collection, refunds, payouts, withdrawals, settlement automation, Trade Copier inclusion, broad live AutoCopy, or private/internal data exposure.

Stage 27C workspace branding, custom domain readiness, and white-label controls summary:

- Stage 27C reference: `TH-2026-08-24-STAGE27C-WORKSPACE-BRANDING-DOMAIN-WHITELABEL-HANDOFF`.
- Added package-aware branding/domain types for TradeHub-branded, co-branded, and white-label-ready modes, student-facing visibility state, custom-domain readiness, DNS checklist state, HTTPS logo URL metadata, bounded colors, and bounded admin review notes.
- Added server-side sanitizers and readiness helpers for display names, logo URL metadata, brand colors, custom domain hostnames, package availability messages, and DNS checklist copy.
- Added workspace-safe branding/domain visibility on `/workspace` and Super Admin masked-ref branding/domain overview plus metadata-only review actions.
- Stage 27C does not upload logos, store files, provision DNS/SSL, call hosting providers, expose public prices, collect licence payments, include Trade Copier in base packages, enable broad live AutoCopy, or weaken frozen gates.

Stage 27D enterprise deployment and SLA readiness summary:

- Stage 27D reference: `TH-2026-08-24-STAGE27D-ENTERPRISE-DEPLOYMENT-SLA-HANDOFF`.
- Added contract-scoped Enterprise deployment/SLA types for shared TradeHub cloud, isolated-tenant-ready, dedicated-deployment-ready, custom-contract modes, deployment review status, SLA posture, backup/restore state, data-residency state, and rollback checklist metadata.
- Added server-side Enterprise readiness helpers, workspace-safe Enterprise readiness card, Super Admin masked-ref overview, filters, and metadata-only review actions.
- Stage 27D does not provision infrastructure, create tenants, configure DNS/SSL, call cloud/hosting providers, collect licence payments, expose public prices, automate money movement, include Trade Copier in base packages, enable broad live AutoCopy, or weaken frozen gates.

Stage 27E enterprise integration request workflow summary:

- Stage 27E reference: `TH-2026-08-24-STAGE27E-ENTERPRISE-INTEGRATION-REQUEST-HANDOFF`.
- Added Enterprise integration request/intake types for CRM, payment, analytics, broker, Telegram/Discord, external LMS, data export, and custom categories, with request status, priority, safe provider label/hostname metadata, data sensitivity flags, security review, legal/SLA dependency, estimated complexity, and bounded notes.
- Added protected workspace create/list routes for Enterprise workspaces only; Launch and Pro workspaces see Enterprise/contact TradeHub copy.
- Added Super Admin Enterprise integration queue with masked request/workspace refs, filters, bounded metadata-only status actions, internal notes, workspace-visible notes, and security/legal review flags.
- Added source-level QA and Firestore deny-by-default rules for Enterprise integration request/ops paths.
- Stage 27E does not build real adapters, collect credentials/tokens/webhook secrets, call external providers, publish signals, connect external preview to AutoCopy, include Trade Copier in base packages, expose public prices, or enable broad live AutoCopy.

Stage 27I package sales readiness smoke summary:

- Stage 27I reference: `TH-2026-08-24-STAGE27I-PACKAGE-SALES-READINESS-SMOKE-HANDOFF`.
- Added source-level smoke coverage for the full Launch, Pro, and Enterprise selling posture across Stage 27A seat caps, Stage 27B support/maintenance/licence ops, Stage 27C branding/domain readiness, Stage 27D Enterprise deployment/SLA readiness, and Stage 27E Enterprise integration request workflow.
- Verified Launch remains capped at 50 active students, Pro remains capped at 500 active students, Enterprise remains custom-reviewed, public package prices stay out of app UI, and Trade Copier remains a separate optional add-on.
- Verified `/workspace` and Super Admin `/admin` package-sales surfaces exist and remain metadata-only, masked-ref-only, Enterprise-gated where required, and deny-by-default in Firestore for protected package/licence/branding/domain/Enterprise/integration ops paths.
- Stage 27I does not add product features, public prices, licence payment collection, refunds/payouts/withdrawals, uploads, DNS/SSL/hosting/cloud automation, real Enterprise adapters, credential/token/webhook secret collection, messaging sends, AI, PDFs, or broad live AutoCopy.

Stage 27J package sales readiness final freeze summary:

- Stage 27J reference: `TH-2026-08-24-STAGE27J-PACKAGE-SALES-MVP-FINAL-HANDOFF`.
- Added final source-level acceptance coverage for the complete Launch, Pro, and Enterprise package-sales model.
- Verified Launch 50-seat cap, Pro 500-seat cap, Enterprise custom agreement posture, no-public-price app/deck copy, Trade Copier add-on separation, metadata-only support/maintenance/licence/branding/domain/Enterprise/integration surfaces, Enterprise-only integration intake, Firestore deny rules, and frozen MVP references.
- Updated `manual-test-backlog.md` so package-sales manual QA is grouped into Must Test Before Sales Demo, Nice To Test, and Later Regression.
- Package Sales MVP is source-QA frozen. Browser/manual sales-demo QA and final commercial/legal copy review remain required before a real sales meeting.
- Stage 27J does not add product features, public prices, licence payment collection, refunds/payouts/withdrawals, settlement/invoice automation, uploads, DNS/SSL/hosting/cloud automation, real Enterprise adapters, credential/token/webhook secret collection, messaging sends, AI, PDFs, external signal-to-AutoCopy coupling, or broad live AutoCopy.

Stage 28A - Demo Seed Pack summary:

- Stage 28A reference: `TH-2026-08-24-STAGE28A-DEMO-SEED-PACK-HANDOFF`.
- Added `scripts/seed-demo-data.mjs` with deterministic local Firebase emulator Auth and Firestore demo records.
- Added `npm run seed:demo`, `npm run stage28a:seed`, and `npm run stage28a:qa`.
- Seeded safe Launch 50-seat, Pro 500-seat, and Enterprise custom-review package postures plus Super Admin, influencer, active student, pending-onboarding student, and payment/access-issue student personas.
- Seeded realistic demo metadata for workspace CRM, package/licence/maintenance, branding/domain readiness, Enterprise deployment/SLA readiness, Enterprise integration request, course/lesson/progress/check/resource data, practice/backtesting with one closed simulated trade, manual journal mixed-outcome trades, assignment/cohort/feedback, and notification state.
- Seed is idempotent through deterministic IDs, merge upserts, emulator-only safety defaults, and undefined-field cleanup.
- Stage 28A does not seed real credentials, API keys, tokens, webhook secrets, vault refs, broker passwords, MetaAPI tokens, provider payloads, payment refs, account IDs, raw private provider data, public package prices, broad live AutoCopy state, live orders, provider calls, or external messaging sends.
- Trade Copier remains a separate optional add-on in demo metadata.

Stage 28B - Playwright Browser QA Foundation summary:

- Stage 28B reference: `TH-2026-08-24-STAGE28B-PLAYWRIGHT-BROWSER-QA-FOUNDATION-HANDOFF`.
- Added `@playwright/test`, `playwright.config.mjs`, `npm run browser:qa`, and `npm run stage28b:qa`.
- Added browser helpers for Stage 28A seeded student, workspace/influencer, and Super Admin sign-in through the real login page.
- Added common browser assertions for page readiness, no server/runtime crash copy, no Next.js error overlay, no public Launch/Pro/Enterprise package prices, no raw seeded IDs, and no secret-shaped rendered strings.
- Added smoke tests for `/`, `/app`, `/app/practice`, `/app/courses`, `/app/journal`, `/workspace`, and `/admin`.
- Browser QA remains an explicit command requiring local emulators, `npm run seed:demo`, and a local dev server. It is not part of `npm run build`.
- Stage 28B does not add real external calls, call providers, send messages, expose secrets/raw IDs, add public package prices, enable broad live AutoCopy, weaken Firestore rules, redesign UI, or add product features.

Stage 28C - Student End-to-End Browser QA summary:

- Stage 28C reference: `TH-2026-08-24-STAGE28C-STUDENT-BROWSER-E2E-HANDOFF`.
- Added `tests/browser/student-e2e.spec.mjs`, `tests/browser/helpers/student-flows.mjs`, `npm run browser:qa:student`, and `npm run stage28c:qa`.
- Student browser coverage signs in with the Stage 28A active student and checks `/app`, `/app/practice`, seeded practice terminal/report routes, `/app/courses`, seeded course reader/proof routes, `/app/journal`, seeded manual trade review, reminder preferences, and wrong-role blocking for `/workspace` and `/admin`.
- Student browser checks reuse shared no-error/no-price/no-secret assertions and add student-specific guards for provider payloads, vault refs, raw provider/payment fields, answer-key fields, and support-only internals.
- Stage 28C keeps order placement, lesson completion, import/export mutation, and chart hover/pan checks as manual browser follow-ups because they need a live emulator/dev-server run and stable selector observations.
- Stage 28C does not add product features, call external providers, send messages, place orders, expose secrets/raw IDs, add public package prices, enable broad live AutoCopy, weaken Firestore rules, redesign UI, or change frozen product behavior.

Stage 28D - Workspace And Super Admin End-to-End Browser QA summary:

- Stage 28D reference: `TH-2026-08-24-STAGE28D-WORKSPACE-ADMIN-BROWSER-E2E-HANDOFF`.
- Added `tests/browser/workspace-admin-e2e.spec.mjs`, `tests/browser/helpers/workspace-admin-flows.mjs`, `npm run browser:qa:workspace-admin`, and `npm run stage28d:qa`.
- Workspace browser coverage signs in with the Stage 28A Pro influencer and checks `/workspace` package/licence, Student CRM, practice insights, workspace drills/assignments, course visibility, branding/domain readiness, Enterprise readiness, Enterprise integration posture, external preview, and wrong-role blocking for `/admin`.
- Super Admin browser coverage signs in with the Stage 28A Super Admin and checks `/admin` package/licence, branding/domain, Enterprise deployment/SLA, Enterprise integration queue, support/payment ops, messaging dry-run readiness, external signal ingestion, live AutoCopy readiness/incident posture, and wrong-role behavior for `/app/journal`.
- Workspace/admin browser checks reuse shared no-error/no-price/no-secret assertions and add ops-specific guards for provider payloads, vault refs, raw payment/provider fields, raw seeded IDs, credentials, and execution internals.
- Stage 28D does not add product features, call external providers, send messages, place orders, expose secrets/raw IDs, add public package prices, enable broad live AutoCopy, weaken Firestore rules, redesign UI, or change frozen product behavior.

Stage 28E - Browser QA Bug-Fix And UX Polish Pass summary:

- Stage 28E reference: `TH-2026-08-24-STAGE28E-BROWSER-QA-POLISH-HANDOFF`.
- Added `scripts/qa-stage28e-browser-qa-polish.mjs` and `npm run stage28e:qa`.
- Centralized forbidden rendered-text checks in `tests/browser/helpers/assertions.mjs`.
- Added tolerant safe role-boundary assertions so wrong-role tests can pass on either a safe blocked page or safe redirect.
- Improved seeded-auth failure diagnostics with emulator/seed/dev-server guidance.
- Updated manual browser QA docs with `npx playwright install chromium`, exact command order, reuse-server mode, auth-failure triage, and `test-results` / `playwright-report` failure artifact locations.
- Stage 28E does not add product features, call external providers, send messages, place orders, expose secrets/raw IDs, add public package prices, enable broad live AutoCopy, weaken Firestore rules, redesign UI, or change frozen product behavior.

Frozen foundation references:

- Practice 18X: `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`.
- Courses 19I: `TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`.
- Ops 20D: `TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF`.
- Manual Journal 21D: `TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF`.
- Forex/CFD History 22B: `TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF`.
- Messaging 23D: `TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF`.
- External Signal Ingestion 24C: `TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF`.
- Controlled Live AutoCopy 25E: `TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF`.
- Manual Browser Demo Pack 26A: `TH-2026-08-23-STAGE26A-MANUAL-BROWSER-QA-DEMO-PACK-HANDOFF`.
- Package Entitlements 27A: `TH-2026-08-24-STAGE27A-PACKAGE-ENTITLEMENTS-SEAT-CAPS-HANDOFF`.
- Package Billing/Maintenance 27B: `TH-2026-08-24-STAGE27B-PACKAGE-BILLING-MAINTENANCE-OPS-HANDOFF`.
- Workspace Branding/Domain 27C: `TH-2026-08-24-STAGE27C-WORKSPACE-BRANDING-DOMAIN-WHITELABEL-HANDOFF`.
- Enterprise Deployment/SLA 27D: `TH-2026-08-24-STAGE27D-ENTERPRISE-DEPLOYMENT-SLA-HANDOFF`.
- Enterprise Integration Requests 27E: `TH-2026-08-24-STAGE27E-ENTERPRISE-INTEGRATION-REQUEST-HANDOFF`.
- Package Sales Readiness Smoke 27I: `TH-2026-08-24-STAGE27I-PACKAGE-SALES-READINESS-SMOKE-HANDOFF`.
- Package Sales MVP Final 27J: `TH-2026-08-24-STAGE27J-PACKAGE-SALES-MVP-FINAL-HANDOFF`.
- Demo Seed Pack 28A: `TH-2026-08-24-STAGE28A-DEMO-SEED-PACK-HANDOFF`.
- Playwright Browser QA Foundation 28B: `TH-2026-08-24-STAGE28B-PLAYWRIGHT-BROWSER-QA-FOUNDATION-HANDOFF`.
- Student Browser E2E 28C: `TH-2026-08-24-STAGE28C-STUDENT-BROWSER-E2E-HANDOFF`.
- Workspace/Admin Browser E2E 28D: `TH-2026-08-24-STAGE28D-WORKSPACE-ADMIN-BROWSER-E2E-HANDOFF`.
- Browser QA Polish 28E: `TH-2026-08-24-STAGE28E-BROWSER-QA-POLISH-HANDOFF`.

Next recommended product area:

- Run `npm run browser:qa:workspace-admin`, `npm run browser:qa:student`, and `npm run browser:qa` against local emulators and seeded demo data, then run final commercial/legal copy review before pitching. After that, choose the next product area separately. Do not expose public prices, collect licence payments, automate DNS/hosting/uploads/cloud provisioning, build real integration adapters, collect credentials/tokens/webhook secrets, or enable broad live AutoCopy unless a future explicit production launch prompt changes the gates after manual QA and owner approval.

---

## How To Resume

To continue from here, ask:

```text
Continue TradeHub from TH-2026-08-24-STAGE28E-BROWSER-QA-POLISH-HANDOFF.
Read plan.md, manual-test-backlog.md, manual-demo-qa.md, prompt/promptsumary.md, package.json scripts, Stage 28A seed/QA scripts, Stage 28B Playwright config/tests/QA script, Stage 28C student browser E2E/QA script, Stage 28D workspace/admin browser E2E/QA script, Stage 28E browser QA polish/QA script, package sales final QA, and current package/licence, workspace/admin/student demo surfaces, and role/access code first.
Package Sales MVP is source-QA frozen, the local demo seed pack is source-QA ready, Playwright browser QA foundation is source-QA ready, student browser E2E is source-QA ready, workspace/admin browser E2E is source-QA ready, and browser QA polish is source-QA ready; patch only concrete browser-demo blockers unless a new product area is explicitly selected. Do not expose public prices, collect licence payments, automate refunds/payouts/withdrawals, upload files/logos, automate DNS/SSL/hosting/cloud provisioning, build real integration adapters, collect credentials/tokens/webhook secrets, include Trade Copier in base packages, seed real provider data, call external providers, send external messages, or enable broad live AutoCopy.
```

When reviewing builder output, verify:

- Changed files are listed.
- Security/privacy boundaries are preserved.
- QA scripts pass.
- `manual-test-backlog.md` is updated instead of relying on the owner to test immediately.
- No hidden candles, secrets, provider payloads, credentials, raw student/session IDs, or AutoCopy internals leak into student or workspace surfaces.

---

## Stage 29A - Student Home And Course Copy Simplification

Reference: `TH-2026-08-24-STAGE29A-STUDENT-HOME-COURSE-SIMPLIFICATION-HANDOFF`

Status: implemented/source-QA ready. Owner browser QA remains deferred.

Summary:

- Removed the ordinary student-facing Reminder Preferences card from `/app`.
- Kept the dormant Stage 23 messaging backend and compatibility component, but normal student screens no longer expose reminder preferences, external email/SMS/WhatsApp copy, messaging-provider delivery copy, suppression/contact-verification copy, or messaging dry-run language.
- Refocused `/app` quick access around Courses, Signals, Copier, Journal, Practice, and Billing.
- Simplified student Course copy across the course list, lesson reader, resources, knowledge checks, notes/bookmarks, completion, and proof screens.
- Added/updated browser and source guards so the student home asserts Reminder Preferences are absent and Course screens avoid engineering phrases such as API, server-owned/server-side, metadata, Firestore, stage names, and source-QA.

Preserved:

- Course entitlement, subscription, tier, published-course, workspace, lesson-lock, quiz, proof, progress, and private-learning ownership gates.
- Answer keys remain hidden before submission.
- No real messaging sends, provider calls, uploads, AI, payments, PDFs, or live execution behavior was added.

Next:

- Stage 29C.1 and Stage 29C.2 are implemented/source-QA ready below. Owner browser acceptance remains deferred; Stage 29C.3 and Stage 29D remain pending.

Resume by asking:

```text
Continue TradeHub from TH-2026-08-24-STAGE29A-STUDENT-HOME-COURSE-SIMPLIFICATION-HANDOFF. Read complaint.md, complaint-resolution-roadmap.md, plan.md, manual-test-backlog.md, manual-demo-qa.md, prompt/promptsumary.md, package.json scripts, current student home/course implementation, and browser student tests first. Stage 29A is source-QA ready; Stage 29B Practice Hub And Sessions Navigation remains pending. Do not start Stage 29B unless explicitly requested. Preserve student privacy, course access gates, answer-key hiding, and frozen product boundaries.
```

---

## Stage 29B - Practice Hub And Sessions Navigation

Reference: `TH-2026-08-24-STAGE29B-PRACTICE-HUB-SESSIONS-HANDOFF`

Status: implemented/source-QA ready. Owner browser QA remains deferred.

Summary:

- `/app/practice` now opens to two clear choices: Backtesting Session and Sessions.
- Existing assigned practice, strategies, analytics, import/export, archived sessions, and notifications remain available through compact focused views.
- Sessions retain search, filters, sorting, bounded loading, terminal/review/report links, setup-only duplication, archive, and restore.
- A right-side settings drawer presents safe session details and actions without pretending unsupported setup fields are editable.
- Standalone sessions can be permanently deleted only through the protected student route after exact-name confirmation. Session-owned orders, annotations/drawings, bookmarks, deterministic ledger entries, and the session record are removed in bounded batches.
- Assignment/review-linked sessions remain archive-only and cannot be permanently deleted.
- Student Playwright coverage checks the focused hub and settings drawer without deleting seeded assignment data.

Preserved:

- Student ownership comes from `requireStudent` and the authenticated actor; browser-supplied workspace/student ownership is not trusted.
- Firestore browser rules remain deny-by-default for Practice records.
- Practice remains simulated-only, and no provider, AutoCopy, payment, course, journal, or live execution behavior changed.

Next:

- Stage 29C - Quick Session, Asset Catalog, And Strategy Simplification remains pending. Do not implement Stage 29C until explicitly requested.

Resume by asking:

```text
Continue TradeHub from TH-2026-08-24-STAGE29B-PRACTICE-HUB-SESSIONS-HANDOFF. Read complaint.md, complaint-resolution-roadmap.md, plan.md, manual-test-backlog.md, manual-demo-qa.md, prompt/promptsumary.md, package.json scripts, current Practice dashboard/session APIs/repository, and student browser tests first. Stage 29B is source-QA ready; Stage 29C Quick Session, Asset Catalog, And Strategy Simplification remains pending. Do not start Stage 29C unless explicitly requested. Preserve student ownership, assignment/review archive-only deletion, simulated-only Practice, and frozen product boundaries.
```

---

## Stage 29C - Quick Session, Verified Asset Catalogue, And Strategy Simplification

Reference: `TH-2026-08-25-STAGE29C-QUICK-SESSION-ASSET-STRATEGY-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Automated `npm run browser:qa:student` passed 7/7 on 25 August 2026 after the deterministic demo seed was refreshed. Owner visual acceptance remains pending.

Summary:

- Backtesting Session opens an opaque-black, responsive, keyboard-managed modal with the requested quick-session controls.
- The protected overview returns only five verified Crypto pairs, seven Forex majors, and XAUUSD, with Forex/Metals availability derived from the existing server readiness gate.
- Client and server validate balance, dates, bounded range/candle count, exact asset/timeframe availability, and optional student-owned Strategy.
- No strategy remains valid through simulated order placement; untagged orders count in overall results without appearing in a Strategy breakdown.
- Student candle responses and chart UI omit provider, provider-symbol, and cache diagnostics.
- Historical candles must be available before a session is persisted; the local seed includes a deterministic bounded BTCUSDT cache for browser testing.
- Student-facing Practice terminology now uses Strategy while internal playbook IDs, storage, APIs, and analytics remain compatible.
- Browser coverage checks modal opacity, Escape/backdrop/focus behavior, asset search/categories, unavailable selection, safe validation, duplicate-submit prevention, Sessions highlight, terminal navigation, and the Stage 29B drawer.
- +1D, +1W, +1M, and +1Y set a visible lookback from the End date. Random start immediately chooses and displays a bounded historical window, with an explicit reshuffle control.

Preserved:

- Practice is simulated-only and student-owned. No provider payloads, hidden candles, secrets, raw IDs, AutoCopy coupling, payment behavior, or live execution were added.
- Stage 29B session management and protected deletion remain intact.

Next:

- Stage 29C.1 and Stage 29C.2 are implemented below. Stop for owner acceptance; Stage 29C.3 and Stage 29D remain pending.

Resume by asking:

```text
Continue TradeHub from TH-2026-08-26-STAGE29C1-DYNAMIC-FOREX-CFD-CATALOGUE-HANDOFF. Read complaint.md, complaint-resolution-roadmap.md, plan.md, manual-test-backlog.md, manual-demo-qa.md, prompt/promptsumary.md, package.json scripts, the Stage 29C quick-session implementation, Stage 29C.1 dynamic catalogue/MetaAPI utility discovery, and student browser tests first. Stage 29C.1 is implemented/source-QA ready; owner browser acceptance remains deferred. Do not begin Stage 29C.2 or Stage 29D without explicit owner approval. Preserve simulated-only Practice, real-provider env/vault fail-closed gates, private broker aliases, student ownership, and Stage 29B session-management safety.
```

---

## Stage 29C.1 - Dynamic Forex And CFD Asset Expansion

Reference: `TH-2026-08-26-STAGE29C1-DYNAMIC-FOREX-CFD-CATALOGUE-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance and real-provider operator acceptance remain deferred.

Summary:

- Expanded the approved canonical catalogue to Forex majors/crosses, Gold/Silver, selected major index CFDs, and US/UK oil CFDs.
- Added server-only MetaAPI utility symbol discovery and specification validation with bounded requests and a short safe cache.
- Real-provider catalogue entries appear only when the approved symbol, provider alias, and instrument specification validate; failures remain unavailable/fail-closed.
- Students receive canonical names and safe normalized instrument specs only. Provider suffixes, account IDs, credentials, and raw provider payloads remain private.
- Quick Session now includes Indices and Energies. Local emulator QA opts into deterministic static demo candles; production defaults remain disabled/dry-run/vault-gated.
- Safe session instrument snapshots now drive sizing, P&L, exports, terminal/replay, and practice-ledger records.

Next:

- Stage 29C.2 is implemented below. Stop for owner testing; Stage 29C.3 and Stage 29D remain pending.

---

## Stage 29C.2 - Expanded Verified Crypto Asset Catalogue

Reference: `TH-2026-08-26-STAGE29C2-EXPANDED-CRYPTO-CATALOGUE-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

Automated browser status: seeded student Playwright QA passed 8/8 on 30 August 2026 after a warmed rerun. Owner visual acceptance remains deferred.

- Added 66 unique approved canonical USDT spot candidates and a server-only public spot verification adapter.
- Only trading USDT spot pairs with valid price, quantity, and notional filters become selectable; runtime normalized metadata is bounded and cached for about 15 minutes.
- Safe instrument snapshots now include LOT_SIZE quantity step, tick size, and notional bounds and continue through simulated sizing, fills, P&L, terminal/replay, reports, analytics, private journal ledger records, and exports. Risk sizing rounds down; partial closes conserve step units; SL/TP edits recheck price ticks.
- Quick Session now presents one compact Asset combobox. Its counted, searchable opaque-black catalogue is collapsed by default, preserves selection, supports keyboard navigation, closes before the modal on Escape, dismisses on outside click, and keeps results bounded above the remaining form content.
- Emulator seed contains 50 normalized Crypto instruments plus tick-aligned deterministic LINKUSDT candles. Playwright covers protected LINKUSDT creation, a simulated market order, an aligned partial close, P&L/order state, cleanup, and the preserved USOIL path.

Preserved:

- Practice remains student-owned and simulated-only. No credentials, private exchange APIs, derivatives, margin, leverage, raw exchange responses, AutoCopy coupling, payments, or live orders were added.

Next:

- Stage 29C.3 is implemented below. Stage 29D remains pending and must not begin without explicit approval.
```

---

## Stage 29C.3 - Broader Forex/CFD Asset Catalogue Completion

Reference: `TH-2026-08-26-STAGE29C3-FOREX-CFD-CATALOGUE-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Automated browser status: the seeded student Playwright suite passed 8/8 on 26 August 2026 with local Auth/Firestore emulators and the explicit static-demo provider.

Summary:

- Expanded the approved catalogue to 42 Forex candidates and canonical Metals, Indices, and Energies, including XAUUSD, XAGUSD, US30, NAS100, SPX500, GER40, UK100, JPN225, USOIL, UKOIL, and NATGAS.
- Real utility-provider discovery now returns the complete approved catalogue with safe unavailable states for missing instruments. Disabled environments fail closed, while the explicit static-demo provider supplies deterministic normalized local QA data.
- Added conservative instrument specs and server-side session rechecks for availability, symbol, timeframe, date range, instrument snapshot, and bounded candles.
- Added deterministic EURGBP and USOIL cache fixtures and expanded student Playwright coverage for the 40+ Forex count, CFD categories, disabled CFDs, and one configured static-demo session.
- Preserved the Stage 29C.2 collapsed searchable Asset combobox, broad Crypto catalogue, quantity-step lifecycle, and simulated-only boundaries.

Next:

- Stage 29D is implemented, owner-accepted, closed, and frozen below. Stage 29E remains the completed shared-layout stage. Stage 29F is owner-accepted, closed, and frozen as of 3 September 2026. Stage 29G Crypto Journal Sync is implemented/source-QA ready with external provider acceptance pending; Stage 29H remains the next unstarted complaint-roadmap stage.

---

## Stage 29D: Practice Terminal Visual Polish And FX Replay Inspired Layout

Reference: `TH-2026-08-26-STAGE29D-PRACTICE-TERMINAL-VISUAL-POLISH-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Reorganized the student Practice terminal into a full-height chart-first workspace with a compact top toolbar, supported icon drawing rail, dominant chart surface, opaque tabbed right panel, floating replay controls, and bottom Buy/Sell/status bar.
- Object tree, Order, Go To, News and events, and Journal retain existing simulated orders, analytics/challenge state, navigation, revealed event filters, bookmarks, drawings, feedback, report, and reflection shortcuts.
- Large chart overlay cards were reduced to compact chips, and replay controls sit above the bottom event lane so candles and event hover targets remain readable.
- Existing Stage 18G timeScale marker positioning, instrument-aware order lifecycle, completed-session locks, and report/review links remain wired.

Preserved:

- No copied third-party branding/assets, real news, external provider calls, credentials, AutoCopy coupling, payment changes, or live execution were added.

Next:

- Stop for owner visual acceptance. Journal, Copier, Workspace, and Admin redesigns remain separate future stages.

---

## Stage 29D.1: Practice Terminal Workstation Visual Upgrade

Reference: `TH-2026-08-27-STAGE29D1-PRACTICE-TERMINAL-WORKSTATION-VISUAL-UPGRADE-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- The Practice terminal is now an isolated full-viewport workstation with no global TradeHub header/footer on its route.
- The dense toolbar includes the complete requested timeframe strip, chart type, indicators, Order, Go To, Events, Journal, Report, and panel controls. Unsupported historical intervals remain disabled.
- The 44px Lucide rail exposes supported drawing and analysis actions with clear selected/locked/hidden states; unsupported trend, brush, and magnet modes remain visibly unavailable.
- Untouched active sessions with no orders receive at most 24 protected revealed warm-up candles, while adaptive logical chart ranges prevent oversized early candles.
- Replay controls sit near the top of the chart, the right panel collapses, and the bottom trading/status bar remains compact across desktop and narrow layouts.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No copied third-party assets, provider/private endpoints, credentials, AutoCopy coupling, payment changes, or live execution were added.

Next:

- Stop for owner desktop/mobile visual acceptance before beginning another product-area redesign.

---

## Stage 29D.2: Practice Terminal Candle Reliability Patch

Reference: `TH-2026-08-27-STAGE29D2-PRACTICE-TERMINAL-CANDLE-RELIABILITY-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Terminal/replay candle reads can reuse already-normalized historical candle cache records after the short provider freshness window expires, so existing sessions do not fail blank only because cache TTL passed.
- New practice session creation remains strict and still validates catalogue, instrument, timeframe, date range, and candle availability before persistence.
- Local emulator demo testing now has deterministic Crypto candle fallback when Binance public candles cannot be reached.
- ETHUSDT deterministic demo candles are seeded; ETHUSDT terminal should reveal candles in local demo testing.
- Empty cached candle records are rejected instead of producing a blank `0/0` terminal.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No hidden candles, provider/private data, credentials, AutoCopy coupling, payment changes, or live execution were added.

Next:

- Owner should retest the failing ETHUSDT terminal and a fresh ETHUSDT quick session after emulators/dev server are running and the browser is refreshed.

## Stage 29D.3: Practice Terminal Trading Dock And Chart Density Polish

Reference: `TH-2026-08-27-STAGE29D3-PRACTICE-TERMINAL-TRADING-DOCK-DENSITY-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- The terminal bottom dock now uses larger round Buy and Sell controls, a wider calculated quantity field, and a quick order-ticket action.
- Footer stats were simplified into inline account metrics so the dock feels closer to a trading terminal than a dashboard card row.
- Chart defaults now show a denser candle range on desktop, narrow browser, and mobile widths.
- Zoom behavior was softened so the chart keeps surrounding price action visible instead of becoming too chunky too quickly.
- The left tool rail now uses larger workstation-style Lucide controls.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No copied FX Replay branding/assets, hidden candles, provider/private data, credentials, AutoCopy coupling, payment changes, or live execution were added.

Next:

- Owner should retest full-width and zoomed terminal views, especially the bottom Buy/Sell dock, candle density, and narrow-screen layout.

## Stage 29D.4: Practice Terminal Order Ticket Popout Polish

Reference: `TH-2026-08-27-STAGE29D4-PRACTICE-TERMINAL-ORDER-POPOUT-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- The terminal Order ticket now opens as an opaque desktop chart overlay from the dedicated Order control.
- The popout includes a Place Order header, Preset affordance, close button, larger form controls, contained scrolling, and the existing Practice only/simulated-only copy.
- The right utility panel remains available for Objects, Go To, News, and Journal when the order ticket is closed.
- Mobile and narrow screens keep the responsive bottom/side panel behavior.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No copied FX Replay branding/assets, hidden candles, provider/private data, credentials, AutoCopy coupling, payment changes, or live execution were added.

Next:

- Owner should retest the order popout, then move to the next complaint-roadmap section if accepted.

## Stage 29D.5: Practice Terminal Order Trigger Cleanup And Quick Buy/Sell Behavior

Reference: `TH-2026-08-28-STAGE29D5-PRACTICE-TERMINAL-ORDER-TRIGGER-CLEANUP-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

What changed:

- Bottom Buy/Sell now submit quick simulated market orders using the latest revealed close and current terminal risk/SL/TP values; they no longer open the detailed order popout.
- The detailed Place Order popout remains available from the dedicated Order control and still supports Market, Limit, Stop, SL, TP, Strategy, checklist, and notes.
- Timeframe changes, Indicators, Go To, News, Journal, Objects, fullscreen, replay controls, and drawing tools no longer trigger the Order popout.
- Quick Buy/Sell now show inline dock success/error feedback and fail safely when candles, quantity, SL/TP, validation, or session lock state blocks the order.
- Nonfunctional terminal tools remain disabled or clearly marked as coming soon.
- Student Playwright coverage was expanded for quick Buy/Sell, dedicated Order popout behavior, unrelated-control behavior, and simulated-only boundaries.

Preserved:

- Practice remains simulated-only and revealed-candle-only. No live broker/exchange execution, AutoCopy coupling, private provider call, hidden candle exposure, credential exposure, payment change, or copied FX Replay branding/source was added.

Next:

- Owner should retest the terminal interaction bug in a real browser, especially quick Buy/Sell after setting SL/TP and clicking other toolbar controls while the Order popout is open.

## Stage 29D.7: Practice Terminal Interactive Tools And Clean Order History

Reference: `TH-2026-08-28-STAGE29D7-PRACTICE-TERMINAL-INTERACTIVE-TOOLS-HISTORY-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Added compact BUY/SELL order chips on the chart for cleaner simulated-order history.
- Clicking an order chip opens Objects and filters the side detail to that selected order until Show all is clicked.
- Supported tools now click the chart to place supported objects: horizontal line, vertical marker, zone, text note, and measure.
- Saved chart objects render as selectable chart overlays and remain editable/deletable through Objects.
- Removed old copy that told students to add supported tools from Journal/Review first.
- Trend line is implemented in Stage 29D.9; brush/freehand and magnet remain disabled/coming soon until a proper drawing engine is built for them.
- Added `stage29d7:qa`.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider calls, copied third-party branding/assets, hidden candles, or credentials were added.

## Stage 29E: Shared App Full-Preview Layout Stabilization

Reference: `TH-2026-08-28-STAGE29E-SHARED-APP-FULL-PREVIEW-LAYOUT-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Widened the shared student app shell for normal `/app` pages.
- Delayed optional side panels until larger viewports so content does not collapse in Safari full preview or split view.
- Changed shared wrapping so normal text and button labels do not stack letter-by-letter.
- Removed landing/demo navigation chips from signed-in `/app`, `/workspace`, and `/admin` headers.
- Added dedicated flow-copy and one-line clipping helpers for readable paragraphs and compact titles.
- Reworked Practice Sessions cards so session identity, stats, and action buttons remain readable.
- Added `stage29e:qa`.

Preserved:

- No product behavior, route protection, payment, provider, AutoCopy, live execution, course, journal, workspace, admin, or Firestore rule behavior changed.

Current handoff:

`TH-2026-08-28-STAGE29E-SHARED-APP-FULL-PREVIEW-LAYOUT-HANDOFF`

## Stage 29D.8: Practice Terminal Compact Side Panel

Reference: `TH-2026-08-28-STAGE29D8-PRACTICE-TERMINAL-COMPACT-SIDE-PANEL-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Changed the right utility panel to compact icon tabs with one clear active section title.
- Removed duplicate order previews from Object tree.
- Changed Practice orders to short order rows by default.
- Clicking a short row or chart order chip opens one expanded order.
- Show all returns to the short order rows.
- Preserved Order, Go To, News, Journal, selected-order focus, SL/TP edits, close controls, object counts, and simulated-only order behavior.
- Added `stage29d8:qa`.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider calls, copied third-party branding/assets, hidden candles, or credentials were added.

Current handoff:

`TH-2026-08-28-STAGE29D8-PRACTICE-TERMINAL-COMPACT-SIDE-PANEL-HANDOFF`

## Stage 29D.9: Professional Practice Terminal Chart Tools Engine

Reference: `TH-2026-08-28-STAGE29D9-PRACTICE-TERMINAL-CHART-TOOLS-ENGINE-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Trend Line, Horizontal Line, Vertical Marker, Rectangle Zone, Text Note, Fibonacci Retracement, and Measure now work directly from the left rail against revealed chart candles.
- Trend Line, Zone, Fibonacci, and Measure use two-click placement with inline feedback.
- Saved drawings render as selectable chart overlays, use chart time-scale coordinates, and stay aligned after pan, zoom, replay steps, and timeframe changes.
- Objects now uses a compact object tree for Orders, Drawings, Events, and Bookmarks, with one selected-object editor for drawing updates/deletion.
- Escape cancels active placement or clears selection; Delete/Backspace removes the selected drawing when the student is not editing a field.
- Bottom Buy/Sell remain quick simulated market-order controls. The dedicated Order control remains the detailed order popout trigger.
- Added `stage29d9:qa`.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider calls, copied third-party branding/assets, hidden candles, raw provider payloads, vault refs, account IDs, secrets, or credentials were added.

Current handoff:

`TH-2026-08-28-STAGE29D9-PRACTICE-TERMINAL-CHART-TOOLS-ENGINE-HANDOFF`

## Stage 29D.10: Practice Terminal Drawing Capture Reliability

Reference: `TH-2026-08-28-STAGE29D10-PRACTICE-TERMINAL-DRAWING-CAPTURE-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Added a dedicated transparent chart capture layer while a drawing tool is active so Safari/browser clicks reliably reach the drawing engine.
- Pointer coordinates are converted into bounded candle index and price placement data, then saved through the existing student-owned drawing path.
- Kept Lightweight Charts `subscribeClick` as a fallback.
- Trend Line, Zone, Fibonacci, and Measure keep the two-click flow.
- Horizontal Line, Vertical Marker, and Text Note remain one-click tools.
- Chart clicks during placement do not open unrelated Order, Go To, News, Journal, or Objects panels.
- Added `stage29d10:qa`.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider calls, copied third-party branding/assets, hidden candles, raw provider payloads, vault refs, account IDs, secrets, or credentials were added.

Current handoff:

`TH-2026-08-28-STAGE29D10-PRACTICE-TERMINAL-DRAWING-CAPTURE-HANDOFF`

## Stage 29D.11: Practice Terminal Advanced Chart Tools Interaction Polish

Reference: `TH-2026-08-28-STAGE29D11-PRACTICE-TERMINAL-ADVANCED-TOOLS-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Added drag support for Rectangle Zone, Fibonacci Retracement, Measure, and Zoom; Trend Line now uses a two-click anchor and live button-free preview.
- Moved Horizontal price line and Vertical line under the Lines menu with Trend Line, and marked Ray, Extended Line, Horizontal Ray, and Cross Line as disabled coming-soon tools.
- Added mature colored Fibonacci levels/bands and kept multiple Fibonacci drawings supported.
- Added a real Text tool flow: click chart, type a bounded note, save it to the chart, then select/edit/delete it from Objects.
- Added Measure/Ruler drag rectangles with up/down color treatment and compact price-difference, percent, and candle-count summaries.
- Added drag-rectangle Zoom plus a visible Zoom out control and Escape cancellation.
- Added a Delete menu for deleting the selected drawing or clearing all drawings without touching orders, candles, events, or bookmarks.
- Made the right Objects panel less jam-packed with All, Orders, Drawings, Events, and Bookmarks filters plus compact rows before details.
- Kept bottom Buy/Sell as quick simulated-order controls and kept the detailed Order popout tied only to the Order control.
- Added `stage29d11:qa`.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider calls, copied third-party branding/assets, hidden candles, raw provider payloads, vault refs, account IDs, secrets, or credentials were added.
- Brush/freehand, Magnet snap, Ray, Extended Line, Horizontal Ray, and Cross Line remain intentionally disabled/coming soon.

Current handoff:

`TH-2026-08-28-STAGE29D11-PRACTICE-TERMINAL-ADVANCED-TOOLS-HANDOFF`

## Stage 29D.12: Practice Terminal Clear Drawings And Fibonacci De-Clutter

Reference: `TH-2026-08-28-STAGE29D12-PRACTICE-TERMINAL-CLEAR-DRAWINGS-FIB-DECLUTTER-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Stage 29D.12 originally made the rail trash button a direct clear action; Stage 29D.16 now opens an unclipped Delete menu with separate selected-delete and clear-all actions.
- Clear chart drawings deletes every tool-created practice drawing annotation for the current session.
- Clear chart drawings leaves candles, simulated orders, events, bookmarks, reports, assignment feedback, and journal records untouched.
- Added optimistic UI cleanup with rollback if any protected delete request fails.
- Reduced Fibonacci clutter: unselected Fibonacci drawings remain visible but quiet; full labels and prices appear only on the selected Fibonacci.
- Replaced the noisy top chart drawing-history strip with a single selected-drawing chip.
- Added `stage29d12:qa`.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider calls, copied third-party branding/assets, hidden candles, raw provider payloads, vault refs, account IDs, secrets, or credentials were added.

Current handoff:

`TH-2026-08-28-STAGE29D12-PRACTICE-TERMINAL-CLEAR-DRAWINGS-FIB-DECLUTTER-HANDOFF`

## Stage 29D.13: Practice Terminal Trendline Interaction And Line Tool Menu Fix

Reference: `TH-2026-08-28-STAGE29D13-PRACTICE-TERMINAL-TRENDLINE-MENU-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Superseded the earlier Trend Line behavior with first-click anchor, button-free live preview, and second-click endpoint save.
- Kept Trend Line, Horizontal price line, and Vertical line inside the Lines menu instead of exposing line variants as standalone primary rail tools.
- Opening the Lines menu clears stale selected-object state, and the Objects panel now shows a simple instruction when no object is selected.
- Tool switching cancels unfinished placement state; locked drawings block new placements with simple copy.
- Clear chart drawings remains scoped to tool-created practice drawings only and preserves candles, simulated orders, events, bookmarks, session data, reports, and journal data.
- Selected trendlines show endpoint handles; unselected line labels stay quiet until selected or hovered.
- Added `stage29d13:qa`.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider calls, copied third-party branding/assets, hidden candles, raw provider payloads, vault refs, account IDs, secrets, or credentials were added.

Current handoff:

`TH-2026-08-28-STAGE29D13-PRACTICE-TERMINAL-TRENDLINE-MENU-HANDOFF`

## Stage 29D.14: Practice Terminal Drawing Reliability Patch

Reference: `TH-2026-08-29-STAGE29D14-PRACTICE-TERMINAL-DRAWING-RELIABILITY-HANDOFF`

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Summary:

- Tightened the terminal drawing flow around the ref-backed drag state and elevated drawing capture layer so drag tools keep their latest pointer position during down, move, and release.
- Opening the Lines menu now clears stale active tool state, selected drawing/order state, placement state, and drawing errors before choosing a line tool.
- Trend Line is a two-click drawing tool: the first click anchors without saving, pointer movement previews, and the second click persists.
- Horizontal price line and Vertical line remain inside the Lines menu.
- clear chart drawings resets active drawing state and removes only tool-created drawings while preserving candles, simulated orders, events, bookmarks, session data, reports, and journal data.
- Added `stage29d14:qa`.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, private provider calls, copied third-party branding/assets, hidden candles, raw provider payloads, vault refs, account IDs, secrets, or credentials were added.

Current handoff:

`TH-2026-08-29-STAGE29D14-PRACTICE-TERMINAL-DRAWING-RELIABILITY-HANDOFF`

## Stage 29D.15: Practice Terminal Responsive Workstation Layout

Reference: `TH-2026-08-30-STAGE29D15-PRACTICE-TERMINAL-RESPONSIVE-WORKSTATION-HANDOFF`

Status: owner-accepted with Stage 29D on 31 August 2026.

Summary:

- The terminal now owns the full 100dvh viewport with hidden overflow and keeps the global app header/footer out of terminal routes.
- The right utility panel auto-collapses below the wide workstation breakpoint and opens as a bounded bottom drawer before xl instead of squeezing the chart at laptop widths.
- The side panel starts at xl with an 18rem width, then expands to 20rem at 2xl.
- The chart surface keeps a minimum 18rem height, and the bottom Buy/Sell dock waits until xl before using the dense three-column layout.
- The order ticket remains a wide chart overlay at xl and larger, while narrower screens keep it inside the drawer flow.
- Practice Sessions keeps the Stage 29E full-preview row layout guard for letter-by-letter wrapping.
- Added `stage29d15:qa`.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No chart drawing semantics, simulated order engine, provider behavior, AutoCopy coupling, payments, live execution, hidden candles, raw provider payloads, vault refs, account IDs, secrets, copied third-party branding/assets, or credentials were changed.

Current handoff:

`TH-2026-08-30-STAGE29D15-PRACTICE-TERMINAL-RESPONSIVE-WORKSTATION-HANDOFF`

## Stage 29D.16: Practice Terminal Drawing Tools Acceptance Fix

Reference: `TH-2026-08-30-STAGE29D16-PRACTICE-TERMINAL-DRAWING-TOOLS-ACCEPTANCE-HANDOFF`

Status: owner-accepted with Stage 29D on 31 August 2026.

Automated browser status: the complete seeded student suite passes 10/10 in Chromium. The focused production drawing suite passes 2/2 in WebKit at laptop/tablet viewports, including unclipped Lines/Delete geometry and real pointer hit-testing. Separate cold-navigation WebKit coverage passes twice per viewport from independent seeds and fresh servers. The owner accepted the corrected terminal in real Chrome and Safari on 31 August 2026.

Summary:

- The real student Practice Terminal initializes KLineChart 10.0.3 with TradeHub-owned overlays and no longer imports or initializes lightweight-charts. `@klinecharts/extension` remains installed for the isolated feasibility spike.
- Trend Line keeps a first anchor, updates a solid preview while the pointer moves with no button held, and persists only on the second click.
- Default Trend appearance is versioned as `trend_blue_v1` and uses `#2962ff` consistently for draft, preview, persisted/restored geometry, selection, and endpoint borders. Legacy unversioned Trends that inherited the old accent default render blue; explicit user color choices are preserved.
- Fibonacci, Measure, Zone, and Zoom retain primary-pointer drag ownership and ref-backed cancellation.
- Every completed drawing/zoom tool returns to Select; students explicitly reselect Trend to create each additional independent line.
- Versioned `klinecharts_v1` points support empty plot space before/after revealed candles while legacy coordinates remain readable and no future candles are requested.
- Native KLine overlays are the sole saved-geometry renderer and own selection/control points; explicit overlay stacking and release reconciliation persist KLineChart's authoritative endpoint movement.
- Lines and Delete use viewport-clamped fixed popovers outside the scrolling rail; their laptop/tablet bounds and `elementFromPoint` hit targets are browser-verified.
- Delete selected drawing removes only the focused drawing; Clear chart drawings remains a separate Delete-menu action using one bounded atomic student-scoped drawing-only batch with authoritative reconciliation after response loss.
- Text Note placement is a compact chart-local automatic editor with no Save/Cancel controls. Outside completion writes one valid note, blank/too-short drafts and Escape write nothing, and failed persistence retains the exact content and error.
- Intentional Text Note newlines survive CRLF normalization, creation, storage, retrieval, editing, reload, and compact blue chart-text rendering while bounded validation and single-line metadata remain intact.
- A TradeHub-owned bounded Fibonacci replaces the stock full-pane overlay, keeping seven retracement levels and restrained translucent fills between the two anchors before returning to Select.
- Measure is blue when dragged upward and red when dragged downward.
- Zoom Rectangle records its original viewport and its visible Zoom Out control sits above the capture layer to restore a sane bounded candle range.
- Login navigation uses one cross-lifecycle atomic guard and one same-origin document redirect; helpers wait for exact-path network-idle settlement without fallback navigation.
- Quick Session, assignment, and resubmission terminal entry use the Next app router. Cold WebKit laptop/tablet navigation passes twice each from independently seeded fresh dev-server processes, with created-session response capture and protected cleanup retained.
- KLineChart renders SMA and EMA on the candle pane plus RSI, ATR, and Volume MA in explicit lower panes. Indicator removal and revealed-list result lengths are browser-verified.
- The terminal fits only its initial data. Next Candle and Play preserve bar spacing and a historical candle's rendered x-coordinate, live-edge users keep following the latest candle, and Zoom Rectangle/Out history survives candle advances.
- Stage 29D.15 responsive shell behavior is protected by the new QA script.
- Added production Chromium/WebKit laptop/tablet pointer acceptance for empty-space plotting, every supported tool, one-shot restoration, multiline reload, endpoint movement, deletion/clear, zoom, and future-index bypass rejection.

Preserved:

- Practice remains student-owned, revealed-only, and simulated-only. No broker/exchange execution, AutoCopy coupling, provider behavior, payments, hidden candles, copied third-party branding/assets, raw payloads, vault refs, account IDs, secrets, or credentials were changed.

Current handoff:

`TH-2026-08-30-STAGE29D16-PRACTICE-TERMINAL-DRAWING-TOOLS-ACCEPTANCE-HANDOFF`

## Stage 29D.17: Practice Terminal Owner Acceptance Closure And Complaint-Roadmap Reconciliation

Reference: `TH-2026-08-31-STAGE29D17-PRACTICE-TERMINAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

Status: owner-accepted, closed, and frozen on 31 August 2026.

Summary:

- The owner confirmed the corrected production Practice Terminal works in real Chrome and Safari.
- The final accepted production architecture uses KLineChart 10.0.3 with TradeHub-owned overlays and preserves the Stage 29D.15 responsive workstation.
- Trend placement and saturated-blue appearance, compact automatic multiline Text Notes, bounded Fibonacci, directional Measure, Zoom Rectangle/Out, selected deletion, atomic clear, indicators, replay, navigation, and laptop/tablet layouts are accepted.
- Chromium and WebKit laptop/tablet automation remains supporting evidence for owner acceptance.
- Practice remains student-owned, revealed-candle-only, and simulated-only. No live execution, AutoCopy, payment, provider, credential, or hidden-candle boundary changed.
- Stage 29D is frozen unless a new reproducible defect is reported.
- Stage 29E remains Shared App Full-Preview Layout Stabilization. The remaining complaint roadmap is Stage 29F Journal, Stage 29G Crypto Journal Sync, Stage 29H Forex/MT5 Journal Sync, Stage 29I Copier, Stage 29J Signals, Stage 29K Telegram, Stage 29L Workspace, Stage 29M Super Admin, and Stage 29N final freeze.
- At the time of Stage 29D.17 closure, Stage 29F and later stages were unstarted and not accepted by that Practice closure. Current status below supersedes that historical note: Stage 29F is now owner-accepted, closed, and frozen as of 3 September 2026.

Current handoff:

`TH-2026-08-31-STAGE29D17-PRACTICE-TERMINAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

## Stage 29F: Journal Product Redesign And Data Separation

Reference: `TH-2026-09-03-STAGE29F-JOURNAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

Status: owner-accepted, closed, and frozen on 3 September 2026. Automated Chromium browser QA passes, and the owner accepted the Journal visual layout, My Trades/Backtesting separation, numerical reconciliation, bounded-cohort warning, and zero/one/multi-point Equity behavior.

Summary:

- `/app/journal` is now a read-only performance workspace with `My Trades` as the default and `Backtesting` as the separate second tab.
- Closure rule: `/app/journal` remains read-only, manual trade entry stays removed, My Trades and Backtesting remain financially separated, and Journal Sync remains independent from Copier.
- The current product no longer displays or requests manual CRUD, CSV import/export, archive/delete, manual review, or AI Insight from the main Journal. Historical manual records and protected APIs remain untouched for compatibility.
- A dedicated student-protected GET route returns bounded provider-confirmed connected-account summaries with no workspace/student/source/connection identifiers or diagnostics.
- Provider execution status is separate from Journal lifecycle. A raw `filled` entry remains `open`; only explicit provider-confirmed closure becomes `closed`, and only authoritative closed trades feed realized KPIs, equity, drawdown, and calendars.
- Paper, testnet, sandbox, demo, practice, dry-run, blocked, failed, and unconfirmed entries are excluded rather than guessed into real performance.
- Copied and provider-placed trade origins are distinct. Journal Sync does not derive readiness from Copier exchange connections, Forex provisioning, AutoCopy entitlement, or execution permissions.
- The repository queries a student-scoped newest-first `updatedAt` window, computes analytics across every bounded filtered match before visible slicing, and returns scanned/matched/visible plus `hasMore`/truncation metadata.
- Backtesting lazily loads existing student-owned simulated Practice analytics and keeps its P&L separate from My Trades.
- Backtesting uses one shared closed-order net-result calculation. Persisted fees replace the fee-bps estimate, while spread and slippage assumptions remain additive, so the seeded gross `+1,500` less `48` costs renders as net `+1,452` in session KPIs, equity/drawdown, daily/monthly, symbol, strategy, and recent-session results without double counting.
- Net-result calculation requires authoritative session assumptions and has no missing-session zero-cost fallback. One bounded session-backed order cohort feeds every Backtesting output; safe cohort metadata reports unmatched-order exclusions without identifiers.
- Backtesting visibly discloses incomplete bounded coverage before its KPIs. The warning is absent when no orders are excluded and otherwise shows correctly pluralized safe counts only, with no internal identifiers or diagnostics.
- The shared Equity chart preserves its zero-point empty state, renders one completed trade as a visible marker with final equity, and preserves existing multi-point equity/drawdown paths. The seeded one-point Backtesting state renders `101,452` and no complete-more-trades instruction.
- Source QA, Stage 29E, typecheck, lint, build, deterministic seed, and the corrected complete Chromium rerun pass. The 10/10 browser run includes zero/one-point Equity assertions, final equity `101,452`, isolated open/filled-entry/partial/closed-win/closed-loss fixtures, net `+1,452` reconciliation, an isolated `-108` loss/drawdown case, a closed unmatched-session order excluded from every aggregate, absent/present coverage-warning assertions, continued exclusion of its `+9,999` value from every result, filters, lifecycle KPIs, equity/calendar values, source labels, cleanup, Journal dataset separation, and wrong-role protection. Stage 29D.17 compatibility is restored in `plan.md` and reverified after this correction.
- Stage 29F is closed and frozen. Stage 29G is implemented/source-QA ready with owner/external provider acceptance pending. Stage 29H is not started. AI analysis remains future-only.

## Stage 29G: Crypto Journal Sync

Reference: `TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`

Status: implemented/source-QA ready. External provider acceptance and owner acceptance remain pending.

Summary:

- Added dedicated Journal-only crypto sync types, routes, repository helpers, and UI status/setup for Binance and Bybit read-only history.
- Journal Sync does not require Copier purchase, AutoCopy entitlement, execution permission, `exchange_connections`, or Forex provisioning.
- Credentials use a separate `journal_crypto_keys` namespace and remain server-only. Production fails closed unless the configured vault posture is ready; local/mock storage is development-only.
- Provider adapters use fixed official Binance/Bybit hosts and only permission/history endpoints. No order, transfer, withdrawal, leverage, position mutation, AutoCopy, payment, or live execution behavior was added.
- Binance permission checks use `/sapi/v1/account/apiRestrictions`; Binance history uses symbol-scoped `/api/v3/myTrades`. Bybit permission checks use `/v5/user/query-api`; Bybit spot history uses bounded `/v5/execution/list` windows.
- The Stage 29G correction pass implements Bybit V5 GET signatures with timestamp/API key/receive window/query-string signing, rejects every nonzero Bybit `retCode`, rejects malformed or mutation-capable Binance permission responses including `enableFixApiTrade` and `enablePortfolioMarginTrading`, retrieves Binance history only through documented <=24-hour `startTime`/`endTime` windows without combining `fromId`, walks Bybit history backward through bounded seven-day windows and cursors, validates rows against requested windows, rechecks read-only permissions before every sync, applies student-scoped owner-token single-flight/cooldown controls sized to the bounded request budget, coordinates credential/symbol changes through a short-lived config lock, captures credential fingerprint/version at sync start and verifies it in the final commit transaction, scopes idempotency to the opaque Journal connection identity, and dedupes copied-ledger executions through a separate server-only provider execution identity derived from stable raw provider order/execution values available to both ingestion paths.
- Complete replacement snapshots and incremental delta syncs are separate. Empty successful incremental syncs retain existing history; incremental new records stage retained active-generation rows plus the new delta so a sell after a prior-watermark buy does not lose position context.
- Journal Sync snapshots use generation-specific import entries, a single active generation pointer, and Firestore write chunks below 500 operations. Readers query the active generation at Firestore query time before applying visible limits; staging never overwrites active documents; the pointer flips only after every staging chunk succeeds; abandoned staging generation cleanup is connection-scoped, lease-aware, and age-bounded. Truncated, skipped, malformed, rate-limited, budget-exhausted, failed-staging, or otherwise incomplete snapshots are marked partial and cannot reconcile-delete or replace the last complete snapshot. Successful complete snapshots advance per-connection watermarks so normal syncs do not rescan the full bounded history every time.
- Bounded Binance crawling stores safe crawl progress separately from the active history pointer. The latest correction freezes one crawl boundary, carries per-symbol completed watermarks across partial runs, promotes only when every selected symbol reaches that boundary, and retains the completed watermarks after promotion.
- Credential replacement and selected-symbol changes are synchronization configuration changes. Every credential mutation, including same API key plus rotated secret, coordinates with the sync lease through a short-lived config lock; exact no-op submissions use a server-keyed credential mutation identifier and can avoid unnecessary credential-version creation. Production fails closed if the keyed mutation posture is unavailable, and legacy records without the new identifier are treated conservatively as replacements. A valid sync lease rejects replacement, sync rejects while replacement owns the config lock, sync loads only the exact credential version marker captured in connection metadata, the vault refuses stale/pending/retired/discarded/revoked/mismatched markers before provider requests, and the final commit rechecks owner-token, lock ownership, credential fingerprint, and credential version. Successful replacement activates the new credential metadata before retiring the previous Secret Manager/local version. If post-activation retirement fails, the new connection remains active and one idempotent server-only retryable cleanup task is recorded for the old version; repeated cleanup failures are bounded and never target the active version. Failed replacement discards only the attempted version and restores the previous working credential metadata/version. Successful changes reset or retire active generation, pending generation, crawl progress, and watermarks before new credentials or symbol selections become ready, so one provider account or symbol set cannot inherit another provider account's Journal history.
- stage29g:qa requires the exact boundary that credential or symbol changes reset or retire active and pending imported history instead of reusing another provider account's records.
- The latest Stage 29G correction serializes first-time connection creation through a student-scoped `verifying` placeholder and owned configuration lock before credential activation. Credential storage and final activation are bound to that owner token; final activation verifies the expected pending credential marker, expected verifying state, no active sync lease, and no disconnect/revocation state. Concurrent same-label first-create requests cannot both store credentials, concurrent first-time creates cannot exceed the connection limit, failed first-create cleanup discards only the version created by that request, and expired abandoned placeholders recover safely.
- Credential cleanup retries are now invoked by the authenticated Journal Sync overview path, not only direct tests. Cleanup processing queries only due retryable tasks oldest-first, claims a bounded due batch with an owner-token lease, rechecks cleanup action, target, owning connection, expected active marker, and lease before any vault call, then runs the exact action: `discard_failed_replacement` calls discard only for an unactivated failed replacement version, and `retire_previous_version` calls retirement only for an old active version after successful replacement. Future, resolved, blocked, and final-failed tasks do not occupy the due batch; repeated failures dedupe by connection/target/action, back off, and final-fail safely without exposing cleanup actions, targets, credential markers, vault refs, or lock owners to browser DTOs.
- Generation activation clears generation lease metadata and retires old generations only after the connection pointer no longer references them.
- Copied/Journal dedupe is execution/order-leg scoped: a copied buy plus provider-manual sell keeps the unmatched sell as execution-only history rather than discarding a full round trip or counting the sell as another open position.
- Stage 29G QA now includes Firestore emulator-backed repository lifecycle coverage that invokes the actual exported connect/sync/disconnect/overview repository functions with injected deterministic provider/vault dependencies. It covers first-time placeholder serialization, same-logical-connection first-create races, first-create marker drift, concurrent connection-limit enforcement, abandoned placeholder recovery, production-wired cleanup invocation, action-specific failed-replacement discard retry, previous-version retirement retry, due-only oldest-first cleanup selection, future/resolved/blocked/final-failed starvation prevention, cleanup worker claim/lease concurrency, active-target and changed-active-marker cleanup blocking before vault calls, bounded cleanup final failure, active-sync replacement races, same-key secret rotation during sync, replacement-first config-lock blocking, expired-config-lock stale-marker rejection, real/local vault stale/retired/discarded/revoked marker rejection, concurrent same-key replacements, keyed exact no-op detection, changed-secret replacement, successful previous-version retirement, failed-replacement rollback/discard, bounded cleanup retry/dedupe/success, selected-symbol removal/addition resets, failed staging chunks, active-pointer visibility, simultaneous connections, disconnect during sync, repeated multi-run eight-symbol Binance crawling, copied execution dedupe, and execution-only unmatched sells.
- Disconnect disables sync first and then deletes/erases credential material. Cleanup failure leaves durable support-safe cleanup metadata without secrets, first-time metadata creation failure revokes newly stored credentials, and production credential replacement uses Secret Manager version pinning plus local encrypted credential versions so a failed replacement can discard the failed version and preserve the previous working credential.
- Imported history is normalized into safe provider-confirmed Journal rows with opaque ids. Raw provider payloads, account ids, connection ids, credentials, vault refs, and diagnostics are not returned to the browser.
- Spot lifecycle reconstruction is conservative: raw `filled` is not public Journal `closed`; fill-derived spot round trips remain performance-ineligible without an authoritative starting-basis/closure checkpoint; missing fees stay unknown, unsupported fee currencies taint the lot, base-asset fees reduce received quantity, unknown starting inventory cannot fabricate performance, and only authoritative reconstructed closure is performance-eligible.
- Sync reconciliation is per Journal connection and never deletes another connection's or Copier's records. Final ledger writes recheck lock ownership and disconnected state, fake provider transport hard-fails in production, and newly stored credentials are revoked if connection metadata creation fails.
- My Trades keeps the owner-accepted Stage 29F layout and Backtesting remains unchanged/separate.
- Browser coverage exercises the real Connect, Sync now, reload, and Disconnect UI/API flow through the deterministic server-selected fake provider transport; it no longer inserts finished connection/history rows directly.
- Firestore browser rules deny direct access to Journal crypto credentials, connections, sync runs, and import metadata.
- Stage 29H Forex/MT5 Journal Sync remains unstarted.

Current handoff:

`TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`
