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
const studentList = read("src/components/student-courses/student-course-list-client.tsx");
const studentReader = read("src/components/student-courses/student-course-reader-client.tsx");
const workspaceCourseList = read("src/components/course-hub/course-list-client.tsx");
const workspaceVisibility = read("src/components/workspace/course-visibility-section.tsx");
const learningStateRoute = read("src/app/api/student/courses/learning-state/route.ts");
const noteRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/notes/route.ts");
const bookmarkRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/bookmark/route.ts");
const resumeRoute = read("src/app/api/student/courses/[courseId]/lessons/[lessonId]/resume/route.ts");

const courseSurface = [
  courseTypes,
  courseValidation,
  courseRepo,
  studentList,
  studentReader,
  workspaceCourseList,
  workspaceVisibility,
  learningStateRoute,
  noteRoute,
  bookmarkRoute,
  resumeRoute
].join("\n");

assert(
  packageJson.scripts?.["stage19e:qa"] === "node scripts/qa-stage19e-student-lesson-notes-bookmarks.mjs",
  "package.json exposes npm run stage19e:qa."
);

assertExistsAll(
  [
    "src/app/api/student/courses/learning-state/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/notes/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/bookmark/route.ts",
    "src/app/api/student/courses/[courseId]/lessons/[lessonId]/resume/route.ts"
  ],
  "Protected student learning-state, notes, bookmark, and resume routes exist."
);

assertIncludesAll(
  plan,
  [
    "Stage 19E - Student Lesson Notes, Bookmarks, And Resume Points",
    "Notes/bookmarks/resume points must be student-owned and server-written through protected routes.",
    "Workspace must not see raw note text, bookmark labels, private student reflection text, raw lesson position, or raw student IDs.",
    "TH-2026-08-20-STAGE19E-STUDENT-LESSON-NOTES-BOOKMARKS-HANDOFF"
  ],
  "plan.md documents Stage 19E scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 19E Student Lesson Notes, Bookmarks, And Resume Points",
    "Student creates, edits, deletes a private lesson note.",
    "Workspace sees only aggregate-safe counts.",
    "Workspace cannot see raw note text, labels, raw student IDs, answer keys, or attempts."
  ],
  "manual-test-backlog.md records deferred Stage 19E manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE19E-STUDENT-LESSON-NOTES-BOOKMARKS-HANDOFF",
    "Stage 19E - Student Lesson Notes, Bookmarks, And Resume Points",
    "private student notes, lesson bookmarks, resume points"
  ],
  "prompt summary moves current course work to Stage 19E."
);

assertIncludesAll(
  courseTypes,
  [
    "StudentLessonNoteDocument",
    "StudentLessonBookmarkDocument",
    "StudentCourseResumePointDocument",
    "StudentCourseLearningItem",
    "StudentCourseLearningStateResponse",
    "LessonNoteMutationResponse",
    "LessonBookmarkMutationResponse",
    "LessonResumeMutationResponse",
    "studentsWithNotesCount",
    "bookmarkedLessonsCount",
    "recentLearningActivityCount"
  ],
  "Course types model private student learning state and aggregate-safe workspace counts."
);

assertIncludesAll(
  courseValidation,
  [
    "validateLessonNotePayload",
    "validateLessonBookmarkPayload",
    "validateLessonResumePayload",
    "lesson_note_plain_text_only",
    "lesson_bookmark_plain_text_only",
    "normalizePositionSeconds"
  ],
  "Course validation bounds and sanitizes notes, bookmark labels, and position metadata."
);

const noteMutationSlice = sliceBetween(courseRepo, "export async function saveStudentLessonNote", "export async function deleteStudentLessonNote");
assertIncludesAll(
  noteMutationSlice,
  [
    "validateLessonNotePayload(payload)",
    "assertStudentCanUseLessonLearningTools",
    "course_lesson_notes",
    "actor.studentId",
    "text: values.text"
  ],
  "Private note save is validated, student-scoped, and server-routed."
);

const bookmarkMutationSlice = sliceBetween(courseRepo, "export async function saveStudentLessonBookmark", "export async function deleteStudentLessonBookmark");
assertIncludesAll(
  bookmarkMutationSlice,
  [
    "validateLessonBookmarkPayload(payload)",
    "assertStudentCanUseLessonLearningTools",
    "course_lesson_bookmarks",
    "actor.studentId",
    "positionSeconds: values.positionSeconds"
  ],
  "Private bookmark save is validated, student-scoped, and server-routed."
);

const resumeSlice = sliceBetween(courseRepo, "export async function saveStudentCourseResumePoint", "export async function submitStudentLessonCheckAttempt");
assertIncludesAll(
  resumeSlice,
  [
    "validateLessonResumePayload(payload)",
    "assertStudentCanUseLessonLearningTools",
    "course_resume_points/current",
    "actor.studentId",
    "resumePoint"
  ],
  "Resume point save is validated, student-scoped, and server-routed."
);

assertIncludesAll(
  courseRepo,
  [
    "getStudentCourseLearningStateSummary",
    "getStudentCourseLearningState",
    "noteToLearningItem",
    "bookmarkToLearningItem",
    "makeLessonLearningItemId"
  ],
  "Student learning-state list uses safe helper items and opaque note/bookmark ids."
);

const workspaceSummarySlice = sliceBetween(courseRepo, "async function buildWorkspaceCourseCompletionSummaries", "async function buildStudentProgressSummary");
assertIncludesAll(
  workspaceSummarySlice,
  [
    "studentsWithNotesCount",
    "bookmarkedLessonsCount",
    "recentLearningActivityCount",
    "new Set",
    "course_lesson_notes",
    "course_lesson_bookmarks"
  ],
  "Workspace summary computes aggregate learning activity only."
);
assertExcludesAll(
  workspaceSummarySlice,
  [
    "text:",
    "label:",
    "positionSeconds:",
    "maskedStudentRef: student.studentId"
  ],
  "Workspace summary does not expose raw note text, labels, positions, or raw student ids."
);

assertIncludesAll(
  learningStateRoute,
  ["requireStudent(request)", "getStudentCourseLearningStateSummary", "apiJson", "apiError"],
  "Learning-state route requires signed-in student auth."
);

assertIncludesAll(
  noteRoute,
  ["requireStudent(request)", "saveStudentLessonNote", "deleteStudentLessonNote", "PUT", "DELETE"],
  "Lesson note route supports protected save and delete."
);

assertIncludesAll(
  bookmarkRoute,
  ["requireStudent(request)", "saveStudentLessonBookmark", "deleteStudentLessonBookmark", "PUT", "DELETE"],
  "Lesson bookmark route supports protected save and delete."
);

assertIncludesAll(
  resumeRoute,
  ["requireStudent(request)", "saveStudentCourseResumePoint", "POST"],
  "Lesson resume route supports protected resume-point writes."
);

assertIncludesAll(
  studentList,
  [
    "Continue learning",
    "Your private notes and bookmarks",
    "learningSearchQuery",
    "learningItems",
    "Only you can see the notes you save here."
  ],
  "Student course list shows continue learning and private notes/bookmarks search."
);

assertIncludesAll(
  studentReader,
  [
    "Notes and bookmarks",
    "Save note",
    "Delete note",
    "Save bookmark",
    "Remove bookmark",
    "Save continue point",
    "/notes",
    "/bookmark",
    "/resume"
  ],
  "Student reader renders private note, bookmark, and resume controls."
);

assertIncludesAll(
  workspaceCourseList,
  ["Note students", "Bookmarks", "Recent learning"],
  "Workspace Course Hub shows aggregate learning activity only."
);

assertIncludesAll(
  workspaceVisibility,
  [
    "studentsWithNotesCount",
    "bookmarkedLessonsCount",
    "recentLearningActivityCount",
    "Students w notes",
    "Recent learning"
  ],
  "Workspace dashboard Course Visibility shows aggregate learning activity only."
);

assertIncludesAll(
  rules,
  [
    "course_lesson_notes",
    "course_lesson_bookmarks",
    "course_resume_points",
    "allow read, write: if false;"
  ],
  "Firestore rules deny direct client access to course learning-state storage."
);

assertExcludesAll(
  courseSurface.toLowerCase(),
  [
    "openai",
    "ai grading",
    "whatsapp",
    "twilio",
    "sendgrid",
    "metaapi",
    "binance",
    "bybit",
    "broker password",
    "vault ref",
    "createobjecturl",
    "jspdf",
    "uploadbytes"
  ],
  "Stage 19E course modules do not add forbidden AI/provider/execution/messaging/upload/PDF surfaces."
);

console.log("Stage 19E student lesson notes, bookmarks, and resume points QA passed.");
