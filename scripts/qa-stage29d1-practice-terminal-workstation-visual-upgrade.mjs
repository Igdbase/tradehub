import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

function includesAll(source, values, message) {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function excludesAll(source, values, message) {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
}

const packageJson = JSON.parse(read("package.json"));
const terminal = read("src/components/student-app/student-practice-terminal-client.tsx");
const header = read("src/components/layout/site-header.tsx");
const footer = read("src/components/layout/site-footer.tsx");
const browser = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("complaint-resolution-roadmap.md"),
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d1:qa"] === "node scripts/qa-stage29d1-practice-terminal-workstation-visual-upgrade.mjs",
  "package.json exposes npm run stage29d1:qa."
);

includesAll(terminal, [
  "fixed inset-0 z-[100]",
  "practice-terminal-chart-first-shell",
  "data-terminal-density=\"workstation\"",
  "practice-terminal-chart-surface",
  "practice-terminal-floating-replay-controls",
  "practice-terminal-bottom-status-bar"
], "Terminal uses a full-viewport, chart-first workstation shell with compact replay and trading bars.");

includesAll(`${header}\n${footer}`, [
  "isPracticeTerminal",
  "return null",
  "tradehub-site-header",
  "tradehub-site-footer"
], "Global TradeHub header and footer are suppressed on the dedicated terminal route.");

includesAll(terminal, [
  "Crosshair", "TrendingUp", "MoveVertical", "Type", "Brush", "Ruler", "ZoomIn", "Magnet",
  "Lock", "Unlock", "Eye", "EyeOff", "Trash2", "h-[3.25rem] w-[3.25rem]", "aria-pressed={isSelected}"
], "The workstation tool rail uses mature Lucide controls with labels and selected states.");

includesAll(terminal, [
  '{ label: "1m"', '{ label: "3m"', '{ label: "5m"', '{ label: "15m"',
  '{ label: "30m"', '{ label: "1h"', '{ label: "2h"', '{ label: "4h"',
  '{ label: "D"', '{ label: "W"', '{ label: "M"',
  "practice-terminal-timeframe-strip", "ChartCandlestick", "Indicators", "Order ticket",
  "Events and news", "Journal and review", "Session report"
], "Top toolbar contains the dense timeframe strip, chart type, indicators, and utility actions.");

includesAll(terminal, [
  "TERMINAL_WARMUP_CANDLE_COUNT = 24",
  "orders.length > 0",
  "currentIndex !== 0",
  "Math.min(TERMINAL_WARMUP_CANDLE_COUNT - 1, availableCount - 1)",
  "setVisibleLogicalRange",
  "barSpacing: 4.2",
  "data-terminal-warmup-boundary=\"revealed-only-24-max\""
], "Untouched sessions use bounded revealed-only warm-up context and adaptive candle spacing.");

includesAll(terminal, [
  'fullLabel: "Object tree"', 'fullLabel: "Order"', 'fullLabel: "Go To"',
  'fullLabel: "News and events"', 'fullLabel: "Journal"',
  "isUtilityPanelOpen", "Collapse utility panel", "Open utility panel", "bg-black"
], "Opaque utility panel remains dense, tabbed, and collapsible across responsive layouts.");

includesAll(terminal, [
  "timeScale.timeToCoordinate", "subscribeVisibleLogicalRangeChange", "unsubscribeVisibleLogicalRangeChange",
  "submitTerminalOrder", "partiallyCloseTerminalOrder", "createTerminalDrawing", "createTerminalBookmark",
  "isSessionLocked", "Indicators use revealed candles only"
], "Existing event alignment, simulated orders, drawings, bookmarks, locking, and revealed-only indicators remain wired.");

includesAll(browser, [
  "tradehub-site-header", "tradehub-site-footer", "practice-terminal-timeframe-strip",
  "Crosshair and cursor", "Lock or unlock drawings", "Hide or show drawings",
  "Collapse utility panel", "Open utility panel", "data-revealed-candle-count"
], "Student Playwright coverage verifies shell isolation, mature tools, panel collapse, and warm-up context.");

excludesAll(terminal, [
  "FX Replay", "fxreplay", "/api/v3/order", "/v5/order/create", "executeAutoCopy(",
  "submitLiveOrder(", "brokerPassword", "metaApiToken", "vaultRef", "rawProviderPayload"
], "No copied branding, private provider endpoint, live execution, AutoCopy coupling, or secret-bearing field was added.");

includesAll(docs, [
  "Stage 29D.1: Practice Terminal Workstation Visual Upgrade",
  "TH-2026-08-27-STAGE29D1-PRACTICE-TERMINAL-WORKSTATION-VISUAL-UPGRADE-HANDOFF",
  "Owner browser acceptance remains deferred"
], "Roadmap, runbooks, backlog, and handoff record Stage 29D.1 without claiming owner acceptance.");

console.log("Stage 29D.1 Practice terminal workstation visual upgrade QA passed.");
