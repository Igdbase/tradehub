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
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d3:qa"] === "node scripts/qa-stage29d3-practice-terminal-trading-dock-density.mjs",
  "package.json exposes npm run stage29d3:qa."
);

includesAll(terminal, [
  'data-practice-terminal-trade-dock="round-buy-sell-quantity"',
  'data-practice-terminal-chart-density="dense-fx-style"',
  "Buy simulated order",
  "Sell simulated order",
  "Open simulated order ticket",
  "Rocket",
  "rounded-full bg-[#25b6a7]",
  "rounded-full bg-[#f05252]",
  "h-14 w-14",
  "sm:h-16 sm:w-16",
  "Calculated order quantity",
  "Account Balance",
  "Realized PnL",
  "Unrealized PnL"
], "Bottom trading dock uses round Buy/Sell controls, a wide quantity field, quick ticket action, and inline account metrics.");

includesAll(terminal, [
  "BottomDockMetric",
  "grid h-14 min-w-[13rem]",
  "max-w-[28rem]",
  "text-xl font-semibold",
  "lg:grid-cols-[minmax(30rem,auto)_minmax(18rem,1fr)_auto]"
], "Trading dock is sized like a terminal control strip instead of dashboard stat cards.");

includesAll(terminal, [
  "barSpacing: 4.2",
  "minBarSpacing: 1",
  "rightOffset: 8",
  "chartWidth < 640 ? 68 : chartWidth < 1100 ? 98 : 136",
  "setVisibleLogicalRange({ from, to })",
  "practice-terminal-zoom-out"
], "Chart defaults keep more candles visible and zoom now uses a bounded drag rectangle with zoom out.");

includesAll(terminal, [
  "grid-rows-[4rem_minmax(0,1fr)",
  "lg:grid-cols-[4rem_minmax(0,1fr)",
  "h-[3.25rem] w-[3.25rem]",
  "h-6 w-6",
  "strokeWidth={1.65}"
], "Tool rail uses larger, more mature controls on desktop and narrow screens.");

excludesAll(terminal, [
  "CompactTerminalStat",
  "FX Replay",
  "fxreplay",
  "/api/v3/order",
  "/v5/order/create",
  "executeAutoCopy(",
  "submitLiveOrder(",
  "brokerPassword",
  "metaApiToken",
  "vaultRef",
  "rawProviderPayload"
], "Terminal polish adds no copied branding, live execution, AutoCopy coupling, or secret-bearing provider fields.");

includesAll(docs, [
  "Stage 29D.3: Practice Terminal Trading Dock And Chart Density Polish",
  "TH-2026-08-27-STAGE29D3-PRACTICE-TERMINAL-TRADING-DOCK-DENSITY-HANDOFF",
  "round Buy and Sell",
  "denser candle"
], "Roadmap, backlog, demo QA, complaint roadmap, and prompt summary record Stage 29D.3.");

console.log("Stage 29D.3 Practice terminal trading dock and chart density QA passed.");
