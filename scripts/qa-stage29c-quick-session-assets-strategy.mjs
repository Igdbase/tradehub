import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertIncludesAll(source, values, message) {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertExcludesAll(source, values, message) {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
}

function sliceFrom(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(startIndex >= 0, `Found source marker: ${start}`);
  assert(endIndex > startIndex, `Found source marker after ${start}: ${end}`);
  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/practice.ts");
const historical = read("src/lib/practice/historical-data-service.ts");
const cryptoAllowlist = read("src/lib/practice/practice-crypto-spot-allowlist.ts");
const forexContract = read("src/lib/practice/forex-cfd-history-provider-contract.ts");
const specs = read("src/lib/practice/practice-instrument-specs.ts");
const repository = read("src/lib/practice/practice-repository.ts");
const sessionsRoute = read("src/app/api/student/practice/sessions/route.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const reportClient = read("src/components/student-app/student-practice-report-client.tsx");
const studentSpec = read("tests/browser/student-e2e.spec.mjs");
const studentFlows = read("tests/browser/helpers/student-flows.mjs");
const demoSeed = read("scripts/seed-demo-data.mjs");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const manualDemo = read("manual-demo-qa.md");
const roadmap = read("complaint-resolution-roadmap.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts?.["stage29c:qa"] === "node scripts/qa-stage29c-quick-session-assets-strategy.mjs",
  "package.json exposes npm run stage29c:qa."
);

assertIncludesAll(
  types,
  [
    'export type PracticeAssetCatalogueCategory = "crypto" | "forex" | "metals" | "indices" | "energies"',
    "export interface PracticeAssetCatalogueItem",
    "displayName: string",
    "available: boolean",
    "safeMessage: string",
    "assetCatalogue?: PracticeAssetCatalogueItem[]",
    "supportedTimeframes?: number[]",
    "maxRangeDays?: number"
  ],
  "Practice overview exposes a bounded, safe asset catalogue contract."
);

const assetDefinitions = `${sliceFrom(historical, "const SUPPORTED_BINANCE_SYMBOLS", "// Stage 18X compatibility anchor")}\n${cryptoAllowlist}`;
assertIncludesAll(
  `${assetDefinitions}\n${forexContract}`,
  [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD", "XAUUSD",
    "Bitcoin / Tether", "Ethereum / Tether", "BNB / Tether", "Solana / Tether", "XRP / Tether",
    "Euro / US Dollar", "British Pound / US Dollar", "US Dollar / Japanese Yen",
    "US Dollar / Swiss Franc", "US Dollar / Canadian Dollar", "Australian Dollar / US Dollar",
    "New Zealand Dollar / US Dollar", "Gold / US Dollar"
  ],
  "Verified catalogue contains the five Crypto, seven Forex, and one Metals instruments requested for Stage 29C."
);
assertExcludesAll(
  assetDefinitions,
  ["AAPL", "TSLA", "CORN", "WHEAT", "FUTURES", "BTCUPUSDT", "BTCDOWNUSDT"],
  "Verified catalogue baseline does not advertise stocks, agriculture, exchange futures, or leveraged tokens."
);

assertIncludesAll(
  historical,
  [
    "export async function getPracticeAssetCatalogue()",
    "if (!forexReadiness.configured)",
    "category: approved.category",
    "Historical candles are not available for this asset right now.",
    "maxCandlesPerRequest: MAX_CANDLES_PER_REQUEST",
    "maxRangeDays: MAX_RANGE_MS",
    "supportedTimeframes: [...SUPPORTED_TIMEFRAMES]",
    "discoverMetaApiUtilityForexCfdInstruments"
  ],
  "Asset availability comes from protected history readiness and keeps existing bounded candle limits."
);

assertIncludesAll(
  specs,
  ["BNBUSDT:", "SOLUSDT:", "XRPUSDT:", "BTCUSDT:", "ETHUSDT:", "XAUUSD:", "EURUSD:", "NZDUSD:"],
  "Every newly selectable Crypto instrument has a safe simulation spec and existing Forex/Metals specs remain present."
);

const createSessionFlow = sliceFrom(
  repository,
  "export async function createStudentPracticeSession",
  "export async function updateStudentPracticeSessionAssumptions"
);
assertIncludesAll(
  createSessionFlow,
  [
    "sessionName.length < 2",
    "requestedEndMs <= requestedStartMs",
    "requestedEndMs > Date.now()",
    "historicalDataLimits.maxRangeDays",
    "const assetCatalogue = await getPracticeAssetCatalogue()",
    "if (!asset.available)",
    "startingBalance < 1 || startingBalance > 1_000_000",
    "historicalDataLimits.maxCandlesPerRequest",
    "Math.random()",
    "normalizeHistoricalCandleRequest",
    "fetchHistoricalCandlesWithCache",
    "if (!candleResult.candles.length)",
    "practice_sessions/${sessionId}"
  ],
  "Server validates ownership-safe setup, dates, balance, catalogue availability, Strategy, random range, and candles."
);
assertIncludesAll(
  createSessionFlow,
  [
    "getPracticePlaybookSnapshot(actor, playbookId)",
    "playbook.market !== assetClass",
    "practice_session_strategy_market_mismatch"
  ],
  "Optional Strategies are ownership checked and must match the selected market."
);
assert(
  createSessionFlow.indexOf("fetchHistoricalCandlesWithCache") < createSessionFlow.indexOf("practice_sessions/${sessionId}"),
  "Historical candle availability is verified before the student session record is persisted."
);
assertIncludesAll(
  sessionsRoute,
  ["export async function POST", "requireStudent(request)", "createStudentPracticeSession(actor, payload)"],
  "Quick-session creation remains protected by the signed-in student route."
);

assertIncludesAll(
  practiceClient,
  [
    'data-testid="practice-quick-session-layer"',
    'data-testid="practice-quick-session-modal"',
    'data-theme-surface="dark"',
    "bg-black shadow-2xl",
    'role="dialog"',
    'aria-modal="true"',
    "max-h-[calc(100dvh-7rem)]",
    "onMouseDown",
    "event.target === event.currentTarget",
    "event.key !== \"Escape\"",
    "quickSessionNameRef.current?.focus()",
    "trapQuickSessionFocus",
    "Session name",
    "Starting balance",
    "Strategy (optional)",
    "No strategy",
    "Asset",
    "Timeframe",
    "Initial date",
    "End date",
    "+1D", "+1W", "+1M", "+1Y",
    "Random start",
    "Choose another random start",
    "Open terminal after creation",
    "Cancel",
    "Create session"
  ],
  "Backtesting Session opens an opaque, responsive, keyboard-managed quick-session modal with the required fields."
);

assertIncludesAll(
  practiceClient,
  [
    "practiceAssetCategoryOptions",
    "practice-asset-search",
    "Search assets",
    "practice-asset-toggle",
    'role="combobox"',
    'role="listbox"',
    "isAssetPickerOpen",
    "ChevronDown", "ChevronUp",
    "Crypto", "Forex", "Metals",
    "asset.displayName",
    "disabled={!asset.available}",
    "Available", "Unavailable",
    "practiceTimeframeOptions",
    "15 minutes", "1 hour", "4 hours", "1 day",
    "validateQuickSession",
    "dateStart: new Date(endMs - days * dayMs)",
    "randomizeQuickStart",
    "data-testid={`practice-range-${range.days}`}",
    "practice-randomize-start",
    "!input.form.randomStartEnabled && candleCount > input.maxCandles",
    "Shorten the date range or choose a higher timeframe.",
    "quickSessionStrategies",
    "strategy.market === sessionForm.assetClass",
    "sessionSubmissionLockRef.current",
    "Creating session...",
    "openTerminalAfterCreate",
    "practice-created-session"
  ],
  "Client search, categories, availability, validation, duplicate-submit lock, terminal navigation, and session highlight are present."
);

const createOrderFlow = sliceFrom(
  repository,
  "export async function createStudentPracticeOrder",
  "export async function cancelStudentPracticeOrder"
);
assertIncludesAll(
  createOrderFlow,
  [
    "let playbook: PracticePlaybookSummary | undefined",
    "if (selectedPlaybookId)",
    "playbookId: playbook?.playbookId",
    "playbookName: playbook?.name"
  ],
  "No-Strategy sessions can place simulated orders while optional Strategy analytics remain supported."
);
assertIncludesAll(
  `${terminalClient}\n${replayClient}`,
  [
    "Strategy (optional)",
    '<option value="">No strategy</option>',
    "Submit simulated order"
  ],
  "Terminal and replay order tickets keep Strategy optional."
);

assertIncludesAll(
  types,
  [
    'StudentPracticeCandle = Omit<NormalizedCandle, "provider" | "providerSymbol">'
  ],
  "Student candle responses use a provider-free public shape."
);
assertExcludesAll(
  `${terminalClient}\n${replayClient}`,
  ["Cache hit", "Server reveal", 'label="Provider"'],
  "Student Practice chart UI does not show cache or provider diagnostics."
);

const quickModal = sliceFrom(practiceClient, 'activeView === "create"', 'activeView === "sessions" ? <div');
assertExcludesAll(
  quickModal,
  ["Prop Firm", "Advanced Session", "chart layout", "API", "Firestore", "MetaAPI", "provider payload", "source-QA", "Stage 29"],
  "Quick-session copy stays student-friendly and does not advertise deferred modes or engineering internals."
);

assertIncludesAll(
  `${practiceClient}\n${terminalClient}\n${replayClient}\n${reportClient}`,
  [
    "Strategies",
    "Strategy performance",
    "Strategy Summary",
    "No linked strategy"
  ],
  "Ordinary student-facing Practice copy consistently uses Strategy while internal playbook compatibility remains intact."
);
assertExcludesAll(
  `${terminalClient}\n${replayClient}\n${reportClient}`,
  ["No playbook", "Select playbook", "Playbook performance", "Playbook Summary", "Best playbook", "Worst playbook"],
  "Terminal, replay, and report surfaces no longer show legacy Playbook labels."
);

assertIncludesAll(
  `${studentSpec}\n${studentFlows}`,
  [
    "quick Practice session modal validates, creates once, and highlights the session",
    "quick Practice session can open its terminal after creation",
    "practice-quick-session-modal",
    'toHaveCSS("background-color", "rgb(0, 0, 0)")',
    "toBeFocused()",
    'page.keyboard.press("Escape")',
    "practice-quick-session-layer",
    "Metals",
    "practice-asset-search",
    "XAUUSD, Gold \\/ US Dollar, available",
    "XAGUSD, Silver \\/ US Dollar, available",
    "EURGBP, Euro \\/ British Pound, available",
    "NAS100, US Tech 100, available",
    "USOIL, US Crude Oil, available",
    "No strategy",
    "between 1 and 1,000,000",
    "after the initial date",
    "createRequests",
    "button.click();",
    "practice-created-session",
    "waitForURL",
    "practice-session-settings-drawer"
  ],
  "Focused Playwright coverage exercises modal access, catalogue, validation, one-submit creation, Sessions, terminal navigation, and Stage 29B drawer safety."
);

assertIncludesAll(
  demoSeed,
  [
    "practiceHistoricalCacheId",
    "practiceHistoricalCacheDoc",
    "historical_candle_cache/${practiceCache.cacheId}",
    'provider = "binance"',
    'symbol = "BTCUSDT"',
    'rangeStart = "2026-07-01T00:00:00.000Z"',
    'rangeEnd = "2026-07-02T00:00:00.000Z"',
    "Demo Breakout Strategy"
  ],
  "Demo seed provides deterministic normalized candles for browser session creation without a live history dependency."
);

const docs = `${plan}\n${backlog}\n${manualDemo}\n${roadmap}\n${promptSummary}`;
assertIncludesAll(
  docs,
  [
    "Stage 29C - Quick Session, Verified Asset Catalogue, And Strategy Simplification",
    "TH-2026-08-25-STAGE29C-QUICK-SESSION-ASSET-STRATEGY-HANDOFF",
    "Owner browser acceptance remains deferred",
    "Stage 29C.1 is implemented",
    "Stage 29C.2 is implemented",
    "Stage 29C.3 and Stage 29D remain pending"
  ],
  "Docs record the Stage 29C handoff, deferred owner QA, and stop before later Practice stages."
);

assertExcludesAll(
  `${practiceClient}\n${studentSpec}`,
  [
    "submitLiveOrder(", "createLiveOrder(", "executeAutoCopy(", "propFirmSession", "advancedSession",
    "telegram", "scrape", "rawProviderPayload", "vaultRef", "brokerPassword", "metaApiToken"
  ],
  "Stage 29C client and browser work adds no live execution, AutoCopy, deferred session modes, scraping, or secret exposure."
);

console.log("Stage 29C quick session, verified assets, and Strategy simplification QA passed.");
