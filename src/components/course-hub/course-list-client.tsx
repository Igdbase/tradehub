"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import { formatDate } from "@/components/workspace/workspace-formatters";
import type {
  CourseHubCourseListItem,
  CourseHubDetailResponse,
  CourseHubListResponse
} from "@/types/course-hub";

const emptyCreateState = {
  title: "",
  description: "",
  accessTier: "all"
};

type WorkspaceCourseStatusFilter = "all" | "draft" | "published" | "archived";
type WorkspaceCourseResourceFilter = "all" | "has_resources" | "no_resources";
type WorkspaceCourseCheckFilter = "all" | "check_activity" | "no_check_activity";
type WorkspaceCourseCompletionFilter = "all" | "has_completed" | "no_completed";

const statusFilters: Array<{ label: string; value: WorkspaceCourseStatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" }
];

function courseMatchesSearch(course: CourseHubCourseListItem, query: string) {
  if (!query) {
    return true;
  }

  return [
    course.title,
    course.description,
    course.accessTier,
    course.status,
    course.publishBlockedReasons.join(" ")
  ].join(" ").toLowerCase().includes(query);
}

function courseMatchesWorkspaceFilters({
  course,
  statusFilter,
  resourceFilter,
  checkFilter,
  completionFilter
}: {
  course: CourseHubCourseListItem;
  statusFilter: WorkspaceCourseStatusFilter;
  resourceFilter: WorkspaceCourseResourceFilter;
  checkFilter: WorkspaceCourseCheckFilter;
  completionFilter: WorkspaceCourseCompletionFilter;
}) {
  const hasResources = course.resourceSummary.totalResourceCount > 0;
  const hasCheckActivity =
    (course.completionSummary?.checkAttemptedCount ?? 0) > 0 ||
    (course.completionSummary?.checkPassedCount ?? 0) > 0;
  const hasCompleted = (course.completionSummary?.completedCount ?? 0) > 0;

  return (
    (statusFilter === "all" || course.status === statusFilter) &&
    (resourceFilter === "all" ||
      (resourceFilter === "has_resources" ? hasResources : !hasResources)) &&
    (checkFilter === "all" ||
      (checkFilter === "check_activity" ? hasCheckActivity : !hasCheckActivity)) &&
    (completionFilter === "all" ||
      (completionFilter === "has_completed" ? hasCompleted : !hasCompleted))
  );
}

function CourseCard({ course }: { course: CourseHubCourseListItem }) {
  return (
    <GlassCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow !text-[color:var(--label3)]">{course.accessTier}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
            {course.title}
          </h2>
        </div>
        <Badge tone={course.status === "published" ? "green" : course.status === "archived" ? "neutral" : "amber"}>
          {course.status}
        </Badge>
      </div>
      <p className="text-sm leading-6 text-[color:var(--label2)]">{course.description}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatChip label="Sections" value={String(course.sectionCount)} tone="accent" />
          <StatChip label="Lessons" value={String(course.lessonCount)} tone="green" />
          <StatChip label="Updated" value={formatDate(course.updatedAt)} tone="neutral" />
          <StatChip label="Resource lessons" value={String(course.resourceSummary.lessonsWithResourcesCount)} tone="accent" />
          <StatChip label="Resources" value={String(course.resourceSummary.totalResourceCount)} tone="green" />
        </div>
      {course.completionSummary ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatChip label="Eligible" value={String(course.completionSummary.eligibleCount)} tone="neutral" />
          <StatChip label="Started" value={String(course.completionSummary.startedCount)} tone="accent" />
          <StatChip label="Completed" value={String(course.completionSummary.completedCount)} tone="green" />
          <StatChip label="Avg progress" value={`${course.completionSummary.averageProgressPercent}%`} tone="green" />
          <StatChip label="Checks tried" value={String(course.completionSummary.checkAttemptedCount)} tone="accent" />
          <StatChip label="Checks passed" value={String(course.completionSummary.checkPassedCount)} tone="green" />
          <StatChip label="Avg score" value={`${course.completionSummary.averageCheckScorePercent}%`} tone="neutral" />
          <StatChip label="Note students" value={String(course.completionSummary.studentsWithNotesCount)} tone="accent" />
          <StatChip label="Bookmarks" value={String(course.completionSummary.bookmarkedLessonsCount)} tone="green" />
          <StatChip label="Recent learning" value={String(course.completionSummary.recentLearningActivityCount)} tone="neutral" />
        </div>
      ) : null}
      <p className="text-xs leading-5 text-[color:var(--label3)]">
        Student preview:{" "}
        {course.status === "published"
          ? "Published courses appear only for entitled students in this workspace."
          : "Draft and archived courses stay hidden from student course lists."}
      </p>
      {course.completionSummary?.recentCompletions.length ? (
        <div className="rounded-[16px] border border-[color:var(--line)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            Recent completions
          </p>
          <div className="mt-2 space-y-1">
            {course.completionSummary.recentCompletions.map((completion) => (
              <p key={`${completion.maskedStudentRef}-${completion.completedAt}`} className="text-xs leading-5 text-[color:var(--label2)]">
                {completion.maskedStudentRef} - {formatDate(completion.completedAt)}
              </p>
            ))}
          </div>
        </div>
      ) : null}
      {course.publishBlockedReasons.length > 0 && course.status !== "published" ? (
        <p className="text-xs leading-5 text-[color:var(--amber)]">
          Publish blocked: {course.publishBlockedReasons.join(" ")}
        </p>
      ) : null}
      <Button href={`/workspace/courses/${course.courseId}`} variant="primary" size="sm">
        Open editor
      </Button>
    </GlassCard>
  );
}

function CourseHubBody() {
  const [courses, setCourses] = useState<CourseHubCourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createState, setCreateState] = useState(emptyCreateState);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkspaceCourseStatusFilter>("all");
  const [resourceFilter, setResourceFilter] = useState<WorkspaceCourseResourceFilter>("all");
  const [checkFilter, setCheckFilter] = useState<WorkspaceCourseCheckFilter>("all");
  const [completionFilter, setCompletionFilter] = useState<WorkspaceCourseCompletionFilter>("all");

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<CourseHubListResponse>("/api/workspace/courses?limit=25");
      setCourses(response.courses);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load courses.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const summary = useMemo(
    () => courses.reduce(
      (current, course) => ({
        draftCount: current.draftCount + (course.status === "draft" ? 1 : 0),
        publishedCount: current.publishedCount + (course.status === "published" ? 1 : 0),
        archivedCount: current.archivedCount + (course.status === "archived" ? 1 : 0),
        resourceCount: current.resourceCount + course.resourceSummary.totalResourceCount,
        resourceLessonCount: current.resourceLessonCount + course.resourceSummary.lessonsWithResourcesCount,
        completedCount: current.completedCount + (course.completionSummary?.completedCount ?? 0),
        checkAttemptedCount: current.checkAttemptedCount + (course.completionSummary?.checkAttemptedCount ?? 0)
      }),
      {
        draftCount: 0,
        publishedCount: 0,
        archivedCount: 0,
        resourceCount: 0,
        resourceLessonCount: 0,
        completedCount: 0,
        checkAttemptedCount: 0
      }
    ),
    [courses]
  );
  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return courses.filter((course) =>
      courseMatchesSearch(course, normalizedSearch) &&
      courseMatchesWorkspaceFilters({
        course,
        statusFilter,
        resourceFilter,
        checkFilter,
        completionFilter
      })
    );
  }, [checkFilter, completionFilter, courses, resourceFilter, searchQuery, statusFilter]);

  async function createCourse() {
    setIsCreating(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<CourseHubDetailResponse>("/api/workspace/courses", {
        method: "POST",
        body: JSON.stringify(createState)
      });
      setCourses((current) => [
        {
          ...response.course,
          sectionCount: response.course.sections.length,
          lessonCount: response.course.sections.flatMap((section) => section.lessons).length,
          publishBlockedReasons: response.publishBlockedReasons,
          resourceSummary: {
            lessonsWithResourcesCount: response.course.sections
              .flatMap((section) => section.lessons)
              .filter((lesson) => lesson.attachments.length > 0).length,
            totalResourceCount: response.course.sections
              .flatMap((section) => section.lessons)
              .reduce((total, lesson) => total + lesson.attachments.length, 0)
          }
        },
        ...current
      ]);
      setCreateState(emptyCreateState);
      setMessage("Course draft created. Open it to add lessons, YouTube IDs, notes, and publish checks.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not create that course.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="hero-panel px-6 py-7 sm:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Course Hub</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[color:var(--label)]">
              Structure lessons without leaking unsafe embeds.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--label2)]">
              Manage draft and published courses, normalize YouTube input into video IDs, keep
              attachments as HTTPS metadata, and keep all course writes scoped to this workspace.
              Student progress and notes stay in student-owned records.
            </p>
          </div>
          <Button href="/workspace" variant="secondary">
            Back to workspace
          </Button>
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
        <div>
          <p className="eyebrow !text-[color:var(--label3)]">Create course draft</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
            New courses stay draft until the editor confirms at least one section and one complete lesson.
            Publishing never changes billing or student subscriptions.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_auto]">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Title
            </span>
            <input
              className="field-control"
              value={createState.title}
              onChange={(event) => setCreateState((current) => ({ ...current, title: event.target.value }))}
              placeholder="Prop firm foundations"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Description
            </span>
            <input
              className="field-control"
              value={createState.description}
              onChange={(event) => setCreateState((current) => ({ ...current, description: event.target.value }))}
              placeholder="A concise path for funded-account discipline."
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Tier
            </span>
            <input
              className="field-control"
              value={createState.accessTier}
              onChange={(event) => setCreateState((current) => ({ ...current, accessTier: event.target.value }))}
              placeholder="all"
            />
          </label>
          <div className="flex items-end">
            <Button onClick={createCourse} variant="primary" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </GlassCard>

      {courses.length > 0 ? (
        <GlassCard className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <label className="min-w-0 flex-1 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Search workspace courses
              </span>
              <input
                className="field-control"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Title, description, tier, status, or publish note"
              />
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Workspace course status filters">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={[
                    "focus-ring h-10 min-w-[92px] rounded-[14px] border px-3 text-sm font-semibold transition",
                    statusFilter === filter.value
                      ? "border-[color:color-mix(in_srgb,var(--accent)_64%,transparent)] bg-[color:var(--accent-bg)] text-[color:var(--label)]"
                      : "border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_68%,transparent)] text-[color:var(--label2)]"
                  ].join(" ")}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <StatChip label="Published" value={String(summary.publishedCount)} tone="green" detail={`${summary.draftCount} drafts`} />
            <StatChip label="Archived" value={String(summary.archivedCount)} tone="neutral" />
            <StatChip label="Resources" value={String(summary.resourceCount)} tone="accent" detail={`${summary.resourceLessonCount} lessons`} />
            <StatChip label="Checks tried" value={String(summary.checkAttemptedCount)} tone="green" detail={`${summary.completedCount} completions`} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Resources
              </span>
              <select
                className="field-control"
                value={resourceFilter}
                onChange={(event) => setResourceFilter(event.target.value as WorkspaceCourseResourceFilter)}
              >
                <option value="all">Any resource count</option>
                <option value="has_resources">Has resources</option>
                <option value="no_resources">No resources</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Check readiness
              </span>
              <select
                className="field-control"
                value={checkFilter}
                onChange={(event) => setCheckFilter(event.target.value as WorkspaceCourseCheckFilter)}
              >
                <option value="all">Any check activity</option>
                <option value="check_activity">Has check activity</option>
                <option value="no_check_activity">No check activity yet</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Completion
              </span>
              <select
                className="field-control"
                value={completionFilter}
                onChange={(event) => setCompletionFilter(event.target.value as WorkspaceCourseCompletionFilter)}
              >
                <option value="all">Any completion state</option>
                <option value="has_completed">Has completions</option>
                <option value="no_completed">No completions yet</option>
              </select>
            </label>
          </div>
          <p className="text-xs leading-5 text-[color:var(--label3)]">
            Workspace discovery uses loaded course metadata and aggregate counts only. It does not expose student notes,
            bookmark labels, lesson attempts, answer keys, or private progress detail.
          </p>
        </GlassCard>
      ) : null}

      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading live course documents...</p>
        </GlassCard>
      ) : courses.length === 0 ? (
        <GlassCard className="space-y-3">
          <p className="eyebrow !text-[color:var(--amber)]">No courses yet</p>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            Create a draft above or finish the onboarding first-course prompt. No fake course records
            are shown here, and students will not see anything until it is published.
          </p>
        </GlassCard>
      ) : filteredCourses.length === 0 ? (
        <GlassCard className="space-y-3">
          <p className="eyebrow !text-[color:var(--amber)]">No workspace courses match</p>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            Adjust the search, status, resource, check, or completion filters. Course management remains scoped to this workspace.
          </p>
          <Button onClick={() => {
            setSearchQuery("");
            setStatusFilter("all");
            setResourceFilter("all");
            setCheckFilter("all");
            setCompletionFilter("all");
          }} variant="secondary">
            Reset filters
          </Button>
        </GlassCard>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {filteredCourses.map((course) => (
            <CourseCard key={course.courseId} course={course} />
          ))}
        </section>
      )}
    </div>
  );
}

export function CourseListClient() {
  return (
    <RoleGate allowedRole="influencer" nextPath="/workspace/courses">
      <CourseHubBody />
    </RoleGate>
  );
}
