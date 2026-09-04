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
const cryptoTypes = read("src/types/crypto-execution.ts");
const practiceRepo = read("src/lib/practice/practice-repository.ts");
const workspaceFeedbackRoute = read("src/app/api/workspace/practice/assignments/feedback/route.ts");
const workspaceClient = read("src/app/(influencer)/workspace/workspace-page-client.tsx");
const assignmentSection = read("src/components/workspace/workspace-practice-assignments-section.tsx");
const studentPracticeClient = read("src/components/student-app/student-practice-client.tsx");
const studentReportClient = read("src/components/student-app/student-practice-report-client.tsx");
const studentTerminalClient = read("src/components/student-app/student-practice-terminal-client.tsx");
const studentJournalClient = read("src/components/student-app/student-journal-client.tsx");
const journalLedger = read("src/lib/journal/account-linked-performance-ledger.ts");
const rules = read("firestore.rules");

const feedbackTypes = sliceBetween(
  practiceTypes,
  "export interface PracticeInstructorFeedbackRubric",
  "export interface PracticeAssignmentRecord"
);
const feedbackRepo = sliceBetween(
  practiceRepo,
  "async function listStudentInstructorFeedback",
  "export async function createStudentPracticePlaybook"
);
const workspaceFeedbackFunction = sliceBetween(
  practiceRepo,
  "export async function listWorkspacePracticeAssignmentFeedback",
  "function normalizeInstructorFeedbackPayload"
);
const feedbackMutationFunction = sliceBetween(
  practiceRepo,
  "export async function upsertWorkspacePracticeAssignmentFeedback",
  "export async function createStudentPracticePlaybook"
);
const stage18qModules = [
  practiceTypes,
  cryptoTypes,
  practiceRepo,
  workspaceFeedbackRoute,
  workspaceClient,
  assignmentSection,
  studentPracticeClient,
  studentReportClient,
  studentTerminalClient,
  studentJournalClient,
  journalLedger,
  rules
].join("\n");

assert(
  packageJson.scripts?.["stage18q:qa"] === "node scripts/qa-stage18q-instructor-feedback-rubric.mjs",
  "package.json exposes npm run stage18q:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 18Q - Instructor Feedback And Rubric For Practice Assignments",
    "setup quality, risk management, execution discipline, review/reflection quality, and overall score",
    "Attach feedback to the student-owned assignment session through a protected server route",
    "Do not expose raw student journal entries, hidden candles, full private trade-by-trade detail"
  ],
  "plan.md documents Stage 18Q scope and privacy boundaries."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 18Q Instructor Feedback And Rubric",
    "Workspace opens/selects the feedback form and submits rubric feedback.",
    "Student sees feedback on `/app/practice`.",
    "Student opens `/app/practice/[sessionId]/report` and confirms instructor feedback appears",
    "Confirm workspace cannot see raw journal entries, hidden candles, raw order-by-order records"
  ],
  "manual-test-backlog.md records Stage 18Q manual QA."
);

assertIncludesAll(
  feedbackTypes,
  [
    "PracticeInstructorFeedbackRubric",
    "setupQuality",
    "riskManagement",
    "executionDiscipline",
    "reviewQuality",
    "overallScore",
    "PracticeInstructorFeedbackRecord",
    "PracticeInstructorFeedbackSummary",
    "feedbackNote",
    "recommendedNextDrill",
    "reviewerDisplayLabel",
    "PracticeInstructorFeedbackStatus"
  ],
  "Practice types define bounded instructor feedback and rubric surfaces."
);

assertIncludesAll(
  practiceTypes,
  [
    "WorkspacePracticeAssignmentFeedbackCompletionSummary",
    "feedbackTargetRef",
    "WorkspacePracticeAssignmentFeedbackResponse",
    "WorkspacePracticeAssignmentFeedbackMutationResponse",
    "instructorFeedback: PracticeInstructorFeedbackSummary[]",
    "instructorFeedback?: PracticeInstructorFeedbackSummary"
  ],
  "Practice response types expose feedback through safe summaries only."
);

assert(
  !feedbackTypes.includes("orders: PracticeOrderSummary[]") &&
    !feedbackTypes.includes("candles:") &&
    !feedbackTypes.includes("journal") &&
    !feedbackTypes.includes("annotation") &&
    !feedbackTypes.includes("drawing") &&
    !feedbackTypes.includes("reflection") &&
    !feedbackTypes.includes("rawProviderPayload") &&
    !feedbackTypes.includes("vaultRef") &&
    !feedbackTypes.includes("brokerPassword") &&
    !feedbackTypes.includes("metaApiToken"),
  "Feedback types do not expose raw orders, candles, journal entries, annotations, drawings, reflections, or secrets."
);

assertIncludesAll(
  feedbackRepo,
  [
    "listStudentInstructorFeedback",
    "getStudentInstructorFeedbackForSession",
    "listWorkspacePracticeAssignmentFeedback",
    "upsertWorkspacePracticeAssignmentFeedback",
    "collectionGroup(\"practice_sessions\")",
    "collectionGroup(\"practice_orders\")",
    "collectionGroup(\"practice_instructor_feedback\")",
    "maskFeedbackTargetRef",
    "feedbackTargetRef",
    "Workspace assignment feedback lists completed assignment summaries only.",
    "raw trades, journal entries, annotations, drawings, reflections, hidden candles"
  ],
  "Practice repository supports student-owned feedback and workspace-safe feedback review."
);

assert(
  feedbackRepo.includes("session.status === \"completed\"") &&
    feedbackRepo.includes("Boolean(session.assignmentId)") &&
    workspaceFeedbackFunction.includes("buildWorkspaceFeedbackCompletion") &&
    feedbackRepo.includes("maskedStudentId") &&
    feedbackRepo.includes("maskedSessionRef") &&
    !workspaceFeedbackFunction.includes("listAnnotationsForSession") &&
    !workspaceFeedbackFunction.includes("journal_summary") &&
    !workspaceFeedbackFunction.includes("fetchSessionCandles"),
  "Workspace feedback list is completed-assignment-only and avoids private notes, journal internals, and candle fetches."
);

assert(
    feedbackMutationFunction.includes("feedbackTargetRef") &&
    feedbackMutationFunction.includes("maskFeedbackTargetRef") &&
    feedbackMutationFunction.includes("practice_instructor_feedback") &&
    feedbackRepo.includes("normalizeInstructorFeedbackRubric") &&
    feedbackRepo.includes("sanitizeFeedbackText") &&
    !feedbackMutationFunction.includes("sessionId: record.sessionId") &&
    !feedbackMutationFunction.includes("studentId: record.studentId"),
  "Feedback mutation targets opaque refs and does not trust browser-supplied raw student/session IDs."
);

assertIncludesAll(
  workspaceFeedbackRoute,
  [
    "requireInfluencer(request)",
    "listWorkspacePracticeAssignmentFeedback",
    "upsertWorkspacePracticeAssignmentFeedback",
    "apiJson",
    "apiError"
  ],
  "Workspace feedback route is protected by influencer auth."
);

assertIncludesAll(
  workspaceClient,
  [
    "WorkspacePracticeAssignmentFeedbackResponse",
    "WorkspacePracticeAssignmentFeedbackMutationResponse",
    "/api/workspace/practice/assignments/feedback",
    "loadPracticeAssignmentFeedback",
    "savePracticeAssignmentFeedback"
  ],
  "/workspace loads and saves assignment feedback through protected workspace APIs."
);

assertIncludesAll(
  assignmentSection,
  [
    "Instructor feedback",
    "feedbackTargetRef",
    "setupQuality",
    "riskManagement",
    "executionDiscipline",
    "reviewQuality",
    "overallScore",
    "Save draft",
    "Publish feedback",
    "Raw trades, journal notes, candles, annotations, drawings, and reflections stay private"
  ],
  "Workspace assignments UI renders safe completion summaries and rubric form."
);

assertIncludesAll(
  studentPracticeClient,
  [
    "Instructor feedback",
    "overview?.instructorFeedback",
    "recommendedNextDrill"
  ],
  "/app/practice shows received instructor feedback to the signed-in student."
);

assertIncludesAll(
  studentReportClient,
  [
    "Instructor Feedback",
    "report.instructorFeedback",
    "Assignment rubric",
    "recommendedNextDrill"
  ],
  "Practice report renders safe instructor feedback."
);

assertIncludesAll(
  studentTerminalClient,
  [
    "detail?.instructorFeedback",
    "Instructor feedback appears here after a completed assignment is reviewed"
  ],
  "Practice terminal review panel renders safe instructor feedback."
);

assertIncludesAll(
  journalLedger + studentJournalClient + cryptoTypes,
  [
    "latestInstructorFeedback",
    "mapPracticeInstructorFeedback",
    "practice_instructor_feedback",
    "Latest instructor feedback"
  ],
  "Student journal Practice/backtesting section can show latest safe instructor feedback."
);

assertIncludesAll(
  rules,
  [
    "practice_instructor_feedback",
    "allow read, write: if false"
  ],
  "Firestore browser rules deny direct instructor feedback access."
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

const forbiddenHits = dangerousCodePatterns.filter((pattern) => stage18qModules.includes(pattern));
assert(
  forbiddenHits.length === 0,
  `Stage 18Q does not add forbidden execution/provider/private exchange/MetaAPI credential, PDF/screenshot/upload, or secret surfaces.${forbiddenHits.length ? ` Hits: ${forbiddenHits.join(", ")}` : ""}`
);

console.log("Stage 18Q instructor feedback and rubric QA passed.");
