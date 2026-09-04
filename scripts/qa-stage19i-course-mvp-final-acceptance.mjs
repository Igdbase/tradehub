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

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert(startIndex >= 0, `Found source slice start marker: ${start}`);
  assert(endIndex > startIndex, `Found source slice end marker: ${end}`);

  return source.slice(startIndex, endIndex);
}

const packageJson = JSON.parse(read("package.json"));
const plan = read("plan.md");
const manualBacklog = read("manual-test-backlog.md");
const promptSummary = read("prompt/promptsumary.md");
const firestoreRules = read("firestore.rules");
const courseTypes = read("src/types/course-hub.ts");
const repository = read("src/lib/course-hub/course-repository.ts");
const validation = read("src/lib/course-hub/course-validation.ts");
const mappers = read("src/lib/course-hub/course-mappers.ts");
const apiClient = read("src/lib/course-hub/course-api-client.ts");
const studentList = read("src/components/student-courses/student-course-list-client.tsx");
const studentReader = read("src/components/student-courses/student-course-reader-client.tsx");
const studentProof = read("src/components/student-courses/student-course-proof-client.tsx");
const workspaceList = read("src/components/course-hub/course-list-client.tsx");
const workspaceEditor = read("src/components/course-hub/course-editor-client.tsx");
const courseVisibility = read("src/components/workspace/course-visibility-section.tsx");
const studentCourseRoute = read("src/app/api/student/courses/route.ts");
const studentDetailRoute = read("src/app/api/student/courses/[courseId]/route.ts");
const studentProofRoute = read("src/app/api/student/courses/[courseId]/completion/route.ts");
const studentProgressRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts");
const studentCheckRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/check/attempt/route.ts");
const studentNotesRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/notes/route.ts");
const studentBookmarkRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/bookmark/route.ts");
const studentResumeRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/resume/route.ts");
const workspaceCourseRoute = read("src/app/api/workspace/courses/route.ts");
const workspaceDetailRoute = read("src/app/api/workspace/courses/[courseId]/route.ts");

const studentApiRoutes = [
  studentCourseRoute,
  studentDetailRoute,
  studentProofRoute,
  studentProgressRoute,
  studentCheckRoute,
  studentNotesRoute,
  studentBookmarkRoute,
  studentResumeRoute
].join("\n");

const workspaceApiRoutes = [
  workspaceCourseRoute,
  workspaceDetailRoute
].join("\n");

const courseClientSurface = [
  studentList,
  studentReader,
  studentProof,
  workspaceList,
  workspaceEditor,
  courseVisibility
].join("\n");

const courseServerSurface = [
  courseTypes,
  repository,
  validation,
  mappers,
  apiClient,
  studentApiRoutes,
  workspaceApiRoutes
].join("\n");

const allCourseSurface = `${courseClientSurface}\n${courseServerSurface}`;

assert(
  packageJson.scripts?.["stage19i:qa"] === "node scripts/qa-stage19i-course-mvp-final-acceptance.mjs",
  "package.json exposes npm run stage19i:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 19I - Course/Lesson MVP Final Acceptance Freeze",
    "course/lesson MVP as source-QA frozen",
    "TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF",
    "future course prompts should be bug patches or explicitly approved new stages"
  ],
  "plan.md documents Stage 19I final acceptance freeze."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 19I Course/Lesson MVP Final Acceptance Freeze",
    "Course/lesson MVP source-QA frozen",
    "## Must Test Before Demo",
    "## Nice To Test",
    "## Later Regression",
    "Student can find a course, open lesson, save note/bookmark, use Continue Learning, pass required check, complete course, and print proof.",
    "Workspace creates/edits/reorders/resources/checks/publishes/archives safely."
  ],
  "manual-test-backlog.md records source-QA freeze and deferred course browser checks."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE19I-COURSE-MVP-FINAL-HANDOFF",
    "Stage 19I - Course/Lesson MVP Final Acceptance Freeze",
    "course/lesson MVP is source-QA frozen",
    "future prompts should choose another product area unless specifically patching course bugs",
    "npm run stage19i:qa"
  ],
  "prompt summary sets current stop to Stage 19I and directs future work away from new course features."
);

assertExistsAll(
  [
    "src/app/(student)/app/courses/page.tsx",
    "src/app/(student)/app/courses/[courseId]/page.tsx",
    "src/app/(student)/app/courses/[courseId]/proof/page.tsx",
    "src/app/(influencer)/workspace/courses/page.tsx",
    "src/app/(influencer)/workspace/courses/[courseId]/page.tsx",
    "src/app/api/student/courses/route.ts",
    "src/app/api/student/courses/[courseId]/route.ts",
    "src/app/api/student/courses/[courseId]/completion/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/progress/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/check/attempt/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/notes/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/bookmark/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/resume/route.ts",
    "src/app/api/workspace/courses/route.ts",
    "src/app/api/workspace/courses/[courseId]/route.ts"
  ],
  "Course MVP pages and protected student/workspace API routes exist."
);

assertIncludesAll(
  studentList,
  [
    "Search courses",
    "Available",
    "In progress",
    "Completed",
    "Locked",
    "Level / tier",
    "Continue learning",
    "Learning shortcuts and search",
    "Accessible lessons and resources",
    "Your private notes and bookmarks",
    "Locked courses show only basic course details until access is available."
  ],
  "Student course dashboard supports discovery, filters, accessible-only search, Continue Learning, and private shortcuts."
);

assertIncludesAll(
  studentReader,
  [
    "Course outline",
    "Mobile course outline",
    "Previous lesson",
    "Next lesson",
    "Learning flow",
    "Notes and bookmarks",
    "Save note",
    "Save bookmark",
    "Save continue point",
    "Knowledge check",
    "Submit lesson check",
    "Completion locked until this required lesson check is passed.",
    "Complete lesson",
    "Open completion proof",
    "Resources unavailable"
  ],
  "Student reader supports course outline, private learning state, deterministic checks, completion blocking, resources, and proof entry."
);

assertIncludesAll(
  studentProof,
  [
    "/api/student/courses/${courseId}/completion",
    "Print / Save proof",
    "window.print()",
    "@media print",
    "Use your browser's print option to save a copy.",
    "Proof unavailable",
    "Complete every required lesson and knowledge check before opening your proof.",
    "Keep this proof for your records."
  ],
  "Student proof remains browser-print-only with clear learning copy."
);

assertIncludesAll(
  workspaceList,
  [
    "Create course draft",
    "Search workspace courses",
    "Draft",
    "Published",
    "Archived",
    "Has resources",
    "Has check activity",
    "Has completions",
    "Open editor",
    "aggregate counts only"
  ],
  "Workspace Course Hub supports create/search/filter/editor entry using aggregate-safe metadata."
);

assertIncludesAll(
  workspaceEditor,
  [
    "Course editor",
    "Instructor launch checklist",
    "Move up",
    "Move down",
    "Remove lesson",
    "Confirm lesson removal",
    "Resource metadata",
    "HTTPS resource URL",
    "Add resource row",
    "Lesson check / quiz readiness",
    "Answer key",
    "Required before completion",
    "Save draft",
    "Publish",
    "Unpublish",
    "Archive course"
  ],
  "Workspace editor supports create/edit/reorder/remove/resources/checks/publish/archive clarity."
);

assertIncludesAll(
  courseVisibility,
  [
    "Course visibility",
    "Eligible",
    "Started",
    "Completed",
    "Avg progress",
    "Checks tried",
    "Checks passed",
    "Students w notes",
    "Bookmarks",
    "Resource lessons",
    "Resources",
    "Open Course Hub"
  ],
  "Workspace dashboard shows aggregate-safe completion/readiness/resource/private-learning counts."
);

assertIncludesAll(
  studentApiRoutes,
  [
    "requireStudent",
    "listStudentCourses",
    "getStudentCourse",
    "getStudentCourseCompletionProof",
    "saveStudentLessonProgress",
    "submitStudentLessonCheckAttempt",
    "saveStudentLessonNote",
    "saveStudentLessonBookmark",
    "saveStudentCourseResumePoint"
  ],
  "Student course APIs stay protected by signed-in student routes."
);

assertIncludesAll(
  workspaceApiRoutes,
  [
    "requireInfluencer",
    "listInfluencerCourses",
    "createInfluencerCourse",
    "getInfluencerCourse",
    "patchInfluencerCourse"
  ],
  "Workspace course APIs stay protected by influencer workspace routes."
);

assertIncludesAll(
  repository,
  [
    "resolveCourseAccessState",
    "getFeatureEntitlement",
    "locked_by_subscription",
    "locked_by_tier",
    "feature_not_enabled",
    "course.published",
    "course.status !== \"published\"",
    "course_lesson_notes/${makeLessonLearningItemId",
    "course_lesson_bookmarks/${makeLessonLearningItemId",
    "course_resume_points/current",
    "lesson_check_attempts/${lesson.lessonId}",
    "course_progress/${course.courseId}",
    "makeMaskedCourseStudentRef",
    ".filter((entry) => entry.isAccessible)",
    "buildStudentLessonSearchItems(entry.course)"
  ],
  "Repository preserves access gates, student-owned learning/progress/check state, masked aggregates, and accessible-only lesson search."
);

const studentDetail = sliceBetween(repository, "async function buildStudentCourseDetail", "export async function getStudentCourse");
assertIncludesAll(
  studentDetail,
  ["const { quiz, ...studentLesson } = lesson", "buildStudentLessonCheck", "privateNote", "bookmark"],
  "Student detail strips authoring quiz keys before returning lesson checks."
);
assertExcludesAll(
  studentDetail,
  ["correctIndex:", "rawAnswers", "studentAnswers"],
  "Student detail does not expose answer keys or raw answers."
);

const workspaceAggregates = sliceBetween(repository, "async function buildWorkspaceCourseCompletionSummaries", "async function buildStudentProgressSummary");
assertIncludesAll(
  workspaceAggregates,
  [
    "makeMaskedCourseStudentRef",
    "studentsWithNotesCount",
    "bookmarkedLessonsCount",
    "recentLearningActivityCount",
    "checkAttemptedCount",
    "checkPassedCount",
    "averageCheckScorePercent"
  ],
  "Workspace aggregates include only masked refs and aggregate-safe counts."
);
assertExcludesAll(
  workspaceAggregates,
  ["text:", "label:", "positionSeconds:", "correctIndex:", "rawAnswers"],
  "Workspace aggregates do not expose private note text, bookmark labels, resume positions, answer keys, or raw answers."
);

assertIncludesAll(
  validation,
  [
    "Use https:// resource links only.",
    "Enter a course title.",
    "Lesson notes must be plain text.",
    "Required checks need at least one objective question.",
    "validateLessonCheckAttemptPayload",
    "validateLessonNotePayload",
    "validateLessonBookmarkPayload",
    "validateLessonResumePayload"
  ],
  "Validation keeps course/resource/check/private-learning payloads bounded and deterministic."
);

assertIncludesAll(
  mappers,
  [
    "normalizeAttachmentType",
    "hostnameFromUrl",
    "courseToListItem",
    "mapLessonProgressDocument",
    "mapStudentCourseProgressDocument"
  ],
  "Course mappers normalize safe course/resource/progress data."
);

assertIncludesAll(
  firestoreRules,
  [
    "course_lesson_notes",
    "course_lesson_bookmarks",
    "course_resume_points",
    "course_progress",
    "lesson_progress",
    "allow read, write: if false"
  ],
  "Firestore rules keep protected course learning/progress paths deny-by-default."
);

assertExcludesAll(
  workspaceList + courseVisibility,
  [
    "privateNote",
    "bookmark.label",
    "positionSeconds",
    "lesson_check_attempts",
    "correctIndex",
    "studentId}",
    "studentId)"
  ],
  "Workspace UI does not render private learning data, answer keys, attempt paths, or raw student identifiers."
);

assertExcludesAll(
  allCourseSurface.toLowerCase(),
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
    "raw student id",
    "public sharing",
    "new payment"
  ],
  "Course MVP source does not add forbidden AI/search/provider/messaging/upload/PDF/execution/payment/private-data surfaces."
);

console.log("Stage 19I course/lesson MVP final acceptance freeze QA passed.");
