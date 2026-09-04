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
const dashboardTypes = read("src/types/workspace-dashboard.ts");
const validation = read("src/lib/course-hub/course-validation.ts");
const mappers = read("src/lib/course-hub/course-mappers.ts");
const dashboardMappers = read("src/lib/workspace/dashboard-mappers.ts");
const studentReader = read("src/components/student-courses/student-course-reader-client.tsx");
const workspaceEditor = read("src/components/course-hub/course-editor-client.tsx");
const courseList = read("src/components/course-hub/course-list-client.tsx");
const courseVisibility = read("src/components/workspace/course-visibility-section.tsx");

const courseSurface = [
  courseTypes,
  dashboardTypes,
  validation,
  mappers,
  dashboardMappers,
  studentReader,
  workspaceEditor,
  courseList,
  courseVisibility
].join("\n");

assert(
  packageJson.scripts?.["stage19f:qa"] === "node scripts/qa-stage19f-course-resources-attachments.mjs",
  "package.json exposes npm run stage19f:qa."
);

assertIncludesAll(
  plan,
  [
    "Stage 19F - Course Resources And Attachments Polish",
    "Keep attachments as safe HTTPS metadata only.",
    "Add aggregate-safe workspace resource visibility",
    "TH-2026-08-20-STAGE19F-COURSE-RESOURCES-ATTACHMENTS-HANDOFF"
  ],
  "plan.md documents Stage 19F scope and handoff."
);

assertIncludesAll(
  manualBacklog,
  [
    "Stage 19F Course Resources And Attachments Polish",
    "Workspace adds lesson resource metadata",
    "Student sees grouped resource cards in the lesson reader.",
    "Workspace Course Hub and Course Visibility show aggregate resource counts only."
  ],
  "manual-test-backlog.md records deferred Stage 19F manual QA."
);

assertIncludesAll(
  promptSummary,
  [
    "TH-2026-08-20-STAGE19F-COURSE-RESOURCES-ATTACHMENTS-HANDOFF",
    "Stage 19F - Course Resources And Attachments Polish",
    "HTTPS-only course resource metadata"
  ],
  "prompt summary moves current course work to Stage 19F."
);

assertIncludesAll(
  courseTypes,
  [
    "CourseAttachmentType",
    "\"lesson_resource\" | \"course_resource\" | \"external_reference\"",
    "description?: string",
    "hostname: string",
    "CourseResourceSummary",
    "resourceSummary: CourseResourceSummary"
  ],
  "Course types model resource metadata and aggregate resource summaries."
);

assertIncludesAll(
  validation,
  [
    "attachmentTypes",
    "description = sanitizeText",
    "Use https:// resource links only.",
    "Resource descriptions must be plain text.",
    "hostname = parsed.hostname"
  ],
  "Course validation keeps resources HTTPS-only with bounded plain-text metadata."
);

const attachmentValidation = sliceBetween(validation, "function validateAttachment", "function validateQuiz");
assertExcludesAll(
  attachmentValidation.toLowerCase(),
  ["uploadbytes", "storage", "supabase", "pdfkit", "jspdf", "openai"],
  "Attachment validation does not add upload/storage/PDF/AI providers."
);

assertIncludesAll(
  mappers,
  [
    "normalizeAttachmentType",
    "hostnameFromUrl",
    "lessonsWithResourcesCount",
    "totalResourceCount"
  ],
  "Course mappers normalize legacy attachments and compute resource counts."
);

assertIncludesAll(
  dashboardMappers,
  [
    "resourceCounts",
    "lessonsWithResourcesCount",
    "totalResourceCount"
  ],
  "Workspace dashboard mapper computes aggregate resource counts from course metadata."
);

assertIncludesAll(
  studentReader,
  [
    "LessonResources",
    "Lesson resources",
    "Course resources",
    "External references",
    "getResourceHostname",
    "Open link",
    "Resources unavailable",
    "No lesson resources",
    "TradeHub does not upload, host, or rewrite the files."
  ],
  "Student reader renders grouped safe resource cards and empty/locked states."
);

assertIncludesAll(
  workspaceEditor,
  [
    "resourceTypeOptions",
    "createEmptyResource",
    "Resource metadata",
    "Resource title",
    "Category",
    "HTTPS resource URL",
    "Optional description",
    "Add resource row",
    "Remove",
    "Resource preview"
  ],
  "Workspace editor supports add/edit/remove resource metadata and preview."
);

assertIncludesAll(
  courseList,
  ["Resource lessons", "Resources", "resourceSummary"],
  "Workspace Course Hub shows aggregate resource counts only."
);

assertIncludesAll(
  courseVisibility,
  ["Resource lessons", "Resources", "resourceSummary", "totalResourceCount"],
  "Workspace Course Visibility shows aggregate resource counts only."
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
    "metaapi",
    "binance",
    "bybit",
    "provider payload",
    "answer key:",
    "studentanswers",
    "raw student"
  ],
  "Stage 19F course modules do not add forbidden upload/storage/provider/AI/execution/private-data surfaces."
);

console.log("Stage 19F course resources and attachments polish QA passed.");
