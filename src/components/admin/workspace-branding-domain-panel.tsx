"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestAdminApi } from "@/lib/admin/admin-api-client";
import type {
  AdminWorkspaceBrandingDomainAction,
  AdminWorkspaceBrandingDomainFilter,
  AdminWorkspaceBrandingDomainOpsUpdateResponse,
  AdminWorkspaceBrandingInsight,
  AdminWorkspaceBrandingOverview
} from "@/types/workspace-package";

const domainFilters: AdminWorkspaceBrandingDomainFilter[] = [
  "all",
  "requested",
  "dns_pending",
  "verifying",
  "active",
  "blocked",
  "custom_review"
];

function label(value: string) {
  return value.replace(/_/g, " ");
}

function brandingTone(insight: AdminWorkspaceBrandingInsight) {
  if (insight.customDomainStatus === "blocked" || insight.dnsChecklistStatus === "failed") {
    return "red" as const;
  }

  if (
    insight.customDomainStatus === "custom_review" ||
    insight.customDomainStatus === "requested" ||
    insight.customDomainStatus === "dns_pending" ||
    insight.customDomainStatus === "verifying" ||
    insight.dnsChecklistStatus === "pending" ||
    insight.dnsChecklistStatus === "custom_review"
  ) {
    return "amber" as const;
  }

  return insight.customDomainStatus === "active" ? "green" as const : "neutral" as const;
}

function filterInsight(insight: AdminWorkspaceBrandingInsight, filter: AdminWorkspaceBrandingDomainFilter) {
  if (filter === "all") {
    return true;
  }

  return insight.customDomainStatus === filter;
}

function formatHostname(value?: string) {
  return value ?? "Not requested";
}

export function WorkspaceBrandingDomainPanel({
  overview,
  onUpdated,
  onMessage,
  onError
}: {
  overview: AdminWorkspaceBrandingOverview;
  onUpdated?: () => Promise<void> | void;
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const [filter, setFilter] = useState<AdminWorkspaceBrandingDomainFilter>("all");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [domainDrafts, setDomainDrafts] = useState<Record<string, string>>({});
  const [updatingRef, setUpdatingRef] = useState<string | null>(null);
  const filteredWorkspaces = useMemo(
    () => overview.latestWorkspaces.filter((insight) => filterInsight(insight, filter)),
    [filter, overview.latestWorkspaces]
  );

  async function updateBrandingDomain(workspaceRef: string, action: AdminWorkspaceBrandingDomainAction) {
    setUpdatingRef(workspaceRef);
    onError?.("");

    try {
      const adminNote = noteDrafts[workspaceRef]?.trim();
      const requestedDomainHostname = domainDrafts[workspaceRef]?.trim();
      const response = await requestAdminApi<AdminWorkspaceBrandingDomainOpsUpdateResponse>(
        "/api/admin/workspace-branding-domain",
        {
          method: "PATCH",
          body: JSON.stringify({
            workspaceRef,
            action,
            adminNote,
            statusReason: adminNote,
            requestedDomainHostname
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
      onError?.(error instanceof Error ? error.message : "TradeHub could not update branding/domain readiness.");
    } finally {
      setUpdatingRef(null);
    }
  }

  return (
    <GlassCard className="space-y-5 border-[color:color-mix(in_srgb,var(--accent)_22%,transparent)]" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Branding and domains</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--label)]">
            Workspace brand readiness
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Super Admin view for branding mode, logo URL metadata, and custom domain readiness. This records
            review status only; TradeHub does not upload logos, change DNS, provision SSL, or call hosting providers here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={overview.blockedDomains > 0 ? "red" : "green"}>
            {overview.blockedDomains} blocked
          </Badge>
          <Badge tone={overview.customReviewDomains > 0 ? "amber" : "neutral"}>
            {overview.customReviewDomains} custom review
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatChip label="Workspaces" value={String(overview.totalWorkspaces)} tone="accent" />
        <StatChip label="TradeHub" value={String(overview.tradehubBranded)} tone="neutral" />
        <StatChip label="Co-brand" value={String(overview.coBranded)} tone="green" />
        <StatChip label="White-label" value={String(overview.whiteLabelReady)} tone="amber" />
        <StatChip label="Requested" value={String(overview.requestedDomains)} tone="amber" />
        <StatChip label="DNS pending" value={String(overview.dnsPendingDomains)} tone="amber" />
        <StatChip label="Active domains" value={String(overview.activeDomains)} tone="green" />
      </div>

      <div className="flex flex-wrap gap-2">
        {domainFilters.map((entry) => (
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
                  <Badge tone={brandingTone(insight)}>
                    {label(insight.customDomainStatus)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
                  <StatChip label="Package" value={insight.packageName} tone="accent" />
                  <StatChip label="Mode" value={label(insight.brandingMode)} tone="neutral" />
                  <StatChip label="Student view" value={label(insight.studentFacingBrandVisibilityStatus)} tone="green" />
                  <StatChip label="Domain" value={formatHostname(insight.requestedDomainHostname)} tone={brandingTone(insight)} />
                  <StatChip label="DNS" value={label(insight.dnsChecklistStatus)} tone={brandingTone(insight)} />
                  <StatChip label="Display" value={insight.displayName} tone="neutral" />
                </div>

                <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                  {insight.packageAvailabilityMessage}
                </p>
                {insight.adminStatusReason ? (
                  <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label2)]">
                    Reason: {insight.adminStatusReason}
                  </p>
                ) : null}

                <div className="mt-4 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Requested domain hostname
                  </label>
                  <input
                    value={domainDrafts[insight.workspaceRef] ?? insight.requestedDomainHostname ?? ""}
                    onChange={(event) =>
                      setDomainDrafts((current) => ({
                        ...current,
                        [insight.workspaceRef]: event.target.value.slice(0, 120)
                      }))
                    }
                    maxLength={120}
                    className="w-full rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_76%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] outline-none transition focus:border-[color:var(--accent)]"
                    placeholder="academy.example.com"
                  />
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Bounded review note
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
                    placeholder="Internal review note. No DNS secrets, provider refs, credentials, or student private data."
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateBrandingDomain(insight.workspaceRef, "mark_requested")}>
                      Requested
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateBrandingDomain(insight.workspaceRef, "mark_dns_pending")}>
                      DNS pending
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateBrandingDomain(insight.workspaceRef, "mark_verifying")}>
                      Verifying
                    </Button>
                    <Button type="button" size="sm" variant="primary" disabled={busy} onClick={() => updateBrandingDomain(insight.workspaceRef, "mark_active")}>
                      Active
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateBrandingDomain(insight.workspaceRef, "mark_custom_review")}>
                      Review
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => updateBrandingDomain(insight.workspaceRef, "mark_blocked")}>
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
            No workspace branding/domain records match this filter in the bounded admin window.
          </p>
        </div>
      )}
    </GlassCard>
  );
}

