"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestAdminApi } from "@/lib/admin/admin-api-client";
import type {
  AdminWorkspaceEnterpriseDeploymentAction,
  AdminWorkspaceEnterpriseDeploymentFilter,
  AdminWorkspaceEnterpriseDeploymentInsight,
  AdminWorkspaceEnterpriseDeploymentOpsUpdateResponse,
  AdminWorkspaceEnterpriseDeploymentOverview
} from "@/types/workspace-package";

const deploymentFilters: AdminWorkspaceEnterpriseDeploymentFilter[] = [
  "all",
  "enterprise",
  "requested",
  "scoping",
  "security_review",
  "ready_for_contract",
  "active",
  "blocked",
  "custom_review"
];

function label(value: string) {
  return value.replace(/_/g, " ");
}

function deploymentTone(insight: AdminWorkspaceEnterpriseDeploymentInsight) {
  if (insight.deploymentStatus === "blocked" || insight.slaStatus === "suspended") {
    return "red" as const;
  }

  if (
    insight.deploymentStatus === "requested" ||
    insight.deploymentStatus === "scoping" ||
    insight.deploymentStatus === "security_review" ||
    insight.deploymentStatus === "ready_for_contract" ||
    insight.deploymentStatus === "custom_review"
  ) {
    return "amber" as const;
  }

  return insight.deploymentStatus === "active" ? "green" as const : "neutral" as const;
}

function filterInsight(insight: AdminWorkspaceEnterpriseDeploymentInsight, filter: AdminWorkspaceEnterpriseDeploymentFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "enterprise") {
    return insight.packageTier === "enterprise";
  }

  return insight.deploymentStatus === filter;
}

export function WorkspaceEnterpriseReadinessPanel({
  overview,
  onUpdated,
  onMessage,
  onError
}: {
  overview: AdminWorkspaceEnterpriseDeploymentOverview;
  onUpdated?: () => Promise<void> | void;
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const [filter, setFilter] = useState<AdminWorkspaceEnterpriseDeploymentFilter>("all");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [updatingRef, setUpdatingRef] = useState<string | null>(null);
  const filteredWorkspaces = useMemo(
    () => overview.latestWorkspaces.filter((insight) => filterInsight(insight, filter)),
    [filter, overview.latestWorkspaces]
  );

  async function updateEnterpriseDeployment(
    workspaceRef: string,
    action: AdminWorkspaceEnterpriseDeploymentAction
  ) {
    setUpdatingRef(workspaceRef);
    onError?.("");

    try {
      const adminNote = noteDrafts[workspaceRef]?.trim();
      const response = await requestAdminApi<AdminWorkspaceEnterpriseDeploymentOpsUpdateResponse>(
        "/api/admin/workspace-enterprise-deployment",
        {
          method: "PATCH",
          body: JSON.stringify({
            workspaceRef,
            action,
            adminNote,
            statusReason: adminNote
          })
        }
      );

      onMessage?.(response.message);
      setNoteDrafts((current) => ({
        ...current,
        [workspaceRef]: ""
      }));
      await onUpdated?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "TradeHub could not update Enterprise deployment readiness.");
    } finally {
      setUpdatingRef(null);
    }
  }

  return (
    <GlassCard className="space-y-5 border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)]" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Enterprise deployment and SLA</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--label)]">
            Contract-scoped readiness
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Super Admin view for Enterprise deployment mode, SLA posture, backup/restore responsibility,
            and rollback readiness. These actions record metadata only; TradeHub does not provision cloud
            infrastructure, change DNS, call providers, automate payments, or enable live execution here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={overview.blockedDeployments > 0 ? "red" : "green"}>
            {overview.blockedDeployments} blocked
          </Badge>
          <Badge tone={overview.enterpriseWorkspaces > 0 ? "amber" : "neutral"}>
            {overview.enterpriseWorkspaces} Enterprise
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatChip label="Workspaces" value={String(overview.totalWorkspaces)} tone="accent" />
        <StatChip label="Enterprise" value={String(overview.enterpriseWorkspaces)} tone="amber" />
        <StatChip label="Requested" value={String(overview.requestedDeployments)} tone="amber" />
        <StatChip label="Scoping" value={String(overview.scopingDeployments)} tone="amber" />
        <StatChip label="Security" value={String(overview.securityReviewDeployments)} tone="amber" />
        <StatChip label="Contract ready" value={String(overview.readyForContractDeployments)} tone="green" />
        <StatChip label="Active" value={String(overview.activeDeployments)} tone="green" />
        <StatChip label="SLA ready" value={String(overview.enterpriseSlaReady)} tone="green" />
      </div>

      <div className="flex flex-wrap gap-2">
        {deploymentFilters.map((entry) => (
          <Button
            key={entry}
            type="button"
            size="sm"
            variant={filter === entry ? "primary" : "secondary"}
            onClick={() => setFilter(entry)}
          >
            {entry === "all" ? "All" : label(entry)}
          </Button>
        ))}
      </div>

      {filteredWorkspaces.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredWorkspaces.map((insight) => {
            const busy = updatingRef === insight.workspaceRef;

            return (
              <div
                key={insight.workspaceRef}
                className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_36%,transparent)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                      {insight.workspaceName}
                    </p>
                    <p className="break-safe mt-1 text-xs text-[color:var(--label3)]">{insight.workspaceRef}</p>
                  </div>
                  <Badge tone={deploymentTone(insight)}>
                    {label(insight.deploymentStatus)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
                  <StatChip label="Package" value={insight.packageName} tone="accent" />
                  <StatChip label="Mode" value={label(insight.deploymentMode)} tone="neutral" />
                  <StatChip label="SLA" value={label(insight.slaStatus)} tone={deploymentTone(insight)} />
                  <StatChip label="Backup" value={label(insight.backupRestoreStatus)} tone={deploymentTone(insight)} />
                  <StatChip label="Residency" value={label(insight.dataResidencyStatus)} tone="neutral" />
                </div>

                <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                  {insight.packageAvailabilityMessage}
                </p>
                <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label2)]">
                  {insight.contractScopePrompt ?? insight.supportWindowLabel}
                </p>
                {insight.adminStatusReason ? (
                  <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label2)]">
                    Reason: {insight.adminStatusReason}
                  </p>
                ) : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {insight.deploymentChecklist.slice(0, 2).map((entry) => (
                    <p key={entry} className="break-safe rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                      {entry}
                    </p>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Bounded Enterprise note
                  </label>
                  <textarea
                    value={noteDrafts[insight.workspaceRef] ?? ""}
                    onChange={(event) =>
                      setNoteDrafts((current) => ({
                        ...current,
                        [insight.workspaceRef]: event.target.value.slice(0, 500)
                      }))
                    }
                    rows={2}
                    maxLength={500}
                    className="min-h-[72px] w-full resize-y rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_76%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] outline-none transition focus:border-[color:var(--accent)]"
                    placeholder="Internal metadata only. No credentials, infrastructure refs, payment refs, or student private data."
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateEnterpriseDeployment(insight.workspaceRef, "mark_requested")}>
                      Requested
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateEnterpriseDeployment(insight.workspaceRef, "mark_scoping")}>
                      Scoping
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateEnterpriseDeployment(insight.workspaceRef, "mark_security_review")}>
                      Security
                    </Button>
                    <Button type="button" size="sm" variant="primary" disabled={busy} onClick={() => updateEnterpriseDeployment(insight.workspaceRef, "mark_ready_for_contract")}>
                      Contract ready
                    </Button>
                    <Button type="button" size="sm" variant="primary" disabled={busy} onClick={() => updateEnterpriseDeployment(insight.workspaceRef, "mark_active")}>
                      Active
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateEnterpriseDeployment(insight.workspaceRef, "mark_custom_review")}>
                      Review
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateEnterpriseDeployment(insight.workspaceRef, "mark_blocked")}>
                      Block
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[18px] border border-dashed border-[color:var(--line)] p-5">
          <p className="text-sm text-[color:var(--label2)]">
            No Enterprise deployment records match this filter in the bounded admin window.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
