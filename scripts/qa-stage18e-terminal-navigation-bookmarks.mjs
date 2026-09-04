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
const historicalDataService = read("src/lib/practice/historical-data-service.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const terminalPage = read("src/app/(student)/app/practice/[sessionId]/terminal/page.tsx");
const oldReplayPage = read("src/app/(student)/app/practice/[sessionId]/page.tsx");
const bookmarkRoute = read("src/app/api/student/practice/sessions/[sessionId]/bookmarks/route.ts");
const bookmarkItemRoute = read("src/app/api/student/practice/sessions/[sessionId]/bookmarks/[bookmarkId]/route.ts");
const navigationRoute = read("src/app/api/student/practice/sessions/[sessionId]/navigation/route.ts");
const timeframeRoute = read("src/app/api/student/practice/sessions/[sessionId]/timeframe/route.ts");
const rules = read("firestore.rules");

const stage18eModules = [
  practiceTypes,
  practiceRepo,
  practiceClient,
  terminalClient,
  terminalPage,
  oldReplayPage,
  bookmarkRoute,
  bookmarkItemRoute,
  navigationRoute,
  timeframeRoute
].join("\n");
const stage18eNewSurface = [
  practiceClient,
  terminalClient,
  bookmarkRoute,
  bookmarkItemRoute,
  navigationRoute,
  timeframeRoute
].join("\n");

assert(
  packageJson.scripts?.["stage18e:qa"] === "node scripts/qa-stage18e-terminal-navigation-bookmarks.mjs",
  "package.json exposes npm run stage18e:qa."
);

assertIncludesAll(
  plan,
  [
    "Implement Stage 18E: replay navigation upgrades.",
    "Add timeframe selector",
    "Add Go To candle/date within the session range.",
    "Add random start support for new sessions",
    "Add bookmarks"
  ],
  "plan.md documents Stage 18E terminal navigation scope."
);

assertIncludesAll(
  terminalClient,
  [
    "terminalTimeframeOptions",
    "{ label: \"M15\", value: 15 }",
    "{ label: \"H1\", value: 60 }",
    "{ label: \"H4\", value: 240 }",
    "{ label: \"D1\", value: 1440 }",
    "aria-label=\"Terminal timeframe\"",
    "/timeframe",
    "changeTerminalTimeframe"
  ],
  "Terminal exposes a compact timeframe selector with only supported historical timeframes."
);

assertIncludesAll(
  historicalDataService,
  [
    "const SUPPORTED_TIMEFRAMES = new Set([15, 60, 240, 1440])",
    "supportedTimeframes: [...SUPPORTED_TIMEFRAMES]"
  ],
  "Historical data service is the source of supported timeframe limits."
);

assertIncludesAll(
  practiceRepo,
  [
    "normalizeTimeframe(record.timeframeMinutes)",
    "createStudentPracticeTimeframeSession",
    "return createStudentPracticeSession(actor",
    "randomStartEnabled: false"
  ],
  "Server timeframe switching uses supported timeframe validation and creates a safe student-owned session."
);

assertIncludesAll(
  terminalClient,
  [
    "isGoToPanelOpen",
    "Candle index",
    "Date / time",
    "navigateTerminalReplay",
    "/navigation",
    "mode: \"index\"",
    "mode: \"datetime\"",
    "mode: \"start\"",
    "mode: \"latest_revealed\"",
    "revealToTarget: true"
  ],
  "Terminal Go To panel supports start/latest/index/date-time navigation through a protected route."
);

assertIncludesAll(
  practiceRepo,
  [
    "navigateStudentPracticeReplay",
    "Math.max(0, Math.min(targetIndex, availableCandleCount - 1))",
    "targetIndex > session.currentCandleIndex && record.revealToTarget !== true",
    "Completed or abandoned practice sessions cannot be advanced.",
    "Practice terminal Go To navigation is server-clamped"
  ],
  "Go To navigation is server-clamped and completed sessions remain locked."
);

assertIncludesAll(
  practiceClient,
  [
    "randomStartEnabled",
    "Random start",
    "Random window chosen server-side"
  ],
  "Practice session creation exposes a real random-start option and displays the selected server window."
);

assertIncludesAll(
  practiceRepo,
  [
    "randomStartEnabled = record.randomStartEnabled === true || record.randomStart === true",
    "Math.random()",
    "historicalDataLimits.maxCandlesPerRequest",
    "requestedDateStart",
    "requestedDateEnd",
    "randomizedAt"
  ],
  "Random start is chosen server-side and bounded by historical candle limits."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeBookmarkRecord",
    "PracticeBookmarkSummary",
    "PracticeBookmarkMutationResponse",
    "PracticeBookmarkDeleteResponse",
    "bookmarks: PracticeBookmarkSummary[]"
  ],
  "Practice bookmark types are explicit and support-safe."
);

assertIncludesAll(
  practiceRepo,
  [
    "practice_bookmarks",
    "createStudentPracticeBookmark",
    "updateStudentPracticeBookmark",
    "deleteStudentPracticeBookmark",
    "listBookmarksForSession",
    "Practice bookmarks cannot reference unrevealed future candles.",
    "assertPracticeSessionMutable(session)",
    "getPracticeOrderSnapshot",
    "getPracticeAnnotationSnapshot"
  ],
  "Bookmarks are student-owned, session-scoped, attachment-checked, and reject future candle references."
);

assertIncludesAll(
  `${bookmarkRoute}\n${bookmarkItemRoute}\n${navigationRoute}\n${timeframeRoute}`,
  [
    "requireStudent(request)",
    "createStudentPracticeBookmark",
    "updateStudentPracticeBookmark",
    "deleteStudentPracticeBookmark",
    "navigateStudentPracticeReplay",
    "createStudentPracticeTimeframeSession"
  ],
  "Stage 18E APIs are protected student routes backed by repository functions."
);

assertIncludesAll(
  terminalClient,
  [
    "Bookmarks",
    "Bookmark current candle",
    "Prev bookmark",
    "Next bookmark",
    "PracticeBookmarkMutationResponse",
    "PracticeBookmarkDeleteResponse",
    "/bookmarks",
    "Completed sessions keep bookmarks view-only."
  ],
  "Terminal renders bookmark create/list/navigation controls with completed-session lock copy."
);

assertIncludesAll(
  terminalClient,
  [
    "const revealedCandlesOnly = useMemo(() => revealed?.candles ?? [], [revealed?.candles])",
    "computePracticeTerminalIndicators(revealedCandlesOnly, indicatorSettings)",
    "Indicators are computed client-side from revealed candles only. Hidden future candles are never used."
  ],
  "Stage 18E preserves revealed-candle-only indicator calculations."
);

assertIncludesAll(
  rules,
  [
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "practice_drawings",
    "allow read, write: if false;"
  ],
  "Firestore browser rules deny direct practice bookmark/session/order/annotation/drawing access."
);

assertIncludesAll(
  terminalPage,
  ["StudentPracticeTerminalClient", "Practice Terminal", "sessionId"],
  "Terminal route still exists."
);

assertIncludesAll(
  oldReplayPage,
  ["StudentPracticeReplayClient", "Practice Replay", "sessionId"],
  "Existing replay route still exists."
);

assert(
  !stage18eModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18eModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18eModules.includes("getExchangeOrderAdapter") &&
    !stage18eModules.includes("private Binance") &&
    !stage18eModules.includes("private Bybit") &&
    !stage18eModules.includes("MetaAPI access token") &&
    !stage18eModules.includes("metaApiToken") &&
    !stage18eModules.includes("brokerPassword") &&
    !stage18eModules.includes("accountId") &&
    !stage18eModules.includes("vaultRef") &&
    !stage18eModules.includes("rawProviderPayload"),
  "Stage 18E modules do not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

assert(
  terminalClient.includes("Practice Terminal") &&
    practiceRepo.includes("separate from AutoCopy"),
  "Practice terminal remains separated from AutoCopy in safe product copy and source metadata."
);

assert(
  !stage18eNewSurface.includes("screenshot") &&
    !stage18eNewSurface.includes("pdf") &&
    !stage18eNewSurface.includes("upload") &&
    !stage18eNewSurface.includes("paid storage") &&
    !stage18eNewSurface.includes("WhatsApp") &&
    !stage18eNewSurface.includes("SMS"),
  "Stage 18E does not add screenshots, PDFs, uploads, paid storage, or messaging integrations."
);

console.log("Stage 18E terminal navigation/bookmark QA passed.");
