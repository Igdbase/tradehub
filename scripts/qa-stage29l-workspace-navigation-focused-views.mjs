import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};

const includesAll = (source, values, message) => {
  const missing = values.filter((value) => !source.includes(value));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
};

const excludesAll = (source, values, message) => {
  const found = values.filter((value) => source.includes(value));
  assert(found.length === 0, `${message}${found.length ? ` Found: ${found.join(", ")}` : ""}`);
};

const packageJson = JSON.parse(read("package.json"));
const workspaceClient = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const workspaceHome = read("src/components/workspace/workspace-overview.tsx");
const courseVisibility = read("src/components/workspace/course-visibility-section.tsx");
const signals = read("src/components/workspace/signal-management-section.tsx");
const studentManagement = read("src/components/workspace/student-management-section.tsx");
const practiceInsights = read("src/components/workspace/workspace-practice-insights-section.tsx");
const adminAuditPreview = read("src/components/admin/audit-log-preview.tsx");
const browser = read("tests/browser/workspace-admin-e2e.spec.mjs");
const docs = [
  "plan.md",
  "complaint-resolution-roadmap.md",
  "manual-test-backlog.md",
  "manual-demo-qa.md",
  "prompt/promptsumary.md",
  "docs/handoffs/tradehub-handoff-2026-08-30.md"
].map(read).join("\n");

assert(
  packageJson.scripts?.["stage29l:qa"] === "node scripts/qa-stage29l-workspace-navigation-focused-views.mjs",
  "package.json exposes npm run stage29l:qa."
);

[
  "src/app/(influencer)/workspace/page.tsx",
  "src/app/(influencer)/workspace/students/page.tsx",
  "src/app/(influencer)/workspace/signals/page.tsx",
  "src/app/(influencer)/workspace/courses/page.tsx",
  "src/app/(influencer)/workspace/courses/hub/page.tsx",
  "src/app/(influencer)/workspace/practice/page.tsx",
  "src/app/(influencer)/workspace/copier/page.tsx",
  "src/app/(influencer)/workspace/billing/page.tsx",
  "src/app/(influencer)/workspace/branding/page.tsx",
  "src/app/(influencer)/workspace/enterprise/page.tsx"
].forEach((relativePath) => assert(exists(relativePath), `${relativePath} exists.`));

includesAll(
  workspaceClient,
  [
    "export type WorkspaceView",
    '"home"',
    '"students"',
    '"signals"',
    '"courses"',
    '"practice"',
    '"copier"',
    '"billing"',
    '"branding"',
    '"enterprise"',
    "workspaceNavItems",
    "data-testid=\"workspace-focused-navigation\"",
    "data-testid=\"workspace-focused-nav-scroll\"",
    "const navRef = useRef<HTMLElement | null>(null)",
    "const activeLinkRef = useRef<HTMLAnchorElement | null>(null)",
    "nav.scrollLeft +=",
    "max-w-full overscroll-x-contain flex gap-2 overflow-x-auto",
    "aria-current={isActive ? \"page\" : undefined}",
    "data-testid={`workspace-nav-${item.view}`}",
    "WorkspaceViewFrame",
    "activeView === \"students\"",
    "activeView === \"signals\"",
    "activeView === \"courses\"",
    "activeView === \"practice\"",
    "activeView === \"copier\"",
    "activeView === \"billing\"",
    "activeView === \"branding\"",
    "activeView === \"enterprise\""
  ],
  "Workspace client defines a shared focused navigation shell and per-route active views."
);

includesAll(
  workspaceClient,
  [
    "await Promise.all([loadDashboard(), loadSignals(), loadExternalSignalPreview(), loadCryptoExecution()]);",
    "setMessage(\"Student CRM support state updated.\");\n      await Promise.all([loadDashboard(), loadStudents()]);"
  ],
  "Signal and student support mutations do not refresh unrelated Practice or Billing data."
);

excludesAll(
  workspaceClient,
  [
    "setMessage(\"Student CRM support state updated.\");\n      await Promise.all([loadDashboard(), loadBillingOverview()]);",
    "response.cryptoRoutingSummary?.routed[\n\\s\\S]+loadPracticeAssignments()"
  ],
  "Old broad post-mutation refresh snippets stay absent."
);

const createSignalStart = workspaceClient.indexOf("async function createSignal");
const updateSupportStart = workspaceClient.indexOf("async function updateStudentSupportState");
const createAssignmentStart = workspaceClient.indexOf("async function createPracticeAssignment");
assert(createSignalStart > -1 && updateSupportStart > createSignalStart, "Signal and student support mutation functions are discoverable.");
const createSignalBody = workspaceClient.slice(createSignalStart, updateSupportStart);
const updateSupportBody = workspaceClient.slice(updateSupportStart, createAssignmentStart);
assert(!/loadPractice[A-Za-z]*\(/.test(createSignalBody), "Signal mutation body does not call Practice loaders.");
assert(!updateSupportBody.includes("loadBillingOverview("), "Student support mutation body does not call Billing loaders.");

includesAll(
  workspaceClient,
  [
    "/api/workspace/dashboard",
    "/api/workspace/students",
    "/api/workspace/signals",
    "/api/workspace/signals/external-preview",
    "/api/workspace/practice/insights",
    "/api/workspace/practice/assignments",
    "/api/workspace/practice/assignments/feedback",
    "/api/workspace/crypto-execution/overview",
    "/api/workspace/billing/overview"
  ],
  "Focused workspace views retain the existing protected API responsibilities."
);

assert(!workspaceClient.includes("refreshAll"), "Workspace client no longer has a refresh-all path for every section.");
assert(!workspaceClient.includes("CryptoExecutionOpsSection"), "Focused workspace Copier route does not render the old deep execution dashboard.");
assert(!workspaceClient.includes("href: \"#"), "Workspace focused navigation uses real routes rather than anchor links.");
assert(
  /useEffect\(\(\) => \{\n\s+void loadDashboard\(\);\n\s+\}, \[loadDashboard\]\);/.test(workspaceClient),
  "Initial workspace load fetches dashboard essentials only."
);

includesAll(
  workspaceHome,
  [
    "data-testid=\"workspace-home-summary\"",
    "Workspace home",
    "Workspace snapshot",
    "/workspace/students",
    "/workspace/signals",
    "/workspace/practice",
    "/workspace/billing"
  ],
  "Workspace home is a concise summary and next-actions view."
);
excludesAll(
  workspaceHome,
  [
    "StudentManagementSection",
    "SignalManagementSection",
    "CourseVisibilitySection",
    "WorkspacePracticeAssignmentsSection",
    "ExternalSignalPreviewSection",
    "WorkspaceEnterpriseIntegrationRequestsSection",
    "Stage 20A",
    "source-QA",
    "vault",
    "canary",
    "worker"
  ],
  "Workspace home does not import or render detailed workspace sections or implementation copy."
);

includesAll(
  courseVisibility,
  ["/workspace/courses/hub", "respect each student&apos;s current access"],
  "Courses focused view links to the preserved Course Hub without exposing stage wording."
);

excludesAll(
  `${signals}\n${studentManagement}\n${practiceInsights}`,
  [
    "Stage 16",
    "source-QA",
    "verified API",
    "direct client Firestore",
    "provider payloads",
    "credentials",
    "execution internals",
    "AutoCopy internals",
    "MetaAPI connections",
    "testnet proof",
    "bounded sample"
  ],
  "Workspace focused components avoid owner-facing engineering and private-data wording."
);

includesAll(
  adminAuditPreview,
  ["maskOpsReference(event.actorUid, \"actor\")", "maskOpsReference(event.targetId, \"target\")"],
  "Admin audit preview masks actor and target refs created by focused workspace mutations."
);
assert(!adminAuditPreview.includes(" updated {event.targetId}"), "Admin audit preview does not render raw target ids.");

includesAll(
  browser,
  [
    "focusedWorkspaceRoutes",
    "workspaceApiCollector",
    "expectActiveWorkspaceNavVisible",
    "expectNoDocumentHorizontalOverflow",
    "workspace-focused-nav-scroll",
    "elementFromPoint",
    "workspace focused navigation is visible and usable across desktop tablet and mobile deep links",
    "workspace focused routes fetch only active-view data",
    "workspace student support mutation stays scoped to student data",
    "workspace signal publication mutation stays scoped to signal readiness",
    "width: 1440",
    "width: 900",
    "width: 390",
    "/workspace/students",
    "/workspace/signals",
    "/workspace/courses",
    "/workspace/practice",
    "/workspace/copier",
    "/workspace/billing",
    "/workspace/branding",
    "/workspace/enterprise",
    "goBack",
    "goForward",
    "workspace home stays summary-only",
    "not.toContainText(/Workspace-scoped students",
    "not.toContain(\"GET /api/workspace/students\")",
    "not.toContain(\"GET /api/workspace/signals\")",
    "not.toContain(\"GET /api/workspace/practice/insights\")",
    "not.toContain(\"GET /api/workspace/billing/overview\")",
    "Student support mutation must not fetch billing overview",
    "Student support mutation must not fetch practice insights",
    "Student support mutation must not fetch signals",
    "Signal mutation must not fetch practice insights",
    "Signal mutation must not fetch practice assignments",
    "Signal mutation must not fetch practice feedback",
    "Signal mutation must not fetch students",
    "Signal mutation must not fetch billing",
    "signInAs(page, \"workspace\", \"/workspace/signals\")",
    "/api/workspace/signals/external-preview/publish"
  ],
  "Workspace/Admin browser coverage verifies responsive nav visibility, direct routes, scoped fetches, mutations, and Stage 29K publication from Signals."
);

excludesAll(
  browser,
  [
    "page.request.post(\"/api/admin/signals/external-ingestion/sources\"",
    "page.request.post('/api/admin/signals/external-ingestion/sources'"
  ],
  "Stage 29K browser coverage still creates Telegram sources through the visible Admin form."
);

includesAll(
  docs,
  [
    "TH-2026-09-08-STAGE29L-WORKSPACE-NAVIGATION-OWNER-ACCEPTANCE-CLOSURE-HANDOFF",
    "Stage 29L",
    "owner-accepted, closed, and frozen",
    "focused Workspace navigation",
    "concise Home",
    "all nine responsibility views",
    "direct routes",
    "browser history",
    "scoped loading",
    "responsive navigation",
    "Stage 29M remains unstarted",
    "Stage 29K is owner-accepted, closed, and frozen",
    "Stage 29J Signals Feed And TradeHub Signal Routing is owner-accepted, closed, and frozen",
    "Stage 29I is owner-accepted, closed, and frozen",
    "Stage 29G external Binance/Bybit acceptance remains deferred",
    "Stage 29H remains deferred/unstarted"
  ],
  "Authoritative documents record Stage 29L status while preserving frozen/deferred stages."
);

excludesAll(
  docs,
  [
    "Stage 29L Workspace Navigation And Focused Views is implemented/source-QA ready and awaiting adviser review",
    "Stage 29L is implemented/source-QA ready pending adviser review",
    "Stage 29L owner acceptance remains pending",
    "Status: implemented/source-QA ready and awaiting adviser review. Owner acceptance is not claimed."
  ],
  "Authoritative documents no longer describe Stage 29L as pending owner/adviser acceptance."
);

[
  "stage29k:closure:qa",
  "stage29k:qa",
  "stage29j:closure:qa",
  "stage29i:closure:qa",
  "stage29f:closure:qa",
  "stage29l:closure:qa",
  "browser:qa:workspace-admin",
  "browser:qa:student"
].forEach((scriptName) => {
  assert(Boolean(packageJson.scripts?.[scriptName]), `${scriptName} remains wired.`);
});

console.log("Stage 29L workspace navigation and focused views source QA passed.");
