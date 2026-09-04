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
const historical = read("src/lib/practice/historical-data-service.ts");
const repository = read("src/lib/practice/practice-repository.ts");
const seed = read("scripts/seed-demo-data.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d2:qa"] === "node scripts/qa-stage29d2-practice-terminal-candle-reliability.mjs",
  "package.json exposes npm run stage29d2:qa."
);

includesAll(historical, [
  "HistoricalCandleCacheReadOptions",
  "allowExpired?: boolean",
  "HistoricalCandleFetchOptions",
  "allowExpiredCache?: boolean",
  "readHistoricalCandleCache(workspaceId, cacheId, {",
  "allowExpired: options.allowExpiredCache === true",
  "(!options.allowExpired && Date.parse(record.expiresAt) <= Date.now())",
  "record.candles.length <= 0"
], "Historical candle cache reads can safely reuse existing normalized candles for replay while rejecting empty caches.");

includesAll(repository, [
  "fetchSessionCandles",
  "fetchHistoricalCandlesWithCache(actor.workspaceId, candleRequestForSession(session), {",
  "allowExpiredCache: true"
], "Practice terminal/replay session candle reads allow expired normalized cache records.");

const sessionCreateIndex = repository.indexOf("createStudentPracticeSession");
const sessionPersistIndex = repository.indexOf("practice_sessions/${sessionId}`).set", sessionCreateIndex);
const creationFetchIndex = repository.indexOf("fetchHistoricalCandlesWithCache(actor.workspaceId", sessionCreateIndex);
const creationAllowExpiredIndex = repository.indexOf("allowExpiredCache: true", sessionCreateIndex);
assert(
  creationFetchIndex > -1 &&
    sessionPersistIndex > creationFetchIndex &&
    (creationAllowExpiredIndex === -1 || creationAllowExpiredIndex > sessionPersistIndex),
  "New practice session creation still requires a fresh protected candle fetch before persistence."
);

includesAll(historical, [
  "isLocalPracticeEmulator",
  "FIRESTORE_EMULATOR_HOST",
  "generateTradeHubStaticCryptoCandles",
  "basePriceForCryptoSymbol",
  'case "ETHUSDT"',
  "return generateTradeHubStaticCryptoCandles(input, input.providerSymbol || input.symbol)"
], "Local emulator crypto sessions have deterministic fallback candles when public Binance candles cannot be reached.");

includesAll(seed, [
  'practiceHistoricalCacheDoc({ symbol: "ETHUSDT", basePrice: 4680, tickSize: 0.01 })',
  "ethPracticeCache.cacheId",
  'practiceHistoricalCacheDoc({ symbol: "LINKUSDT", basePrice: 24, tickSize: 0.001 })'
], "Demo seed includes deterministic ETHUSDT and LINKUSDT practice candle caches.");

excludesAll(`${historical}\n${repository}`, [
  "/api/v3/order",
  "/v5/order/create",
  "executeAutoCopy(",
  "submitLiveOrder(",
  "brokerPassword",
  "metaApiToken",
  "vaultRef",
  "rawProviderPayload"
], "Candle reliability fix adds no live execution, AutoCopy coupling, or secret-bearing provider fields.");

includesAll(docs, [
  "Stage 29D.2: Practice Terminal Candle Reliability Patch",
  "TH-2026-08-27-STAGE29D2-PRACTICE-TERMINAL-CANDLE-RELIABILITY-HANDOFF",
  "ETHUSDT terminal should reveal candles in local demo testing"
], "Roadmap, runbooks, backlog, and prompt summary record the Stage 29D.2 reliability patch.");

console.log("Stage 29D.2 Practice terminal candle reliability QA passed.");
