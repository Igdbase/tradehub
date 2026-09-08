"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { HeroCard } from "@/components/ui/hero-card";
import { StatChip } from "@/components/ui/stat-chip";
import { formatCurrencyNgn, formatDate } from "@/components/workspace/workspace-formatters";
import type { OnboardingProgressDocument, WorkspaceOnboardingStepKey } from "@/types/onboarding";
import type { Workspace } from "@/types/workspace";
import type { WorkspaceDashboardSummary } from "@/types/workspace-dashboard";

function approvalTone(status: WorkspaceDashboardSummary["ownerApprovalStatus"]) {
  if (status === "approved") {
    return "green" as const;
  }

  if (status === "pending_review") {
    return "amber" as const;
  }

  return "red" as const;
}

function readinessTone(ready: boolean, warning = false) {
  if (ready) {
    return "green" as const;
  }

  return warning ? "amber" as const : "neutral" as const;
}

function formatSeatCap(value: number | null) {
  return value === null ? "Custom" : String(value);
}

const nextActions = [
  {
    title: "Review students",
    detail: "Check onboarding, access, progress, and support follow-up.",
    href: "/workspace/students"
  },
  {
    title: "Manage signals",
    detail: "Create direct TradeHub signals or publish approved Telegram previews.",
    href: "/workspace/signals"
  },
  {
    title: "Open practice",
    detail: "Review aggregate practice activity, assignments, cohorts, and feedback.",
    href: "/workspace/practice"
  },
  {
    title: "Check billing",
    detail: "Review package capacity, support status, and verified workspace revenue.",
    href: "/workspace/billing"
  }
];

export function WorkspaceOverview({
  workspace,
  onboarding,
  summary,
  warnings,
  onRefresh,
  loading
}: {
  workspace: Workspace;
  onboarding: OnboardingProgressDocument;
  summary: WorkspaceDashboardSummary;
  warnings: string[];
  onRefresh: () => void;
  loading: boolean;
}) {
  const paystackRail = workspace.rails.find((rail) => rail.rail === "paystack");
  const planReadyCount = workspace.tiers.filter((tier) => Boolean(tier.paystackPlanCode)).length;
  const requiredSteps: WorkspaceOnboardingStepKey[] = [
    "branding",
    "code_of_conduct",
    "pricing",
    "paystack",
    "first_course"
  ];
  const requiredDone = requiredSteps.filter((step) => onboarding.completedSteps.includes(step)).length;
  const paystackReady = Boolean(
    paystackRail?.status === "enabled" &&
      (workspace.paystackSplitCode || workspace.paystackSubaccountCode) &&
      planReadyCount > 0
  );
  const courseReady = summary.publishedCourseCount > 0;
  const signalReady = summary.publishedSignalsCount > 0;
  const studentReady = summary.activeStudentsCount > 0;
  const readinessItems = [
    {
      label: "Profile",
      value: `${requiredDone}/5`,
      ready: requiredDone >= requiredSteps.length,
      detail: "Brand, conduct, pricing, Paystack, course"
    },
    {
      label: "Students",
      value: String(summary.activeStudentsCount),
      ready: studentReady,
      detail: `${summary.trialStudentsCount} trial, ${summary.pastDueStudentsCount} needs billing attention`
    },
    {
      label: "Payments",
      value: paystackReady ? "Ready" : "Needs setup",
      ready: paystackReady,
      detail: `${planReadyCount}/${workspace.tiers.length} tiers ready`
    },
    {
      label: "Courses",
      value: `${summary.publishedCourseCount}/${summary.courseCount}`,
      ready: courseReady,
      detail: "Published and draft course count"
    },
    {
      label: "Signals",
      value: summary.publishedSignalsCount ? String(summary.publishedSignalsCount) : "Not yet",
      ready: signalReady,
      detail: "Published workspace signal count"
    },
    {
      label: "Practice",
      value: summary.averageCourseCompletionPercent ? `${summary.averageCourseCompletionPercent}%` : "Review",
      ready: studentReady,
      detail: "Aggregate learning and practice activity"
    }
  ];
  const packageStatus = summary.packageStatus;

  return (
    <div className="space-y-6" data-testid="workspace-home-summary">
      <section className="hero-panel px-6 py-7 sm:px-8 sm:py-9">
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(430px,520px)]">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="eyebrow">Workspace home</p>
              <h2 className="mt-4 max-w-4xl text-3xl font-semibold text-[color:var(--label)] sm:text-4xl">
                {workspace.name}
              </h2>
              <p className="break-safe mt-4 max-w-3xl text-sm leading-7 text-[color:var(--label2)]">
                @{workspace.handle} - {workspace.summary || "Workspace operations, students, courses, and signals."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={approvalTone(summary.ownerApprovalStatus)}>
                {summary.ownerApprovalStatus.replace(/_/g, " ")}
              </Badge>
              <Badge tone={requiredDone >= requiredSteps.length ? "green" : "amber"}>
                Setup {requiredDone}/{requiredSteps.length}
              </Badge>
              <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          <HeroCard
            label="Monthly revenue"
            value={formatCurrencyNgn(summary.monthlyRevenueNgn)}
            change={`${summary.activeStudentsCount} active, ${summary.trialStudentsCount} trial, ${summary.pastDueStudentsCount} past due`}
            badge={
              <Badge tone={summary.monthlyRevenueNgn > 0 ? "green" : "amber"} variant="outline" uppercase>
                {summary.monthlyRevenueNgn > 0 ? "Live revenue" : "Pre-revenue"}
              </Badge>
            }
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
              <StatChip label="Lifetime" value={formatCurrencyNgn(summary.lifetimeRevenueNgn)} tone="accent" />
              <StatChip label="Courses" value={String(summary.courseCount)} tone="green" />
              <StatChip label="Signals" value={String(summary.publishedSignalsCount)} tone="accent" />
              <StatChip label="Updated" value={formatDate(summary.updatedAt)} tone="neutral" />
            </div>
          </HeroCard>
        </div>
      </section>

      {warnings.length > 0 ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)]">
          <p className="eyebrow !text-[color:var(--amber)]">Needs attention</p>
          <div className="mt-3 space-y-2">
            {warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">
                {warning}
              </p>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Package" value={packageStatus.packageName} tone="accent" />
        <StatChip label="Active students" value={String(summary.activeStudentsCount)} tone="green" />
        <StatChip label="Seat cap" value={formatSeatCap(packageStatus.studentSeatCap)} tone={packageStatus.overLimit ? "red" : "neutral"} />
        <StatChip label="Seats left" value={formatSeatCap(packageStatus.remainingSeats)} tone={packageStatus.overLimit ? "red" : "green"} />
        <StatChip label="Course completion" value={`${summary.averageCourseCompletionPercent}%`} tone="accent" />
      </section>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow !text-[color:var(--label3)]">Readiness</p>
            <h3 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
              Workspace snapshot
            </h3>
          </div>
          <Badge tone={readinessItems.every((item) => item.ready) ? "green" : "amber"}>
            {readinessItems.filter((item) => item.ready).length}/{readinessItems.length} ready
          </Badge>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {readinessItems.map((item) => (
            <div
              key={item.label}
              className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_36%,transparent)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  {item.label}
                </p>
                <Badge tone={readinessTone(item.ready, item.value === "Needs setup")}>
                  {item.ready ? "Ready" : "Check"}
                </Badge>
              </div>
              <p className="break-safe mt-3 text-sm font-semibold text-[color:var(--label)]">{item.value}</p>
              <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label2)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {nextActions.map((action) => (
          <GlassCard key={action.href} className="space-y-3" interactive>
            <p className="text-sm font-semibold text-[color:var(--label)]">{action.title}</p>
            <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">{action.detail}</p>
            <Button href={action.href} variant="ghost" size="sm">
              Open
            </Button>
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
