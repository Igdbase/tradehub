import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function assertExistsAll(paths, message) {
  const missing = paths.filter((entry) => !exists(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertIncludesAll(source, expected, message) {
  const missing = expected.filter((entry) => !source.includes(entry));
  assert(missing.length === 0, `${message}${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
}

function assertExcludesAll(source, forbidden, message) {
  const hits = forbidden.filter((entry) => source.includes(entry));
  assert(hits.length === 0, `${message}${hits.length ? ` Hits: ${hits.join(", ")}` : ""}`);
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0, `Found source slice start marker: ${startMarker}`);
  assert(end > start, `Found source slice end marker: ${endMarker}`);
  return source.slice(start, end);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const rules = read("firestore.rules");
const courseTypes = read("src/types/course-hub.ts");
const courseRepo = read("src/lib/course-hub/course-repository.ts");
const courseValidation = read("src/lib/course-hub/course-validation.ts");
const studentList = read("src/components/student-courses/student-course-list-client.tsx");
const studentReader = read("src/components/student-courses/student-course-reader-client.tsx");
const studentProof = read("src/components/student-courses/student-course-proof-client.tsx");
const workspaceCourseList = read("src/components/course-hub/course-list-client.tsx");
const workspaceCourseVisibility = read("src/components/workspace/course-visibility-section.tsx");
const proofRoute = read("src/app/api/student/courses/[courseId]/completion/route.ts");
const proofPage = read("src/app/(student)/app/courses/[courseId]/proof/page.tsx");
const studentCourseRoute = read("src/app/api/student/courses/[courseId]/route.ts");
const studentProgressRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts");
const workspaceCoursesRoute = read("src/app/api/workspace/courses/route.ts");

const courseSurface = [
  courseTypes,
  courseRepo,
  courseValidation,
  studentList,
  studentReader,
  studentProof,
  workspaceCourseList,
  workspaceCourseVisibility,
  proofRoute,
  proofPage,
  studentCourseRoute,
  studentProgressRoute,
  workspaceCoursesRoute
].join("\n");

assert(
  packageJson.scripts?.["stage19c:qa"] === "node scripts/qa-stage19c-course-completion-proof.mjs",
  "package.json exposes npm run stage19c:qa."
);

assertExistsAll(
  [
    "src/app/api/student/courses/[courseId]/completion/route.ts",
    "src/app/(student)/app/courses/[courseId]/proof/page.tsx",
    "src/components/student-courses/student-course-proof-client.tsx"
  ],
  "Protected student completion proof route and page exist."
);

assertIncludesAll(
  plan,
  [
    "Stage 19C - Course Progress, Completion, And Proof Of Completion",
    "Completion/proof must not be forgeable from browser-only state",
    "TH-2026-08-20-STAGE19C-COURSE-COMPLETION-PROOF-HANDOFF"
  ],
  "plan.md documents Stage 19C scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 19C Course Progress, Completion, And Proof Of Completion",
    "Student opens `/app/courses` and sees progress summaries.",
    "Student opens completion/proof page or panel.",
    "Workspace recent completions use masked/safe refs only."
  ],
  "manual-test-backlog.md records deferred Stage 19C manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE19C-COURSE-COMPLETION-PROOF-HANDOFF",
    "Stage 19C - Course Progress, Completion, And Proof Of Completion",
    "browser-printable completion proof"
  ],
  "prompt summary moves current course work to Stage 19C."
);

assertIncludesAll(
  courseTypes,
  [
    "CourseLearningProgressSummary",
    "CourseProgressStatus",
    "StudentCourseCompletionProof",
    "StudentCourseCompletionProofResponse",
    "WorkspaceCourseCompletionSummary",
    "WorkspaceCourseRecentCompletionSummary",
    "maskedStudentRef"
  ],
  "Course types include progress, proof, and aggregate-safe workspace completion summaries."
);

assertIncludesAll(
  courseRepo,
  [
    "buildCourseLearningProgressSummary",
    "getStudentCourseCompletionProof",
    "makeCourseProofRef",
    "makeMaskedCourseStudentRef",
    "buildWorkspaceCourseCompletionSummaries",
    "getStudentAccessContext(actor)",
    "if (!course.published || course.status !== \"published\")",
    "resolveCourseAccessState(course, student)",
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/course_progress/${course.courseId}"
  ],
  "Course repository derives completion/proof server-side from published course access and student-owned progress."
);

const proofFunction = sliceBetween(courseRepo, "export async function getStudentCourseCompletionProof", "export async function getStudentCourseLearningStateSummary");
assertIncludesAll(
  proofFunction,
  [
    "getStudentAccessContext(actor)",
    "course.status !== \"published\"",
    "accessState !== \"available\"",
    "progressSummary.status === \"completed\"",
    "studentSafeRef: makeMaskedCourseStudentRef",
    "proofRef: makeCourseProofRef"
  ],
  "Completion proof function keeps access gates and safe refs inside the server boundary."
);
assertExcludesAll(
  proofFunction,
  ["set(", "batch.", "pdf"],
  "Completion proof function does not write generated proof files or expose raw student IDs in the proof payload."
);

const workspaceSummaryFunction = sliceBetween(courseRepo, "async function buildWorkspaceCourseCompletionSummaries", "async function buildStudentProgressSummary");
assertIncludesAll(
  workspaceSummaryFunction,
  [
    "limit(250)",
    "eligibleCount",
    "startedCount",
    "completedCount",
    "averageProgressPercent",
    "recentCompletions",
    "maskedStudentRef: makeMaskedCourseStudentRef"
  ],
  "Workspace completion aggregates are bounded and masked."
);
assertExcludesAll(
  workspaceSummaryFunction,
  ["email", "displayName", "lesson_progress", "text:", "label:", "positionSeconds:", "raw"],
  "Workspace completion aggregates do not include raw student identity, lesson activity, private note text, labels, positions, or raw payloads."
);

assertIncludesAll(
  proofRoute,
  ["requireStudent(request)", "getStudentCourseCompletionProof(actor, context.params.courseId)", "apiJson", "apiError"],
  "Completion proof API route requires signed-in student auth."
);

assertIncludesAll(
  studentList,
  [
    "progressSummary",
    "Lessons done",
    "Next",
    "View proof",
    "/proof",
    "Review access"
  ],
  "Student course list surfaces completion/progress summaries and proof link without bypassing locked states."
);

assertIncludesAll(
  studentReader,
  [
    "Course progress",
    "Overall course progress",
    "Open completion proof",
    "server-owned progress",
    "progressSummary.status === \"completed\""
  ],
  "Student reader shows course progress, completion state, and proof entry point."
);

assertIncludesAll(
  studentProof,
  [
    "Print / Save proof",
    "window.print()",
    "@media print",
    "TradeHub does not generate or store PDF files",
    "course-proof-no-print",
    "proof.completed",
    "Completion confirmed",
    "Proof not ready yet"
  ],
  "Student proof page is browser-print-only and has complete/incomplete safe states."
);
assertExcludesAll(
  studentProof,
  ["jsPDF", "pdfkit", "html2canvas", "uploadBytes(", "fetch(\"http", "fetch('http"],
  "Student proof page does not generate PDFs, upload files, or fetch external providers."
);

assertIncludesAll(
  workspaceCourseList,
  [
    "completionSummary",
    "Eligible",
    "Started",
    "Completed",
    "Avg progress",
    "Recent completions",
    "maskedStudentRef"
  ],
  "Workspace Course Hub shows aggregate-safe completion visibility."
);

assertIncludesAll(
  workspaceCourseVisibility,
  [
    "completionSummary",
    "Eligible",
    "Started",
    "Completed",
    "Avg progress",
    "Recent completions",
    "maskedStudentRef"
  ],
  "Workspace dashboard Course Visibility section shows aggregate-safe completion visibility."
);

assertIncludesAll(
  courseValidation,
  [
    "extractYouTubeVideoId",
    "Use https:// resource links only.",
    "sanitizeText",
    "progressMilestones"
  ],
  "Course validation remains bounded for videos, attachments, text, and progress milestones."
);

assertIncludesAll(
  rules,
  ["match /{document=**}", "allow read, write: if false;"],
  "Firestore rules retain deny-by-default fallback for course/progress/completion storage."
);

assertExcludesAll(
  courseSurface,
  [
    "getForexDemoOrderPlacementAdapter",
    "getForexLiveCanaryOrderPlacementAdapter",
    "getExchangeOrderAdapter",
    "loadForexMetaApiToken",
    "metaapi-adapter",
    "binance-adapter",
    "bybit-adapter",
    "submitOrder(",
    "placeOrder(",
    "private Binance",
    "private Bybit",
    "MetaAPI access token",
    "metaApiToken",
    "brokerPassword",
    "vaultRef",
    "rawProviderPayload",
    "providerPayload",
    "paystack",
    "sendEmail",
    "sendSms",
    "twilio",
    "whatsapp",
    "pushSubscription",
    "uploadBytes(",
    "html2canvas",
    "jsPDF",
    "pdfkit",
    "puppeteer",
    "openai",
    "ai grading"
  ],
  "Stage 19C course modules do not add forbidden payment, provider, execution, upload, messaging, PDF, or AI surfaces."
);

console.log("Stage 19C course progress, completion, and proof QA passed.");
