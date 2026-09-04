import { AdminApiError } from "@/lib/firebase/admin-errors";
import type {
  CourseCreatePayload,
  CourseAttachmentType,
  CourseDocument,
  CourseLesson,
  CourseMetadataPayload,
  CourseQuizQuestion,
  CourseSavePayload,
  CourseSectionDocument,
  LessonBookmarkPayload,
  LessonCheckAttemptPayload,
  LessonNotePayload,
  LessonProgressMilestone,
  LessonProgressPayload,
  LessonResumePayload
} from "@/types/course-hub";

export type CourseListFilters = {
  limit: number;
  cursor?: string;
  q?: string;
};

const allowedActions = ["save_draft", "publish", "unpublish", "archive"] as const;
const progressMilestones: LessonProgressMilestone[] = ["started", "watched_80", "completed", "quiz_passed"];
const attachmentTypes: CourseAttachmentType[] = ["lesson_resource", "course_resource", "external_reference"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sanitizeString(value: unknown, maxLength: number) {
  return asString(value).trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeText(value: unknown, maxLength: number) {
  return asString(value).trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function pushField(fields: Record<string, string>, key: string, message: string) {
  if (!fields[key]) {
    fields[key] = message;
  }
}

function throwFields(fields: Record<string, string>) {
  if (Object.keys(fields).length > 0) {
    throw new AdminApiError(400, "validation_error", "Fix the highlighted course fields.", fields);
  }
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value ?? "");

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 10;
  }

  return Math.min(parsed, 25);
}

function looksLikeHtml(value: string) {
  return /<[^>]+>/.test(value);
}

export function parseCourseHubFilters(searchParams: URLSearchParams): CourseListFilters {
  return {
    limit: normalizeLimit(searchParams.get("limit")),
    cursor: sanitizeString(searchParams.get("cursor"), 90) || undefined,
    q: sanitizeString(searchParams.get("q"), 140) || undefined
  };
}

export function extractYouTubeVideoId(input: unknown, fieldKey: string, fields: Record<string, string>) {
  const value = sanitizeString(input, 240);

  if (!value) {
    return undefined;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    pushField(fields, fieldKey, "Paste a valid YouTube URL or 11-character video ID.");
    return undefined;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let candidate = "";

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v") ?? "";
    } else if (url.pathname.startsWith("/embed/")) {
      candidate = url.pathname.split("/")[2] ?? "";
    } else if (url.pathname.startsWith("/shorts/")) {
      candidate = url.pathname.split("/")[2] ?? "";
    }
  } else if (host === "youtu.be") {
    candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
    pushField(fields, fieldKey, "Use a supported YouTube watch, short, embed URL, or video ID.");
    return undefined;
  }

  return candidate;
}

function validateAttachment(value: unknown, fieldPrefix: string, fields: Record<string, string>) {
  const record = isRecord(value) ? value : {};
  const label = sanitizeString(record.label, 80);
  const urlValue = sanitizeString(record.url, 400);
  const description = sanitizeText(record.description, 280);
  const type = attachmentTypes.includes(record.type as CourseAttachmentType)
    ? record.type as CourseAttachmentType
    : "lesson_resource";
  let hostname = "";

  if (!label) {
    pushField(fields, `${fieldPrefix}.label`, "Resource title is required.");
  }

  if (description && looksLikeHtml(description)) {
    pushField(fields, `${fieldPrefix}.description`, "Resource descriptions must be plain text.");
  }

  let url = "";
  if (!urlValue) {
    pushField(fields, `${fieldPrefix}.url`, "Resource URL is required.");
  } else {
    try {
      const parsed = new URL(urlValue);
      if (parsed.protocol !== "https:") {
        pushField(fields, `${fieldPrefix}.url`, "Use https:// resource links only.");
      } else {
        url = parsed.toString();
        hostname = parsed.hostname.replace(/^www\./, "").toLowerCase().slice(0, 120);
      }
    } catch {
      pushField(fields, `${fieldPrefix}.url`, "Enter a valid https:// URL.");
    }
  }

  return {
    label,
    url,
    type,
    description: description || undefined,
    hostname
  };
}

function validateQuiz(value: unknown, fieldPrefix: string, fields: Record<string, string>) {
  if (!isRecord(value) || !Array.isArray(value.questions)) {
    return undefined;
  }

  const passThresholdPercent = Math.min(100, Math.max(50, Math.round(Number(value.passThresholdPercent) || 70)));
  const required = value.required === true;
  const questions: CourseQuizQuestion[] = value.questions.slice(0, 5).map((entry, index) => {
    const record = isRecord(entry) ? entry : {};
    const type: CourseQuizQuestion["type"] = record.type === "true_false" || record.type === "short_text_self_check"
      ? record.type
      : "multiple_choice";
    const question = sanitizeString(record.question, 180);
    const options = type === "true_false"
      ? ["True", "False"]
      : type === "short_text_self_check"
        ? []
        : Array.isArray(record.options)
          ? record.options.map((option) => sanitizeString(option, 120)).filter(Boolean).slice(0, 5)
          : [];
    const correctIndex = Number(record.correctIndex);

    if (!question) {
      pushField(fields, `${fieldPrefix}.questions.${index}.question`, "Quiz question is required.");
    }

    if (type !== "short_text_self_check" && options.length < 2) {
      pushField(fields, `${fieldPrefix}.questions.${index}.options`, "Add at least two options.");
    }

    if (
      type !== "short_text_self_check" &&
      (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length)
    ) {
      pushField(fields, `${fieldPrefix}.questions.${index}.correctIndex`, "Choose a valid correct answer.");
    }

    return {
      type,
      question,
      options,
      correctIndex: type === "short_text_self_check"
        ? undefined
        : Number.isInteger(correctIndex)
          ? correctIndex
          : 0
    };
  });

  if (required && !questions.some((question) => question.type !== "short_text_self_check")) {
    pushField(fields, `${fieldPrefix}.questions`, "Required checks need at least one objective question.");
  }

  return questions.length > 0 ? { questions, passThresholdPercent, required } : undefined;
}

function validateLesson(value: unknown, sectionIndex: number, lessonIndex: number, fields: Record<string, string>): CourseLesson {
  const record = isRecord(value) ? value : {};
  const fieldPrefix = `sections.${sectionIndex}.lessons.${lessonIndex}`;
  const title = sanitizeString(record.title, 110);
  const notes = sanitizeText(record.notes, 1600);
  const youtubeVideoId = extractYouTubeVideoId(record.youtubeVideoId ?? record.youtubeInput, `${fieldPrefix}.youtubeVideoId`, fields);
  const attachments = Array.isArray(record.attachments)
    ? record.attachments.slice(0, 5).map((attachment, attachmentIndex) =>
        validateAttachment(attachment, `${fieldPrefix}.attachments.${attachmentIndex}`, fields)
      )
    : [];

  if (!title && youtubeVideoId) {
    pushField(fields, `${fieldPrefix}.title`, "Lesson title is required when a video is attached.");
  }

  if (notes && looksLikeHtml(notes)) {
    pushField(fields, `${fieldPrefix}.notes`, "Lesson notes must be plain text.");
  }

  const quiz = validateQuiz(record.quiz, `${fieldPrefix}.quiz`, fields);

  return {
    lessonId: sanitizeString(record.lessonId, 80) || `lesson_${sectionIndex + 1}_${lessonIndex + 1}`,
    title,
    youtubeVideoId,
    notes,
    order: lessonIndex + 1,
    requiresPrevious: record.requiresPrevious === true,
    attachments,
    quiz,
    requiresQuizPass: record.requiresQuizPass === true || quiz?.required === true,
    durationLabel: sanitizeString(record.durationLabel, 32) || undefined
  };
}

function validateSection(value: unknown, sectionIndex: number, fields: Record<string, string>): CourseSectionDocument {
  const record = isRecord(value) ? value : {};
  const title = sanitizeString(record.title, 110);
  const lessons = Array.isArray(record.lessons)
    ? record.lessons.slice(0, 12).map((lesson, lessonIndex) => validateLesson(lesson, sectionIndex, lessonIndex, fields))
    : [];

  if (!title) {
    pushField(fields, `sections.${sectionIndex}.title`, "Section title is required.");
  }

  return {
    sectionId: sanitizeString(record.sectionId ?? record.id, 80) || `section_${sectionIndex + 1}`,
    title,
    order: sectionIndex + 1,
    lessons
  };
}

export function getPublishBlockedReasons(course: Pick<CourseDocument, "sections">) {
  const reasons: string[] = [];
  const lessons = course.sections.flatMap((section) => section.lessons);

  if (course.sections.length === 0) {
    reasons.push("Add at least one section.");
  }

  if (lessons.length === 0) {
    reasons.push("Add at least one lesson.");
  }

  if (lessons.some((lesson) => !lesson.title.trim())) {
    reasons.push("Every lesson needs a title before publishing.");
  }

  if (lessons.some((lesson) => !lesson.youtubeVideoId)) {
    reasons.push("Every published lesson needs a valid YouTube video ID.");
  }

  if (
    lessons.some((lesson) =>
      lesson.requiresQuizPass && !lesson.quiz?.questions.some((question) => question.type !== "short_text_self_check")
    )
  ) {
    reasons.push("Required lesson checks need at least one objective question.");
  }

  return reasons;
}

export function validateCourseMetadataPayload(payload: unknown): CourseMetadataPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send valid course metadata.");
  }

  const fields: Record<string, string> = {};
  const title = sanitizeString(payload.title, 110);
  const description = sanitizeText(payload.description, 600);
  const accessTier = sanitizeString(payload.accessTier, 90) || "all";
  const thumbnailVideoId = extractYouTubeVideoId(
    payload.thumbnailVideoInput ?? payload.thumbnailVideoId,
    "thumbnailVideoInput",
    fields
  );

  if (!title) {
    pushField(fields, "title", "Enter a course title.");
  }

  if (!description || description.length < 12) {
    pushField(fields, "description", "Add a short course description.");
  }

  if (description && looksLikeHtml(description)) {
    pushField(fields, "description", "Course description must be plain text.");
  }

  throwFields(fields);

  return {
    title,
    description,
    accessTier,
    thumbnailVideoInput: thumbnailVideoId
  };
}

export function validateCourseCreatePayload(payload: unknown): CourseCreatePayload {
  const metadata = validateCourseMetadataPayload(payload);
  const record = isRecord(payload) ? payload : {};
  const fields: Record<string, string> = {};
  const sections = Array.isArray(record.sections)
    ? record.sections.slice(0, 8).map((section, index) => validateSection(section, index, fields))
    : [];

  throwFields(fields);

  return {
    ...metadata,
    sections
  };
}

export function validateCourseSavePayload(payload: unknown, current: CourseDocument): CourseSavePayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a valid course save payload.");
  }

  const metadata = validateCourseMetadataPayload(payload);
  const fields: Record<string, string> = {};
  const sections = Array.isArray(payload.sections)
    ? payload.sections.slice(0, 8).map((section, index) => validateSection(section, index, fields))
    : current.sections;
  const action = allowedActions.includes(payload.action as never)
    ? payload.action as CourseSavePayload["action"]
    : "save_draft";

  if (action === "publish") {
    const publishReasons = getPublishBlockedReasons({ sections });
    if (publishReasons.length > 0) {
      pushField(fields, "publish", publishReasons.join(" "));
    }
  }

  throwFields(fields);

  return {
    ...metadata,
    sections,
    action
  };
}

export function validateLessonProgressPayload(payload: unknown): LessonProgressPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send a lesson progress milestone.");
  }

  const milestone = asString(payload.milestone) as LessonProgressMilestone;

  if (!progressMilestones.includes(milestone)) {
    throw new AdminApiError(400, "invalid_milestone", "Use started, watched_80, completed, or quiz_passed.");
  }

  const quizScore = Number(payload.quizScore);

  return {
    milestone,
    quizScore: Number.isFinite(quizScore) ? Math.max(0, Math.min(100, Math.round(quizScore))) : undefined
  };
}

function normalizePositionSeconds(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AdminApiError(400, "invalid_lesson_position", "Use a valid non-negative lesson position.");
  }

  return Math.min(86400, Math.round(parsed));
}

export function validateLessonNotePayload(payload: unknown): LessonNotePayload {
  const record = isRecord(payload) ? payload : {};
  const text = sanitizeText(record.text, 2400);

  if (!text) {
    throw new AdminApiError(400, "lesson_note_required", "Add a note before saving.");
  }

  if (looksLikeHtml(text)) {
    throw new AdminApiError(400, "lesson_note_plain_text_only", "Lesson notes must be plain text.");
  }

  return { text };
}

export function validateLessonBookmarkPayload(payload: unknown): LessonBookmarkPayload {
  const record = isRecord(payload) ? payload : {};
  const label = sanitizeString(record.label, 90) || undefined;

  if (label && looksLikeHtml(label)) {
    throw new AdminApiError(400, "lesson_bookmark_plain_text_only", "Bookmark labels must be plain text.");
  }

  return {
    label,
    positionSeconds: normalizePositionSeconds(record.positionSeconds)
  };
}

export function validateLessonResumePayload(payload: unknown): LessonResumePayload {
  const record = isRecord(payload) ? payload : {};

  return {
    positionSeconds: normalizePositionSeconds(record.positionSeconds)
  };
}

export function validateLessonCheckAttemptPayload(payload: unknown): LessonCheckAttemptPayload {
  if (!isRecord(payload)) {
    throw new AdminApiError(400, "invalid_payload", "Send lesson check answers.");
  }

  const answers = Array.isArray(payload.answers)
    ? payload.answers.slice(0, 8).map((entry) => {
        const record = isRecord(entry) ? entry : {};
        const questionIndex = Math.max(0, Math.min(7, Math.round(Number(record.questionIndex))));
        const selectedOptionIndex = Number(record.selectedOptionIndex);
        const text = sanitizeText(record.text, 600);

        return {
          questionIndex,
          selectedOptionIndex: Number.isInteger(selectedOptionIndex)
            ? Math.max(0, Math.min(6, selectedOptionIndex))
            : undefined,
          text: text || undefined
        };
      })
    : [];

  if (answers.length === 0) {
    throw new AdminApiError(400, "answers_required", "Answer at least one lesson check question.");
  }

  return { answers };
}
