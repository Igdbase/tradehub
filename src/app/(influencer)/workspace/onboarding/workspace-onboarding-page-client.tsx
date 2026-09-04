"use client";

import { useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuthUser } from "@/lib/auth/use-auth-user";
import { BrandingStep } from "@/components/onboarding/branding-step";
import { CodeOfConductStep } from "@/components/onboarding/code-of-conduct-step";
import { FirstCourseStep } from "@/components/onboarding/first-course-step";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { PaystackStep } from "@/components/onboarding/paystack-step";
import { PricingStep } from "@/components/onboarding/pricing-step";
import { ReviewStep } from "@/components/onboarding/review-step";
import { SolanaWalletStep } from "@/components/onboarding/solana-wallet-step";
import { TelegramStep } from "@/components/onboarding/telegram-step";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { requestWorkspaceOnboardingApi } from "@/lib/workspace/onboarding-api-client";
import type {
  FirstCourseDraftPayload,
  WorkspaceCourseDraftResponse,
  WorkspaceOnboardingLoadResponse,
  WorkspaceOnboardingSaveResponse,
  WorkspaceOnboardingStepKey
} from "@/types/onboarding";

function WorkspaceNotPrepared({ onRefreshClaims }: { onRefreshClaims: () => Promise<void> }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center py-10">
      <GlassCard className="space-y-6 p-6 sm:p-8">
        <p className="eyebrow">Workspace not prepared</p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
          Your account has a workspace claim, but the owner has not created the workspace shell yet.
        </h1>
        <p className="text-sm leading-7 text-[color:var(--label2)]">
          Ask the TradeHub owner to open the approved application in `/admin`, create the workspace
          shell, create the influencer Email/Password user if needed, then run the influencer
          bootstrap script and refresh your claims.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onRefreshClaims} variant="primary">
            Refresh claims
          </Button>
          <Button href="/" variant="secondary">
            Back to TradeHub
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <GlassCard className="space-y-3">
        <p className="eyebrow !text-[color:var(--label3)]">Workspace onboarding</p>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          Loading the verified workspace shell...
        </p>
      </GlassCard>
    </div>
  );
}

function OnboardingWizard() {
  const { refreshClaims } = useAuthUser();
  const [data, setData] = useState<WorkspaceOnboardingLoadResponse | null>(null);
  const [activeStep, setActiveStep] = useState<WorkspaceOnboardingStepKey>("branding");
  const [loading, setLoading] = useState(true);
  const [savingStep, setSavingStep] = useState<WorkspaceOnboardingStepKey | "course" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadOnboarding() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await requestWorkspaceOnboardingApi<WorkspaceOnboardingLoadResponse>(
        "/api/workspace/onboarding"
      );

      setData(response);

      if (response.progress) {
        setActiveStep(response.progress.currentStep);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load onboarding.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOnboarding();
  }, []);

  async function saveStep(step: WorkspaceOnboardingStepKey, payload: unknown) {
    setSavingStep(step);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestWorkspaceOnboardingApi<WorkspaceOnboardingSaveResponse>(
        "/api/workspace/onboarding/step",
        {
          method: "PATCH",
          body: JSON.stringify({ step, payload })
        }
      );

      setData((current) =>
        current
          ? {
              ...current,
              ...response,
              message: "Workspace step saved.",
              courseDraft: current.courseDraft
            }
          : current
      );
      setActiveStep(response.progress.currentStep);
      setMessage("Saved. Firestore was updated through the verified workspace API.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save that step.");
    } finally {
      setSavingStep(null);
    }
  }

  async function saveCourseDraft(payload: FirstCourseDraftPayload) {
    setSavingStep("course");
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await requestWorkspaceOnboardingApi<WorkspaceCourseDraftResponse>(
        "/api/workspace/onboarding/course-draft",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      setData((current) =>
        current
          ? {
              ...current,
              progress: response.progress,
              courseDraft: response.courseDraft,
              message: "Draft course saved."
            }
          : current
      );
      setActiveStep(response.progress.currentStep);
      setMessage("Draft course saved unpublished and audit-logged.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save the draft course.");
    } finally {
      setSavingStep(null);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!data) {
    return (
      <GlassCard className="mx-auto max-w-3xl space-y-4">
        <p className="eyebrow !text-[color:var(--red)]">Workspace API</p>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          {errorMessage ?? "TradeHub could not load onboarding."}
        </p>
        <Button onClick={loadOnboarding} variant="primary">
          Try again
        </Button>
      </GlassCard>
    );
  }

  if (!data.workspacePrepared || !data.workspace || !data.progress) {
    return (
      <WorkspaceNotPrepared
        onRefreshClaims={async () => {
          await refreshClaims();
        }}
      />
    );
  }

  const { workspace, progress, courseDraft } = data;

  return (
    <OnboardingShell
      workspace={workspace}
      progress={progress}
      onRefresh={loadOnboarding}
      refreshing={loading}
    >
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <OnboardingProgress
          progress={progress}
          activeStep={activeStep}
          onStepChange={setActiveStep}
        />

        <div className="space-y-4">
          <div aria-live="polite" className="space-y-3">
            {errorMessage ? (
              <GlassCard className="border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
                <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
              </GlassCard>
            ) : null}
            {message ? (
              <GlassCard className="border-[color:color-mix(in_srgb,var(--green)_30%,transparent)]">
                <p className="text-sm leading-6 text-[color:var(--green)]">{message}</p>
              </GlassCard>
            ) : null}
          </div>

          {activeStep === "branding" ? (
            <BrandingStep
              workspace={workspace}
              saving={savingStep === "branding"}
              onSave={(payload) => saveStep("branding", payload)}
            />
          ) : null}
          {activeStep === "code_of_conduct" ? (
            <CodeOfConductStep
              acceptedAt={workspace.codeOfConductAcceptedAt}
              saving={savingStep === "code_of_conduct"}
              onSave={(payload) => saveStep("code_of_conduct", payload)}
            />
          ) : null}
          {activeStep === "telegram_bot" ? (
            <TelegramStep
              workspace={workspace}
              saving={savingStep === "telegram_bot"}
              onSave={(payload) => saveStep("telegram_bot", payload)}
            />
          ) : null}
          {activeStep === "pricing" ? (
            <PricingStep
              workspace={workspace}
              saving={savingStep === "pricing"}
              onSave={(payload) => saveStep("pricing", payload)}
            />
          ) : null}
          {activeStep === "paystack" ? (
            <PaystackStep
              workspace={workspace}
              saving={savingStep === "paystack"}
              onSave={(payload) => saveStep("paystack", payload)}
            />
          ) : null}
          {activeStep === "solana_wallet" ? (
            <SolanaWalletStep
              workspace={workspace}
              saving={savingStep === "solana_wallet"}
              onSave={(payload) => saveStep("solana_wallet", payload)}
            />
          ) : null}
          {activeStep === "first_course" ? (
            <FirstCourseStep
              workspace={workspace}
              courseDraft={courseDraft}
              saving={savingStep === "course"}
              onSave={saveCourseDraft}
            />
          ) : null}
          {activeStep === "review" ? (
            <ReviewStep
              workspace={workspace}
              progress={progress}
              saving={savingStep === "review"}
              onSave={(payload) => saveStep("review", payload)}
            />
          ) : null}
        </div>
      </div>
    </OnboardingShell>
  );
}

export function WorkspaceOnboardingPageClient() {
  return (
    <RoleGate allowedRole="influencer" nextPath="/workspace/onboarding">
      <OnboardingWizard />
    </RoleGate>
  );
}
