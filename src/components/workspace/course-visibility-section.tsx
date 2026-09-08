"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { formatDate } from "@/components/workspace/workspace-formatters";
import type { WorkspaceCourseListItem } from "@/types/workspace-dashboard";

export function CourseVisibilitySection({
  courses,
  loading,
  warnings,
  onRefresh
}: {
  courses: WorkspaceCourseListItem[];
  loading: boolean;
  warnings: string[];
  onRefresh: () => void;
}) {
  const publishedCount = courses.filter((course) => course.published).length;
  const draftCount = courses.length - publishedCount;
  const completionSummary = courses.reduce(
    (summary, course) => {
      const courseSummary = course.completionSummary;
      const resourceSummary = course.resourceSummary;

      return {
        eligibleCount: summary.eligibleCount + (courseSummary?.eligibleCount ?? 0),
        startedCount: summary.startedCount + (courseSummary?.startedCount ?? 0),
        completedCount: summary.completedCount + (courseSummary?.completedCount ?? 0),
        checkAttemptedCount: summary.checkAttemptedCount + (courseSummary?.checkAttemptedCount ?? 0),
        checkPassedCount: summary.checkPassedCount + (courseSummary?.checkPassedCount ?? 0),
        studentsWithNotesCount: summary.studentsWithNotesCount + (courseSummary?.studentsWithNotesCount ?? 0),
        bookmarkedLessonsCount: summary.bookmarkedLessonsCount + (courseSummary?.bookmarkedLessonsCount ?? 0),
        recentLearningActivityCount: summary.recentLearningActivityCount + (courseSummary?.recentLearningActivityCount ?? 0),
        resourceLessonsCount: summary.resourceLessonsCount + resourceSummary.lessonsWithResourcesCount,
        totalResourceCount: summary.totalResourceCount + resourceSummary.totalResourceCount,
        checkScoreTotal: summary.checkScoreTotal + (courseSummary?.averageCheckScorePercent ?? 0),
        progressTotal: summary.progressTotal + (courseSummary?.averageProgressPercent ?? 0),
        summarizedCourses: summary.summarizedCourses + (courseSummary ? 1 : 0)
      };
    },
    {
      eligibleCount: 0,
      startedCount: 0,
      completedCount: 0,
      checkAttemptedCount: 0,
      checkPassedCount: 0,
      studentsWithNotesCount: 0,
      bookmarkedLessonsCount: 0,
      recentLearningActivityCount: 0,
      resourceLessonsCount: 0,
      totalResourceCount: 0,
      checkScoreTotal: 0,
      progressTotal: 0,
      summarizedCourses: 0
    }
  );
  const averageProgress =
    completionSummary.summarizedCourses > 0
      ? Math.round(completionSummary.progressTotal / completionSummary.summarizedCourses)
      : 0;
  const averageCheckScore =
    completionSummary.summarizedCourses > 0
      ? Math.round(completionSummary.checkScoreTotal / completionSummary.summarizedCourses)
      : 0;

  return (
    <GlassCard className="space-y-6" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Course visibility</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--label)]">
            Drafts and published courses
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Manage what students can actually see. Drafts remain internal; published courses still
            respect each student&apos;s current access.
          </p>
        </div>
        <div className="flex max-w-full flex-wrap justify-end gap-2">
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
            {loading ? "Refreshing..." : "Refresh courses"}
          </Button>
          <Button href="/workspace/onboarding" variant="ghost" size="sm">
            Edit setup draft
          </Button>
          <Button href="/workspace/courses/hub" variant="primary" size="sm">
            Open Course Hub
          </Button>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Loaded</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{courses.length}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Published</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--green)]">{publishedCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Drafts</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--accent)]">{draftCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Eligible</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{completionSummary.eligibleCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Started</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--accent)]">{completionSummary.startedCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Completed</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--green)]">{completionSummary.completedCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Avg progress</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{averageProgress}%</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Checks tried</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--accent)]">{completionSummary.checkAttemptedCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Checks passed</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--green)]">{completionSummary.checkPassedCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Avg score</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{averageCheckScore}%</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Students w notes</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--accent)]">{completionSummary.studentsWithNotesCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Bookmarks</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--green)]">{completionSummary.bookmarkedLessonsCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Recent learning</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{completionSummary.recentLearningActivityCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Resource lessons</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--accent)]">{completionSummary.resourceLessonsCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Resources</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--green)]">{completionSummary.totalResourceCount}</p>
        </div>
      </div>

      {warnings.map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {warning}
        </p>
      ))}

      {courses.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[color:var(--line)] p-6">
          <p className="text-sm font-semibold text-[color:var(--label)]">No courses yet</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Create the first safe draft from onboarding or open the Course Hub to start from scratch.
          </p>
          <Button href="/workspace/courses/hub" variant="primary" size="sm" className="mt-4">
            Open Course Hub
          </Button>
        </div>
      ) : (
        <div className="bounded-list-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {courses.map((course) => (
            <article
              key={course.courseId}
              className="flex min-h-[15rem] flex-col rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-safe text-base font-semibold text-[color:var(--label)]">{course.title}</p>
                  <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                    {course.sectionCount} sections - updated {formatDate(course.updatedAt)}
                  </p>
                </div>
                <Badge tone={course.published ? "green" : "amber"}>
                  {course.published ? "Published" : "Draft"}
                </Badge>
              </div>
              <p className="break-safe mt-4 text-sm leading-6 text-[color:var(--label2)]">
                {course.description || "No course description has been added yet."}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <Badge tone="neutral">Access: {course.accessTier}</Badge>
                <Badge tone={course.published ? "green" : "accent"}>
                  {course.published ? "Student-visible" : "Owner review"}
                </Badge>
                {course.completionSummary ? (
                  <Badge tone="green">
                    {course.completionSummary.completedCount}/{course.completionSummary.eligibleCount} complete
                  </Badge>
                ) : null}
                {course.completionSummary ? (
                  <Badge tone="accent">
                    {course.completionSummary.checkPassedCount}/{course.completionSummary.checkAttemptedCount} checks
                  </Badge>
                ) : null}
                {course.completionSummary ? (
                  <Badge tone="neutral">
                    {course.completionSummary.studentsWithNotesCount} note students
                  </Badge>
                ) : null}
                <Badge tone="accent">
                  {course.resourceSummary.totalResourceCount} resources
                </Badge>
                <Button href={`/workspace/courses/${course.courseId}`} variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
              {course.completionSummary?.recentCompletions.length ? (
                <div className="mt-3 rounded-[14px] border border-[color:var(--line)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Recent completions
                  </p>
                  {course.completionSummary.recentCompletions.slice(0, 2).map((completion) => (
                    <p key={`${course.courseId}-${completion.maskedStudentRef}-${completion.completedAt}`} className="mt-1 text-xs leading-5 text-[color:var(--label2)]">
                      {completion.maskedStudentRef} - {formatDate(completion.completedAt)}
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
