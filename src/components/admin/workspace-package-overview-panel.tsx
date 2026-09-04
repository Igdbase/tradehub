"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestAdminApi } from "@/lib/admin/admin-api-client";
import type {
  AdminWorkspacePackageInsight,
  AdminWorkspacePackageLicenceAction,
  AdminWorkspacePackageLicenceFilter,
  AdminWorkspacePackageLicenceOpsUpdateResponse,
  AdminWorkspacePackageOverview
} from "@/types/workspace-package";

const licenceFilters: AdminWorkspacePackageLicenceFilter[] = [
  "all",
  "active",
  "due_soon",
  "overdue",
  "suspended",
  "custom_review"
];

function packageTone(insight: AdminWorkspacePackageInsight) {
  if (
    insight.overLimit ||
    insight.licenseStatus === "suspended" ||
    insight.licenseStatus === "expired" ||
    insight.supportStatus === "suspended" ||
    insight.supportStatus === "support_limited"
  ) {
    return "red" as const;
  }

  if (
    insight.licenseStatus === "pending" ||
    insight.licenseStatus === "custom_review" ||
    insight.studentSeatCap === null ||
    insight.maintenanceRenewalStatus === "due_soon" ||
    insight.maintenanceRenewalStatus === "custom_review" ||
    insight.supportStatus === "maintenance_due" ||
    insight.supportStatus === "custom_review"
  ) {
    return "amber" as const;
  }

  return "green" as const;
}

function formatSeats(value: number | null) {
  return value === null ? "Custom" : String(value);
}

function formatDate(value?: string) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function filterInsight(insight: AdminWorkspacePackageInsight, filter: AdminWorkspacePackageLicenceFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "active") {
    return insight.licenseStatus === "active" && insight.supportStatus !== "support_limited" && !insight.overLimit;
  }

  if (filter === "due_soon") {
    return insight.maintenanceRenewalStatus === "due_soon" || insight.supportStatus === "maintenance_due";
  }

  if (filter === "overdue") {
    return insight.maintenanceRenewalStatus === "overdue" || insight.supportStatus === "support_limited";
  }

  if (filter === "suspended") {
    return insight.licenseStatus === "suspended" || insight.supportStatus === "suspended";
  }

  return (
    insight.licenseStatus === "custom_review" ||
    insight.maintenanceRenewalStatus === "custom_review" ||
    insight.supportStatus === "custom_review" ||
    insight.licenceHealth === "custom_review"
  );
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function WorkspacePackageOverviewPanel({
  overview,
  onUpdated,
  onMessage,
  onError
}: {
  overview: AdminWorkspacePackageOverview;
  onUpdated?: () => Promise<void> | void;
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const [filter, setFilter] = useState<AdminWorkspacePackageLicenceFilter>("all");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [updatingRef, setUpdatingRef] = useState<string | null>(null);
  const filteredWorkspaces = useMemo(
    () => overview.latestWorkspaces.filter((insight) => filterInsight(insight, filter)),
    [filter, overview.latestWorkspaces]
  );

  async function updateLicence(workspaceRef: string, action: AdminWorkspacePackageLicenceAction) {
    setUpdatingRef(workspaceRef);
    onError?.("");

    try {
      const adminNote = noteDrafts[workspaceRef]?.trim();
      const response = await requestAdminApi<AdminWorkspacePackageLicenceOpsUpdateResponse>(
        "/api/admin/workspace-package-licences",
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
      onError?.(error instanceof Error ? error.message : "TradeHub could not update that licence.");
    } finally {
      setUpdatingRef(null);
    }
  }

  return (
    <GlassCard className="space-y-5 border-[color:color-mix(in_srgb,var(--accent)_26%,transparent)]" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Package licences</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--label)]">
            Workspace package, support, and maintenance posture
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Super Admin summary for private quote packages only. Launch supports 50 active students,
            Pro supports 500, Enterprise is custom-reviewed, and Trade Copier remains a separate optional add-on.
            Licence actions here record support status only; they do not collect payment or trigger money movement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={overview.overLimitWorkspaces > 0 ? "red" : "green"}>
            {overview.overLimitWorkspaces} over limit
          </Badge>
          <Badge tone={overview.maintenanceOverdue > 0 ? "red" : "amber"}>
            {overview.maintenanceOverdue} overdue
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatChip label="Workspaces" value={String(overview.totalWorkspaces)} tone="accent" />
        <StatChip label="Launch" value={String(overview.launchWorkspaces)} tone="neutral" />
        <StatChip label="Pro" value={String(overview.proWorkspaces)} tone="green" />
        <StatChip label="Enterprise" value={String(overview.enterpriseWorkspaces)} tone="amber" />
        <StatChip label="Due soon" value={String(overview.maintenanceDueSoon)} tone="amber" />
        <StatChip label="Limited" value={String(overview.supportLimited + overview.supportSuspended)} tone="red" />
        <StatChip label="Custom review" value={String(overview.customReviewNeeded)} tone="amber" />
      </div>

      <div className="flex flex-wrap gap-2">
        {licenceFilters.map((entry) => (
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
                  <Badge tone={packageTone(insight)}>
                    {insight.overLimit ? "over limit" : label(insight.licenceHealth)}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
                  <StatChip label="Package" value={insight.packageName} tone="accent" />
                  <StatChip label="Active" value={String(insight.activeStudentCount)} tone="green" />
                  <StatChip label="Cap" value={formatSeats(insight.studentSeatCap)} tone={packageTone(insight)} />
                  <StatChip label="Left" value={formatSeats(insight.remainingSeats)} tone={packageTone(insight)} />
                  <StatChip label="Term" value={label(insight.licenseTermType)} tone="neutral" />
                  <StatChip label="Support" value={label(insight.supportStatus)} tone={packageTone(insight)} />
                  <StatChip label="Renewal" value={label(insight.maintenanceRenewalStatus)} tone={packageTone(insight)} />
                  <StatChip label="Due" value={formatDate(insight.maintenanceRenewalDueDate)} tone="neutral" />
                </div>
                {insight.adminStatusReason ? (
                  <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                    Reason: {insight.adminStatusReason}
                  </p>
                ) : null}
                <div className="mt-4 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Bounded licence note
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
                    placeholder="Internal Super Admin note. No payment refs, provider payloads, or student private data."
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => updateLicence(insight.workspaceRef, "mark_maintenance_active")}
                    >
                      Active
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => updateLicence(insight.workspaceRef, "mark_maintenance_waived")}
                    >
                      Waive
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => updateLicence(insight.workspaceRef, "mark_custom_review")}
                    >
                      Review
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => updateLicence(insight.workspaceRef, "mark_suspended")}
                    >
                      Suspend
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[18px] border border-dashed border-[color:var(--line)] p-4">
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            No workspace package records match this bounded licence ops filter.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
