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
const courseRepo = read("src/lib/course-hub/course-repository.ts");
const courseValidation = read("src/lib/course-hub/course-validation.ts");
const studentCourseList = read("src/components/student-courses/student-course-list-client.tsx");
const studentCourseReader = read("src/components/student-courses/student-course-reader-client.tsx");
const workspaceCourseList = read("src/components/course-hub/course-list-client.tsx");
const workspaceCourseEditor = read("src/components/course-hub/course-editor-client.tsx");
const studentCoursesRoute = read("src/app/api/student/courses/route.ts");
const studentCourseRoute = read("src/app/api/student/courses/[courseId]/route.ts");
const studentLessonProgressRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts");
const workspaceCoursesRoute = read("src/app/api/workspace/courses/route.ts");
const workspaceCourseRoute = read("src/app/api/workspace/courses/[courseId]/route.ts");

const courseSurface = [
  courseRepo,
  courseValidation,
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
  packageJson.scripts?.["stage19b:qa"] === "node scripts/qa-stage19b-course-navigation-authoring.mjs",
  "package.json exposes npm run stage19b:qa."
);

assertExistsAll(
  [
    "src/components/student-courses/student-course-list-client.tsx",
    "src/components/student-courses/student-course-reader-client.tsx",
    "src/components/course-hub/course-list-client.tsx",
    "src/components/course-hub/course-editor-client.tsx",
    "src/lib/course-hub/course-repository.ts",
    "src/lib/course-hub/course-validation.ts"
  ],
  "Stage 19B course surfaces and course helpers exist."
);

assertIncludesAll(
  plan,
  [
    "Stage 19B - Course Navigation And Lesson Authoring Ergonomics",
    "Improve the course/lesson experience without changing existing course security",
    "TH-2026-08-20-STAGE19B-COURSE-NAV-AUTHORING-HANDOFF"
  ],
  "plan.md documents Stage 19B scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 19B Course Navigation And Lesson Authoring Ergonomics",
    "Student opens `/app/courses` and uses search/filter navigation.",
    "Student opens a course and uses previous/next lesson navigation.",
    "Workspace reorders lessons safely.",
    "Workspace removes a lesson only after confirmation."
  ],
  "manual-test-backlog.md records deferred Stage 19B manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE19B-COURSE-NAV-AUTHORING-HANDOFF",
    "Stage 19B - Course Navigation And Lesson Authoring Ergonomics",
    "course navigation, lesson outline, mobile reader polish, workspace reorder controls"
  ],
  "prompt summary moves current course work to Stage 19B."
);

assertIncludesAll(
  studentCourseList,
  [
    "CourseListFilter",
    "matchesCourseFilter",
    "Search courses",
    "Course filters",
    "No courses match",
    "Opening a course still uses the signed-in student API and existing access checks."
  ],
  "Student course list adds navigation filters without bypassing server access."
);

assertIncludesAll(
  studentCourseReader,
  [
    "flattenCourseLessons",
    "Course outline",
    "Mobile course outline",
    "Current lesson",
    "Previous lesson",
    "Next lesson",
    "Next locked:",
    "aria-current",
    "selectedLessonAvailable",
    "disabled={isSaving || !selectedLessonAvailable}"
  ],
  "Student reader adds outline, current highlight, previous/next navigation, mobile polish, and locked progress guards."
);

assertIncludesAll(
  workspaceCourseList,
  [
    "Student preview:",
    "Published courses appear only for entitled students in this workspace.",
    "Draft and archived courses stay hidden from student course lists."
  ],
  "Workspace course list clarifies draft/published student visibility."
);

assertIncludesAll(
  workspaceCourseEditor,
  [
    "pendingRemoveLessonId",
    "moveSection",
    "moveLesson",
    "confirmRemoveLesson",
    "Student preview state",
    "Validation runs server-side",
    "Sections behave like modules.",
    "Reorder stays inside this module",
    "Remove lesson",
    "Confirm lesson removal",
    "Confirm remove",
    "Keep lesson",
    "Student progress",
    "records remain protected"
  ],
  "Workspace editor adds module grouping, reorder controls, safer lesson removal, preview clarity, and validation guidance."
);

assertIncludesAll(
  courseRepo,
  [
    "lesson.requiresPrevious",
    "Complete the previous lesson first.",
    "getFeatureEntitlement(student.entitlements, \"course\")",
    ".collection(`workspaces/${actor.workspaceId}/courses`)",
    "getCourseOrThrow(actor.workspaceId, courseId)",
    "workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${lessonId}"
  ],
  "Course repository still keeps lesson locks, entitlements, workspace scope, and student progress ownership server-side."
);

assertIncludesAll(
  courseValidation,
  [
    "extractYouTubeVideoId",
    "Use https:// resource links only.",
    "sanitizeText",
    "sections.slice(0, 8)",
    "record.lessons.slice(0, 12)",
    "progressMilestones"
  ],
  "Course validation remains bounded for YouTube IDs, HTTPS metadata, text, section/lesson limits, and progress milestones."
);

assertIncludesAll(
  studentCoursesRoute,
  ["requireStudent(request)", "listStudentCourses(actor, filters)"],
  "Student course list route remains signed-in student scoped."
);

assertIncludesAll(
  studentCourseRoute,
  ["requireStudent(request)", "getStudentCourse(actor, context.params.courseId)"],
  "Student course detail route remains signed-in student scoped."
);

assertIncludesAll(
  studentLessonProgressRoute,
  ["requireStudent(request)", "saveStudentLessonProgress"],
  "Student lesson progress route remains signed-in student scoped."
);

assertIncludesAll(
  workspaceCoursesRoute,
  ["requireInfluencer(request)", "createInfluencerCourse(actor, payload)", "listInfluencerCourses(actor, filters)"],
  "Workspace course list/create route remains influencer scoped."
);

assertIncludesAll(
  workspaceCourseRoute,
  ["requireInfluencer(request)", "getInfluencerCourse(actor, context.params.courseId)", "patchInfluencerCourse"],
  "Workspace course detail/update route remains influencer scoped."
);

assertIncludesAll(
  rules,
  ["match /{document=**}", "allow read, write: if false;"],
  "Firestore rules retain deny-by-default fallback for course and progress storage."
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
  "Stage 19B course modules do not add forbidden payment, provider, execution, upload, messaging, PDF, or AI surfaces."
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

console.log("Stage 19B course navigation and lesson authoring ergonomics QA passed.");
