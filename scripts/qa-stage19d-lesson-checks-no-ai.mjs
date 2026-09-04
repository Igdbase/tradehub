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
const courseValidation = read("src/lib/course-hub/course-validation.ts");
const courseRepo = read("src/lib/course-hub/course-repository.ts");
const studentReader = read("src/components/student-courses/student-course-reader-client.tsx");
const workspaceEditor = read("src/components/course-hub/course-editor-client.tsx");
const workspaceCourseList = read("src/components/course-hub/course-list-client.tsx");
const workspaceCourseVisibility = read("src/components/workspace/course-visibility-section.tsx");
const attemptRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/check/attempt/route.ts");
const progressRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts");

const courseSurface = [
  courseTypes,
  courseValidation,
  courseRepo,
  studentReader,
  workspaceEditor,
  workspaceCourseList,
  workspaceCourseVisibility,
  attemptRoute,
  progressRoute
].join("\n");

assert(
  packageJson.scripts?.["stage19d:qa"] === "node scripts/qa-stage19d-lesson-checks-no-ai.mjs",
  "package.json exposes npm run stage19d:qa."
);

assertExistsAll(
  ["src/app/api/student/courses/[courseId]/lessons/[lessonId]/check/attempt/route.ts"],
  "Protected student lesson check attempt route exists."
);

assertIncludesAll(
  plan,
  [
    "Stage 19D - Lesson Checks And Quiz Readiness, No AI Grading",
    "Attempts must be server-validated.",
    "Do not trust browser-computed scores.",
    "TH-2026-08-20-STAGE19D-LESSON-CHECKS-NO-AI-HANDOFF"
  ],
  "plan.md documents Stage 19D scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 19D Lesson Checks And Quiz Readiness, No AI Grading",
    "Workspace adds required multiple-choice lesson check.",
    "Student opens lesson and cannot complete until passing required check.",
    "Confirm student APIs do not expose answer keys before submit."
  ],
  "manual-test-backlog.md records deferred Stage 19D manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE19D-LESSON-CHECKS-NO-AI-HANDOFF",
    "Stage 19D - Lesson Checks And Quiz Readiness, No AI Grading",
    "deterministic lesson checks"
  ],
  "prompt summary moves current course work to Stage 19D."
);

assertIncludesAll(
  courseTypes,
  [
    "\"multiple_choice\" | \"true_false\" | \"short_text_self_check\"",
    "StudentLessonCheckQuestion",
    "LessonCheckAttemptDocument",
    "LessonCheckAttemptResponse",
    "LessonCheckAttemptStatus",
    "checkAttemptedCount",
    "checkPassedCount",
    "averageCheckScorePercent"
  ],
  "Course types model bounded lesson checks, attempts, and aggregate readiness."
);

assertIncludesAll(
  courseValidation,
  [
    "validateQuiz",
    "passThresholdPercent",
    "Required checks need at least one objective question.",
    "validateLessonCheckAttemptPayload",
    "short_text_self_check",
    "multiple_choice",
    "true_false"
  ],
  "Course validation supports bounded deterministic checks and attempt payloads."
);

assertIncludesAll(
  courseRepo,
  [
    "buildStudentLessonCheck",
    "submitStudentLessonCheckAttempt",
    "correctIndex",
    "scorePercent",
    "correctQuestionNumbers",
    "incorrectQuestionNumbers",
    "lesson_check_attempts/${lessonId}",
    "lesson_check_required",
    "lesson_check_attempt_required",
    "isLessonCompleteForCourse"
  ],
  "Course repository owns grading, safe attempt summaries, and required-check completion gating."
);

const studentDetailSlice = sliceBetween(courseRepo, "async function buildStudentCourseDetail", "export async function getStudentCourse");
assertIncludesAll(
  studentDetailSlice,
  ["const { quiz, ...studentLesson } = lesson", "buildStudentLessonCheck", "check:", "previousCompleted = isLessonCompleteForCourse"],
  "Student course detail strips authoring quiz answer keys and uses safe lesson checks."
);
assertExcludesAll(
  studentDetailSlice,
  ["...lesson,\n        progress"],
  "Student course detail no longer spreads raw lesson quiz data into the response."
);

const attemptSlice = sliceBetween(courseRepo, "export async function submitStudentLessonCheckAttempt", "export async function saveStudentLessonProgress");
assertIncludesAll(
  attemptSlice,
  [
    "validateLessonCheckAttemptPayload(payload)",
    "require",
    "resolveCourseAccessState(course, student)",
    "answer?.selectedOptionIndex === question.correctIndex",
    "batch.set",
    "lesson_check_attempts/${lessonId}",
    "quizPassed: current?.quizPassed === true || passed"
  ],
  "Lesson check attempt route is server-scored and stores support-safe summaries."
);
assertExcludesAll(
  attemptSlice,
  ["rawAnswers", "studentAnswers", "openai"],
  "Lesson check attempts do not store raw answers or use AI grading."
);

const progressSlice = sliceBetween(courseRepo, "export async function saveStudentLessonProgress", "  return {");
assertIncludesAll(
  progressSlice,
  [
    "values.milestone === \"quiz_passed\"",
    "lesson_check_attempt_required",
    "lesson.requiresQuizPass && current?.quizPassed !== true",
    "lesson_check_required",
    "buildCourseProgressFromLessonProgress"
  ],
  "Lesson progress completion is blocked until required checks pass."
);

assertIncludesAll(
  attemptRoute,
  ["requireStudent(request)", "submitStudentLessonCheckAttempt", "apiJson", "apiError"],
  "Lesson check attempt API route requires signed-in student auth."
);

assertIncludesAll(
  studentReader,
  [
    "Lesson check",
    "Submit lesson check",
    "selectedLesson.check.questions",
    "Correct questions:",
    "Incorrect questions:",
    "requiredCheckPending",
    "Completion locked until this required lesson check is passed."
  ],
  "Student reader renders lesson checks, safe feedback, and required-check completion lock."
);
assertExcludesAll(
  studentReader,
  ["correctIndex", "Answer key"],
  "Student reader does not render answer keys."
);

assertIncludesAll(
  workspaceEditor,
  [
    "Lesson check / quiz readiness",
    "Add multiple choice",
    "Add true/false",
    "Add self-check",
    "Answer key",
    "Pass threshold",
    "Required before completion",
    "short_text_self_check"
  ],
  "Workspace editor supports bounded deterministic check authoring."
);

assertIncludesAll(
  workspaceCourseList,
  ["Checks tried", "Checks passed", "Avg score"],
  "Workspace Course Hub shows aggregate-safe quiz readiness."
);

assertIncludesAll(
  workspaceCourseVisibility,
  ["Checks tried", "Checks passed", "Avg score", "checkPassedCount", "checkAttemptedCount"],
  "Workspace dashboard shows aggregate-safe quiz readiness."
);

assertIncludesAll(
  rules,
  ["match /{document=**}", "allow read, write: if false;"],
  "Firestore rules retain deny-by-default fallback for lesson check storage."
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
  "Stage 19D course modules do not add forbidden AI/payment/provider/execution/upload/messaging/PDF surfaces."
);

console.log("Stage 19D lesson checks and quiz readiness QA passed.");
