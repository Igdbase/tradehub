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
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const archiveRoute = read("src/app/api/student/practice/sessions/[sessionId]/archive/route.ts");
const restoreRoute = read("src/app/api/student/practice/sessions/[sessionId]/restore/route.ts");
const duplicateRoute = read("src/app/api/student/practice/sessions/[sessionId]/duplicate/route.ts");
const rules = read("firestore.rules");

const stage18lModules = [
  practiceTypes,
  practiceRepo,
  practiceClient,
  archiveRoute,
  restoreRoute,
  duplicateRoute
].join("\n");
const duplicateFunction = practiceRepo.slice(
  practiceRepo.indexOf("export async function duplicateStudentPracticeSession"),
  practiceRepo.indexOf("export async function createStudentPracticeOrder")
);

assert(
  packageJson.scripts?.["stage18l:qa"] === "node scripts/qa-stage18l-practice-session-management.mjs",
  "package.json exposes npm run stage18l:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18L - Practice Session Management Dashboard",
    "Add session search, filters, sorting, and bounded load-more behavior on /app/practice.",
    "Hide archived sessions by default and show them through an Archived filter.",
    "Duplicate sessions must copy setup only",
    "never copy orders, annotations, drawings, bookmarks, reflections, hidden candles, or ledger entries"
  ],
  "plan.md documents Stage 18L dashboard scope and duplicate/archive boundaries."
);

assertIncludesAll(
  practiceTypes,
  [
    "\"archived\"",
    "archivedAt?: IsoDateString",
    "archivedFromStatus?: Exclude<PracticeSessionStatus, \"archived\">"
  ],
  "Practice session types support archived dashboard state safely."
);

assertIncludesAll(
  practiceRepo,
  [
    "PRACTICE_SESSION_DASHBOARD_LIMIT",
    "normalizeSessionStatus",
    "normalizeRestorableSessionStatus",
    "archiveStudentPracticeSession",
    "restoreStudentPracticeSession",
    "duplicateStudentPracticeSession",
    "status: \"archived\"",
    "archivedFromStatus: session.status",
    "status: \"draft\"",
    "currentCandleIndex: 0",
    "Practice session duplicate copies setup only. Orders, annotations, drawings, bookmarks, reflections, hidden candles, and ledger entries are not copied.",
    "Completed, abandoned, or archived practice sessions cannot be changed."
  ],
  "Practice repository adds bounded dashboard list and safe archive/restore/duplicate server mutations."
);

assert(
  !duplicateFunction.includes("listOrdersForSession"),
  "Duplicate session function does not read/copy simulated orders."
);

assert(
  !duplicateFunction.includes("listAnnotationsForSession") &&
    !duplicateFunction.includes("listBookmarksForSession") &&
    !duplicateFunction.includes("writeAccountLinkedLedgerEntry"),
  "Duplicate session function does not copy annotations, bookmarks, drawings, reflections, or ledger entries."
);

for (const route of [archiveRoute, restoreRoute, duplicateRoute]) {
  assertIncludesAll(
    route,
    [
      "requireStudent(request",
      "apiJson",
      "apiError"
    ],
    "Session management mutation routes remain signed-in-student protected."
  );
}

assertIncludesAll(
  duplicateRoute,
  [
    "duplicateStudentPracticeSession",
    "{ status: 201 }"
  ],
  "Duplicate route creates a fresh student-owned practice session through the server."
);

assertIncludesAll(
  practiceClient,
  [
    "Practice session dashboard",
    "sessionSearch",
    "sessionStatusFilter",
    "sessionAssetFilter",
    "sessionSymbolFilter",
    "sessionTimeframeFilter",
    "sessionChallengeFilter",
    "sessionRandomFilter",
    "sessionSort",
    "visibleSessionCount",
    "Load more sessions",
    "Continue",
    "Open review",
    "Duplicate setup",
    "Archive",
    "Restore",
    "Session settings",
    "session.status !== \"archived\"",
    "session.status === sessionStatusFilter",
    "session.status !== \"archived\"",
    "estimatedSessionCandleCount"
  ],
  "/app/practice exposes search, filters, sorting, load-more, cards, and safe session actions."
);

assertIncludesAll(
  practiceClient,
  [
    "Progress",
    "Start",
    "Equity",
    "Realized",
    "Playbook:",
    "Challenge",
    "Updated"
  ],
  "Session rows show progress, balance/equity, P&L, playbook, challenge, and update metadata."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18L Practice Session Management Dashboard",
    "Search by session name and symbol.",
    "Filter active, completed, abandoned, and archived sessions.",
    "Duplicate a session and confirm only setup is copied.",
    "Confirm duplicate has no copied orders, notes, bookmarks, drawings, annotations, reflections, hidden candles, or ledger entries.",
    "Archive and restore a session.",
    "Confirm archived sessions are hidden by default and visible only under the Archived filter."
  ],
  "manual-test-backlog.md records Stage 18L dashboard manual QA."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "historical_candle_cache",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice paths."
);

assert(
  !stage18lModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18lModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18lModules.includes("getExchangeOrderAdapter") &&
    !stage18lModules.includes("submitOrder(") &&
    !stage18lModules.includes("postTrade(") &&
    !stage18lModules.includes("private Binance") &&
    !stage18lModules.includes("private Bybit") &&
    !stage18lModules.includes("brokerPassword") &&
    !stage18lModules.includes("metaApiToken") &&
    !stage18lModules.includes("vaultRef") &&
    !stage18lModules.includes("rawProviderPayload") &&
    !stage18lModules.includes("accountId") &&
    !stage18lModules.includes("apiSecret"),
  "Stage 18L does not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

assert(
  !stage18lModules.includes("jsPDF") &&
    !stage18lModules.includes("html2canvas") &&
    !stage18lModules.includes("captureScreenshot") &&
    !stage18lModules.includes("whatsapp") &&
    !stage18lModules.includes("sendEmail") &&
    !stage18lModules.includes("twilio") &&
    !stage18lModules.includes("paid storage"),
  "Stage 18L does not add paid storage, PDF, screenshots, SMS, email, or WhatsApp services."
);

console.log("Stage 18L practice session management dashboard QA passed.");
