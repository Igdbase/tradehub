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

const packageJson = JSON.parse(read("package.json"));
const terminal = read("src/components/student-app/student-practice-terminal-client.tsx");
const terminalPage = read("src/app/(student)/app/practice/[sessionId]/terminal/page.tsx");
const studentBrowser = read("tests/browser/student-e2e.spec.mjs");
const forexContract = read("src/lib/practice/forex-cfd-history-provider-contract.ts");
const cryptoCatalogue = `${read("src/lib/practice/binance-public-spot-catalogue.ts")}\n${read("src/lib/practice/practice-crypto-spot-allowlist.ts")}`;
const docs = [
  read("complaint-resolution-roadmap.md"),
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d:qa"] === "node scripts/qa-stage29d-practice-terminal-visual-polish.mjs",
  "package.json exposes npm run stage29d:qa."
);

assertIncludesAll(
  `${terminalPage}\n${terminal}`,
  [
    "practice-terminal-chart-first-shell",
    "fixed inset-0 z-[100]",
    "practice-terminal-top-toolbar",
    "practice-terminal-workspace",
    "practice-terminal-chart-surface",
    "practice-terminal-left-tool-rail",
    "practice-terminal-right-panel",
    "practice-terminal-floating-replay-controls",
    "practice-terminal-bottom-status-bar"
  ],
  "Terminal route renders the chart-first shell, compact toolbar, tool rail, utility panel, floating replay controls, and status bar."
);

assertIncludesAll(
  terminal,
  [
    'fullLabel: "Object tree"',
    'fullLabel: "Order"',
    'fullLabel: "Go To"',
    'fullLabel: "News and events"',
    'fullLabel: "Journal"',
    "practice-terminal-object-tree",
    "practice-terminal-order-ticket",
    "practice-terminal-go-to-panel",
    "practice-terminal-news-panel",
    "practice-terminal-journal-panel",
    "bg-black"
  ],
  "Opaque right utility panel exposes Object tree, Order, Go To, revealed events, and Journal tabs."
);

assertIncludesAll(
  terminal,
  [
    "Crosshair", "Lines and trend tools", "RectangleHorizontal", "Type", "Trash2",
    "StepBack", "Play", "Pause", "StepForward", "Maximize2",
    "Calculated order quantity", "Buy simulated order", "Sell simulated order", "Simulated orders only",
    "never place a broker or exchange order"
  ],
  "Supported drawing, replay, fullscreen, quantity, Buy/Sell, and simulated-only controls remain visible."
);

assertIncludesAll(
  terminal,
  [
    "chart.convertToPixel",
    'subscribeAction("onVisibleRangeChange"',
    'unsubscribeAction("onVisibleRangeChange"',
    'data-practice-event-marker-lane="bottom"',
    "data-practice-event-hit-target",
    "onPointerEnter",
    "onClick"
  ],
  "Stage 18G timeScale marker positioning and hover/click interactions remain intact."
);

assertIncludesAll(
  terminal,
  [
    "submitTerminalOrder", "updateTerminalOrderLevels", "partiallyCloseTerminalOrder",
    "cancelTerminalOrder", "manuallyCloseTerminalOrder", "createTerminalDrawingFromChartPoint",
    "createTerminalBookmark", "isSessionLocked"
  ],
  "Existing simulated order, partial close, drawing, bookmark, and completed-session behaviors remain wired."
);

assertIncludesAll(
  studentBrowser,
  [
    "practice-terminal-chart-first-shell",
    "practice-terminal-top-toolbar",
    "practice-terminal-left-tool-rail",
    "practice-terminal-floating-replay-controls",
    "practice-terminal-bottom-status-bar",
    "practice-terminal-right-panel-tabs",
    "practice-terminal-object-tree",
    "practice-terminal-go-to-panel",
    "practice-terminal-news-panel",
    "practice-terminal-journal-panel"
  ],
  "Student Playwright coverage checks the modern terminal shell and utility tabs."
);

const forexSymbols = forexContract.match(/FOREX_CFD_HISTORY_SUPPORTED_SYMBOLS = \[([\s\S]*?)\n\] as const/)?.[1] ?? "";
assert((forexSymbols.match(/"[A-Z0-9]+"/g) ?? []).length >= 50, "Stage 29C.3 broad Forex/CFD catalogue remains present.");
assertIncludesAll(cryptoCatalogue, ["LINKUSDT", "BTCUSDT", "ETHUSDT"], "Stage 29C.2 approved Crypto catalogue remains present.");

assertExcludesAll(
  terminal,
  [
    "FX Replay", "fxreplay", "executeAutoCopy(", "submitLiveOrder(",
    "/api/v3/order", "/v5/order/create", "brokerPassword", "metaApiToken",
    "vaultRef", "rawProviderPayload", "accountId"
  ],
  "TradeHub terminal adds no copied branding, live execution, provider calls, or secret-bearing fields."
);

assertIncludesAll(
  docs,
  [
    "Stage 29D: Practice Terminal Visual Polish And FX Replay Inspired Layout",
    "TH-2026-08-26-STAGE29D-PRACTICE-TERMINAL-VISUAL-POLISH-HANDOFF",
    "Stage 29D.17",
    "owner-accepted, closed, and frozen"
  ],
  "Roadmap, QA backlog, demo runbook, and handoff record the Stage 29D owner-accepted closure."
);

console.log("Stage 29D Practice terminal visual polish QA passed.");
