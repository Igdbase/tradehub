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
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const stage29eQa = read("scripts/qa-stage29e-app-wide-layout-stability.mjs");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29d15:qa"] === "node scripts/qa-stage29d15-practice-terminal-responsive-workstation.mjs",
  "package.json exposes npm run stage29d15:qa."
);

includesAll(terminal, [
  'data-practice-terminal-responsive-layout="stage29d15-xl-side-panel"',
  'data-practice-terminal-responsive-workspace="bottom-drawer-before-xl"',
  'data-practice-terminal-panel-breakpoint="side-panel-at-xl"',
  'className="fixed inset-0 z-[100] h-[100dvh] min-h-[100dvh] overflow-hidden bg-black text-[color:var(--label)]"',
  'className="flex h-[100dvh] min-h-0 flex-col"'
], "Terminal shell owns the viewport and records the Stage 29D.15 responsive layout.");

includesAll(terminal, [
  'window.matchMedia("(min-width: 1280px)")',
  "setIsUtilityPanelOpen(false);",
  'workstationMedia.addEventListener("change", handleWorkstationChange)',
  'workstationMedia.removeEventListener("change", handleWorkstationChange)'
], "Utility panel auto-collapses below the wide workstation breakpoint.");

includesAll(terminal, [
  "grid-rows-[4rem_minmax(18rem,1fr)_minmax(11rem,32dvh)]",
  "lg:grid-cols-[4rem_minmax(0,1fr)]",
  "lg:grid-rows-[minmax(0,1fr)_minmax(11rem,30dvh)]",
  "xl:grid-cols-[4rem_minmax(0,1fr)_18rem]",
  "2xl:grid-cols-[4rem_minmax(0,1fr)_20rem]",
  "lg:row-span-2",
  "lg:col-start-2 lg:row-start-2",
  "xl:col-start-auto xl:row-start-auto"
], "Terminal grid keeps laptop widths as chart plus bottom drawer, then moves to a side panel at xl.");

includesAll(terminal, [
  "relative flex min-h-[18rem] flex-1 overflow-hidden bg-black",
  "h-[32dvh] min-h-0 max-h-[20rem]",
  "lg:h-[30dvh] lg:max-h-[20rem]",
  "xl:h-auto xl:max-h-[calc(100dvh-3.75rem)]"
], "Chart and utility drawer have bounded heights that avoid blank or over-scrolled laptop layouts.");

includesAll(terminal, [
  'data-practice-terminal-footer-wrap="stage29d15-xl-only-columns"',
  "xl:grid-cols-[minmax(24rem,auto)_minmax(14rem,1fr)_auto]",
  "xl:col-span-3",
  "xl:flex xl:justify-end xl:gap-4",
  "xl:justify-end"
], "Bottom trading dock avoids squeeze-prone multi-column layout until xl widths.");

includesAll(terminal, [
  "xl:fixed xl:left-[5.25rem] xl:top-[5.25rem]",
  "xl:w-[min(48rem,calc(100vw-27rem))]",
  "xl:border-[#1b5c84]",
  "xl:shadow-[0_0_0_2px_rgba(29,92,132,0.55),0_24px_70px_rgba(0,0,0,0.68)]",
  "xl:hidden"
], "Order ticket popout remains a chart overlay only on wide workstation screens.");

excludesAll(terminal, [
  "lg:grid-cols-[4rem_minmax(0,1fr)_19rem]",
  "lg:grid-cols-[minmax(30rem,auto)_minmax(18rem,1fr)_auto]",
  "lg:fixed lg:left-[5.25rem] lg:top-[5.25rem]",
  "lg:w-[min(48rem,calc(100vw-29rem))]"
], "Old laptop-squeezing side-panel and footer breakpoints are removed.");

includesAll(practiceClient, [
  "const sessionTitle =",
  'data-layout="practice-session-row"',
  "clip-line inline-block max-w-full",
  "flow-copy mt-1",
  "2xl:grid-cols-[minmax(28rem,1fr)_minmax(18rem,24rem)]"
], "Practice Sessions keeps the Stage 29E no-vertical-letter-collapse row layout.");

includesAll(stage29eQa, [
  "letter-by-letter wrapping",
  "Practice session cards use a stable wide-row layout"
], "Stage 29D.15 preserves the shared full-preview layout guard for Practice Sessions.");

excludesAll(terminal, [
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
], "Stage 29D.15 adds no copied branding, live execution, private provider calls, AutoCopy coupling, or secret-bearing fields.");

includesAll(docs, [
  "Stage 29D.15: Practice Terminal Responsive Workstation Layout",
  "TH-2026-08-30-STAGE29D15-PRACTICE-TERMINAL-RESPONSIVE-WORKSTATION-HANDOFF",
  "bottom drawer before xl",
  "right utility panel",
  "laptop"
], "Plan, backlog, demo QA, complaint roadmap, and prompt summary record Stage 29D.15.");

console.log("Stage 29D.15 Practice terminal responsive workstation QA passed.");
