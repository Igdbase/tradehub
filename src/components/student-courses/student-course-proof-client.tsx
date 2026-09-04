"use client";

import { useCallback, useEffect, useState } from "react";
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
  StudentCourseCompletionProof,
  StudentCourseCompletionProofResponse
} from "@/types/course-hub";

function StudentCourseProofBody({ courseId }: { courseId: string }) {
  const [proof, setProof] = useState<StudentCourseCompletionProof | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProof = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<StudentCourseCompletionProofResponse>(
        `/api/student/courses/${courseId}/completion`
      );
      setProof(response.proof);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load this completion proof.");
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadProof();
  }, [loadProof]);

  return (
    <StudentShell
      active="courses"
      eyebrow="Course proof"
      title={proof?.courseTitle ?? "Completion proof"}
      subtitle="A printable proof of your course progress. Use your browser's print option to save a copy."
      action={
        <div className="course-proof-no-print flex flex-wrap gap-2">
          <Button href={`/app/courses/${courseId}`} variant="ghost">Back to course</Button>
          <Button href="/app/courses" variant="secondary">All courses</Button>
          <Button type="button" onClick={() => window.print()} disabled={!proof?.completed}>
            Print / Save proof
          </Button>
        </div>
      }
    >
      <style jsx global>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        @media print {
          body {
            background: #ffffff !important;
            color: #111111 !important;
          }

          header,
          nav,
          footer,
          .course-proof-no-print {
            display: none !important;
          }

          .course-proof-shell {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .course-proof-section {
            break-inside: avoid;
            page-break-inside: avoid;
            background: #ffffff !important;
            border-color: #d4d4d4 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {errorMessage ? (
        <GlassCard className="course-proof-no-print border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
        </GlassCard>
      ) : null}

      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading completion proof...</p>
        </GlassCard>
      ) : null}

      {proof ? (
        <div className="course-proof-shell grid gap-4">
          <GlassCard className="course-proof-section space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  TradeHub course proof
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--label)]">
                  {proof.courseTitle}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                  {proof.workspaceLabel}
                </p>
              </div>
              <Badge tone={proof.completed ? "green" : "amber"}>
                {proof.completed ? "Completed" : "In progress"}
              </Badge>
            </div>

            <p className="text-sm leading-6 text-[color:var(--label2)]">{proof.courseDescription}</p>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatChip
                label="Lessons"
                value={`${proof.progressSummary.completedLessonCount}/${proof.progressSummary.totalLessonCount}`}
                tone="green"
              />
              <StatChip label="Progress" value={`${proof.progressSummary.percentComplete}%`} tone="accent" />
              <StatChip label="Completed" value={formatDateTime(proof.completedAt)} tone={proof.completed ? "green" : "amber"} />
            </div>

            <ProgressBar
              label="Course completion"
              value={proof.progressSummary.percentComplete}
              showValue
              tone={proof.completed ? "green" : "accent"}
            />

            {proof.completed ? (
              <div className="rounded-[18px] border border-[color:color-mix(in_srgb,var(--green)_28%,transparent)] px-4 py-3">
                <p className="text-sm font-semibold text-[color:var(--green)]">Completion confirmed</p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                  Your course completion is confirmed. You can print or save this proof through your browser.
                </p>
              </div>
            ) : (
              <div className="rounded-[18px] border border-[color:color-mix(in_srgb,var(--amber)_28%,transparent)] px-4 py-3">
                <p className="text-sm font-semibold text-[color:var(--amber)]">Proof not ready yet</p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                  Complete every required lesson before printing proof. Next lesson:{" "}
                  {proof.progressSummary.nextLessonTitle ?? "open the course reader to continue"}.
                </p>
              </div>
            )}

            <p className="text-xs leading-5 text-[color:var(--label3)]">
              Created {formatDateTime(proof.generatedAt)}. Keep this proof for your records.
            </p>
          </GlassCard>
        </div>
      ) : !isLoading ? (
        <GlassCard className="course-proof-no-print space-y-4">
          <p className="text-sm font-semibold text-[color:var(--label)]">Proof unavailable</p>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            Complete every required lesson and knowledge check before opening your proof.
          </p>
          <Button href={`/app/courses/${courseId}`} variant="primary">
            Back to course
          </Button>
        </GlassCard>
      ) : null}
    </StudentShell>
  );
}

export function StudentCourseProofClient({ courseId }: { courseId: string }) {
  return (
    <RoleGate allowedRole="student" nextPath={`/app/courses/${courseId}/proof`}>
      <StudentCourseProofBody courseId={courseId} />
    </RoleGate>
  );
}
