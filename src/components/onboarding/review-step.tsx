"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StepHeader } from "@/components/onboarding/step-utils";
import { onboardingStepLabels } from "@/components/onboarding/onboarding-progress";
import type {
  OnboardingProgressDocument,
  ReviewStepPayload,
  WorkspaceOnboardingStepKey
} from "@/types/onboarding";
import type { Workspace } from "@/types/workspace";

const requiredSteps: WorkspaceOnboardingStepKey[] = [
  "branding",
  "code_of_conduct",
  "pricing",
  "paystack",
  "first_course"
];
const optionalSteps: WorkspaceOnboardingStepKey[] = ["telegram_bot", "solana_wallet"];

export function ReviewStep({
  workspace,
  progress,
  saving,
  onSave
}: {
  workspace: Workspace;
  progress: OnboardingProgressDocument;
  saving: boolean;
  onSave: (payload: ReviewStepPayload) => Promise<void>;
}) {
  const missing = requiredSteps.filter((step) => !progress.completedSteps.includes(step));
  const ready = missing.length === 0;

  return (
    <GlassCard className="space-y-6">
      <StepHeader eyebrow="Step 8" title="Review and activation readiness" tone={ready ? "green" : "amber"}>
        Submit for owner review only after required setup is complete. Telegram and Solana can stay
        pending when the status is clear.
      </StepHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="space-y-3" padding="sm">
          <p className="text-sm font-semibold text-[color:var(--label)]">Required steps</p>
          {requiredSteps.map((step) => {
            const complete = progress.completedSteps.includes(step);

            return (
              <div key={step} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[color:var(--label2)]">{onboardingStepLabels[step]}</span>
                <Badge tone={complete ? "green" : "amber"}>{complete ? "complete" : "blocked"}</Badge>
              </div>
            );
          })}
        </GlassCard>
        <GlassCard className="space-y-3" padding="sm">
          <p className="text-sm font-semibold text-[color:var(--label)]">Optional / owner-reviewed</p>
          {optionalSteps.map((step) => {
            const complete = progress.completedSteps.includes(step);

            return (
              <div key={step} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[color:var(--label2)]">{onboardingStepLabels[step]}</span>
                <Badge tone={complete ? "green" : "neutral"}>{complete ? "saved" : "pending ok"}</Badge>
              </div>
            );
          })}
        </GlassCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard padding="sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            Workspace
          </p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--label)]">{workspace.name}</p>
          <p className="mt-1 text-sm text-[color:var(--label2)]">@{workspace.handle}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            Conduct
          </p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--label)]">
            {workspace.codeOfConductAcceptedAt ? "Accepted" : "Not accepted"}
          </p>
          <p className="mt-1 text-sm text-[color:var(--label2)]">{workspace.riskDisclosureVersion}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            Checkout
          </p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--label)]">
            {workspace.paystackSplitCode ? "Paystack codes saved" : "Owner-pending Paystack"}
          </p>
          <p className="mt-1 text-sm text-[color:var(--label2)]">
            {workspace.solanaPayoutWallet ? "Solana wallet pending review" : "Solana optional"}
          </p>
        </GlassCard>
      </div>

      {progress.reviewSubmittedAt ? (
        <p className="rounded-[18px] border border-[color:color-mix(in_srgb,var(--green)_28%,transparent)] bg-[color:var(--green-bg)] px-4 py-3 text-sm text-[color:var(--green)]">
          Submitted for owner review at {new Date(progress.reviewSubmittedAt).toLocaleString()}.
        </p>
      ) : null}

      <Button
        onClick={() => onSave({ readyForOwnerReview: true })}
        variant="primary"
        disabled={saving || !ready}
      >
        {saving ? "Submitting..." : ready ? "Submit for owner review" : "Complete required steps first"}
      </Button>
    </GlassCard>
  );
}
