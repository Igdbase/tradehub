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
const globals = read("src/app/globals.css");
const siteHeader = read("src/components/layout/site-header.tsx");
const studentShell = read("src/components/student-app/student-shell.tsx");
const button = read("src/components/ui/button.tsx");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const docs = [
  read("plan.md"),
  read("manual-test-backlog.md"),
  read("manual-demo-qa.md"),
  read("complaint-resolution-roadmap.md"),
  read("prompt/promptsumary.md")
].join("\n");

assert(
  packageJson.scripts?.["stage29e:qa"] === "node scripts/qa-stage29e-app-wide-layout-stability.mjs",
  "package.json exposes npm run stage29e:qa."
);

includesAll(globals, [
  ".flow-copy",
  "text-wrap: pretty;",
  ".clip-line",
  "text-overflow: ellipsis;"
], "Global utilities include safe paragraph flow and one-line clipping helpers.");

excludesAll(globals, [
  ".glass-panel {\n    position: relative;\n    min-width: 0;\n    overflow: hidden;\n    overflow-wrap: break-word;",
  ".glass-panel-hi {\n    min-width: 0;\n    overflow-wrap: break-word;",
  ".hero-panel {\n    position: relative;\n    min-width: 0;\n    overflow: hidden;\n    overflow-wrap: break-word;",
  ".tradehub-hero {\n    position: relative;\n    min-width: 0;\n    overflow: hidden;\n    overflow-wrap: break-word;",
  ".break-safe {\n    overflow-wrap: break-word;"
], "Shared panels and break-safe utility no longer force normal text into letter columns.");

includesAll(button, [
  "whitespace-nowrap"
], "Shared Button labels stay on one line instead of stacking vertically.");

includesAll(siteHeader, [
  "const isAppSurface =",
  "pathname.startsWith(\"/app\")",
  "pathname.startsWith(\"/workspace\")",
  "pathname.startsWith(\"/admin\")",
  "isHome ? homeNav : isAppSurface ? [] : primaryNav",
  "const hasHeaderMenu = navItems.length > 0",
  "!isAppSurface"
], "Signed-in app surfaces hide landing/demo navigation so pages keep full-preview room.");

includesAll(studentShell, [
  'data-student-shell="wide"',
  "max-w-[96rem]",
  "2xl:grid-cols-[minmax(0,1fr)_360px]"
], "Student app shell uses a wider frame and delays side panels until large viewports.");

includesAll(practiceClient, [
  "const sessionTitle =",
  'data-layout="practice-session-row"',
  "2xl:grid-cols-[minmax(28rem,1fr)_minmax(18rem,24rem)]",
  "clip-line inline-block max-w-full",
  "flow-copy mt-1",
  "flex min-w-0 flex-wrap gap-2"
], "Practice session cards use a stable wide-row layout that prevents vertical metadata wrapping.");

excludesAll(practiceClient, [
  "xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)_auto]"
], "Old squeeze-prone three-column session card layout is removed.");

includesAll(docs, [
  "Stage 29E: Shared App Full-Preview Layout Stabilization",
  "TH-2026-08-28-STAGE29E-SHARED-APP-FULL-PREVIEW-LAYOUT-HANDOFF",
  "letter-by-letter wrapping",
  "full-preview"
], "Plan, manual QA, demo QA, complaint roadmap, and prompt summary record Stage 29E.");

console.log("Stage 29E shared app full-preview layout QA passed.");
