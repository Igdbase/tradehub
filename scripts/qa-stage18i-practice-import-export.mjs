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
const manualBacklog = read("manual-test-backlog.md");
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const exportRoute = read("src/app/api/student/practice/export/route.ts");
const importRoute = read("src/app/api/student/practice/import/playbooks/route.ts");
const practiceClient = read("src/components/student-app/student-practice-client.tsx");
const rules = read("firestore.rules");

const exportFunction = practiceRepo.slice(
  practiceRepo.indexOf("export async function exportStudentPracticeData"),
  practiceRepo.indexOf("export async function importStudentPracticePlaybooks")
);
const importFunction = practiceRepo.slice(
  practiceRepo.indexOf("export async function importStudentPracticePlaybooks"),
  practiceRepo.indexOf("export async function getStudentPracticeSessionDetail")
);
const stage18iSurfaces = [practiceTypes, practiceRepo, exportRoute, importRoute, practiceClient].join("\n");
const stage18iNewSurfaces = [exportRoute, importRoute, practiceClient, exportFunction, importFunction].join("\n");

assert(
  packageJson.scripts?.["stage18i:qa"] === "node scripts/qa-stage18i-practice-import-export.mjs",
  "package.json exposes npm run stage18i:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18I - Practice Import And Export",
    "Add student-owned CSV export",
    "Add import for playbooks only at first.",
    "Do not export raw provider payloads, hidden unrevealed candles, vault refs, credentials, or AutoCopy internals.",
    "Do not add PDF generation or paid storage."
  ],
  "plan.md documents Stage 18I safe practice portability scope."
);

assertIncludesAll(
  practiceTypes,
  [
    "PracticeExportDataset",
    "\"sessions\"",
    "\"orders\"",
    "\"closed_trades\"",
    "\"playbooks\"",
    "\"annotations\"",
    "\"reflections\"",
    "\"backup_json\"",
    "PracticeExportResponse",
    "PracticePlaybookImportResponse"
  ],
  "Practice types include safe export datasets and playbook import response surfaces."
);

assertIncludesAll(
  exportRoute,
  [
    "requireStudent(request)",
    "exportStudentPracticeData(actor, payload)",
    "apiJson",
    "apiError"
  ],
  "Practice export route is protected by signed-in student auth and safe API errors."
);

assertIncludesAll(
  importRoute,
  [
    "requireStudent(request)",
    "importStudentPracticePlaybooks(actor, payload)",
    "{ status: 201 }",
    "apiError"
  ],
  "Practice playbook import route is protected by signed-in student auth and creates via server route."
);

assertIncludesAll(
  exportFunction,
  [
    "parsePracticeExportDataset",
    "listExportSessions(actor)",
    "listExportOrders(actor)",
    "listExportPlaybooks(actor)",
    "listExportAnnotations(actor)",
    "closedOrders.map(closedTradeExportRow)",
    "sessions.map(sessionExportRow)",
    "orders.map(orderExportRow)",
    "playbooks.map(playbookExportRow)",
    "annotations.map(annotationExportRow)",
    "reflections.map(reflectionExportRow)",
    "buildCsv(config.headers, config.rows)",
    "Practice CSV export is student-scoped",
    "excludes hidden candles, provider payloads, credentials, vault refs, and AutoCopy internals"
  ],
  "Repository exports bounded student-owned CSV/JSON from allowlisted safe row mappers."
);

assertIncludesAll(
  importFunction,
  [
    "parseCsvObjects(csv).slice(0, PRACTICE_PLAYBOOK_IMPORT_LIMIT)",
    "deterministicId([\"playbook_import\", actor.workspaceId, actor.studentId",
    "workspaceId: actor.workspaceId",
    "studentId: actor.studentId",
    "normalizeOptionalPracticeMarket(row.market)",
    "normalizeChecklist(row.entryChecklist)",
    "Practice playbook import creates new student-owned playbooks only",
    "cannot overwrite another student's data"
  ],
  "Repository imports playbooks only, sanitizes fields, and scopes writes to the signed-in student."
);

assert(
  !exportFunction.includes("fetchSessionCandles") &&
    !exportFunction.includes("fetchHistoricalCandlesWithCache") &&
    !exportFunction.includes("NormalizedCandle") &&
    !exportFunction.includes("candles:") &&
    !exportFunction.includes("cacheId"),
  "Practice export function does not export hidden candles, historical caches, or candle provider internals."
);

assertIncludesAll(
  practiceClient,
  [
    "Export practice data",
    "Import playbooks",
    "practiceExportOptions",
    "/api/student/practice/export",
    "/api/student/practice/import/playbooks",
    "new Blob([fileBody], { type: response.mimeType })",
    "link.download = response.filename",
    "readPlaybookImportFile",
    "Import playbooks"
  ],
  "/app/practice exposes safe export and playbook import entry points."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18I Practice Import/Export",
    "Export sessions CSV.",
    "Export simulated orders CSV.",
    "Export closed trade summaries CSV.",
    "Export playbooks CSV.",
    "Export annotations/reflections CSV.",
    "Export safe JSON backup",
    "Import playbooks CSV from a file.",
    "Import playbooks CSV from pasted text.",
    "Confirm imported playbooks appear only for the signed-in student."
  ],
  "manual-test-backlog.md records Stage 18I deferred manual QA."
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
  "Firestore browser rules remain deny-by-default for protected practice storage paths."
);

assert(
  !stage18iSurfaces.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18iSurfaces.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18iSurfaces.includes("getExchangeOrderAdapter") &&
    !stage18iSurfaces.includes("private Binance") &&
    !stage18iSurfaces.includes("private Bybit") &&
    !stage18iSurfaces.includes("MetaAPI access token") &&
    !stage18iSurfaces.includes("metaApiToken") &&
    !stage18iSurfaces.includes("brokerPassword") &&
    !stage18iSurfaces.includes("vaultRef") &&
    !stage18iSurfaces.includes("rawProviderPayload"),
  "Stage 18I surfaces do not add forbidden execution/provider/private exchange/MetaAPI credential code."
);

assert(
  !stage18iNewSurfaces.includes("pdf") &&
    !stage18iNewSurfaces.includes("screenshot") &&
    !stage18iNewSurfaces.includes("paid storage") &&
    !stage18iNewSurfaces.includes("WhatsApp") &&
    !stage18iNewSurfaces.includes("SMS") &&
    !stage18iNewSurfaces.includes("newsapi") &&
    !stage18iNewSurfaces.includes("scrape"),
  "Stage 18I does not add PDFs, screenshots, paid storage, messaging, news APIs, or scraping."
);

console.log("Stage 18I practice import/export QA passed.");
