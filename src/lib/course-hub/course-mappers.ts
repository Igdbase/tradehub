import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import type {
  CourseAttachmentType,
  CourseDocument,
  CourseHubCourseListItem,
  CourseSectionDocument,
  LessonProgressDocument,
  StudentCourseProgressDocument
} from "@/types/course-hub";

export function recordFromSnapshot(snapshot: DocumentSnapshot<DocumentData>, idField = "id") {
  const data = snapshot.data() ?? {};

  return {
    ...data,
    [idField]: data[idField] ?? snapshot.id
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeIsoDate(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date ? date.toISOString() : fallback;
  }

  return fallback;
}

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normalizeAttachmentType(value: unknown): CourseAttachmentType {
  return value === "course_resource" || value === "external_reference"
    ? value
    : "lesson_resource";
}

function safeHostname(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim().replace(/^www\./, "").toLowerCase().slice(0, 120);
  }

  return fallback;
}

function hostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase().slice(0, 120);
  } catch {
    return "";
  }
}

function mapLesson(record: Record<string, unknown>, sectionIndex: number, lessonIndex: number) {
  const attachments = recordArray(record.attachments).map((attachment) => ({
    label: asString(attachment.label),
    url: asString(attachment.url),
    type: normalizeAttachmentType(attachment.type),
    description: asString(attachment.description) || undefined,
    hostname: safeHostname(attachment.hostname, hostnameFromUrl(asString(attachment.url)))
  })).filter((attachment) => attachment.label && attachment.url);
  const quizRecord = isRecord(record.quiz) ? record.quiz : null;
  const questions = quizRecord
    ? recordArray(quizRecord.questions).map((question) => ({
        type: asString(question.type, "multiple_choice") as "multiple_choice" | "true_false" | "short_text_self_check",
        question: asString(question.question),
        options: Array.isArray(question.options)
          ? question.options.filter((option): option is string => typeof option === "string").slice(0, 5)
          : [],
        correctIndex: question.correctIndex === undefined ? undefined : asNumber(question.correctIndex)
      })).filter((question) =>
        question.question && (question.type === "short_text_self_check" || question.options.length >= 2)
      )
    : [];

  return {
    lessonId: asString(record.lessonId, `lesson_${sectionIndex + 1}_${lessonIndex + 1}`),
    title: asString(record.title),
    youtubeVideoId: asString(record.youtubeVideoId) || undefined,
    notes: asString(record.notes),
    order: asNumber(record.order, lessonIndex + 1),
    requiresPrevious: asBoolean(record.requiresPrevious),
    attachments,
    quiz: questions.length > 0
      ? {
          questions,
          passThresholdPercent: asNumber(quizRecord?.passThresholdPercent, 70),
          required: asBoolean(quizRecord?.required)
        }
      : undefined,
    requiresQuizPass: asBoolean(record.requiresQuizPass),
    durationLabel: asString(record.durationLabel) || undefined
  };
}

function mapSection(record: Record<string, unknown>, index: number): CourseSectionDocument {
  const rawLessons = recordArray(record.lessons);

  return {
    sectionId: asString(record.sectionId, asString(record.id, `section_${index + 1}`)),
    title: asString(record.title, `Section ${index + 1}`),
    order: asNumber(record.order, index + 1),
    lessons: rawLessons.map((lesson, lessonIndex) => mapLesson(lesson, index, lessonIndex))
  };
}

export function mapCourseDocument(record: Record<string, unknown>, workspaceIdFallback: string): CourseDocument {
  const createdAt = normalizeIsoDate(record.createdAt);
  const status = asString(
    record.status,
    asBoolean(record.published) ? "published" : "draft"
  ) as CourseDocument["status"];

  return {
    courseId: asString(record.courseId),
    workspaceId: asString(record.workspaceId, workspaceIdFallback),
    title: asString(record.title, "Untitled course"),
    description: asString(record.description),
    thumbnailVideoId: asString(record.thumbnailVideoId) || undefined,
    accessTier: asString(record.accessTier, "all"),
    published: status === "published" || asBoolean(record.published),
    status,
    sections: recordArray(record.sections).map(mapSection).sort((a, b) => a.order - b.order),
    createdAt,
    updatedAt: normalizeIsoDate(record.updatedAt, createdAt),
    publishedAt: record.publishedAt ? normalizeIsoDate(record.publishedAt) : undefined
  };
}

export function courseToListItem(
  course: CourseDocument,
  publishBlockedReasons: string[]
): CourseHubCourseListItem {
  const lessons = course.sections.flatMap((section) => section.lessons);
  const lessonsWithResourcesCount = lessons.filter((lesson) => lesson.attachments.length > 0).length;

  return {
    courseId: course.courseId,
    workspaceId: course.workspaceId,
    title: course.title,
    description: course.description,
    thumbnailVideoId: course.thumbnailVideoId,
    accessTier: course.accessTier,
    published: course.published,
    status: course.status,
    sectionCount: course.sections.length,
    lessonCount: lessons.length,
    publishBlockedReasons,
    resourceSummary: {
      lessonsWithResourcesCount,
      totalResourceCount: lessons.reduce((total, lesson) => total + lesson.attachments.length, 0)
    },
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    publishedAt: course.publishedAt
  };
}

export function mapLessonProgressDocument(
  record: Record<string, unknown> | null,
  fallback: {
    workspaceId: string;
    studentId: string;
    courseId: string;
    lessonId: string;
  }
): LessonProgressDocument | null {
  if (!record) {
    return null;
  }

  const watchedPercent = asNumber(record.watchedPercent);

  return {
    workspaceId: asString(record.workspaceId, fallback.workspaceId),
    studentId: asString(record.studentId, fallback.studentId),
    courseId: asString(record.courseId, fallback.courseId),
    lessonId: asString(record.lessonId, fallback.lessonId),
    watchedPercent: watchedPercent >= 100 ? 100 : watchedPercent >= 80 ? 80 : 0,
    completed: asBoolean(record.completed),
    quizScore: record.quizScore === undefined ? undefined : asNumber(record.quizScore),
    quizPassed: record.quizPassed === undefined ? undefined : asBoolean(record.quizPassed),
    startedAt: record.startedAt ? normalizeIsoDate(record.startedAt) : undefined,
    completedAt: record.completedAt ? normalizeIsoDate(record.completedAt) : undefined,
    lastWatched: normalizeIsoDate(record.lastWatched)
  };
}

export function mapStudentCourseProgressDocument(
  record: Record<string, unknown> | null,
  fallback: {
    workspaceId: string;
    studentId: string;
    courseId: string;
    lessonCount: number;
  }
): StudentCourseProgressDocument | null {
  if (!record) {
    return null;
  }

  return {
    workspaceId: asString(record.workspaceId, fallback.workspaceId),
    studentId: asString(record.studentId, fallback.studentId),
    courseId: asString(record.courseId, fallback.courseId),
    completedLessonCount: asNumber(record.completedLessonCount),
    lessonCount: asNumber(record.lessonCount, fallback.lessonCount),
    overallPercent: asNumber(record.overallPercent),
    lastLessonId: asString(record.lastLessonId) || undefined,
    updatedAt: normalizeIsoDate(record.updatedAt)
  };
}
