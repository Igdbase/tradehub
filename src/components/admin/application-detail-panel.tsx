"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  applicationSourceLabels,
  applicationStatusLabels,
  getStatusTone,
  getWorkspaceIdSuggestion,
  setupFeeStatusLabels,
  vettingOutcomeLabels,
  workspaceCreationLabels
} from "@/lib/admin/admin-labels";
import { getProductOfferingLabels } from "@/lib/application-validation";
import type { AdminApplicationPatch } from "@/types/admin-api";
import type { SetupFeeStatus, WorkspaceApplication } from "@/types/tradehub";

type ApplicationDetailPanelProps = {
  application: WorkspaceApplication | null;
  saving: boolean;
  onPatch: (applicationId: string, patch: AdminApplicationPatch) => Promise<void>;
  onCreateWorkspaceShell: (application: WorkspaceApplication, workspaceId: string) => Promise<void>;
};

const fieldClasses =
  "focus-ring min-h-11 rounded-[16px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-3 py-2 text-sm text-[color:var(--label)]";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm leading-6 text-[color:var(--label2)]">{value}</p>
    </div>
  );
}

export function ApplicationDetailPanel({
  application,
  saving,
  onPatch,
  onCreateWorkspaceShell
}: ApplicationDetailPanelProps) {
  const [vettingNotes, setVettingNotes] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [setupFeeStatus, setSetupFeeStatus] = useState<SetupFeeStatus>("not_required");
  const [workspaceCreationStatus, setWorkspaceCreationStatus] =
    useState<WorkspaceApplication["workspaceCreationStatus"]>("not_started");

  useEffect(() => {
    if (!application) {
      return;
    }

    setVettingNotes(application.vettingNotes);
    setWorkspaceId(application.workspaceId ?? getWorkspaceIdSuggestion(application));
    setSetupFeeStatus(application.setupFeeStatus);
    setWorkspaceCreationStatus(application.workspaceCreationStatus);
  }, [application]);

  if (!application) {
    return (
      <GlassCard className="space-y-4">
        <p className="eyebrow !text-[color:var(--label3)]">Application detail</p>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          Select an application to review identity, audience, monetization, and onboarding state.
        </p>
      </GlassCard>
    );
  }

  async function savePatch(patch: AdminApplicationPatch) {
    await onPatch(application!.applicationId, patch);
  }

  const offerings = getProductOfferingLabels(application.productOfferings ?? []);

  return (
    <GlassCard className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow !text-[color:var(--label3)]">Application detail</p>
          <h2 className="mt-2 break-words text-2xl font-semibold text-[color:var(--label)]">{application.name}</h2>
          <p className="mt-1 break-all text-sm text-[color:var(--label2)]">
            {application.email} - {application.handleOrChannel}
          </p>
        </div>
        <Badge tone={getStatusTone(application.status)}>
          {applicationStatusLabels[application.status]}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailRow label="Platform" value={application.primaryPlatform ?? "Not shared"} />
        <DetailRow label="Audience" value={application.audienceSize.toLocaleString("en-US")} />
        <DetailRow label="Market" value={application.market} />
        <DetailRow label="Student account mix" value={application.studentAccountMix} />
        <DetailRow label="Offerings" value={offerings.length > 0 ? offerings.join(", ") : "Not shared"} />
        <DetailRow label="Source" value={applicationSourceLabels[application.source]} />
        <DetailRow label="Vetting outcome" value={vettingOutcomeLabels[application.vettingOutcome]} />
        <DetailRow label="Setup fee" value={setupFeeStatusLabels[application.setupFeeStatus]} />
        <DetailRow label="Workspace state" value={workspaceCreationLabels[application.workspaceCreationStatus]} />
        <DetailRow label="Workspace ID" value={application.workspaceId ?? workspaceId} />
        <DetailRow label="Solana interest" value={application.solanaPayInterest ? "Interested" : "Paystack first"} />
      </div>

      <GlassCard className="space-y-3" padding="sm">
        <p className="text-sm font-semibold text-[color:var(--label)]">Influencer handoff</p>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          After approval, create the workspace shell here. Then create the influencer Firebase
          Email/Password user and run{" "}
          <span className="font-semibold text-[color:var(--label)]">
            npm run firebase:bootstrap-influencer
          </span>{" "}
          with the influencer email and workspace ID.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => onCreateWorkspaceShell(application, workspaceId || getWorkspaceIdSuggestion(application))}
            variant="primary"
            disabled={saving || application.status === "rejected" || application.workspaceCreationStatus === "created"}
          >
            {application.workspaceCreationStatus === "created" ? "Workspace shell created" : "Create workspace shell"}
          </Button>
          <Button href="/workspace/onboarding" variant="secondary">
            Test onboarding route
          </Button>
        </div>
      </GlassCard>

      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
          Monetization and notes
        </p>
        <p className="rounded-[18px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)] break-words whitespace-pre-wrap">
          {application.monetizationMethod}
        </p>
        <p className="rounded-[18px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)] break-words whitespace-pre-wrap">
          {application.notes}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button onClick={() => savePatch({ status: "vetting" })} variant="secondary" disabled={saving}>
          Move to vetting
        </Button>
        <Button
          onClick={() => savePatch({ status: "approved", vettingOutcome: "approved" })}
          variant="secondary"
          disabled={saving}
        >
          Approve
        </Button>
        <Button
          onClick={() =>
            savePatch({
              status: "rejected",
              vettingOutcome: "rejected",
              vettingNotes: vettingNotes || "Rejected during owner vetting."
            })
          }
          variant="ghost"
          disabled={saving}
        >
          Reject
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Vetting notes</span>
          <textarea
            value={vettingNotes}
            onChange={(event) => setVettingNotes(event.target.value)}
            className={`${fieldClasses} min-h-[9rem] w-full`}
          />
        </label>

        <div className="space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Setup fee status</span>
            <select
              value={setupFeeStatus}
              onChange={(event) => setSetupFeeStatus(event.target.value as SetupFeeStatus)}
              className={`${fieldClasses} w-full`}
            >
              {Object.entries(setupFeeStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Workspace ID</span>
            <input
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              className={`${fieldClasses} w-full`}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Workspace creation</span>
            <select
              value={workspaceCreationStatus}
              onChange={(event) =>
                setWorkspaceCreationStatus(event.target.value as WorkspaceApplication["workspaceCreationStatus"])
              }
              className={`${fieldClasses} w-full`}
            >
              {Object.entries(workspaceCreationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Button
          onClick={() => savePatch({ vettingNotes })}
          variant="secondary"
          disabled={saving}
        >
          Save notes
        </Button>
        <Button
          onClick={() =>
            savePatch({
              setupFeeStatus,
              workspaceCreationStatus,
              workspaceId: workspaceId || undefined
            })
          }
          variant="secondary"
          disabled={saving}
        >
          Save ops state
        </Button>
        <Button
          onClick={() =>
            savePatch({
              status: "approved",
              workspaceCreationStatus: "queued",
              workspaceId: workspaceId || getWorkspaceIdSuggestion(application)
            })
          }
          variant="secondary"
          disabled={saving}
        >
          Queue workspace
        </Button>
        <Button
          onClick={() =>
            savePatch({
              status: "workspace_created",
              workspaceCreationStatus: "created",
              workspaceId: workspaceId || getWorkspaceIdSuggestion(application)
            })
          }
          variant="secondary"
          disabled={saving}
        >
          Mark created
        </Button>
        <Button
          onClick={() =>
            savePatch({
              status: "activated",
              workspaceCreationStatus: "created",
              workspaceId: workspaceId || getWorkspaceIdSuggestion(application),
              firstPayingStudentAt: new Date().toISOString()
            })
          }
          variant="primary"
          disabled={saving}
          className="sm:col-span-2 xl:col-span-4"
        >
          Mark activated / first paying student
        </Button>
      </div>
    </GlassCard>
  );
}
