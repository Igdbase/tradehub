"use client";

import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import type {
  OnboardingProgressDocument,
  WorkspaceOnboardingStepKey
} from "@/types/onboarding";

export const onboardingStepLabels: Record<WorkspaceOnboardingStepKey, string> = {
  branding: "Branding",
  code_of_conduct: "Code of Conduct",
  telegram_bot: "Telegram setup",
  pricing: "Pricing",
  paystack: "Paystack",
  solana_wallet: "Solana wallet",
  first_course: "First course",
  review: "Review"
};

export const onboardingStepDescriptions: Record<WorkspaceOnboardingStepKey, string> = {
  branding: "Name, handle, market focus, and visible workspace identity.",
  code_of_conduct: "Compliance posture before students can be invited.",
  telegram_bot: "Public bot handle only; encrypted credential handling is deferred.",
  pricing: "Tiers, trials, features, and refund copy.",
  paystack: "Subaccount and split readiness without collecting bank details.",
  solana_wallet: "Optional public wallet for later USDC review.",
  first_course: "A safe unpublished draft shell.",
  review: "Submit the workspace for owner review."
};

const stepOrder = Object.keys(onboardingStepLabels) as WorkspaceOnboardingStepKey[];

function toneForStatus(status: OnboardingProgressDocument["stepStatus"][WorkspaceOnboardingStepKey]) {
  if (status === "complete") {
    return "green" as const;
  }

  if (status === "current") {
    return "accent" as const;
  }

  if (status === "blocked") {
    return "red" as const;
  }

  if (status === "optional") {
    return "neutral" as const;
  }

  return "amber" as const;
}

export function OnboardingProgress({
  progress,
  activeStep,
  onStepChange
}: {
  progress: OnboardingProgressDocument;
  activeStep: WorkspaceOnboardingStepKey;
  onStepChange: (step: WorkspaceOnboardingStepKey) => void;
}) {
  return (
    <GlassCard className="space-y-4 lg:sticky lg:top-24">
      <div>
        <p className="eyebrow !text-[color:var(--label3)]">Activation steps</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
          Save one step at a time. TradeHub does not autosave every keystroke, so Firestore writes
          stay intentional and quota-safe.
        </p>
      </div>

      <div className="space-y-2">
        {stepOrder.map((step, index) => {
          const status = progress.stepStatus[step];
          const isActive = activeStep === step;

          return (
            <button
              key={step}
              type="button"
              onClick={() => onStepChange(step)}
              className={`focus-ring w-full rounded-[18px] border px-4 py-3 text-left transition ${
                isActive
                  ? "border-[color:var(--accent)] bg-[color:var(--accent-bg)]"
                  : "border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] hover:border-[color:var(--accent)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--label)]">
                    {index + 1}. {onboardingStepLabels[step]}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--label2)]">
                    {onboardingStepDescriptions[step]}
                  </p>
                </div>
                <Badge tone={toneForStatus(status)}>{status.replace(/_/g, " ")}</Badge>
              </div>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
