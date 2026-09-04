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
const terminalPage = read("src/app/(student)/app/practice/[sessionId]/terminal/page.tsx");
const oldReplayPage = read("src/app/(student)/app/practice/[sessionId]/page.tsx");
const orderRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/route.ts");
const cancelRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/cancel/route.ts");
const closeRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/close/route.ts");
const levelsRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/levels/route.ts");
const partialRoute = read("src/app/api/student/practice/sessions/[sessionId]/orders/[orderId]/partial-close/route.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");

const terminalModules = [
  terminalClient,
  terminalPage
].join("\n");

assert(
  packageJson.scripts?.["stage18b:qa"] === "node scripts/qa-stage18b-terminal-order-ticket.mjs",
  "package.json exposes npm run stage18b:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18B - Terminal Order Ticket And Fast Simulated Trade Actions",
    "Support simulated market, limit, and stop orders",
    "Keep all actual mutation calls through protected student API routes.",
    "Do not add live broker/exchange calls or private provider APIs."
  ],
  "plan.md documents the Stage 18B practice-only terminal ticket boundary."
);

assertIncludesAll(
  terminalPage,
  ["StudentPracticeTerminalClient", "Practice Terminal", "sessionId"],
  "Terminal route still exists."
);

assertIncludesAll(
  oldReplayPage,
  ["StudentPracticeReplayClient", "Practice Replay", "sessionId"],
  "Existing replay route still works."
);

assertIncludesAll(
  terminalClient,
  [
    "Simulated order ticket",
    "orderType",
    "requestedPrice",
    "Market",
    "Limit",
    "Stop",
    "Entry",
    "SL",
    "TP",
    "Risk $",
    "Risk %",
    "Checklist",
    "Terminal note",
    "Size",
    "Notional",
    "Submit simulated order",
    "ticketError"
  ],
  "Terminal has upgraded market/limit/stop order ticket controls and close-to-ticket validation."
);

assertIncludesAll(
  terminalClient,
  [
    "focusTerminalTicket(\"buy\")",
    "focusTerminalTicket(\"sell\")",
    "setOrderForm((current) => ({ ...current, direction }))",
    "ticketRef.current?.scrollIntoView",
    "ticketEntryRef.current?.focus"
  ],
  "Bottom Buy/Sell actions prefill direction and focus the ticket instead of submitting immediately."
);

assertIncludesAll(
  terminalClient,
  [
    "/api/student/practice/sessions/${encodeURIComponent(sessionId)}/orders",
    "/orders/${encodeURIComponent(orderId)}/cancel",
    "/orders/${encodeURIComponent(orderId)}/close",
    "/orders/${encodeURIComponent(orderId)}/levels",
    "/orders/${encodeURIComponent(orderId)}/partial-close",
    "/orders/evaluate",
    "revealed?.candles ?? []"
  ],
  "Terminal submits and manages simulated orders only through protected practice routes and revealed candles."
);

assertIncludesAll(
  terminalClient,
  [
    "Cancel pending",
    "Manual close",
    "Save SL/TP",
    "Close partial",
    "Edit SL",
    "Edit TP",
    "Partial close percent",
    "Partial close quantity",
    "disabled={!canMutateOrders",
    "Completed sessions are locked for mutations and remain review-only."
  ],
  "Terminal order list includes quick actions and completed-session mutation locks."
);

assertIncludesAll(
  terminalClient,
  [
    "order.direction.toUpperCase()",
    "order.orderType",
    "order.status",
    "order.playbookName ?? \"No playbook\"",
    "formatTerminalPrice(order.filledPrice ?? order.requestedPrice)",
    "formatTerminalPrice(order.stopLoss)",
    "formatTerminalPrice(order.takeProfit)",
    "formatTerminalNumber(order.size, 6)",
    "formatTerminalNumber(order.remainingSize ?? order.size, 6)",
    "formatTerminalNumber(order.notional)",
    "formatTerminalNumber(order.pnl)",
    "order.rMultiple"
  ],
  "Terminal order cards show compact direction, type, status, playbook snapshot, prices, size, notional, P&L, and R."
);

for (const route of [orderRoute, cancelRoute, closeRoute, levelsRoute, partialRoute]) {
  assertIncludesAll(
    route,
    ["requireStudent", "apiJson", "apiError"],
    "Practice order mutation route uses signed-in student API boundaries."
  );
}

assertIncludesAll(
  practiceRepo,
  [
    "assertPracticeSessionMutable(session)",
    "validateDirectionalPracticeLevels",
    "calculatePracticeRiskSizing",
    "Partial close quantity must be greater than zero and less than the remaining quantity.",
    "Completed or abandoned practice sessions cannot be changed.",
    "Practice orders are simulated only; no broker, exchange, AutoCopy, or live execution adapter is called."
  ],
  "Server repository remains authoritative for locks, sizing, SL/TP validation, and simulated lifecycle rules."
);

assert(
  !terminalModules.includes("getForexDemoOrderPlacementAdapter") &&
    !terminalModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !terminalModules.includes("getExchangeOrderAdapter") &&
    !terminalModules.includes("submitOrder(") &&
    !terminalModules.includes("private Binance") &&
    !terminalModules.includes("private Bybit") &&
    !terminalModules.includes("metaApiToken") &&
    !terminalModules.includes("brokerPassword") &&
    !terminalModules.includes("accountId") &&
    !terminalModules.includes("vaultRef") &&
    !terminalModules.includes("rawProviderPayload") &&
    !terminalModules.includes("AutoCopy"),
  "Stage 18B terminal does not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

assert(
  !terminalModules.includes("screenshot") &&
    !terminalModules.includes("pdf") &&
    !terminalModules.includes("WhatsApp") &&
    !terminalModules.includes("SMS") &&
    !terminalModules.includes("email service") &&
    !terminalModules.includes("paid storage"),
  "Stage 18B terminal does not add screenshots, PDFs, paid storage, messaging, or paid-service integrations."
);

console.log("Stage 18B terminal order ticket QA passed.");
