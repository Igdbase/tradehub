import fs from "node:fs";

const checks = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/crypto-execution.ts");
const preferences = read("src/lib/crypto-execution/auto-copy-preferences.ts");
const forexPaper = read("src/lib/crypto-execution/forex-paper-execution.ts");
const repository = read("src/lib/crypto-execution/crypto-execution-repository.ts");
const dashboardRepository = read("src/lib/workspace/dashboard-repository.ts");
const validation = read("src/lib/workspace/dashboard-validation.ts");
const signalSymbols = read("src/lib/workspace/signal-symbols.ts");
const studentUi = read("src/components/student-app/student-copier-client.tsx");
const workspaceUi = read("src/components/workspace/signal-management-section.tsx");
const workspaceOps = read("src/components/workspace/crypto-execution-ops-section.tsx");
const adminUi = read("src/components/admin/crypto-execution-ops-panel.tsx");
const adminPage = read("src/app/(super-admin)/admin/admin-page-client.tsx");
const route = read("src/app/api/admin/crypto-execution/forex-paper/worker/run/route.ts");
const rules = read("firestore.rules");
const rulesTest = read("scripts/firestore-rules-stage15f.test.mjs");
const indexes = read("firestore.indexes.json");

check(
  "stage15o script registered",
  packageJson.scripts?.["stage15o:qa"] === "node scripts/qa-stage15o-forex-paper-auto-copy.mjs",
  "package.json must expose npm run stage15o:qa."
);
check(
  "forex paper model exists",
  types.includes("ForexPaperExecutionIntentRecord") &&
    types.includes("ForexPaperAttemptRecord") &&
    types.includes("ForexRiskDecisionRecord") &&
    types.includes("ForexPaperExecutionPreview") &&
    types.includes("ForexPaperWorkerRunResponse"),
  "Stage 15O must add support-safe forex paper intent, attempt, decision, preview, and worker response types."
);
check(
  "forex execution modes are allowed for paper simulation",
  preferences.includes('executionMode: market === "forex" ? "confirm_before_execute" : "full_auto"') &&
    !preferences.includes('executionMode: market === "forex" ? "alerts_only" : executionMode') &&
    preferences.includes("forexFoundationOnly"),
  "Forex preferences should allow full-auto or confirmation for paper simulation while retaining the no-live-execution marker."
);
check(
  "market-aware validation remains strict",
  validation.includes("validatePairForMarket") &&
    validation.includes("validateDirectionalLevels") &&
    signalSymbols.includes("isSupportedForexPair") &&
    signalSymbols.includes("normalizeSignalPairForMarket"),
  "Workspace POST/PATCH validation must still reject crypto/forex symbol mixing and invalid directional levels."
);
check(
  "forex paper routing is hooked into published forex signals",
  dashboardRepository.includes("routePublishedForexSignalForPaperExecution") &&
    dashboardRepository.includes("forexPaperRoutingSummary") &&
    dashboardRepository.includes('signal.market === "forex"'),
  "Publishing a forex signal must invoke bounded forex paper routing and return a safe routing summary."
);
check(
  "forex paper router enforces Stage 16 and shared preferences",
  forexPaper.includes("resolveStudentEntitlements") &&
    forexPaper.includes("evaluateStaleSignalPolicy") &&
    forexPaper.includes('"full_auto"') &&
    forexPaper.includes('"confirm_before_execute"') &&
    forexPaper.includes('"alerts_only"') &&
    forexPaper.includes("forex_risk_decisions") &&
    forexPaper.includes("auto_copy_confirmations"),
  "Forex routing must use Stage 16 entitlements, shared execution mode, stale policy, risk decisions, and confirmations."
);
check(
  "forex worker is paper-only",
  forexPaper.includes("runForexPaperExecutionWorker") &&
    forexPaper.includes("ready_for_forex_paper") &&
    forexPaper.includes("completed_forex_paper") &&
    forexPaper.includes("No MetaAPI or broker call was made") &&
    !forexPaper.toLowerCase().includes("metaapi.cloud") &&
    !forexPaper.includes("placeBinanceOrder") &&
    !forexPaper.includes("placeBybitOrder"),
  "Forex worker must only create simulated attempts and must not import broker/exchange execution."
);
check(
  "forex preview is role-scoped through existing overview routes",
  repository.includes("loadForexPaperExecutionPreview") &&
    repository.includes("forexPaper") &&
    studentUi.includes("ForexPaperExecutionPreviewCard") &&
    workspaceOps.includes("ForexPaperExecutionPreviewCard") &&
    adminUi.includes("ForexPaperExecutionPreviewCard"),
  "Student, workspace, and Super Admin overviews must receive support-safe forex paper previews through Admin SDK routes."
);
check(
  "Super Admin worker route exists",
  route.includes("requireSuperAdmin") &&
    route.includes("runForexPaperExecutionWorker") &&
    adminPage.includes("/api/admin/crypto-execution/forex-paper/worker/run") &&
    adminUi.includes("Run forex paper"),
  "Forex paper worker must be Super Admin-only and available as a distinct route/action."
);
check(
  "student and influencer copy stays paper-only",
  studentUi.includes("Forex Auto-Copy is paper simulation only") &&
    studentUi.includes("Broker provisioning is billing-gated") &&
    workspaceOps.includes("Workspace Forex Paper Auto-Copy") &&
    workspaceOps.includes("No broker or MetaAPI execution is active"),
  "Non-admin surfaces must describe forex as paper simulation only."
);
check(
  "protected forex paths are denied and covered",
  rules.includes("forex_paper_intents") &&
    rules.includes("forex_paper_attempts") &&
    rules.includes("forex_risk_decisions") &&
    rules.includes("forex_execution_audit_events") &&
    rulesTest.includes("forex_paper_intents") &&
    rulesTest.includes("forex_paper_attempts") &&
    rulesTest.includes("forex_risk_decisions") &&
    rulesTest.includes("forex_execution_audit_events"),
  "Client SDK access to forex paper internals must remain denied and covered by rules tests."
);
check(
  "bounded forex indexes are declared",
  indexes.includes("forex_paper_intents") &&
    indexes.includes("forex_paper_attempts") &&
    indexes.includes("forex_risk_decisions") &&
    indexes.includes("forex_execution_audit_events") &&
    indexes.includes("auto_copy_confirmations"),
  "Bounded student-filtered preview and worker queries must have explicit index definitions."
);
check(
  "no client-side broker or exchange execution authority",
  !studentUi.includes("order-placement") &&
    !workspaceUi.includes("order-placement") &&
    !adminUi.includes("MetaApi") &&
    !studentUi.includes("MetaApi"),
  "Browser/client surfaces must not import broker, MetaAPI, or exchange order placement code."
);

const failed = checks.filter((entry) => !entry.ok);

for (const entry of checks) {
  console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.name}: ${entry.detail}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
