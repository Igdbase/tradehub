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
const practiceEvents = read("src/lib/practice/practice-events.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const terminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const replayClient = read("src/components/student-app/student-practice-replay-client.tsx");
const journalLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const journalUi = read("src/components/student-app/student-journal-client.tsx");
const rules = read("firestore.rules");

const stage18gModules = [
  practiceTypes,
  practiceEvents,
  practiceRepo,
  terminalClient,
  replayClient,
  journalLedger,
  journalUi
].join("\n");
const stage18gNewSurfaces = [
  practiceEvents,
  terminalClient,
  replayClient,
  journalLedger,
  journalUi
].join("\n");

assert(
  packageJson.scripts?.["stage18g:qa"] === "node scripts/qa-stage18g-practice-event-markers.mjs",
  "package.json exposes npm run stage18g:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18G - News And Event Markers Without Paid APIs",
    "Start with manually seeded/static events only.",
    "Render event markers on terminal chart when their time is within the revealed candle window.",
    "Do not add paid news APIs, scraping, browser-side external calls, or auto trading around news."
  ],
  "plan.md documents the Stage 18G manual/static practice-only boundary."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeEventMarkerCategory",
    "PracticeEventMarkerImpact",
    "PracticeEventMarkerScope",
    "PracticeEventMarkerRecord",
    "PracticeEventMarkerSummary",
    "eventId?: string",
    "eventMarkers: PracticeEventMarkerSummary[]"
  ],
  "Practice types include safe event marker records and response surfaces."
);

assertIncludesAll(
  practiceEvents,
  [
    "import \"server-only\"",
    "staticManualPracticeEventTemplates",
    "category: \"economic\"",
    "impact: \"high\"",
    "boundedText(template.safeSummary, 240)",
    "eventTimeMs >= sessionStartMs",
    "eventTimeMs <= latestRevealedMs",
    "listVisiblePracticeEventsForRevealedCandles"
  ],
  "Practice event helper is server-only, static/manual, bounded, and filters to the revealed window."
);

assert(
  !practiceEvents.includes("fetch(") &&
    !practiceEvents.includes("axios") &&
    !practiceEvents.includes("cheerio") &&
    !practiceEvents.includes("rss") &&
    !practiceEvents.includes("newsapi") &&
    !practiceEvents.includes("economic-calendar"),
  "Static practice event helper does not call paid/external news APIs or scrape websites."
);

assertIncludesAll(
  practiceRepo,
  [
    "listVisiblePracticeEventsForRevealedCandles",
    "listVisibleEventsForSession",
    "const eventMarkers = await listVisibleEventsForSession(actor, session)",
    "eventMarkers,",
    "const eventMarkers = listVisiblePracticeEventsForRevealedCandles",
    "practice_event_marker_not_visible",
    "Choose an event marker that is already visible in this replay.",
    "eventId: normalized.eventId"
  ],
  "Practice repository returns visible event markers and validates event-linked notes through server routes."
);

assertIncludesAll(
  terminalClient,
  [
    "eventMarkers={filteredEventMarkers}",
    "showEvents={showEvents}",
    "onSelectEvent={selectTerminalEvent}",
    "selectedEventId",
    "hoveredEventGroupId",
    "visibleRangeVersion",
    "data-practice-event-marker-lane=\"bottom\"",
    "absolute inset-x-0 bottom-2 z-30 h-7 border-t",
    "pointer-events-auto absolute top-0 z-40",
    "data-practice-event-hit-target=\"24px\"",
    "data-practice-event-marker={group.groupId}",
    "h-6 w-6 cursor-pointer",
    "data-practice-event-hover-target=\"24px\"",
    "data-practice-event-visible-marker=\"compact\"",
    "h-2.5 w-2.5",
    "h-4 min-w-4 px-1 text-[9px]",
    "rounded-full",
    "onPointerEnter={() => showEventGroupTooltip(group.groupId)}",
    "onPointerMove={() => showEventGroupTooltip(group.groupId)}",
    "onPointerLeave={scheduleHideEventGroupTooltip}",
    "showEventGroupTooltip(group.groupId)",
    "scheduleHideEventGroupTooltip",
    "onClick={() => {",
    "onSelectEvent(group.events[0]?.eventId ?? \"\")",
    "const timeScale = chart.timeScale()",
    "timeScale.timeToCoordinate(closestTime)",
    "xCoordinate === null",
    "xCoordinate < 0 || xCoordinate > chartWidth",
    "subscribeVisibleLogicalRangeChange",
    "unsubscribeVisibleLogicalRangeChange",
    "setVisibleRangeVersion((current) => current + 1)",
    "previous?.xCoordinate",
    "currentXPx - previousXPx < minMarkerSpacingPx",
    "left: `${group.xCoordinate}px`",
    "w-[min(19rem,82vw)]",
    "pointer-events-auto absolute bottom-8 z-50",
    "data-practice-event-tooltip={activeEventGroup.groupId}",
    "onPointerEnter={() => showEventGroupTooltip(activeEventGroup.groupId)}",
    "onPointerLeave={scheduleHideEventGroupTooltip}",
    "backdrop-blur-md",
    "maxWidth: \"320px\"",
    "activeEventGroup.xCoordinate > chartWidth - 160",
    "activeEventGroup.xCoordinate < 160 ? \"translateX(0)\"",
    "h-2 w-2 shrink-0 rounded-full",
    "truncate text-[13px] font-semibold",
    "line-clamp-3",
    "Source:",
    "Close pinned practice event details",
    "x",
    "role=\"dialog\"",
    "Practice event details",
    "const minMarkerSpacingPx = 18",
    "highestEventImpact(group.events)",
    "group.events.length > 1 ? group.events.length",
    "Show chart events",
    "Event link",
    "Event impact filter",
    "Event category filter",
    "No static event marker is visible in the revealed candle window yet."
  ],
  "Practice terminal renders compact chart markers with a larger invisible hover target, grouped hover/click details, filters, and safe event-linked annotation controls."
);

assert(
  !terminalClient.includes("absolute right-4 bottom-4 grid max-w-[min(92%,23rem)]") &&
    !terminalClient.includes("data-practice-event-marker-layer=\"compact\"") &&
    !terminalClient.includes("h-6 min-w-6") &&
    !terminalClient.includes("xPct") &&
    !terminalClient.includes("(closestIndex / (candles.length - 1)) * 100") &&
    !terminalClient.includes("max-w-[min(17rem,82vw)]") &&
    !terminalClient.includes(">Close<") &&
    !terminalClient.includes("shadow-lg ${selectedEventId === eventMarker.eventId"),
  "Chart event rendering uses a bottom event lane with compact markers and a polished tooltip instead of bulky candle-area cards."
);

assertIncludesAll(
  `${replayClient}\n${journalLedger}\n${journalUi}`,
  [
    "Visible practice events",
    "latestEventLinkedNote",
    "Latest event-linked practice note",
    "eventId:"
  ],
  "Completed review and journal surface safe event-linked practice summaries."
);

assert(
  !terminalClient.includes("https://") &&
    !terminalClient.includes("http://") &&
    !terminalClient.includes("newsapi") &&
    !terminalClient.includes("economicCalendar") &&
    !terminalClient.includes("scrape"),
  "Browser terminal does not fetch external news sources."
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
  "Firestore browser rules remain deny-by-default for practice storage paths."
);

assert(
  !stage18gModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18gModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18gModules.includes("getExchangeOrderAdapter") &&
    !stage18gModules.includes("private Binance") &&
    !stage18gModules.includes("private Bybit") &&
    !stage18gModules.includes("MetaAPI access token") &&
    !stage18gModules.includes("metaApiToken") &&
    !stage18gModules.includes("brokerPassword") &&
    !stage18gModules.includes("accountId") &&
    !stage18gModules.includes("vaultRef") &&
    !stage18gModules.includes("rawProviderPayload"),
  "Stage 18G modules do not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

assert(
  !stage18gNewSurfaces.includes("screenshot") &&
    !stage18gNewSurfaces.includes("pdf") &&
    !stage18gNewSurfaces.includes("upload") &&
    !stage18gNewSurfaces.includes("paid storage") &&
    !stage18gNewSurfaces.includes("WhatsApp") &&
    !stage18gNewSurfaces.includes("SMS"),
  "Stage 18G does not add screenshots, PDFs, uploads, paid storage, or messaging integrations."
);

console.log("Stage 18G practice event marker QA passed.");
