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

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert(startIndex >= 0, `Found ${start}.`);
  assert(endIndex > startIndex, `Found ${end} after ${start}.`);

  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const practiceTypes = read("src/types/practice.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const workspaceRoute = read("src/app/api/workspace/practice/assignments/route.ts");
const studentAssignmentsRoute = read("src/app/api/student/practice/assignments/route.ts");
const studentStartRoute = read("src/app/api/student/practice/assignments/[assignmentId]/start/route.ts");
const workspaceClient = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const workspaceAssignmentSection = read("src/components/workspace/workspace-practice-assignments-section.tsx");
const studentPracticeClient = read("src/components/student-app/student-practice-client.tsx");
const rules = read("firestore.rules");

const assignmentTypes = sliceBetween(
  practiceTypes,
  "export interface PracticeAssignmentSuggestedPlaybook",
  "export interface PracticeSessionReflection"
);
const workspaceAssignmentListFunction = sliceBetween(
  practiceRepo,
  "export async function listWorkspacePracticeAssignments",
  "export async function createWorkspacePracticeAssignment"
);
const assignmentStartFunction = sliceBetween(
  practiceRepo,
  "export async function startStudentPracticeAssignment",
  "export async function createStudentPracticePlaybook"
);
const stage18pModules = [
  practiceTypes,
  practiceRepo,
  workspaceRoute,
  studentAssignmentsRoute,
  studentStartRoute,
  workspaceClient,
  workspaceAssignmentSection,
  studentPracticeClient
].join("\n");

assert(
  packageJson.scripts?.["stage18p:qa"] === "node scripts/qa-stage18p-workspace-practice-assignments.mjs",
  "package.json exposes npm run stage18p:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18P - Workspace Practice Assignments And Drills",
    "workspace-owned practice assignment model",
    "Starting an assignment creates a student-owned practice session with safe assignment metadata snapshot only.",
    "Workspace assignment progress returns aggregate counts only",
    "Do not expose raw student trades, journal notes, hidden candles"
  ],
  "plan.md documents Stage 18P assignment scope and privacy boundaries."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18P Workspace Practice Assignments And Drills",
    "Workspace creates an active BTCUSDT practice assignment.",
    "Student sees active assignment on `/app/practice`.",
    "Student starts a terminal session from the assignment.",
    "Confirm assignment progress uses masked recent completions only.",
    "Confirm workspace cannot see raw student trades"
  ],
  "manual-test-backlog.md records Stage 18P manual QA."
);

assertIncludesAll(
  assignmentTypes,
  [
    "PracticeAssignmentStatus",
    "PracticeAssignmentRecord",
    "PracticeSessionAssignmentSnapshot",
    "WorkspacePracticeAssignmentProgressSummary",
    "WorkspacePracticeAssignmentSummary",
    "WorkspacePracticeAssignmentsResponse",
    "WorkspacePracticeAssignmentMutationResponse",
    "StudentPracticeAssignmentsResponse",
    "StudentPracticeAssignmentStartResponse",
    "maskedRecentCompletions",
    "assignedCount",
    "startedCount",
    "completedCount",
    "averagePnl",
    "averageR"
  ],
  "Practice types define assignment setup, safe session snapshots, and aggregate progress surfaces."
);

assertIncludesAll(
  practiceTypes,
  [
    "WorkspacePracticeRecentCompletedSessionInsight",
    "maskedSessionRef",
    "maskedStudentId"
  ],
  "Assignment progress reuses masked workspace completion references."
);

assert(
  !assignmentTypes.includes("orders: PracticeOrderSummary[]") &&
    !assignmentTypes.includes("annotations: PracticeAnnotationSummary[]") &&
    !assignmentTypes.includes("drawings: PracticeAnnotationSummary[]") &&
    !assignmentTypes.includes("reflection") &&
    !assignmentTypes.includes("candles:") &&
    !assignmentTypes.includes("journal"),
  "Assignment response types do not expose raw orders, notes, drawings, reflections, candles, or journal entries."
);

assertIncludesAll(
  practiceRepo,
  [
    "normalizePracticeAssignmentMutationPayload",
    "listWorkspacePracticeAssignments",
    "createWorkspacePracticeAssignment",
    "updateWorkspacePracticeAssignment",
    "listStudentPracticeAssignments",
    "startStudentPracticeAssignment",
    "buildWorkspaceAssignmentSummary",
    "WORKSPACE_PRACTICE_ASSIGNMENT_LIMIT",
    "workspaces/${workspaceId}/practice_assignments",
    "workspaces/${actor.workspaceId}/practice_assignments",
    "assignmentSnapshot",
    "maskedRecentCompletions",
    "Workspace assignment progress never returns raw student trades, notes, candles, annotations, reflections, journal entries"
  ],
  "Practice repository supports workspace-owned assignments and aggregate-only progress."
);

assert(
    workspaceAssignmentListFunction.includes("aggregate progress only") &&
    workspaceAssignmentListFunction.includes("Workspace assignment progress never returns raw student trades, notes, candles, annotations, reflections, journal entries") &&
    !workspaceAssignmentListFunction.includes("orders: assignmentOrders") &&
    !workspaceAssignmentListFunction.includes("annotations:") &&
    !workspaceAssignmentListFunction.includes("reflection:") &&
    !workspaceAssignmentListFunction.includes("fetchSessionCandles") &&
    !workspaceAssignmentListFunction.includes("fetchHistoricalCandlesWithCache"),
  "Workspace assignment listing does not return raw order arrays, annotations, reflections, or candles."
);

assertIncludesAll(
  assignmentStartFunction,
  [
    "getWorkspacePracticeAssignmentSnapshot",
    "assertAssignmentStartAllowed",
    "createStudentPracticeSession(actor",
    "assignmentSnapshot",
    "Workspace users will see aggregate assignment progress only.",
    "does not connect to broker, exchange, AutoCopy, or provider execution"
  ],
  "Student assignment start route creates a student-owned practice session with safe assignment snapshot."
);

assertIncludesAll(
  workspaceRoute,
  [
    "requireInfluencer(request)",
    "listWorkspacePracticeAssignments",
    "createWorkspacePracticeAssignment",
    "updateWorkspacePracticeAssignment",
    "export async function GET",
    "export async function POST",
    "export async function PATCH"
  ],
  "Workspace assignment API protects list/create/update/archive with influencer auth."
);

assertIncludesAll(
  studentAssignmentsRoute,
  [
    "requireStudent(request)",
    "listStudentPracticeAssignments",
    "export async function GET"
  ],
  "Student assignment list API protects active assignments with student auth."
);

assertIncludesAll(
  studentStartRoute,
  [
    "requireStudent(request)",
    "startStudentPracticeAssignment",
    "export async function POST"
  ],
  "Student assignment start API protects session creation with student auth."
);

assertIncludesAll(
  workspaceClient,
  [
    "WorkspacePracticeAssignmentsSection",
    "WorkspacePracticeAssignmentsResponse",
    "/api/workspace/practice/assignments",
    "loadPracticeAssignments",
    "createPracticeAssignment",
    "archivePracticeAssignment"
  ],
  "/workspace loads and mutates practice assignments through protected workspace APIs."
);

assertIncludesAll(
  workspaceAssignmentSection,
  [
    "Practice Assignments",
    "Workspace drills",
    "student trades, notes, candles, and reflections stay private",
    "Assigned",
    "Started",
    "Completed",
    "Avg P&L",
    "maskedRecentCompletions",
    "maskedStudentId",
    "Archive assignment",
    "Create assignment"
  ],
  "Workspace assignment UI creates drills and renders aggregate-only progress."
);

assertIncludesAll(
  studentPracticeClient,
  [
    "StudentPracticeAssignmentsResponse",
    "StudentPracticeAssignmentStartResponse",
    "/api/student/practice/assignments",
    "/api/student/practice/assignments/${encodeURIComponent(assignmentId)}/start",
    "Practice Task Inbox",
    "Educators see aggregate progress only",
    "Start assignment",
    "Continue session"
  ],
  "/app/practice shows active assignments and starts sessions through protected student APIs."
);

assertIncludesAll(
  rules,
  [
    "match /workspaces/{workspaceId}/practice_assignments/{documentId}",
    "practice_sessions",
    "practice_orders",
    "practice_annotations",
    "practice_bookmarks",
    "allow read, write: if false;"
  ],
  "Firestore browser rules deny direct assignment and protected practice storage access."
);

assert(
  !stage18pModules.includes("getForexDemoOrderPlacementAdapter") &&
    !stage18pModules.includes("getForexLiveCanaryOrderPlacementAdapter") &&
    !stage18pModules.includes("getExchangeOrderAdapter") &&
    !stage18pModules.includes("submitOrder(") &&
    !stage18pModules.includes("postTrade(") &&
    !stage18pModules.includes("private Binance") &&
    !stage18pModules.includes("private Bybit") &&
    !stage18pModules.includes("brokerPassword") &&
    !stage18pModules.includes("metaApiToken") &&
    !stage18pModules.includes("vaultRef") &&
    !stage18pModules.includes("rawProviderPayload") &&
    !stage18pModules.includes("apiSecret") &&
    !stage18pModules.includes("autocopy_internal"),
  "Stage 18P does not add forbidden execution/provider/private exchange/MetaAPI credential or AutoCopy internals."
);

assert(
  !stage18pModules.includes("jsPDF") &&
    !stage18pModules.includes("html2canvas") &&
    !stage18pModules.includes("captureScreenshot") &&
    !stage18pModules.includes("uploadBytes") &&
    !stage18pModules.includes("paid storage") &&
    !stage18pModules.includes("paid external") &&
    !stage18pModules.includes("twilio") &&
    !stage18pModules.includes("sendgrid"),
  "Stage 18P does not add PDFs, screenshots/uploads, paid storage/external services, or messaging services."
);

console.log("Stage 18P workspace practice assignments and drills QA passed.");
