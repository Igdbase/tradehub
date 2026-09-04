"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { HeroCard } from "@/components/ui/hero-card";
import { StatChip } from "@/components/ui/stat-chip";
import { WorkspaceEnterpriseIntegrationRequestsSection } from "@/components/workspace/workspace-enterprise-integration-requests-section";
import { formatCurrencyNgn, formatDate } from "@/components/workspace/workspace-formatters";
import type {
  WorkspaceDashboardSummary
} from "@/types/workspace-dashboard";
import type { OnboardingProgressDocument, WorkspaceOnboardingStepKey } from "@/types/onboarding";
import type { Workspace } from "@/types/workspace";

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

function packageTone(status: WorkspaceDashboardSummary["packageStatus"]) {
  if (
    status.overLimit ||
    status.licenseStatus === "suspended" ||
    status.licenseStatus === "expired" ||
    status.supportStatus === "suspended" ||
    status.supportStatus === "support_limited"
  ) {
    return "red" as const;
  }

  if (
    status.licenseStatus === "pending" ||
    status.licenseStatus === "custom_review" ||
    status.enterpriseCustomCapacity ||
    status.maintenanceState === "due_soon" ||
    status.maintenanceRenewalStatus === "custom_review" ||
    status.supportStatus === "maintenance_due" ||
    status.supportStatus === "custom_review"
  ) {
    return "amber" as const;
  }

  return "green" as const;
}

function brandingTone(status: WorkspaceDashboardSummary["brandingReadiness"]) {
  if (status.customDomainStatus === "blocked" || status.dnsChecklistStatus === "failed") {
    return "red" as const;
  }

  if (
    status.customDomainStatus === "requested" ||
    status.customDomainStatus === "dns_pending" ||
    status.customDomainStatus === "verifying" ||
    status.customDomainStatus === "custom_review" ||
    status.dnsChecklistStatus === "pending" ||
    status.dnsChecklistStatus === "custom_review"
  ) {
    return "amber" as const;
  }

  return status.customDomainStatus === "active" ? "green" as const : "neutral" as const;
}

function enterpriseTone(status: WorkspaceDashboardSummary["enterpriseReadiness"]) {
  if (status.deploymentStatus === "blocked" || status.slaStatus === "suspended") {
    return "red" as const;
  }

  if (
    status.deploymentStatus === "requested" ||
    status.deploymentStatus === "scoping" ||
    status.deploymentStatus === "security_review" ||
    status.deploymentStatus === "ready_for_contract" ||
    status.deploymentStatus === "custom_review"
  ) {
    return "amber" as const;
  }

  return status.deploymentStatus === "active" ? "green" as const : "neutral" as const;
}

function formatSeatCap(value: number | null) {
  return value === null ? "Custom" : String(value);
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

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
  const solanaRail = workspace.rails.find((rail) => rail.rail === "solana");
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
  const signalReady = onboarding.completedSteps.includes("telegram_bot") || summary.publishedSignalsCount > 0;
  const autoCopyReady = summary.activeStudentsCount > 0 && summary.publishedSignalsCount > 0;
  const practiceCourseMvpReady = courseReady && summary.activeStudentsCount > 0;
  const packageStatus = summary.packageStatus;
  const brandingReadiness = summary.brandingReadiness;
  const enterpriseReadiness = summary.enterpriseReadiness;
  const readinessItems = [
    {
      label: "Profile",
      value: `${requiredDone}/5`,
      ready: requiredDone >= requiredSteps.length,
      detail: "Brand, conduct, pricing, Paystack, course"
    },
    {
      label: "Payment/access",
      value: paystackReady ? "Ready" : "Needs setup",
      ready: paystackReady,
      detail: `${planReadyCount}/${workspace.tiers.length} tiers plan-coded`
    },
    {
      label: "Courses",
      value: `${summary.publishedCourseCount}/${summary.courseCount}`,
      ready: courseReady,
      detail: "Published course count"
    },
    {
      label: "Signals",
      value: summary.publishedSignalsCount ? String(summary.publishedSignalsCount) : "Not yet",
      ready: summary.publishedSignalsCount > 0,
      detail: signalReady ? "Signal surface prepared" : "Publish a first signal when ready"
    },
    {
      label: "AutoCopy",
      value: autoCopyReady ? "Reviewable" : "Gated",
      ready: autoCopyReady,
      detail: "Uses dedicated safe ops panel"
    },
    {
      label: "Practice/course MVP",
      value: practiceCourseMvpReady ? "Ready" : "Needs students",
      ready: practiceCourseMvpReady,
      detail: "Source-QA frozen surfaces"
    }
  ];

  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-7 sm:px-8 sm:py-9">
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(430px,520px)]">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="eyebrow">Influencer control room</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold text-[color:var(--label)] sm:text-5xl">
                {workspace.name}
              </h1>
              <p className="break-safe mt-4 max-w-3xl text-sm leading-7 text-[color:var(--label2)]">
                @{workspace.handle} - {workspace.summary || "Workspace operations, students, courses, and signals."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={approvalTone(summary.ownerApprovalStatus)}>
                {summary.ownerApprovalStatus.replace(/_/g, " ")}
              </Badge>
              <Badge tone={requiredDone >= 5 ? "green" : "amber"}>
                Onboarding {requiredDone}/5 required
              </Badge>
              <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
              <Button href="/workspace/onboarding" variant="ghost" size="sm">
                Setup wizard
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
          <p className="eyebrow !text-[color:var(--amber)]">Summary state</p>
          <div className="mt-3 space-y-2">
            {warnings.map((warning) => (
              <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">
                {warning}
              </p>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <StatChip label="Active students" value={String(summary.activeStudentsCount)} tone="green" />
        <StatChip label="Seat cap" value={formatSeatCap(packageStatus.studentSeatCap)} tone={packageTone(packageStatus)} />
        <StatChip label="Seats left" value={formatSeatCap(packageStatus.remainingSeats)} tone={packageTone(packageStatus)} />
        <StatChip label="Trial students" value={String(summary.trialStudentsCount)} tone="accent" />
        <StatChip label="Past due" value={String(summary.pastDueStudentsCount)} tone="amber" />
        <StatChip
          label="Course completion"
          value={`${summary.averageCourseCompletionPercent}%`}
          tone="accent"
        />
      </section>

      <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--accent)_24%,transparent)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-3xl">
            <p className="eyebrow !text-[color:var(--label3)]">Workspace licence</p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
              {packageStatus.packageName}
            </h2>
            <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
              {packageStatus.safeSummary} Pricing is handled by private quote/contact sales,
              support terms are reviewed by TradeHub, and Trade Copier remains a separate optional add-on.
            </p>
          </div>
          <Badge tone={packageTone(packageStatus)}>
            {packageStatus.overLimit ? "Over limit" : label(packageStatus.licenceHealth)}
          </Badge>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          <StatChip label="Active" value={String(packageStatus.activeStudentCount)} tone="green" />
          <StatChip label="Cap" value={formatSeatCap(packageStatus.studentSeatCap)} tone={packageTone(packageStatus)} />
          <StatChip label="Remaining" value={formatSeatCap(packageStatus.remainingSeats)} tone={packageTone(packageStatus)} />
          <StatChip label="Term" value={label(packageStatus.licenseTermType)} tone="neutral" />
          <StatChip label="Support" value={label(packageStatus.supportStatus)} tone={packageTone(packageStatus)} />
          <StatChip label="Renewal" value={label(packageStatus.maintenanceRenewalStatus)} tone={packageTone(packageStatus)} />
          <StatChip
            label="Due"
            value={packageStatus.maintenanceRenewalDueDate ? formatDate(packageStatus.maintenanceRenewalDueDate) : "Not set"}
            tone="neutral"
          />
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_48%,transparent)] p-4">
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            {packageStatus.overLimit
              ? packageStatus.upgradePrompt
              : `${packageStatus.supportPrompt} ${packageStatus.maintenanceSummary} ${packageStatus.tradeCopierAddOnLabel}`}
          </p>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--accent)_18%,transparent)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-3xl">
            <p className="eyebrow !text-[color:var(--label3)]">Workspace brand</p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
              {brandingReadiness.displayName}
            </h2>
            <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
              {brandingReadiness.packageAvailabilityMessage} Logo values are HTTPS metadata only,
              custom domains are admin-reviewed, and pricing remains private quote/contact sales.
            </p>
          </div>
          <Badge tone={brandingTone(brandingReadiness)}>
            {label(brandingReadiness.brandingMode)}
          </Badge>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          <StatChip label="Mode" value={label(brandingReadiness.brandingMode)} tone="accent" />
          <StatChip label="Student view" value={label(brandingReadiness.studentFacingBrandVisibilityStatus)} tone="green" />
          <StatChip
            label="Logo"
            value={brandingReadiness.logoUrl ? "HTTPS metadata" : "Not set"}
            tone={brandingReadiness.logoUrl ? "green" : "neutral"}
          />
          <StatChip label="Domain" value={label(brandingReadiness.customDomainStatus)} tone={brandingTone(brandingReadiness)} />
          <StatChip label="DNS" value={label(brandingReadiness.dnsChecklistStatus)} tone={brandingTone(brandingReadiness)} />
          <StatChip
            label="Hostname"
            value={brandingReadiness.requestedDomainHostname ?? "Not requested"}
            tone={brandingTone(brandingReadiness)}
          />
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_48%,transparent)] p-4">
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            {brandingReadiness.contactPrompt}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {brandingReadiness.dnsChecklistSummary.slice(0, 3).map((entry) => (
              <p key={entry} className="break-safe rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                {entry}
              </p>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--accent)_18%,transparent)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-3xl">
            <p className="eyebrow !text-[color:var(--label3)]">Enterprise readiness</p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
              Deployment and SLA scope
            </h2>
            <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
              {enterpriseReadiness.packageAvailabilityMessage} Enterprise deployment, data residency,
              SLA, backup/restore, and rollback terms are contract-scoped. This view does not provision
              cloud infrastructure, change DNS, automate payments, or enable live execution.
            </p>
          </div>
          <Badge tone={enterpriseTone(enterpriseReadiness)}>
            {label(enterpriseReadiness.deploymentStatus)}
          </Badge>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          <StatChip label="Mode" value={label(enterpriseReadiness.deploymentMode)} tone="accent" />
          <StatChip label="SLA" value={label(enterpriseReadiness.slaStatus)} tone={enterpriseTone(enterpriseReadiness)} />
          <StatChip label="Backup" value={label(enterpriseReadiness.backupRestoreStatus)} tone={enterpriseTone(enterpriseReadiness)} />
          <StatChip label="Residency" value={label(enterpriseReadiness.dataResidencyStatus)} tone="neutral" />
          <StatChip
            label="Support"
            value={enterpriseReadiness.slaStatus === "standard_support" ? "Standard" : "Contract"}
            tone={enterpriseTone(enterpriseReadiness)}
          />
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_48%,transparent)] p-4">
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            {enterpriseReadiness.contractScopePrompt}
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {enterpriseReadiness.deploymentChecklist.slice(0, 3).map((entry) => (
              <p key={entry} className="break-safe rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                {entry}
              </p>
            ))}
          </div>
        </div>
      </GlassCard>

      <WorkspaceEnterpriseIntegrationRequestsSection packageStatus={packageStatus} />

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-3xl">
            <p className="eyebrow !text-[color:var(--label3)]">Stage 20A ops audit</p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
              Workspace readiness summary
            </h2>
            <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
              These are operational hints from existing dashboard data only. Private practice trades,
              course notes, journal entries, payment payloads, and credential records stay out of this view.
            </p>
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
                <Badge tone={readinessTone(item.ready, item.value === "Needs setup" || item.value === "Gated")}>
                  {item.ready ? "Ready" : "Check"}
                </Badge>
              </div>
              <p className="break-safe mt-3 text-sm font-semibold text-[color:var(--label)]">{item.value}</p>
              <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label2)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <GlassCard className="space-y-3">
          <p className="eyebrow !text-[color:var(--label3)]">Paystack readiness</p>
          <div className="flex items-center justify-between gap-3">
            <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
              {paystackRail?.label ?? "Paystack local checkout"}
            </p>
            <Badge tone={paystackRail?.status === "enabled" ? "green" : "amber"}>
              {paystackRail?.status?.replace(/_/g, " ") ?? "pending"}
            </Badge>
          </div>
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            {paystackRail?.settlementNote ?? "Owner will verify subaccount and split setup before checkout is live."}
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">
            {planReadyCount}/{workspace.tiers.length} tier plan codes ready
          </p>
        </GlassCard>
        <GlassCard className="space-y-3">
          <p className="eyebrow !text-[color:var(--label3)]">Optional Solana rail</p>
          <div className="flex items-center justify-between gap-3">
            <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
              {solanaRail?.label ?? "Solana Pay / USDC"}
            </p>
            <Badge tone={solanaRail?.status === "enabled" ? "green" : "neutral"}>
              {solanaRail?.status?.replace(/_/g, " ") ?? "disabled"}
            </Badge>
          </div>
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            {solanaRail?.settlementNote ?? "No crypto checkout is enabled until owner verification."}
          </p>
        </GlassCard>
        <GlassCard className="space-y-3">
          <p className="eyebrow !text-[color:var(--label3)]">Latest signal</p>
          <p className="text-sm font-semibold text-[color:var(--label)]">
            {summary.lastSignalAt ? formatDate(summary.lastSignalAt) : "No signal yet"}
          </p>
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            Draft signals stay internal until explicitly published. This stage does not broadcast
            to Telegram or execute trades.
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
