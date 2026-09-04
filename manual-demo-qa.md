# TradeHub Manual Browser QA And Demo Readiness Pack

Reference: `TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`

Purpose: this is the short, practical demo path for showing TradeHub in a local browser. It is manual QA plus a presenter script, not a production launch checklist.

Frozen foundations:

- Practice/backtesting: `TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF`
- Course/lesson: `TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF`
- Ops/CRM/payments/support: `TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF`
- Manual journal: `TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF`
- Forex/CFD history: `TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF`
- Messaging/reminders: `TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF`
- External signal ingestion: `TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF`
- Controlled live AutoCopy: `TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF`
- Manual browser demo pack: `TH-2026-08-23-STAGE26A-MANUAL-BROWSER-QA-DEMO-PACK-HANDOFF`
- Package sales: `TH-2026-08-24-STAGE27J-PACKAGE-SALES-MVP-FINAL-HANDOFF`
- Demo seed pack: `TH-2026-08-24-STAGE28A-DEMO-SEED-PACK-HANDOFF`
- Playwright browser QA foundation: `TH-2026-08-24-STAGE28B-PLAYWRIGHT-BROWSER-QA-FOUNDATION-HANDOFF`
- Student browser E2E: `TH-2026-08-24-STAGE28C-STUDENT-BROWSER-E2E-HANDOFF`
- Workspace/Admin browser E2E: `TH-2026-08-24-STAGE28D-WORKSPACE-ADMIN-BROWSER-E2E-HANDOFF`
- Browser QA polish: `TH-2026-08-24-STAGE28E-BROWSER-QA-POLISH-HANDOFF`
- Final demo readiness: `TH-2026-08-24-STAGE28F-FINAL-DEMO-READINESS-HANDOFF`
- Journal redesign: `TH-2026-09-03-STAGE29F-JOURNAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`
- Crypto Journal Sync: `TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`

## Local Run Commands

Terminal 1, start Firebase emulators:

```bash
cd /Users/idrissuleiman/Developer/tradehub
npm run firebase:emulators
```

Terminal 2, seed local demo data and start Next.js:

```bash
cd /Users/idrissuleiman/Developer/tradehub
npm run seed:demo
npm run clean:next
npm run dev:stage15f
```

Optional browser smoke, after the app is running:

```bash
cd /Users/idrissuleiman/Developer/tradehub
npx playwright install chromium
npm run browser:qa:student
npm run browser:qa:workspace-admin
npm run browser:qa
```

If you want Playwright to reuse an already-running dev server:

```bash
TRADEHUB_BROWSER_REUSE_SERVER=true npm run browser:qa
TRADEHUB_BROWSER_REUSE_SERVER=true npm run browser:qa:student
TRADEHUB_BROWSER_REUSE_SERVER=true npm run browser:qa:workspace-admin
```

If seeded sign-in fails:

- Confirm Terminal 1 is still running `npm run firebase:emulators`.
- Rerun `npm run seed:demo`.
- Restart the dev server with `npm run dev:stage15f`.
- Check that the browser test is using the seeded password `TradeHubDemo!123`.

When Playwright fails, inspect:

```text
test-results
playwright-report
```

Open:

```text
http://localhost:3000
```

## Seeded Local Logins

Stage 28A demo users all use:

```text
TradeHubDemo!123
```

Student:

```text
demo.student.active@example.test
```

Workspace/influencer:

```text
demo.pro.influencer@example.test
```

Super Admin:

```text
demo.superadmin@example.test
```

Additional package demo workspaces:

```text
demo.launch.influencer@example.test
demo.enterprise.influencer@example.test
demo.student.pending@example.test
demo.student.payment@example.test
```

Fallback Stage 15F users, if you intentionally run the older seed:

All seeded Stage 15F Auth emulator users use:

```text
Stage15F!Pass123
```

Student:

```text
student_stage15f_binance_sandbox@example.test
```

Influencer/workspace:

```text
stage15f.influencer@example.test
```

Super Admin:

```text
stage15f.admin@example.test
```

If the Auth emulator was restarted, rerun `npm run stage15f:seed-auth` before signing in.

## Demo Routes

Student routes:

- `/app`
- `/app/practice`
- `/app/practice/[sessionId]`
- `/app/practice/[sessionId]/terminal`
- `/app/practice/[sessionId]/report`
- `/app/journal`
- `/app/courses`
- `/app/courses/[courseId]`
- `/app/courses/[courseId]/proof`
- `/app/copier`
- `/app/signals`
- `/app/billing`

Workspace routes:

- `/workspace`
- `/workspace/courses`
- `/workspace/courses/[courseId]`
- `/workspace/onboarding`

Super Admin route:

- `/admin`

## Final Demo Readiness Freeze

Stage 28F marks internal build/demo readiness as source-QA frozen. The repo has deterministic demo seed data, Playwright browser smoke suites, helper guards, and this runbook wired for local/emulator demo checks. Do not claim browser QA passed unless it actually ran against the local emulator/dev-server flow.

In short: internal build/demo readiness is source-QA frozen.

### Must Run Before Any Sales Demo

Run these commands in order:

```bash
cd /Users/idrissuleiman/Developer/tradehub
npm run firebase:emulators
```

In a second terminal:

```bash
cd /Users/idrissuleiman/Developer/tradehub
npm run seed:demo
npm run clean:next
npm run dev:stage15f
```

In a third terminal:

```bash
cd /Users/idrissuleiman/Developer/tradehub
npx playwright install chromium
npm run browser:qa:student
npm run browser:qa:workspace-admin
npm run browser:qa
```

Then manually click the clean demo path:

```text
/workspace -> /app/practice -> /app/journal -> /app/courses -> /admin
```

### If Browser QA Fails

- Do not mark browser QA as passed.
- Confirm the Firebase emulators are running.
- Rerun `npm run seed:demo`.
- Restart `npm run dev:stage15f`.
- Open `test-results` and `playwright-report`.
- Record the failing route, persona, screenshot/trace path, and visible error.
- Fix only concrete browser/demo blockers in a follow-up bug-fix stage.

### Known External Setup Still Required

- Local Firebase Auth and Firestore emulators must be running.
- Demo seed data must be loaded into the emulator.
- Chromium must be installed with `npx playwright install chromium` if it is missing.
- Browser QA remains local/manual and is not part of `npm run build`.
- No production Firebase, payment, provider, messaging, broker, DNS, hosting, or live execution setup is required for this demo pack.

### Later Regression

- Add mobile browser suites for practice terminal, course reader, and journal review.
- Add browser coverage for malformed import flows.
- Add chart-level assertions for event marker hover after pan/zoom when selectors are stable.
- Add deeper multi-student and cross-workspace browser leakage tests.

## Must-Test Demo Flow

1. Student home/app overview
   - Sign in as the seeded student.
   - Open `/app`.
   - Confirm the app loads without broken cards, runtime errors, or confusing execution promises.
   - Show that TradeHub separates practice, courses, journal, billing, signals, and copier setup.
   - Confirm Reminder Preferences and external messaging-provider language are not shown in the normal student home.

2. Practice terminal/backtesting flow
   - Open `/app/practice`.
   - Show the two primary choices: Backtesting Session and Sessions.
   - Create a BTCUSDT session from Backtesting Session, or open a previous session from Sessions.
   - Open Session settings and show the safe read-only setup summary without deleting seeded assignment data.
   - Open terminal mode.
   - Reveal candles.
   - Show chart, order ticket, indicators, drawings, events, bookmarks, challenge/status panels, and simulated-only copy.
   - Place a simulated order only if the demo data supports it, then close/finish the session.
   - Open the report route and show browser print readiness.
   - Must not appear: hidden future candles, provider payloads, credentials, vault refs, broker passwords, MetaAPI tokens, live execution controls.

3. Journal My Trades and Backtesting
   - Open `/app/journal`.
   - Confirm `My Trades` is selected by default and shows the honest Journal Sync readiness state.
   - Confirm only provider-confirmed connected-account history can appear; an entry marked filled without authoritative closure remains open.
   - Use the account, market, symbol, status, source, and date filters and confirm the result-window count stays clear.
   - Switch to `Backtesting` and confirm simulated Practice metrics, calendar, breakdowns, and recent sessions load separately.
   - Open a recent Practice session review/report link when seeded data is available.
   - Must not appear: manual trade forms, CSV import/export, archive/delete controls, AI Insight, mixed real/simulated P&L, provider payloads, AutoCopy internals, or hidden Practice candles.

4. Courses/lesson/check/proof flow
   - Open `/app/courses`.
   - Search/filter courses if seeded data is present.
   - Open a course and lesson.
   - Show lesson navigation, resources, notes/bookmarks, deterministic checks, progress, and Continue Learning.
   - Open proof route after completion if the demo state supports it.
   - Must not appear: answer keys before submission, locked lesson resource links, private notes in workspace views, API/server/metadata/Firestore/stage/source-QA wording.

5. Workspace dashboard/CRM/course/practice/assignment insights
   - Sign in as the influencer.
   - Open `/workspace`.
   - Show readiness summary, student CRM lifecycle/status, billing/access indicators, practice insights, assignments/cohorts, course visibility, and external preview if seeded.
   - Keep the pitch focused on operational control: "see progress and support status without seeing private student data."
   - Must not appear: raw student IDs, raw trade rows, hidden candles, private notes, payment refs, provider payloads, credentials, AutoCopy internals.

6. Super Admin payment/support/AutoCopy/external signal/messaging readiness
   - Sign in as Super Admin.
   - Open `/admin`.
   - Show support/payment queues, messaging readiness, external signal ingestion preview, Forex/CFD history readiness, and controlled live AutoCopy readiness.
   - Emphasize that these are gates and runbooks, not broad live execution.
   - Must not appear: raw Paystack/Solana refs, webhook payloads, phone/email contact details, raw external messages, tokens, vault refs, account IDs, full order refs.

7. Controlled live AutoCopy stays blocked/frozen
   - In `/admin`, show the Stage 25 readiness/cohort/incident panels.
   - Confirm broad live remains blocked by default.
   - Confirm external preview signals are non-executable.
   - Confirm any cohort/canary UI is gated, dry-run-safe, or fail-closed.

## Quick Presenter Script

For an influencer, lead with the workspace value:

1. "This is your control room: student readiness, payments/access support, course progress, practice activity, and AutoCopy posture in one place."
2. "Students get a learning app: courses, practice backtesting, a read-only performance Journal, and copier setup."
3. "The risky parts are deliberately gated: real messaging is off, broad live AutoCopy is off, and secrets never show in the browser."
4. "For the demo, I’ll show student practice, journal review, course proof, then your workspace dashboard and Super Admin safety gates."

Keep voice explanation short. Let the product carry the story by clicking the cleanest routes first:

```text
/workspace -> /app/practice -> /app/journal -> /app/courses -> /admin
```

## Known Deferred Manual QA

- Full browser flow with fresh emulator state across student, influencer, and Super Admin accounts.
- Stage 28C Student End-to-End Browser QA with `npm run browser:qa:student`.
- Stage 28D Workspace And Super Admin End-to-End Browser QA with `npm run browser:qa:workspace-admin`.
- Stage 28E Browser QA polish verifies helper reuse and runbook clarity; real browser execution remains local/manual until emulators/dev server are available.
- Workspace cannot access /admin and Super Admin wrong-role check for /app/journal should show safe route-boundary copy.
- Practice terminal event marker hover after pan/zoom.
- Practice terminal order placement remains manual follow-up; use a fresh active session and do not fake success in Playwright.
- Historical Stage 21 manual-Journal import/export compatibility remains a later regression concern; it is not part of the current `/app/journal` demo and its removed controls must not be expected there.
- Course proof printing through the browser print dialog.
- Workspace assignment/cohort/resubmission workflow end to end.
- Super Admin dry-run messaging worker and suppression status.
- External signal mock candidate moderation and workspace preview.
- Controlled live AutoCopy readiness/cohort/incident panels remain non-executable.
- Cross-student and cross-workspace leakage checks with two separate seeded accounts.

## Demo Safety Boundaries

- Do not use production Firebase, production payment credentials, production broker credentials, or real student data.
- Do not enable broad live AutoCopy, real messaging, refunds, payouts, withdrawals, uploads, PDFs, AI, paid services, or provider integrations during the demo.
- Do not paste real API keys, MetaAPI tokens, broker passwords, wallet secrets, phone numbers, or production payment refs.
- Browser responses and UI should remain masked/status-only for protected operational records.

## Stage 29C Quick Session Demo

Owner browser acceptance remains deferred.

Automated browser status: the seeded student Playwright suite passed 7/7 on 25 August 2026. The walkthrough below remains the owner visual check.

1. Sign in as `demo.student.active@example.test` with the documented demo password.
2. Open `/app/practice` and choose Backtesting Session.
3. Show the compact opaque-black setup dialog and explain that Strategy is optional.
4. Search BTCUSDT, then show Crypto, Forex, Metals, Indices, and Energies. In the local static-demo setup, show an FX cross, Silver, NAS100, and USOIL without exposing broker/provider aliases.
5. Use the seeded local scenario: BTCUSDT, 1 hour, 1 July 2026 through 2 July 2026, starting balance 1,000, and No strategy.
6. Turn off Open terminal after creation, create once, and show the highlighted session in Sessions.
7. Repeat with Open terminal after creation enabled and show the simulated Practice Terminal.
8. Place a simulated order without selecting a Strategy and show that Strategy tagging is optional.
9. Confirm Session settings remains opaque black and that no unsupported assets, provider/cache details, secrets, AutoCopy actions, or live execution appear.

Stage 29C.1, Stage 29C.2, Stage 29C.3, and Stage 29D are implemented/source-QA ready. Owner visual acceptance remains deferred.

## Stage 29C.1 Expanded Forex/CFD Demo

1. Open Quick Session and show the five grouped categories without scrolling through unrelated setup panels.
2. Search EURGBP under Forex, XAGUSD under Metals, NAS100 under Indices, and USOIL under Energies.
3. Explain that the real catalogue is platform-verified server-side; students see canonical symbols only.
4. Create one bounded local static-demo session and open Terminal.
5. Confirm quantity, price precision, P&L, and report/export labels are instrument-aware.
6. Do not claim the real provider acceptance passed until an operator runs it with the approved utility account and vault configuration.

## Stage 29C.2 Expanded Crypto Demo

Owner browser acceptance remains deferred.

1. Rerun `npm run seed:demo`, open Quick Session, show that the catalogue is initially collapsed, then open it with the chevron and show All plus the available category counts.
2. Select Crypto and explain that the local deterministic catalogue contains 50 normalized approved pairs without requiring internet access.
3. Search `LINKUSDT`, select it, show that the catalogue closes and the Asset field displays `LINKUSDT · Chainlink / Tether`, then reopen it to show the preserved selection.
4. Create `Stage 29C2 LINK Session` for 1 July through 2 July 2026 at 1 hour and confirm only one session appears.
5. Open Terminal and show `Price 3 dp · Qty 2 dp` as the instrument-aware formatting cue.
6. Place a simulated LINKUSDT market order with aligned SL/TP, close 50%, and show the aligned remaining size, close event, and P&L state.
7. Remove the temporary standalone session after the demo.
8. Do not claim all exchange pairs are supported: runtime availability remains limited to the approved allowlist entries that pass current spot and instrument-filter verification.

## Stage 29C.3 Broader Forex/CFD Catalogue Demo

Owner browser acceptance remains deferred.

Automated browser status: the seeded student Playwright suite passed 8/8 on 26 August 2026. This walkthrough remains the owner-facing visual check.

1. Open Quick Session and confirm the Asset catalogue starts collapsed.
2. Open it and show at least 40 Forex candidates plus Metals, Indices, and Energies.
3. Search EURGBP, XAGUSD, SPX500, JPN225, USOIL, and NATGAS and point out the canonical student-facing names.
4. Search FRA40 and show the disabled safe-unavailable state. Explain that TradeHub never presents an asset as usable until its instrument rules and bounded candles are available.
5. Create the seeded EURGBP or USOIL static-demo H1 session for 1-2 July 2026 and open Terminal.
6. Show instrument-aware precision, pip/tick labels, simulated sizing, and P&L without exposing broker aliases or provider details.
7. Reopen Quick Session and show that the catalogue still collapses after selection and preserves the selected asset.
8. Do not claim every broker symbol is supported. Real availability is verified by the configured server-side utility provider and otherwise fails closed.

## Stage 29D Practice Terminal Demo

Owner browser acceptance remains deferred.

1. Open a seeded BTCUSDT terminal and pause on the first viewport: compact toolbar, drawing rail, dominant chart, utility tabs, floating replay controls, and bottom Buy/Sell bar should all be visible.
2. Step candles forward, change replay speed, then pan and zoom. Hover an event marker before and after moving the chart to show that it follows candle time.
3. Open Order, submit one simulated trade, then open Object tree to focus the order and show its instrument-aware P&L state.
4. Add one supported line or note from the left rail and show it in Object tree and Journal.
5. Open Go To, News and events, and Journal to show navigation, revealed events, bookmarks, feedback, report, and reflection shortcuts without leaving the terminal shell.
6. Toggle fullscreen if the browser allows it, then show a phone/tablet viewport and confirm the chart remains above the tabbed panel.
7. State clearly that the workflow is simulated practice. Do not claim real news, broker execution, or copied third-party functionality.

Stage 29D is owner-accepted, closed, and frozen through Stage 29D.17 as of 31 August 2026.

## Stage 29D.1 Workstation Terminal Demo

Owner browser acceptance remains deferred.

1. Open an untouched active terminal and show that the first viewport is fully isolated from the TradeHub site header/footer.
2. Point out the full timeframe strip, chart type, indicators, utility actions, 44px tool rail, centered top replay controls, and compact trading footer.
3. Show that unsupported intervals/tools are honestly disabled while supported line, zone, text, measure, zoom, lock, visibility, and delete controls remain available.
4. Confirm the bounded warm-up provides useful candle context while the status count proves later candles remain unrevealed.
5. Collapse the right panel to maximize the chart, reopen Order, place a simulated trade, then show Object tree and P&L.
6. Pan/zoom and hover an event marker before and after replay movement.
7. Resize to tablet and phone widths, collapse/reopen the bottom utility drawer, and confirm no parent shell, page overflow, or double scrollbar appears.
8. State clearly that this remains student-owned simulated practice with no live execution or copied third-party assets.

Stage 29D.1 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.2 Terminal Candle Reliability Demo

Owner browser acceptance remains deferred.

1. Start emulators, run `npm run seed:demo`, and open `/app/practice`.
2. Open an ETHUSDT terminal. ETHUSDT terminal should reveal candles in local demo testing instead of staying at `0/0`.
3. Create a fresh ETHUSDT quick session and open Terminal.
4. Confirm the chart shows the bounded warm-up candles, then step forward once.
5. Show that the order ticket uses the latest revealed price and remains simulated-only.
6. State clearly that emulator fallback is for local demo reliability only. Production Crypto candles still use the approved public-history path.

Stage 29D.2 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.3 Terminal Trading Dock Demo

Owner browser acceptance remains deferred.

1. Open a seeded ETHUSDT or LINKUSDT Practice Terminal.
2. Confirm the lower dock reads like a trading control strip: round Buy, round Sell, wide quantity field, and quick order-ticket button.
3. Click Buy and Sell and show that the Order panel focuses but no broker or exchange order is placed.
4. Zoom the chart and confirm the candles remain dense with surrounding context visible.
5. Confirm the larger left tool rail feels usable at laptop and narrow widths.
6. Toggle the right utility panel and confirm the chart still has enough room.

Stage 29D.3 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.4 Order Ticket Popout Demo

Owner browser acceptance remains deferred.

1. Open a seeded Practice Terminal and reveal at least one candle.
2. Click the dedicated Order control and show that Place Order opens as a black chart overlay instead of filling the right utility panel.
3. Point out the Preset affordance, close button, side/type controls, SL/TP/risk fields, notes, and Practice only label.
4. Close the ticket and show the right panel returns to the normal Objects view.
5. Open Order from the right-side utility controls and confirm the same popout appears.
6. Submit one simulated order and state clearly that no broker or exchange order is sent.

Stage 29D.4 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.5 Quick Buy/Sell Trigger Demo

Owner browser acceptance remains deferred.

1. Open a fresh active Practice Terminal with revealed candles.
2. Click bottom Buy and show that a simulated Buy market order is accepted without opening the Place Order popout.
3. Click bottom Sell and show the same quick simulated behavior.
4. Open Order, set custom directional SL/TP values, close the Place Order popout, then confirm quick Buy/Sell can still use those custom levels.
5. Click Order from the dedicated control and show that this is the normal way to open the detailed popout.
6. Click timeframe, Indicators, Go To, News, Journal, Objects, fullscreen, replay, and drawing controls; none should open the Order popout.
7. Point out that coming-soon tools are disabled and that no broker, exchange, AutoCopy, or live order action is present.

Stage 29D.5 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.6 Quick Trade And Tool Feedback Demo

Owner browser acceptance remains deferred.

1. Open a fresh active terminal and reveal at least one candle.
2. Leave the detailed Order ticket closed and keep SL/TP empty.
3. Click bottom Buy, then bottom Sell, and confirm each creates a simulated market order with quick default SL/TP instead of showing an SL/TP error.
4. Confirm the bottom quantity field shows a usable quick-trade quantity before the click.
5. Click cursor, zoom, lock, visibility, horizontal line, vertical marker, zone, text, and measure.
6. Confirm each working tool gives dock feedback or opens Journal/Review for placement.
7. Confirm trend line, brush, and magnet remain disabled/coming soon.
8. State clearly that every order remains simulated practice only.

Stage 29D.6 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.7 Interactive Tools And Clean Order History Demo

Owner browser acceptance remains deferred.

1. Open a Practice Terminal with revealed candles and at least one simulated order.
2. Show that chart history uses compact BUY/SELL order chips.
3. Click one order chip and show that the side panel focuses only that order.
4. Click Show all to restore the full simulated order list.
5. Select horizontal line, vertical marker, zone, text note, and measure from the left rail.
6. After each selection, click the chart and show the object appears directly on the chart.
7. Select one object on the chart and show it can be edited or deleted from Objects.
8. Point out that brush and magnet are disabled/coming soon rather than fake-working.
9. State clearly that all orders and chart tools remain practice-only and simulated-only.

Stage 29D.7 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29E Shared Full-Preview Layout Demo

Owner browser acceptance remains deferred.

1. Open `/app/practice` in full Safari preview.
2. Go to Sessions and confirm the session card fills a sensible app width instead of a narrow centered strip.
3. Confirm session title, date range, progress, Strategy, review text, and action buttons read normally and do not wrap one character per line.
4. Confirm `/app`, `/workspace`, and `/admin` no longer show the full landing/demo navigation in the signed-in header.
5. Open `/app`, `/app/courses`, `/app/journal`, `/workspace`, and `/admin`.
6. Confirm normal dashboard cards, buttons, and paragraphs remain readable at full preview and split-screen widths.
7. Confirm the Practice Terminal remains its own fullscreen workstation route.

Stage 29E is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.8 Compact Side Panel Demo

Owner browser acceptance remains deferred.

1. Open a Practice Terminal that has several simulated orders.
2. Open Objects and show that the tab strip is icon-based, with the active panel title shown inside the panel.
3. Show that Object tree contains counts only.
4. Show the Orders list as short rows, not a long stack of full cards.
5. Click one short row or chart order chip and show only that one order expands.
6. Click Show all and show the short list returns.
7. Open Order, Go To, News, and Journal to confirm each tab opens the expected tool.
8. State clearly that every order remains simulated practice only.

Stage 29D.8 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.9 Chart Tools Engine Demo

Owner browser acceptance remains deferred.

1. Open a Practice Terminal with revealed candles.
2. Select Trend Line and click two chart points to show a real diagonal object.
3. Select Fibonacci and click two chart points to show retracement levels and price labels.
4. Place Horizontal Line, Vertical Marker, Rectangle Zone, Text Note, and Measure.
5. Pan or zoom the chart and show that objects stay attached to their candle/time positions.
6. Open Objects and show compact rows for Orders, Drawings, Events, and Bookmarks.
7. Click one drawing row and show only that object editor expands.
8. Edit one object label or color, then delete one selected object.
9. Click bottom Buy/Sell and show they submit quick simulated market orders without opening the Order popout.
10. Click Order and show the detailed order popout opens only from that control.
11. State clearly that chart tools and orders are practice-only and use revealed candles only.

Stage 29D.9 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.10 Drawing Capture Reliability Demo

Owner browser acceptance remains deferred.

1. Open a Practice Terminal with revealed candles in Safari.
2. Select Horizontal Line and click the chart.
3. Show that the line appears immediately and Drawings count increases.
4. Select Trend Line and click two chart points.
5. Show first-point feedback, then the finished line after the second click.
6. Repeat quickly with Zone, Fibonacci, Text Note, Vertical Marker, and Measure.
7. Open Objects and show the created drawings as compact rows.
8. Pan or zoom the chart and show that drawings stay attached to the candle area.
9. State clearly that the capture layer only supports practice drawings and does not touch live execution.

Stage 29D.10 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.11 Advanced Chart Tools Demo

Owner browser acceptance remains deferred.

Before testing, restart the local dev server and hard refresh the browser. If the terminal behaves like an older build, clear `.next` in a separate cleanup pass or restart the preview process so stale Next chunks are not being served.

1. Open a Practice Terminal with revealed candles.
2. Open the Lines menu and show that Trend Line, Horizontal price line, and Vertical line are active.
3. Point out that Ray, Extended Line, Horizontal Ray, and Cross Line are intentionally disabled/coming soon.
4. Click a Trend Line start, move with no button held, click the endpoint, and repeat once to show multiple trend lines.
5. Drag Fibonacci and show the colored retracement levels/bands; repeat once to show multiple Fibonacci drawings.
6. Select Text, click the chart, type a short note, save it, then select the note from Objects and edit/delete it.
7. Drag Measure upward and downward; confirm blue/green vs red styling and compact diff/percent/candle-count summary.
8. Select Zoom, drag a rectangle, then click Zoom out. Press Escape during an active chart action and confirm it cancels.
9. Use the Delete menu to delete a selected drawing, then clear all drawings; confirm orders, candles, events, and bookmarks remain.
10. Open Objects and switch All, Orders, Drawings, Events, and Bookmarks filters; detail should appear only after selecting a row.
11. Click bottom Buy/Sell and confirm they remain quick simulated orders.
12. Click Order and confirm only that control opens the detailed order popout.
13. State clearly that all chart tools are practice-only, revealed-candle-only, and do not touch live execution or AutoCopy.

Stage 29D.11 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.12 Clear Drawings And Fib De-Clutter Demo

Owner browser acceptance remains deferred.

Before testing, restart the local dev server and hard refresh the browser. If old behavior appears, clear `.next` in a separate cleanup pass and restart the preview process.

1. Open a Practice Terminal with revealed candles.
2. Create several Fibonacci retracements in different chart areas.
3. Confirm unselected Fibonacci drawings stay visually quiet, while the selected Fibonacci shows its full labels and price levels.
4. Add Trend Line, Zone, Text Note, and Measure drawings.
5. Click the left rail Clear chart drawings trash button.
6. Confirm all tool-created drawings disappear from the chart and Objects panel.
7. Confirm candles, orders, events, bookmarks, reports, feedback, and journal records remain untouched.
8. Repeat once after pan, zoom, and replay stepping.
9. State clearly that clear-all affects practice chart drawings only and does not touch live execution, AutoCopy, provider data, or private account data.

Stage 29D.12 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.13 Trendline And Lines Menu Demo

Owner browser acceptance remains deferred.

Before testing, restart the local dev server and hard refresh the browser. If old drawing behavior appears, clear `.next` in a separate cleanup pass and restart the preview process.

1. Open a Practice Terminal with revealed candles.
2. Open Lines and select Trend Line.
3. Click the start, move diagonally with no button held, and click the endpoint to show a live preview and saved trendline.
4. Draw two or three trendlines with different slopes and lengths.
5. Reopen Lines, place a Horizontal price line, then place a Vertical line.
6. Open Objects and show each line as its own drawing row.
7. Select one line row and confirm only that line highlights; unselected lines should stay visually quiet.
8. Open Lines again and confirm the selected-object panel does not keep stale text for a previous drawing.
9. Lock drawings and confirm a new line tool is blocked with a clear message.
10. Click Clear chart drawings and confirm all chart drawings disappear while candles, orders, events, bookmarks, session data, reports, and journal data remain.
11. State clearly that these are practice-only chart tools and do not touch live execution, AutoCopy, providers, or private account data.

Stage 29D.13 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.14 Drawing Reliability Demo

Owner browser acceptance remains deferred.

Before testing, stop the local dev server, run `npm run clean:next`, restart `npm run dev:stage15f`, and hard refresh the browser. This avoids stale Next chunks from older terminal builds.

Automated browser status: seeded student Playwright QA passed 8/8 on 30 August 2026 after a warmed rerun. Owner visual acceptance remains deferred.

1. Open `/app/practice`, choose Sessions, and open a Terminal.
2. Reveal several candles.
3. Open Lines and confirm any old selected text/order/drawing panel state clears.
4. Select Trend Line, click the start, move diagonally with no button held, and click the endpoint.
5. Draw multiple trendlines with different lengths and slopes.
6. Reopen Lines and place Horizontal price line and Vertical line from the same menu.
7. Click clear chart drawings and confirm every tool-created drawing disappears.
8. Confirm candles, simulated orders, events, bookmarks, session data, reports, and journal data remain.
9. State clearly that this is practice-only chart markup and does not touch live execution, AutoCopy, providers, or private account data.

Stage 29D.14 is implemented/source-QA ready. Owner browser acceptance remains deferred.

## Stage 29D.15 Responsive Workstation Demo

Owner acceptance was confirmed in real Chrome and Safari on 31 August 2026. Retain this walkthrough for regression demos.

Before testing, stop the local dev server, run `npm run clean:next`, restart `npm run dev:stage15f`, and hard refresh the browser. This avoids stale Next chunks from older terminal builds.

1. Open `/app/practice`, choose Sessions, and confirm session rows do not collapse into vertical letters at full preview width.
2. Open a seeded Practice Terminal at laptop/full-preview width.
3. Confirm the terminal fills the viewport with no global app header/footer.
4. Confirm the right utility panel starts collapsed or opens as a bottom drawer below xl instead of squeezing the chart.
5. Toggle Objects, Order, Go To, News, and Journal and confirm candles plus the price axis remain readable.
6. Confirm the Buy/Sell dock wraps cleanly and does not overlap the chart.
7. Resize to tablet or split view and repeat the panel toggle.
8. Resize to xl or wider and confirm the compact right-side workstation panel returns.
9. State clearly that this is a simulated practice terminal and does not touch live execution, AutoCopy, providers, payments, or private account data.

Stage 29D.15 is owner-accepted with Stage 29D and frozen unless a reproducible regression is reported.

## Stage 29D.16 Drawing Tools Acceptance Demo

Owner acceptance was confirmed in real Chrome and Safari on 31 August 2026. Retain this walkthrough for regression demos.

Automated browser status: the complete seeded student suite passes 10/10 in Chromium. The focused KLineChart drawing suite passes 2/2 in WebKit at laptop/tablet viewports, including visible Lines/Delete popover geometry and pointer hit-testing. Separate cold-navigation WebKit coverage passes twice per viewport from independent seeds and fresh servers. These checks remain supporting regression evidence for the owner-accepted real Chrome/Safari behavior.

1. Open a seeded Practice Terminal and reveal several candles.
2. Open Lines and show that the opaque menu clears the tool rail, stays inside the viewport, and visibly exposes Trend, Horizontal, and Vertical. Click Trend with the pointer, draw using first click, button-free preview, and second click. Show that Select is restored, then reselect Trend and create another line in empty space after the revealed candles.
3. Create a line in empty space before the first candle and confirm the revealed candle count does not change. Place Horizontal and Vertical lines and confirm each tool returns to Select.
4. Select one native KLine drawing, move a visible endpoint, reload to prove the authoritative point persists, open the unclipped Delete menu, and use Delete selected drawing; show that the other drawings remain.
5. Select Text Note and show the compact chart-anchored editor with no Save/Cancel buttons. Enter `First line` and `Second line` on separate lines, click outside to commit exactly once, edit it, reload, and confirm the line breaks remain visible in compact blue chart text before removing it. Show that blank/Escape drafts make no record and a failed automatic save keeps the text available.
6. Draw Fibonacci and Zone; confirm Fibonacci's seven retracement levels and fills stop at both selected x anchors rather than spanning the pane, then delete them without leaving either tool armed.
7. Drag Measure upward to show blue and downward to show red.
8. Drag a Zoom Rectangle and then use the visible Zoom Out control to restore a sane chart viewport.
9. Enable SMA, EMA, RSI, ATR, and Volume MA, show their main/lower panes, then disable them and confirm the panes/indicators are removed.
10. Zoom and pan away from the live edge, reveal one candle and play several more, then confirm the visible historical anchor and bar spacing remain stable. Return to live and show that replay follows the latest candle without resetting zoom.
11. Reopen Delete, use Clear chart drawings, and confirm drawings disappear while candles, simulated orders, events, bookmarks, reports, journal data, and non-drawing annotations remain. A lost response after a committed clear must not restore deleted drawings.
12. Resize below xl and back to xl to confirm the Stage 29D.15 bottom drawer and side-panel workstation behavior remains stable.
13. State clearly that KLineChart receives only the authoritative revealed slice and cannot place live orders, invoke AutoCopy, or expose provider/private account data.
14. From a freshly started server, sign in, open Practice, create with Open terminal enabled, and confirm the terminal remains open rather than returning to `/app` or `/app/practice`.
15. Draw and reload a default Trend Line, then select it. Confirm its preview, saved segment, endpoint borders, and restored geometry stay saturated blue `#2962ff` rather than changing to the TradeHub gold accent.

Stage 29D.16 is owner-accepted with Stage 29D and frozen unless a reproducible regression is reported.

## Stage 29D.17 Owner Acceptance Closure

Owner acceptance date: 31 August 2026.

Reference: `TH-2026-08-31-STAGE29D17-PRACTICE-TERMINAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

- The owner confirmed the production Practice Terminal works in real Chrome and Safari.
- The accepted architecture is KLineChart 10.0.3 with TradeHub-owned overlays and the Stage 29D.15 responsive workstation.
- Trend, compact automatic Text Notes, Fibonacci, Measure, Zoom, Delete/Clear, indicators, replay, navigation, and laptop/tablet behavior are accepted.
- Practice remains student-owned, revealed-candle-only, and simulated-only, with no live execution, AutoCopy, payment, provider, credential, or hidden-candle change.
- Stage 29D is closed and frozen. Stage 29E remains the completed shared-layout stage; Stage 29F is owner-accepted, closed, and frozen as of 3 September 2026.

## Stage 29F Journal Demo

Stage 29F is owner-accepted, closed, and frozen as of 3 September 2026. The seeded Chromium student suite passes 10/10, and the owner accepted the Journal visual layout, My Trades/Backtesting separation, numerical reconciliation, bounded-cohort warning, and zero/one/multi-point Equity behavior.

Closure rule: `/app/journal` remains read-only, manual trade entry stays removed, My Trades and Backtesting remain financially separated, and Journal Sync remains independent from Copier.

1. Open `/app/journal` as the active demo student and point out the default `My Trades` tab.
2. Show the compact KPI strip, equity area, calendar, account/source/period controls, bounded scanned/matched/visible counts, and honest provider-confirmed empty state.
3. Explain that provider execution status is separate from Journal lifecycle: a filled entry remains open, and only provider-confirmed closure affects realized KPIs, equity, drawdown, and calendars.
4. Explain that paper, testnet, demo, dry-run, failed, and unconfirmed records are deliberately excluded from real performance.
5. Point out that Journal Sync uses a dedicated read-only connection path; Copier setup is not presented as Journal setup.
6. Open `Backtesting` and show its simulated-only label, analytics, calendar, strategy/symbol breakdown, and recent session review links.
7. Confirm the seeded BTCUSDT net result is `+1,452` in the KPI, monthly result, symbol result, strategy result, and recent-session row. Explain that gross `+1,500` less `48` simulated costs equals net `+1,452`.
8. Confirm the single completed seeded trade produces a visible Equity marker and labelled final equity of `101,452`; the chart must not show its complete-more-trades empty message.
9. Explain that every Backtesting result requires its authoritative bounded session assumptions. When any bounded order record is excluded because its session is unavailable, confirm a restrained coverage warning appears before the KPIs with safe counts only. Complete cohorts must show no warning, and no zero-cost assumption is invented.
10. Switch back to the clean `My Trades` zero state and confirm its legitimate Equity empty message remains visible and the two datasets stay separate.
11. Do not demonstrate old manual CRUD/review routes as the current Journal product. Historical records remain preserved only for compatibility.
12. Do not promise AI analysis or Forex/MT5 sync; those are future-only. Stage 29G Crypto Journal Sync is implementation-ready with external provider acceptance pending, and Stage 29H remains unstarted.

Browser-run note on 1 September 2026: the complete Equity-corrected run passed 10/10. The Journal case confirmed the genuine My Trades zero-point empty state, a visible seeded Backtesting one-point marker and final equity `101,452`, the five-state lifecycle fixture matrix, authoritative-closed calculations, net `+1,452` API/UI reconciliation, isolated `-108` loss/drawdown behavior, consistent exclusion of a closed unmatched-session order, no coverage warning for the complete cohort, a visible safe one-record warning for the incomplete cohort, continued exclusion of the unmatched `+9,999` result from every output, filters, Copier-independent Journal Sync posture, temporary-fixture cleanup, dataset separation, responsive width, and wrong-role blocking.

## Stage 29G Crypto Journal Sync Demo

Stage 29G is implemented/source-QA ready. Real Binance/Bybit owner acceptance is pending until approved read-only test accounts are exercised.

Reference: `TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`

1. Open `/app/journal` as the active demo student and stay on `My Trades`.
2. Show the compact `Journal Sync` area for read-only crypto history.
3. Explain that this is independent from Copier purchase, AutoCopy execution, Forex provisioning, and practice results.
4. Show safe states only: not configured, verifying, ready, syncing, partial, failed, or disconnected.
5. If using local fixtures, show a dedicated Journal Sync account row and provider-placed BTCUSDT/LINKUSDT history.
6. Confirm a provider `filled` entry without an authoritative starting-basis/closure checkpoint remains open or performance-ineligible and does not count as a closed trade.
7. Confirm imported rows are newest-first, bounded, and honest about skipped/truncated/partial history without exposing raw ids or diagnostics.
8. Confirm copied history remains labelled `Copied`, provider-placed history remains labelled `Placed at provider`, and the same raw provider execution cannot appear twice.
9. Confirm partial sync states never replace the last complete snapshot during the demo; bounded Binance crawl progress resumes against a frozen boundary, empty incremental syncs keep prior history, and successful incremental syncs stage retained active rows plus new records before the active generation pointer changes.
10. Confirm abandoned-generation cleanup is scoped to the active Journal connection, respects live sync leases, and only cleans stale staging generations.
11. Confirm first-time connection creation is serialized: the server creates a `verifying` placeholder before activation, a simultaneous same exchange/account-label request fails safely, and only one credential becomes active.
12. Confirm every credential mutation is locked, including the same API key with a rotated/new secret: replacement is rejected while a sync is actively leased, and sync is rejected while replacement owns the config lock. Exact no-op submissions use a server-keyed credential mutation identifier; production must fail closed if that keyed posture is unavailable.
13. Confirm sync loads only the exact credential version marker captured at lease start; stale, pending, retired, discarded, revoked, or mismatched markers fail before provider requests.
14. Confirm successful credential replacement activates the new credential metadata before retiring the previous version. If retirement initially fails, the new connection stays active and one bounded server-only `retire_previous_version` task tracks the old version without exposing it to the browser. Failed replacement preserves the previous working credential; if attempted-version discard initially fails, one bounded `discard_failed_replacement` task tracks only the unactivated attempted version.
15. Confirm due cleanup retries run through an authenticated server-owned Journal Sync path, query only due retryable tasks oldest-first, process only a small bounded batch, use an owner-token lease, execute the correct discard-vs-retire vault operation, never touch the active credential, and expose no cleanup actions, targets, lock owners, vault refs, or credential markers to the browser.
16. Confirm changing credentials or the selected symbol set resets/retires the active/pending import state so removed symbols or older provider-account history do not linger.
17. Confirm copied/Journal dedupe is execution-leg scoped: a copied buy does not hide an unmatched provider-manual sell, and the unmatched sell is execution-only rather than another open trade.
18. Switch to `Backtesting` and confirm simulated Practice results remain separate.
19. Do not show or type real credentials during a live sales demo. Use owner-approved read-only test credentials only in a private QA session.
20. Confirm no provider payloads, permission dumps, raw ids, secrets, mutation identifiers, credential version markers, cleanup targets, vault refs, payments, AutoCopy internals, or live-order controls are visible.
