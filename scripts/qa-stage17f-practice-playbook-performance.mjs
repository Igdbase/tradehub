import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertIncludesAll(source, expected, message) {
  const missing = expected.filter((entry) => !source.includes(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const practiceTypes = read("src/types/practice.ts");
const analytics = read("src/lib/practice/practice-performance-analytics.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const overviewClient = read("src/components/student-app/student-practice-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const journalLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const journalUi = read("src/components/student-app/student-journal-client.tsx");
const rules = read("firestore.rules");

const practiceModules = [
  practiceTypes,
  analytics,
  practiceRepo,
  overviewClient,
  replayClient,
  journalLedger,
  journalUi
].join("\n");

assert(
  packageJson.scripts?.["stage17f:qa"] === "node scripts/qa-stage17f-practice-playbook-performance.mjs",
  "package.json exposes npm run stage17f:qa."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticePlaybookStatus",
    "market: PracticeAssetClass",
    "strategyType: string",
    "setupRules: string",
    "entryChecklist: string[]",
    "invalidationRules: string",
    "riskNotes: string",
    "status: PracticePlaybookStatus",
    "playbookId?: string",
    "playbookName?: string",
    "checklistNotes?: string",
    "PracticePlaybookPerformanceSummary",
    "bestPlaybook?: PracticePlaybookPerformanceSummary",
    "worstPlaybook?: PracticePlaybookPerformanceSummary",
    "playbookPerformance: PracticePlaybookPerformanceSummary[]"
  ],
  "Practice types include Stage 17F playbook records, order snapshots, and playbook performance responses."
);

assertIncludesAll(
  analytics,
  [
    "import \"server-only\"",
    "computePracticePlaybookPerformance",
    "order.status !== \"closed\"",
    "order.playbookId",
    "wins",
    "losses",
    "winRate",
    "netPnl",
    "averageR",
    "profitFactor",
    "expectancy",
    "maxDrawdown",
    "selectBestWorstPracticePlaybooks",
    "Playbook analytics are computed from closed simulated practice orders only."
  ],
  "Server-only analytics computes playbook performance from closed simulated orders only."
);

assert(
  !analytics.includes("fetch(") &&
    !analytics.includes("MetaAPI") &&
    !analytics.includes("Binance") &&
    !analytics.includes("Bybit"),
  "Playbook analytics helper does not call external providers."
);

assertIncludesAll(
  practiceRepo,
  [
    "getPracticePlaybookSnapshot",
    "practice_playbook_required",
    "practice_playbook_archived",
    "practice_playbook_market_mismatch",
    "playbookId: playbook.playbookId",
    "playbookName: playbook.name",
    "checklistNotes",
    "computePracticePlaybookPerformance",
    "selectBestWorstPracticePlaybooks",
    "playbookPerformance",
    "candlesResult.candles.slice(0, session.currentCandleIndex + 1)"
  ],
  "Repository gates simulated orders on owned active playbooks, snapshots playbook metadata, and keeps reveal-bounded evaluation."
);

assertIncludesAll(
  overviewClient,
  [
    "PlaybookForm",
    "setupRules",
    "entryChecklist",
    "invalidationRules",
    "riskNotes",
    "updatePlaybook",
    "Best playbook",
    "Worst playbook",
    "playbookFilter",
    "filteredSessions",
    "filteredOrders",
    "No playbook has closed simulated trades yet."
  ],
  "Practice overview supports create/edit playbooks, best/worst summaries, and playbook filters."
);

assertIncludesAll(
  replayClient,
  [
    "playbookId",
    "checklistNotes",
    "Select a playbook",
    "activePlaybooks",
    "orderPlaybookFilter",
    "filteredOrders",
    "Playbook performance",
    "No playbook has closed trades in this replay yet.",
    "disabled={!lastCandle || !orderForm.playbookId || isSaving || isSessionLocked}",
    "Checklist notes:"
  ],
  "Replay order UX requires playbook selection, stores checklist notes, filters orders, and shows playbook performance."
);

assertIncludesAll(
  `${journalLedger}\n${journalUi}`,
  [
    "practicePlaybookLabel",
    "Practice backtesting partial close",
    "playbookLabels",
    "Playbooks:",
    "No practice playbook has closed ledger activity yet.",
    "practice_backtest"
  ],
  "Journal shows compact practice/playbook summary separate from AutoCopy."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "playbooks",
    "allow read, write: if false;"
  ],
  "Firestore browser rules deny direct practice session/order/playbook writes."
);

assert(
  !practiceModules.includes("getForexDemoOrderPlacementAdapter") &&
    !practiceModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !practiceModules.includes("getExchangeOrderAdapter") &&
    !practiceModules.includes("submitOrder(") &&
    !practiceModules.includes("private Binance") &&
    !practiceModules.includes("private Bybit") &&
    !practiceModules.includes("crypto-live-production") &&
    !practiceModules.includes("crypto-live-sandbox") &&
    !practiceModules.includes("forex-demo-execution") &&
    !practiceModules.includes("forex-live-canary-execution"),
  "Stage 17F practice playbook modules do not import or call AutoCopy/live execution adapters."
);

assert(
  !practiceModules.includes("apiSecret") &&
    !practiceModules.includes("brokerPassword") &&
    !practiceModules.includes("metaApiToken") &&
    !practiceModules.includes("credentialRefPath") &&
    !practiceModules.includes("rawProviderPayload") &&
    !practiceModules.includes("vaultRef") &&
    !practiceModules.includes("accountId"),
  "Stage 17F practice playbook modules do not expose secrets, account IDs, vault refs, or raw provider payloads."
);

console.log("Stage 17F practice playbook performance QA passed.");
