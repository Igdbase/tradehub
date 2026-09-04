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

function sectionBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert(start >= 0, `Found section start ${startNeedle}.`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `Found section end ${endNeedle}.`);
  return source.slice(start, end);
}

const packageJson = JSON.parse(read("package.json"));
const terminal = read("src/components/student-app/student-practice-terminal-client.tsx");
const browser = read("tests/browser/student-e2e.spec.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d5:qa"] === "node scripts/qa-stage29d5-practice-terminal-order-trigger-cleanup.mjs",
  "package.json exposes npm run stage29d5:qa."
);

includesAll(terminal, [
  "type TerminalDockMessage",
  "dockMessage",
  "submitQuickMarketOrder",
  "orderType: \"market\"",
  "direction,",
  "latestCandle",
  "buildQuickMarketOrderDraft",
  "quick default SL/TP",
  "simulated market order accepted at the latest revealed close",
  "practice-terminal-quick-order-message"
], "Bottom dock has a dedicated quick simulated market-order path with inline success/error state.");

const bottomDock = sectionBetween(
  terminal,
  'data-practice-terminal-trade-dock="round-buy-sell-quantity"',
  '<aside'
);

includesAll(bottomDock, [
  'data-testid="practice-terminal-quick-buy"',
  'data-testid="practice-terminal-quick-sell"',
  'onClick={() => void submitQuickMarketOrder("buy")}',
  'onClick={() => void submitQuickMarketOrder("sell")}',
  'data-testid="practice-terminal-open-order-ticket"',
  "onClick={() => focusTerminalTicket(orderForm.direction)}"
], "Bottom Buy/Sell submit quick orders while only the dedicated Order control opens the detailed popout.");

const buyButton = sectionBetween(bottomDock, 'aria-label="Buy simulated order"', "</button>");
const sellButton = sectionBetween(bottomDock, 'aria-label="Sell simulated order"', "</button>");

excludesAll(`${buyButton}\n${sellButton}`, [
  "focusTerminalTicket",
  "openUtilityPanel(\"order\")",
  "setMobilePanelTab(\"order\")"
], "Bottom Buy/Sell controls do not open the detailed Order popout.");

includesAll(terminal, [
  'const [mobilePanelTab, setMobilePanelTab] = useState<TerminalMobilePanelTab>("objects")',
  "closeOrderPopoutIfOpen",
  "setMobilePanelTab(\"objects\")",
  "changeTerminalTimeframe",
  "setIsIndicatorPanelOpen"
], "Terminal defaults away from the Order tab and intentionally closes/replaces the popout for unrelated controls.");

includesAll(terminal, [
  'data-practice-terminal-order-popout="chart-overlay"',
  'aria-label="Place simulated order"',
  "Market",
  "Limit",
  "Stop",
  "Checklist",
  "Terminal note",
  "Practice only",
  "Simulated orders only. Entries use revealed candles and never place a broker or exchange order."
], "Detailed Order popout still supports order type, SL/TP, strategy/checklist/notes, and simulated-only copy.");

includesAll(terminal, [
  'available: false',
  "disabled={isDisabled}",
  "Brush drawing (coming soon)",
  "Magnet snap (coming soon)"
], "Remaining nonfunctional terminal tools stay visibly disabled instead of pretending to work.");

includesAll(browser, [
  "practice-terminal-quick-buy",
  "practice-terminal-quick-sell",
  "practice-terminal-open-order-ticket",
  "Buy simulated market order accepted",
  "Sell simulated market order accepted",
  "practice-terminal-order-ticket",
  "toBeHidden()",
  'name: "Order", exact: true',
  'name: "Go To", exact: true',
  "News and events",
  'name: "Journal", exact: true',
  "Indicators"
], "Student Playwright coverage checks quick Buy/Sell, Order-tab popout, and unrelated controls.");

excludesAll(`${terminal}\n${browser}`, [
  "FX Replay",
  "fxreplay",
  "/api/v3/order",
  "/v5/order/create",
  "executeAutoCopy(",
  "submitLiveOrder(",
  "metaApiToken",
  "brokerPassword",
  "vaultRef",
  "rawProviderPayload",
  "Live order"
], "Order-trigger cleanup adds no copied branding, live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

includesAll(docs, [
  "Stage 29D.5: Practice Terminal Order Trigger Cleanup And Quick Buy/Sell Behavior",
  "TH-2026-08-28-STAGE29D5-PRACTICE-TERMINAL-ORDER-TRIGGER-CLEANUP-HANDOFF",
  "Bottom Buy/Sell now submit quick simulated market orders",
  "Only the dedicated Order control opens the detailed Place Order popout"
], "Roadmap, runbooks, backlog, complaint roadmap, and prompt summary record Stage 29D.5.");

console.log("Stage 29D.5 Practice terminal order trigger cleanup QA passed.");
