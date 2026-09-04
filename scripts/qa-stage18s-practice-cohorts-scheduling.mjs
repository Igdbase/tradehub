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
const workspaceCohortRoute = read("src/app/api/workspace/practice/cohorts/route.ts");
const workspaceAssignmentRoute = read("src/app/api/workspace/practice/assignments/route.ts");
const studentAssignmentRoute = read("src/app/api/student/practice/assignments/route.ts");
const studentAssignmentStartRoute = read("src/app/api/student/practice/assignments/[assignmentId]/start/route.ts");
const studentResubmissionRoute = read("src/app/api/student/practice/assignments/resubmissions/start/route.ts");
const workspaceClient = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const assignmentSection = read("src/components/workspace/workspace-practice-assignments-section.tsx");
const studentPracticeClient = read("src/components/student-app/student-practice-client.tsx");
const rules = read("firestore.rules");

const cohortTypes = sliceBetween(
  practiceTypes,
  "export type PracticeCohortStatus",
  "export interface PracticeInstructorFeedbackRubric"
);
const cohortRepository = sliceBetween(
  practiceRepo,
  "function mapPracticeCohort",
  "async function getWorkspacePracticeAssignmentSnapshot"
);
const studentEligibility = sliceBetween(
  practiceRepo,
  "function studentRefForPractice",
  "async function listStudentInstructorFeedback"
);
const stage18sModules = [
  practiceTypes,
  practiceRepo,
  workspaceCohortRoute,
  workspaceAssignmentRoute,
  studentAssignmentRoute,
  studentAssignmentStartRoute,
  studentResubmissionRoute,
  workspaceClient,
  assignmentSection,
  studentPracticeClient,
  rules
].join("\n");

assert(
  packageJson.scripts?.["stage18s:qa"] === "node scripts/qa-stage18s-practice-cohorts-scheduling.mjs",
  "package.json exposes npm run stage18s:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18S - Practice Cohorts, Assignment Scheduling, And Student Task Inbox",
    "workspace-owned practice cohorts",
    "availability start, due date, optional close date, and target cohorts",
    "Block assignment starts",
    "Practice Task Inbox"
  ],
  "plan.md documents Stage 18S cohort, scheduling, and task inbox scope."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18S Practice Cohorts, Assignment Scheduling, And Student Task Inbox",
    "Workspace creates a practice cohort.",
    "Student in cohort sees assignment in Practice Task Inbox.",
    "Before availability start, student cannot start.",
    "After close date, student cannot start.",
    "Workspace sees aggregate-safe cohort progress only"
  ],
  "manual-test-backlog.md records Stage 18S manual QA."
);

assertIncludesAll(
  cohortTypes,
  [
    "PracticeCohortStatus",
    "PracticeAssignmentTaskStatus",
    "PracticeCohortRecord",
    "PracticeCohortSummary"
  ],
  "Practice types define cohorts and task inbox status types."
);

assertIncludesAll(
  practiceTypes,
  [
    "availabilityStartDate",
    "closeDate",
    "targetCohortIds",
    "overdueCount",
    "WorkspacePracticeCohortMutationResponse"
  ],
  "Practice types define scheduling fields, aggregate overdue progress, and cohort mutation responses."
);

assertIncludesAll(
  cohortRepository,
  [
    "mapPracticeCohort",
    "practice_cohorts",
    "normalizePracticeCohortMutationPayload",
    "studentRefs",
    "Practice cohort stores workspace-owned opaque student refs only"
  ],
  "Practice repository stores workspace-owned cohorts with bounded opaque student refs."
);

assertIncludesAll(
  practiceRepo,
  [
    "createWorkspacePracticeCohort",
    "updateWorkspacePracticeCohort",
    "normalizeStudentRefs",
    "entry.startsWith(\"student_\")",
    "normalizeCohortIds",
    "availabilityStartDate",
    "closeDate",
    "targetCohortIds",
    "assignmentTargetsStudent",
    "assignmentAvailabilityStatus",
    "assignmentTaskAvailabilityStatus",
    "assertAssignmentStartAllowed",
    "practice_assignment_not_assigned",
    "practice_assignment_not_available",
    "practice_assignment_closed",
    "overdueCount"
  ],
  "Practice repository enforces cohort targeting and schedule windows server-side."
);

assert(
  studentEligibility.includes("startStudentPracticeAssignment") &&
    studentEligibility.includes("startStudentPracticeAssignmentResubmission") &&
    studentEligibility.match(/assertAssignmentStartAllowed/g)?.length >= 2 &&
    studentEligibility.includes("due_soon") &&
    studentEligibility.includes("overdue") &&
    studentEligibility.includes("closed") &&
    !studentEligibility.includes("practice_orders") &&
    !studentEligibility.includes("practice_annotations") &&
    !studentEligibility.includes("account_linked_trade_ledger"),
  "Student assignment and resubmission starts share schedule/cohort gates and avoid private practice internals."
);

assertIncludesAll(
  workspaceCohortRoute,
  [
    "requireInfluencer(request)",
    "createWorkspacePracticeCohort",
    "updateWorkspacePracticeCohort",
    "listWorkspacePracticeAssignments"
  ],
  "Workspace cohort route is influencer-protected and reuses safe assignment overview response."
);

assertIncludesAll(
  studentAssignmentRoute + studentAssignmentStartRoute + studentResubmissionRoute,
  [
    "requireStudent(request)",
    "listStudentPracticeAssignments",
    "startStudentPracticeAssignment",
    "startStudentPracticeAssignmentResubmission"
  ],
  "Student assignment task inbox and start routes remain signed-in student protected."
);

assertIncludesAll(
  workspaceClient + assignmentSection,
  [
    "/api/workspace/practice/cohorts",
    "Practice cohorts",
    "Roster picker",
    "Selected members",
    "availabilityStartDate",
    "closeDate",
    "Target cohorts",
    "Overdue",
    "Assigned",
    "Resub req"
  ],
  "Workspace UI exposes cohort management, scheduling fields, target cohorts, and aggregate-safe counts."
);

assertIncludesAll(
  studentPracticeClient,
  [
    "Practice Task Inbox",
    "not_available",
    "overdue",
    "closed",
    "Start assignment",
    "Start resubmission",
    "Educators see aggregate progress only"
  ],
  "Student practice UI renders task inbox states and keeps private practice copy."
);

assertIncludesAll(
  rules,
  [
    "practice_assignments",
    "practice_cohorts",
    "allow read, write: if false"
  ],
  "Firestore browser rules deny direct assignment and cohort storage access."
);

const dangerousPatterns = [
  "binance-adapter",
  "bybit-adapter",
  "metaapi-adapter",
  "submitOrder(",
  "placeOrder(",
  "loadForexMetaApiToken",
  "brokerPassword:",
  "metaApiToken:",
  "vaultRef:",
  "rawProviderPayload:",
  "sendEmail",
  "sendSms",
  "whatsapp",
  "uploadBytes(",
  "pdfkit",
  "puppeteer"
];
const dangerousHits = dangerousPatterns.filter((pattern) => stage18sModules.includes(pattern));

assert(
  dangerousHits.length === 0,
  `Stage 18S does not add forbidden execution/provider/credential, messaging, upload, screenshot, or PDF surfaces.${dangerousHits.length ? ` Hits: ${dangerousHits.join(", ")}` : ""}`
);

console.log("Stage 18S practice cohorts, scheduling, and student task inbox QA passed.");
