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
const courseTypes = read("src/types/course-hub.ts");
const repository = read("src/lib/course-hub/course-repository.ts");
const studentList = read("src/components/student-courses/student-course-list-client.tsx");
const workspaceList = read("src/components/course-hub/course-list-client.tsx");

const courseSurface = [
  courseTypes,
  repository,
  studentList,
  workspaceList
].join("\n");

assert(
  packageJson.scripts?.["stage19g:qa"] === "node scripts/qa-stage19g-course-discovery-search.mjs",
  "package.json exposes npm run stage19g:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 19G - Course Discovery, Lesson Search, And Learning Shortcuts",
    "search by course title/description",
    "lesson-level search",
    "TH-2026-08-20-STAGE19G-COURSE-DISCOVERY-SEARCH-HANDOFF"
  ],
  "plan.md documents Stage 19G scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 19G Course Discovery, Lesson Search, And Learning Shortcuts",
    "Student searches courses by title and description",
    "Student searches own private note text and sees only own results.",
    "Locked course result does not expose locked lesson/resource/private data."
  ],
  "manual-test-backlog.md records deferred Stage 19G manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE19G-COURSE-DISCOVERY-SEARCH-HANDOFF",
    "Stage 19G - Course Discovery, Lesson Search, And Learning Shortcuts",
    "accessible-only lesson/resource search"
  ],
  "prompt summary moves current course work to Stage 19G."
);

assertIncludesAll(
  courseTypes,
  [
    "StudentCourseLessonSearchItem",
    "kind: \"lesson\" | \"resource\"",
    "resourceType?: CourseAttachmentType",
    "lessonSearchItems: StudentCourseLessonSearchItem[]"
  ],
  "Course types model safe student lesson/resource search items."
);

assertIncludesAll(
  repository,
  [
    "buildStudentLessonSearchItems",
    "makeStudentLessonSearchItemId",
    ".filter((entry) => entry.isAccessible)",
    "lessonSearchItems:",
    "resource.description",
    "resource.hostname"
  ],
  "Repository builds student lesson/resource search only for accessible courses."
);

const studentListResponse = sliceBetween(repository, "export async function listStudentCourses", "async function buildStudentCourseDetail");
assertIncludesAll(
  studentListResponse,
  [".filter((entry) => entry.isAccessible)", "buildStudentLessonSearchItems(entry.course)", "learningState.learningItems"],
  "Student list response keeps locked lesson/resource search out of the payload and preserves private learning items."
);
assertExcludesAll(
  studentListResponse,
  ["quiz:", "correctIndex", "lesson.quiz", "answer key", "raw student"],
  "Student list search payload does not expose quiz answer keys or raw student identifiers."
);

assertIncludesAll(
  studentList,
  [
    "Learning shortcuts and search",
    "Search available lesson titles, section names, safe resource metadata",
    "Locked course lessons and resource links are not included here.",
    "Accessible lessons and resources",
    "Your private notes and bookmarks",
    "No lesson, resource, private note, or bookmark results match that search.",
    "Level / tier",
    "No available courses match",
    "No locked courses match"
  ],
  "Student /app/courses supports discovery filters, lesson/resource search, private learning shortcuts, and empty states."
);

assertIncludesAll(
  workspaceList,
  [
    "Search workspace courses",
    "statusFilters",
    "WorkspaceCourseResourceFilter",
    "WorkspaceCourseCheckFilter",
    "WorkspaceCourseCompletionFilter",
    "courseMatchesWorkspaceFilters",
    "Has resources",
    "Has check activity",
    "Has completions",
    "No workspace courses match",
    "aggregate counts only"
  ],
  "Workspace Course Hub supports search and aggregate-safe status/resource/check/completion filters."
);

assertExcludesAll(
  workspaceList,
  [
    "privateNote",
    "bookmark.label",
    "positionSeconds",
    "lesson_check_attempts",
    "correctIndex",
    "studentId",
    "raw"
  ],
  "Workspace discovery UI does not render private notes, bookmark labels, attempt paths, answer keys, raw ids, or raw details."
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
    "metaapi",
    "binance",
    "bybit",
    "provider payload",
    "answer key:",
    "studentanswers",
    "public sharing",
    "analytics tracking"
  ],
  "Stage 19G course discovery modules do not add forbidden search/provider/AI/messaging/upload/PDF/execution/private-data surfaces."
);

console.log("Stage 19G course discovery, lesson search, and learning shortcuts QA passed.");
