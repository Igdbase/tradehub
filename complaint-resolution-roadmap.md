# TradeHub Complaint Resolution Roadmap

Date created: 2026-08-24

Status: Stage 29D is closed and frozen after owner acceptance in real Chrome and Safari on 31 August 2026. Stage 29F was owner-accepted on 3 September 2026 after the Journal visual layout, My Trades/Backtesting separation, numerical reconciliation, bounded-cohort warning, and zero/one/multi-point Equity behavior were accepted. Stage 29F is closed and frozen. Stage 29G Crypto Journal Sync is implemented/source-QA ready, but Stage 29G external Binance/Bybit acceptance remains deferred because no Google Cloud Secret Manager project and no approved provider accounts are currently available. Stage 29H remains deferred/unstarted. Stage 29I is owner-accepted, closed, and frozen after successful local owner testing on 6 September 2026. Stage 29J Signals Feed And TradeHub Signal Routing is owner-accepted, closed, and frozen after successful local owner testing on 7 September 2026. Stage 29K Telegram Signal Ingestion And Controlled Bridge is owner-accepted, closed, and frozen after successful local owner testing on 8 September 2026. Real Telegram/provider acceptance remains deferred and is not claimed. Stage 29L Workspace Navigation And Focused Views is owner-accepted, closed, and frozen after successful local owner testing on 8 September 2026. Stage 29M remains unstarted and next.

Source complaint record: `complaint.md`

## Objective

Correct the student, influencer, and Super Admin experiences reported during browser testing without discarding stable TradeHub foundations. The work must simplify each role, separate Journal Sync from paid Copier execution, reorganize Practice, clarify Courses, complete the intended Copier/Signals workflow, and replace long Workspace/Admin pages with focused navigation.

## Delivery Rule

TradeHub will be changed one stage at a time.

For every stage:

1. The builder implements only the named stage.
2. The builder returns changed files, behavior, security boundaries, automated tests, manual test steps, and remaining risks.
3. Codex reviews the response and current code for mistakes, missing scope, regressions, misleading claims, and privacy/security problems.
4. The owner tests only the short acceptance checklist for that stage.
5. Any defect is patched inside the same stage.
6. The next stage starts only after the owner says the current stage is acceptable.

Do not combine several unfinished stages into one large untested implementation.

## Total Estimate

- Total planned implementation prompts: 16, including the separately approved Stage 29C.1, Stage 29C.2, and Stage 29C.3 catalogue expansions.
- Stage range: Stage 29A through Stage 29N. Stage 29E remains the completed Shared App Full-Preview Layout Stabilization stage.
- Each stage may need one additional patch prompt if owner testing discovers a defect.
- Expected clean-path total: 13 builder prompts.
- Realistic total including browser-found corrections: 16 to 20 prompts.
- External provider acceptance for Journal Sync, Telegram, and live Copier is not proven by source tests alone. Those stages also require approved provider accounts, credentials stored through the existing secure server-side boundary, sandbox/demo accounts, and controlled canary testing.

## Section 1: Student Experience Cleanup

### Stage 29A - Student Home And Course Copy Simplification

Build:

- Remove Reminder Preferences and reminder-specific controls from the student home.
- Keep the student home focused on Courses, Signals, Copier, Journal, Practice, and Billing.
- Remove API, server, metadata, Firestore, stage, and engineering language from student Course screens.
- Preserve course access, quiz, progress, proof, private notes, and role boundaries.

Implementation status:

- Implemented/source-QA ready at `TH-2026-08-24-STAGE29A-STUDENT-HOME-COURSE-SIMPLIFICATION-HANDOFF`.
- Owner browser acceptance remains deferred in `manual-test-backlog.md`.

Owner acceptance:

- Student home is concise and has no Reminder Preferences.
- Course screens use ordinary learning language.
- Courses and role protections still work.

## Section 2: Practice And Backtesting

### Stage 29B - Practice Hub And Sessions Navigation

Build:

- Replace the long default Practice page with two primary entries: `Backtesting Session` and `Sessions`.
- Move analytics, assignments, imports/exports, reports, and secondary tools behind focused views or menus.
- Add a clean previous-sessions list with open, report, duplicate, archive/restore, settings, and confirmed delete actions.

Implementation status:

- Implemented/source-QA ready at `TH-2026-08-24-STAGE29B-PRACTICE-HUB-SESSIONS-HANDOFF`.
- The default Practice page now emphasizes only Backtesting Session and Sessions; secondary tools remain available in focused views.
- Session settings use a right-side read-only drawer. Permanent deletion is student-owned, exact-name confirmed, bounded, and unavailable for assignment/review sessions.
- Owner accepted the focused hub, Sessions view, and opaque-black settings drawer on 2026-08-25.

Owner acceptance:

- `/app/practice` is immediately understandable.
- Previous sessions are easy to find and manage.
- Deleting a session requires confirmation and cannot cross student ownership.

### Stage 29C - Quick Session, Asset Catalog, And Strategy Simplification

Build:

- Add a compact quick-session dialog for name, balance, optional Strategy, asset, timeframe, date range, and random start.
- Rename visible Playbook language to Strategy where appropriate.
- Allow a basic session without first creating a Strategy, while retaining optional strategy analytics.
- Add searchable, grouped asset selection using only genuinely supported instruments.
- Do not add Prop Firm Session or Advanced Session.

Implementation status:

- Implemented/source-QA ready at `TH-2026-08-25-STAGE29C-QUICK-SESSION-ASSET-STRATEGY-HANDOFF`.
- Quick Session uses an opaque-black accessible dialog and a protected readiness-derived catalogue limited to verified Stage 29C instruments.
- Server creation validates the exact asset/timeframe/balance/date setup and historical candle availability before persisting.
- Student-facing Practice calls reusable playbooks Strategies while preserving internal `playbookId` compatibility.
- No Strategy is required for session creation or simulated order placement; selecting one only adds Strategy grouping and review context.
- Provider names, broker symbol mappings, and candle-cache identifiers remain server-side rather than appearing in student responses or chart copy.
- Quick ranges include +1Y and calculate backward from the End date; Random start immediately changes the visible dates and offers a reshuffle control.
- Owner browser acceptance remains deferred. Stage 29C.1 and Stage 29C.2 are implemented below; Stage 29C.3 and Stage 29D remain pending.
- Automated student Playwright QA passed 7/7 on 25 August 2026; owner visual acceptance remains pending.

Owner acceptance:

- A student can create a simple session quickly.
- Supported Forex and crypto assets are searchable and grouped.
- Unsupported assets are not falsely advertised.

### Stage 29C.1 - Dynamic Forex And CFD Asset Expansion

Build:

- Discover the platform utility MetaAPI account's available symbols on the server and map only approved Forex/CFD instruments into a safe canonical catalogue.
- Expand beyond the major pairs to verified Forex crosses, metals, indices, and energy CFDs only when historical candles and instrument specifications are both available.
- Keep broker suffixes and provider identifiers server-only; students see canonical symbols and readable names.
- Add availability, date-range, timeframe, precision, pip/tick, contract-size, and simulated-sizing validation for every exposed instrument.
- Cache the safe catalogue and fail closed when the provider, vault, symbol, timeframe, or historical range is unavailable.
- Do not add stocks or exchange futures unless a separate approved historical-data provider and data-rights review exists.

Implementation status:

- Implemented/source-QA ready at `TH-2026-08-26-STAGE29C1-DYNAMIC-FOREX-CFD-CATALOGUE-HANDOFF`.
- The approved canonical universe now covers 7 Forex majors, 21 Forex crosses, XAUUSD, XAGUSD, 6 index CFDs, and 2 energy CFDs.
- The real MetaAPI utility path discovers account symbols and validates each approved match against its provider specification before exposing safe canonical metadata.
- Broker suffixes, account IDs, credentials, provider symbols, and raw provider responses stay server-only.
- The local `tradehub_static_demo` path is explicitly configured for emulator/browser QA and does not change production fail-closed defaults.
- Session creation rechecks availability and historical candles before persistence. The verified instrument snapshot follows sizing, P&L, exports, terminal/replay, and practice-ledger records.
- Owner browser acceptance remains pending. Stage 29C.2 is implemented below; Stage 29C.3 and Stage 29D remain pending.

Owner acceptance:

- The Forex/CFD selector contains substantially more verified instruments than Stage 29C.
- Every selectable instrument can create and run a valid historical practice session.
- No provider account IDs, broker suffix details, credentials, or unavailable instruments are exposed.

### Stage 29C.2 - Expanded Crypto Asset Catalogue

Build:

- Expand the current Binance public-history catalogue to a curated set of liquid USDT spot pairs.
- Load and normalize exchange precision/filter information server-side so price, quantity, minimum-size, and simulated P&L calculations are correct per symbol.
- Add searchable Crypto categories and safe availability/date-range feedback.
- Cache bounded provider metadata and historical candles; fail closed on delisted, unavailable, malformed, or unsupported pairs.
- Do not advertise every exchange symbol blindly, derivatives/futures, leveraged tokens, or illiquid pairs.

Implementation status:

- Implemented/source-QA ready at `TH-2026-08-26-STAGE29C2-EXPANDED-CRYPTO-CATALOGUE-HANDOFF`.
- The canonical approved universe contains 66 unique USDT spot candidates; the deterministic emulator catalogue contains 50 safe normalized instruments.
- Runtime selection is based only on current public spot status, USDT quote, spot permission, and validated price, quantity, and notional filters.
- New sessions store a safe instrument snapshot and recheck current availability plus historical candles before persistence.
- The snapshot includes the provider LOT_SIZE quantity step. Simulated sizing rounds down to it, partial closes conserve integer step units, and edited SL/TP values must remain tick-aligned.
- Owner browser acceptance remains deferred. Stage 29C.3 is implemented below; Stage 29D remains pending.

Owner acceptance:

- The Crypto selector contains a useful broad catalogue rather than only five pairs.
- Every listed pair passes provider availability and instrument-rule validation.
- Existing BTCUSDT and ETHUSDT practice sessions remain compatible.

### Stage 29C.3: Broader Forex/CFD Asset Catalogue Completion

Status: implemented/source-QA ready at `TH-2026-08-26-STAGE29C3-FOREX-CFD-CATALOGUE-HANDOFF`. Owner browser acceptance remains deferred.

- Expanded the approved catalogue to 42 Forex candidates plus canonical Metals, Indices, and Energies.
- Required CFDs include XAUUSD, XAGUSD, US30, NAS100, SPX500, GER40, UK100, JPN225, USOIL, UKOIL, and NATGAS.
- Real utility-provider discovery returns safe normalized availability and unavailable reasons; provider aliases, account details, credentials, and raw payloads remain private.
- Session creation rechecks availability, timeframe/date bounds, instrument specifications, and normalized candles before persistence.
- Static demo fixtures cover EURGBP and USOIL for deterministic browser QA without changing production fail-closed defaults.

Future provider stage, not part of Stage 29C through 29C.2:

- Real stocks and exchange futures require an approved historical-data provider, commercial/data-rights review, instrument specifications, and separate QA before they may appear in the selector.

### Stage 29D: Practice Terminal Visual Polish And FX Replay Inspired Layout

Status: closed and frozen through Stage 29D.17 after owner acceptance in real Chrome and Safari on 31 August 2026.

Build:

- Reorganize the existing terminal into a focused chart-first workflow.
- Retain and verify symbol/timeframe, replay, order ticket, indicators, drawings, Go To, event markers, Journal/Review, P&L, and risk controls.
- Add a session-settings side drawer with only changes allowed by session status.
- Preserve event-marker alignment after pan/zoom and completed-session locks.
- Do not copy FX Replay or TradingView proprietary code, assets, or branding.
- Do not display unsupported placeholder tools as finished tools.

Implementation:

- The terminal is now chart-first with a compact TradeHub toolbar, supported icon tools, an opaque five-tab utility panel, floating replay transport, and a bounded bottom trading/status bar.
- Existing simulated order, drawing, bookmark, challenge, report, event-marker, and completed-session behavior remains wired.
- Large chart cards were replaced with compact chips; event markers retain chart time-scale positioning and hover/click behavior.

Owner acceptance:

- Terminal controls are understandable and functional.
- Chart, replay, simulated orders, events, settings, and reports work.
- No overlap, misleading live-execution wording, or unsupported tool claims appear.

### Stage 29D.17: Practice Terminal Owner Acceptance Closure And Complaint-Roadmap Reconciliation

Status: owner-accepted, closed, and frozen on 31 August 2026.

Reference: `TH-2026-08-31-STAGE29D17-PRACTICE-TERMINAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

- The owner confirmed the corrected Practice Terminal works in real Chrome and Safari.
- Stage 29D.15 responsive-workstation behavior and Stage 29D.16 KLineChart drawing behavior are owner-accepted.
- The accepted production architecture uses KLineChart 10.0.3 with TradeHub-owned overlays and preserves Trend, compact automatic Text Notes, bounded Fibonacci, directional Measure, Zoom Rectangle/Out, selected delete, atomic clear, indicators, replay, terminal navigation, and laptop/tablet workstation behavior.
- Automated Chromium and WebKit laptop/tablet suites remain supporting evidence; owner browser acceptance is the closure decision.
- Practice remains student-owned, revealed-candle-only, and simulated-only. No live execution, AutoCopy, payment, provider, credential, or hidden-candle boundary changed.
- Stage 29D is frozen unless a new reproducible defect is reported. Stage 29F is also closed and frozen after owner acceptance on 3 September 2026.

## Section 3: Journal And Connected Accounts

### Stage 29F - Journal Product Redesign And Data Separation

Status: owner-accepted, closed, and frozen on 3 September 2026. Automated Chromium browser QA passes, the owner accepted the visual layout, My Trades/Backtesting separation, numerical reconciliation, bounded-cohort warning, and zero/one/multi-point Equity behavior.

Reference: `TH-2026-09-03-STAGE29F-JOURNAL-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

Build:

- Make `My Trades` the default Journal view and `Backtesting` the second view.
- Remove manual trade creation/editing from the main Journal experience.
- Remove AI Insights and label AI analysis as future-only in planning documents.
- Retain historical manual records safely until a migration/archive decision is approved.
- Define normalized read-only connected-account trade and daily-performance models.
- Keep real-account and backtesting analytics clearly separated.

Implemented:

- `/app/journal` now opens on `My Trades` and switches to a separately loaded `Backtesting` view through a compact segmented control.
- Closure rule: `/app/journal` remains read-only, manual trade entry stays removed, My Trades and Backtesting remain financially separated, and Journal Sync remains independent from Copier.
- The main Journal no longer loads or displays manual trade CRUD, CSV import/export, archive/delete controls, manual review links, or AI Insight. Historical manual records and protected compatibility APIs remain intact.
- A dedicated student-scoped connected-journal GET route returns only bounded normalized display fields and rejects paper, testnet, sandbox, demo, practice, dry-run, failed, blocked, and unconfirmed ledger records.
- Provider execution status is separate from public Journal lifecycle. Raw `filled` confirms an entry execution, not closure; public lifecycle is `open`, `partial`, or `closed`, and closure requires authoritative provider-confirmed closure metadata.
- Closed-trade KPIs, realized P&L, win rate, average R, equity, drawdown, daily results, and monthly results use authoritative closed trades only.
- Provider-placed and copied records are distinct in the contract. Journal Sync readiness does not read Copier exchange connections, Forex provisioning, AutoCopy entitlement, or execution permissions.
- Student history is queried newest-first by `updatedAt` within a deterministic bound. Analytics use all bounded filtered matches before visible-row slicing, and the response reports scanned, matched, visible, `hasMore`, and truncation state.
- Backtesting loads the existing protected Practice analytics only after its tab opens and never combines simulated P&L with connected-account performance.
- One shared closed-order net-result helper now drives Backtesting session KPIs, equity/drawdown, daily/monthly results, symbol and strategy breakdowns, and recent-session rows. Persisted fees replace the fee-bps estimate while spread and slippage remain additive; the seeded gross `+1,500` less `48` costs reconciles to net `+1,452` on every net-P&L surface. An isolated net-loss fixture verifies `-108` and drawdown direction.
- The helper requires authoritative session assumptions and cannot fabricate zero fee/spread/slippage values. Analytics first create one bounded session-backed order cohort; unmatched orders are excluded consistently from every output, including `hasClosedTrades` and challenge summaries, and safe coverage metadata reports the exclusion count.
- Incomplete bounded coverage is now disclosed visibly before the Backtesting KPIs. Complete cohorts show no warning; excluded cohorts show only a correctly pluralized safe record count and explanation, never internal identifiers or diagnostics.
- The shared Equity chart presents zero, one, and multi-point datasets truthfully. A single completed trade now renders a visible point and final-equity value; the seeded Backtesting result shows `101,452`, while the genuine zero-point My Trades state retains its existing empty message.
- The shared visual language uses compact KPIs, an equity curve, daily calendar, filters, and dense trade/session rows at laptop, tablet, and narrow widths.
- Automated source, type, lint, production-build, deterministic-seed, and Chromium browser checks pass. The complete rerun passes 10/10, including truthful zero/one-point Equity states, final equity `101,452`, isolated open/filled-entry/partial/closed-win/closed-loss fixtures, net `+1,452` reconciliation, the `-108` loss/drawdown case, a closed unmatched-session order excluded from every aggregate, absent/present coverage-warning assertions, filters, lifecycle KPIs, equity/calendar values, source labels, cleanup, Journal dataset separation, no manual-trades request, responsive width, and wrong-role protection. The owner explicitly accepted Stage 29F on 3 September 2026, and Stage 29F is closed and frozen.

Owner acceptance:

- Journal has no manual trade-entry workflow.
- My Trades and Backtesting are easy to switch between.
- Both views share a clear analytics, calendar, and trade-list visual language.
- Owner acceptance was confirmed on 3 September 2026. Stage 29F is closed and frozen.

### Stage 29G - Crypto Journal Sync

Status: implemented/source-QA ready.

Reference: `TH-2026-09-03-STAGE29G-CRYPTO-JOURNAL-SYNC-HANDOFF`

Build:

- Added Journal-only Binance/Bybit connection setup independent of Copier purchase, AutoCopy entitlement, execution permission, `exchange_connections`, and Forex provisioning.
- Added a separate Journal credential namespace and protected student APIs for overview/connect, sync now, and disconnect.
- Require read-only permissions on every sync. Binance malformed or ambiguous permission responses fail closed, and mutation-capable flags including `enableFixApiTrade` and `enablePortfolioMarginTrading` are rejected.
- Import bounded normalized trade history using documented provider request shapes: Binance history uses <=24-hour `startTime`/`endTime` windows and never combines `fromId` with time bounds; Bybit uses bounded seven-day windows and `nextPageCursor`.
- Fill-derived spot round trips remain visible but performance-ineligible unless an authoritative starting-basis/closure checkpoint exists. Missing fees remain unknown, unsupported fee currencies taint the affected lot, and base-asset fees reduce received quantity instead of becoming quote fees.
- Sync uses opaque Journal-connection-scoped idempotency, a separate server-only provider execution identity based on stable raw provider order/execution values available to both Journal Sync and Copier ingestion, generation-specific import entries plus one active generation pointer, chunked Firestore commits below 500 writes, global provider request budgeting, incremental per-connection watermarks, owner-token locking/cooldown, a short-lived credential/symbol configuration lock, credential fingerprint/version pinning from sync start through final commit, a total sync work timeout shorter than the lease, final credential/lock/disconnect rechecks before ledger commit, production fake-transport blocking, durable support-safe cleanup records, first-time `verifying` placeholder serialization, owner-token-bound credential activation, and Secret Manager version-pinned credential replacement that preserves the previous working credential when metadata update fails.
- Complete replacement snapshots and incremental deltas are handled separately. Empty successful incremental syncs retain existing history, incremental new records stage retained active rows plus the new delta before a pointer flip, readers query only the active generation before applying visible limits, and abandoned staging generation cleanup is connection-scoped, lease-aware, and age-bounded.
- Bounded Binance crawling stores safe crawl progress separately from the active history pointer. Partial runs freeze one crawl boundary, carry per-symbol completed watermarks through later runs, append to a hidden pending generation, and promote watermarks only after every selected symbol reaches the frozen boundary.
- Credential replacement and selected-symbol changes are synchronization configuration changes. Every credential mutation, including same API key plus rotated secret, coordinates with the sync lease through a short-lived configuration lock; exact no-op submissions use a server-keyed credential mutation identifier and can avoid unnecessary credential-version creation. Production fails closed if the keyed mutation posture is unavailable, and legacy records without the new identifier are treated conservatively as replacements. A valid sync lease rejects replacement, sync rejects while replacement owns the config lock, sync loads only the exact credential version marker captured in connection metadata, the vault refuses stale/pending/retired/discarded/revoked/mismatched markers before provider requests, and final commit rechecks owner-token, lock ownership, credential fingerprint, and credential version. Successful replacement activates the new credential metadata before retiring the previous Secret Manager/local version. If post-activation retirement fails, the new connection remains active and one idempotent server-only retryable cleanup task is recorded for the old version; repeated cleanup failures are bounded and never target the active version. Failed replacement discards only the attempted version and restores the previous working credential metadata/version. Successful changes reset or retire active/pending imported generations, crawl progress, and watermarks before the new credential or symbol set becomes ready so one provider account or symbol set cannot inherit another account's history.
- First-time connection creation now atomically creates a student-scoped `verifying` placeholder with an owned configuration lock before any credential can activate. Two concurrent first-time requests for the same logical exchange/account label cannot both store credentials, connection-limit checks run inside the creation transaction, credential storage/final activation are bound to the placeholder owner token, final activation verifies the pending credential marker and no active sync/disconnect state, and expired abandoned placeholders are recoverable without damaging a later successful credential.
- Credential cleanup retries are production-wired through the authenticated Journal Sync overview path. Each run processes only a small due batch, atomically claims each task with an owner-token lease, rechecks the intended student connection and active credential marker before retirement, resolves idempotent retirement safely, backs off failures, and leaves final failures for protected support without exposing cleanup targets, lock owners, vault refs, or version markers to the browser.
- Generation activation clears lease metadata from the activated generation, and old generations are retired only after verifying the connection pointer no longer references them.
- Incomplete provider snapshots caused by truncation, skipped or malformed rows, rate limits, budget exhaustion, failed staging chunks, or invalid responses are marked partial and cannot reconcile-delete or replace the last complete Journal snapshot.
- Copied/Journal dedupe is execution/order-leg scoped. A copied buy plus provider-manual sell keeps the unmatched sell as execution-only history rather than discarding it or counting it as another open position.
- Added Firestore emulator-backed repository lifecycle coverage that invokes the actual exported connect/sync/disconnect/overview repository functions with injected deterministic provider/vault dependencies. It covers active-sync replacement races, same-key secret rotation during sync, replacement-first config-lock blocking, expired-config-lock stale-marker rejection, real/local vault stale/retired/discarded/revoked marker rejection, concurrent same-key replacements, keyed exact no-op detection, changed-secret replacement, successful previous-version retirement, failed-replacement rollback/discard, action-specific failed replacement discard retry, previous-version retirement retry, due-only oldest-first cleanup selection, future/resolved/blocked/final-failed starvation prevention, cleanup lease concurrency, active-target and changed-active-marker blocking before vault calls, bounded cleanup retry/dedupe/success, selected-symbol removal/addition resets, failed staging chunks, active-pointer visibility, simultaneous connections, disconnect during sync, repeated multi-run eight-symbol Binance crawling, copied execution dedupe, and execution-only unmatched sells.
- Do not enable order execution through Journal Sync.

External acceptance required:

- Approved Binance/Bybit test accounts and read-only credentials.
- Provider rate-limit, pagination, symbol, fee, and timezone testing.
- Owner browser acceptance remains pending.

Owner acceptance:

- A non-Copier student can connect a read-only crypto account.
- Real manually placed account trades appear in My Trades analytics.
- Journal Sync cannot place orders.

### Stage 29H - Forex And MT5 Journal Sync

Status: unstarted and externally deferred.

Build:

- Add Journal-only Forex/MT5 history connection separate from paid Copier execution.
- Use an approved read-only provider, investor connection, or TradeHub bridge design.
- Normalize closed trades, commissions, swaps, P&L, symbols, and account-safe summaries.
- Do not silently reuse trade-enabled Copier permissions.

External acceptance required:

- Approved MT5/provider utility account or deployed read-only bridge.
- Provider subscription/infrastructure where required.
- Real history reconciliation across broker symbol suffixes and timezones.

Owner acceptance:

- A non-Copier student can view connected Forex history.
- Forex analytics reconcile with the source account.
- Journal Sync has no execution capability.

## Section 4: Copier And Signals

### Stage 29I - Copier Purchase And Account Setup Experience

Status: owner-accepted, closed, and frozen on 6 September 2026 after successful local owner testing. Real Paystack sandbox/production acceptance remains deferred.

Reference: `TH-2026-09-06-STAGE29I-COPIER-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`

Build:

- Owner acceptance closure: One Trade Copier purchase unlocks both Crypto Setup and Forex Setup. The unified purchase button, local checkout callback, persistent entitlement, separate setup controls, and unified cancellation were owner-accepted on 6 September 2026.
- Real Paystack sandbox/production acceptance remains deferred in the manual backlog and is not claimed complete. Stage 29G external Binance/Bybit acceptance remains deferred. Stage 29H remains deferred/unstarted. Stage 29J Signals Feed And TradeHub Signal Routing is owner-accepted, closed, and frozen after successful local owner testing on 7 September 2026.
- Rebuilt `/app/copier` as a purchase-first student page instead of an internal operations dashboard.
- Adviser correction added a dedicated allowlisted student Copier DTO and `/api/student/copier` route family so the browser no longer receives the broad execution overview.
- Checkout initiation responses are minimized to `{ ok, authorizationUrl }`; payment refs, access codes, amount/currency metadata, and payment intent ids remain server-side.
- Privacy/regression correction closes legacy student execution bypasses: old crypto/forex execution URLs now return only the allowlisted Copier DTO, minimal checkout response, or an authenticated safe 410, and raw `connectionId` mutation routes no longer remain as parallel student-facing controls.
- Opaque Copier action refs require a dedicated strong production secret through `STUDENT_COPIER_ACTION_REF_SECRET`; missing or weak production posture fails closed.
- Owner unified-subscription correction: before purchase, show one clear Trade Copier subscription area and one Purchase Trade Copier action.
- Explain that Trade Copier is a separate paid student add-on, is not included in Launch, Pro, or Enterprise packages, and is one subscription rather than separate Crypto/Forex products.
- After one verified canonical `trade_copier` payment, expose both Crypto Setup and Forex Setup; one canonical cancellation locks both setup areas.
- Grandfather existing active legacy Crypto or Forex Copier subscriptions by materializing one canonical `trade_copier` entitlement without duplicate access or a second payment request. Once the canonical record exists, cancellation, expiration, past-due, or failed payment states remain authoritative over stale legacy active records.
- Paystack-backed cancellation is authorized from subscription ownership, not current purchase eligibility, so a student can cancel an owned canonical/grandfathered subscription even after later account-mode, course-access, or eligibility changes. Cancellation locks access immediately, schedules recoverable due Paystack disable work, invokes the same leased processor used by the Super Admin worker, stores Paystack subscription code/email token only in server-side records, and marks cancellation complete only after provider confirmation or a matching disable webhook.
- Repeated cancellation is idempotent for matching `non_renewing`/pending, `in_progress`, `blocked`, `final_failed`, and `resolved` provider-disable work: it preserves operation token, target, attempt count, due time, and lease/support state, reconciles resolved work to cancelled without a provider call, and creates a new task only for a genuinely new Paystack subscription target after repurchase.
- Provider cancellation failure or missing renewal details leave Trade Copier inactive with support-safe retry/needs-attention state; manual and legacy-grandfathered subscriptions without Paystack renewal may complete locally.
- A Super Admin-owned cancellation retry worker processes due tasks oldest-first with a strict batch bound, owner-token leases, abandoned-lease recovery, pre-provider ownership/target/revision checks, preserved attempt counts, due-work starvation prevention, and isolation to the canonical Trade Copier lifecycle. Initial cancellation never writes an unleased `in_progress` task.
- Product-routed Paystack webhooks update canonical Trade Copier billing only when `trade_copier` can be proven from metadata, payment reference, or stored subscription code. Recurring `charge.success` renewals can use a new transaction reference and route by stored subscription code. Course/package webhook events do not update Trade Copier, and Trade Copier webhook events do not update course/package subscriptions.
- `subscription.not_renew` records a truthful non-renewing state rather than expired-before-period-end while preserving awaiting-disable work where applicable; a matching `subscription.disable` can finalize provider cancellation and resolve the exact pending task.
- Webhook helpers return truthful applied outcomes. Stale, mismatched, rejected, duplicate-no-op, or unsupported events are handled or recorded without falsely reporting a processed lifecycle transition.
- Recurring renewals validate against the current stored subscription code, product, Paystack plan code, amount, and currency, and use only authoritative `next_payment_date`/`period_end` values. Missing period data or inconsistent stored plan identity preserves the existing paid period and records bounded review instead of inventing an expiry from `paid_at`, `created_at`, or environment-only plan changes.
- Checkout initialization, verification callbacks, legacy callbacks, webhook status updates, renewal events, and provider cancellation completion re-read canonical revision/latest-intent/operation-token or provider target state before writing so stale asynchronous results cannot unlock Copier. Replayed verification after cancellation reports a support-review state without restoring setup availability.
- Use one server-only Trade Copier billing resolver for Crypto and Forex setup/routing gates while keeping consent, risk, provider permission, pause, sandbox, kill-switch, vault, and execution checks separate.
- Add emulator-backed repository QA for checkout, verification replay, mismatch failures, cancellation after eligibility loss, provider-confirmed cancellation, provider cancellation failure/retry, repeated cancellation idempotency, authoritative post-retry cancellation audit status, abandoned retry leases, concurrent retry workers, missing provider cancellation target, stale verify/cancel and checkout/cancel races, recurring renewals by subscription code, non-renewing/disable ordering, webhook product isolation, duplicate/out-of-order webhooks, concurrent checkout, and legacy grandfathering.
- After entitlement, show `Forex Setup` and `Crypto Setup` as focused tabs instead of rendering every setup surface at once.
- Show only student-relevant billing status, consent, risk, connection health, pause/resume, refresh, and disable controls through opaque student action refs.
- Map Forex setup repository states to closed product labels only; arbitrary operational `safeMessage` values are not rendered to students.
- Keep stages, canaries, workers, vaults, raw readiness gates, provider payloads, fingerprints, credential versions, internal ids, infrastructure diagnostics, and support internals out of student screens.
- Preserve existing verified checkout/callback behavior and existing server-side billing, entitlement, consent, risk, pause, and execution gates.
- Keep Journal Sync available separately without a Copier purchase. `/app/copier` does not call Journal Sync APIs.
- Browser regression coverage now exercises checkout initiation/callback, risk and consent persistence, pause/reload/resume/reload, connection disablement, Forex setup disablement, legacy-route privacy, wrong-role route/API denial, response JSON privacy, and populated operational Forex sanitization.

Owner acceptance:

- Stage 29I is owner-accepted, closed, and frozen.
- Real Paystack sandbox/production acceptance remains deferred.
- No live execution is enabled and no private provider/account data is exposed.

### Stage 29J - Signals Feed And TradeHub Signal Routing

Status: owner-accepted, closed, and frozen after successful local owner testing on 7 September 2026. External provider acceptance remains deferred and is not claimed.

Reference: TH-2026-09-07-STAGE29J-SIGNALS-FEED-ROUTING-OWNER-ACCEPTANCE-CLOSURE-HANDOFF

Build:

- `/app/signals` now uses a compact feed with All, Forex, Crypto, and Open filters.
- Student-facing cards show symbol, Buy/Sell, entry, SL, TP, age, lifecycle status, copied/executed state, and supported P&L only when authoritative linked execution data exists.
- A dedicated allowlisted student Signals DTO keeps reads authenticated, workspace-scoped, student-scoped, newest-first, bounded, and free of workspace/student ids, connection ids, intent ids, provider ids, credentials, payloads, diagnostics, risk internals, and execution internals.
- Explicit direct in-app TradeHub signals appear, and source-less legacy TradeHub signals are preserved only as display-only legacy records. Unknown, Telegram-like, webhook-like, malformed, future-source, draft, and unsupported-status records remain hidden and non-executable until Stage 29K or a later approved routing stage.
- Existing Crypto and Forex routing entry points now fail closed unless the signal is a published explicit in-app TradeHub signal, while preserving the Stage 29I Trade Copier entitlement resolver and all consent, risk, connection, pause, kill-switch, idempotency, reconciliation, and execution gates. Crypto routing checks Trade Copier billing and student kill-switch state before creating executable intents.
- Provider-confirmed execution can show Copied or Executed only when the canonical account-linked ledger row has server-only `tradeHubSignalId` linkage, copied origin, supported real execution mode, matching market, and normalized matching symbol. Queued, attempted, paper, demo, testnet, dry-run, failed, blocked, wrong-market, stale, unsupported, or unconfirmed records do not display copied/executed state or fabricated P&L.
- Forex live-canary provider-confirmed fills now write idempotent canonical ledger entries through the shared mapper/writer with server-only TradeHub signal linkage; dry-run, submitted, failed, rejected, blocked, and unconfirmed Forex attempts do not create copied/executed evidence.
- Final execution-boundary correction: Crypto production and Forex live-canary workers reload the authoritative signal after claiming an intent and before credential/token loading or provider calls. Route-then-cancel, route-then-edit, route-then-pause, route-then-revoke, and route-then-student-kill-switch cases terminate safely without provider requests.
- Provider-result durability correction: provider-confirmed attempts are persisted truthfully before canonical ledger projection. Ledger projection failures are discoverable through indexed due-work fields, claimed by owner-token/fencing repair leases, retried with bounded timing/attempts, and finalized only after transactionally reloading the attempt and confirming the stored owner token still belongs to the worker. Repair merges bounded due-work and expired-lease queries by one effective eligible timestamp with `updatedAt` and document-id tie-breaks, so a full due queue cannot starve an older expired lease and a full expired queue cannot starve an older normal due record. Repair can reconcile deterministic ledger rows created by stale workers without another provider request or duplicate ledger row even when live/canary/order-call/provider gates are disabled. Permanently failing projection records move to support-safe final-failed state without changing provider truth or blocking later due records.
- Workspace ownership correction: production routing exports reject actor/signal workspace mismatches before any cross-workspace intent, attempt, audit, or provider decision is written.
- P&L is typed end to end through canonical `authoritativePnl` and is omitted unless authoritative value and explicit currency are present. Missing currency is not defaulted.
- Pagination uses a bounded newest-first cohort, stable tie-breaker, opaque cursor, visible Load More action only when another page exists inside the loaded cohort, and separate truthful scan-boundary truncation metadata with a visible bounded-history notice.
- Added browser coverage for direct in-app signals, unknown/external-source exclusion, equal timestamps, more than 250 mixed records, filters, bounded-history notice, Load More, copied/executed truthfulness, unsupported P&L absence, response privacy, wrong-role page/API denial, responsive widths, and cleanup.
- Added `stage29j:qa` and executable Firestore-emulator `stage29j:routing:qa` coverage that invokes the real Crypto production routing path, Forex live-canary routing/worker path, shared ledger mappers/writers, and student feed repository with deterministic injected providers, including final-boundary races, indexed ledger-projection discovery/repair, disabled-gate repair independence, bounded final-failure, fenced late-success/late-failure repair races, active-lease starvation prevention, fair due-versus-expired scheduling, claim-time final-failed counting, truthful counters, and workspace-mismatch rejection.

Owner acceptance closure:

- The compact Signals feed, `All`/`Forex`/`Crypto`/`Open` filters, direct in-app signal display, provider-confirmed copied/executed badges, P&L omission rules, routing gates, and projection-repair posture were owner-accepted on 7 September 2026.
- Stage 29J is closed and frozen unless a new reproducible defect is reported.
- External provider acceptance remains deferred and is not claimed.

Later regression criteria:

- Signals look clear and match the intended prototype direction.
- Forex signals never route to crypto accounts or vice versa.
- Ineligible students never receive an order.
- Stage 29I remains closed and frozen. Stage 29F remains owner-accepted, closed, and frozen. Stage 29G external Binance/Bybit acceptance remains deferred. Stage 29H remains deferred/unstarted. Stage 29K is owner-accepted, closed, and frozen, and Stage 29L is owner-accepted, closed, and frozen.

### Stage 29K - Telegram Signal Ingestion And Controlled Bridge

Status: owner-accepted, closed, and frozen after successful local owner testing on 8 September 2026. Real Telegram/provider acceptance remains deferred and is not claimed. Live execution acceptance is not claimed.

Reference: TH-2026-09-08-STAGE29K-TELEGRAM-SIGNAL-BRIDGE-OWNER-ACCEPTANCE-CLOSURE-HANDOFF

Build:

- Add a real, authenticated Telegram Bot/API ingestion path only for allowlisted influencer sources.
- Verify webhook/source authenticity, deduplicate, parse, quarantine, moderate, and normalize messages.
- Publish to students only after the approved moderation policy.
- Connect normalized Telegram signals to Copier only through the same Stage 29J eligibility and execution gates.
- Keep ambiguous or malformed messages non-executable.
- Stage 29K implementation keeps the webhook default-disabled, validates the Telegram secret-token header, stores only keyed opaque Telegram/source references, deduplicates deliveries, and creates quarantined Stage 24 external candidates without storing raw Telegram message bodies, chat ids, usernames, tokens, provider payloads, or webhook secrets.
- Approved preview candidates can be promoted by authorized workspace users into canonical workspace signals only with moderation proof metadata. Routing still goes through Stage 29J's existing Crypto and Forex execution paths, with final source allowlist revalidation before any credential/token loading or provider call.
- Adviser correction added deterministic workspace-bound Telegram source setup, stale-preview publication rejection, exact source-record/version bridge attestations, destination-specific routing checkpoints, expired outbox lease recovery, and safe malformed timestamp rejection. Routing retries now use independent per-destination budgets: already completed destinations are not invoked again, a final-failed destination does not block later destinations, and outbox terminal state remains truthful as completed, retry scheduled, or completed with failures. Infrastructure failures before destination routing now report the same retry or failed state they persist, clear retry scheduling on final failure, and do not invoke destination routes.
- Owner-visible setup correction makes the Super Admin Telegram source form functional end-to-end: Telegram sources submit the required parser mode server-side without exposing parser controls, require workspace/status/label/symbol/market inputs, store only keyed opaque identity, and browser coverage now uses visible form controls before webhook, approval, workspace Publish, and student display checks.
- Owner acceptance closure: visible Super Admin Telegram source setup, server-only conversion of raw Telegram identity, quarantined candidate creation, explicit Super Admin approval, explicit workspace publication, safe student Signals display, absence of raw Telegram identifiers/messages, and preserved routing and execution gates were owner-accepted locally on 8 September 2026. Stage 29K is closed and frozen unless a new reproducible defect is reported.
- Real Telegram bot ownership, HTTPS webhook hosting, production secrets, source ownership, and real provider behavior remain deferred. Do not claim real Telegram/provider acceptance. Do not claim live execution acceptance.
- Stage 29J remains owner-accepted, closed, and frozen. Stage 29I remains closed and frozen. Stage 29F remains owner-accepted, closed, and frozen. Stage 29G external Binance/Bybit acceptance remains deferred. Stage 29H remains deferred/unstarted. Stage 29L is owner-accepted, closed, and frozen after successful local owner testing on 8 September 2026.

### Stage 29L - Workspace Navigation And Focused Views

Status: owner-accepted, closed, and frozen after successful local owner testing on 8 September 2026.

Reference: TH-2026-09-08-STAGE29L-WORKSPACE-NAVIGATION-OWNER-ACCEPTANCE-CLOSURE-HANDOFF

Build:

- Replace the long `/workspace` page with route-addressable focused views for Home, Students, Signals, Courses, Practice, Copier, Billing, Branding, and Enterprise.
- Keep Home limited to summary, alerts, and next actions.
- Preserve student management, signal publication, course visibility, aggregate practice, Trade Copier readiness, package/billing, branding/domain, and Enterprise integration responsibilities in their own focused routes.
- Scope loading so opening one workspace view fetches dashboard essentials plus that view's data only.
- Scope mutation refreshes so Signal creation/publication does not fetch hidden Practice endpoints, and Student support updates do not fetch Billing overview data.
- Keep the active workspace navigation item visibly inside the bounded nav viewport at desktop, tablet, and mobile widths, including direct mobile loads of `/workspace/enterprise` and `/workspace/branding`.
- Preserve Stage 29K publication from `/workspace/signals` and keep Stage 29J/29I gates authoritative.

Implementation status:

- Owner acceptance closure: focused Workspace navigation, concise Home, all nine responsibility views, direct routes, browser history, scoped loading, and responsive navigation were owner-accepted locally on 8 September 2026.
- Closed/frozen at `TH-2026-09-08-STAGE29L-WORKSPACE-NAVIGATION-OWNER-ACCEPTANCE-CLOSURE-HANDOFF`.
- Added `npm run stage29l:qa` and `npm run stage29l:closure:qa`, and updated workspace/admin browser coverage for all nine routes, active nav state, visible nav geometry, direct URLs, Back/Forward, scoped endpoint loading, Student and Signal post-mutation request isolation, Stage 29K publication, wrong-role blocking, document overflow, and privacy-safe rendering.
- Stage 29M remains unstarted and next.

Manual acceptance checks:

- Workspace Home is concise and no longer an endless operations page.
- Each workspace task has a direct URL and focused view.
- Refresh, deep links, and browser history work.
- No private student records, provider details, credentials, raw ids, payment refs, hidden data, or execution internals appear.

## Section 5: Influencer Workspace

Stage 29L above is the canonical Workspace Navigation And Focused Views entry. It is owner-accepted, closed, and frozen after successful local owner testing on 8 September 2026. Stage 29M remains unstarted and next.

## Section 6: Super Admin And Demo Reliability

### Stage 29M - Super Admin Navigation And Demo Account Reliability

Build:

- Replace the long Admin page with Overview, Workspaces, Licences, Payments, Integrations, Execution Safety, and Audit sections.
- Keep default Overview high-level and action-oriented.
- Isolate dangerous execution/canary controls from routine administration.
- Remove Messaging from normal product navigation while preserving dormant no-send records only if required for compatibility.
- Fix/reset demo seeding so Launch, Pro, Enterprise, student, and Super Admin logins are deterministic.
- Route influencer logins clearly to `/workspace`.

Owner acceptance:

- Admin understands what needs attention without reading every operations panel.
- All seeded personas can sign in with documented credentials.
- Role boundaries continue to pass.

## Section 7: Final Product Acceptance

### Stage 29N - Responsive, Browser, Security, And Product Freeze

Build:

- Run responsive polish after the new information architecture is stable.
- Update Playwright tests for all redesigned student, influencer, and Admin flows.
- Run seeded browser E2E for all roles and packages.
- Verify provider boundaries, no public prices, no raw IDs/secrets, and wrong-role blocking.
- Reconcile `complaint.md` item by item and mark each resolved, deferred, or externally blocked.
- Update `plan.md`, `manual-test-backlog.md`, and `prompt/promptsumary.md` with the final handoff.

Owner acceptance:

- Laptop, smaller laptop, and mobile-width layouts are usable.
- Student, influencer, and Admin critical paths pass in a real browser.
- No unresolved complaint is silently marked complete.

## What Code Alone Cannot Finish

The following require external services or owner-controlled accounts in addition to Codex implementation:

- Licensing and historical data for every market/instrument shown by third-party platforms.
- An exact full TradingView or FX Replay toolset without an appropriate charting/data licence.
- Binance/Bybit read-only history validation without test accounts and API access.
- MT5/Forex read-only history validation without an approved provider, utility account, or deployed bridge.
- Real Telegram ingestion without bot/application ownership, source authorization, and webhook hosting.
- Production Copier proof without funded sandbox/demo accounts, provider readiness, and controlled canary approval.

These dependencies must be reported as externally blocked rather than falsely marked complete.

## Fixed Product Boundaries

- Journal Sync is read-only and independent of paid Copier.
- Copier is a separate student-paid add-on.
- No AI Insights in the current Journal.
- No Prop Firm Session or Advanced Session in the current Practice redesign.
- No scraping FX Replay or copying proprietary source/assets.
- No unsupported assets or chart tools presented as available.
- No broad live execution without explicit owner approval and passed canary evidence.
- No public workspace package prices in product UI.
- No private student data in Workspace or routine Super Admin views.
- Existing role, privacy, payment, consent, risk, vault, pause, and kill-switch gates must not be weakened.

## Starting Point

Stage 29D.12 is implemented/source-QA ready. Owner browser acceptance remains deferred.

Current handoff:

`TH-2026-08-28-STAGE29D12-PRACTICE-TERMINAL-CLEAR-DRAWINGS-FIB-DECLUTTER-HANDOFF`

### Stage 29D.1: Practice Terminal Workstation Visual Upgrade

Status: owner-accepted with Stage 29D on 31 August 2026.

- The terminal route now suppresses the global header/footer and owns the complete viewport.
- Tool controls use mature 44px Lucide icons with honest unavailable states for unsupported drawing modes.
- The full requested timeframe strip is visible; only provider-supported intervals are enabled.
- Untouched active sessions receive a protected 24-candle warm-up through the existing revealed-index mutation, never through hidden-candle access.
- Adaptive chart spacing, top replay controls, collapsible opaque utility panel, and compact status footer improve desktop and narrow-screen density.
- Simulated order, event, drawing, bookmark, report, journal, indicator, and completed-session boundaries remain unchanged.

### Stage 29D.2: Practice Terminal Candle Reliability Patch

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

- Existing terminal/replay sessions can reuse already-normalized candle cache records even after the short provider freshness window expires.
- New session creation still requires fresh protected catalogue and candle validation before persistence.
- Local emulator testing now has deterministic Crypto candle fallback if Binance public candles cannot be reached, so ETHUSDT terminal should reveal candles in local demo testing.
- ETHUSDT deterministic demo candle cache was added to the seed pack.
- Empty cached candle records are rejected instead of producing a blank `0/0` terminal.
- No hidden candles, provider/private data, AutoCopy coupling, or live execution behavior was added.

### Stage 29D.3: Practice Terminal Trading Dock And Chart Density Polish

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

- Bottom Buy/Sell controls were enlarged into round trading-dock buttons.
- The calculated quantity field was widened and paired with a quick order-ticket action.
- Footer metrics were simplified from boxed dashboard cards into inline terminal status metrics.
- Chart spacing was tightened so more candles remain visible at full width and after zoom.
- The left tool rail was enlarged for a more mature workstation feel.
- No FX Replay branding/assets, provider calls, hidden candles, AutoCopy coupling, or live execution behavior was added.

### Stage 29D.4: Practice Terminal Order Ticket Popout Polish

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-27-STAGE29D4-PRACTICE-TERMINAL-ORDER-POPOUT-HANDOFF`

- The Order ticket opens as an opaque chart overlay on desktop when launched from the dedicated Order control.
- The popout has a Place Order header, Preset affordance, close control, contained scrolling, and larger desktop form controls.
- The right utility panel remains available for Objects, Go To, News, and Journal instead of permanently consuming the order form.
- Narrow screens keep the existing responsive utility drawer behavior.
- No broker or exchange order path, AutoCopy coupling, private provider call, copied third-party branding, or hidden candle access was added.

### Stage 29D.5: Practice Terminal Order Trigger Cleanup And Quick Buy/Sell Behavior

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D5-PRACTICE-TERMINAL-ORDER-TRIGGER-CLEANUP-HANDOFF`

- Bottom Buy/Sell now submit quick simulated market orders from the latest revealed close and current terminal SL/TP/risk values instead of opening the detailed Order popout.
- Only the dedicated Order control opens the detailed Place Order popout.
- Timeframe, Indicators, Go To, News, Journal, Objects, fullscreen, replay controls, and drawing tools do not open the Order popout.
- Quick Buy/Sell show inline dock success/error feedback for accepted orders, missing candles, invalid quantity, invalid SL/TP, validation failures, or locked sessions.
- Nonfunctional tools remain disabled or visibly marked coming soon.
- No broker or exchange order path, AutoCopy coupling, private provider call, copied third-party branding, hidden candle access, or credential exposure was added.

### Stage 29E: Shared App Full-Preview Layout Stabilization

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29E-SHARED-APP-FULL-PREVIEW-LAYOUT-HANDOFF`

- Widened the shared student app shell so ordinary app pages no longer sit in a tiny centered column at full preview.
- Stopped normal words, labels, and button text from wrapping letter-by-letter.
- Kept token-safe wrapping available only for long technical refs where it is needed.
- Removed landing/demo navigation chips from signed-in `/app`, `/workspace`, and `/admin` headers so real product pages have more room.
- Reworked Practice Sessions cards so session details, stats, and actions have stable room at full-preview and split-screen widths.
- Added Stage 29E source QA for the full-preview layout regression.
- No product logic, provider behavior, payments, live execution, AutoCopy, role gates, or Firestore rules changed.

### Stage 29D.6: Practice Terminal Quick Trade And Tool Feedback Patch

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D6-PRACTICE-TERMINAL-QUICK-TRADE-TOOLS-HANDOFF`

- Quick Buy/Sell uses safe default SL/TP when the detailed ticket is empty, while still using custom directional SL/TP when the student provides them.
- The bottom quantity preview falls back to the quick-trade quantity so it no longer reads as unusable before SL/TP is filled.
- Tool rail clicks now show visible feedback for cursor, zoom, lock, visibility, and supported drawing/note tools.
- Supported drawing/note tools open Journal/Review for placement and editing.
- Coming-soon tools remain disabled and honest.
- No broker or exchange order path, AutoCopy coupling, private provider call, copied third-party branding, hidden candle access, or credential exposure was added.

### Stage 29D.7: Practice Terminal Interactive Tools And Clean Order History

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D7-PRACTICE-TERMINAL-INTERACTIVE-TOOLS-HISTORY-HANDOFF`

- Cleaned the chart order history into compact BUY/SELL order chips.
- Clicking an order chip focuses that order, opens Objects, and shows that order alone until Show all is clicked.
- Horizontal line, vertical marker, zone, text note, and measure now click the chart to place supported objects.
- Saved chart objects render as selectable overlays and remain editable/deletable from Objects.
- Removed the old “Add it from Journal/Review” style guidance for supported tools.
- Trend line, brush/freehand, and magnet remain disabled/coming soon because they require a fuller drawing engine to behave properly.
- No broker or exchange order path, AutoCopy coupling, private provider call, copied third-party branding, hidden candle access, or credential exposure was added.

### Stage 29D.8: Practice Terminal Compact Side Panel

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D8-PRACTICE-TERMINAL-COMPACT-SIDE-PANEL-HANDOFF`

- Replaced cramped right-panel text tabs with compact icon tabs and accessible labels.
- Added one active panel title inside the drawer so the open section is clear.
- Removed duplicate order previews from Object tree.
- Practice orders now show short order rows by default instead of many expanded cards.
- Clicking a short order row or chart chip opens one expanded order only.
- Show all returns to the short order rows.
- Order, Go To, News, Journal, object counts, selected-order focus, and editing controls remain available.
- No broker or exchange order path, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle access, or credential exposure was added.

### Stage 29D.9: Professional Practice Terminal Chart Tools Engine

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D9-PRACTICE-TERMINAL-CHART-TOOLS-ENGINE-HANDOFF`

- Trend Line, Horizontal Line, Vertical Marker, Rectangle Zone, Text Note, Fibonacci Retracement, and Measure now work as chart-click tools.
- Trend Line, Zone, Fibonacci, and Measure use two-click placement with clear feedback.
- Saved objects render on the chart, can be selected from the chart or Objects tree, and stay aligned through chart pan/zoom and replay steps.
- Objects now shows compact rows for orders, drawings, events, and bookmarks with one selected-object editor.
- Escape cancels placement or clears selection; Delete/Backspace removes a selected drawing when the student is not typing.
- Bottom Buy/Sell remain quick simulated orders and the Order control remains the only detailed order popout trigger.
- Brush/freehand and Magnet remain disabled/coming soon.
- No broker or exchange order path, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle access, or credential exposure was added.

### Stage 29D.10: Practice Terminal Drawing Capture Reliability

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D10-PRACTICE-TERMINAL-DRAWING-CAPTURE-HANDOFF`

- Added a dedicated transparent chart capture layer while a drawing tool is active so Safari/browser clicks reliably reach the drawing engine.
- The capture layer converts pointer coordinates into bounded candle index and price placement data, then uses the existing student-owned drawing save path.
- Lightweight Charts `subscribeClick` remains as a fallback path.
- Trend Line, Zone, Fibonacci, and Measure keep their two-click flow.
- Horizontal Line, Vertical Marker, and Text Note remain one-click tools.
- Chart clicks during drawing placement no longer depend on right-panel focus or hidden chart internals.
- No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle access, or credential exposure was added.

### Stage 29D.11: Practice Terminal Advanced Chart Tools Interaction Polish

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D11-PRACTICE-TERMINAL-ADVANCED-TOOLS-HANDOFF`

- Added drag placement for Rectangle Zone, Fibonacci, Measure, and Zoom; Trend Line now uses the owner-confirmed two-click anchor interaction.
- Moved Trend Line, Horizontal price line, and Vertical line into a compact Lines menu.
- Disabled unfinished Ray, Extended Line, Horizontal Ray, and Cross Line variants as coming-soon tools.
- Added polished colored Fibonacci levels/bands and support for multiple Fibonacci drawings.
- Added typed Text notes on the chart with bounded save/edit/delete behavior.
- Added Measure/Ruler drag rectangles with direction color and compact diff, percent, and candle-count summaries.
- Added drag-rectangle Zoom, visible Zoom out, and Escape cancellation.
- Added Delete selected and Clear all drawings choices that do not delete orders, candles, events, or bookmarks.
- Added compact object filters for All, Orders, Drawings, Events, and Bookmarks.
- Bottom Buy/Sell remain quick simulated orders, and the Order popout still opens only from the Order control.
- No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle access, or credential exposure was added.

### Stage 29D.12: Practice Terminal Clear Drawings And Fibonacci De-Clutter

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D12-PRACTICE-TERMINAL-CLEAR-DRAWINGS-FIB-DECLUTTER-HANDOFF`

- Changed the left rail trash button into an immediate Clear chart drawings action.
- Clear chart drawings removes every tool-created practice drawing currently on the session chart.
- Clear chart drawings does not delete candles, orders, events, bookmarks, reports, assignment feedback, or journal records.
- Added optimistic clear-all behavior with rollback if a protected delete request fails.
- Quieted unselected Fibonacci drawings so only the selected Fibonacci shows full level labels and price values.
- Replaced the noisy multi-chip drawing history with one selected-drawing chip.
- Added `stage29d12:qa`.
- No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle access, or credential exposure was added.

### Stage 29D.13: Practice Terminal Trendline Interaction And Line Tool Menu Fix

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-28-STAGE29D13-PRACTICE-TERMINAL-TRENDLINE-MENU-HANDOFF`

- Superseded the earlier Trend Line interaction with first-click anchor, button-free live preview, and second-click endpoint persistence.
- Kept Horizontal price line and Vertical line under the Lines menu instead of exposing them as separate primary rail tools.
- Opening the Lines menu now clears stale selected-object state so the panel does not keep showing an unrelated previous object.
- Locked drawings now block new line placement with a simple message.
- Clear chart drawings remains a drawing-only cleanup and does not delete candles, simulated orders, events, bookmarks, session records, reports, or journal data.
- Selected trendlines show endpoint handles while unselected lines avoid large labels.
- Added `stage29d13:qa`.
- No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle access, or credential exposure was added.

### Stage 29D.14: Practice Terminal Drawing Reliability Patch

Status: implemented/source-QA ready. Owner browser acceptance remains deferred.

Reference: `TH-2026-08-29-STAGE29D14-PRACTICE-TERMINAL-DRAWING-RELIABILITY-HANDOFF`

- Tightened the ref-backed drag state and elevated drawing capture layer so drag tools keep the same active pointer draft from press through release.
- Opening the Lines menu now clears stale active tool state, selected drawing, selected order, drawing error, and unfinished placement state before a line tool is chosen.
- Trend Line is click-anchored and must save only after the second primary click; the first click and preview never persist.
- Horizontal price line and Vertical line remain inside the Lines menu.
- clear chart drawings resets tool/menu/selection state and removes all tool-created drawings.
- clear chart drawings does not remove candles, simulated orders, events, bookmarks, session records, reports, or journal data.
- Added `stage29d14:qa` coverage for the exact reliability complaint.
- No broker/exchange execution, AutoCopy coupling, private provider call, copied third-party branding/assets, hidden candle access, or credential exposure was added.

### Stage 29D.15: Practice Terminal Responsive Workstation Layout

Status: owner-accepted with Stage 29D on 31 August 2026.

Reference: `TH-2026-08-30-STAGE29D15-PRACTICE-TERMINAL-RESPONSIVE-WORKSTATION-HANDOFF`

Automated browser status: seeded student Playwright QA passed 8/8 on 30 August 2026 after a warmed rerun. The owner accepted the responsive workstation in real Chrome and Safari on 31 August 2026.

- The terminal now keeps a fixed 100dvh shell with hidden overflow and no global app header/footer.
- The right utility panel auto-collapses below xl and uses a bottom drawer before xl, so laptop widths keep the chart readable instead of squeezing it with a side panel.
- At xl and wider, the terminal restores a compact right-side workstation panel.
- The chart surface has a protected minimum height, and the bottom Buy/Sell dock avoids dense multi-column layout until xl widths.
- The order ticket stays in the drawer flow below xl and becomes a chart overlay only on wide workstation screens.
- Practice Sessions retains the Stage 29E full-preview row layout guard against letter-by-letter wrapping.
- Added `stage29d15:qa`.
- No chart drawing semantics, simulated order engine, provider behavior, AutoCopy, payments, live execution, hidden candle access, copied third-party branding/assets, or credential exposure was changed.

### Stage 29D.16: Practice Terminal Drawing Tools Acceptance Fix

Status: owner-accepted with Stage 29D on 31 August 2026.

Reference: `TH-2026-08-30-STAGE29D16-PRACTICE-TERMINAL-DRAWING-TOOLS-ACCEPTANCE-HANDOFF`

Automated browser status: the complete seeded student suite passes 10/10 in Chromium. The focused production drawing suite passes 2/2 in WebKit at laptop/tablet viewports, including unclipped Lines/Delete popover geometry and real pointer hit-testing. Separate cold-navigation WebKit coverage passes twice per viewport from independent seeds and fresh servers. The owner accepted this behavior in real Chrome and Safari on 31 August 2026.

- Replaced the real Practice Terminal chart engine with KLineChart 10.0.3 and TradeHub-owned overlays while preserving the Stage 29D.15 responsive workstation shell. `@klinecharts/extension` remains installed for the isolated feasibility spike.
- Kept primary-pointer ownership for Fibonacci, Measure, Zone, and Zoom while separating Trend Line into a first-click anchor, button-free preview, and second-click completion.
- Gave default Trend Lines a versioned saturated-blue appearance (`#2962ff`) across draft, save, selection, and reload. Legacy records that inherited the former accent default are converted only at render time, while deliberate user colors remain intact.
- Made every completed drawing/zoom tool one-shot. Students reselect Trend to create each additional independent line.
- Added versioned visual coordinates for empty pre/post-candle plotting space without widening the authoritative revealed-candle slice.
- Removed duplicate chart geometry: native KLine overlays now own saved rendering, selection, handles, and movement. Explicit overlay stacking plus pointer-release reconciliation persist KLineChart's authoritative moved points.
- Moved Lines and Delete into viewport-clamped fixed popovers outside the clipped scrolling rail while preserving the Stage 29D.15 rail overflow behavior.
- Kept Delete selected drawing and Clear chart drawings as separate menu actions, with one bounded atomic student-scoped drawing-only clear plus authoritative failure reconciliation.
- Replaced the Text Note placement form with a compact chart-local automatic editor: valid outside completion writes once, blank/too-short drafts and Escape write nothing, and failed persistence keeps the exact typed value and error visible.
- Preserved Text Note newlines through CRLF normalization, persistence, retrieval, editing, reload, and compact blue chart-text rendering without relaxing bounded validation or retaining a permanent card.
- Replaced the stock full-pane Fibonacci with a TradeHub-owned bounded KLine overlay whose 0/23.6/38.2/50/61.8/78.6/100 levels and translucent fills stop at both anchors.
- Changed Measure to blue when dragged upward and red when dragged downward.
- Made Zoom Rectangle retain a baseline and placed Zoom Out above the active capture layer so it restores a sane bounded viewport when visibly available.
- Made post-login redirects cross-lifecycle single-flight with exact-path settlement checks and no fallback navigation.
- Routed Quick Session, assignment, and resubmission terminal entry through the Next app router; cold WebKit laptop/tablet tests pass twice each from independently seeded fresh server processes while retaining response capture and protected cleanup.
- Restored KLineChart parity for SMA, EMA, RSI, ATR, and Volume MA with explicit main/lower panes and revealed-candle-only calculations.
- Fit the initial candle set once, then preserved the visible historical anchor and bar spacing through Next Candle and Play while retaining live-edge follow and coherent Zoom Rectangle/Out history.
- Preserved the Stage 29D.15 fullscreen shell, bottom drawer before xl, xl side panel, and responsive chart/trade-dock behavior.
- Added real production pointer-gesture browser acceptance at laptop/tablet widths for empty-space plotting, all tools, one-shot restoration, saved endpoint movement, reload, deletion/clear, zoom, and a direct future-index attack.
- No broker/exchange execution, AutoCopy coupling, provider integration change, copied third-party branding/assets, hidden candle access, payment change, or credential exposure was added.
