import type { AdminAuditEvent, AdminSourceMeta } from "@/types/admin-api";
import type { IsoDateString } from "@/types/workspace";

export type CourseStatus = "draft" | "published" | "archived";

export type CourseAttachmentType = "lesson_resource" | "course_resource" | "external_reference";

export type CourseAttachment = {
  label: string;
  url: string;
  type: CourseAttachmentType;
  description?: string;
  hostname: string;
};

export type CourseQuizQuestion = {
  type: "multiple_choice" | "true_false" | "short_text_self_check";
  question: string;
  options: string[];
  correctIndex?: number;
};

export type CourseQuiz = {
  questions: CourseQuizQuestion[];
  passThresholdPercent: number;
  required: boolean;
};

export type CourseLesson = {
  lessonId: string;
  title: string;
  youtubeVideoId?: string;
  notes: string;
  order: number;
  requiresPrevious: boolean;
  attachments: CourseAttachment[];
  quiz?: CourseQuiz;
  requiresQuizPass: boolean;
  durationLabel?: string;
};

export type CourseSectionDocument = {
  sectionId: string;
  title: string;
  order: number;
  lessons: CourseLesson[];
};

export type CourseDocument = {
  courseId: string;
  workspaceId: string;
  title: string;
  description: string;
  thumbnailVideoId?: string;
  accessTier: "all" | string;
  published: boolean;
  status: CourseStatus;
  sections: CourseSectionDocument[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  publishedAt?: IsoDateString;
};

export type CourseHubCourseListItem = {
  courseId: string;
  workspaceId: string;
  title: string;
  description: string;
  thumbnailVideoId?: string;
  accessTier: "all" | string;
  published: boolean;
  status: CourseStatus;
  sectionCount: number;
  lessonCount: number;
  publishBlockedReasons: string[];
  completionSummary?: WorkspaceCourseCompletionSummary;
  resourceSummary: CourseResourceSummary;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  publishedAt?: IsoDateString;
};

export type CourseResourceSummary = {
  lessonsWithResourcesCount: number;
  totalResourceCount: number;
};

export type CourseHubListPageInfo = {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
  totalLoaded: number;
};

export type CourseHubListResponse = AdminSourceMeta & {
  ok: true;
  courses: CourseHubCourseListItem[];
  pageInfo: CourseHubListPageInfo;
};

export type CourseHubDetailResponse = AdminSourceMeta & {
  ok: true;
  course: CourseDocument;
  publishBlockedReasons: string[];
};

export type CourseHubMutationResponse = CourseHubDetailResponse & {
  auditEvent?: AdminAuditEvent;
};

export type CourseMetadataPayload = {
  title: string;
  description: string;
  accessTier: string;
  thumbnailVideoInput?: string;
};

export type CourseSavePayload = CourseMetadataPayload & {
  sections: CourseSectionDocument[];
  action?: "save_draft" | "publish" | "unpublish" | "archive";
};

export type CourseCreatePayload = CourseMetadataPayload & {
  sections?: CourseSectionDocument[];
};

export type LessonProgressMilestone = "started" | "watched_80" | "completed" | "quiz_passed";

export type LessonProgressDocument = {
  workspaceId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  watchedPercent: 0 | 80 | 100;
  completed: boolean;
  quizScore?: number;
  quizPassed?: boolean;
  startedAt?: IsoDateString;
  completedAt?: IsoDateString;
  lastWatched: IsoDateString;
};

export type LessonCheckAttemptStatus = "not_started" | "passed" | "needs_retry" | "locked_until_lesson_available";

export type StudentLessonCheckQuestion = {
  questionIndex: number;
  type: CourseQuizQuestion["type"];
  question: string;
  options: string[];
};

export type StudentLessonCheck = {
  required: boolean;
  passThresholdPercent: number;
  questionCount: number;
  objectiveQuestionCount: number;
  questions: StudentLessonCheckQuestion[];
  attemptStatus: LessonCheckAttemptStatus;
  latestAttempt?: LessonCheckAttemptDocument;
};

export type LessonCheckAttemptAnswer = {
  questionIndex: number;
  selectedOptionIndex?: number;
  text?: string;
};

export type LessonCheckAttemptPayload = {
  answers: LessonCheckAttemptAnswer[];
};

export type LessonCheckAttemptDocument = {
  workspaceId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  attemptId: string;
  status: Extract<LessonCheckAttemptStatus, "passed" | "needs_retry">;
  scorePercent: number;
  passThresholdPercent: number;
  correctQuestionNumbers: number[];
  incorrectQuestionNumbers: number[];
  objectiveQuestionCount: number;
  totalQuestionCount: number;
  selfCheckCount: number;
  submittedAt: IsoDateString;
};

export type StudentCourseProgressDocument = {
  workspaceId: string;
  studentId: string;
  courseId: string;
  completedLessonCount: number;
  lessonCount: number;
  overallPercent: number;
  lastLessonId?: string;
  updatedAt: IsoDateString;
};

export type CourseProgressStatus = "locked" | "not_started" | "in_progress" | "completed";

export type CourseLearningProgressSummary = {
  completedLessonCount: number;
  totalLessonCount: number;
  percentComplete: number;
  status: CourseProgressStatus;
  nextLessonId?: string;
  nextLessonTitle?: string;
  nextSectionTitle?: string;
  completedAt?: IsoDateString;
};

export type WorkspaceCourseRecentCompletionSummary = {
  maskedStudentRef: string;
  completedAt: IsoDateString;
  progressPercent: number;
};

export type WorkspaceCourseCompletionSummary = {
  eligibleCount: number;
  enrolledCount: number;
  startedCount: number;
  completedCount: number;
  averageProgressPercent: number;
  checkAttemptedCount: number;
  checkPassedCount: number;
  averageCheckScorePercent: number;
  studentsWithNotesCount: number;
  bookmarkedLessonsCount: number;
  recentLearningActivityCount: number;
  recentCompletions: WorkspaceCourseRecentCompletionSummary[];
};

export type StudentCourseCompletionProof = {
  proofRef: string;
  workspaceId: string;
  workspaceLabel: string;
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  studentSafeRef: string;
  completed: boolean;
  completedAt?: IsoDateString;
  generatedAt: IsoDateString;
  progressSummary: CourseLearningProgressSummary;
};

export type StudentCourseListItem = CourseHubCourseListItem & {
  progress: StudentCourseProgressDocument | null;
  progressSummary: CourseLearningProgressSummary;
  accessState:
    | "available"
    | "locked_by_tier"
    | "locked_by_subscription"
    | "feature_not_enabled";
  isAccessible: boolean;
  lockedReason?: string;
};

export type LessonLockState =
  | "available"
  | "locked_by_previous"
  | "locked_by_tier"
  | "locked_by_unpublished";

export type StudentLessonNoteDocument = {
  workspaceId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  noteId: string;
  courseTitle: string;
  lessonTitle: string;
  sectionTitle: string;
  text: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type StudentLessonBookmarkDocument = {
  workspaceId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  bookmarkId: string;
  courseTitle: string;
  lessonTitle: string;
  sectionTitle: string;
  label?: string;
  positionSeconds?: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type StudentCourseResumePointDocument = {
  workspaceId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  courseTitle: string;
  lessonTitle: string;
  sectionTitle: string;
  positionSeconds?: number;
  updatedAt: IsoDateString;
};

export type StudentCourseLearningItem = {
  kind: "note" | "bookmark";
  itemId: string;
  courseId: string;
  lessonId: string;
  courseTitle: string;
  lessonTitle: string;
  sectionTitle: string;
  label?: string;
  preview: string;
  positionSeconds?: number;
  updatedAt: IsoDateString;
};

export type StudentCourseLessonSearchItem = {
  kind: "lesson" | "resource";
  itemId: string;
  courseId: string;
  lessonId: string;
  courseTitle: string;
  lessonTitle: string;
  sectionTitle: string;
  title: string;
  preview: string;
  resourceType?: CourseAttachmentType;
  hostname?: string;
};

export type StudentLessonState = Omit<CourseLesson, "quiz"> & {
  lockState: LessonLockState;
  lockReason?: string;
  progress: LessonProgressDocument | null;
  check?: StudentLessonCheck;
  privateNote?: StudentLessonNoteDocument;
  bookmark?: StudentLessonBookmarkDocument;
};

export type StudentCourseSection = Omit<CourseSectionDocument, "lessons"> & {
  lessons: StudentLessonState[];
};

export type StudentCourseDocument = Omit<CourseDocument, "sections"> & {
  sections: StudentCourseSection[];
  progress: StudentCourseProgressDocument | null;
  progressSummary: CourseLearningProgressSummary;
};

export type StudentCourseListResponse = AdminSourceMeta & {
  ok: true;
  courses: StudentCourseListItem[];
  pageInfo: CourseHubListPageInfo;
  studentTierId: string;
  studentTierLabel: string;
  continueLearning?: StudentCourseResumePointDocument;
  learningItems: StudentCourseLearningItem[];
  lessonSearchItems: StudentCourseLessonSearchItem[];
};

export type StudentCourseDetailResponse = AdminSourceMeta & {
  ok: true;
  course: StudentCourseDocument;
  studentTierId: string;
  studentTierLabel: string;
};

export type LessonProgressPayload = {
  milestone: LessonProgressMilestone;
  quizScore?: number;
};

export type LessonNotePayload = {
  text: string;
};

export type LessonBookmarkPayload = {
  label?: string;
  positionSeconds?: number;
};

export type LessonResumePayload = {
  positionSeconds?: number;
};

export type LessonProgressResponse = AdminSourceMeta & {
  ok: true;
  progress: LessonProgressDocument;
  courseProgress: StudentCourseProgressDocument;
};

export type StudentCourseCompletionProofResponse = AdminSourceMeta & {
  ok: true;
  proof: StudentCourseCompletionProof;
};

export type LessonCheckAttemptResponse = AdminSourceMeta & {
  ok: true;
  attempt: LessonCheckAttemptDocument;
  progress: LessonProgressDocument;
  courseProgress: StudentCourseProgressDocument;
};

export type StudentCourseLearningStateResponse = AdminSourceMeta & {
  ok: true;
  continueLearning?: StudentCourseResumePointDocument;
  learningItems: StudentCourseLearningItem[];
};

export type LessonNoteMutationResponse = AdminSourceMeta & {
  ok: true;
  note: StudentLessonNoteDocument | null;
};

export type LessonBookmarkMutationResponse = AdminSourceMeta & {
  ok: true;
  bookmark: StudentLessonBookmarkDocument | null;
};

export type LessonResumeMutationResponse = AdminSourceMeta & {
  ok: true;
  resumePoint: StudentCourseResumePointDocument;
};
