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
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const terminalPage = read("src/app/(student)/app/practice/[sessionId]/terminal/page.tsx");
const oldReplayPage = read("src/app/(student)/app/practice/[sessionId]/page.tsx");
const rules = read("firestore.rules");

const terminalModules = [
  terminalClient,
  terminalPage,
  practiceClient,
  practiceTypes,
  practiceRepo
].join("\n");

assert(
  packageJson.scripts?.["stage18a:qa"] === "node scripts/qa-stage18a-practice-terminal-shell.mjs",
  "package.json exposes npm run stage18a:qa."
);

assertIncludesAll(
  plan,
  [
    "Practice Terminal Roadmap - FXReplay-Inspired, TradeHub-Native",
    "Stage 18A - Practice Terminal Shell",
    "Do not add live broker/exchange execution",
    "Keep forward-bias lock"
  ],
  "plan.md documents the Stage 18A TradeHub-native practice terminal boundary."
);

assertIncludesAll(
  terminalPage,
  [
    "StudentPracticeTerminalClient",
    "Practice Terminal",
    "server-bounded candle replay",
    "sessionId"
  ],
  "Terminal route exists at /app/practice/[sessionId]/terminal."
);

assertIncludesAll(
  oldReplayPage,
  [
    "StudentPracticeReplayClient",
    "Practice Replay",
    "sessionId"
  ],
  "Existing /app/practice/[sessionId] replay route still exists."
);

assertIncludesAll(
  terminalClient,
  [
    "Practice Terminal",
    "Back to practice",
    "OHLC",
    "Go To",
    "Indicators",
    "Journal/Review",
    "Layout",
    "Select",
    "Horizontal price line",
    "Vertical time marker",
    "Zone",
    "Text note",
    "Measurement placeholder",
    "Delete selected",
    "TerminalChart",
    "Current",
    "Buy",
    "Sell",
    "Qty / Risk",
    "Start",
    "Equity",
    "Realized",
    "Unreal",
    "Play",
    "Step",
    "Simulated order ticket",
    "Practice orders",
    "Analytics",
    "Drawings / Notes",
    "Review shortcuts"
  ],
  "Terminal client renders top toolbar, left toolbar, large chart, bottom status bar, and right drawer."
);

assertIncludesAll(
  terminalClient,
  [
    "terminalTools",
    "ToolGlyph",
    "aria-label={tool.label}",
    "title={tool.label}",
    "h-9 w-9 shrink-0 rounded-[8px] px-0",
    "CompactTerminalStat",
    "truncate text-[10px] font-semibold uppercase",
    "grid grid-cols-2 gap-2 sm:grid-cols-4",
    "lg:h-screen lg:overflow-hidden",
    "absolute inset-0 w-full",
    "flex min-h-0 flex-col",
    "grid min-h-0 flex-1 gap-4 overflow-y-auto p-3"
  ],
  "Terminal polish keeps icon-like tool controls, non-cramped stat labels, a resizing chart, and a usable scrolling drawer."
);

assert(
  !terminalClient.includes(">Select</Button>") &&
    !terminalClient.includes(">Line</Button>") &&
    !terminalClient.includes(">Zone</Button>") &&
    !terminalClient.includes(">Measure</Button>") &&
    !terminalClient.includes(">Delete</Button>") &&
    !terminalClient.includes("Quantity / risk") &&
    !terminalClient.includes("Starting") &&
    !terminalClient.includes("Unrealized"),
  "Terminal polish avoids wrapping text-tool buttons and cramped long bottom stat labels."
);

assertIncludesAll(
  terminalClient,
  [
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/candles",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders",
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders/evaluate",
    "revealed?.candles ?? []",
    "Completed sessions are locked for mutations and remain review-only."
  ],
  "Terminal uses protected practice session/candle/order APIs and renders only revealed candles."
);

assertIncludesAll(
  `${practiceTypes}\n${practiceRepo}\n${practiceClient}`,
  [
    "sessionName?: string",
    "sessionName",
    "Open terminal after create",
    "Random start",
    "/terminal"
  ],
  "Practice overview supports named sessions, random-start option, and open-terminal-after-create flow."
);

assertIncludesAll(
  practiceRepo,
  [
    "assertPracticeSessionMutable(session)",
    "Completed or abandoned practice sessions cannot be changed.",
    "Completed or abandoned practice sessions cannot be advanced.",
    "session.status === \"completed\" || session.status === \"abandoned\""
  ],
  "Completed sessions remain locked according to Stage 17G server behavior."
);

assertIncludesAll(
  rules,
  [
    "historical_candle_cache",
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "playbooks",
    "allow read, write: if false;"
  ],
  "Firestore browser rules remain deny-by-default for practice storage paths."
);

assert(
  !terminalModules.includes("getForexDemoOrderPlacementAdapter") &&
    !terminalModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !terminalModules.includes("getExchangeOrderAdapter") &&
    !terminalModules.includes("submitOrder(") &&
    !terminalModules.includes("private Binance") &&
    !terminalModules.includes("private Bybit") &&
    !terminalModules.includes("crypto-live-production") &&
    !terminalModules.includes("crypto-live-sandbox") &&
    !terminalModules.includes("forex-demo-execution") &&
    !terminalModules.includes("forex-live-canary-execution"),
  "Stage 18A terminal modules do not import or call AutoCopy/live/private execution adapters."
);

assert(
  !terminalModules.includes("apiSecret") &&
    !terminalModules.includes("brokerPassword") &&
    !terminalModules.includes("metaApiToken") &&
    !terminalModules.includes("credentialRefPath") &&
    !terminalModules.includes("rawProviderPayload") &&
    !terminalModules.includes("vaultRef") &&
    !terminalModules.includes("accountId"),
  "Stage 18A terminal modules do not expose MetaAPI credentials, account IDs, vault refs, secrets, or raw provider payloads."
);

assert(
  !`${terminalClient}\n${terminalPage}\n${practiceClient}`.includes("screenshot") &&
    !`${terminalClient}\n${terminalPage}\n${practiceClient}`.includes("pdf") &&
    !`${terminalClient}\n${terminalPage}\n${practiceClient}`.includes("WhatsApp") &&
    !`${terminalClient}\n${terminalPage}\n${practiceClient}`.includes("SMS") &&
    !`${terminalClient}\n${terminalPage}\n${practiceClient}`.includes("email service") &&
    !`${terminalClient}\n${terminalPage}\n${practiceClient}`.includes("paid storage"),
  "Stage 18A terminal does not add screenshots, PDFs, paid storage, messaging, or paid-service integrations."
);

console.log("Stage 18A practice terminal shell QA passed.");
