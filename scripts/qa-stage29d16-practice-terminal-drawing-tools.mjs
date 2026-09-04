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
const overlayModule = read("src/lib/practice/practice-klinechart-overlays.ts");
const practiceTypes = read("src/types/practice.ts");
const repository = read("src/lib/practice/practice-repository.ts");
const drawingsRoute = read("src/app/api/student/practice/sessions/[sessionId]/drawings/route.ts");
const browserStudent = read("tests/browser/student-e2e.spec.mjs");
const browserHelpers = read("tests/browser/helpers/student-flows.mjs");
const browserAuth = read("tests/browser/helpers/auth.mjs");
const coldNavigationBrowser = read("tests/browser/practice-terminal-cold-navigation.spec.mjs");
const playwrightConfig = read("playwright.config.mjs");
const loginForm = read("src/components/auth/login-form.tsx");
const practiceDashboard = read("src/components/student-app/student-practice-client.tsx");
const stage29d15Qa = read("scripts/qa-stage29d15-practice-terminal-responsive-workstation.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md"),
  read("docs/handoffs/tradehub-handoff-2026-08-30.md")
].join("\n");

assert(packageJson.dependencies?.klinecharts === "10.0.3", "Production pins KLineChart 10.0.3 exactly.");
assert(packageJson.dependencies?.["@klinecharts/extension"] === "0.1.0", "The isolated feasibility spike pins the official KLineChart extension package exactly.");
assert(packageJson.scripts?.["stage29d16:qa"] === "node scripts/qa-stage29d16-practice-terminal-drawing-tools.mjs", "package.json exposes Stage 29D.16 QA.");
assert(packageJson.scripts?.["browser:qa:student:webkit:drawing"]?.includes("TRADEHUB_BROWSER_ENGINE=webkit"), "Focused production drawing QA can run against WebKit.");
assert(packageJson.scripts?.["browser:qa:student:webkit:cold-navigation:laptop"]?.includes("TRADEHUB_BROWSER_COLD_SERVER=true"), "Laptop WebKit cold-navigation QA requires a fresh server.");
assert(packageJson.scripts?.["browser:qa:student:webkit:cold-navigation:tablet"]?.includes("TRADEHUB_BROWSER_COLD_SERVER=true"), "Tablet WebKit cold-navigation QA requires a fresh server.");

excludesAll(terminal, ["from \"lightweight-charts\"", "createChart("], "The real Practice Terminal no longer imports or initializes lightweight-charts.");
includesAll(terminal, [
  'from "klinecharts"',
  "practiceKLinePeriod",
  "registerPracticeKLineChartOverlays",
  "klinecharts.init(container",
  'data-practice-chart-engine="klinecharts-10.0.3"',
  "window.__TRADEHUB_PRACTICE_KLINECHART__ = chart",
  "chart.setDataLoader",
  "chartDataRef.current",
  "chart.resetData()"
], "The authenticated production terminal initializes KLineChart and feeds it only its revealed candle list.");
includesAll(overlayModule, [
  'import("klinecharts")',
  'PRACTICE_KLINE_TREND_OVERLAY = "segment"',
  'PRACTICE_KLINE_FIBONACCI_OVERLAY = "tradehubBoundedFibonacci"',
  'PRACTICE_KLINE_ZONE_OVERLAY = "tradehubZone"',
  'PRACTICE_KLINE_MEASURE_OVERLAY = "tradehubDirectionalMeasure"',
  'PRACTICE_KLINE_TEXT_OVERLAY = "tradehubTextNote"',
  "boundedFibonacciOverlay",
  "directionalMeasureOverlay",
  "textNoteOverlay",
  '.split("\\n")',
  "TRADEHUB_ATR",
  "registerIndicator(practiceAtrIndicator)",
  "candle.high - candle.low",
  "Math.abs(candle.high - previousClose)"
], "Production registers TradeHub-owned KLine overlays, coherent multiline text, and revealed-data ATR support.");
includesAll(overlayModule, [
  "wrapTextNoteDisplayLines",
  "PRACTICE_TEXT_NOTE_MAX_WIDTH",
  "PRACTICE_TEXT_NOTE_HORIZONTAL_PADDING",
  'text.split("\\n")',
  "estimatedNoteTextWidth",
  "Math.min(maxNoteWidth",
  "note-hit-area",
  'color: "rgba(41,98,255,0.001)"',
  'borderColor: "transparent"',
  "note-line-"
], "Text Note rendering wraps compact blue chart text inside an invisible bounded hit area without changing its persisted multiline value.");
excludesAll(overlayModule, ["note-card", "rgba(3,7,18,0.94)"], "Saved Text Notes never render the former permanent dark card.");
excludesAll(overlayModule, ['name: "fibonacciLine"', '"fibonacciLine"', "@klinecharts/extension"], "Production never falls back to the full-pane stock Fibonacci or extension geometry.");
includesAll(overlayModule, [
  "PRACTICE_FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]",
  "const left = Math.min(start.x, end.x);",
  "const right = Math.max(start.x, end.x);",
  "{ x: left, y: row.y }",
  "{ x: right, y: row.y }",
  "fibonacciColors",
  "fibonacciFills"
], "TradeHub Fibonacci figures are bounded by both anchors and use restrained level styling.");

includesAll(loginForm, [
  "let postLoginNavigationStarted = false;",
  "const redirectOnce = useCallback",
  "if (postLoginNavigationStarted)",
  "postLoginNavigationStarted = true;",
  'if (session.status === "signed_out")',
  "postLoginNavigationStarted = false;",
  "window.location.replace(path)",
  "redirectOnce(resolvePostLoginPath(session.role, requestedNext))",
  "redirectOnce(nextPath)"
], "Login effect and submit completion share one guarded redirect function.");
assert((loginForm.match(/window\.location\.replace\(/g) ?? []).length === 1, "Login owns exactly one guarded document redirect call site.");
assert(!loginForm.includes("router.replace("), "Login does not leave a pending client-router redirect after authentication.");

includesAll(practiceTypes, [
  'PracticeDrawingCoordinateVersion = "klinecharts_v1" | "klinecharts_v2"',
  'PracticeDrawingAppearanceVersion = "trend_blue_v1" | "user_selected_v1"',
  "interface PracticeDrawingChartPoint",
  "dataIndex: number",
  "chartPoints?: PracticeDrawingChartPoint[]"
], "Drawing records have a versioned KLineChart coordinate bridge while legacy candle fields remain available.");
includesAll(repository, [
  "normalizeDrawingAppearanceVersion",
  'value === "trend_blue_v1" || value === "user_selected_v1"',
  "appearanceVersion: normalizeDrawingAppearanceVersion(record.appearanceVersion)",
  "appearanceVersion: normalized.appearanceVersion"
], "Drawing persistence carries bounded appearance metadata through create, retrieval, and update.");
includesAll(repository, [
  "PRACTICE_DRAWING_VISUAL_INDEX_MARGIN = 500",
  "mapPracticeDrawingChartPoints",
  'coordinateVersion !== "klinecharts_v1" && coordinateVersion !== "klinecharts_v2"',
  "Math.round(dataIndex * 1_000_000) / 1_000_000",
  "practice_drawing_chart_point_out_of_bounds",
  "practice_drawing_chart_point_count_invalid",
  "practice_annotation_future_candle_blocked",
  "practice_drawing_future_candle_blocked"
], "Server validation bounds visual drawing points independently and retains revealed-candle checks for legacy indices.");

const chart = sectionBetween(terminal, "function TerminalChart", "function TerminalBody");
const dragRequirement = sectionBetween(terminal, "function terminalToolRequiresDrag", "function normalizeTerminalMultilineText");
includesAll(dragRequirement, [
  'kind === "zone"',
  'kind === "fibonacci_retracement"',
  'kind === "measurement_placeholder"'
], "Zone, Fibonacci, and Measure retain deliberate drag placement.");
excludesAll(dragRequirement, ['kind === "trend_line"'], "Trend remains a two-click tool and never enters the held-pointer drag path.");
excludesAll(terminal, ["terminalToolStaysActiveAfterSave"], "No completed production drawing tool remains armed.");
includesAll(terminal, [
  'setSelectedToolKind("select");',
  'onCancelTool("Zoom rectangle applied. Select restored.")',
  "trendLineDraftRef.current = null;",
  "dragDraftRef.current = null;",
  "clearKLineDraft();",
  "setTextDraft(null);"
], "Every completed or cancelled production tool returns to Select and clears its capture state.");

const pointerDown = sectionBetween(chart, "function handleDrawingCapturePointerDown", "function handleDrawingCapturePointerMove");
assert(pointerDown.indexOf('if (activeDrawingTool === "trend_line")') < pointerDown.indexOf("setPointerCapture(event.pointerId)"), "Trend exits before pointer capture.");
const pointerMove = sectionBetween(chart, "function handleDrawingCapturePointerMove", "function handleDrawingCapturePointerUp");
includesAll(pointerMove, ["currentTrendLineDraft", "trendLineDraftRef.current = nextDraft", 'renderKLineDraft("trend_line", nextDraft.start, point)'], "Trend preview is a native KLine overlay that follows pointer movement without a held button.");
excludesAll(pointerMove, ["event.buttons", "pixelDistance"], "Trend preview has no held-button or distance threshold.");
const pointerUp = sectionBetween(chart, "function handleDrawingCapturePointerUp", "function handleDrawingCapturePointerCancel");
const firstAnchor = sectionBetween(pointerUp, "if (!currentTrendLineDraft)", "trendLineDraftRef.current = null;");
includesAll(firstAnchor, ["trendLineDraftRef.current = { start: point, current: point };", 'renderKLineDraft("trend_line", point, point);', "return;"], "First Trend click stores only a local anchor and native preview.");
excludesAll(firstAnchor, ["onPlaceDrawing", "POST", "fetch("], "First Trend click cannot persist an incomplete line.");
includesAll(pointerUp, [
  'kind: "trend_line"',
  'coordinateVersion: "klinecharts_v2"',
  "currentTrendLineDraft.start.dataIndex",
  "point.dataIndex",
  "terminalToolRequiresDrag(currentDraft.kind)",
  "pixelDistance < 10"
], "Second Trend click and drag tools persist versioned visual coordinates.");
const pointerCancel = sectionBetween(chart, "function handleDrawingCapturePointerCancel", "async function commitTextDraft");
includesAll(pointerCancel, [
  "event?.preventDefault();",
  "event?.stopPropagation();",
  "releasePointerCapture(event.pointerId)",
  "dragDraftRef.current = null;",
  "trendLineDraftRef.current = null;",
  "nativeOverlayMoveRef.current = null;",
  "clearTextDraft();",
  "clearKLineDraft();",
  'onCancelTool("Drawing cancelled. Select restored.")'
], "Pointer cancellation releases capture, clears every draft and preview, and restores Select through onCancelTool.");

const trendAppearance = sectionBetween(terminal, "const PRACTICE_TREND_DEFAULT_COLOR", "function MiniOrderStat");
includesAll(trendAppearance, [
  'PRACTICE_TREND_DEFAULT_COLOR = "#2962ff"',
  'kind === "trend_line"',
  'appearanceVersion === "trend_blue_v1"',
  'appearanceVersion !== "user_selected_v1"',
  'colorToken === "accent"',
  'colorToken === "blue"'
], "Trend rendering uses a dedicated saturated blue while narrowly converting unversioned legacy defaults.");
const createDrawing = sectionBetween(terminal, "async function createTerminalDrawingFromChartPoint", "async function updateSelectedDrawing");
includesAll(createDrawing, [
  'placement.kind === "trend_line"',
  '? "blue"',
  'placement.kind === "text_note"',
  'const appearanceVersion = placement.kind === "trend_line" ? "trend_blue_v1" : undefined;',
  "appearanceVersion,"
], "New Trends persist the blue default and its appearance version instead of the gold accent.");
excludesAll(createDrawing, ['placement.kind === "trend_line" ? "accent"'], "New default Trends cannot persist the gold accent.");
includesAll(chart, [
  'kind === "trend_line" ? PRACTICE_TREND_DEFAULT_COLOR',
  "drawingColorHex(drawing.colorToken, drawing.kind, drawing.appearanceVersion)",
  "borderColor: overlayColor"
], "Trend draft, saved geometry, selection handles, and restored overlays resolve through the same blue appearance.");

const toolRailMarkup = sectionBetween(terminal, 'data-testid="practice-terminal-left-tool-rail"', "</aside>");
includesAll(terminal, [
  "function terminalToolPopoverPosition",
  'window.matchMedia("(min-width: 1024px)").matches',
  "window.innerWidth - width - margin",
  "window.innerHeight - height - margin",
  "linesButtonRef.current.getBoundingClientRect()",
  "deleteButtonRef.current.getBoundingClientRect()",
  'className="fixed z-[130] grid w-56 max-w-[calc(100vw-1rem)]',
  'data-testid="practice-terminal-lines-menu"',
  'data-testid="practice-terminal-delete-menu"',
  'role="menu"',
  'role="menuitem"'
], "Lines and Delete use viewport-clamped fixed popovers anchored to their real rail controls.");
includesAll(terminal, [
  "lg:overflow-x-hidden lg:overflow-y-auto"
], "The Stage 29D.15 desktop tool rail retains required vertical scrolling.");
excludesAll(toolRailMarkup, [
  'data-testid="practice-terminal-lines-menu"',
  'data-testid="practice-terminal-delete-menu"',
  "lg:absolute"
], "Neither tool popover is rendered inside the clipped scrolling rail.");

includesAll(chart, [
  'chart?.getDom("candle_pane", "main")',
  "plot.getBoundingClientRect()",
  "chart.convertFromPixel",
  "const rawDataIndex =",
  "const candleIndex = Math.max(0, Math.min(Math.round(dataIndex), maxCandleIndex));",
  'data-practice-kline-plot-only="axes-excluded"',
  "left: plotBounds.left",
  "width: plotBounds.width",
  "height: plotBounds.height"
], "Drawing input accepts extrapolated plot coordinates while legacy candle fields stay compatibility-clamped and axes stay excluded.");
excludesAll(sectionBetween(chart, "const chartPointFromCoordinates", "function handleDrawingCapturePointerDown"), [
  "Math.max(0, Math.min(Math.round(Number(logical))",
  "coordinateToLogical",
  "- 72",
  "- 28"
], "KLine visual dataIndex is not clamped to the revealed candle range.");
excludesAll(chart, ['bottom-[28px]', 'right-[72px]', "positionedDrawings", 'data-testid="practice-terminal-chart-drawing"', 'data-testid="practice-terminal-drawing-endpoint"'], "Production has no guessed-axis capture geometry or duplicate DOM drawing renderer.");

includesAll(terminal, [
  "PRACTICE_KLINE_DRAWING_GROUP",
  "practiceKLineOverlayName",
  "PRACTICE_KLINE_TREND_OVERLAY",
  "PRACTICE_KLINE_HORIZONTAL_OVERLAY",
  "PRACTICE_KLINE_VERTICAL_OVERLAY",
  "PRACTICE_KLINE_FIBONACCI_OVERLAY",
  "PRACTICE_KLINE_ZONE_OVERLAY",
  "PRACTICE_KLINE_MEASURE_OVERLAY",
  "onSelected:",
  "onPressedMoveEnd:",
  "nativeOverlayMoveRef.current",
  'window.addEventListener("pointerup", finishNativeOverlayMove, true)',
  "chartRef.current?.getOverlays({ id: pendingMove.drawingId })[0]",
  "moveDrawingRef.current(drawing.annotationId, nextPoints)",
  "needDefaultPointFigure: true",
  "zLevel: 20"
], "Saved production drawings use native/selectable KLine overlays with authoritative release persistence and explicit interaction stacking.");
includesAll(chart, [
  "PRACTICE_KLINE_DRAFT_GROUP",
  '"practice-kline-trend-draft"',
  'style: "solid"',
  '"practice-kline-drag-draft"',
  "zLevel: 30"
], "In-progress previews render as native KLine overlays.");

includesAll(chart, [
  'name: "MA"',
  'name: "EMA"',
  'name: "RSI"',
  "PRACTICE_KLINE_ATR_INDICATOR",
  'name: "VOL"',
  'paneId: "candle_pane"',
  "paneId: PRACTICE_KLINE_RSI_PANE",
  "paneId: PRACTICE_KLINE_ATR_PANE",
  "paneId: PRACTICE_KLINE_VOLUME_PANE"
], "SMA, EMA, RSI, ATR, and Volume MA render through KLineChart in explicit main/lower panes.");
includesAll(chart, [
  "chart.getDataList().length",
  "chart.getBarSpace().bar",
  "chart.getOffsetRightDistance()",
  "chart.getVisibleRange()",
  "wasAtLiveEdge",
  "viewportModeRef.current",
  "historicalRightDataIndexRef.current",
  "isRestoringViewportRef.current",
  "initialViewportAppliedRef.current",
  "if (!wasAtLiveEdge)",
  "chart.scrollToDataIndex(historicalRightDataIndex)",
  'chart.subscribeAction("onScroll", handleViewportInteraction)',
  'chart.subscribeAction("onZoom", handleViewportInteraction)',
  "rightDataIndex: visibleRange.to",
  "chart.scrollToDataIndex(baseline?.rightDataIndex"
], "Replay data resets fit once and then preserve live-edge or historical user viewports.");
excludesAll(chart, ["fittedCandleCountRef.current !== chartData.length"], "Replay no longer refits on every revealed candle count change.");

const clientMultiline = sectionBetween(terminal, "function normalizeTerminalMultilineText", "function normalizeTerminalSingleLineText");
includesAll(clientMultiline, ['.replace(/\\r\\n?/g, "\\n")', '.replace(/[^\\S\\n]+/g, " ")', '.join("\\n")'], "Client Text Notes preserve intentional newlines.");
excludesAll(clientMultiline, ["replace(/\\s+/g"], "Client multiline normalization cannot collapse line breaks.");
const repositoryMultiline = sectionBetween(repository, "function normalizeMultilineAnnotationText", "function normalizeAnnotationText");
includesAll(repositoryMultiline, ['.replace(/\\r\\n?/g, "\\n")', '.join("\\n")', ".slice(0, 700)"], "Server Text Note normalization preserves bounded multiline content.");
excludesAll(repositoryMultiline, ["replace(/\\s+/g"], "Server multiline normalization cannot collapse line breaks.");
const automaticTextCommit = sectionBetween(chart, "async function commitTextDraft", "function discardTextDraft");
includesAll(automaticTextCommit, [
  "textCommitInFlightRef.current",
  "normalizeTerminalMultilineText(draft.text)",
  "if (text.length < 2)",
  "clearTextDraft();",
  "await onPlaceDrawing",
  'kind: "text_note"',
  'setTextDraftSaveState("error")',
  "textEditorInputRef.current?.focus()"
], "Text Notes commit once on completion, discard blank drafts, preserve newlines, and retain content on failure.");
includesAll(chart, [
  'document.addEventListener("pointerdown", handleOutsidePointerDown, true)',
  'data-practice-text-note-commit="automatic"',
  'placeholder="Add text"',
  'data-practice-text-note-state={textDraftSaveState}',
  'className="block min-h-9 max-h-28',
  "discardTextDraft();"
], "The chart-local Text editor is compact, auto-committing, and Escape-safe.");
const activeToolDraftCleanup = sectionBetween(chart, "useEffect(() => {\n    dragDraftRef.current = null;", "useEffect(() => {\n    if (!textDraft)");
excludesAll(activeToolDraftCleanup, ["commitTextDraft", "onPlaceDrawing"], "Tool-change cleanup cannot retry a failed automatic Text Note persistence request.");
excludesAll(sectionBetween(chart, '{textDraft && plotBounds ? (', '{zoomHistory.length ? ('), [
  'type="submit"',
  ">Save<",
  ">Cancel<",
  "w-[min(18rem",
  "border-[#d9c28c]"
], "Text placement has no Save/Cancel controls, large modal width, or gold frame.");

const clearAll = sectionBetween(terminal, "const deleteAllTerminalDrawings = useCallback", "useEffect(() => {");
includesAll(clearAll, [
  "PracticeDrawingBulkDeleteResponse",
  '{ method: "DELETE" }',
  "const authoritativeDetail = await requestCourseHubApi<PracticeSessionDetailResponse>",
  "setDetail(authoritativeDetail);",
  "Restoring a stale snapshot could visually resurrect drawings already committed by the server."
], "Clear-all remains atomic and reconciles response-loss failures to the authoritative drawing state.");
const atomicDelete = repository.slice(repository.indexOf("export async function deleteAllStudentPracticeDrawings"));
includesAll(atomicDelete, ["const batch = db.batch();", "batch.delete(drawingDoc.ref);", "await batch.commit();", "isTerminalDrawingAnnotationKind"], "Server clear-all is bounded, atomic, and drawing-only.");
includesAll(drawingsRoute, ["requireStudent(request)", "deleteAllStudentPracticeDrawings"], "Drawing bulk deletion remains protected and student-scoped.");

includesAll(repository, [
  "persistedCurrentCandleIndex",
  "normalizedRequestedIndex",
  "Math.min(",
  "availableCandleCount - 1"
], "Candle retrieval retains the server-authoritative persisted reveal clamp.");

includesAll(browserHelpers, [
  "page.mouse.down();",
  "page.mouse.move(endX, endY, { steps });",
  "page.mouse.up();",
  "clickPracticeChartCapture",
  "movePracticeChartPointer",
  "observeNextPracticeSessionCreation",
  "deleteStandalonePracticeSessionByApi",
  "confirmationName"
], "Browser helpers perform real gestures and can clean a created session even after navigation failure.");
includesAll(browserAuth, [
  "waitForSettledApplicationPath",
  'page.waitForLoadState("networkidle"',
  "currentPath !== expectedPath",
  "Seeded ${persona} login did not settle on ${nextPath}"
], "Authentication helpers require the requested application path to remain settled.");
excludesAll(browserAuth, ["await page.goto(nextPath);", 'url.pathname !== "/login"'], "Authentication helpers cannot conceal a redirect race with fallback navigation.");
includesAll(browserHelpers, [
  'page.locator(`a[href="${path}"]:visible`).first()',
  "await inAppLink.click();",
  "await waitForSettledApplicationPath(page, path);"
], "Student route helpers use real in-app navigation and require the exact destination to settle.");
includesAll(practiceDashboard, [
  'import { useRouter } from "next/navigation";',
  "const router = useRouter();",
  "router.push(`/app/practice/${encodeURIComponent(response.session.sessionId)}/terminal`)"
], "Quick Session and assignment terminal transitions use the app router during cold route compilation.");
assert((practiceDashboard.match(/router\.push\(`\/app\/practice\/\$\{encodeURIComponent\(response\.session\.sessionId\)\}\/terminal`\)/g) ?? []).length === 3, "All three Practice terminal-entry workflows use the coordinated app-router transition.");
assert(!practiceDashboard.includes("window.location.href = `/app/practice/"), "Practice terminal entry does not use a hard navigation that cold Fast Refresh can interrupt.");
includesAll(playwrightConfig, [
  'process.env.TRADEHUB_BROWSER_COLD_SERVER === "true"',
  "reuseExistingServer: !requireColdServer"
], "Cold-navigation QA refuses to reuse an already-warmed development server.");
includesAll(coldNavigationBrowser, [
  "signInAs(page, \"student\", \"/app\")",
  "openStudentPage(page, \"/app/practice\"",
  "openTerminal: true",
  "observeNextPracticeSessionCreation(page)",
  "waitForSettledApplicationPath(page, terminalPath",
  "practice-terminal-chart-first-shell",
  "deleteStandalonePracticeSessionByApi"
], "Focused cold-navigation browser QA signs in, creates, remains on terminal, and always cleans up.");
const browserFlow = sectionBetween(browserStudent, "for (const drawingViewport", 'test("courses, lesson reader');
includesAll(browserFlow, [
  '{ label: "laptop", width: 1366, height: 820 }',
  '{ label: "tablet", width: 900, height: 760 }',
  "window.__TRADEHUB_PRACTICE_KLINECHART__",
  'groupId: "tradehub_practice_drawings_v1"',
  'groupId: "tradehub_practice_drawing_draft_v1"',
  "expect(trendLinePostCount).toBe(0);",
  "movePracticeChartPointer",
  'coordinateVersion).toBe("klinecharts_v2")',
  "dataIndex).toBeLessThan(0)",
  "dataIndex).toBeGreaterThan(lastRevealedDataIndex)",
  "expect(secondTrend.annotationId).not.toBe(firstTrend.annotationId)",
  "expectOverlayEndpointsNear(firstTrend.annotationId, [firstTrendStart, firstTrendEnd])",
  "expectOverlayEndpointsNear(secondTrend.annotationId, [secondTrendStart, secondTrendEnd])",
  'expect(firstTrend.colorToken).toBe("blue")',
  'expect(firstTrend.appearanceVersion).toBe("trend_blue_v1")',
  'expectTrendOverlayBlue("practice-kline-trend-draft", "tradehub_practice_drawing_draft_v1")',
  "expectTrendOverlayBlue(firstTrend.annotationId)",
  "expectTrendOverlayBlue(secondTrend.annotationId)",
  "Legacy default trend",
  "expectTrendOverlayBlue(legacyTrend.annotationId)",
  'toHaveAttribute("data-active-drawing-tool", "select")',
  'button: "Rectangle zone"',
  'button: "Fibonacci retracement"',
  'button: "Measure"',
  "boundedFibonacciPixels",
  "insideLevelMatches",
  "renderedLevelCount",
  "renderedLevelsBounded",
  "maximumRenderedLevelWidth",
  "getImageData",
  'dispatchEvent("pointercancel"',
  "cancelledDragStart",
  "cancelledDragEnd",
  'expectOverlayCount("zone", 0)',
  'page.locator(\'[data-testid="practice-terminal-chart-drawing"], [data-testid="practice-terminal-drawing-endpoint"]\')).toHaveCount(0)',
  'createdMultilineText = "First line\\nSecond line"',
  'data-practice-text-note-commit", "automatic"',
  'getByRole("button", { name: /save|cancel/i })).toHaveCount(0)',
  "textEditorBox.width).toBeLessThanOrEqual(205)",
  "expect(textNotePostCount).toBe(1)",
  'toHaveAttribute("data-active-drawing-tool", "zone")',
  "failedAutomaticSaveCount",
  'toHaveAttribute("data-practice-text-note-state", "error")',
  'toHaveValue(failedText)',
  'toContainText("Your text is still here")',
  "noteRenderGeometry",
  "renderedLineCount",
  "sourceLineCount",
  "context.measureText",
  "noteRenderGeometry.hasPermanentCard).toBe(false)",
  'noteRenderGeometry.overlayColor).toBe("#60a5fa")',
  "line.right).toBeLessThanOrEqual(noteRenderGeometry.hitArea.x + noteRenderGeometry.hitArea.width)",
  "page.reload()",
  "endpointPatchPromise",
  "Simulated response loss after the atomic drawing clear committed.",
  "currentCandleIndex).toBe(23)",
  "candles).toHaveLength(24)",
  "currentCandleIndex).toBe(24)",
  "candles).toHaveLength(25)",
  'getByTestId("practice-terminal-zoom-out")'
], "Production browser coverage exercises empty-space drawings, one-shot tools, native overlays, multiline reload, endpoint movement, atomic clear recovery, zoom, and reveal-boundary attacks at laptop/tablet sizes.");
includesAll(browserFlow, [
  "clickVisibleToolPopoverOption",
  'menuTestId: "practice-terminal-lines-menu"',
  'menuTestId: "practice-terminal-delete-menu"',
  "rail.boundingBox()",
  "menu.boundingBox()",
  "option.boundingBox()",
  "page.viewportSize()",
  "menuBox.x + menuBox.width",
  "menuBox.y + menuBox.height",
  "document.elementFromPoint(x, y)?.closest",
  "await page.mouse.click(optionCenter.x, optionCenter.y)",
  'optionName: "Trend line"',
  'optionName: "Delete selected drawing"',
  'optionName: "Clear chart drawings"',
  'toHaveAttribute("data-active-drawing-tool", "trend_line")',
  "Trend line selected. Click the start, move the pointer, then click the endpoint."
], "Laptop/tablet browser coverage proves unclipped popover geometry, viewport containment, real hit targets, mouse selection, and subsequent Trend persistence.");
includesAll(browserFlow, [
  "observeNextPracticeSessionCreation(page)",
  "createdSessionId = (await createObserver.payloadPromise).session.sessionId",
  "await terminalNavigationPromise",
  "deleteStandalonePracticeSessionByApi(page, createdSessionId, sessionName)",
  "chart.getIndicators()",
  'paneId).toBe("candle_pane")',
  'paneId).toBe("practice-rsi-pane")',
  'paneId: "practice-atr-pane"',
  'paneId).toBe("practice-volume-pane")',
  'practice-terminal-indicator-toggle-${indicatorKey}',
  "chart.getBarSpace().bar",
  "chart.getVisibleRange()",
  'getByRole("button", { name: "Play replay" })',
  "historicalAfterNext",
  "historicalAfterPlay",
  "liveAfterNext",
  "zoomedAfterNext",
  "restoredViewport"
], "Production browser coverage verifies WebKit-safe session navigation, all KLine indicators, disable behavior, and replay viewport preservation.");
excludesAll(browserFlow, ["drawingLocator(", "practice-terminal-trend-line-preview", 'fibonacci_retracement: "fibonacciLine"'], "Production drawing assertions query KLine overlays and rendered pixels instead of legacy DOM geometry.");

includesAll(terminal, [
  'data-practice-terminal-responsive-layout="stage29d15-xl-side-panel"',
  'data-practice-terminal-responsive-workspace="bottom-drawer-before-xl"',
  "grid-rows-[4rem_minmax(18rem,1fr)_minmax(11rem,32dvh)]",
  "xl:grid-cols-[4rem_minmax(0,1fr)_18rem]",
  "2xl:grid-cols-[4rem_minmax(0,1fr)_20rem]",
  'className="fixed inset-0 z-[100] h-[100dvh] min-h-[100dvh] overflow-hidden bg-black text-[color:var(--label)]"'
], "Stage 29D.15 responsive workstation and fullscreen guards remain intact.");
includesAll(stage29d15Qa, ["bottom-drawer-before-xl", "stage29d15-xl-side-panel", "100dvh"], "The dedicated Stage 29D.15 guard remains wired.");

includesAll(docs, ["Stage 29D.16", "Stage 29D.17", "KLineChart 10.0.3", "TradeHub-owned overlays", "isolated feasibility spike", "real Chrome and Safari", "owner-accepted"], "Documentation distinguishes production overlays from the spike-only extension and records owner acceptance.");
excludesAll(docs, ["production Practice Terminal uses KLineChart 10.0.3 and its official extension package", "production Practice Terminal uses KLineChart 10.0.3 plus the official extension package"], "Documentation does not claim the spike extension renders production drawings.");
excludesAll(docs, [
  "Practice charting uses `lightweight-charts`",
  "Known practice problems still reported by the user"
], "Documentation contains no contradictory production chart-engine or unresolved-complaint claims.");
includesAll(docs, ["Resolved and owner-accepted Practice complaints", "Stage 29D is closed and frozen"], "Resolved Practice complaints remain owner-accepted and frozen through Stage 29D.17.");

excludesAll(terminal, [
  "api.binance.com/api/v3/order",
  "api.bybit.com/v5/order",
  "MetaApi",
  "metaapi.cloud/users/current/accounts"
], "Production Practice remains simulated-only with no private execution endpoints.");

console.log("Stage 29D.16 KLineChart production migration QA passed.");
