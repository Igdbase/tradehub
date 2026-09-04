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
const workspaceFeedbackRoute = read("src/app/api/workspace/practice/assignments/feedback/route.ts");
const studentResubmissionRoute = read("src/app/api/student/practice/assignments/resubmissions/start/route.ts");
const workspaceClient = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const assignmentsSection = read("src/components/workspace/workspace-practice-assignments-section.tsx");
const studentPracticeClient = read("src/components/student-app/student-practice-client.tsx");
const studentReportClient = read("src/components/student-app/student-practice-report-client.tsx");
const studentTerminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const journalLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const rules = read("firestore.rules");

const reviewTypes = sliceBetween(
  practiceTypes,
  "export type PracticeInstructorFeedbackPublicationStatus",
  "export interface PracticeAssignmentRecord"
);
const resubmissionFunction = sliceBetween(
  practiceRepo,
  "export async function startStudentPracticeAssignmentResubmission",
  "async function listStudentInstructorFeedback"
);
const queueFunction = sliceBetween(
  practiceRepo,
  "export async function listWorkspacePracticeAssignmentFeedback",
  "function normalizeInstructorFeedbackPayload"
);
const queueStatusFunction = sliceBetween(
  practiceRepo,
  "function buildWorkspaceFeedbackCompletion",
  "export function parseWorkspacePracticeReviewQueueRequest"
);
const feedbackMutationFunction = sliceBetween(
  practiceRepo,
  "function normalizeInstructorFeedbackPayload",
  "export async function createStudentPracticePlaybook"
);
const stage18rModules = [
  practiceTypes,
  practiceRepo,
  workspaceFeedbackRoute,
  studentResubmissionRoute,
  workspaceClient,
  assignmentsSection,
  studentPracticeClient,
  studentReportClient,
  studentTerminalClient,
  journalLedger,
  rules
].join("\n");

assert(
  packageJson.scripts?.["stage18r:qa"] === "node scripts/qa-stage18r-practice-assignment-review-resubmissions.mjs",
  "package.json exposes npm run stage18r:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18R - Practice Assignment Review Queue And Resubmissions",
    "feedback draft, feedback published, resubmission requested, and completed",
    "Students only see published feedback",
    "Starting a resubmission creates a fresh student-owned practice session from assignment setup only"
  ],
  "plan.md documents Stage 18R review queue and resubmission scope."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18R Practice Assignment Review Queue And Resubmissions",
    "Workspace saves draft feedback.",
    "Student cannot see draft feedback",
    "Workspace publishes feedback.",
    "Student starts resubmission.",
    "Confirm no orders, hidden candles, notes, drawings, bookmarks, annotations, reflections, or ledger records are copied."
  ],
  "manual-test-backlog.md records Stage 18R manual QA."
);

assertIncludesAll(
  reviewTypes,
  [
    "PracticeInstructorFeedbackPublicationStatus",
    "PracticeAssignmentReviewQueueFilter",
    "feedback_draft",
    "feedback_published",
    "resubmission_requested",
    "PracticeAssignmentResubmissionRequest",
    "PracticeAssignmentResubmissionStatus",
    "publicationStatus",
    "feedbackTargetRef",
    "resubmissionRequest"
  ],
  "Practice types define review queue, publication, and resubmission surfaces."
);

assertIncludesAll(
  practiceTypes,
  [
    "assignmentAttemptNumber",
    "previousAttemptMaskedSessionRef",
    "resubmissionSourceFeedbackId",
    "resubmissionStatus",
    "reviewedCount",
    "resubmissionRequestedCount",
    "resubmissionCompletedCount",
    "averageRubricScore",
    "StudentPracticeAssignmentState"
  ],
  "Practice types include safe attempt linkage and aggregate progress fields."
);

assertIncludesAll(
  practiceRepo,
  [
    "parseWorkspacePracticeReviewQueueRequest",
    "queueStatus",
    "publicationStatus === \"published\"",
    "startStudentPracticeAssignmentResubmission",
    "Practice resubmission snapshot contains setup metadata and an opaque previous-attempt ref only.",
    "Orders, candles, notes, drawings, bookmarks, reflections, ledger records, and hidden data were not copied.",
    "reviewedCount",
    "resubmissionRequestedCount",
    "resubmissionCompletedCount",
    "averageRubricScore"
  ],
  "Practice repository implements queue filters, published-only student feedback, resubmission, and aggregate progress."
);

assert(
  (queueFunction + queueStatusFunction).includes("filters.queue") &&
    queueFunction.includes("assignmentId") &&
    queueStatusFunction.includes("needs_review") &&
    queueStatusFunction.includes("feedback_draft") &&
    queueStatusFunction.includes("feedback_published") &&
    queueStatusFunction.includes("resubmission_requested") &&
    !queueFunction.includes("listAnnotationsForSession") &&
    !queueFunction.includes("fetchSessionCandles") &&
    !queueFunction.includes("journal_summary"),
  "Workspace review queue is filterable and avoids private notes, candles, and journal internals."
);

assert(
  feedbackMutationFunction.includes("action === \"publish\"") &&
    feedbackMutationFunction.includes("publicationStatus") &&
    feedbackMutationFunction.includes("resubmissionRequest") &&
    feedbackMutationFunction.includes("normalizeResubmissionRequest") &&
    feedbackMutationFunction.includes("feedbackTargetRef") &&
    !feedbackMutationFunction.includes("studentId: record.studentId") &&
    !feedbackMutationFunction.includes("sessionId: record.sessionId"),
  "Feedback mutation supports draft/publish/resubmission without trusting raw browser student/session IDs."
);

assert(
  resubmissionFunction.includes("feedback.publicationStatus === \"published\"") &&
    resubmissionFunction.includes("feedback.resubmissionRequest?.status !== \"requested\"") &&
    resubmissionFunction.includes("createStudentPracticeSession") &&
    resubmissionFunction.includes("assignmentAttemptNumber") &&
    resubmissionFunction.includes("previousAttemptMaskedSessionRef") &&
    resubmissionFunction.includes("resubmissionSourceFeedbackId") &&
    resubmissionFunction.includes("resubmissionStatus: \"started\"") &&
    !resubmissionFunction.includes("practice_orders") &&
    !resubmissionFunction.includes("practice_annotations") &&
    !resubmissionFunction.includes("practice_bookmarks") &&
    !resubmissionFunction.includes("account_linked_trade_ledger"),
  "Student resubmission creates a fresh setup-only session from a published request."
);

assertIncludesAll(
  workspaceFeedbackRoute,
  [
    "requireInfluencer(request)",
    "parseWorkspacePracticeReviewQueueRequest",
    "listWorkspacePracticeAssignmentFeedback",
    "upsertWorkspacePracticeAssignmentFeedback"
  ],
  "Workspace review queue route is influencer-protected and parses filters."
);

assertIncludesAll(
  studentResubmissionRoute,
  [
    "requireStudent(request)",
    "startStudentPracticeAssignmentResubmission",
    "request.json()"
  ],
  "Student resubmission route is signed-in student protected."
);

assertIncludesAll(
  workspaceClient + assignmentsSection,
  [
    "buildPracticeReviewQueuePath",
    "practiceReviewQueueFilters",
    "Review queue filter",
    "Needs review",
    "Feedback draft",
    "Feedback published",
    "Resubmission requested",
    "Save draft",
    "Publish feedback",
    "Resubmission request"
  ],
  "Workspace UI exposes review queue filters, draft/publish feedback, and resubmission request controls."
);

assertIncludesAll(
  studentPracticeClient,
  [
    "assignmentStates",
    "resubmission_requested",
    "Start resubmission",
    "/api/student/practice/assignments/resubmissions/start",
    "Continue session",
    "View feedback"
  ],
  "Student practice UI shows assignment states and resubmission actions."
);

assert(
  studentReportClient.includes("report.instructorFeedback") &&
    studentTerminalClient.includes("detail?.instructorFeedback") &&
    journalLedger.includes("publishedInstructorFeedback") &&
    journalLedger.includes("publicationStatus === \"published\""),
  "Report, terminal, and journal surfaces remain published-feedback-only for students."
);

assertIncludesAll(
  rules,
  [
    "practice_instructor_feedback",
    "allow read, write: if false"
  ],
  "Firestore browser rules still deny direct instructor feedback access."
);

const dangerousCodePatterns = [
  "binance-adapter",
  "bybit-adapter",
  "metaapi-adapter",
  "submitOrder(",
  "placeOrder(",
  "createLiveOrder",
  "loadForexMetaApiToken",
  "brokerPassword:",
  "metaApiToken:",
  "vaultRef:",
  "rawProviderPayload:",
  "pdfkit",
  "puppeteer",
  "uploadBytes("
];
const dangerousHits = dangerousCodePatterns.filter((pattern) => stage18rModules.includes(pattern));

assert(
  dangerousHits.length === 0,
  `Stage 18R does not add forbidden execution/provider/private exchange/MetaAPI credential, PDF/screenshot/upload, or secret surfaces.${dangerousHits.length ? ` Hits: ${dangerousHits.join(", ")}` : ""}`
);

console.log("Stage 18R practice assignment review queue and resubmissions QA passed.");
