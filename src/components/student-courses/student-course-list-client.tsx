"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import { formatDateTime } from "@/components/student-app/student-formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type {
  StudentCourseLearningItem,
  StudentCourseLessonSearchItem,
  StudentCourseListItem,
  StudentCourseListResponse,
  StudentCourseResumePointDocument
} from "@/types/course-hub";

type CourseListFilter = "all" | "available" | "locked" | "in_progress" | "completed";

const courseFilters: Array<{ label: string; value: CourseListFilter }> = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Locked", value: "locked" }
];

function includesQuery(parts: Array<string | undefined>, query: string) {
  return parts.join(" ").toLowerCase().includes(query);
}

function matchesCourseFilter(course: StudentCourseListItem, filter: CourseListFilter) {
  const percent = course.progress?.overallPercent ?? 0;

  switch (filter) {
    case "available":
      return course.isAccessible;
    case "locked":
      return !course.isAccessible;
    case "in_progress":
      return course.isAccessible && percent > 0 && percent < 100;
    case "completed":
      return percent === 100;
    case "all":
    default:
      return true;
  }
}

function lessonSearchKindLabel(item: StudentCourseLessonSearchItem) {
  if (item.kind === "resource") {
    return item.resourceType === "course_resource"
      ? "Course resource"
      : item.resourceType === "external_reference"
        ? "Reference"
        : "Lesson resource";
  }

  return "Lesson";
}

function CourseCard({ course }: { course: StudentCourseListItem }) {
  const percent = course.progressSummary.percentComplete;
  const isLocked = !course.isAccessible;
  const updatedLabel = formatDateTime(course.updatedAt);
  const statusLabel =
    course.progressSummary.status === "completed"
      ? "Completed"
      : course.progressSummary.status === "in_progress"
        ? "In progress"
        : course.progressSummary.status === "locked"
          ? "Locked"
          : "Not started";

  return (
    <GlassCard className="space-y-4" interactive>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--label3)]">
            {course.accessTier === "all" ? "All tiers" : course.accessTier}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
            {course.title}
          </h2>
        </div>
        <Badge tone={course.progressSummary.status === "completed" ? "green" : isLocked ? "amber" : "accent"}>
          {statusLabel}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs leading-5 text-[color:var(--label3)]">
        <span>{isLocked ? "Access required before reading" : percent > 0 ? "Ready to continue" : "Ready to start"}</span>
        <span aria-hidden="true">·</span>
        <span>{course.lessonCount} lessons</span>
      </div>
      <p className="text-sm leading-6 text-[color:var(--label2)]">{course.description}</p>
      {course.lockedReason ? (
        <div className="rounded-[16px] border border-[color:color-mix(in_srgb,var(--amber)_28%,transparent)] px-4 py-3">
          <p className="text-sm leading-6 text-[color:var(--amber)]">{course.lockedReason}</p>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatChip label="Lessons done" value={`${course.progressSummary.completedLessonCount}/${course.progressSummary.totalLessonCount}`} />
        <StatChip
          label="Next"
          value={percent >= 100 ? "Complete" : course.progressSummary.nextLessonTitle ? "Ready" : "Open"}
          detail={course.progressSummary.nextLessonTitle}
        />
        <StatChip label="Updated" value={updatedLabel} />
      </div>
      <ProgressBar label="Progress" value={percent} showValue tone={isLocked ? "amber" : "accent"} />
      <div className="flex flex-wrap gap-2">
        <Button href={isLocked ? "/app/billing" : `/app/courses/${course.courseId}`} variant={isLocked ? "secondary" : "primary"}>
          {isLocked ? "Review access" : percent > 0 ? "Continue" : "Open course"}
        </Button>
        {course.progressSummary.status === "completed" && !isLocked ? (
          <Button href={`/app/courses/${course.courseId}/proof`} variant="secondary">
            View proof
          </Button>
        ) : null}
      </div>
    </GlassCard>
  );
}

function StudentCourseListBody() {
  const [courses, setCourses] = useState<StudentCourseListItem[]>([]);
  const [studentTierLabel, setStudentTierLabel] = useState("All access");
  const [continueLearning, setContinueLearning] = useState<StudentCourseResumePointDocument | undefined>();
  const [learningItems, setLearningItems] = useState<StudentCourseLearningItem[]>([]);
  const [lessonSearchItems, setLessonSearchItems] = useState<StudentCourseLessonSearchItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [learningSearchQuery, setLearningSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<CourseListFilter>("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<StudentCourseListResponse>("/api/student/courses?limit=25");
      setCourses(response.courses);
      setStudentTierLabel(response.studentTierLabel);
      setContinueLearning(response.continueLearning);
      setLearningItems(response.learningItems);
      setLessonSearchItems(response.lessonSearchItems);
      setWarnings(response.warnings);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load student courses.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const completedCourses = courses.filter((course) => course.progress?.overallPercent === 100).length;
  const accessibleCourses = courses.filter((course) => course.isAccessible).length;
  const lockedCourses = courses.filter((course) => !course.isAccessible).length;
  const bookmarkedLessons = learningItems.filter((item) => item.kind === "bookmark");
  const privateNotes = learningItems.filter((item) => item.kind === "note");
  const tierOptions = useMemo(
    () => Array.from(new Set(courses.map((course) => course.accessTier).filter(Boolean))).sort(),
    [courses]
  );
  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return courses.filter((course) => {
      const searchable = [
        course.title,
        course.description,
        course.accessTier,
        course.status,
        course.lockedReason ?? ""
      ];

      return (
        matchesCourseFilter(course, courseFilter) &&
        (tierFilter === "all" || course.accessTier === tierFilter) &&
        (!normalizedSearch || includesQuery(searchable, normalizedSearch))
      );
    });
  }, [courseFilter, courses, searchQuery, tierFilter]);
  const filteredLessonSearchItems = useMemo(() => {
    const normalizedSearch = learningSearchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return lessonSearchItems.slice(0, 6);
    }

    return lessonSearchItems
      .filter((item) =>
        includesQuery(
          [
            item.kind,
            item.courseTitle,
            item.lessonTitle,
            item.sectionTitle,
            item.title,
            item.preview,
            item.hostname ?? "",
            item.resourceType ?? ""
          ],
          normalizedSearch
        )
      )
      .slice(0, 10);
  }, [learningSearchQuery, lessonSearchItems]);
  const filteredLearningItems = useMemo(() => {
    const normalizedSearch = learningSearchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return learningItems.slice(0, 8);
    }

    return learningItems
      .filter((item) =>
        includesQuery(
          [
            item.kind,
            item.courseTitle,
            item.lessonTitle,
            item.sectionTitle,
            item.label ?? "",
            item.preview
          ],
          normalizedSearch
        )
      )
      .slice(0, 12);
  }, [learningItems, learningSearchQuery]);
  const hasLearningSearch = learningSearchQuery.trim().length > 0;

  return (
    <StudentShell
      active="courses"
      eyebrow="Courses"
      title="Lessons"
      subtitle="Browse your available courses, continue lessons, and keep your private notes and bookmarks in one place."
      action={<Badge tone="accent">{studentTierLabel}</Badge>}
      side={
        <>
        <GlassCard className="space-y-4">
            <p className="text-sm font-semibold text-[color:var(--label)]">Course access</p>
            <p className="text-sm leading-6 text-[color:var(--label2)]">
              Courses can be available or locked based on your plan and lesson progress. Contact your instructor if access looks unavailable.
            </p>
          </GlassCard>
          <GlassCard className="space-y-4">
            <p className="text-sm font-semibold text-[color:var(--label)]">How to learn here</p>
            <p className="text-sm leading-6 text-[color:var(--label2)]">
              Open an available course, start with the first unlocked lesson, then mark progress after
              watching. Locked lessons explain what to complete or upgrade before continuing.
            </p>
          </GlassCard>
          {warnings.length > 0 ? (
            <GlassCard className="space-y-2 border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amber)]">
                Course notice
              </p>
              {warnings.map((warning) => (
                <p key={warning} className="text-sm leading-6 text-[color:var(--label2)]">
                  {warning}
                </p>
              ))}
            </GlassCard>
          ) : null}
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatChip label="Courses" value={String(courses.length)} tone="green" />
        <StatChip label="Accessible" value={String(accessibleCourses)} tone="accent" detail={`${lockedCourses} locked`} />
        <StatChip label="Completed" value={String(completedCourses)} tone="green" />
      </div>

      {continueLearning ? (
        <GlassCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Continue learning
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
                {continueLearning.courseTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                Resume {continueLearning.lessonTitle} in {continueLearning.sectionTitle}.
              </p>
            </div>
            <Button href={`/app/courses/${continueLearning.courseId}`} variant="primary">
              Continue
            </Button>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[color:var(--label)]">Learning shortcuts and search</p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
              Search lesson titles, sections, resources, and your own private notes or bookmarks.
              Locked lesson resources are hidden until the lesson is available.
            </p>
          </div>
          <label className="min-w-[220px] space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Search lessons
            </span>
            <input
              className="field-control"
              value={learningSearchQuery}
              onChange={(event) => setLearningSearchQuery(event.target.value)}
              placeholder="Lesson, resource, note, or bookmark"
            />
          </label>
        </div>
        {!hasLearningSearch ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[18px] border border-[color:var(--line)] px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--label)]">Bookmarked lessons</p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                {bookmarkedLessons.length > 0
                  ? `${bookmarkedLessons.length} private bookmark${bookmarkedLessons.length === 1 ? "" : "s"} saved.`
                  : "No bookmarked lessons yet. Open an available lesson and add a bookmark when you want to return quickly."}
              </p>
            </div>
            <div className="rounded-[18px] border border-[color:var(--line)] px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--label)]">Private notes</p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                {privateNotes.length > 0
                  ? `${privateNotes.length} private note${privateNotes.length === 1 ? "" : "s"} saved for your account.`
                  : "No private notes yet. Only you can see the notes you save here."}
              </p>
            </div>
          </div>
        ) : null}

        {hasLearningSearch && filteredLessonSearchItems.length === 0 && filteredLearningItems.length === 0 ? (
          <p className="rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
            No lesson, resource, private note, or bookmark results match that search.
          </p>
        ) : null}

        {filteredLessonSearchItems.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Accessible lessons and resources
              </p>
              <Badge tone="accent">Available to you</Badge>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredLessonSearchItems.map((item) => (
                <article
                  key={`${item.kind}-${item.itemId}`}
                  className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={item.kind === "resource" ? "green" : "accent"}>
                      {lessonSearchKindLabel(item)}
                    </Badge>
                    {item.hostname ? (
                      <span className="truncate text-xs text-[color:var(--label3)]">{item.hostname}</span>
                    ) : null}
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold text-[color:var(--label)]">{item.title}</p>
                  <p className="mt-1 truncate text-xs text-[color:var(--label3)]">
                    {item.courseTitle} · {item.sectionTitle}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--label2)]">{item.preview}</p>
                  <Button href={`/app/courses/${item.courseId}`} variant="ghost" size="sm" className="mt-3">
                    Open course
                  </Button>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {filteredLearningItems.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Your private notes and bookmarks
            </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredLearningItems.map((item) => (
              <article
                key={`${item.kind}-${item.itemId}`}
                className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={item.kind === "note" ? "accent" : "green"}>
                    {item.kind === "note" ? "Note" : "Bookmark"}
                  </Badge>
                  <span className="text-xs text-[color:var(--label3)]">{formatDateTime(item.updatedAt)}</span>
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-[color:var(--label)]">{item.lessonTitle}</p>
                <p className="mt-1 truncate text-xs text-[color:var(--label3)]">{item.courseTitle} · {item.sectionTitle}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--label2)]">
                  {item.label || item.preview}
                </p>
                <Button href={`/app/courses/${item.courseId}`} variant="ghost" size="sm" className="mt-3">
                  Open lesson
                </Button>
              </article>
            ))}
          </div>
          </div>
        ) : learningItems.length === 0 && !hasLearningSearch ? (
          <div className="rounded-[18px] border border-dashed border-[color:var(--line)] px-4 py-3">
            <p className="text-sm font-semibold text-[color:var(--label)]">No saved learning items yet</p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
              Open a lesson to save a private note or bookmark.
            </p>
          </div>
        ) : null}
      </GlassCard>

      {courses.length > 0 ? (
        <GlassCard className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="min-w-0 flex-1 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Search courses
              </span>
              <input
                className="field-control"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, description, tier, status, or access note"
              />
            </label>
            {tierOptions.length > 0 ? (
              <label className="min-w-[160px] space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  Level / tier
                </span>
                <select
                  className="field-control"
                  value={tierFilter}
                  onChange={(event) => setTierFilter(event.target.value)}
                >
                  <option value="all">All levels</option>
                  {tierOptions.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier === "all" ? "All tiers" : tier}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2" aria-label="Course filters">
              {courseFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setCourseFilter(filter.value)}
                  className={[
                    "focus-ring h-10 min-w-[96px] rounded-[14px] border px-3 text-sm font-semibold transition",
                    courseFilter === filter.value
                      ? "border-[color:color-mix(in_srgb,var(--accent)_64%,transparent)] bg-[color:var(--accent-bg)] text-[color:var(--label)]"
                      : "border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_68%,transparent)] text-[color:var(--label2)]"
                  ].join(" ")}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
         <p className="text-xs leading-5 text-[color:var(--label3)]">
            Filters help you find courses faster. Locked courses show only basic course details until access is available.
          </p>
        </GlassCard>
      ) : null}

      {errorMessage ? (
        <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
          <Button onClick={loadCourses} variant="secondary">
            Retry
          </Button>
        </GlassCard>
      ) : null}

      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading courses...</p>
        </GlassCard>
      ) : courses.length === 0 ? (
        <GlassCard className="space-y-4">
          <p className="eyebrow !text-[color:var(--amber)]">No courses yet</p>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            Your instructor has not published a course for you yet. Check back later or contact your instructor.
          </p>
          <Button href="/app" variant="secondary">
            Back home
          </Button>
        </GlassCard>
      ) : filteredCourses.length === 0 ? (
        <GlassCard className="space-y-4">
          <p className="eyebrow !text-[color:var(--amber)]">
            {courseFilter === "available"
              ? "No available courses match"
              : courseFilter === "locked"
                ? "No locked courses match"
                : "No courses match"}
          </p>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            Adjust the search or filter. Locked courses explain what needs to happen before you can open them.
          </p>
          <Button onClick={() => {
            setSearchQuery("");
            setCourseFilter("all");
            setTierFilter("all");
          }} variant="secondary">
            Reset filters
          </Button>
        </GlassCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredCourses.map((course) => (
            <CourseCard key={course.courseId} course={course} />
          ))}
        </div>
      )}
    </StudentShell>
  );
}

export function StudentCourseListClient() {
  return (
    <RoleGate allowedRole="student" nextPath="/app/courses">
      <StudentCourseListBody />
    </RoleGate>
  );
}
