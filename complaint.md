# TradeHub Product Complaints And Requested Corrections

Date recorded: 2026-08-24

Status: Product review only. No product correction has been authorized or implemented from this document yet.

## Product Direction

- Reduce every student, influencer, and Super Admin screen to the major actions and information needed for that role.
- Stop placing many unrelated operational panels on one long scrolling page.
- Use clear navigation and focused views instead of internal implementation explanations.
- Student-facing copy must describe the product task, not APIs, Firestore, metadata, provider internals, stages, server ownership, or engineering safeguards.
- Preserve role separation and privacy. Students, influencers, and Super Admins must only see what they need for their work.
- Responsive and narrow-screen polish can wait until the main product workflows below are corrected.

## 1. Student Home And Reminders

- The current student home test passed.
- Remove Reminder Preferences from the TradeHub student home.
- Remove student-facing reminder-preference material that is no longer part of the intended product.
- Keep the home minimal and focused on Courses, Signals, Copier, Journal, Practice, and Billing.

## 2. Practice And Backtesting

### Practice landing page

- Replace the current long Practice page with two clear primary choices:
  - `Backtesting session`: opens a small `Start a new session` action and quick-session setup.
  - `Sessions`: opens the list of previous sessions.
- Assignments, notifications, analytics, playbooks, imports, exports, reports, and other supporting functions must not all appear in one long default page. They should move behind focused tabs, menus, or secondary views when retained.

### Quick session creation

- Use the supplied FX Replay screenshots as a workflow reference, not as assets to copy.
- The quick-session form should include:
  - session name
  - starting account balance
  - optional strategy
  - searchable asset selector grouped by asset class
  - timeframe
  - start and end date
  - random-start option
  - optional saved chart layout when TradeHub supports it
- Do not add Prop Firm Session or Advanced Session now.
- Do not claim all global Forex, crypto, indices, metals, energy, stocks, or futures instruments are available unless TradeHub has licensed historical data and instrument specifications for them.

### Assets

- The asset selector should look and behave like a proper searchable market selector.
- It should group only genuinely supported instruments by asset class.
- The current TradeHub provider supports a limited set, not every asset shown by FX Replay.
- Additional assets require provider coverage, symbol mapping, historical data, contract specifications, and tests.

### Terminal

- Opening a new session should go directly to a clean, full-screen terminal.
- Reorganize the terminal tools to follow a familiar professional chart workflow:
  - symbol and timeframe controls
  - replay controls
  - order ticket
  - indicators
  - drawing tools
  - Go To
  - events/news markers
  - journal/review
  - balance, realized P&L, unrealized P&L, and risk controls
- Existing functional TradeHub tools should be retained but reorganized.
- Do not promise an exact copy of every FX Replay or TradingView tool. TradeHub currently uses `lightweight-charts`, not the full licensed TradingView Charting Library.
- Every displayed tool must work. Placeholder tools should not be presented as finished tools.

### Previous sessions

- The Sessions view should show previous sessions as a clean list with:
  - name, asset, timeframe, date range, status, progress, balance/equity, P&L, and last updated time
  - open/continue session
  - analytics/report shortcut
  - duplicate setup
  - archive/restore where useful
  - delete session with explicit confirmation
  - session settings
- Session settings should open in a side drawer similar to the supplied reference and allow safe changes based on session status.
- Completed sessions must retain safe locking rules.

### Playbooks

- Clarify why TradeHub has playbooks when FX Replay can start with only a session.
- A playbook is a reusable strategy template containing setup rules, entry checklist, invalidation rules, and risk notes. It supports consistency and strategy analytics.
- Playbooks should not dominate session creation.
- Rename the visible concept to `Strategy` where clearer, make it optional for quick session creation, and place full playbook management in a secondary Strategy area.
- Review the current rule that requires a playbook before a simulated order, because the desired workflow allows a simple session without first building a playbook.

## 3. Journal And Account Linking

### Intended journal purpose

- Remove the manual trade-entry CRUD experience from the main Journal product.
- The Journal should automatically show analytics for trades actually executed in connected real accounts, whether those trades were placed manually at the broker/exchange or copied by TradeHub.
- The Journal must also show Practice/Backtesting analytics in a separate switchable view.
- AI Insight must not be shown now. Treat AI Insight as a future feature only.

### Journal information architecture

- Default view: `My Trades` or `Connected Accounts`.
- Secondary view: `Backtesting`.
- `My Trades` should aggregate normalized trade history from all student-connected accounts and show:
  - win rate
  - net P&L
  - average risk/reward or R multiple when calculable
  - equity curve
  - daily/monthly performance calendar
  - account, market, symbol, session, and copied/manual filters
  - trade list with status, entry, exit, SL, TP, P&L, and source
- `Backtesting` should use the same visual language but only practice session data, with navigable days and session summaries.
- Practice and connected-account analytics must remain clearly separated.

### Journal-only account connections

- Current TradeHub account linking is incorrectly tied to paid AutoCopy setup for the desired product.
- Add a separate `Journal Sync` or `Connected Accounts` setup that does not require a Copier purchase.
- Journal-only connections must be read-only and must not have order-placement permissions.
- Crypto journal sync should request exchange read permissions only.
- Forex/MT5 journal sync needs a separate read-only provider/terminal integration design and must not silently reuse trade-enabled Copier permissions.
- Paying for Copier may upgrade an existing safe connection to execution eligibility only after separate payment, consent, risk, and permission checks.

## 4. Courses And Lessons

- The functional course and lesson flow is acceptable.
- Remove engineering-facing wording such as API, server-owned progress, HTTPS metadata, Firestore, stage names, and other implementation language from student-facing course screens.
- Keep course wording simple and related only to learning:
  - available or locked
  - lesson progress
  - resources
  - quiz/check
  - notes/bookmarks
  - completion proof
- Do not expose answer keys or private student learning data.

## 5. Copier, Signals, And Billing

### Current Copier clarification required

- Confirm whether AutoCopy is truly complete for this intended workflow:
  - student purchases Copier
  - student enables it
  - student connects a Forex or crypto account
  - influencer publishes a TradeHub signal or a connected Telegram signal is ingested
  - the signal appears in the student Signals feed
  - TradeHub validates market, subscription, permissions, consent, risk, freshness, symbol, and account setup
  - TradeHub automatically places the order only on the correct eligible account
- Previous technical tests reportedly reached Bybit order placement but failed for insufficient balance, and a Forex MT5 order reportedly executed successfully.
- That proof does not by itself mean the complete multi-student production workflow above is finished.

### Copier student UX

- Before purchase, Copier should show one clear purchase/subscription offer.
- After purchase, show two setup choices:
  - `Forex setup`
  - `Crypto setup`
- Forex setup should guide the student through the approved broker/MT4/MT5 connection flow.
- Crypto setup should guide the student through Binance/Bybit connection using safe permissions.
- Keep risk limits, pause/disable, connection health, and consent available after setup, but do not present all internal canary, worker, vault, or readiness details to students.

### Signals student UX

- Redesign Signals to match the supplied prototype direction:
  - All, Forex, Crypto, Open filters
  - clear symbol, Buy/Sell, entry, SL, TP, age/status
  - copied/executed state only when an eligible Copier path actually acted
  - floating P&L only when real linked execution data supports it
- Signals published directly by the influencer in TradeHub should appear here.
- Telegram-origin signals should appear only after a real, allowlisted, authenticated ingestion and moderation pipeline exists.
- A signal must never route to an account of the wrong market or to a student who did not purchase, configure, consent to, and enable the matching Copier type.

### Billing

- The current Billing section is acceptable.
- Trade Copier remains a separate student-paid add-on and is not included in Launch, Pro, or Enterprise workspace packages.

## 6. Workspace Dashboard

- The current Workspace page is too long and confusing because unrelated functions are stacked vertically.
- Add an influencer-specific navigation shell with focused sections rather than one continuous dashboard.
- Recommended sections:
  - Home: concise workspace and student summary, alerts, and next actions
  - Students: CRM, onboarding, access, and support follow-up
  - Signals: create/manage TradeHub signals and see delivery posture
  - Courses: course authoring and completion summaries
  - Practice: assignments, cohorts, review queue, and aggregate insights
  - Copier: workspace-level status and safe operational readiness only
  - Billing: student payment/access summary
  - Branding: package, branding, domain, and Enterprise request status
- The influencer must not see raw private student trades, journal entries, notes, hidden candles, answer keys, credentials, or provider payloads.

## 7. Demo Influencer Login Problems

- `demo.launch.influencer@example.test` and/or `demo.enterprise.influencer@example.test` showed: `The password did not match this TradeHub account.`
- Rerun the deterministic demo seed after emulator reset and verify all three influencer personas are recreated with the documented demo password.
- Add browser coverage that signs in as Launch, Pro, and Enterprise separately.

## 8. How To Test Workspace Packages

- Clarify that an influencer signs in through the normal `/login` page and is routed to `/workspace`; there is no separate visible `Influencer login` button required.
- Provide direct, simple test instructions for Launch, Pro, and Enterprise demo accounts.
- The workspace should visibly identify the current package without public prices.
- Launch should show the 50-seat cap and no Enterprise intake.
- Pro should show the 500-seat cap and still keep Copier separate.
- Enterprise should show custom-review, branding/domain, SLA/deployment, and integration-request readiness without claiming real automated infrastructure or integrations.

## 9. Super Admin Dashboard

- The current Super Admin page is too long and confusing.
- Add a Super Admin navigation shell with focused sections rather than one continuous operations page.
- Recommended sections:
  - Overview: influencer/workspace/student totals, urgent alerts, support queue counts
  - Workspaces: applications, status, package, seat use, and safe workspace health
  - Payments: payment reconciliation and access issues
  - Licences: package, maintenance, branding/domain, and Enterprise readiness
  - Integrations: Enterprise requests and external signal preview review
  - Execution: advanced AutoCopy canary, incident, rollback, and reconciliation controls
  - Messaging: dry-run/no-send readiness only while retained
  - Audit: support-safe audit history
- Super Admin should generally oversee platform health and support, not interfere with ordinary workspace activity or read private student records.
- Advanced dangerous controls should be isolated from the default overview and clearly gated.

## 10. Role Boundaries

- Current role-boundary testing passed.
- Preserve student, influencer, and Super Admin route separation.
- Workspace users must not see raw private student records.
- Students must not see workspace or Super Admin operations.

## 11. Privacy And Secret Visibility

- Current visual privacy scan showed no major issue.
- Continue preventing browser display of secrets, tokens, vault references, provider payloads, raw payment references, broker passwords, raw student/workspace IDs, and raw order references.
- Continue keeping workspace package prices private in the product UI.

## 12. Responsive Layout

- Full responsive/mobile polish can wait until the main product workflows and information architecture are corrected.
- Major pages must still remain usable during development, but final cross-device visual acceptance is deferred.

## Supplied References

- FX Replay quick session dialog and asset search.
- FX Replay dashboard/session navigation.
- FX Replay full-screen chart terminal and replay controls.
- FX Replay session list and session settings drawer.
- Original TradeHub prototype Journal analytics/calendar/trade-list concept, excluding AI Insight.
- Original TradeHub prototype Signals cards and market/status filters.

The references describe the desired workflow and clarity. TradeHub must not copy protected branding, source code, proprietary assets, or claim capabilities that its chart library, market-data licences, providers, and execution gates do not support.
