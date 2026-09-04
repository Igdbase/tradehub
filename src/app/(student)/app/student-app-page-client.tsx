"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import {
  formatDateTime,
  formatNgn,
  formatPercent,
  formatSignalMode,
  formatStatusLabel
} from "@/components/student-app/student-formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { HeroCard } from "@/components/ui/hero-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type { StudentAppOverviewResponse } from "@/types/student-app";

function WarningStack({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <GlassCard className="space-y-2 border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amber)]">
        Live data notice
      </p>
      {warnings.map((warning) => (
        <p key={warning} className="text-sm leading-6 text-[color:var(--label2)]">
          {warning}
        </p>
      ))}
    </GlassCard>
  );
}

function StudentHomeBody() {
  const [overview, setOverview] = useState<StudentAppOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<StudentAppOverviewResponse>("/api/student/app/overview");
      setOverview(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load your student home.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  if (isLoading) {
    return (
      <StudentShell
        active="home"
        eyebrow="Student home"
        title="Loading your learning space"
        subtitle="TradeHub is getting your courses, signals, journal, practice, copier, and billing ready."
      >
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading your student summary...</p>
        </GlassCard>
      </StudentShell>
    );
  }

  if (!overview) {
    return (
      <StudentShell
        active="home"
        eyebrow="Student home"
        title="Student home unavailable"
        subtitle="Your account signed in, but TradeHub could not load your student home."
      >
        <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--red)]">
            {errorMessage ?? "This student account is not provisioned yet."}
          </p>
          <Button onClick={loadOverview} variant="secondary">
            Retry
          </Button>
        </GlassCard>
      </StudentShell>
    );
  }

  const accessibleCourses = overview.courses.filter((course) => course.isAccessible);
  const latestCourse = accessibleCourses[0] ?? null;
  const lockedCourse = overview.courses.find((course) => !course.isAccessible) ?? null;
  const signalTone = overview.latestSignal?.direction === "sell" ? "red" : "green";
  const copierTone = overview.student.autoCopyAccessState === "allowed" ? "green" : "amber";
  const journalVisibilityValue =
    overview.journal.privacyState === "workspace_visible" ? "Summary visible" : "Private";
  const journalVisibilityDetail =
    overview.journal.summaryState === "zero_safe"
      ? "No summary doc yet"
      : overview.journal.privacyState === "workspace_visible"
        ? "Workspace sees summary only"
        : "Trade-by-trade view stays private";

  return (
    <StudentShell
      active="home"
      eyebrow={`@${overview.workspace.handle}`}
      title={overview.workspace.name}
      subtitle={`${overview.student.displayName}'s home for courses, signals, copier, journal, practice, and billing.`}
      action={<Badge tone="accent">{overview.student.tierLabel}</Badge>}
      hero={
        <HeroCard
          label="Course progress"
          value={formatPercent(overview.summary.courseProgressPercent)}
          change={
            overview.student.courseAccessState === "allowed"
              ? `${overview.summary.completedCourseCount} completed course${overview.summary.completedCourseCount === 1 ? "" : "s"}`
              : overview.student.courseAccessReason
          }
          changeTone="accent"
          badge={<Badge tone={copierTone}>{formatSignalMode(overview.summary.copierMode)}</Badge>}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <StatChip
              label="Live signals"
              value={String(overview.summary.liveSignalsCount)}
              tone="accent"
            />
            <StatChip
              label="30d P&L"
              value={formatNgn(overview.summary.journalPnl30dNgn)}
              tone={overview.summary.journalPnl30dNgn >= 0 ? "green" : "red"}
            />
            <StatChip
              label="Copier status"
              value={formatStatusLabel(overview.summary.copierStatus)}
              tone={copierTone}
            />
          </div>
        </HeroCard>
      }
      side={
        <>
          <WarningStack warnings={overview.warnings} />
          <GlassCard className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--label3)]">
                  Workspace access
                </p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">
                  {formatStatusLabel(overview.student.subscriptionStatus)}
                </p>
              </div>
              <Badge tone={overview.student.subscriptionStatus === "active" ? "green" : "amber"}>
                {overview.student.paymentRail}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-[color:var(--label2)]">
              Billing shows your current access and subscription status for this workspace.
            </p>
            <Button href="/app/billing" variant="secondary">
              Open billing
            </Button>
          </GlassCard>
          <GlassCard className="space-y-4">
            <p className="text-sm font-semibold text-[color:var(--label)]">Quick links</p>
            <div className="grid gap-2">
              <Button href="/app/billing" variant="secondary" fullWidth>
                Billing and access
              </Button>
              <Button href="/app/courses" variant="secondary" fullWidth>
                Open courses
              </Button>
              <Button href="/app/signals" variant="secondary" fullWidth>
                View signals
              </Button>
              <Button href="/app/copier" variant="secondary" fullWidth>
                Copier safety
              </Button>
              <Button href="/app/journal" variant="secondary" fullWidth>
                Journal summary
              </Button>
              <Button href="/app/practice" variant="secondary" fullWidth>
                Practice
              </Button>
            </div>
          </GlassCard>
        </>
      }
    >
      {errorMessage ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
        </GlassCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatChip
          label="Tier"
          value={overview.student.tierLabel}
          tone="accent"
        />
        <StatChip
          label="Signals"
          value={overview.student.signalAccessState === "allowed" ? "Enabled" : "Locked"}
          detail={
            overview.student.signalAccessState === "allowed"
              ? formatSignalMode(overview.student.accountMode)
              : overview.student.signalAccessReason
          }
          tone={overview.student.signalAccessState === "allowed" ? "green" : "amber"}
        />
        <StatChip
          label="Journal privacy"
          value={journalVisibilityValue}
          detail={journalVisibilityDetail}
          tone={overview.journal.privacyState === "workspace_visible" ? "green" : "amber"}
        />
        <StatChip
          label="Last seen"
          value={formatDateTime(overview.student.lastSeenAt)}
          detail="Recent activity"
          tone="neutral"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <GlassCard className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--label)]">Next course step</p>
              <p className="mt-1 text-sm text-[color:var(--label2)]">
                Pick up where you left off or open your next lesson.
              </p>
            </div>
            <Badge tone="green">Available</Badge>
          </div>
          {latestCourse ? (
            <>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
                  {latestCourse.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                  {latestCourse.description}
                </p>
              </div>
              <ProgressBar
                label={`${latestCourse.lessonCount} lessons`}
                value={latestCourse.progress?.overallPercent ?? 0}
                showValue
              />
              <Button href={`/app/courses/${latestCourse.courseId}`} variant="primary">
                Continue course
              </Button>
            </>
          ) : lockedCourse ? (
            <>
              <p className="text-sm leading-6 text-[color:var(--label2)]">
                {lockedCourse.lockedReason ?? overview.student.courseAccessReason}
              </p>
              <Button href="/app/billing" variant="secondary">
                Review course access
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-[color:var(--label2)]">
                No course is available for your plan yet. Contact your instructor if access is unavailable.
              </p>
              <Button href="/app/courses" variant="secondary">
                Open courses
              </Button>
            </>
          )}
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--label)]">Latest signal</p>
              <p className="mt-1 text-sm text-[color:var(--label2)]">Signals appear here when your educator shares them.</p>
            </div>
            <Badge tone={overview.latestSignal ? signalTone : "neutral"}>
              {overview.latestSignal ? overview.latestSignal.market : "Empty"}
            </Badge>
          </div>
          {overview.latestSignal ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--label)]">
                  {overview.latestSignal.pair}
                </p>
                <Badge tone={signalTone}>{overview.latestSignal.direction}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatChip label="Entry" value={overview.latestSignal.entry} />
                <StatChip label="SL" value={overview.latestSignal.stopLoss} tone="red" />
                <StatChip label="TP" value={overview.latestSignal.takeProfit} tone="green" />
              </div>
              <p className="text-xs leading-5 text-[color:var(--label3)]">
                Published {formatDateTime(overview.latestSignal.publishedAt ?? overview.latestSignal.updatedAt)}
              </p>
            </div>
          ) : overview.student.signalAccessState !== "allowed" ? (
            <p className="text-sm leading-6 text-[color:var(--label2)]">
              {overview.student.signalAccessReason}
            </p>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--label2)]">
              Published signals will appear here after your educator sends them through the workspace.
            </p>
          )}
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-[color:var(--label)]">Copier safety</p>
            <Badge tone={copierTone}>{formatStatusLabel(overview.student.copierStatus)}</Badge>
          </div>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            {overview.student.autoCopyAccessState === "allowed"
              ? "Your Copier access is available. Review your setup and risk controls before using it."
              : overview.student.autoCopyAccessState === "alerts_only"
                ? "Your account is set to signal alerts only."
                : overview.student.autoCopyAccessReason}
          </p>
          <Button href="/app/copier" variant="secondary">
            Review copier mode
          </Button>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-[color:var(--label)]">Journal summary</p>
            <Badge tone={overview.student.journalAccessState === "allowed" ? (overview.journal.privacyState === "private" ? "amber" : "green") : "amber"}>
              {overview.student.journalAccessState === "allowed"
                ? formatStatusLabel(overview.journal.privacyState)
                : "Locked"}
            </Badge>
          </div>
          {overview.student.journalAccessState === "allowed" ? (
            <div className="grid grid-cols-3 gap-3">
              <StatChip label="Trades" value={String(overview.journal.totalTrades30d)} />
              <StatChip label="Win rate" value={formatPercent(overview.journal.winRate30d)} tone="green" />
              <StatChip label="Avg R:R" value={`${overview.journal.averageRiskReward30d.toFixed(1)}R`} />
            </div>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--label2)]">
              {overview.student.journalAccessReason}
            </p>
          )}
          <Button href="/app/journal" variant="secondary">
            Open journal
          </Button>
        </GlassCard>
      </div>

    </StudentShell>
  );
}

export function StudentAppPageClient() {
  return (
    <RoleGate allowedRole="student" nextPath="/app">
      <StudentHomeBody />
    </RoleGate>
  );
}
