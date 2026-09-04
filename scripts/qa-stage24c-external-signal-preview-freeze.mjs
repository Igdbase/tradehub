import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function walkFiles(directory, matcher) {
  const entries = fs.readdirSync(path.join(repoRoot, directory), { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const relativePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(relativePath, matcher));
    } else if (matcher(relativePath)) {
      files.push(relativePath);
    }
  });

  return files;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} is missing ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

const packageJson = JSON.parse(read("package.json"));
const types = read("src/types/external-signal-ingestion.ts");
const repository = read("src/lib/signals/external-signal-ingestion-repository.ts");
const workspaceRoute = read("src/app/api/workspace/signals/external-preview/route.ts");
const workspaceComponent = read("src/components/workspace/external-signal-preview-section.tsx");
const workspaceClient = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const adminPanel = read("src/components/admin/external-signal-ingestion-panel.tsx");
const rules = read("firestore.rules");
const plan = read("plan.md");
const backlog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");

assert(
  packageJson.scripts?.["stage24c:qa"] === "node scripts/qa-stage24c-external-signal-preview-freeze.mjs",
  "package.json must expose stage24c:qa"
);

[
  "WorkspaceExternalSignalPreviewRecord",
  "WorkspaceExternalSignalPreviewResponse",
  "previewId",
  "sourceLabel",
  "maskedSourceRef",
  "approved_for_workspace_preview"
].forEach((needle) => assertIncludes(types, needle, "external signal workspace preview types"));

[
  "getWorkspaceExternalSignalPreview",
  "VerifiedInfluencer",
  ".where(\"status\", \"==\", \"approved_for_workspace_preview\")",
  "candidate.workspaceId !== actor.workspaceId",
  "mapWorkspaceExternalSignalPreview",
  "createExternalSignalSafeRef(candidate.candidateId, \"preview\")",
  "External signal previews are read-only",
  "not TradeHub signals",
  "not AutoCopy executable"
].forEach((needle) => assertIncludes(repository, needle, "external signal preview repository"));

[
  "adminNote:",
  "reviewedBy:",
  "sourceSafeRef:",
  "fingerprint:"
].forEach((needle) => {
  const previewMapperStart = repository.indexOf("function mapWorkspaceExternalSignalPreview");
  const previewMapperEnd = repository.indexOf("async function findSourceAllowlistBySafeRef");
  const previewMapper = repository.slice(previewMapperStart, previewMapperEnd);
  assertNotIncludes(previewMapper, needle, "workspace preview mapper");
});

assertIncludes(workspaceRoute, "requireInfluencer", "workspace external preview route");
assertIncludes(workspaceRoute, "getWorkspaceExternalSignalPreview", "workspace external preview route");
assertNotIncludes(workspaceRoute, "requireSuperAdmin", "workspace external preview route");
assertNotIncludes(workspaceRoute, "requireStudent", "workspace external preview route");
assertNotIncludes(workspaceRoute, "createWorkspaceSignal", "workspace external preview route");
assertNotIncludes(workspaceRoute, "routeWorkspaceSignalForAutoCopy", "workspace external preview route");

[
  "ExternalSignalPreviewSection",
  "External preview only",
  "Not a TradeHub signal",
  "Not student-visible",
  "Not AutoCopy executable",
  "Read-only",
  "No execution",
  "No approved external preview candidates match these filters",
  "Rejected, quarantined, duplicate, and unreviewed",
  "publish, convert, route, or order action"
].forEach((needle) => assertIncludes(workspaceComponent, needle, "workspace external preview component"));

[
  "onCreateSignal",
  "requestWorkspaceDashboardApi<WorkspaceSignalMutationResponse>",
  "/api/workspace/signals\",",
  "method: \"POST\"",
  "routeWorkspaceSignalForAutoCopy",
  "AutoCopyWorker",
  "placeOrder",
  "runCryptoExecution"
].forEach((needle) => assertNotIncludes(workspaceComponent, needle, "workspace external preview component"));

[
  "ExternalSignalPreviewSection",
  "WorkspaceExternalSignalPreviewResponse",
  "/api/workspace/signals/external-preview",
  "loadExternalSignalPreview",
  "externalSignalPreviewErrorMessage"
].forEach((needle) => assertIncludes(workspaceClient, needle, "workspace page client external preview wiring"));

assertIncludes(adminPanel, "approve_for_workspace_preview", "Super Admin moderation queue remains intact");
assertIncludes(adminPanel, "No AutoCopy execution", "Super Admin panel preview boundary copy");

[
  "match /external_signal_sources/{documentId}",
  "match /external_signal_candidates/{documentId}",
  "match /workspaces/{workspaceId}/external_signal_sources/{documentId}",
  "match /workspaces/{workspaceId}/external_signal_candidates/{documentId}",
  "allow read, write: if false"
].forEach((needle) => assertIncludes(rules, needle, "firestore external ingestion deny rules"));

const stage24cBundle = [
  types,
  repository,
  workspaceRoute,
  workspaceComponent,
  workspaceClient,
  adminPanel
].join("\n");

[
  "node-telegram-bot-api",
  "new Telegraf",
  "TelegramBot",
  "telegramBot",
  "webhookReceiver",
  "rawMessage",
  "rawTelegram",
  "chatId",
  "telegramChat",
  "telegramUsername",
  "phoneNumber",
  "botToken",
  "webhookSecret",
  "providerPayload",
  "vaultRef",
  "providerSecret",
  "publishWorkspaceSignal",
  "routeWorkspaceSignalForAutoCopy"
].forEach((needle) => assertNotIncludes(stage24cBundle, needle, "Stage 24C external preview source bundle"));

const studentFiles = walkFiles("src/app", (relativePath) =>
  relativePath.includes("/api/student/") && /\.(ts|tsx)$/.test(relativePath)
).concat(walkFiles("src/components/student-app", (relativePath) => /\.(ts|tsx)$/.test(relativePath)));
const studentBundle = studentFiles.map(read).join("\n");

[
  "ExternalSignalPreview",
  "external-preview",
  "external-ingestion",
  "approved_for_workspace_preview"
].forEach((needle) => assertNotIncludes(studentBundle, needle, "student-facing source bundle"));

[
  "Stage 24C",
  "TH-2026-08-22-STAGE24C-EXTERNAL-SIGNAL-INGESTION-MVP-FINAL-HANDOFF"
].forEach((needle) => {
  assertIncludes(plan, needle, "plan.md");
  assertIncludes(backlog, needle, "manual-test-backlog.md");
  assertIncludes(promptSummary, needle, "prompt/promptsumary.md");
});

[
  "Practice/backtesting MVP remains source-QA frozen at Stage 18X",
  "Course/lesson MVP remains source-QA frozen at Stage 19I",
  "Ops/CRM/payments/support MVP remains source-QA frozen at Stage 20D",
  "Manual Journal MVP remains source-QA frozen at Stage 21D",
  "Messaging/reminders MVP remains source-QA frozen at Stage 23D"
].forEach((needle) => assertIncludes(promptSummary, needle, "prompt/promptsumary.md frozen foundation summary"));

console.log("Stage 24C external signal preview integration and ingestion MVP freeze QA passed.");
