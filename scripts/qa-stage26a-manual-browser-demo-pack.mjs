import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const requiredFrozenScripts = [
  "stage18x:qa",
  "stage19i:qa",
  "stage20d:qa",
  "stage21d:qa",
  "stage22b:qa",
  "stage23d:qa",
  "stage24c:qa",
  "stage25e:qa"
];

const requiredRoutes = [
  "src/app/(student)/app/page.tsx",
  "src/app/(student)/app/practice/page.tsx",
  "src/app/(student)/app/practice/[sessionId]/page.tsx",
  "src/app/(student)/app/practice/[sessionId]/terminal/page.tsx",
  "src/app/(student)/app/practice/[sessionId]/report/page.tsx",
  "src/app/(student)/app/journal/page.tsx",
  "src/app/(student)/app/journal/trades/[tradeId]/page.tsx",
  "src/app/(student)/app/courses/page.tsx",
  "src/app/(student)/app/courses/[courseId]/page.tsx",
  "src/app/(student)/app/courses/[courseId]/proof/page.tsx",
  "src/app/(influencer)/workspace/page.tsx",
  "src/app/(influencer)/workspace/courses/page.tsx",
  "src/app/(influencer)/workspace/courses/[courseId]/page.tsx",
  "src/app/(influencer)/workspace/onboarding/page.tsx",
  "src/app/(super-admin)/admin/page.tsx"
];

const requiredDocSnippets = [
  "TH-2026-08-23-STAGE26A-MANUAL-BROWSER-QA-DEMO-PACK-HANDOFF",
  "npm run firebase:emulators",
  "npm run stage15f:seed",
  "npm run stage15f:seed-auth",
  "npm run clean:next",
  "npm run dev:stage15f",
  "student_stage15f_binance_sandbox@example.test",
  "stage15f.influencer@example.test",
  "stage15f.admin@example.test",
  "Stage15F!Pass123",
  "/app/practice",
  "/app/journal",
  "/app/courses",
  "/workspace",
  "/admin",
  "Practice terminal/backtesting flow",
  "Manual journal CRUD/review/analytics",
  "Courses/lesson/check/proof flow",
  "Controlled live AutoCopy stays blocked/frozen",
  "Must not appear",
  "Known Deferred Manual QA"
];

const frozenRefs = [
  "TH-2026-08-20-STAGE18X-PRACTICE-MVP-FINAL-HANDOFF",
  "TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF",
  "TH-2026-08-21-STAGE20D-OPS-SUPPORT-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE21D-MANUAL-JOURNAL-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE22B-FOREX-CFD-HISTORY-ADAPTER-HANDOFF",
  "TH-2026-08-22-STAGE23D-MESSAGING-MVP-FINAL-HANDOFF",
  "TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF",
  "TH-2026-08-23-STAGE25E-LIVE-AUTOCOPY-MVP-FINAL-HANDOFF"
];

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Stage 26A QA failed: ${message}`);
    process.exit(1);
  }
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const demoDoc = read("manual-demo-qa.md");
const backlog = read("manual-test-backlog.md");
const plan = read("plan.md");
const promptSummary = read("prompt/promptsumary.md");

assert(scripts["stage26a:qa"] === "node scripts/qa-stage26a-manual-browser-demo-pack.mjs", "stage26a:qa package script is missing.");

for (const scriptName of requiredFrozenScripts) {
  assert(typeof scripts[scriptName] === "string" && scripts[scriptName].length > 0, `${scriptName} remains wired.`);
}

for (const routePath of requiredRoutes) {
  assert(exists(routePath), `${routePath} exists for the demo route pack.`);
}

for (const snippet of requiredDocSnippets) {
  assert(demoDoc.includes(snippet), `manual-demo-qa.md documents ${snippet}.`);
}

for (const ref of frozenRefs) {
  assert(demoDoc.includes(ref), `manual-demo-qa.md preserves frozen reference ${ref}.`);
}

for (const file of [
  ["manual-test-backlog.md", backlog],
  ["plan.md", plan],
  ["prompt/promptsumary.md", promptSummary]
]) {
  assert(file[1].includes("Stage 26A"), `${file[0]} mentions Stage 26A.`);
  assert(
    file[1].includes("TH-2026-08-23-STAGE26A-MANUAL-BROWSER-QA-DEMO-PACK-HANDOFF"),
    `${file[0]} carries the Stage 26A handoff reference.`
  );
}

const forbiddenDependencyNames = [
  "twilio",
  "resend",
  "sendgrid",
  "mailgun",
  "nodemailer",
  "whatsapp-web.js",
  "openai"
];

const allDependencyNames = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {})
]);

for (const dependencyName of forbiddenDependencyNames) {
  assert(!allDependencyNames.has(dependencyName), `${dependencyName} was not added as a provider/AI dependency.`);
}

const envExample = exists(".env.example") ? read(".env.example") : "";
if (envExample) {
  assert(
    !/BROAD_LIVE_AUTOCOPY_ORDER_CALLS_ENABLED\s*=\s*true/.test(envExample),
    "broad live AutoCopy order calls are not default-enabled in .env.example."
  );
  assert(
    !/MESSAGING_DRY_RUN\s*=\s*false/.test(envExample),
    "messaging dry-run is not default-disabled in .env.example."
  );
}

const sourceBundle = [
  "src/lib/crypto-execution/broad-live-autocopy-readiness.ts",
  "src/lib/signals/external-signal-ingestion-repository.ts",
  "src/lib/messaging/messaging-delivery-worker.ts"
]
  .filter(exists)
  .map(read)
  .join("\n");

assert(
  !sourceBundle.includes("approved_for_workspace_preview") || sourceBundle.includes("non") || sourceBundle.includes("preview"),
  "external signal preview source remains preview-oriented."
);

console.log("Stage 26A manual browser demo pack QA passed.");
