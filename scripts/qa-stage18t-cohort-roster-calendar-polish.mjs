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
const workspaceTypes = read("src/types/workspace-dashboard.ts");
const dashboardMappers = read("src/lib/workspace/dashboard-mappers.ts");
const assignmentSection = read("src/components/workspace/workspace-practice-assignments-section.tsx");
const workspaceClient = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const studentPracticeClient = read("src/components/student-app/student-practice-client.tsx");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const workspaceStudentsRoute = read("src/app/api/workspace/students/route.ts");
const workspaceCohortRoute = read("src/app/api/workspace/practice/cohorts/route.ts");
const rules = read("firestore.rules");

const stage18tModules = [
  workspaceTypes,
  dashboardMappers,
  assignmentSection,
  workspaceClient,
  studentPracticeClient,
  practiceRepo,
  workspaceStudentsRoute,
  workspaceCohortRoute,
  rules
].join("\n");

assert(
  packageJson.scripts?.["stage18t:qa"] === "node scripts/qa-stage18t-cohort-roster-calendar-polish.mjs",
  "package.json exposes npm run stage18t:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18T - Cohort Roster Picker And Assignment Calendar Polish",
    "safe roster picker/search",
    "cohort storage still stores only safe opaque student refs",
    "compact assignment calendar/schedule view",
    "Improve /app/practice task inbox copy"
  ],
  "plan.md documents Stage 18T roster picker and calendar polish."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18T Cohort Roster Picker And Assignment Calendar Polish",
    "Workspace searches loaded students in roster picker.",
    "Confirm cohort saves safe opaque refs only.",
    "Filter schedule by active/draft/archived, cohort, due soon, overdue, and closed.",
    "Overdue but not closed still allows start."
  ],
  "manual-test-backlog.md records Stage 18T manual QA."
);

assertIncludesAll(
  workspaceTypes + dashboardMappers,
  [
    "practiceStudentRef",
    "createHash",
    "student_",
    "mapStudentRecord"
  ],
  "Workspace student surfaces expose a deterministic safe practice student ref for cohort picking."
);

assertIncludesAll(
  workspaceStudentsRoute,
  [
    "requireInfluencer(request)",
    "listWorkspaceStudents",
    "parseWorkspaceStudentRequest"
  ],
  "Roster picker uses the existing protected workspace students API surface."
);

assertIncludesAll(
  assignmentSection,
  [
    "Roster picker",
    "Search loaded students",
    "Selected members",
    "addStudentToCohort",
    "removeStudentFromCohort",
    "practiceStudentRef",
    "buildCohortPayload",
    "studentRefs: form.studentRefs"
  ],
  "Workspace cohort UI has picker/search, member chips, add/remove controls, and safe ref payloads."
);

assert(
  !assignmentSection.includes("studentRefs.split") &&
    !assignmentSection.includes("placeholder=\"student_ refs"),
  "Cohort UI no longer requires manually typing opaque student refs."
);

assertIncludesAll(
  workspaceClient + assignmentSection,
  [
    "students={students?.students ?? []}",
    "Assignment calendar",
    "scheduleFilters",
    "scheduleState",
    "due_soon",
    "overdue",
    "closed",
    "All statuses",
    "All cohorts",
    "All timing"
  ],
  "Workspace assignment dashboard has calendar/schedule filters for status, cohort, and timing."
);

assertIncludesAll(
  studentPracticeClient,
  [
    "Practice Task Inbox",
    "due soon and remains open",
    "overdue but still open",
    "not available yet",
    "closed for new starts",
    "Start assignment",
    "Start resubmission"
  ],
  "Student task inbox copy explains due soon, overdue-open, not-available, closed, and resubmission states."
);

assertIncludesAll(
  practiceRepo,
  [
    "assertAssignmentStartAllowed",
    "practice_assignment_not_assigned",
    "practice_assignment_not_available",
    "practice_assignment_closed",
    "assignmentTargetsStudent",
    "assignmentTaskAvailabilityStatus"
  ],
  "Server-side assignment start gates remain authoritative after UI polish."
);

assertIncludesAll(
  rules,
  [
    "practice_cohorts",
    "practice_assignments",
    "allow read, write: if false"
  ],
  "Firestore browser rules remain deny-by-default for cohort and assignment storage."
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
  "uploadBytes(",
  "pdfkit",
  "puppeteer",
  "sendEmail",
  "sendSms",
  "whatsapp"
];
const dangerousHits = dangerousPatterns.filter((pattern) => stage18tModules.includes(pattern));

assert(
  dangerousHits.length === 0,
  `Stage 18T does not add forbidden execution/provider/credential, upload, screenshot, PDF, or messaging surfaces.${dangerousHits.length ? ` Hits: ${dangerousHits.join(", ")}` : ""}`
);

console.log("Stage 18T cohort roster picker and assignment calendar polish QA passed.");
