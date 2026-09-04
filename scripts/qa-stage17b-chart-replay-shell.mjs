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

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return listFiles(fullPath);
    }

    return [fullPath];
  });
}

const packageJson = JSON.parse(read("package.json"));
const packageLock = read("package-lock.json");
const practiceTypes = read("src/types/practice.ts");
const historicalService = read("src/lib/practice/historical-data-service.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const replayPage = read("src/app/(student)/app/practice/[sessionId]/page.tsx");
const sessionRoute = read("src/app/api/student/practice/sessions/[sessionId]/route.ts");
const revealedCandlesRoute = read("src/app/api/student/practice/sessions/[sessionId]/candles/route.ts");
const rules = read("firestore.rules");
const practiceModules = [
  historicalService,
  practiceRepo,
  replayClient,
  practiceClient,
  replayPage,
  sessionRoute,
  revealedCandlesRoute
].join("\n");

assert(
  packageJson.scripts?.["stage17b:qa"] === "node scripts/qa-stage17b-chart-replay-shell.mjs",
  "package.json exposes npm run stage17b:qa."
);
assert(
  packageJson.dependencies?.["lightweight-charts"] && packageLock.includes("\"lightweight-charts\""),
  "Official lightweight-charts dependency is installed for the practice replay shell."
);

assertIncludesAll(
  replayPage,
  ["StudentPracticeReplayClient", "params", "sessionId", "/app/practice"],
  "Chart replay route page exists at /app/practice/[sessionId]."
);
assertIncludesAll(
  replayClient,
  [
    "from \"lightweight-charts\"",
    "createChart",
    "CandlestickSeries",
    "setData(chartData)",
    "fitContent",
    "ReplayCandlestickChart"
  ],
  "Lightweight Charts is used by the student practice replay UI."
);

const sourceFiles = listFiles(path.join(rootDir, "src"))
  .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
  .map((file) => [path.relative(rootDir, file), fs.readFileSync(file, "utf8")]);
const chartImportFiles = sourceFiles
  .filter(([, source]) => source.includes("lightweight-charts"))
  .map(([file]) => file);
assert(
  chartImportFiles.length === 1 && chartImportFiles[0] === "src/components/student-app/student-practice-replay-client.tsx",
  "Lightweight Charts is imported only by the practice replay client."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeSessionDetailResponse",
    "RevealedPracticeCandlesResponse",
    "PracticeReplayIndexMutationResponse",
    "availableCandleCount",
    "revealedCandleCount",
    "currentCandleIndex"
  ],
  "Replay detail, revealed candle, and index mutation response types exist."
);
assertIncludesAll(
  practiceRepo,
  [
    "fetchStudentRevealedPracticeCandles",
    "updateStudentPracticeReplayIndex",
    "getPracticeSessionSnapshot",
    "slice(0, 180)",
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/practice_sessions/${safeSessionId}",
    "result.candles.slice(0, currentCandleIndex + 1)",
    "unrevealed future candles are not returned",
    "session.status === \"completed\" || session.status === \"abandoned\"",
    "targetIndex > availableCandleCount - 1",
    "practice_replay_index_out_of_bounds",
    "currentCandleIndex: targetIndex"
  ],
  "Server-side replay helpers reveal only bounded candles and persist a bounded owned replay index."
);
assert(
  !practiceRepo.includes("slice(0, 100)"),
  "Practice deterministic session IDs are not truncated below their generated document length."
);
assert(
  !replayClient.includes("/api/student/practice/candles") &&
    replayClient.includes("RevealedPracticeCandlesResponse"),
  "Replay display path does not return or request the full Stage 17A candle series."
);

assertIncludesAll(
  sessionRoute,
  ["requireStudent", "getStudentPracticeSessionDetail", "updateStudentPracticeReplayIndex", "export async function GET", "export async function PATCH"],
  "Session detail and replay index routes require signed-in student auth."
);
assertIncludesAll(
  revealedCandlesRoute,
  ["requireStudent", "fetchStudentRevealedPracticeCandles", "searchParams.get(\"index\")", "apiJson", "apiError"],
  "Revealed candle route is protected and index-aware."
);

assertIncludesAll(
  replayClient,
  [
    "Play",
    "Pause",
    "Step forward",
    "Step back",
    "Jump to start",
    "Speed",
    "canAutoAdvance",
    "if (isSaving)",
    "disabled={!canStepForward}",
    "disabled={!canStepBack}"
  ],
  "Replay controls exist, disable manual stepping against unavailable candle states, and keep autoplay alive while index saves complete."
);
assertIncludesAll(
  replayClient,
  [
    "Submit simulated order",
    "Market",
    "Limit",
    "Stop",
    "Stop loss",
    "Take profit",
    "Practice orders"
  ],
  "Replay shell contains Stage 17C simulated order controls while keeping them practice-scoped."
);
assertIncludesAll(
  practiceClient,
  ["Open replay", "/app/practice/${encodeURIComponent(session.sessionId)}", "overview page does not render chart replay"],
  "Practice overview opens existing sessions without rendering the chart there."
);

assert(
  !practiceModules.includes("getForexDemoOrderPlacementAdapter") &&
    !practiceModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !practiceModules.includes("getExchangeOrderAdapter") &&
    !practiceModules.includes("submitOrder(") &&
    !practiceModules.includes("crypto-live-production") &&
    !practiceModules.includes("crypto-live-sandbox") &&
    !practiceModules.includes("forex-demo-execution") &&
    !practiceModules.includes("forex-live-canary-execution"),
  "Practice replay modules do not import or call live/demo AutoCopy execution adapters."
);
assert(
  !practiceModules.includes("apiSecret") &&
    !practiceModules.includes("brokerPassword") &&
    !practiceModules.includes("metaApiToken") &&
    !practiceModules.includes("credentialRefPath") &&
    !practiceModules.includes("rawProviderPayload"),
  "Practice replay modules do not expose secrets, vault refs, or raw provider payloads."
);

assertIncludesAll(
  rules,
  [
    "historical_candle_cache",
    "practice_sessions",
    "practice_orders",
    "playbooks",
    "allow read, write: if false;"
  ],
  "Firestore practice/cache paths remain client-denied."
);
assertIncludesAll(
  historicalService,
  [
    "normalizeBinanceKline",
    "validateCandleShape",
    "buildHistoricalCandleCacheKey",
    "MAX_CANDLES_PER_REQUEST",
    "historical_candle_cache"
  ],
  "Stage 17A candle normalization/cache boundaries remain intact."
);

console.log("Stage 17B chart replay shell QA passed.");
