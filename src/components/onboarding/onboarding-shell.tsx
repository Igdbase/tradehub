"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeroCard } from "@/components/ui/hero-card";
import { StatChip } from "@/components/ui/stat-chip";
import type { OnboardingProgressDocument } from "@/types/onboarding";
import type { Workspace } from "@/types/workspace";

export function OnboardingShell({
  workspace,
  progress,
  children,
  onRefresh,
  refreshing
}: {
  workspace: Workspace;
  progress: OnboardingProgressDocument;
  children: ReactNode;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const requiredComplete = progress.completedSteps.filter((step) =>
    ["branding", "code_of_conduct", "pricing", "paystack", "first_course"].includes(step)
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="hero-panel px-6 py-7 sm:px-8 sm:py-9">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="eyebrow">Influencer activation</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-[color:var(--label)] sm:text-5xl">
                Set up {workspace.name} without exposing secrets.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--label2)]">
                Branding, Code of Conduct, Telegram instructions, pricing, Paystack readiness,
                optional Solana wallet review, and first-course drafting all save through verified
                server routes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge tone="accent">Stage 07</Badge>
              <Badge tone="green">Workspace claim: {workspace.workspaceId}</Badge>
              <Button onClick={onRefresh} variant="secondary" size="sm" disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button href="/workspace" variant="ghost" size="sm">
                Workspace home
              </Button>
            </div>
          </div>

          <HeroCard
            label="Activation readiness"
            value={`${requiredComplete} / 5`}
            change="Required steps complete before owner review"
            badge={
              <Badge tone={requiredComplete >= 5 ? "green" : "amber"} variant="outline" uppercase>
                {requiredComplete >= 5 ? "Ready" : "In setup"}
              </Badge>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <StatChip label="Handle" value={workspace.handle} tone="accent" />
              <StatChip label="Market" value={workspace.marketFocus} tone="green" />
              <StatChip
                label="Paystack"
                value={workspace.paystackSplitCode ? "Codes added" : "Owner pending"}
                tone={workspace.paystackSplitCode ? "green" : "amber"}
              />
              <StatChip
                label="Solana"
                value={workspace.solanaPayoutWallet ? "Wallet review" : "Optional"}
                tone={workspace.solanaPayoutWallet ? "accent" : "neutral"}
              />
            </div>
          </HeroCard>
        </div>
      </section>

      {children}
    </div>
  );
}
