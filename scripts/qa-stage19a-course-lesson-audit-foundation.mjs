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

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const rules = read("firestore.rules");
const courseTypes = read("src/types/course-hub.ts");
const courseRepo = read("src/lib/course-hub/course-repository.ts");
const courseValidation = read("src/lib/course-hub/course-validation.ts");
const courseApiClient = read("src/lib/course-hub/course-api-client.ts");
const studentCourseList = read("src/components/student-courses/student-course-list-client.tsx");
const studentCourseReader = read("src/components/student-courses/student-course-reader-client.tsx");
const workspaceCourseList = read("src/components/course-hub/course-list-client.tsx");
const workspaceCourseEditor = read("src/components/course-hub/course-editor-client.tsx");
const studentCoursesRoute = read("src/app/api/student/courses/route.ts");
const studentCourseRoute = read("src/app/api/student/courses/[courseId]/route.ts");
const studentLessonProgressRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts");
const workspaceCoursesRoute = read("src/app/api/workspace/courses/route.ts");
const workspaceCourseRoute = read("src/app/api/workspace/courses/[courseId]/route.ts");

const courseModules = [
  courseTypes,
  courseRepo,
  courseValidation,
  courseApiClient,
  studentCourseList,
  studentCourseReader,
  workspaceCourseList,
  workspaceCourseEditor,
  studentCoursesRoute,
  studentCourseRoute,
  studentLessonProgressRoute,
  workspaceCoursesRoute,
  workspaceCourseRoute
].join("\n");

assert(
  packageJson.scripts?.["stage19a:qa"] === "node scripts/qa-stage19a-course-lesson-audit-foundation.mjs",
  "package.json exposes npm run stage19a:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 19A - Course And Lesson Experience Audit Foundation",
    "improve the course/lesson learning experience without changing payment gates",
    "Do not touch practice/backtesting, AutoCopy, MetaAPI, Binance/Bybit, broker, vault, or live execution logic.",
    "TH-2026-08-20-STAGE19A-COURSE-LESSON-AUDIT-HANDOFF"
  ],
  "plan.md documents Stage 19A scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 19A Course And Lesson Experience Audit Foundation",
    "Student opens `/app/courses`.",
    "Student opens a course and lesson.",
    "Locked course/lesson states behave safely.",
    "Workspace creates/edits course/lesson if supported.",
    "Progress and notes remain scoped to signed-in student.",
    "No cross-workspace course leakage."
  ],
  "manual-test-backlog.md records deferred Stage 19A course manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE19A-COURSE-LESSON-AUDIT-HANDOFF",
    "Stage 19A - Course And Lesson Experience Audit Foundation",
    "new product-area start",
    "Practice/backtesting remains source-QA frozen"
  ],
  "prompt summary moves current work to Stage 19A and preserves the Stage 18X practice freeze."
);

assertExistsAll(
  [
    "src/app/(student)/app/courses/page.tsx",
    "src/app/(student)/app/courses/[courseId]/page.tsx",
    "src/app/(influencer)/workspace/courses/page.tsx",
    "src/app/(influencer)/workspace/courses/[courseId]/page.tsx",
    "src/app/api/student/courses/route.ts",
    "src/app/api/student/courses/[courseId]/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts",
    "src/app/api/workspace/courses/route.ts",
    "src/app/api/workspace/courses/[courseId]/route.ts"
  ],
  "Student and workspace course pages plus protected API routes exist."
);

assertIncludesAll(
  studentCoursesRoute,
  ["requireStudent(request)", "listStudentCourses(actor, filters)", "apiJson", "apiError"],
  "Student course list route requires signed-in student auth."
);

assertIncludesAll(
  studentCourseRoute,
  ["requireStudent(request)", "getStudentCourse(actor, context.params.courseId)", "apiJson", "apiError"],
  "Student course detail route requires signed-in student auth."
);

assertIncludesAll(
  studentLessonProgressRoute,
  ["requireStudent(request)", "saveStudentLessonProgress", "courseId: context.params.courseId", "lessonId: context.params.lessonId"],
  "Student lesson progress route is signed-in student scoped."
);

assertIncludesAll(
  workspaceCoursesRoute,
  ["requireInfluencer(request)", "listInfluencerCourses(actor, filters)", "createInfluencerCourse(actor, payload)"],
  "Workspace course list/create route requires influencer workspace auth."
);

assertIncludesAll(
  workspaceCourseRoute,
  ["requireInfluencer(request)", "getInfluencerCourse(actor, context.params.courseId)", "patchInfluencerCourse"],
  "Workspace course detail/update route requires influencer workspace auth."
);

assertIncludesAll(
  courseRepo,
  [
    "getFirebaseAdminClients",
    "resolveStudentEntitlements",
    "getFeatureEntitlement(student.entitlements, \"course\")",
    "locked_by_subscription",
    "feature_not_enabled",
    "locked_by_tier",
    "course.accessTier !== \"all\"",
    ".collection(`workspaces/${actor.workspaceId}/courses`)",
    ".where(\"published\", \"==\", true)",
    "course.status === \"published\"",
    "getCourseOrThrow(actor.workspaceId, courseId)"
  ],
  "Course repository keeps student access gated by existing entitlement/subscription/tier and workspace course state."
);

assertIncludesAll(
  courseRepo,
  [
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${lessonId}",
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/course_progress/${courseId}",
    "Complete the previous lesson first.",
    "lesson.requiresPrevious",
    "studentSummary.courseProgressPercent",
    "app_summary/current"
  ],
  "Lesson progress remains student-owned and previous-lesson locks are server-enforced."
);

assertIncludesAll(
  courseValidation,
  [
    "sanitizeString",
    "sanitizeText",
    "looksLikeHtml",
    "Use https:// resource links only.",
    "extractYouTubeVideoId",
    "sections.slice(0, 8)",
    "record.lessons.slice(0, 12)",
    "progressMilestones",
    "Use started, watched_80, completed, or quiz_passed."
  ],
  "Course validation bounds text, normalizes YouTube IDs, validates HTTPS attachment metadata, and limits progress milestones."
);

assertIncludesAll(
  courseApiClient,
  [
    "getFirebaseAuthClient",
    "user.getIdToken(forceRefresh)",
    "Authorization: `Bearer ${token}`",
    "TradeHub could not complete that course request."
  ],
  "Course client uses signed-in Firebase ID tokens for protected course APIs."
);

assertIncludesAll(
  studentCourseList,
  [
    "Course access",
    "How to learn here",
    "Courses can be available or locked",
    "Contact your instructor if access looks unavailable.",
    "No courses yet",
    "Your instructor has not published a course for you yet."
  ],
  "Student course list has clearer access and empty-state guidance."
);

assertIncludesAll(
  studentCourseReader,
  [
    "This lesson video is not available yet.",
    "This course is not available right now.",
    "Notes and bookmarks will be available when this lesson unlocks.",
    "unlocked lesson first",
    "This course does not have an available lesson yet."
  ],
  "Student lesson reader explains video, locked, no-lesson, and student-owned progress states."
);

assertIncludesAll(
  workspaceCourseList,
  [
    "attachments as HTTPS metadata",
    "course writes scoped to this workspace",
    "Student progress and notes stay in student-owned records.",
    "Publishing never changes billing or student subscriptions.",
    "students will not see anything until it is published"
  ],
  "Workspace course list clarifies draft/publish and workspace-scoped boundaries."
);

assertIncludesAll(
  workspaceCourseEditor,
  [
    "Course edits are workspace-scoped",
    "touch payments, AutoCopy, practice, or execution systems.",
    "Attachments are HTTPS URL metadata only",
    "upload or host course files",
    "No lessons in this section yet.",
    "Saves are explicit and quota-safe. No changes are written while typing."
  ],
  "Workspace course editor has safer helper and empty-state copy without redesigning the course system."
);

assertIncludesAll(
  rules,
  [
    "match /databases/{database}/documents",
    "match /{document=**}",
    "allow read, write: if false;"
  ],
  "Firestore browser rules retain deny-by-default fallback for course, lesson, and progress storage paths."
);

assertExcludesAll(
  courseModules,
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
  "Stage 19A course modules do not add forbidden execution/provider/payment/messaging/upload/PDF/AI surfaces."
);

assert(
  !studentCourseList.includes("fetch(\"http") &&
    !studentCourseList.includes("fetch('http") &&
    !studentCourseReader.includes("fetch(\"http") &&
    !studentCourseReader.includes("fetch('http") &&
    !workspaceCourseList.includes("fetch(\"http") &&
    !workspaceCourseList.includes("fetch('http") &&
    !workspaceCourseEditor.includes("fetch(\"http") &&
    !workspaceCourseEditor.includes("fetch('http"),
  "Course browser components do not add external data fetches."
);

console.log("Stage 19A course and lesson experience audit foundation QA passed.");
