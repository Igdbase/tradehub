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

function assertFilesExist(paths, message) {
  const missing = paths.filter((relativePath) => !fs.existsSync(path.join(rootDir, relativePath)));
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
const studentList = read("src/components/student-courses/student-course-list-client.tsx");
const studentReader = read("src/components/student-courses/student-course-reader-client.tsx");
const studentProof = read("src/components/student-courses/student-course-proof-client.tsx");
const workspaceList = read("src/components/course-hub/course-list-client.tsx");
const workspaceEditor = read("src/components/course-hub/course-editor-client.tsx");
const courseVisibility = read("src/components/workspace/course-visibility-section.tsx");
const repository = read("src/lib/course-hub/course-repository.ts");
const validation = read("src/lib/course-hub/course-validation.ts");
const firestoreRules = read("firestore.rules");

const courseSurface = [
  studentList,
  studentReader,
  studentProof,
  workspaceList,
  workspaceEditor,
  courseVisibility,
  repository,
  validation
].join("\n");

assert(
  packageJson.scripts?.["stage19h:qa"] === "node scripts/qa-stage19h-course-launch-smoke.mjs",
  "package.json exposes npm run stage19h:qa."
);

assertFilesExist(
  [
    "src/app/(student)/app/courses/page.tsx",
    "src/app/(student)/app/courses/[courseId]/page.tsx",
    "src/app/(student)/app/courses/[courseId]/proof/page.tsx",
    "src/app/(influencer)/workspace/courses/page.tsx",
    "src/app/(influencer)/workspace/courses/[courseId]/page.tsx",
    "src/app/api/student/courses/route.ts",
    "src/app/api/student/courses/[courseId]/route.ts",
    "src/app/api/student/courses/[courseId]/completion/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/check/attempt/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/notes/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/bookmark/route.ts",
    "src/app/api/workspace/courses/route.ts",
    "src/app/api/workspace/courses/[courseId]/route.ts"
  ],
  "Core course launch routes and protected APIs exist."
);

assertIncludesAll(
  plan,
  [
    "Stage 19H - Course Launch Polish And Smoke Pack",
    "clear student learning flow",
    "clear workspace instructor flow",
    "TH-2026-08-20-STAGE19H-COURSE-LAUNCH-SMOKE-HANDOFF"
  ],
  "plan.md documents Stage 19H scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 19H Course Launch Polish And Smoke Pack",
    "Student can find a course, open lesson, save note/bookmark, pass required check, complete course, and print proof.",
    "Workspace can create/edit/reorder/publish/archive course safely.",
    "Locked courses do not expose locked lesson/resource/check data."
  ],
  "manual-test-backlog.md records deferred Stage 19H manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE19H-COURSE-LAUNCH-SMOKE-HANDOFF",
    "Stage 19H - Course Launch Polish And Smoke Pack",
    "course launch polish and source-level smoke"
  ],
  "prompt summary moves current course work to Stage 19H."
);

assertIncludesAll(
  studentList,
  [
    "Search courses",
    "Learning shortcuts and search",
    "Continue learning",
    "No courses yet",
    "No available courses match",
    "Locked courses show only basic course details until access is available."
  ],
  "Student course list keeps discovery, shortcuts, and locked-data empty states visible."
);

assertIncludesAll(
  studentReader,
  [
    "Learning flow",
    "pass any required knowledge check",
    "Open completion proof",
    "Lesson check",
    "Submit lesson check",
    "Completion locked until this required lesson check is passed.",
    "Notes and bookmarks",
    "Mobile course outline",
    "Previous lesson",
    "Next lesson"
  ],
  "Student reader shows launch learning flow, check gate, private desk, and mobile navigation."
);

assertIncludesAll(
  studentProof,
  [
    "Print / Save proof",
    "Use your browser's print option to save a copy.",
    "Proof unavailable",
    "Completion confirmed",
    "Keep this proof for your records."
  ],
  "Student proof page stays browser-print-only with safe unavailable and privacy copy."
);

assertIncludesAll(
  workspaceList,
  [
    "Search workspace courses",
    "No courses yet",
    "No workspace courses match",
    "Open editor",
    "aggregate counts only"
  ],
  "Workspace Course Hub keeps search, empty states, and aggregate-safe course management copy."
);

assertIncludesAll(
  workspaceEditor,
  [
    "Instructor launch checklist",
    "Reorder safely",
    "HTTPS metadata",
    "No AI grading",
    "Entitlement-gated",
    "Move up",
    "Move down",
    "Add resource row",
    "Lesson check / quiz readiness",
    "Archive course"
  ],
  "Workspace editor shows launch checklist, reorder/resource/check/publish/archive flow."
);

assertIncludesAll(
  courseVisibility,
  [
    "Course visibility",
    "Eligible",
    "Completed",
    "Checks tried",
    "Students w notes",
    "Resources",
    "Open Course Hub"
  ],
  "Workspace dashboard course visibility remains aggregate-safe and operational."
);

const studentDetail = sliceBetween(repository, "async function buildStudentCourseDetail", "export async function getStudentCourse");
assertIncludesAll(
  studentDetail,
  ["const { quiz, ...studentLesson } = lesson", "buildStudentLessonCheck", "privateNote", "bookmark"],
  "Student detail strips answer keys and returns only safe student-owned learning state."
);
assertExcludesAll(
  studentDetail,
  ["correctIndex:", "rawAnswers", "studentAnswers"],
  "Student detail does not expose answer keys or raw answers."
);

assertIncludesAll(
  repository,
  [
    "resolveCourseAccessState",
    "locked_by_subscription",
    "locked_by_tier",
    "course_progress/${course.courseId}",
    "lesson_check_attempts/${lesson.lessonId}",
    "makeMaskedCourseStudentRef"
  ],
  "Repository preserves entitlement gates, student-owned progress/check storage, and masked workspace refs."
);

assertIncludesAll(
  validation,
  [
    "Use https:// resource links only.",
    "Lesson notes must be plain text.",
    "Required checks need at least one objective question.",
    "validateLessonCheckAttemptPayload"
  ],
  "Validation preserves safe resources, plain text, and deterministic checks."
);

assertIncludesAll(
  firestoreRules,
  [
    "course_lesson_notes",
    "course_lesson_bookmarks",
    "course_resume_points",
    "allow read, write: if false"
  ],
  "Firestore rules keep protected course learning paths deny-by-default."
);

assertExcludesAll(
  courseSurface.toLowerCase(),
  [
    "uploadbytes",
    "firebase/storage",
    "supabase",
    "cloudinary.uploader",
    "s3client",
    "putobjectcommand",
    "jspdf",
    "pdfkit",
    "sendgrid",
    "twilio",
    "whatsapp",
    "openai",
    "algolia",
    "meilisearch",
    "typesense",
    "click tracking",
    "analytics tracking",
    "metaapi",
    "binance",
    "bybit",
    "provider payload",
    "broker password",
    "vault ref",
    "raw student id"
  ],
  "Stage 19H course launch modules do not add forbidden AI/search/provider/messaging/upload/PDF/execution/private-data surfaces."
);

console.log("Stage 19H course launch polish and smoke QA passed.");
