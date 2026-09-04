"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import { formatStatusLabel } from "@/components/student-app/student-formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type {
  CourseAttachment,
  CourseAttachmentType,
  LessonCheckAttemptResponse,
  LessonBookmarkMutationResponse,
  LessonNoteMutationResponse,
  LessonProgressMilestone,
  LessonProgressResponse,
  LessonResumeMutationResponse,
  StudentCourseDetailResponse,
  StudentCourseSection,
  StudentLessonState
} from "@/types/course-hub";

const resourceGroups: Array<{ type: CourseAttachmentType; label: string }> = [
  { type: "lesson_resource", label: "Lesson resources" },
  { type: "course_resource", label: "Course resources" },
  { type: "external_reference", label: "External references" }
];

type LessonOutlineItem = {
  lesson: StudentLessonState;
  sectionTitle: string;
  sectionIndex: number;
  lessonIndex: number;
  flatIndex: number;
};

function firstAvailableLesson(lessons: StudentLessonState[]) {
  return lessons.find((lesson) => lesson.lockState === "available") ?? lessons[0] ?? null;
}

function flattenCourseLessons(sections: StudentCourseSection[]): LessonOutlineItem[] {
  return sections.flatMap((section, sectionIndex) =>
    section.lessons.map((lesson, lessonIndex) => ({
      lesson,
      sectionTitle: section.title,
      sectionIndex,
      lessonIndex,
      flatIndex: 0
    }))
  ).map((item, flatIndex) => ({ ...item, flatIndex }));
}

function lessonPositionLabel(item: LessonOutlineItem) {
  return `${item.sectionIndex + 1}.${item.lessonIndex + 1}`;
}

function getResourceHostname(resource: CourseAttachment) {
  if (resource.hostname) {
    return resource.hostname;
  }

  try {
    return new URL(resource.url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "invalid-resource";
  }
}

function LessonResources({
  resources,
  locked
}: {
  resources: CourseAttachment[];
  locked: boolean;
}) {
  if (locked) {
    return (
      <div className="rounded-[18px] border border-[color:color-mix(in_srgb,var(--amber)_30%,transparent)] p-4">
        <p className="text-sm font-semibold text-[color:var(--amber)]">Resources unavailable</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
          This lesson is locked, so resource links stay hidden until your course access and lesson order allow it.
        </p>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-[color:var(--line)] p-4">
        <p className="text-sm font-semibold text-[color:var(--label)]">No lesson resources</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
          This lesson does not include resources yet. Any future lesson links will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
          Resources
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
          Open these lesson links in a new tab when you need them.
        </p>
      </div>
      {resourceGroups.map((group) => {
        const groupResources = resources.filter((resource) => resource.type === group.type);

        if (groupResources.length === 0) {
          return null;
        }

        return (
          <div key={group.type} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              {group.label}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {groupResources.map((resource, resourceIndex) => (
                <article
                  key={`${resource.url}-${resourceIndex}`}
                  className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--label)]">{resource.label}</p>
                      <p className="mt-1 truncate text-xs text-[color:var(--label3)]">{getResourceHostname(resource)}</p>
                    </div>
                    <Badge tone={group.type === "external_reference" ? "neutral" : group.type === "course_resource" ? "accent" : "green"}>
                      {group.label.replace(/s$/, "")}
                    </Badge>
                  </div>
                  {resource.description ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[color:var(--label2)]">
                      {resource.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-[color:var(--label2)]">
                      Open this resource in a new tab when you need it for the lesson.
                    </p>
                  )}
                  <Button href={resource.url} target="_blank" rel="noreferrer" variant="secondary" size="sm" className="mt-4">
                    Open link
                  </Button>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function YouTubeLessonFrame({ videoId, title }: { videoId?: string; title: string }) {
  if (!videoId) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[22px] border border-[color:var(--line)] bg-[color:var(--glass)] p-6 text-center">
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          This lesson video is not available yet. Ask your instructor to add it before you continue.
        </p>
      </div>
    );
  }

  return (
    <iframe
      className="aspect-video w-full rounded-[22px] border border-[color:var(--line)]"
      src={`https://www.youtube-nocookie.com/embed/${videoId}`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

function LessonNavigator({
  detail,
  lessonItems,
  selectedLessonId,
  onSelect
}: {
  detail: StudentCourseDetailResponse;
  lessonItems: LessonOutlineItem[];
  selectedLessonId: string | null;
  onSelect: (lessonId: string) => void;
}) {
  const lessonsBySection = detail.course.sections.map((section, sectionIndex) => ({
    section,
    sectionIndex,
    items: lessonItems.filter((item) => item.sectionIndex === sectionIndex)
  }));

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-4">
        <p className="text-sm font-semibold text-[color:var(--label)]">Course outline</p>
        <ProgressBar
          label="Course progress"
          value={detail.course.progress?.overallPercent ?? 0}
          showValue
        />
      </GlassCard>
      {lessonsBySection.map(({ section, items }) => (
        <GlassCard key={section.sectionId} className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">{section.title}</p>
          {items.map((item) => {
            const lesson = item.lesson;
            const isSelected = lesson.lessonId === selectedLessonId;
            const isAvailable = lesson.lockState === "available";

            return (
              <button
                key={lesson.lessonId}
                type="button"
                onClick={() => isAvailable && onSelect(lesson.lessonId)}
                aria-current={isSelected ? "step" : undefined}
                className={[
                  "focus-ring flex w-full items-center justify-between gap-3 rounded-[16px] border px-3 py-3 text-left transition",
                  isSelected
                    ? "border-[color:color-mix(in_srgb,var(--accent)_64%,transparent)] bg-[color:var(--accent-bg)]"
                    : "border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)]"
                ].join(" ")}
                disabled={!isAvailable}
              >
                <span className="min-w-0">
                  <span className="mb-1 inline-flex rounded-full border border-[color:var(--line)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--label3)]">
                    {isSelected ? "Current lesson" : `Lesson ${lessonPositionLabel(item)}`}
                  </span>
                  <span className="block text-sm font-semibold text-[color:var(--label)]">{lesson.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-[color:var(--label2)]">
                    {lesson.lockReason ?? (lesson.requiresQuizPass ? "Quiz gate ready" : "Available")}
                  </span>
                </span>
                <Badge tone={isAvailable ? "green" : "amber"}>
                  {isAvailable ? (lesson.progress?.completed ? "Done" : "Open") : "Locked"}
                </Badge>
              </button>
            );
          })}
        </GlassCard>
      ))}
    </div>
  );
}

function StudentCourseReaderBody({ courseId }: { courseId: string }) {
  const [detail, setDetail] = useState<StudentCourseDetailResponse | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingCheck, setIsSubmittingCheck] = useState(false);
  const [isSavingLearningItem, setIsSavingLearningItem] = useState(false);
  const [selectedCheckAnswers, setSelectedCheckAnswers] = useState<Record<number, number>>({});
  const [selfCheckAnswers, setSelfCheckAnswers] = useState<Record<number, string>>({});
  const [privateNoteText, setPrivateNoteText] = useState("");
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [lessonPositionSeconds, setLessonPositionSeconds] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lessons = useMemo(
    () => detail?.course.sections.flatMap((section) => section.lessons) ?? [],
    [detail]
  );
  const lessonItems = useMemo(
    () => (detail ? flattenCourseLessons(detail.course.sections) : []),
    [detail]
  );
  const selectedLesson =
    lessons.find((lesson) => lesson.lessonId === selectedLessonId) ?? firstAvailableLesson(lessons);
  const selectedLessonItem = lessonItems.find((item) => item.lesson.lessonId === selectedLesson?.lessonId) ?? null;
  const previousLessonItem =
    selectedLessonItem && selectedLessonItem.flatIndex > 0
      ? lessonItems[selectedLessonItem.flatIndex - 1]
      : null;
  const nextLessonItem =
    selectedLessonItem && selectedLessonItem.flatIndex < lessonItems.length - 1
      ? lessonItems[selectedLessonItem.flatIndex + 1]
      : null;
  const selectedLessonAvailable = selectedLesson?.lockState === "available";
  const requiredCheckPending = Boolean(
    selectedLesson?.check?.required && selectedLesson.check.attemptStatus !== "passed"
  );

  const loadCourse = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<StudentCourseDetailResponse>(
        `/api/student/courses/${courseId}`
      );
      const availableLesson = firstAvailableLesson(
        response.course.sections.flatMap((section) => section.lessons)
      );

      setDetail(response);
      setSelectedLessonId((current) => current ?? availableLesson?.lessonId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load this course.");
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    setSelectedCheckAnswers({});
    setSelfCheckAnswers({});
    setPrivateNoteText(selectedLesson?.privateNote?.text ?? "");
    setBookmarkLabel(selectedLesson?.bookmark?.label ?? "");
    setLessonPositionSeconds(
      selectedLesson?.bookmark?.positionSeconds === undefined
        ? ""
        : String(selectedLesson.bookmark.positionSeconds)
    );
  }, [
    selectedLesson?.bookmark?.label,
    selectedLesson?.bookmark?.positionSeconds,
    selectedLesson?.lessonId,
    selectedLesson?.privateNote?.text
  ]);

  useEffect(() => {
    if (!detail || !selectedLesson || !selectedLessonAvailable) {
      return;
    }

    void requestCourseHubApi<LessonResumeMutationResponse>(
      `/api/student/courses/${detail.course.courseId}/lessons/${selectedLesson.lessonId}/resume`,
      {
        method: "POST",
        body: JSON.stringify({})
      }
    ).catch(() => {
      // Resume point is convenience state; the visible reader load should not fail if it cannot be written.
    });
  }, [detail, selectedLesson, selectedLessonAvailable]);

  async function saveProgress(milestone: LessonProgressMilestone) {
    if (!selectedLesson || !detail) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await requestCourseHubApi<LessonProgressResponse>(
        `/api/student/courses/${detail.course.courseId}/lessons/${selectedLesson.lessonId}/progress`,
        {
          method: "POST",
          body: JSON.stringify({ milestone })
        }
      );
      setMessage(`Progress saved: ${milestone.replace(/_/g, " ")}.`);
      await loadCourse();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save progress.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitLessonCheck() {
    if (!selectedLesson?.check || !detail) {
      return;
    }

    setIsSubmittingCheck(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const answers = selectedLesson.check.questions.map((question) => ({
        questionIndex: question.questionIndex,
        selectedOptionIndex: selectedCheckAnswers[question.questionIndex],
        text: selfCheckAnswers[question.questionIndex]
      }));
      const response = await requestCourseHubApi<LessonCheckAttemptResponse>(
        `/api/student/courses/${detail.course.courseId}/lessons/${selectedLesson.lessonId}/check/attempt`,
        {
          method: "POST",
          body: JSON.stringify({ answers })
        }
      );
      setMessage(
        response.attempt.status === "passed"
          ? `Lesson check passed: ${response.attempt.scorePercent}% (${response.attempt.correctQuestionNumbers.length}/${response.attempt.objectiveQuestionCount} objective correct).`
          : `Lesson check needs retry: ${response.attempt.scorePercent}% (${response.attempt.correctQuestionNumbers.length}/${response.attempt.objectiveQuestionCount} objective correct).`
      );
      await loadCourse();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not submit this lesson check.");
    } finally {
      setIsSubmittingCheck(false);
    }
  }

  async function savePrivateNote() {
    if (!selectedLesson || !detail) {
      return;
    }

    setIsSavingLearningItem(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await requestCourseHubApi<LessonNoteMutationResponse>(
        `/api/student/courses/${detail.course.courseId}/lessons/${selectedLesson.lessonId}/notes`,
        {
          method: "PUT",
          body: JSON.stringify({ text: privateNoteText })
        }
      );
      setMessage("Private lesson note saved.");
      await loadCourse();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save this private note.");
    } finally {
      setIsSavingLearningItem(false);
    }
  }

  async function deletePrivateNote() {
    if (!selectedLesson || !detail) {
      return;
    }

    setIsSavingLearningItem(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await requestCourseHubApi<LessonNoteMutationResponse>(
        `/api/student/courses/${detail.course.courseId}/lessons/${selectedLesson.lessonId}/notes`,
        { method: "DELETE" }
      );
      setPrivateNoteText("");
      setMessage("Private lesson note deleted.");
      await loadCourse();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not delete this private note.");
    } finally {
      setIsSavingLearningItem(false);
    }
  }

  async function saveBookmark() {
    if (!selectedLesson || !detail) {
      return;
    }

    setIsSavingLearningItem(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await requestCourseHubApi<LessonBookmarkMutationResponse>(
        `/api/student/courses/${detail.course.courseId}/lessons/${selectedLesson.lessonId}/bookmark`,
        {
          method: "PUT",
          body: JSON.stringify({
            label: bookmarkLabel,
            positionSeconds: lessonPositionSeconds
          })
        }
      );
      setMessage("Lesson bookmark saved.");
      await loadCourse();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save this bookmark.");
    } finally {
      setIsSavingLearningItem(false);
    }
  }

  async function deleteBookmark() {
    if (!selectedLesson || !detail) {
      return;
    }

    setIsSavingLearningItem(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await requestCourseHubApi<LessonBookmarkMutationResponse>(
        `/api/student/courses/${detail.course.courseId}/lessons/${selectedLesson.lessonId}/bookmark`,
        { method: "DELETE" }
      );
      setBookmarkLabel("");
      setLessonPositionSeconds("");
      setMessage("Lesson bookmark removed.");
      await loadCourse();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not remove this bookmark.");
    } finally {
      setIsSavingLearningItem(false);
    }
  }

  async function saveResumePoint() {
    if (!selectedLesson || !detail) {
      return;
    }

    setIsSavingLearningItem(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await requestCourseHubApi<LessonResumeMutationResponse>(
        `/api/student/courses/${detail.course.courseId}/lessons/${selectedLesson.lessonId}/resume`,
        {
          method: "POST",
          body: JSON.stringify({ positionSeconds: lessonPositionSeconds })
        }
      );
      setMessage("Continue learning point saved.");
      await loadCourse();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save this resume point.");
    } finally {
      setIsSavingLearningItem(false);
    }
  }

  if (isLoading) {
    return (
      <StudentShell
        active="courses"
        eyebrow="Course"
        title="Loading"
        subtitle="TradeHub is loading your lesson."
      >
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading lesson reader...</p>
        </GlassCard>
      </StudentShell>
    );
  }

  if (!detail) {
    return (
      <StudentShell
        active="courses"
        eyebrow="Course"
        title="Unavailable"
        subtitle="This course is not available right now. Contact your instructor if you think you should have access."
      >
        <GlassCard className="space-y-4">
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            {errorMessage ?? "This course is not available."}
          </p>
          <Button href="/app/courses" variant="primary">
            Back to courses
          </Button>
        </GlassCard>
      </StudentShell>
    );
  }

  return (
    <StudentShell
      active="courses"
      eyebrow="Lesson reader"
      title={detail.course.title}
      subtitle={detail.course.description}
      action={<Badge tone="accent">{detail.studentTierLabel}</Badge>}
      side={
        <LessonNavigator
          detail={detail}
          lessonItems={lessonItems}
          selectedLessonId={selectedLesson?.lessonId ?? null}
          onSelect={setSelectedLessonId}
        />
      }
    >
      {errorMessage ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
        </GlassCard>
      ) : null}
      {message ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--green)_30%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--green)]">{message}</p>
        </GlassCard>
      ) : null}

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Course progress</p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
              {detail.course.progressSummary.status === "completed"
                ? "All required lessons are complete. Your proof is ready."
                : detail.course.progressSummary.nextLessonTitle
                  ? `Next lesson: ${detail.course.progressSummary.nextLessonTitle}`
                  : "Open the first unlocked lesson to start this course."}
            </p>
          </div>
          <Badge tone={detail.course.progressSummary.status === "completed" ? "green" : "accent"}>
            {formatStatusLabel(detail.course.progressSummary.status)}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatChip
            label="Lessons done"
            value={`${detail.course.progressSummary.completedLessonCount}/${detail.course.progressSummary.totalLessonCount}`}
            tone="green"
          />
          <StatChip label="Progress" value={`${detail.course.progressSummary.percentComplete}%`} tone="accent" />
          <StatChip
            label="Next"
            value={detail.course.progressSummary.status === "completed" ? "Proof ready" : detail.course.progressSummary.nextLessonTitle ? "Ready" : "Start"}
            detail={detail.course.progressSummary.nextLessonTitle}
            tone={detail.course.progressSummary.status === "completed" ? "green" : "neutral"}
          />
        </div>
        <ProgressBar
          label="Overall course progress"
          value={detail.course.progressSummary.percentComplete}
          showValue
          tone={detail.course.progressSummary.status === "completed" ? "green" : "accent"}
        />
        {detail.course.progressSummary.status === "completed" ? (
          <Button href={`/app/courses/${detail.course.courseId}/proof`} variant="primary">
            Open completion proof
          </Button>
        ) : null}
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Learning flow</p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
              Work through the current unlocked lesson, use the private learning desk if helpful,
              pass any required knowledge check, then mark the lesson complete. Course proof appears
              after every required lesson is complete.
            </p>
          </div>
          <Badge tone="accent">Private to you</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <StatChip label="Browse" value="Search" detail="Find a course" tone="neutral" />
          <StatChip label="Learn" value="Open" detail="Continue lesson" tone="accent" />
          <StatChip label="Check" value={requiredCheckPending ? "Required" : "Clear"} detail="Knowledge check" tone={requiredCheckPending ? "amber" : "green"} />
          <StatChip label="Proof" value={detail.course.progressSummary.status === "completed" ? "Ready" : "Locked"} detail="Browser print" tone={detail.course.progressSummary.status === "completed" ? "green" : "neutral"} />
        </div>
      </GlassCard>

      <GlassCard className="space-y-4 lg:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">Mobile course outline</p>
            <p className="mt-1 text-xs leading-5 text-[color:var(--label3)]">
              Tap an unlocked lesson. Locked lessons stay visible with the reason.
            </p>
          </div>
          <Badge tone="accent">{lessonItems.length} lessons</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {lessonItems.map((item) => {
            const lesson = item.lesson;
            const isSelected = lesson.lessonId === selectedLesson?.lessonId;
            const isAvailable = lesson.lockState === "available";

            return (
              <button
                key={`mobile-${lesson.lessonId}`}
                type="button"
                onClick={() => isAvailable && setSelectedLessonId(lesson.lessonId)}
                disabled={!isAvailable}
                className={[
                  "focus-ring min-h-[64px] rounded-[14px] border px-3 py-2 text-left text-sm transition",
                  isSelected
                    ? "border-[color:color-mix(in_srgb,var(--accent)_64%,transparent)] bg-[color:var(--accent-bg)] text-[color:var(--label)]"
                    : "border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_64%,transparent)] text-[color:var(--label2)]"
                ].join(" ")}
              >
                <span className="block truncate font-semibold">
                  {lessonPositionLabel(item)} {lesson.title}
                </span>
                <span className="mt-1 block truncate text-xs text-[color:var(--label3)]">
                  {isAvailable ? (lesson.progress?.completed ? "Complete" : "Open") : lesson.lockReason ?? "Locked"}
                </span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {selectedLesson ? (
        <GlassCard className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
            <Button
              onClick={() =>
                previousLessonItem?.lesson.lockState === "available" &&
                setSelectedLessonId(previousLessonItem.lesson.lessonId)
              }
              disabled={!previousLessonItem || previousLessonItem.lesson.lockState !== "available"}
              variant="secondary"
              size="sm"
              className="min-w-0 whitespace-nowrap"
            >
              Previous lesson
            </Button>
            <div className="text-center text-xs leading-5 text-[color:var(--label3)]">
              {selectedLessonItem ? (
                <>
                  Lesson {selectedLessonItem.flatIndex + 1} of {lessonItems.length}
                  <span className="mx-2" aria-hidden="true">·</span>
                  {selectedLessonItem.sectionTitle}
                </>
              ) : (
                "Lesson navigation"
              )}
            </div>
            <Button
              onClick={() =>
                nextLessonItem?.lesson.lockState === "available" &&
                setSelectedLessonId(nextLessonItem.lesson.lessonId)
              }
              disabled={!nextLessonItem || nextLessonItem.lesson.lockState !== "available"}
              variant="secondary"
              size="sm"
              className="min-w-0 whitespace-nowrap"
            >
              Next lesson
            </Button>
          </div>
          {nextLessonItem && nextLessonItem.lesson.lockState !== "available" ? (
            <p className="rounded-[14px] border border-[color:color-mix(in_srgb,var(--amber)_30%,transparent)] px-3 py-2 text-xs leading-5 text-[color:var(--amber)]">
              Next locked: {nextLessonItem.lesson.lockReason ?? "Complete the current lesson first."}
            </p>
          ) : null}
          {!selectedLessonAvailable ? (
            <p className="rounded-[14px] border border-[color:color-mix(in_srgb,var(--amber)_30%,transparent)] px-3 py-2 text-sm leading-6 text-[color:var(--amber)]">
              Locked lesson: {selectedLesson.lockReason ?? "This lesson is not available for your student account yet."}
            </p>
          ) : null}
          <YouTubeLessonFrame videoId={selectedLesson.youtubeVideoId} title={selectedLesson.title} />
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--label3)]">
                  {formatStatusLabel(selectedLesson.lockState)}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--label)]">
                  {selectedLesson.title}
                </h2>
              </div>
              <Badge tone={selectedLesson.progress?.completed ? "green" : "amber"}>
                {selectedLesson.progress?.completed
                  ? "Complete"
                  : `${selectedLesson.progress?.watchedPercent ?? 0}%`}
              </Badge>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[color:var(--label2)]">
              {selectedLesson.notes || "No notes have been added for this lesson yet."}
            </p>
            <p className="mt-3 text-xs leading-5 text-[color:var(--label3)]">
              Lesson progress buttons update only your own progress.
            </p>
          </div>
          <LessonResources resources={selectedLesson.attachments} locked={!selectedLessonAvailable} />
          <div className="space-y-4 rounded-[18px] border border-[color:var(--line)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  Notes and bookmarks
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                  Save notes, bookmarks, and a continue point for yourself.
                </p>
              </div>
              <Badge tone={selectedLesson.bookmark ? "green" : "neutral"}>
                {selectedLesson.bookmark ? "Bookmarked" : "Private"}
              </Badge>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Lesson note
              </span>
              <textarea
                className="field-textarea min-h-[132px]"
                value={privateNoteText}
                onChange={(event) => setPrivateNoteText(event.target.value)}
                placeholder="Write a private note for this lesson"
                disabled={!selectedLessonAvailable}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  Bookmark label
                </span>
                <input
                  className="field-control"
                  value={bookmarkLabel}
                  onChange={(event) => setBookmarkLabel(event.target.value)}
                  placeholder="Example: risk checklist"
                  disabled={!selectedLessonAvailable}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  Position sec
                </span>
                <input
                  className="field-control"
                  inputMode="numeric"
                  value={lessonPositionSeconds}
                  onChange={(event) => setLessonPositionSeconds(event.target.value)}
                  placeholder="optional"
                  disabled={!selectedLessonAvailable}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={savePrivateNote}
                disabled={isSavingLearningItem || !selectedLessonAvailable || !privateNoteText.trim()}
                variant="primary"
                size="sm"
              >
                Save note
              </Button>
              <Button
                onClick={deletePrivateNote}
                disabled={isSavingLearningItem || !selectedLessonAvailable || !selectedLesson.privateNote}
                variant="secondary"
                size="sm"
              >
                Delete note
              </Button>
              <Button
                onClick={saveBookmark}
                disabled={isSavingLearningItem || !selectedLessonAvailable}
                variant="secondary"
                size="sm"
              >
                Save bookmark
              </Button>
              <Button
                onClick={deleteBookmark}
                disabled={isSavingLearningItem || !selectedLessonAvailable || !selectedLesson.bookmark}
                variant="secondary"
                size="sm"
              >
                Remove bookmark
              </Button>
              <Button
                onClick={saveResumePoint}
                disabled={isSavingLearningItem || !selectedLessonAvailable}
                variant="ghost"
                size="sm"
              >
                Save continue point
              </Button>
            </div>
            {!selectedLessonAvailable ? (
              <p className="text-xs leading-5 text-[color:var(--label3)]">
                Notes and bookmarks will be available when this lesson unlocks.
              </p>
            ) : null}
          </div>
          {selectedLesson.check ? (
            <div className="space-y-4 rounded-[18px] border border-[color:var(--line)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Knowledge check
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                    {selectedLesson.check.required
                      ? "Pass this check before marking the lesson complete."
                      : "Optional check for your own readiness. Short text answers are for self-review only."}
                  </p>
                </div>
                <Badge tone={selectedLesson.check.attemptStatus === "passed" ? "green" : "amber"}>
                  {formatStatusLabel(selectedLesson.check.attemptStatus)}
                </Badge>
              </div>

              {selectedLesson.check.latestAttempt ? (
                <div className="rounded-[14px] border border-[color:var(--line)] px-3 py-2">
                  <p className="text-sm font-semibold text-[color:var(--label)]">
                    Score {selectedLesson.check.latestAttempt.scorePercent}% · Pass at {selectedLesson.check.passThresholdPercent}%
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--label2)]">
                    Correct questions: {selectedLesson.check.latestAttempt.correctQuestionNumbers.join(", ") || "none"}.
                    Incorrect questions: {selectedLesson.check.latestAttempt.incorrectQuestionNumbers.join(", ") || "none"}.
                  </p>
                </div>
              ) : null}

              <div className="space-y-4">
                {selectedLesson.check.questions.map((question) => (
                  <div key={question.questionIndex} className="rounded-[14px] border border-[color:var(--line)] px-3 py-3">
                    <p className="text-sm font-semibold text-[color:var(--label)]">
                      {question.questionIndex + 1}. {question.question}
                    </p>
                    {question.type === "short_text_self_check" ? (
                      <label className="mt-3 block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                          Self-check reflection
                        </span>
                        <textarea
                          className="field-textarea min-h-[84px]"
                          value={selfCheckAnswers[question.questionIndex] ?? ""}
                          onChange={(event) =>
                            setSelfCheckAnswers((current) => ({
                              ...current,
                              [question.questionIndex]: event.target.value
                            }))
                          }
                          disabled={!selectedLessonAvailable}
                        />
                      </label>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {question.options.map((option, optionIndex) => (
                          <label
                            key={`${question.questionIndex}-${option}`}
                            className="flex min-h-[44px] items-center gap-2 rounded-[12px] border border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--label2)]"
                          >
                            <input
                              type="radio"
                              name={`lesson-check-${selectedLesson.lessonId}-${question.questionIndex}`}
                              checked={selectedCheckAnswers[question.questionIndex] === optionIndex}
                              onChange={() =>
                                setSelectedCheckAnswers((current) => ({
                                  ...current,
                                  [question.questionIndex]: optionIndex
                                }))
                              }
                              disabled={!selectedLessonAvailable}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={submitLessonCheck}
                disabled={isSubmittingCheck || !selectedLessonAvailable || selectedLesson.check.attemptStatus === "locked_until_lesson_available"}
                variant="primary"
              >
                {isSubmittingCheck ? "Submitting..." : "Submit lesson check"}
              </Button>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Button onClick={() => saveProgress("started")} disabled={isSaving || !selectedLessonAvailable} variant="secondary">
              Start lesson
            </Button>
            <Button onClick={() => saveProgress("watched_80")} disabled={isSaving || !selectedLessonAvailable} variant="secondary">
              Mark 80% watched
            </Button>
            <Button onClick={() => saveProgress("completed")} disabled={isSaving || !selectedLessonAvailable || requiredCheckPending} variant="primary">
              Complete lesson
            </Button>
          </div>
          {requiredCheckPending ? (
            <p className="rounded-[14px] border border-[color:color-mix(in_srgb,var(--amber)_30%,transparent)] px-3 py-2 text-xs leading-5 text-[color:var(--amber)]">
              Completion locked until this required lesson check is passed.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] pt-4">
            <Button
              onClick={() =>
                previousLessonItem?.lesson.lockState === "available" &&
                setSelectedLessonId(previousLessonItem.lesson.lessonId)
              }
              disabled={!previousLessonItem || previousLessonItem.lesson.lockState !== "available"}
              variant="ghost"
              size="sm"
            >
              Previous lesson
            </Button>
            <Button
              onClick={() =>
                nextLessonItem?.lesson.lockState === "available" &&
                setSelectedLessonId(nextLessonItem.lesson.lessonId)
              }
              disabled={!nextLessonItem || nextLessonItem.lesson.lockState !== "available"}
              variant="primary"
              size="sm"
            >
              Next lesson
            </Button>
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            This course does not have an available lesson yet. If lessons exist, complete the previous
            unlocked lesson first; otherwise the educator still needs to publish a complete lesson path.
          </p>
        </GlassCard>
      )}

      <Button href="/app/courses" variant="ghost">
        Back to course list
      </Button>
    </StudentShell>
  );
}

export function StudentCourseReaderClient({ courseId }: { courseId: string }) {
  return (
    <RoleGate allowedRole="student" nextPath={`/app/courses/${courseId}`}>
      <StudentCourseReaderBody courseId={courseId} />
    </RoleGate>
  );
}
