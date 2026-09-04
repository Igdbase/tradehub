"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type {
  CourseAttachment,
  CourseAttachmentType,
  CourseDocument,
  CourseHubDetailResponse,
  CourseLesson,
  CourseQuiz,
  CourseQuizQuestion,
  CourseSectionDocument
} from "@/types/course-hub";

const resourceTypeOptions: Array<{ value: CourseAttachmentType; label: string }> = [
  { value: "lesson_resource", label: "Lesson resource" },
  { value: "course_resource", label: "Course resource" },
  { value: "external_reference", label: "External reference" }
];

function createEmptyResource(): CourseAttachment {
  return {
    label: "",
    url: "",
    type: "lesson_resource",
    description: "",
    hostname: ""
  };
}

function previewHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "Invalid or removed resource";
  }
}

function resourceTypeLabel(type: CourseAttachmentType | undefined) {
  return resourceTypeOptions.find((option) => option.value === type)?.label ?? "Lesson resource";
}

function createLesson(index: number): CourseLesson {
  return {
    lessonId: `lesson_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
    title: "",
    youtubeVideoId: "",
    notes: "",
    order: index + 1,
    requiresPrevious: index > 0,
    attachments: [],
    requiresQuizPass: false
  };
}

function createSection(index: number): CourseSectionDocument {
  return {
    sectionId: `section_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
    title: `Section ${index + 1}`,
    order: index + 1,
    lessons: []
  };
}

function normalizeOrders(sections: CourseSectionDocument[]) {
  return sections.map((section, sectionIndex) => ({
    ...section,
    order: sectionIndex + 1,
    lessons: section.lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      order: lessonIndex + 1
    }))
  }));
}

function defaultQuiz(): CourseQuiz {
  return {
    questions: [],
    passThresholdPercent: 70,
    required: false
  };
}

function createQuizQuestion(type: CourseQuizQuestion["type"]): CourseQuizQuestion {
  if (type === "true_false") {
    return {
      type,
      question: "",
      options: ["True", "False"],
      correctIndex: 0
    };
  }

  if (type === "short_text_self_check") {
    return {
      type,
      question: "",
      options: []
    };
  }

  return {
    type: "multiple_choice",
    question: "",
    options: ["", ""],
    correctIndex: 0
  };
}

function normalizeQuestionForType(question: CourseQuizQuestion, type: CourseQuizQuestion["type"]): CourseQuizQuestion {
  if (type === "true_false") {
    return { ...question, type, options: ["True", "False"], correctIndex: 0 };
  }

  if (type === "short_text_self_check") {
    return { ...question, type, options: [], correctIndex: undefined };
  }

  const options = question.options.length >= 2 ? question.options : ["", ""];
  return { ...question, type: "multiple_choice", options, correctIndex: question.correctIndex ?? 0 };
}

function CourseEditorBody({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseDocument | null>(null);
  const [blockedReasons, setBlockedReasons] = useState<string[]>([]);
  const [pendingRemoveLessonId, setPendingRemoveLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<CourseHubDetailResponse>(
        `/api/workspace/courses/${courseId}`
      );
      setCourse(response.course);
      setBlockedReasons(response.publishBlockedReasons);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load this course.");
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  function patchCourse(update: Partial<CourseDocument>) {
    setCourse((current) => (current ? { ...current, ...update } : current));
  }

  function updateSection(sectionIndex: number, update: Partial<CourseSectionDocument>) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, index) =>
        index === sectionIndex ? { ...section, ...update } : section
      );

      return { ...current, sections: normalizeOrders(sections) };
    });
  }

  function updateLesson(sectionIndex: number, lessonIndex: number, update: Partial<CourseLesson>) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        const lessons = section.lessons.map((lesson, currentLessonIndex) =>
          currentLessonIndex === lessonIndex ? { ...lesson, ...update } : lesson
        );
        return { ...section, lessons };
      });

      return { ...current, sections: normalizeOrders(sections) };
    });
  }

  function updateLessonQuiz(sectionIndex: number, lessonIndex: number, update: Partial<CourseQuiz>) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        const lessons = section.lessons.map((lesson, currentLessonIndex) => {
          if (currentLessonIndex !== lessonIndex) {
            return lesson;
          }

          const quiz = { ...(lesson.quiz ?? defaultQuiz()), ...update };
          return {
            ...lesson,
            quiz,
            requiresQuizPass: quiz.required
          };
        });

        return { ...section, lessons };
      });

      return { ...current, sections: normalizeOrders(sections) };
    });
  }

  function addQuizQuestion(sectionIndex: number, lessonIndex: number, type: CourseQuizQuestion["type"]) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        const lessons = section.lessons.map((lesson, currentLessonIndex) => {
          if (currentLessonIndex !== lessonIndex) {
            return lesson;
          }

          const quiz = lesson.quiz ?? defaultQuiz();
          return {
            ...lesson,
            quiz: {
              ...quiz,
              questions: [...quiz.questions, createQuizQuestion(type)].slice(0, 5)
            }
          };
        });

        return { ...section, lessons };
      });

      return { ...current, sections: normalizeOrders(sections) };
    });
  }

  function updateQuizQuestion(
    sectionIndex: number,
    lessonIndex: number,
    questionIndex: number,
    update: Partial<CourseQuizQuestion>
  ) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        const lessons = section.lessons.map((lesson, currentLessonIndex) => {
          if (currentLessonIndex !== lessonIndex) {
            return lesson;
          }

          const quiz = lesson.quiz ?? defaultQuiz();
          const questions = quiz.questions.map((question, index) => {
            if (index !== questionIndex) {
              return question;
            }

            const nextQuestion = { ...question, ...update };
            return update.type ? normalizeQuestionForType(nextQuestion, update.type) : nextQuestion;
          });

          return { ...lesson, quiz: { ...quiz, questions } };
        });

        return { ...section, lessons };
      });

      return { ...current, sections: normalizeOrders(sections) };
    });
  }

  function removeQuizQuestion(sectionIndex: number, lessonIndex: number, questionIndex: number) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        const lessons = section.lessons.map((lesson, currentLessonIndex) => {
          if (currentLessonIndex !== lessonIndex) {
            return lesson;
          }

          const quiz = lesson.quiz ?? defaultQuiz();
          return {
            ...lesson,
            quiz: {
              ...quiz,
              questions: quiz.questions.filter((_, index) => index !== questionIndex)
            }
          };
        });

        return { ...section, lessons };
      });

      return { ...current, sections: normalizeOrders(sections) };
    });
  }

  function addSection() {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        sections: normalizeOrders([...current.sections, createSection(current.sections.length)])
      };
    });
  }

  function moveSection(sectionIndex: number, direction: -1 | 1) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const nextIndex = sectionIndex + direction;
      if (nextIndex < 0 || nextIndex >= current.sections.length) {
        return current;
      }

      const sections = [...current.sections];
      const [section] = sections.splice(sectionIndex, 1);
      sections.splice(nextIndex, 0, section);

      return { ...current, sections: normalizeOrders(sections) };
    });
  }

  function moveLesson(sectionIndex: number, lessonIndex: number, direction: -1 | 1) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        const nextIndex = lessonIndex + direction;
        if (nextIndex < 0 || nextIndex >= section.lessons.length) {
          return section;
        }

        const lessons = [...section.lessons];
        const [lesson] = lessons.splice(lessonIndex, 1);
        lessons.splice(nextIndex, 0, lesson);
        return { ...section, lessons };
      });

      return { ...current, sections: normalizeOrders(sections) };
    });
  }

  function confirmRemoveLesson(sectionIndex: number, lessonId: string) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, lessons: section.lessons.filter((lesson) => lesson.lessonId !== lessonId) }
          : section
      );

      return { ...current, sections: normalizeOrders(sections) };
    });
    setPendingRemoveLessonId(null);
    setMessage("Lesson removed from this draft payload. Save to persist the updated course structure.");
  }

  function addLesson(sectionIndex: number) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        return {
          ...section,
          lessons: [...section.lessons, createLesson(section.lessons.length)]
        };
      });

      return { ...current, sections: normalizeOrders(sections) };
    });
  }

  async function saveCourse(action: "save_draft" | "publish" | "unpublish" | "archive") {
    if (!course) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<CourseHubDetailResponse>(
        `/api/workspace/courses/${course.courseId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: course.title,
            description: course.description,
            accessTier: course.accessTier,
            thumbnailVideoInput: course.thumbnailVideoId,
            sections: course.sections,
            action
          })
        }
      );
      setCourse(response.course);
      setBlockedReasons(response.publishBlockedReasons);
      setPendingRemoveLessonId(null);
      setMessage(
        action === "publish"
          ? "Course published. Students in the right tier can now see it."
          : "Course saved. No autosaves or background writes were used."
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save this course.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <GlassCard className="mx-auto max-w-3xl">
        <p className="text-sm leading-6 text-[color:var(--label2)]">Loading course editor...</p>
      </GlassCard>
    );
  }

  if (!course) {
    return (
      <GlassCard className="mx-auto max-w-3xl space-y-4">
        <p className="eyebrow !text-[color:var(--red)]">Course editor</p>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          {errorMessage ?? "This course could not be loaded."}
        </p>
        <Button href="/workspace/courses" variant="primary">
          Back to courses
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="hero-panel px-6 py-7 sm:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Course editor</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[color:var(--label)]">
              {course.title || "Untitled course"}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--label2)]">
              Save drafts freely. Publishing requires a complete lesson structure and stores only
              YouTube video IDs, not raw watch URLs. Course edits are workspace-scoped and do not
              touch payments, AutoCopy, practice, or execution systems.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge tone={course.status === "published" ? "green" : "amber"}>{course.status}</Badge>
            <Button href="/workspace/courses" variant="secondary">
              Back
            </Button>
          </div>
        </div>
      </section>

      <div aria-live="polite" className="space-y-3">
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
      </div>

      <GlassCard className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Course title
            </span>
            <input
              className="field-control"
              value={course.title}
              onChange={(event) => patchCourse({ title: event.target.value })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Access tier
            </span>
            <input
              className="field-control"
              value={course.accessTier}
              onChange={(event) => patchCourse({ accessTier: event.target.value })}
              placeholder="all or tier_id"
            />
          </label>
        </div>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            Description
          </span>
          <textarea
            className="field-textarea min-h-[110px]"
            value={course.description}
            onChange={(event) => patchCourse({ description: event.target.value })}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            Thumbnail YouTube URL or video ID
          </span>
          <input
            className="field-control"
            value={course.thumbnailVideoId ?? ""}
            onChange={(event) => patchCourse({ thumbnailVideoId: event.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow !text-[color:var(--label3)]">Student preview state</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              {course.status === "published"
                ? "Published courses are visible only to entitled students in this workspace after the student API confirms access."
                : "Draft and archived courses stay hidden from student course lists until you publish a complete lesson path."}
            </p>
          </div>
          <Badge tone={course.status === "published" ? "green" : course.status === "archived" ? "neutral" : "amber"}>
            {course.status}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[16px] border border-[color:var(--line)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Sections</p>
            <p className="mt-2 text-xl font-semibold text-[color:var(--label)]">{course.sections.length}</p>
          </div>
          <div className="rounded-[16px] border border-[color:var(--line)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Lessons</p>
            <p className="mt-2 text-xl font-semibold text-[color:var(--label)]">
              {course.sections.flatMap((section) => section.lessons).length}
            </p>
          </div>
          <div className="rounded-[16px] border border-[color:var(--line)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Publish checks</p>
            <p className="mt-2 text-xl font-semibold text-[color:var(--label)]">{blockedReasons.length}</p>
          </div>
        </div>
        <p className="text-xs leading-5 text-[color:var(--label3)]">
          Validation runs server-side for bounded text, safe YouTube IDs, plain-text notes, HTTPS attachment
          metadata, section limits, and lesson limits. Reorder and remove controls update the draft locally until Save.
        </p>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow !text-[color:var(--label3)]">Instructor launch checklist</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              Prepare a course by editing the outline, reordering sections or lessons, adding HTTPS resources,
              adding deterministic lesson checks where needed, then saving a draft or publishing. Workspace
              aggregate stats stay separate from private student notes, bookmarks, answers, and resume positions.
            </p>
          </div>
          <Badge tone="accent">Workspace-scoped</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="rounded-[16px] border border-[color:var(--line)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Create</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">Draft structure</p>
          </div>
          <div className="rounded-[16px] border border-[color:var(--line)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Arrange</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">Reorder safely</p>
          </div>
          <div className="rounded-[16px] border border-[color:var(--line)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Resource</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">HTTPS metadata</p>
          </div>
          <div className="rounded-[16px] border border-[color:var(--line)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Check</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">No AI grading</p>
          </div>
          <div className="rounded-[16px] border border-[color:var(--line)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Publish</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">Entitlement-gated</p>
          </div>
        </div>
      </GlassCard>

      {blockedReasons.length > 0 && course.status !== "published" ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)]">
          <p className="eyebrow !text-[color:var(--amber)]">Publish checklist</p>
          <div className="mt-3 space-y-2">
            {blockedReasons.map((reason) => (
              <p key={reason} className="text-sm leading-6 text-[color:var(--label2)]">
                {reason}
              </p>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Sections and lessons</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              Sections behave like modules. Notes render as plain text. Attachments are HTTPS URL metadata only;
              TradeHub does not upload or host course files in this foundation.
            </p>
          </div>
          <Button onClick={addSection} variant="secondary">
            Add section
          </Button>
        </div>

        {course.sections.map((section, sectionIndex) => (
          <GlassCard key={section.sectionId} className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="min-w-0 flex-1 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  Module {sectionIndex + 1}
                </span>
                <input
                  className="field-control"
                  value={section.title}
                  onChange={(event) => updateSection(sectionIndex, { title: event.target.value })}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => moveSection(sectionIndex, -1)}
                  disabled={sectionIndex === 0}
                  variant="ghost"
                  size="sm"
                >
                  Move up
                </Button>
                <Button
                  onClick={() => moveSection(sectionIndex, 1)}
                  disabled={sectionIndex === course.sections.length - 1}
                  variant="ghost"
                  size="sm"
                >
                  Move down
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {section.lessons.map((lesson, lessonIndex) => (
                <div
                  key={lesson.lessonId}
                  className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4"
                >
                  <div className="mb-4 flex flex-col gap-3 border-b border-[color:var(--line)] pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                        Lesson {sectionIndex + 1}.{lessonIndex + 1}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                        Reorder stays inside this module and is saved only when you save the course.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => moveLesson(sectionIndex, lessonIndex, -1)}
                        disabled={lessonIndex === 0}
                        variant="ghost"
                        size="sm"
                      >
                        Move up
                      </Button>
                      <Button
                        onClick={() => moveLesson(sectionIndex, lessonIndex, 1)}
                        disabled={lessonIndex === section.lessons.length - 1}
                        variant="ghost"
                        size="sm"
                      >
                        Move down
                      </Button>
                      <Button
                        onClick={() => setPendingRemoveLessonId(lesson.lessonId)}
                        variant="ghost"
                        size="sm"
                      >
                        Remove lesson
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                        Lesson title
                      </span>
                      <input
                        className="field-control"
                        value={lesson.title}
                        onChange={(event) =>
                          updateLesson(sectionIndex, lessonIndex, { title: event.target.value })
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                        YouTube URL or ID
                      </span>
                      <input
                        className="field-control"
                        value={lesson.youtubeVideoId ?? ""}
                        onChange={(event) =>
                          updateLesson(sectionIndex, lessonIndex, { youtubeVideoId: event.target.value })
                        }
                        placeholder="https://youtu.be/..."
                      />
                    </label>
                  </div>
                  <label className="mt-4 block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                      Plain-text notes
                    </span>
                    <textarea
                      className="field-textarea min-h-[120px]"
                      value={lesson.notes}
                      onChange={(event) =>
                        updateLesson(sectionIndex, lessonIndex, { notes: event.target.value })
                      }
                    />
                  </label>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="flex items-center gap-2 text-sm text-[color:var(--label2)]">
                      <input
                        type="checkbox"
                        checked={lesson.requiresPrevious}
                        onChange={(event) =>
                          updateLesson(sectionIndex, lessonIndex, { requiresPrevious: event.target.checked })
                        }
                      />
                      Requires previous
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[color:var(--label2)]">
                      <input
                        type="checkbox"
                        checked={lesson.requiresQuizPass}
                        onChange={(event) =>
                          updateLessonQuiz(sectionIndex, lessonIndex, { required: event.target.checked })
                        }
                      />
                      Required lesson check
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                        Duration
                      </span>
                      <input
                        className="field-control"
                        value={lesson.durationLabel ?? ""}
                        onChange={(event) =>
                          updateLesson(sectionIndex, lessonIndex, { durationLabel: event.target.value })
                        }
                        placeholder="12 min"
                      />
                    </label>
                  </div>
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                      Resource metadata
                    </p>
                    <p className="text-sm leading-6 text-[color:var(--label2)]">
                      Resources are HTTPS metadata only. TradeHub stores the title, category, description,
                      safe hostname, and link; no files are uploaded or hosted here.
                    </p>
                    {(lesson.attachments.length > 0 ? lesson.attachments : [createEmptyResource()]).map(
                      (attachment, attachmentIndex) => (
                        <div key={`${lesson.lessonId}-attachment-${attachmentIndex}`} className="rounded-[16px] border border-[color:var(--line)] p-3">
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                                Resource title
                              </span>
                              <input
                                className="field-control"
                                value={attachment.label}
                                onChange={(event) => {
                                  const attachments = [...lesson.attachments];
                                  attachments[attachmentIndex] = {
                                    ...(attachments[attachmentIndex] ?? createEmptyResource()),
                                    label: event.target.value
                                  };
                                  updateLesson(sectionIndex, lessonIndex, { attachments });
                                }}
                                placeholder="Worksheet title"
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                                Category
                              </span>
                              <select
                                className="field-control"
                                value={attachment.type ?? "lesson_resource"}
                                onChange={(event) => {
                                  const attachments = [...lesson.attachments];
                                  attachments[attachmentIndex] = {
                                    ...(attachments[attachmentIndex] ?? createEmptyResource()),
                                    type: event.target.value as CourseAttachmentType
                                  };
                                  updateLesson(sectionIndex, lessonIndex, { attachments });
                                }}
                              >
                                {resourceTypeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                            <div className="flex items-end">
                              <Button
                                onClick={() => {
                                  const attachments = lesson.attachments.filter((_, index) => index !== attachmentIndex);
                                  updateLesson(sectionIndex, lessonIndex, { attachments });
                                }}
                                variant="ghost"
                                size="sm"
                                disabled={lesson.attachments.length === 0}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                                HTTPS resource URL
                              </span>
                              <input
                                className="field-control"
                                value={attachment.url}
                                onChange={(event) => {
                                  const attachments = [...lesson.attachments];
                                  attachments[attachmentIndex] = {
                                    ...(attachments[attachmentIndex] ?? createEmptyResource()),
                                    url: event.target.value
                                  };
                                  updateLesson(sectionIndex, lessonIndex, { attachments });
                                }}
                                placeholder="https://..."
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                                Optional description
                              </span>
                              <input
                                className="field-control"
                                value={attachment.description ?? ""}
                                onChange={(event) => {
                                  const attachments = [...lesson.attachments];
                                  attachments[attachmentIndex] = {
                                    ...(attachments[attachmentIndex] ?? createEmptyResource()),
                                    description: event.target.value
                                  };
                                  updateLesson(sectionIndex, lessonIndex, { attachments });
                                }}
                                placeholder="What students should use this for"
                              />
                            </label>
                          </div>
                          <div className="mt-3 rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] px-3 py-2">
                            <p className="truncate text-sm font-semibold text-[color:var(--label)]">
                              {attachment.label || "Resource preview"}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--label3)]">
                              {resourceTypeLabel(attachment.type)} · {previewHostname(attachment.url)}
                            </p>
                            {attachment.description ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--label2)]">
                                {attachment.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    )}
                    <Button
                      onClick={() =>
                        updateLesson(sectionIndex, lessonIndex, {
                          attachments: [...lesson.attachments, createEmptyResource()]
                        })
                      }
                      variant="ghost"
                      size="sm"
                    >
                      Add resource row
                    </Button>
                  </div>
                  <div className="mt-4 space-y-4 rounded-[18px] border border-[color:var(--line)] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                          Lesson check / quiz readiness
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                          Deterministic checks only. Multiple choice and true/false are graded by the server;
                          short text is an ungraded self-check reflection.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => addQuizQuestion(sectionIndex, lessonIndex, "multiple_choice")} variant="ghost" size="sm">
                          Add multiple choice
                        </Button>
                        <Button onClick={() => addQuizQuestion(sectionIndex, lessonIndex, "true_false")} variant="ghost" size="sm">
                          Add true/false
                        </Button>
                        <Button onClick={() => addQuizQuestion(sectionIndex, lessonIndex, "short_text_self_check")} variant="ghost" size="sm">
                          Add self-check
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm text-[color:var(--label2)]">
                        <input
                          type="checkbox"
                          checked={lesson.quiz?.required ?? lesson.requiresQuizPass}
                          onChange={(event) =>
                            updateLessonQuiz(sectionIndex, lessonIndex, { required: event.target.checked })
                          }
                        />
                        Required before completion
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                          Pass threshold
                        </span>
                        <input
                          className="field-control"
                          type="number"
                          min={50}
                          max={100}
                          value={lesson.quiz?.passThresholdPercent ?? 70}
                          onChange={(event) =>
                            updateLessonQuiz(sectionIndex, lessonIndex, {
                              passThresholdPercent: Number(event.target.value)
                            })
                          }
                        />
                      </label>
                    </div>
                    {lesson.quiz?.questions.length ? (
                      <div className="space-y-3">
                        {lesson.quiz.questions.map((question, questionIndex) => (
                          <div key={`${lesson.lessonId}-question-${questionIndex}`} className="rounded-[14px] border border-[color:var(--line)] p-3">
                            <div className="grid gap-3 lg:grid-cols-[160px_1fr_auto]">
                              <label className="space-y-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                                  Type
                                </span>
                                <select
                                  className="field-control"
                                  value={question.type}
                                  onChange={(event) =>
                                    updateQuizQuestion(sectionIndex, lessonIndex, questionIndex, {
                                      type: event.target.value as CourseQuizQuestion["type"]
                                    })
                                  }
                                >
                                  <option value="multiple_choice">Multiple choice</option>
                                  <option value="true_false">True/false</option>
                                  <option value="short_text_self_check">Self-check text</option>
                                </select>
                              </label>
                              <label className="space-y-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                                  Question {questionIndex + 1}
                                </span>
                                <input
                                  className="field-control"
                                  value={question.question}
                                  onChange={(event) =>
                                    updateQuizQuestion(sectionIndex, lessonIndex, questionIndex, {
                                      question: event.target.value
                                    })
                                  }
                                />
                              </label>
                              <div className="flex items-end">
                                <Button onClick={() => removeQuizQuestion(sectionIndex, lessonIndex, questionIndex)} variant="ghost" size="sm">
                                  Delete
                                </Button>
                              </div>
                            </div>
                            {question.type === "multiple_choice" ? (
                              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_160px]">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {(question.options.length > 0 ? question.options : ["", ""]).map((option, optionIndex) => (
                                    <input
                                      key={`${lesson.lessonId}-question-${questionIndex}-option-${optionIndex}`}
                                      className="field-control"
                                      value={option}
                                      onChange={(event) => {
                                        const options = [...question.options];
                                        options[optionIndex] = event.target.value;
                                        updateQuizQuestion(sectionIndex, lessonIndex, questionIndex, { options });
                                      }}
                                      placeholder={`Option ${optionIndex + 1}`}
                                    />
                                  ))}
                                </div>
                                <label className="space-y-2">
                                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                                    Answer key
                                  </span>
                                  <select
                                    className="field-control"
                                    value={question.correctIndex ?? 0}
                                    onChange={(event) =>
                                      updateQuizQuestion(sectionIndex, lessonIndex, questionIndex, {
                                        correctIndex: Number(event.target.value)
                                      })
                                    }
                                  >
                                    {question.options.map((_, optionIndex) => (
                                      <option key={optionIndex} value={optionIndex}>
                                        Option {optionIndex + 1}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            ) : null}
                            {question.type === "true_false" ? (
                              <label className="mt-3 block space-y-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                                  Answer key
                                </span>
                                <select
                                  className="field-control"
                                  value={question.correctIndex ?? 0}
                                  onChange={(event) =>
                                    updateQuizQuestion(sectionIndex, lessonIndex, questionIndex, {
                                      correctIndex: Number(event.target.value)
                                    })
                                  }
                                >
                                  <option value={0}>True</option>
                                  <option value={1}>False</option>
                                </select>
                              </label>
                            ) : null}
                            {question.type === "short_text_self_check" ? (
                              <p className="mt-3 text-xs leading-5 text-[color:var(--label3)]">
                                Self-check text is not graded and is not used by the completion proof.
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-[color:var(--label2)]">
                        No lesson check questions yet. Required checks need at least one objective question before publishing.
                      </p>
                    )}
                  </div>
                  {pendingRemoveLessonId === lesson.lessonId ? (
                    <div className="mt-4 rounded-[16px] border border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)] p-4">
                      <p className="text-sm font-semibold text-[color:var(--amber)]">Confirm lesson removal</p>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                        This removes the lesson from the next saved course structure only. Student progress
                        records remain protected and are not edited from this browser action.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          onClick={() => confirmRemoveLesson(sectionIndex, lesson.lessonId)}
                          variant="secondary"
                          size="sm"
                        >
                          Confirm remove
                        </Button>
                        <Button onClick={() => setPendingRemoveLessonId(null)} variant="ghost" size="sm">
                          Keep lesson
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <Button onClick={() => addLesson(sectionIndex)} variant="secondary" size="sm">
              Add lesson
            </Button>
            {section.lessons.length === 0 ? (
              <p className="text-sm leading-6 text-[color:var(--label2)]">
                No lessons in this section yet. Add a lesson with a title and safe YouTube video ID before publishing.
              </p>
            ) : null}
          </GlassCard>
        ))}
      </section>

      <GlassCard className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          Saves are explicit and quota-safe. No changes are written while typing.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => saveCourse("save_draft")} disabled={isSaving} variant="secondary">
            Save draft
          </Button>
          {course.status === "published" ? (
            <Button onClick={() => saveCourse("unpublish")} disabled={isSaving} variant="secondary">
              Unpublish
            </Button>
          ) : (
            <Button onClick={() => saveCourse("publish")} disabled={isSaving} variant="primary">
              Publish
            </Button>
          )}
          <Button onClick={() => saveCourse("archive")} disabled={isSaving} variant="ghost">
            Archive course
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

export function CourseEditorClient({ courseId }: { courseId: string }) {
  return (
    <RoleGate allowedRole="influencer" nextPath={`/workspace/courses/${courseId}`}>
      <CourseEditorBody courseId={courseId} />
    </RoleGate>
  );
}
