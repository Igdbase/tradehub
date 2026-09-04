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

function assertExcludesAll(source, forbidden, message) {
  const hits = forbidden.filter((entry) => source.includes(entry));
  assert(hits.length === 0, `${message}${hits.length ? ` Hits: ${hits.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const reportClient = read("src/components/student-app/student-practice-report-client.tsx");
const journalClient = read("src/components/student-app/student-journal-client.tsx");
const workspaceInsights = read("src/components/workspace/workspace-practice-insights-section.tsx");
const workspaceAssignments = read("src/components/workspace/workspace-practice-assignments-section.tsx");
const rules = read("firestore.rules");

const launchPolishModules = [
  practiceClient,
  terminalClient,
  replayClient,
  reportClient,
  journalClient,
  workspaceInsights,
  workspaceAssignments
].join("\n");

assert(
  packageJson.scripts?.["stage18w:qa"] === "node scripts/qa-stage18w-practice-launch-polish.mjs",
  "package.json exposes npm run stage18w:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18W - Practice Launch Copy, Empty States, And Onboarding Polish",
    "practice backtesting product understandable and demo-ready",
    "Do not add new major product surfaces",
    "TH-2026-08-20-STAGE18W-PRACTICE-LAUNCH-POLISH-HANDOFF"
  ],
  "plan.md documents Stage 18W launch copy scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18W Practice Launch Copy, Empty States, And Onboarding Polish",
    "New student opens `/app/practice` and understands next action.",
    "Terminal labels make clear this is simulated only, revealed-candle-only, and no broker/exchange order is placed.",
    "Assignment/task/notification states are understandable: available, due soon, overdue but still open, closed, completed, feedback published, and resubmission requested.",
    "Workspace copy remains aggregate-safe and privacy-safe.",
    "TH-2026-08-20-STAGE18W-PRACTICE-LAUNCH-POLISH-HANDOFF"
  ],
  "manual-test-backlog.md records Stage 18W manual QA and new handoff."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE18W-PRACTICE-LAUNCH-POLISH-HANDOFF",
    "Stage 18W - Practice Launch Copy, Empty States, And Onboarding Polish",
    "npm run stage18w:qa"
  ],
  "prompt summary points future resumes at Stage 18W."
);

assertIncludesAll(
  practiceClient,
  [
    "Recommended practice flow",
    "Create a playbook",
    "Create or start a practice session",
    "Open terminal",
    "Reveal candles",
    "Place a simulated order",
    "Finish session",
    "Review report/journal",
    "No playbooks yet",
    "No sessions yet",
    "No assignments yet",
    "No analytics yet",
    "No imported/exported data yet",
    "No simulated practice orders yet. Open a terminal session",
    "Practice is separate from AutoCopy and never places a broker or exchange order"
  ],
  "/app/practice has first-run flow copy and clear empty states."
);

assertIncludesAll(
  practiceClient,
  [
    "available assignments, due soon work, overdue-open drills, closed assignments, published feedback, and resubmission requests",
    "available, due soon, overdue but still open, closed, completed, feedback published, or resubmission requested",
    "No instructor feedback has been submitted yet"
  ],
  "/app/practice task, notification, and feedback copy explains expected states."
);

assertIncludesAll(
  terminalClient,
  [
    "Simulated orders only. Entries use revealed candles and never place a broker or exchange order.",
    "No candle is revealed yet. Use Step forward to request the next server-bounded candle before drawing, reading indicators, or placing simulated orders.",
    "never place a broker or exchange order",
    "Indicators use revealed candles only.",
    "Only events available in the revealed session window appear here.",
    "Drawings and notes are text-only learning tools",
    "Closed orders are read-only outcomes."
  ],
  "Practice terminal copy clearly explains simulated, revealed-candle-only, and learning-tool boundaries."
);

assertIncludesAll(
  replayClient,
  [
    "Review the same practice-only session outside the terminal.",
    "No playbook activity yet.",
    "No annotations were saved for this completed review.",
    "No closed trades yet. The session is complete, but review stats stay at zero",
    "Reflection stays in the practice journal summary and is separate from AutoCopy."
  ],
  "Old replay route empty/review states explain playbooks, annotations, closed trades, and reflection."
);

assertIncludesAll(
  reportClient,
  [
    "Use the browser print dialog to save a PDF; TradeHub does not generate or store report files.",
    "No closed trades yet.",
    "No playbook activity yet.",
    "No reflection has been saved yet.",
    "No instructor feedback has been submitted yet.",
    "No main lesson has been marked yet."
  ],
  "Report copy has clear empty states and browser-print-only language."
);

assertIncludesAll(
  journalClient,
  [
    "If AutoCopy has no activity yet, this section stays at zero and remains separate from practice.",
    "Practice/backtesting performance will appear here.",
    "It updates after simulated orders are closed.",
    "No playbook activity yet.",
    "No practice ledger entries yet."
  ],
  "Journal copy clarifies no AutoCopy activity and no practice activity empty states."
);

assertIncludesAll(
  workspaceInsights,
  [
    "Aggregate simulated-practice activity only.",
    "without seeing private journal entries, raw trade history, hidden candles, or execution internals",
    "No student practice data matches these filters yet.",
    "Recent rows use masked student and session references only."
  ],
  "Workspace insights copy remains aggregate-safe and useful in empty states."
);

assertIncludesAll(
  workspaceAssignments,
  [
    "Create simulated practice tasks, schedule availability, and review aggregate progress.",
    "available, due soon, overdue but still open, closed, draft, and archived drill states",
    "No completed assignment sessions are ready for feedback yet.",
    "students see feedback only after it is published"
  ],
  "Workspace assignments copy explains scheduling and review states without exposing private internals."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "practice_drawings",
    "practice_assignments",
    "practice_cohorts",
    "practice_notification_state",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for protected practice paths."
);

assertExcludesAll(
  launchPolishModules,
  [
    "getForexDemoOrderPlacementAdapter",
    "getForexLiveCanaryOrderPlacementAdapter",
    "getExchangeOrderAdapter",
    "loadForexMetaApiToken",
    "metaapi-adapter",
    "binance-adapter",
    "bybit-adapter",
    "submitOrder(",
    "placeOrder(",
    "MetaAPI access token",
    "metaApiToken",
    "brokerPassword",
    "vaultRef",
    "rawProviderPayload",
    "providerPayload",
    "accountId:",
    "paystack",
    "Notification.requestPermission",
    "sendEmail",
    "sendSms",
    "twilio",
    "whatsapp",
    "pushSubscription",
    "uploadBytes(",
    "html2canvas",
    "jsPDF",
    "pdfkit",
    "puppeteer"
  ],
  "Stage 18W copy polish does not add forbidden execution/provider/secret/payment/messaging/upload/PDF surfaces."
);

assert(
  !terminalClient.includes("fetch(\"http") &&
    !terminalClient.includes("fetch('http") &&
    !practiceClient.includes("fetch(\"http") &&
    !practiceClient.includes("fetch('http"),
  "Stage 18W browser copy polish does not add external provider fetches."
);

console.log("Stage 18W practice launch copy, empty states, and onboarding polish QA passed.");
