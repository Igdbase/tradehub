# Legacy QA Guard Triage (Stage 30D)

Scope: the 89 source-QA scripts that failed identically at the pre-Stage-29N HEAD (see the Stage 29N sections).
Stage 30D is QA hygiene only: zero product code changes. REWRITE = truthful needle update that can still fail;
RETIRE = script deleted, package.json entry removed, behavior recorded here as obsolete or superseded.
RUN-WITH-FIXTURES = guard is correct and passes when its era's emulator seed pack and stack are up.

Status: IN PROGRESS — decisions provisional until each batch is executed and verified.

| Script | Era / stage | Why it fails | Decision | Superseded-by / notes |
|---|---|---|---|---|
| `stage15f:qa` | 15F paper beta | ERR: 14 UNAVAILABLE: No connection established. Last error: Error: connect ECONNREFUSED 127.0.0.1:8080. Resolution note:  | RUN-WITH-FIXTURES |  |
| `stage15h:qa` | 15H live sandbox | ERR: fetch failed | RUN-WITH-FIXTURES |  |
| `stage15i:qa` | 15I production-live beta | ERR: fetch failed | RUN-WITH-FIXTURES |  |
| `stage15j:qa` | 15J consent/symbol UI | ERR: forex pair validation returns market-specific copy | REWRITE |  |
| `stage15k:qa` | 15K crypto completion | ERR: student copier uses product labels | RETIRE | obsolete: behavior removed |
| `stage15m:qa` | 15M production preflight | stale needles | REWRITE |  |
| `stage15n:qa` | 15N cross-asset AutoCopy | stale needles | REWRITE |  |
| `stage15o:qa` | 15O forex paper AutoCopy | stale needles | REWRITE |  |
| `stage15p:qa` | 15P MetaAPI connection | stale needles | REWRITE |  |
| `stage15q:qa` | 15Q forex demo proof | ERR: Student copier shows support-safe forex demo proof preview. | REWRITE |  |
| `stage15r:qa` | 15R billing-gated provisioning | ERR: Broker provisioning must be gated by paid Forex AutoCopy billing, Stage 16 entitlements, and personal-account posture. | REWRITE |  |
| `stage15u:qa` | 15U paid provisioning readiness | MISSING: function mapForexBillingState(record: Record<string, unknown> | null): ForexBillingState, rawStatus === "active_paid", rawStatus === "payment_pending", rawStatus === "payment_faile | REWRITE |  |
| `stage15v:qa` | 15V forex demo worker lifecycle | MISSING: forex paper simulation; MetaAPI demo proof when gated, Live forex broker execution is not enabled. | REWRITE |  |
| `stage15w:qa` | 15W forex live canary | MISSING: Forex live canary routing only runs for newly published forex signals. | REWRITE |  |
| `stage15x:qa` | 15X student UX MetaAPI boundary | ERR: Could not locate source block Forex AutoCopy broker setup -> ForexPaperExecutionPreviewCard. | REWRITE |  |
| `stage15y:qa` | 15Y account-linked ledger | MISSING: Your manual trading, Copied signal activity, Practice/backtesting, Practice/backtesting performance will appear here., Linked account readiness, Recent AutoCopy ledger, Masked refs | RETIRE | Stage 29F redesign |
| `stage17a:qa` | 17A historical data foundation | MISSING: metaapi_utility_history_not_configured, TradeHub will use a platform-owned utility MetaAPI account later, not student credentials. | REWRITE |  |
| `stage17b:qa` | 17B chart replay shell | ERR: Lightweight Charts is imported only by the practice replay client. | RETIRE | 29d16 |
| `stage17c:qa` | 17C order fill engine | MISSING: size = riskAmount / stopDistance, notional = size * input.entryPrice, TODO InstrumentSpec | REWRITE |  |
| `stage17d:qa` | 17D replay order UX | MISSING: closeSize <= 0 || closeSize >= remainingSize, Partial close quantity must be greater than zero and less than the remaining quantity. | REWRITE |  |
| `stage17e:qa` | 17E performance analytics | MISSING: costForOrder, assumptions.feeBps + assumptions.spreadBps + assumptions.slippageBps | RETIRE | 29F net-result calculation |
| `stage17f:qa` | 17F playbook performance | MISSING: playbookName: playbook.name | REWRITE |  |
| `stage17g:qa` | 17G completed-session review | MISSING: No playbook, No playbook has closed trades in this replay yet. | REWRITE |  |
| `stage17h:qa` | 17H trade annotations | MISSING: Latest practice main lesson | REWRITE |  |
| `stage18a:qa` | 18A terminal shell | MISSING: Practice Terminal, OHLC, Journal/Review, Layout, Vertical time marker, Measurement placeholder, Current, Qty / Risk, Simulated order ticket, Practice orders, Drawings / Notes | RETIRE | 29d15/29d16 |
| `stage18b:qa` | 18B order ticket | MISSING: Simulated order ticket | RETIRE | 29d5 + 28d browser coverage |
| `stage18c:qa` | 18C terminal drawings | MISSING: Vertical time marker, Measurement placeholder, Drawings / Notes, Add drawing, onSelectDrawing={setSelectedDrawingId} | RETIRE | 29d16/30A/30C |
| `stage18d:qa` | 18D revealed-candle indicators | MISSING: revealedCandlesOnly: NormalizedCandle[] | RETIRE | obsolete: behavior removed |
| `stage18e:qa` | 18E timeframe selector | MISSING: { label: "M15", value: 15 }, { label: "H1", value: 60 }, { label: "H4", value: 240 }, { label: "D1", value: 1440 }, aria-label="Terminal timeframe" | REWRITE |  |
| `stage18f:qa` | 18F challenge rules | MISSING: Latest simulated challenge, performance.practice.latestChallengeResult.status | REWRITE |  |
| `stage18g:qa` | 18G event markers | MISSING: const timeScale = chart.timeScale(), timeScale.timeToCoordinate(closestTime), subscribeVisibleLogicalRangeChange, unsubscribeVisibleLogicalRangeChange, Event link | RETIRE | 29d16 pixel grouping |
| `stage18h:qa` | 18H responsive polish | MISSING: lg:h-[100dvh], lg:grid-cols-[2.75rem_minmax(0,1fr)_20rem], data-practice-terminal-responsive-tools="compact-icon-toolbar", h-11 shrink-0, lg:w-11, min-h-[30rem], sm:min-h-[34rem],  | RETIRE | obsolete: behavior removed |
| `stage18i:qa` | 18I import/export | MISSING: Import playbooks, Import playbooks | REWRITE |  |
| `stage18j:qa` | 18J forex provider expansion | MISSING: "EURUSD", safeProviderSymbol, provider.startsWith(canonical), PRACTICE_FOREX_CFD_PROVIDER_SYMBOL_MAP, resolveForexCfdProviderSymbol, Student MetaAPI credentials are never used for  | REWRITE |  |
| `stage18k:qa` | 18K instrument specs | MISSING: Practice estimates use TradeHub instrument specs and may differ by broker. | REWRITE |  |
| `stage18l:qa` | 18L session management | MISSING: Playbook: | REWRITE |  |
| `stage18m:qa` | 18M analytics comparison | MISSING: Playbook breakdown, No closed simulated trades yet, closed orders only | REWRITE |  |
| `stage18n:qa` | 18N session report | MISSING: Playbook Summary | REWRITE |  |
| `stage18o:qa` | 18O workspace insights | MISSING: Private journal entries, raw trade history, hidden candles, and execution internals are not shown. | REWRITE |  |
| `stage18q:qa` | 18Q instructor feedback | MISSING: Latest instructor feedback | REWRITE |  |
| `stage18v:qa` | 18V practice MVP smoke | MISSING: Import playbooks, Open terminal after create, Resume terminal | REWRITE |  |
| `stage18w:qa` | 18W launch polish | MISSING: Create a playbook, No playbooks yet, Practice is separate from AutoCopy and never places a broker or exchange order | REWRITE |  |
| `stage18x:qa` | 18X MVP final acceptance | MISSING: timeScale.timeToCoordinate(closestTime), subscribeVisibleLogicalRangeChange, unsubscribeVisibleLogicalRangeChange | RETIRE | 29d16/29d17 |
| `stage19b:qa` | 19B course navigation | MISSING: Opening a course still uses the signed-in student API and existing access checks. | REWRITE |  |
| `stage19c:qa` | 19C completion proof | MISSING: server-owned progress | REWRITE |  |
| `stage19f:qa` | 19F course resources | MISSING: TradeHub does not upload, host, or rewrite the files. | REWRITE |  |
| `stage19g:qa` | 19G discovery search | MISSING: Search available lesson titles, section names, safe resource metadata, Locked course lessons and resource links are not included here. | REWRITE |  |
| `stage20a:qa` | 20A ops/CRM foundation | MISSING: Stage 20A ops audit, Workspace readiness summary, Payment/access, AutoCopy, Practice/course MVP, Private practice trades, course notes, payment payloads, credential records | REWRITE |  |
| `stage20b:qa` | 20B student CRM | MISSING: provider payloads, credentials | REWRITE |  |
| `stage20c:qa` | 20C payment ops | MISSING: provider payloads, credentials | REWRITE |  |
| `stage20d:qa` | 20D final acceptance | MISSING: Stage 20A ops audit, Workspace readiness summary, Payment/access, AutoCopy, Practice/course MVP, Private practice trades, payment payloads, credential records | REWRITE |  |
| `stage21a:qa` | 21A manual journal CRUD | MISSING: data-manual-journal-crud, Private manual trade journal, /api/student/journal/manual-trades, Create trade, Save changes, Confirm archive, Manual trades, Manual trade CRUD is private | RETIRE | obsolete: behavior removed |
| `stage21b:qa` | 21B manual trade review | MISSING: /app/journal/trades/${encodeURIComponent(trade.tradeId)}, Manual trades, Copied signal activity, Practice/backtesting | RETIRE | obsolete: behavior removed |
| `stage21c:qa` | 21C manual analytics | MISSING: data-manual-journal-analytics, data-manual-journal-import-export, /api/student/journal/manual-trades/analytics, /api/student/journal/manual-trades/export?type=, /api/student/journa | RETIRE | obsolete: behavior removed |
| `stage21d:qa` | 21D manual journal final | MISSING: Private manual trade journal, data-manual-journal-crud, data-manual-journal-analytics, data-manual-journal-import-export, Manual trades, Copied signal activity, Practice/backtestin | RETIRE | obsolete: behavior removed |
| `stage22a:qa` | 22A forex provider contract | MISSING: provider.startsWith(canonical) | REWRITE |  |
| `stage23c:qa` | 23C reminder preferences | MISSING: StudentMessagingPreferencesCard, <StudentMessagingPreferencesCard /> | RETIRE | obsolete: behavior removed |
| `stage25a:qa` | 25A broad live AutoCopy status | ERR: student copier broad live status is missing StudentBroadLiveAutoCopyStatusCard | RETIRE | Stage 29I copier UI |
| `stage25b:qa` | 25B cohort gate | ERR: cohort consuming UI is missing StudentBroadLiveAutoCopyStatusCard | RETIRE | Stage 29I copier UI |
| `stage25c:qa` | 25C crypto cohort rollout | ERR: crypto live cohort rollout implementation is missing isCryptoAutoCopyBillingActive | RETIRE | Stage 29I implementation |
| `stage26a:qa` | 26A manual browser demo pack | stale needles | REWRITE |  |
| `stage27a:qa` | 27A package entitlements | stale needles | REWRITE |  |
| `stage27b:qa` | 27B billing maintenance | stale needles | REWRITE |  |
| `stage27c:qa` | 27C branding/whitelabel | stale needles | REWRITE |  |
| `stage27d:qa` | 27D enterprise deployment | stale needles | REWRITE |  |
| `stage27e:qa` | 27E enterprise integrations | stale needles | REWRITE |  |
| `stage27i:qa` | 27I sales smoke | stale needles | REWRITE |  |
| `stage27j:qa` | 27J sales final acceptance | stale needles | REWRITE |  |
| `stage28c:qa` | 28C student browser source guard | stale needles | REWRITE |  |
| `stage28d:qa` | 28D workspace/admin browser source guard | stale needles | REWRITE |  |
| `stage28e:qa` | 28E browser QA polish | stale needles | REWRITE |  |
| `stage28f:qa` | 28F final demo readiness | stale needles | RUN-WITH-FIXTURES |  |
| `stage29a:qa` | 29A student/course simplification | stale needles | REWRITE |  |
| `stage29c:qa` | 29C quick-session assets | MISSING: rangeEnd = "2026-07-02T00:00:00.000Z" | REWRITE |  |
| `stage29c1:qa` | 29C1 forex catalogue | FOUND: vaultRef | REWRITE |  |
| `stage29c2:qa` | 29C2 crypto catalogue | MISSING: entry.practiceInstrument ?? getPracticeInstrumentSpec | REWRITE |  |
| `stage29c3:qa` | 29C3 forex catalogue | FOUND: vaultRef | REWRITE |  |
| `stage29d1:qa` | 29D.1 workstation visual upgrade | MISSING: setVisibleLogicalRange, barSpacing: 4.2 | RETIRE | 29d15/29d16 |
| `stage29d3:qa` | 29D.3 dock density | MISSING: lg:grid-cols-[minmax(30rem,auto)_minmax(18rem,1fr)_auto] | RETIRE | 29D.15 layout |
| `stage29d4:qa` | 29D.4 order popout | MISSING: lg:fixed lg:left-[5.25rem] lg:top-[5.25rem], lg:w-[min(48rem,calc(100vw-29rem))], lg:border-[#1b5c84], lg:shadow-[0_0_0_2px_rgba(29,92,132,0.55),0_24px_70px_rgba(0,0,0,0.68)] | REWRITE |  |
| `stage29d7:qa` | 29D.7 interactive tools history | MISSING: MouseEventParams, chart.subscribeClick(handleChartClick) | RETIRE | 29d16 |
| `stage29d10:qa` | 29D.10 drawing capture | MISSING: placeDrawingFromChartCoordinates, ReactPointerEvent<HTMLButtonElement>, chart.timeScale().coordinateToLogical(boundedX), series.coordinateToPrice(boundedY), priceScaleReservePx, ch | RETIRE | 29d16 |
| `stage29d11:qa` | 29D.11 advanced tools | MISSING: data-testid="practice-terminal-drawing-drag-preview", data-practice-terminal-drag-preview | RETIRE | 29d16/30A/30C |
| `stage29d12:qa` | 29D.12 clear-drawings declutter | FOUND: label: "Delete selected drawing" | RETIRE | obsolete: behavior removed |
| `stage29d13:qa` | 29D.13 trendline menu | MISSING: const setTerminalDragDraft = useCallback, setTerminalDragDraft({, data-testid="practice-terminal-drawing-drag-preview", dragDraft.kind === "trend_line", pixelDistance >= 10 | RETIRE | 29d16/30A/30C |
| `stage29d14:qa` | 29D.14 drawing reliability | MISSING: const setTerminalDragDraft = useCallback, setDragDraft(nextDraft);, setTerminalDragDraft({, setTerminalDragDraft(null);, style={{ touchAction: "none" }} | RETIRE | 29d16/30A/30C |
| `stage29i:qa` | 29I copier purchase experience | MISSING: implemented/source-QA ready for adviser review | REWRITE |  |
| `stage29i:repository:qa` | 29I copier billing repository | ERR: Firestore emulator is required at 127.0.0.1:8080. Start emulators before running stage29i:repository:qa. Total timeout of API google.firestore.v1.Fire | REWRITE |  |
| `stage29j:qa` | 29J signals feed routing | MISSING: Stage 29K Telegram Signal Ingestion And Controlled Bridge is implemented/source-QA ready, Stage 29L remains unstarted | REWRITE |  |

Counts: 58 REWRITE, 27 RETIRE, 4 RUN-WITH-FIXTURES (of 89).
