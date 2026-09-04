import { createHash } from "node:crypto";
import type { DocumentData, Query } from "firebase-admin/firestore";
import { createSourceMeta } from "@/lib/course-hub/course-source";
import {
  courseToListItem,
  mapCourseDocument,
  mapLessonProgressDocument,
  mapStudentCourseProgressDocument,
  recordFromSnapshot
} from "@/lib/course-hub/course-mappers";
import {
  getPublishBlockedReasons,
  parseCourseHubFilters,
  validateLessonBookmarkPayload,
  validateLessonCheckAttemptPayload,
  validateLessonNotePayload,
  validateCourseCreatePayload,
  validateCourseSavePayload,
  validateLessonProgressPayload,
  validateLessonResumePayload,
  type CourseListFilters
} from "@/lib/course-hub/course-validation";
import {
  getFeatureEntitlement,
  resolveStudentEntitlements
} from "@/lib/entitlements/student-entitlements";
import {
  mapBillingWorkspace,
  mapSubscriptionRecord
} from "@/lib/billing/billing-mappers";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import type { VerifiedInfluencer } from "@/lib/firebase/influencer-auth";
import type { VerifiedStudent } from "@/lib/firebase/student-auth";
import { buildAuditEvent } from "@/lib/workspace/onboarding-mappers";
import type { StudentEntitlementSummary } from "@/types/entitlements";
import type {
  CourseDocument,
  CourseLearningProgressSummary,
  CourseHubDetailResponse,
  CourseHubListResponse,
  CourseHubMutationResponse,
  CourseSectionDocument,
  CourseLesson,
  CourseQuiz,
  LessonBookmarkMutationResponse,
  LessonCheckAttemptDocument,
  LessonCheckAttemptResponse,
  LessonNoteMutationResponse,
  LessonProgressDocument,
  LessonProgressResponse,
  LessonResumeMutationResponse,
  StudentCourseCompletionProofResponse,
  StudentCourseDetailResponse,
  StudentCourseLearningItem,
  StudentCourseLessonSearchItem,
  StudentCourseLearningStateResponse,
  StudentCourseListItem,
  StudentCourseListResponse,
  StudentCourseProgressDocument,
  StudentCourseResumePointDocument,
  StudentLessonBookmarkDocument,
  StudentLessonNoteDocument,
  WorkspaceCourseCompletionSummary
} from "@/types/course-hub";

type StudentAccessContext = {
  studentId: string;
  tierId: string;
  tierLabel: string;
  entitlements: StudentEntitlementSummary;
  workspaceLabel: string;
};

type StudentCourseAccessState = StudentCourseListItem["accessState"];

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry)) as T;
  }

  if (typeof value === "object" && value !== null) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        cleaned[key] = stripUndefined(entry);
      }
    }

    return cleaned as T;
  }

  return value;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pageInfo(limit: number, loadedCount: number, nextCursor: string | null) {
  return {
    limit,
    nextCursor,
    hasMore: Boolean(nextCursor),
    totalLoaded: loadedCount
  };
}

function addLimitedSearchWarning(warnings: string[], q?: string) {
  if (q) {
    warnings.push("Search is applied to the loaded page only. Full indexed course search is deferred.");
  }
}

function addCourseIndexFallbackWarning(warnings: string[]) {
  warnings.push(
    "Student course sorting is using a temporary Firestore fallback until the published+updatedAt index is created."
  );
}

function applyCourseSearch<T extends { title: string; description: string }>(items: T[], q?: string) {
  if (!q) {
    return items;
  }

  const normalized = q.toLowerCase();
  return items.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(normalized));
}

function sortCoursesByUpdatedAtDesc<T extends { updatedAt: string; courseId: string }>(courses: T[]) {
  return [...courses].sort((left, right) => {
    if (left.updatedAt === right.updatedAt) {
      return left.courseId.localeCompare(right.courseId);
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function applyCourseCursor<T extends { updatedAt: string }>(courses: T[], cursor?: string | null) {
  if (!cursor) {
    return courses;
  }

  return courses.filter((course) => course.updatedAt < cursor);
}

function isFirestoreMissingIndexError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const code = "code" in error ? error.code : null;

  return code === 9 || message.toLowerCase().includes("requires an index");
}

function makeCourseId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 34) || "course";

  return `course_${slug}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

function makeMaskedCourseStudentRef(workspaceId: string, studentId: string) {
  const digest = createHash("sha256")
    .update(`${workspaceId}:${studentId}:course_completion`)
    .digest("hex")
    .slice(0, 10);

  return `student_${digest}`;
}

function makeCourseProofRef(workspaceId: string, studentId: string, courseId: string) {
  const digest = createHash("sha256")
    .update(`${workspaceId}:${studentId}:${courseId}:completion_proof`)
    .digest("hex")
    .slice(0, 12);

  return `proof_${digest}`;
}

function makeLessonLearningItemId(courseId: string, lessonId: string, kind: "note" | "bookmark") {
  const digest = createHash("sha256")
    .update(`${courseId}:${lessonId}:${kind}:course_learning_item`)
    .digest("hex")
    .slice(0, 16);

  return `${kind}_${digest}`;
}

function makeStudentLessonSearchItemId(
  courseId: string,
  lessonId: string,
  kind: StudentCourseLessonSearchItem["kind"],
  suffix = ""
) {
  const digest = createHash("sha256")
    .update(`${courseId}:${lessonId}:${kind}:${suffix}:student_course_discovery`)
    .digest("hex")
    .slice(0, 16);

  return `${kind}_${digest}`;
}

function previewText(value: string, maxLength = 180) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function flattenCourseLessons(course: CourseDocument) {
  return course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      lesson,
      sectionTitle: section.title
    }))
  );
}

function buildStudentLessonSearchItems(course: CourseDocument): StudentCourseLessonSearchItem[] {
  return course.sections.flatMap((section) =>
    section.lessons.flatMap((lesson) => {
      const lessonItem: StudentCourseLessonSearchItem = {
        kind: "lesson",
        itemId: makeStudentLessonSearchItemId(course.courseId, lesson.lessonId, "lesson"),
        courseId: course.courseId,
        lessonId: lesson.lessonId,
        courseTitle: course.title,
        lessonTitle: lesson.title,
        sectionTitle: section.title,
        title: lesson.title,
        preview: previewText(`${section.title} ${lesson.notes}`, 180)
      };
      const resourceItems: StudentCourseLessonSearchItem[] = lesson.attachments.map((resource, resourceIndex) => ({
        kind: "resource",
        itemId: makeStudentLessonSearchItemId(
          course.courseId,
          lesson.lessonId,
          "resource",
          `${resourceIndex}:${resource.label}:${resource.hostname}`
        ),
        courseId: course.courseId,
        lessonId: lesson.lessonId,
        courseTitle: course.title,
        lessonTitle: lesson.title,
        sectionTitle: section.title,
        title: resource.label,
        preview: previewText(resource.description || `${resource.hostname} resource for ${lesson.title}`, 180),
        resourceType: resource.type,
        hostname: resource.hostname
      }));

      return [lessonItem, ...resourceItems];
    })
  ).slice(0, 150);
}

function buildCourseLearningProgressSummary({
  course,
  progress,
  locked
}: {
  course: CourseDocument;
  progress: StudentCourseProgressDocument | null;
  locked?: boolean;
}): CourseLearningProgressSummary {
  const lessons = flattenCourseLessons(course);
  const totalLessonCount = lessons.length;
  const completedLessonCount = Math.min(progress?.completedLessonCount ?? 0, totalLessonCount);
  const percentComplete =
    totalLessonCount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            progress?.overallPercent ?? Math.round((completedLessonCount / totalLessonCount) * 100)
          )
        )
      : 0;
  const completed = totalLessonCount > 0 && completedLessonCount >= totalLessonCount && percentComplete >= 100;
  const nextLesson = completed || locked ? null : lessons[completedLessonCount] ?? lessons[0] ?? null;

  return stripUndefined({
    completedLessonCount,
    totalLessonCount,
    percentComplete,
    status: locked
      ? "locked"
      : completed
        ? "completed"
        : completedLessonCount > 0 || percentComplete > 0
          ? "in_progress"
          : "not_started",
    nextLessonId: nextLesson?.lesson.lessonId,
    nextLessonTitle: nextLesson?.lesson.title,
    nextSectionTitle: nextLesson?.sectionTitle,
    completedAt: completed ? progress?.updatedAt : undefined
  });
}

function isLessonCompleteForCourse(lesson: CourseLesson, progress: LessonProgressDocument | null) {
  return Boolean(progress?.completed && (!lesson.requiresQuizPass || progress.quizPassed));
}

function mapLessonCheckAttemptDocument(
  record: Record<string, unknown> | null,
  fallback: {
    workspaceId: string;
    studentId: string;
    courseId: string;
    lessonId: string;
  }
): LessonCheckAttemptDocument | null {
  if (!record) {
    return null;
  }

  return {
    workspaceId: asString(record.workspaceId, fallback.workspaceId),
    studentId: asString(record.studentId, fallback.studentId),
    courseId: asString(record.courseId, fallback.courseId),
    lessonId: asString(record.lessonId, fallback.lessonId),
    attemptId: asString(record.attemptId),
    status: asString(record.status, "needs_retry") === "passed" ? "passed" : "needs_retry",
    scorePercent: asNumber(record.scorePercent),
    passThresholdPercent: asNumber(record.passThresholdPercent, 70),
    correctQuestionNumbers: Array.isArray(record.correctQuestionNumbers)
      ? record.correctQuestionNumbers.filter((entry): entry is number => typeof entry === "number")
      : [],
    incorrectQuestionNumbers: Array.isArray(record.incorrectQuestionNumbers)
      ? record.incorrectQuestionNumbers.filter((entry): entry is number => typeof entry === "number")
      : [],
    objectiveQuestionCount: asNumber(record.objectiveQuestionCount),
    totalQuestionCount: asNumber(record.totalQuestionCount),
    selfCheckCount: asNumber(record.selfCheckCount),
    submittedAt: asString(record.submittedAt, new Date().toISOString())
  };
}

function mapStudentLessonNoteDocument(
  record: Record<string, unknown> | null,
  fallback: {
    workspaceId: string;
    studentId: string;
    courseId: string;
    lessonId: string;
    noteId: string;
  }
): StudentLessonNoteDocument | null {
  if (!record) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    workspaceId: asString(record.workspaceId, fallback.workspaceId),
    studentId: asString(record.studentId, fallback.studentId),
    courseId: asString(record.courseId, fallback.courseId),
    lessonId: asString(record.lessonId, fallback.lessonId),
    noteId: asString(record.noteId, fallback.noteId),
    courseTitle: asString(record.courseTitle, "Course"),
    lessonTitle: asString(record.lessonTitle, "Lesson"),
    sectionTitle: asString(record.sectionTitle, "Section"),
    text: asString(record.text),
    createdAt: asString(record.createdAt, now),
    updatedAt: asString(record.updatedAt, now)
  };
}

function mapStudentLessonBookmarkDocument(
  record: Record<string, unknown> | null,
  fallback: {
    workspaceId: string;
    studentId: string;
    courseId: string;
    lessonId: string;
    bookmarkId: string;
  }
): StudentLessonBookmarkDocument | null {
  if (!record) {
    return null;
  }

  const now = new Date().toISOString();
  const positionSeconds = asNumber(record.positionSeconds, -1);

  return stripUndefined({
    workspaceId: asString(record.workspaceId, fallback.workspaceId),
    studentId: asString(record.studentId, fallback.studentId),
    courseId: asString(record.courseId, fallback.courseId),
    lessonId: asString(record.lessonId, fallback.lessonId),
    bookmarkId: asString(record.bookmarkId, fallback.bookmarkId),
    courseTitle: asString(record.courseTitle, "Course"),
    lessonTitle: asString(record.lessonTitle, "Lesson"),
    sectionTitle: asString(record.sectionTitle, "Section"),
    label: asString(record.label) || undefined,
    positionSeconds: positionSeconds >= 0 ? positionSeconds : undefined,
    createdAt: asString(record.createdAt, now),
    updatedAt: asString(record.updatedAt, now)
  });
}

function mapStudentCourseResumePointDocument(
  record: Record<string, unknown> | null,
  fallback: {
    workspaceId: string;
    studentId: string;
  }
): StudentCourseResumePointDocument | null {
  if (!record) {
    return null;
  }

  const positionSeconds = asNumber(record.positionSeconds, -1);

  return stripUndefined({
    workspaceId: asString(record.workspaceId, fallback.workspaceId),
    studentId: asString(record.studentId, fallback.studentId),
    courseId: asString(record.courseId),
    lessonId: asString(record.lessonId),
    courseTitle: asString(record.courseTitle, "Course"),
    lessonTitle: asString(record.lessonTitle, "Lesson"),
    sectionTitle: asString(record.sectionTitle, "Section"),
    positionSeconds: positionSeconds >= 0 ? positionSeconds : undefined,
    updatedAt: asString(record.updatedAt, new Date().toISOString())
  });
}

function noteToLearningItem(note: StudentLessonNoteDocument): StudentCourseLearningItem {
  return {
    kind: "note",
    itemId: note.noteId,
    courseId: note.courseId,
    lessonId: note.lessonId,
    courseTitle: note.courseTitle,
    lessonTitle: note.lessonTitle,
    sectionTitle: note.sectionTitle,
    preview: previewText(note.text),
    updatedAt: note.updatedAt
  };
}

function bookmarkToLearningItem(bookmark: StudentLessonBookmarkDocument): StudentCourseLearningItem {
  return stripUndefined({
    kind: "bookmark" as const,
    itemId: bookmark.bookmarkId,
    courseId: bookmark.courseId,
    lessonId: bookmark.lessonId,
    courseTitle: bookmark.courseTitle,
    lessonTitle: bookmark.lessonTitle,
    sectionTitle: bookmark.sectionTitle,
    label: bookmark.label,
    preview: previewText(bookmark.label || bookmark.lessonTitle || "Bookmarked lesson"),
    positionSeconds: bookmark.positionSeconds,
    updatedAt: bookmark.updatedAt
  });
}

function buildStudentLessonCheck({
  quiz,
  required,
  latestAttempt,
  locked
}: {
  quiz?: CourseQuiz;
  required: boolean;
  latestAttempt: LessonCheckAttemptDocument | null;
  locked: boolean;
}) {
  if (!quiz || quiz.questions.length === 0) {
    return undefined;
  }

  const objectiveQuestionCount = quiz.questions.filter((question) => question.type !== "short_text_self_check").length;

  return {
    required,
    passThresholdPercent: quiz.passThresholdPercent,
    questionCount: quiz.questions.length,
    objectiveQuestionCount,
    questions: quiz.questions.map((question, index) => ({
      questionIndex: index,
      type: question.type,
      question: question.question,
      options: question.options
    })),
    attemptStatus: locked
      ? "locked_until_lesson_available" as const
      : latestAttempt?.status ?? "not_started" as const,
    latestAttempt: latestAttempt ?? undefined
  };
}

function newSectionShell(): CourseSectionDocument[] {
  return [
    {
      sectionId: "section_1",
      title: "Start here",
      order: 1,
      lessons: []
    }
  ];
}

function courseRef(workspaceId: string, courseId: string) {
  const { db } = getFirebaseAdminClients();
  return db.doc(`workspaces/${workspaceId}/courses/${courseId}`);
}

async function getCourseOrThrow(workspaceId: string, courseId: string) {
  const snapshot = await courseRef(workspaceId, courseId).get();

  if (!snapshot.exists) {
    throw new AdminApiError(404, "course_not_found", "That course was not found.");
  }

  return mapCourseDocument(recordFromSnapshot(snapshot, "courseId"), workspaceId);
}

export function parseCourseHubRequest(request: Request): CourseListFilters {
  return parseCourseHubFilters(new URL(request.url).searchParams);
}

export async function listInfluencerCourses(
  actor: VerifiedInfluencer,
  filters: CourseListFilters
): Promise<CourseHubListResponse> {
  const { db } = getFirebaseAdminClients();
  let query: Query<DocumentData> = db
    .collection(`workspaces/${actor.workspaceId}/courses`)
    .orderBy("updatedAt", "desc");

  if (filters.cursor) {
    query = query.startAfter(filters.cursor);
  }

  const snapshot = await query.limit(filters.limit).get();
  const loadedCourseDocs = snapshot.docs.map((doc) =>
    mapCourseDocument(recordFromSnapshot(doc, "courseId"), actor.workspaceId)
  );
  const warnings: string[] = [];
  addLimitedSearchWarning(warnings, filters.q);
  const courseDocs = applyCourseSearch(loadedCourseDocs, filters.q);
  const completionSummaries = await buildWorkspaceCourseCompletionSummaries(actor.workspaceId, courseDocs);
  const courses = courseDocs.map((course) => ({
    ...courseToListItem(course, getPublishBlockedReasons(course)),
    completionSummary: completionSummaries.get(course.courseId)
  }));
  const nextCursor = loadedCourseDocs.length === filters.limit ? loadedCourseDocs[loadedCourseDocs.length - 1]?.updatedAt ?? null : null;

  return {
    ...createSourceMeta(warnings),
    ok: true,
    courses,
    pageInfo: pageInfo(filters.limit, courses.length, nextCursor)
  };
}

export async function createInfluencerCourse(
  actor: VerifiedInfluencer,
  payload: unknown
): Promise<CourseHubMutationResponse> {
  const values = validateCourseCreatePayload(payload);
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const courseId = makeCourseId(values.title);
  const course: CourseDocument = stripUndefined({
    courseId,
    workspaceId: actor.workspaceId,
    title: values.title,
    description: values.description,
    thumbnailVideoId: values.thumbnailVideoInput,
    accessTier: values.accessTier || "all",
    published: false,
    status: "draft",
    sections: values.sections && values.sections.length > 0 ? values.sections : newSectionShell(),
    createdAt: now,
    updatedAt: now
  });
  const auditEvent = buildAuditEvent({
    actor,
    action: "workspace.course.create_draft",
    targetType: "workspace",
    targetId: actor.workspaceId,
    after: { courseId, title: course.title },
    now
  });

  const batch = db.batch();
  batch.set(db.doc(`workspaces/${actor.workspaceId}/courses/${courseId}`), stripUndefined(course));
  batch.set(db.doc(`audit_log/${auditEvent.eventId}`), stripUndefined(auditEvent));
  await batch.commit();

  return {
    ...createSourceMeta(),
    ok: true,
    course,
    publishBlockedReasons: getPublishBlockedReasons(course),
    auditEvent
  };
}

export async function getInfluencerCourse(
  actor: VerifiedInfluencer,
  courseId: string
): Promise<CourseHubDetailResponse> {
  const course = await getCourseOrThrow(actor.workspaceId, courseId);

  return {
    ...createSourceMeta(),
    ok: true,
    course,
    publishBlockedReasons: getPublishBlockedReasons(course)
  };
}

export async function patchInfluencerCourse({
  actor,
  courseId,
  payload
}: {
  actor: VerifiedInfluencer;
  courseId: string;
  payload: unknown;
}): Promise<CourseHubMutationResponse> {
  const current = await getCourseOrThrow(actor.workspaceId, courseId);
  const values = validateCourseSavePayload(payload, current);
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const nextStatus =
    values.action === "publish"
      ? "published"
      : values.action === "archive"
        ? "archived"
        : values.action === "unpublish"
          ? "draft"
          : current.status === "published"
            ? "draft"
            : current.status;
  const course: CourseDocument = stripUndefined({
    ...current,
    title: values.title,
    description: values.description,
    thumbnailVideoId: values.thumbnailVideoInput,
    accessTier: values.accessTier || "all",
    sections: values.sections,
    status: nextStatus,
    published: nextStatus === "published",
    updatedAt: now,
    publishedAt: nextStatus === "published" ? current.publishedAt ?? now : current.publishedAt
  });
  const auditEvent = buildAuditEvent({
    actor,
    action: `workspace.course.${values.action ?? "save_draft"}`,
    targetType: "workspace",
    targetId: actor.workspaceId,
    before: { courseId: current.courseId, status: current.status, title: current.title },
    after: { courseId: course.courseId, status: course.status, title: course.title },
    now
  });
  const batch = db.batch();

  batch.set(db.doc(`workspaces/${actor.workspaceId}/courses/${courseId}`), stripUndefined(course), { merge: false });
  batch.set(db.doc(`audit_log/${auditEvent.eventId}`), stripUndefined(auditEvent));
  await batch.commit();

  return {
    ...createSourceMeta(),
    ok: true,
    course,
    publishBlockedReasons: getPublishBlockedReasons(course),
    auditEvent
  };
}

async function getStudentAccessContext(actor: VerifiedStudent): Promise<StudentAccessContext> {
  const { db } = getFirebaseAdminClients();
  const workspaceRef = db.doc(`workspaces/${actor.workspaceId}`);
  const studentRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}`);
  const subscriptionRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/subscriptions/current`);
  const [workspaceSnapshot, studentSnapshot, subscriptionSnapshot] = await Promise.all([
    workspaceRef.get(),
    studentRef.get(),
    subscriptionRef.get()
  ]);

  if (!workspaceSnapshot.exists) {
    throw new AdminApiError(404, "workspace_not_found", "This workspace was not found.");
  }

  if (!studentSnapshot.exists) {
    throw new AdminApiError(
      403,
      "student_record_required",
      "This student account is signed in but has not been provisioned inside this workspace yet."
    );
  }

  const record = studentSnapshot.data() ?? {};
  const workspace = mapBillingWorkspace(workspaceSnapshot, actor.workspaceId);
  const subscription = mapSubscriptionRecord(
    subscriptionSnapshot.exists ? recordFromSnapshot(subscriptionSnapshot, "subscriptionId") : null,
    actor.workspaceId,
    actor.studentId
  );
  const entitlements = resolveStudentEntitlements({
    workspace,
    studentRecord: record,
    subscription,
    claimedTierId: actor.tierId
  });

  return {
    studentId: actor.studentId,
    tierId: entitlements.tierId,
    tierLabel: entitlements.tierLabel,
    entitlements,
    workspaceLabel: workspace.name
  };
}

function resolveCourseAccessState(
  course: CourseDocument,
  student: StudentAccessContext
): StudentCourseAccessState {
  const courseEntitlement = getFeatureEntitlement(student.entitlements, "course");

  if (courseEntitlement.access === "locked_by_subscription") {
    return "locked_by_subscription";
  }

  if (courseEntitlement.access === "feature_not_enabled") {
    return "feature_not_enabled";
  }

  if (courseEntitlement.access === "locked_by_tier") {
    return "locked_by_tier";
  }

  if (course.accessTier !== "all" && student.tierId !== "all" && course.accessTier !== student.tierId) {
    return "locked_by_tier";
  }

  return "available";
}

function getCourseLockedReason(
  course: CourseDocument,
  student: StudentAccessContext,
  accessState: StudentCourseAccessState
) {
  const courseEntitlement = getFeatureEntitlement(student.entitlements, "course");

  if (accessState !== "available" && courseEntitlement.access === accessState) {
    return courseEntitlement.reason;
  }

  if (accessState === "locked_by_tier") {
    if (course.accessTier !== "all" && course.accessTier !== student.tierId) {
      return `${course.title} is reserved for the ${course.accessTier} tier. Upgrade access to unlock it.`;
    }

    return courseEntitlement.reason;
  }

  if (accessState === "locked_by_subscription") {
    return courseEntitlement.reason;
  }

  return courseEntitlement.reason;
}

async function getCourseProgressMap(
  workspaceId: string,
  studentId: string,
  courses: CourseDocument[]
) {
  const { db } = getFirebaseAdminClients();
  const refs = courses.map((course) =>
    db.doc(`workspaces/${workspaceId}/students/${studentId}/course_progress/${course.courseId}`)
  );

  if (refs.length === 0) {
    return new Map<string, StudentCourseProgressDocument | null>();
  }

  const snapshots = await db.getAll(...refs);
  return new Map(
    snapshots.map((snapshot, index) => {
      const course = courses[index];
      const lessonCount = course.sections.flatMap((section) => section.lessons).length;
      return [
        course.courseId,
        mapStudentCourseProgressDocument(
          snapshot.exists ? recordFromSnapshot(snapshot, "courseId") : null,
          {
            workspaceId,
            studentId,
            courseId: course.courseId,
            lessonCount
          }
        )
      ] as const;
    })
  );
}

async function getStudentCourseLearningState(
  workspaceId: string,
  studentId: string
): Promise<{
  continueLearning?: StudentCourseResumePointDocument;
  learningItems: StudentCourseLearningItem[];
}> {
  const { db } = getFirebaseAdminClients();
  const [resumeSnapshot, notesSnapshot, bookmarksSnapshot] = await Promise.all([
    db.doc(`workspaces/${workspaceId}/students/${studentId}/course_resume_points/current`).get(),
    db
      .collection(`workspaces/${workspaceId}/students/${studentId}/course_lesson_notes`)
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get(),
    db
      .collection(`workspaces/${workspaceId}/students/${studentId}/course_lesson_bookmarks`)
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get()
  ]);
  const notes = notesSnapshot.docs
    .map((snapshot) =>
      mapStudentLessonNoteDocument(recordFromSnapshot(snapshot, "noteId"), {
        workspaceId,
        studentId,
        courseId: "",
        lessonId: "",
        noteId: snapshot.id
      })
    )
    .filter((entry): entry is StudentLessonNoteDocument => Boolean(entry?.text));
  const bookmarks = bookmarksSnapshot.docs
    .map((snapshot) =>
      mapStudentLessonBookmarkDocument(recordFromSnapshot(snapshot, "bookmarkId"), {
        workspaceId,
        studentId,
        courseId: "",
        lessonId: "",
        bookmarkId: snapshot.id
      })
    )
    .filter((entry): entry is StudentLessonBookmarkDocument => Boolean(entry?.courseId && entry.lessonId));
  const learningItems = [
    ...notes.map(noteToLearningItem),
    ...bookmarks.map(bookmarkToLearningItem)
  ]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 75);
  const continueLearning = mapStudentCourseResumePointDocument(
    resumeSnapshot.exists ? recordFromSnapshot(resumeSnapshot, "resumePointId") : null,
    { workspaceId, studentId }
  ) ?? undefined;

  return {
    continueLearning,
    learningItems
  };
}

function buildCourseProgressFromLessonProgress({
  workspaceId,
  studentId,
  course,
  progressByLesson,
  lastLessonId,
  now
}: {
  workspaceId: string;
  studentId: string;
  course: CourseDocument;
  progressByLesson: Array<LessonProgressDocument | null>;
  lastLessonId?: string;
  now: string;
}): StudentCourseProgressDocument {
  const lessons = course.sections.flatMap((section) => section.lessons);
  const completedLessonCount = lessons.filter((lesson, index) =>
    isLessonCompleteForCourse(lesson, progressByLesson[index] ?? null)
  ).length;
  const percentTotal = lessons.reduce((total, lesson, index) => {
    const progress = progressByLesson[index] ?? null;

    if (isLessonCompleteForCourse(lesson, progress)) {
      return total + 100;
    }

    return total + (progress?.watchedPercent ?? 0);
  }, 0);

  return {
    workspaceId,
    studentId,
    courseId: course.courseId,
    completedLessonCount,
    lessonCount: lessons.length,
    overallPercent: lessons.length > 0 ? Math.round(percentTotal / lessons.length) : 0,
    lastLessonId,
    updatedAt: now
  };
}

function findLessonContext(course: CourseDocument, lessonId: string) {
  const flattened = course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      lesson,
      sectionTitle: section.title
    }))
  );
  const lessonIndex = flattened.findIndex((entry) => entry.lesson.lessonId === lessonId);
  const entry = flattened[lessonIndex];

  if (!entry) {
    throw new AdminApiError(404, "lesson_not_found", "That lesson was not found in this course.");
  }

  return {
    ...entry,
    lessonIndex,
    lessons: flattened.map((item) => item.lesson)
  };
}

async function assertStudentCanUseLessonLearningTools({
  actor,
  course,
  student,
  lessonId
}: {
  actor: VerifiedStudent;
  course: CourseDocument;
  student: StudentAccessContext;
  lessonId: string;
}) {
  if (!course.published || course.status !== "published") {
    throw new AdminApiError(403, "course_not_available", "This course is not available to this student.");
  }

  const accessState = resolveCourseAccessState(course, student);

  if (accessState !== "available") {
    throw new AdminApiError(
      403,
      `course_${accessState}`,
      getCourseLockedReason(course, student, accessState)
    );
  }

  const context = findLessonContext(course, lessonId);

  if (context.lesson.requiresPrevious && context.lessonIndex > 0) {
    const previousLesson = context.lessons[context.lessonIndex - 1];
    const previousSnapshot = await getFirebaseAdminClients().db
      .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${previousLesson.lessonId}`)
      .get();
    const previousProgress = mapLessonProgressDocument(
      previousSnapshot.exists ? recordFromSnapshot(previousSnapshot, "lessonId") : null,
      {
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        courseId: course.courseId,
        lessonId: previousLesson.lessonId
      }
    );

    if (!isLessonCompleteForCourse(previousLesson, previousProgress)) {
      throw new AdminApiError(403, "lesson_locked_by_previous", "Complete the previous lesson first.");
    }
  }

  return context;
}

async function buildWorkspaceCourseCompletionSummaries(
  workspaceId: string,
  courses: CourseDocument[]
): Promise<Map<string, WorkspaceCourseCompletionSummary>> {
  const { db } = getFirebaseAdminClients();
  const studentSnapshot = await db.collection(`workspaces/${workspaceId}/students`).limit(250).get();
  const studentRecords = studentSnapshot.docs.map((snapshot) => {
    const record = recordFromSnapshot(snapshot, "studentId");
    const studentId = asString(record.studentId, snapshot.id);

    return {
      studentId,
      tierId: asString(record.tierId, asString(record.currentTierId, "all"))
    };
  });
  const summaries = new Map<string, WorkspaceCourseCompletionSummary>();

  for (const course of courses) {
    const courseLessons = flattenCourseLessons(course);
    const checkedLessons = courseLessons
      .filter((entry) => entry.lesson.quiz?.questions.length)
      .slice(0, 20);
    const eligibleStudents = studentRecords.filter(
      (student) => course.accessTier === "all" || student.tierId === "all" || student.tierId === course.accessTier
    );
    const progressRefs = eligibleStudents.map((student) =>
      db.doc(`workspaces/${workspaceId}/students/${student.studentId}/course_progress/${course.courseId}`)
    );
    const snapshots = progressRefs.length > 0 ? await db.getAll(...progressRefs) : [];
    const progressRecords = snapshots
      .map((snapshot, index) =>
        mapStudentCourseProgressDocument(
          snapshot.exists ? recordFromSnapshot(snapshot, "courseId") : null,
          {
            workspaceId,
            studentId: eligibleStudents[index]?.studentId ?? "",
            courseId: course.courseId,
            lessonCount: courseLessons.length
          }
        )
      )
      .filter((entry): entry is StudentCourseProgressDocument => Boolean(entry));
    const started = progressRecords.filter((entry) => entry.overallPercent > 0 || entry.completedLessonCount > 0);
    const completed = progressRecords.filter(
      (entry) => entry.lessonCount > 0 && entry.completedLessonCount >= entry.lessonCount && entry.overallPercent >= 100
    );
    const attemptRefs = eligibleStudents.slice(0, 75).flatMap((student) =>
      checkedLessons.map((entry) =>
        db.doc(`workspaces/${workspaceId}/students/${student.studentId}/lesson_check_attempts/${entry.lesson.lessonId}`)
      )
    );
    const attemptSnapshots = attemptRefs.length > 0 ? await db.getAll(...attemptRefs) : [];
    const attemptRecords = attemptSnapshots
      .map((snapshot) =>
        mapLessonCheckAttemptDocument(
          snapshot.exists ? recordFromSnapshot(snapshot, "lessonId") : null,
          {
            workspaceId,
            studentId: "",
            courseId: course.courseId,
            lessonId: ""
          }
        )
      )
      .filter((entry): entry is LessonCheckAttemptDocument => Boolean(entry));
    const learningStudents = eligibleStudents.slice(0, 75);
    const learningLessons = courseLessons.slice(0, 50);
    const noteRefs = learningStudents.flatMap((student) =>
      learningLessons.map((entry) =>
        db.doc(
          `workspaces/${workspaceId}/students/${student.studentId}/course_lesson_notes/${makeLessonLearningItemId(course.courseId, entry.lesson.lessonId, "note")}`
        )
      )
    );
    const bookmarkRefs = learningStudents.flatMap((student) =>
      learningLessons.map((entry) =>
        db.doc(
          `workspaces/${workspaceId}/students/${student.studentId}/course_lesson_bookmarks/${makeLessonLearningItemId(course.courseId, entry.lesson.lessonId, "bookmark")}`
        )
      )
    );
    const [noteSnapshots, bookmarkSnapshots] = await Promise.all([
      noteRefs.length > 0 ? db.getAll(...noteRefs) : [],
      bookmarkRefs.length > 0 ? db.getAll(...bookmarkRefs) : []
    ]);
    const noteRecords = noteSnapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => recordFromSnapshot(snapshot, "noteId"));
    const bookmarkRecords = bookmarkSnapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => recordFromSnapshot(snapshot, "bookmarkId"));
    const studentsWithNotesCount = new Set(
      noteRecords.map((record) => asString(record.studentId)).filter(Boolean)
    ).size;
    const bookmarkedLessonsCount = bookmarkRecords.length;
    const recentLearningActivityCount = [...noteRecords, ...bookmarkRecords].filter((record) => {
      const updatedAt = asString(record.updatedAt);
      return updatedAt && Date.now() - Date.parse(updatedAt) <= 1000 * 60 * 60 * 24 * 14;
    }).length;
    const averageProgressPercent =
      progressRecords.length > 0
        ? Math.round(progressRecords.reduce((total, entry) => total + entry.overallPercent, 0) / progressRecords.length)
        : 0;
    const averageCheckScorePercent =
      attemptRecords.length > 0
        ? Math.round(attemptRecords.reduce((total, entry) => total + entry.scorePercent, 0) / attemptRecords.length)
        : 0;
    const recentCompletions = completed
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5)
      .map((entry) => ({
        maskedStudentRef: makeMaskedCourseStudentRef(workspaceId, entry.studentId),
        completedAt: entry.updatedAt,
        progressPercent: entry.overallPercent
      }));

    summaries.set(course.courseId, {
      eligibleCount: eligibleStudents.length,
      enrolledCount: progressRecords.length,
      startedCount: started.length,
      completedCount: completed.length,
      averageProgressPercent,
      checkAttemptedCount: attemptRecords.length,
      checkPassedCount: attemptRecords.filter((entry) => entry.status === "passed").length,
      averageCheckScorePercent,
      studentsWithNotesCount,
      bookmarkedLessonsCount,
      recentLearningActivityCount,
      recentCompletions
    });
  }

  return summaries;
}

async function buildStudentProgressSummary({
  workspaceId,
  studentId,
  currentCourseProgress
}: {
  workspaceId: string;
  studentId: string;
  currentCourseProgress?: StudentCourseProgressDocument;
}) {
  const { db } = getFirebaseAdminClients();
  const snapshot = await db
    .collection(`workspaces/${workspaceId}/students/${studentId}/course_progress`)
    .get();
  const progressByCourse = new Map<string, StudentCourseProgressDocument>();

  snapshot.docs.forEach((entry) => {
    const record = recordFromSnapshot(entry, "courseId");
    const courseId = asString(record.courseId, entry.id);

    progressByCourse.set(courseId, {
      workspaceId,
      studentId,
      courseId,
      completedLessonCount: asNumber(record.completedLessonCount),
      lessonCount: asNumber(record.lessonCount),
      overallPercent: asNumber(record.overallPercent),
      lastLessonId: asString(record.lastLessonId) || undefined,
      updatedAt: asString(record.updatedAt, new Date().toISOString())
    });
  });

  if (currentCourseProgress) {
    progressByCourse.set(currentCourseProgress.courseId, currentCourseProgress);
  }

  const progressRecords = Array.from(progressByCourse.values());
  const completedCourseCount = progressRecords.filter(
    (entry) => entry.lessonCount > 0 && entry.completedLessonCount >= entry.lessonCount
  ).length;
  const courseProgressPercent =
    progressRecords.length === 0
      ? 0
      : Math.round(
          progressRecords.reduce((total, entry) => total + entry.overallPercent, 0) / progressRecords.length
        );

  return {
    courseProgressPercent,
    completedCourseCount
  };
}

export async function listStudentCourses(
  actor: VerifiedStudent,
  filters: CourseListFilters
): Promise<StudentCourseListResponse> {
  const student = await getStudentAccessContext(actor);
  const { db } = getFirebaseAdminClients();
  let query: Query<DocumentData> = db
    .collection(`workspaces/${actor.workspaceId}/courses`)
    .where("published", "==", true)
    .orderBy("updatedAt", "desc");

  if (filters.cursor) {
    query = query.startAfter(filters.cursor);
  }

  const warnings: string[] = [];
  let visibleCourses: CourseDocument[];
  let nextCursor: string | null = null;

  try {
    const snapshot = await query.limit(filters.limit).get();
    visibleCourses = snapshot.docs
      .map((doc) => mapCourseDocument(recordFromSnapshot(doc, "courseId"), actor.workspaceId))
      .filter((course) => course.status === "published");

    nextCursor =
      snapshot.docs.length === filters.limit
        ? mapCourseDocument(recordFromSnapshot(snapshot.docs[snapshot.docs.length - 1], "courseId"), actor.workspaceId).updatedAt
        : null;
  } catch (error) {
    if (!isFirestoreMissingIndexError(error)) {
      throw error;
    }

    addCourseIndexFallbackWarning(warnings);

    const fallbackSnapshot = await db
      .collection(`workspaces/${actor.workspaceId}/courses`)
      .where("published", "==", true)
      .get();

    const publishedCourses = fallbackSnapshot.docs
      .map((doc) => mapCourseDocument(recordFromSnapshot(doc, "courseId"), actor.workspaceId))
      .filter((course) => course.status === "published");
    const sortedCourses = sortCoursesByUpdatedAtDesc(publishedCourses);
    const cursorFilteredCourses = applyCourseCursor(sortedCourses, filters.cursor);
    const pagedCourses = cursorFilteredCourses.slice(0, filters.limit);

    visibleCourses = pagedCourses;
    nextCursor =
      cursorFilteredCourses.length > filters.limit
        ? pagedCourses[pagedCourses.length - 1]?.updatedAt ?? null
        : null;
  }

  addLimitedSearchWarning(warnings, filters.q);
  const searchedCourses = applyCourseSearch(visibleCourses, filters.q);
  const [progressMap, learningState] = await Promise.all([
    getCourseProgressMap(actor.workspaceId, actor.studentId, searchedCourses),
    getStudentCourseLearningState(actor.workspaceId, actor.studentId)
  ]);
  const courseEntries = searchedCourses.map((course) => {
    const progress = progressMap.get(course.courseId) ?? null;
    const accessState = resolveCourseAccessState(course, student);
    const isAccessible = accessState === "available";

    return {
      course,
      progress,
      accessState,
      isAccessible
    };
  });

  return {
    ...createSourceMeta(warnings),
    ok: true,
    courses: courseEntries.map(({ course, progress, accessState, isAccessible }) => ({
      ...courseToListItem(course, getPublishBlockedReasons(course)),
      progress,
      progressSummary: buildCourseLearningProgressSummary({
        course,
        progress,
        locked: !isAccessible
      }),
      accessState,
      isAccessible,
      lockedReason: isAccessible
        ? undefined
        : getCourseLockedReason(course, student, accessState)
    })),
    pageInfo: pageInfo(filters.limit, searchedCourses.length, nextCursor),
    studentTierId: student.tierId,
    studentTierLabel: student.tierLabel,
    continueLearning: learningState.continueLearning,
    learningItems: learningState.learningItems,
    lessonSearchItems: courseEntries
      .filter((entry) => entry.isAccessible)
      .flatMap((entry) => buildStudentLessonSearchItems(entry.course))
      .slice(0, 150)
  };
}

async function buildStudentCourseDetail(
  actor: VerifiedStudent,
  course: CourseDocument,
  student: StudentAccessContext
): Promise<StudentCourseDetailResponse> {
  const { db } = getFirebaseAdminClients();
  const lessons = course.sections.flatMap((section) => section.lessons);
  const lessonProgressRefs = lessons.map((lesson) =>
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${lesson.lessonId}`)
  );
  const lessonCheckAttemptRefs = lessons.map((lesson) =>
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_check_attempts/${lesson.lessonId}`)
  );
  const lessonNoteRefs = lessons.map((lesson) =>
    db.doc(
      `workspaces/${actor.workspaceId}/students/${actor.studentId}/course_lesson_notes/${makeLessonLearningItemId(course.courseId, lesson.lessonId, "note")}`
    )
  );
  const lessonBookmarkRefs = lessons.map((lesson) =>
    db.doc(
      `workspaces/${actor.workspaceId}/students/${actor.studentId}/course_lesson_bookmarks/${makeLessonLearningItemId(course.courseId, lesson.lessonId, "bookmark")}`
    )
  );
  const progressSnapshots = lessonProgressRefs.length > 0 ? await db.getAll(...lessonProgressRefs) : [];
  const attemptSnapshots = lessonCheckAttemptRefs.length > 0 ? await db.getAll(...lessonCheckAttemptRefs) : [];
  const noteSnapshots = lessonNoteRefs.length > 0 ? await db.getAll(...lessonNoteRefs) : [];
  const bookmarkSnapshots = lessonBookmarkRefs.length > 0 ? await db.getAll(...lessonBookmarkRefs) : [];
  const progressMap = new Map(
    progressSnapshots.map((snapshot, index) => {
      const lesson = lessons[index];
      return [
        lesson.lessonId,
        mapLessonProgressDocument(
          snapshot.exists ? recordFromSnapshot(snapshot, "lessonId") : null,
          {
            workspaceId: actor.workspaceId,
            studentId: actor.studentId,
            courseId: course.courseId,
            lessonId: lesson.lessonId
          }
        )
      ] as const;
    })
  );
  const attemptMap = new Map(
    attemptSnapshots.map((snapshot, index) => {
      const lesson = lessons[index];
      return [
        lesson.lessonId,
        mapLessonCheckAttemptDocument(
          snapshot.exists ? recordFromSnapshot(snapshot, "lessonId") : null,
          {
            workspaceId: actor.workspaceId,
            studentId: actor.studentId,
            courseId: course.courseId,
            lessonId: lesson.lessonId
          }
        )
      ] as const;
    })
  );
  const noteMap = new Map(
    noteSnapshots.map((snapshot, index) => {
      const lesson = lessons[index];
      const noteId = makeLessonLearningItemId(course.courseId, lesson.lessonId, "note");
      return [
        lesson.lessonId,
        mapStudentLessonNoteDocument(
          snapshot.exists ? recordFromSnapshot(snapshot, "noteId") : null,
          {
            workspaceId: actor.workspaceId,
            studentId: actor.studentId,
            courseId: course.courseId,
            lessonId: lesson.lessonId,
            noteId
          }
        )
      ] as const;
    })
  );
  const bookmarkMap = new Map(
    bookmarkSnapshots.map((snapshot, index) => {
      const lesson = lessons[index];
      const bookmarkId = makeLessonLearningItemId(course.courseId, lesson.lessonId, "bookmark");
      return [
        lesson.lessonId,
        mapStudentLessonBookmarkDocument(
          snapshot.exists ? recordFromSnapshot(snapshot, "bookmarkId") : null,
          {
            workspaceId: actor.workspaceId,
            studentId: actor.studentId,
            courseId: course.courseId,
            lessonId: lesson.lessonId,
            bookmarkId
          }
        )
      ] as const;
    })
  );
  const progressSummaryRef = db.doc(
    `workspaces/${actor.workspaceId}/students/${actor.studentId}/course_progress/${course.courseId}`
  );
  const progressSummarySnapshot = await progressSummaryRef.get();
  let previousCompleted = true;
  const courseAccessState = resolveCourseAccessState(course, student);
  const accessibleByTier = courseAccessState === "available";
  const courseLockedReason = getCourseLockedReason(course, student, courseAccessState);
  const sections = course.sections.map((section) => ({
    ...section,
    lessons: section.lessons.map((lesson) => {
      const progress = progressMap.get(lesson.lessonId) ?? null;
      const latestAttempt = attemptMap.get(lesson.lessonId) ?? null;
      const privateNote = noteMap.get(lesson.lessonId) ?? null;
      const bookmark = bookmarkMap.get(lesson.lessonId) ?? null;
      const lockedByPrevious = lesson.requiresPrevious && !previousCompleted;
      const lockState = !accessibleByTier
        ? "locked_by_tier" as const
        : lockedByPrevious
          ? "locked_by_previous" as const
          : "available" as const;

      previousCompleted = isLessonCompleteForCourse(lesson, progress);
      const { quiz, ...studentLesson } = lesson;

      return {
        ...studentLesson,
        progress,
        lockState,
        lockReason:
          lockState === "locked_by_tier"
          ? courseLockedReason
          : lockState === "locked_by_previous"
            ? "Complete the previous lesson first."
            : undefined,
        check: buildStudentLessonCheck({
          quiz,
          required: lesson.requiresQuizPass,
          latestAttempt,
          locked: lockState !== "available"
        }),
        privateNote: privateNote ?? undefined,
        bookmark: bookmark ?? undefined
      };
    })
  }));
  const courseProgress = mapStudentCourseProgressDocument(
    progressSummarySnapshot.exists ? recordFromSnapshot(progressSummarySnapshot, "courseId") : null,
    {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      courseId: course.courseId,
      lessonCount: lessons.length
    }
  );
  const derivedCourseProgress = buildCourseProgressFromLessonProgress({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    course,
    progressByLesson: lessons.map((lesson) => progressMap.get(lesson.lessonId) ?? null),
    lastLessonId: courseProgress?.lastLessonId,
    now: courseProgress?.updatedAt ?? new Date().toISOString()
  });

  return {
    ...createSourceMeta(),
    ok: true,
    course: {
      ...course,
      sections,
      progress: derivedCourseProgress,
      progressSummary: buildCourseLearningProgressSummary({
        course,
        progress: derivedCourseProgress,
        locked: courseAccessState !== "available"
      })
    },
    studentTierId: student.tierId,
    studentTierLabel: student.tierLabel
  };
}

export async function getStudentCourse(
  actor: VerifiedStudent,
  courseId: string
): Promise<StudentCourseDetailResponse> {
  const student = await getStudentAccessContext(actor);
  const course = await getCourseOrThrow(actor.workspaceId, courseId);

  if (!course.published || course.status !== "published") {
    throw new AdminApiError(404, "course_not_found", "That course is not available.");
  }

  const accessState = resolveCourseAccessState(course, student);

  if (accessState !== "available") {
    throw new AdminApiError(
      403,
      `course_${accessState}`,
      getCourseLockedReason(course, student, accessState)
    );
  }

  return buildStudentCourseDetail(actor, course, student);
}

export async function getStudentCourseCompletionProof(
  actor: VerifiedStudent,
  courseId: string
): Promise<StudentCourseCompletionProofResponse> {
  const student = await getStudentAccessContext(actor);
  const course = await getCourseOrThrow(actor.workspaceId, courseId);

  if (!course.published || course.status !== "published") {
    throw new AdminApiError(404, "course_not_found", "That course is not available.");
  }

  const accessState = resolveCourseAccessState(course, student);

  if (accessState !== "available") {
    throw new AdminApiError(
      403,
      `course_${accessState}`,
      getCourseLockedReason(course, student, accessState)
    );
  }

  const { db } = getFirebaseAdminClients();
  const lessons = flattenCourseLessons(course);
  const lessonProgressRefs = lessons.map((entry) =>
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${entry.lesson.lessonId}`)
  );
  const progressSnapshots = lessonProgressRefs.length > 0 ? await db.getAll(...lessonProgressRefs) : [];
  const progressByLesson = progressSnapshots.map((snapshot, index) =>
    mapLessonProgressDocument(
      snapshot.exists ? recordFromSnapshot(snapshot, "lessonId") : null,
      {
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        courseId: course.courseId,
        lessonId: lessons[index].lesson.lessonId
      }
    )
  );
  const progress = buildCourseProgressFromLessonProgress({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    course,
    progressByLesson,
    now: new Date().toISOString()
  });
  const progressSummary = buildCourseLearningProgressSummary({
    course,
    progress,
    locked: false
  });

  return {
    ...createSourceMeta(),
    ok: true,
    proof: stripUndefined({
      proofRef: makeCourseProofRef(actor.workspaceId, actor.studentId, course.courseId),
      workspaceId: actor.workspaceId,
      workspaceLabel: student.workspaceLabel,
      courseId: course.courseId,
      courseTitle: course.title,
      courseDescription: course.description,
      studentSafeRef: makeMaskedCourseStudentRef(actor.workspaceId, actor.studentId),
      completed: progressSummary.status === "completed",
      completedAt: progressSummary.completedAt,
      generatedAt: new Date().toISOString(),
      progressSummary
    })
  };
}

export async function getStudentCourseLearningStateSummary(
  actor: VerifiedStudent
): Promise<StudentCourseLearningStateResponse> {
  await getStudentAccessContext(actor);
  const learningState = await getStudentCourseLearningState(actor.workspaceId, actor.studentId);

  return {
    ...createSourceMeta(),
    ok: true,
    continueLearning: learningState.continueLearning,
    learningItems: learningState.learningItems
  };
}

export async function saveStudentLessonNote({
  actor,
  courseId,
  lessonId,
  payload
}: {
  actor: VerifiedStudent;
  courseId: string;
  lessonId: string;
  payload: unknown;
}): Promise<LessonNoteMutationResponse> {
  const values = validateLessonNotePayload(payload);
  const student = await getStudentAccessContext(actor);
  const course = await getCourseOrThrow(actor.workspaceId, courseId);
  const context = await assertStudentCanUseLessonLearningTools({
    actor,
    course,
    student,
    lessonId
  });
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const noteId = makeLessonLearningItemId(courseId, lessonId, "note");
  const noteRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/course_lesson_notes/${noteId}`);
  const currentSnapshot = await noteRef.get();
  const current = mapStudentLessonNoteDocument(
    currentSnapshot.exists ? recordFromSnapshot(currentSnapshot, "noteId") : null,
    {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      courseId,
      lessonId,
      noteId
    }
  );
  const note: StudentLessonNoteDocument = {
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    courseId,
    lessonId,
    noteId,
    courseTitle: course.title,
    lessonTitle: context.lesson.title,
    sectionTitle: context.sectionTitle,
    text: values.text,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  await noteRef.set(stripUndefined(note), { merge: false });

  return {
    ...createSourceMeta(),
    ok: true,
    note
  };
}

export async function deleteStudentLessonNote({
  actor,
  courseId,
  lessonId
}: {
  actor: VerifiedStudent;
  courseId: string;
  lessonId: string;
}): Promise<LessonNoteMutationResponse> {
  const student = await getStudentAccessContext(actor);
  const course = await getCourseOrThrow(actor.workspaceId, courseId);
  await assertStudentCanUseLessonLearningTools({
    actor,
    course,
    student,
    lessonId
  });
  const noteId = makeLessonLearningItemId(courseId, lessonId, "note");

  await getFirebaseAdminClients().db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/course_lesson_notes/${noteId}`)
    .delete();

  return {
    ...createSourceMeta(),
    ok: true,
    note: null
  };
}

export async function saveStudentLessonBookmark({
  actor,
  courseId,
  lessonId,
  payload
}: {
  actor: VerifiedStudent;
  courseId: string;
  lessonId: string;
  payload: unknown;
}): Promise<LessonBookmarkMutationResponse> {
  const values = validateLessonBookmarkPayload(payload);
  const student = await getStudentAccessContext(actor);
  const course = await getCourseOrThrow(actor.workspaceId, courseId);
  const context = await assertStudentCanUseLessonLearningTools({
    actor,
    course,
    student,
    lessonId
  });
  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const bookmarkId = makeLessonLearningItemId(courseId, lessonId, "bookmark");
  const bookmarkRef = db.doc(
    `workspaces/${actor.workspaceId}/students/${actor.studentId}/course_lesson_bookmarks/${bookmarkId}`
  );
  const currentSnapshot = await bookmarkRef.get();
  const current = mapStudentLessonBookmarkDocument(
    currentSnapshot.exists ? recordFromSnapshot(currentSnapshot, "bookmarkId") : null,
    {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      courseId,
      lessonId,
      bookmarkId
    }
  );
  const bookmark: StudentLessonBookmarkDocument = stripUndefined({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    courseId,
    lessonId,
    bookmarkId,
    courseTitle: course.title,
    lessonTitle: context.lesson.title,
    sectionTitle: context.sectionTitle,
    label: values.label,
    positionSeconds: values.positionSeconds,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  });

  await bookmarkRef.set(stripUndefined(bookmark), { merge: false });

  return {
    ...createSourceMeta(),
    ok: true,
    bookmark
  };
}

export async function deleteStudentLessonBookmark({
  actor,
  courseId,
  lessonId
}: {
  actor: VerifiedStudent;
  courseId: string;
  lessonId: string;
}): Promise<LessonBookmarkMutationResponse> {
  const student = await getStudentAccessContext(actor);
  const course = await getCourseOrThrow(actor.workspaceId, courseId);
  await assertStudentCanUseLessonLearningTools({
    actor,
    course,
    student,
    lessonId
  });
  const bookmarkId = makeLessonLearningItemId(courseId, lessonId, "bookmark");

  await getFirebaseAdminClients().db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/course_lesson_bookmarks/${bookmarkId}`)
    .delete();

  return {
    ...createSourceMeta(),
    ok: true,
    bookmark: null
  };
}

export async function saveStudentCourseResumePoint({
  actor,
  courseId,
  lessonId,
  payload
}: {
  actor: VerifiedStudent;
  courseId: string;
  lessonId: string;
  payload: unknown;
}): Promise<LessonResumeMutationResponse> {
  const values = validateLessonResumePayload(payload);
  const student = await getStudentAccessContext(actor);
  const course = await getCourseOrThrow(actor.workspaceId, courseId);
  const context = await assertStudentCanUseLessonLearningTools({
    actor,
    course,
    student,
    lessonId
  });
  const resumePoint: StudentCourseResumePointDocument = stripUndefined({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    courseId,
    lessonId,
    courseTitle: course.title,
    lessonTitle: context.lesson.title,
    sectionTitle: context.sectionTitle,
    positionSeconds: values.positionSeconds,
    updatedAt: new Date().toISOString()
  });

  await getFirebaseAdminClients().db
    .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/course_resume_points/current`)
    .set(stripUndefined(resumePoint), { merge: false });

  return {
    ...createSourceMeta(),
    ok: true,
    resumePoint
  };
}

export async function submitStudentLessonCheckAttempt({
  actor,
  courseId,
  lessonId,
  payload
}: {
  actor: VerifiedStudent;
  courseId: string;
  lessonId: string;
  payload: unknown;
}): Promise<LessonCheckAttemptResponse> {
  const values = validateLessonCheckAttemptPayload(payload);
  const student = await getStudentAccessContext(actor);
  const course = await getCourseOrThrow(actor.workspaceId, courseId);

  if (!course.published || course.status !== "published") {
    throw new AdminApiError(403, "course_not_available", "This course is not available to this student.");
  }

  const accessState = resolveCourseAccessState(course, student);

  if (accessState !== "available") {
    throw new AdminApiError(
      403,
      `course_${accessState}`,
      getCourseLockedReason(course, student, accessState)
    );
  }

  const lessons = course.sections.flatMap((section) => section.lessons);
  const lessonIndex = lessons.findIndex((lesson) => lesson.lessonId === lessonId);
  const lesson = lessons[lessonIndex];

  if (!lesson) {
    throw new AdminApiError(404, "lesson_not_found", "That lesson was not found in this course.");
  }

  if (!lesson.quiz || lesson.quiz.questions.length === 0) {
    throw new AdminApiError(400, "lesson_check_missing", "This lesson does not have a check to submit.");
  }

  const { db } = getFirebaseAdminClients();

  if (lesson.requiresPrevious && lessonIndex > 0) {
    const previousLesson = lessons[lessonIndex - 1];
    const previousSnapshot = await db
      .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${previousLesson.lessonId}`)
      .get();
    const previousProgress = mapLessonProgressDocument(
      previousSnapshot.exists ? recordFromSnapshot(previousSnapshot, "lessonId") : null,
      {
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        courseId,
        lessonId: previousLesson.lessonId
      }
    );

    if (!isLessonCompleteForCourse(previousLesson, previousProgress)) {
      throw new AdminApiError(403, "lesson_locked_by_previous", "Complete the previous lesson first.");
    }
  }

  const answersByIndex = new Map(values.answers.map((answer) => [answer.questionIndex, answer]));
  const objectiveQuestions = lesson.quiz.questions.filter((question) => question.type !== "short_text_self_check");
  const selfCheckCount = lesson.quiz.questions.length - objectiveQuestions.length;
  const correctQuestionNumbers: number[] = [];
  const incorrectQuestionNumbers: number[] = [];

  lesson.quiz.questions.forEach((question, index) => {
    if (question.type === "short_text_self_check") {
      return;
    }

    const answer = answersByIndex.get(index);
    if (answer?.selectedOptionIndex === question.correctIndex) {
      correctQuestionNumbers.push(index + 1);
    } else {
      incorrectQuestionNumbers.push(index + 1);
    }
  });

  const scorePercent = objectiveQuestions.length > 0
    ? Math.round((correctQuestionNumbers.length / objectiveQuestions.length) * 100)
    : 0;
  const passed = objectiveQuestions.length > 0 && scorePercent >= lesson.quiz.passThresholdPercent;
  const now = new Date().toISOString();
  const attempt: LessonCheckAttemptDocument = {
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    courseId,
    lessonId,
    attemptId: `attempt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    status: passed ? "passed" : "needs_retry",
    scorePercent,
    passThresholdPercent: lesson.quiz.passThresholdPercent,
    correctQuestionNumbers,
    incorrectQuestionNumbers,
    objectiveQuestionCount: objectiveQuestions.length,
    totalQuestionCount: lesson.quiz.questions.length,
    selfCheckCount,
    submittedAt: now
  };
  const progressRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${lessonId}`);
  const currentSnapshot = await progressRef.get();
  const current = mapLessonProgressDocument(
    currentSnapshot.exists ? recordFromSnapshot(currentSnapshot, "lessonId") : null,
    {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      courseId,
      lessonId
    }
  );
  const progress: LessonProgressDocument = stripUndefined({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    courseId,
    lessonId,
    watchedPercent: current?.watchedPercent ?? 0,
    completed: current?.completed ?? false,
    quizScore: Math.max(current?.quizScore ?? 0, scorePercent),
    quizPassed: current?.quizPassed === true || passed,
    startedAt: current?.startedAt ?? now,
    completedAt: current?.completedAt,
    lastWatched: now
  });
  const progressRefs = lessons.map((entry) =>
    entry.lessonId === lessonId
      ? progressRef
      : db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${entry.lessonId}`)
  );
  const progressSnapshots = await db.getAll(...progressRefs);
  const progressByLesson = progressSnapshots.map((snapshot, index) => {
    if (lessons[index].lessonId === lessonId) {
      return progress;
    }

    return mapLessonProgressDocument(
      snapshot.exists ? recordFromSnapshot(snapshot, "lessonId") : null,
      {
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        courseId,
        lessonId: lessons[index].lessonId
      }
    );
  });
  const courseProgress = buildCourseProgressFromLessonProgress({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    course,
    progressByLesson,
    lastLessonId: lessonId,
    now
  });
  const batch = db.batch();

  batch.set(
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_check_attempts/${lessonId}`),
    stripUndefined(attempt),
    { merge: false }
  );
  batch.set(progressRef, stripUndefined(progress), { merge: true });
  batch.set(
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/course_progress/${courseId}`),
    stripUndefined(courseProgress),
    { merge: true }
  );
  await batch.commit();

  return {
    ...createSourceMeta(),
    ok: true,
    attempt,
    progress,
    courseProgress
  };
}

export async function saveStudentLessonProgress({
  actor,
  courseId,
  lessonId,
  payload
}: {
  actor: VerifiedStudent;
  courseId: string;
  lessonId: string;
  payload: unknown;
}): Promise<LessonProgressResponse> {
  const values = validateLessonProgressPayload(payload);
  const student = await getStudentAccessContext(actor);
  const course = await getCourseOrThrow(actor.workspaceId, courseId);

  if (!course.published || course.status !== "published") {
    throw new AdminApiError(403, "course_not_available", "This course is not available to this student.");
  }

  const accessState = resolveCourseAccessState(course, student);

  if (accessState !== "available") {
    throw new AdminApiError(
      403,
      `course_${accessState}`,
      getCourseLockedReason(course, student, accessState)
    );
  }

  const lessons = course.sections.flatMap((section) => section.lessons);
  const lessonIndex = lessons.findIndex((lesson) => lesson.lessonId === lessonId);
  const lesson = lessons[lessonIndex];

  if (!lesson) {
    throw new AdminApiError(404, "lesson_not_found", "That lesson was not found in this course.");
  }

  if (values.milestone === "quiz_passed") {
    throw new AdminApiError(
      400,
      "lesson_check_attempt_required",
      "Submit the lesson check through the protected check route before marking it passed."
    );
  }

  if (lesson.requiresPrevious && lessonIndex > 0) {
    const previousLesson = lessons[lessonIndex - 1];
    const previousSnapshot = await getFirebaseAdminClients().db
      .doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${previousLesson.lessonId}`)
      .get();
    const previousProgress = mapLessonProgressDocument(
      previousSnapshot.exists ? recordFromSnapshot(previousSnapshot, "lessonId") : null,
      {
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        courseId,
        lessonId: previousLesson.lessonId
      }
    );

    if (!isLessonCompleteForCourse(previousLesson, previousProgress)) {
      throw new AdminApiError(403, "lesson_locked_by_previous", "Complete the previous lesson first.");
    }
  }

  const { db } = getFirebaseAdminClients();
  const now = new Date().toISOString();
  const progressRef = db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${lessonId}`);
  const currentSnapshot = await progressRef.get();
  const current = mapLessonProgressDocument(
    currentSnapshot.exists ? recordFromSnapshot(currentSnapshot, "lessonId") : null,
    {
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      courseId,
      lessonId
    }
  );
  const watchedPercent = values.milestone === "completed"
    ? 100
    : values.milestone === "watched_80"
      ? 80
      : current?.watchedPercent ?? 0;
  const completed = values.milestone === "completed" || current?.completed === true;
  if (values.milestone === "completed" && lesson.requiresQuizPass && current?.quizPassed !== true) {
    throw new AdminApiError(
      403,
      "lesson_check_required",
      "Pass the required lesson check before marking this lesson complete."
    );
  }
  const progress: LessonProgressDocument = stripUndefined({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    courseId,
    lessonId,
    watchedPercent,
    completed,
    quizScore: values.quizScore ?? current?.quizScore,
    quizPassed: current?.quizPassed,
    startedAt: current?.startedAt ?? now,
    completedAt: completed ? current?.completedAt ?? now : undefined,
    lastWatched: now
  });

  const progressRefs = lessons.map((entry) =>
    entry.lessonId === lessonId
      ? progressRef
      : db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/lesson_progress/${entry.lessonId}`)
  );
  const progressSnapshots = await db.getAll(...progressRefs);
  const progressByLesson = progressSnapshots.map((snapshot, index) => {
    if (lessons[index].lessonId === lessonId) {
      return progress;
    }

    return mapLessonProgressDocument(
      snapshot.exists ? recordFromSnapshot(snapshot, "lessonId") : null,
      {
        workspaceId: actor.workspaceId,
        studentId: actor.studentId,
        courseId,
        lessonId: lessons[index].lessonId
      }
    );
  });
  const courseProgress: StudentCourseProgressDocument = {
    ...buildCourseProgressFromLessonProgress({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      course,
      progressByLesson,
      lastLessonId: lessonId,
      now
    }),
    lastLessonId: lessonId,
  };
  const studentSummary = await buildStudentProgressSummary({
    workspaceId: actor.workspaceId,
    studentId: actor.studentId,
    currentCourseProgress: courseProgress
  });

  const batch = db.batch();
  batch.set(progressRef, stripUndefined(progress), { merge: true });
  batch.set(
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/course_progress/${courseId}`),
    stripUndefined(courseProgress),
    { merge: true }
  );
  batch.set(
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}`),
    stripUndefined({
      courseProgressPercent: studentSummary.courseProgressPercent,
      courseCompletionPercent: studentSummary.courseProgressPercent,
      updatedAt: now
    }),
    { merge: true }
  );
  batch.set(
    db.doc(`workspaces/${actor.workspaceId}/students/${actor.studentId}/app_summary/current`),
    stripUndefined({
      workspaceId: actor.workspaceId,
      studentId: actor.studentId,
      courseProgressPercent: studentSummary.courseProgressPercent,
      completedCourseCount: studentSummary.completedCourseCount,
      updatedAt: now
    }),
    { merge: true }
  );
  await batch.commit();

  return {
    ...createSourceMeta(),
    ok: true,
    progress,
    courseProgress
  };
}
