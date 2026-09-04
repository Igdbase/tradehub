import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

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

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(startIndex >= 0, `Found section start ${start}.`);
  assert(endIndex > startIndex, `Found section end ${end}.`);
  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const component = read("src/components/student-app/student-klinechart-spike-client.tsx");
const page = read("src/app/(student)/app/internal/klinechart-spike/page.tsx");
const productionTerminal = read("src/components/student-app/student-practice-terminal-client.tsx");
const practiceRepository = read("src/lib/practice/practice-repository.ts");
const seed = read("scripts/seed-demo-data.mjs");
const browser = read("tests/browser/klinechart-spike.spec.mjs");
const docs = read("docs/spikes/klinechart-practice-terminal-feasibility.md");

assert(exists("node_modules/klinecharts/LICENSE"), "Installed official KLineChart package includes its Apache licence.");
assert(exists("node_modules/@klinecharts/extension/LICENSE"), "Installed official extension package includes its Apache licence.");
assert(packageJson.dependencies?.klinecharts === "10.0.3", "KLineChart is pinned to 10.0.3 as a direct dependency.");
assert(packageJson.dependencies?.["@klinecharts/extension"] === "0.1.0", "Official KLineChart extension is pinned to 0.1.0 as a direct dependency.");
assert(lock.packages?.["node_modules/klinecharts"]?.version === "10.0.3", "KLineChart lockfile resolves exactly 10.0.3.");
assert(lock.packages?.["node_modules/@klinecharts/extension"]?.version === "0.1.0", "Extension lockfile resolves exactly 0.1.0.");
assert(packageJson.dependencies?.["lightweight-charts"], "Existing lightweight-charts dependency remains installed.");

assert(packageJson.scripts?.["klinechart:spike:qa"] === "node scripts/qa-klinechart-practice-terminal-spike.mjs", "Spike source QA command is wired.");
includesAll(packageJson.scripts?.["browser:qa:klinechart-spike"] ?? "", ["playwright test", "klinechart-spike.spec.mjs"], "Chromium spike browser command is wired.");
includesAll(packageJson.scripts?.["browser:qa:klinechart-spike:webkit"] ?? "", ["TRADEHUB_BROWSER_ENGINE=webkit", "klinechart-spike.spec.mjs"], "WebKit spike browser command is wired.");

includesAll(page, ["StudentKLineChartSpikeClient", "KLineChart Practice Spike"], "Isolated internal student route renders the spike client.");
const revealedCandlesFunction = sectionBetween(
  practiceRepository,
  "export async function fetchStudentRevealedPracticeCandles",
  "export async function updateStudentPracticeReplayIndex"
);
includesAll(revealedCandlesFunction, [
  "const persistedCurrentCandleIndex = Math.max(0, Math.floor(session.currentCandleIndex))",
  "const normalizedRequestedIndex = requestedIndex === undefined",
  "Math.min(normalizedRequestedIndex, persistedCurrentCandleIndex, availableCandleCount - 1)"
], "The server clamps requested candle slices to the persisted reveal boundary and final candle index.");
excludesAll(revealedCandlesFunction, [
  "Math.min(desiredIndex, availableCandleCount - 1)",
  "requestedIndex === undefined\n    ? Math.max(0, Math.floor(session.currentCandleIndex))"
], "A query index cannot bypass the persisted Practice reveal boundary.");
includesAll(component, [
  'const SPIKE_SESSION_ID = "practice_demo_klinechart_spike"',
  'const query = requestedIndex === undefined ? "" : `?index=${requestedIndex}`',
  "/candles${query}",
  'method: "PATCH"',
  "currentCandleIndex: targetIndex",
  "await loadRevealedCandles()",
  "response.candles.map(toKLineData)",
  "setDataLoader",
  "resetData"
], "Spike loads the persisted reveal boundary and advances only through protected replay mutation followed by authoritative retrieval.");
excludesAll(component, ["WARM_UP_INDEX", "loadRevealedCandles(targetIndex)"], "The spike cannot manufacture its warm-up or post-PATCH slice with a query index.");
includesAll(component, [
  '"segment"',
  '"horizontalStraightLine"',
  '"verticalStraightLine"',
  '"fibonacciLine"',
  '"rect"',
  '"measure"',
  "registerSpikeExtensions(klinecharts.registerOverlay, extensions.rect, extensions.measure)",
  'import("klinecharts")',
  'import("@klinecharts/extension")',
  "needDefaultPointFigure: true"
], "Spike wires native and official-extension interactive overlays with selectable point handles.");
includesAll(component, [
  "trendPointFromPointer",
  "chart.convertFromPixel",
  'name: "segment"',
  "points: [point, point]",
  "chart.overrideOverlay",
  "points: [anchor, point]",
  "First anchor fixed",
  "Two-click native segment saved",
  'data-testid="klinechart-spike-trend-capture"'
], "Spike uses a thin two-click pointer controller around KLineChart's native segment rendering, selection, and handles.");
includesAll(component, [
  "chart.getOverlays({ groupId: SPIKE_GROUP_ID })",
  "JSON.stringify(serializable, null, 2)",
  "sessionStorage.setItem(STORAGE_KEY, json)",
  "parseStoredOverlays(sessionStorage.getItem(STORAGE_KEY))",
  "chart.removeOverlay({ id: selectedOverlayId })",
  "chart.removeOverlay({ groupId: SPIKE_GROUP_ID })"
], "Spike proves overlay retrieval, allowlisted JSON, tab restoration, selected deletion, and group-only clear.");
excludesAll(component, ["AutoCopy", "placeLiveOrder", "providerPayload", "vaultRef", "brokerPassword", "apiKey"], "Spike client contains no execution or provider-private integration.");
includesAll(productionTerminal, [
  'from "klinecharts"',
  'data-practice-chart-engine="klinecharts-10.0.3"'
], "The approved production migration uses KLineChart independently of the feasibility route.");
excludesAll(productionTerminal, ["StudentKLineChartSpikeClient", "practice_demo_klinechart_spike"], "The isolated spike component and seed session are not embedded in the production terminal.");

includesAll(seed, [
  'klineChartSpikeSessionId: "practice_demo_klinechart_spike"',
  "candleCount: 72",
  'currentCandleIndex: 23',
  'status: "active"'
], "Deterministic seed provides an isolated active session with 24 initially revealed of 72 bounded candles.");

includesAll(browser, [
  'label: "laptop"',
  'label: "tablet"',
  "page.mouse.click",
  "page.mouse.move",
  "page.mouse.down()",
  "page.mouse.up()",
  "overlayPointToPage",
  "convertToPixel",
  "expectPersistedCount(page, 0)",
  "expectPersistedCount(page, 1)",
  "expectPersistedCount(page, 2)",
  "new Set(twoSegments.map((overlay) => overlay.id)).size",
  "klinechart-spike-selected-id",
  "klinechart-spike-delete-selected",
  "klinechart-spike-clear-all",
  "page.reload()",
  "Restored 6 spike-only overlays",
  "25 revealed",
  "assertAuthoritativeRevealBoundary(page, studentToken, 23, 24)",
  "assertAuthoritativeRevealBoundary(page, studentToken, 24, 25)",
  "/candles?index=71",
  "expect(payload.candles).toHaveLength(expectedCount)"
], "Browser suite attacks the future index and uses real replay/drawing interactions deterministically at laptop/tablet viewports.");

includesAll(docs, [
  "10.0.3",
  "0.1.0",
  "Apache License 2.0",
  "attribution",
  "Not Proven Or Not Supported Here",
  "Migration Risks",
  "Estimated Production Change Surface",
  "8-12 production/test modules",
  "owner-defined interaction",
  "stock `segment` interaction cannot",
  "minimum of the normalized request, persisted `currentCandleIndex`, and final candle index",
  "authenticated direct request for `?index=71`",
  "does not constitute owner acceptance"
], "Feasibility memo records exact versions, licence duties, scope limits, risks, change estimate, and owner-behavior conclusion.");

console.log("KLineChart Practice Terminal feasibility spike source guard passed.");
