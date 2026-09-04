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
  packageJson.scripts?.["stage29d4:qa"] === "node scripts/qa-stage29d4-practice-terminal-order-popout.mjs",
  "package.json exposes npm run stage29d4:qa."
);

includesAll(terminal, [
  'data-practice-terminal-order-popout="chart-overlay"',
  'role={mobilePanelTab === "order" ? "dialog" : undefined}',
  'aria-label="Place simulated order"',
  "lg:fixed lg:left-[5.25rem] lg:top-[5.25rem]",
  "lg:w-[min(48rem,calc(100vw-29rem))]",
  "lg:border-[#1b5c84]",
  "lg:shadow-[0_0_0_2px_rgba(29,92,132,0.55),0_24px_70px_rgba(0,0,0,0.68)]",
  "Place Order",
  "Preset",
  "Close order ticket",
  'data-practice-terminal-order-popout-close="true"',
  'setMobilePanelTab("objects")'
], "Desktop Order tab uses a chart-overlay popout with header, preset affordance, close action, and opaque workstation styling.");

includesAll(terminal, [
  "Simulated only. Entries use revealed candles",
  "Practice only",
  "Submit simulated order",
  "Reveal one candle before submitting simulated orders",
  "mobileTicketVisibility()",
  "lg:hidden"
], "Order popout keeps simulated-only copy, revealed-candle guard, mobile fallback, and no hidden order execution path.");

includesAll(terminal, [
  "Buy simulated order",
  "Sell simulated order",
  "Open simulated order ticket",
  "focusTerminalTicket",
  "setOrderForm((current) => ({ ...current, direction"
], "Dedicated Order controls still open the detailed Order ticket popout.");

excludesAll(terminal, [
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
], "Order popout adds no copied branding, live execution endpoint, AutoCopy coupling, or secret-bearing provider field.");

includesAll(docs, [
  "Stage 29D.4: Practice Terminal Order Ticket Popout Polish",
  "TH-2026-08-27-STAGE29D4-PRACTICE-TERMINAL-ORDER-POPOUT-HANDOFF",
  "Order ticket opens as an opaque chart overlay",
  "no broker or exchange order"
], "Roadmap, backlog, demo QA, complaint roadmap, and prompt summary record Stage 29D.4.");

console.log("Stage 29D.4 Practice terminal order ticket popout QA passed.");
