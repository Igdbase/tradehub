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
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const practiceApiClient = read("src/lib/course-hub/course-api-client.ts");
const rules = read("firestore.rules");

assert(
  packageJson.scripts?.["stage18h:qa"] === "node scripts/qa-stage18h-practice-terminal-responsive-polish.mjs",
  "package.json exposes npm run stage18h:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18H - Mobile, Tablet, And Dense UI Polish",
    "Add responsive drawer behavior:",
    "bottom sheet on mobile",
    "side drawer on desktop",
    "Keep chart large and primary.",
    "Do not change business logic or security rules"
  ],
  "plan.md documents Stage 18H as responsive UI polish without business/security changes."
);

assertIncludesAll(
  terminalClient,
  [
    "type TerminalMobilePanelTab",
    "terminalMobilePanelTabs",
    "data-practice-terminal-responsive-shell=\"stage18h\"",
    "min-h-[100dvh]",
    "lg:h-[100dvh]",
    "lg:grid-cols-[2.75rem_minmax(0,1fr)_20rem]",
    "data-practice-terminal-responsive-tools=\"compact-icon-toolbar\"",
    "h-11 shrink-0",
    "lg:w-11",
    "min-h-[30rem]",
    "sm:min-h-[34rem]",
    "min-h-[22rem]",
    "sm:min-h-[26rem]",
    "pb-[calc(0.375rem+env(safe-area-inset-bottom))]",
    "max-h-[min(72dvh,42rem)]",
    "lg:max-h-[calc(100dvh-3.5rem)]",
    "data-practice-terminal-responsive-drawer=\"bottom-sheet-mobile-side-desktop\"",
    "data-practice-terminal-mobile-tabs=\"objects-order-goto-news-journal\"",
    "aria-pressed={mobilePanelTab === tab.value}",
    "data-practice-terminal-panel-content=\"tabbed-utility-panel\""
  ],
  "Practice terminal has responsive shell, toolbar, chart, bottom bar, and mobile bottom-sheet drawer guards."
);

assertIncludesAll(
  terminalClient,
  [
    "setMobilePanelTab(\"order\")",
    "mobilePanelVisibility(\"objects\")",
    "mobilePanelVisibility(\"goto\")",
    "mobilePanelVisibility(\"news\")",
    "mobilePanelVisibility(\"journal\")",
    "mobileTicketVisibility()"
  ],
  "Responsive utility tabs keep objects, order, Go To, events, and Journal tools reachable."
);

assertIncludesAll(
  terminalClient,
  [
    "formatCompactFinancial(session?.startingBalance ?? 0)",
    "formatCompactFinancial(currentBalance)",
    "formatCompactFinancial(realizedPnl)",
    "label=\"Start\"",
    "label=\"Equity\"",
    "label=\"Realized\"",
    "label=\"Unreal\"",
    "truncate tabular-nums",
    "whitespace-nowrap"
  ],
  "Dense bottom-bar labels and values use compact formatting and no-wrap/truncation guards."
);

assertIncludesAll(
  terminalClient,
  [
    "title={tool.label}",
    "aria-label={tool.label}",
    "focus:outline-none",
    "focus:outline-none",
    "aria-label=\"Practice terminal panel tabs\"",
    "Close pinned practice event details"
  ],
  "Responsive polish keeps accessible icon controls and visible focus/interactive event affordances."
);

assertIncludesAll(
  terminalClient,
  [
    "requestCourseHubApi<PracticeSessionDetailResponse>",
    "requestCourseHubApi<RevealedPracticeCandlesResponse>",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/candles",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/drawings",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/bookmarks"
  ],
  "Terminal still uses protected student practice APIs for session, candles, orders, drawings, and bookmarks."
);

assertIncludesAll(
  terminalClient,
  [
    "const timeScale = chart.timeScale()",
    "timeScale.timeToCoordinate(closestTime)",
    "subscribeVisibleLogicalRangeChange",
    "unsubscribeVisibleLogicalRangeChange",
    "xCoordinate === null",
    "data-practice-event-marker-lane=\"bottom\"",
    "data-practice-event-hit-target=\"24px\"",
    "data-practice-event-tooltip={activeEventGroup.groupId}"
  ],
  "Stage 18G event marker coordinate and hover/click behavior remains timeScale-based."
);

assert(
  terminalClient.includes("RoleGate allowedRole=\"student\"") &&
    practiceApiClient.includes("getFirebaseAuthClient") &&
    practiceApiClient.includes("user.getIdToken(forceRefresh)") &&
    practiceApiClient.includes("Authorization: `Bearer ${token}`"),
  "Terminal remains signed-in student scoped through existing app/API boundaries."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "practice_drawings",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice storage paths."
);

assert(
  !terminalClient.includes("getForexDemoOrderPlacementAdapter") &&
    !terminalClient.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !terminalClient.includes("getExchangeOrderAdapter") &&
    !terminalClient.includes("private Binance") &&
    !terminalClient.includes("private Bybit") &&
    !terminalClient.includes("MetaAPI access token") &&
    !terminalClient.includes("metaApiToken") &&
    !terminalClient.includes("brokerPassword") &&
    !terminalClient.includes("accountId") &&
    !terminalClient.includes("vaultRef") &&
    !terminalClient.includes("rawProviderPayload") &&
    !terminalClient.includes("paystack") &&
    !terminalClient.includes("autocopy"),
  "Stage 18H terminal polish does not add AutoCopy/provider/live execution/payment/secret surfaces."
);

assert(
  !terminalClient.includes("https://") &&
    !terminalClient.includes("http://") &&
    !terminalClient.includes("newsapi") &&
    !terminalClient.includes("economicCalendar") &&
    !terminalClient.includes("scrape") &&
    !terminalClient.includes("screenshot") &&
    !terminalClient.includes("pdf") &&
    !terminalClient.includes("upload"),
  "Responsive polish does not add external browser data calls, screenshots, PDFs, or uploads."
);

console.log("Stage 18H practice terminal responsive polish QA passed.");
