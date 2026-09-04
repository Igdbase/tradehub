"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fieldClasses, StepHeader } from "@/components/onboarding/step-utils";
import type { PricingStepPayload } from "@/types/onboarding";
import type { Workspace, WorkspaceFeatureKey, WorkspaceTier } from "@/types/workspace";

const featureOptions: Array<{ value: WorkspaceFeatureKey; label: string }> = [
  { value: "course", label: "Course" },
  { value: "signalAlerts", label: "Signal alerts" },
  { value: "autoCopy", label: "Auto-Copy" },
  { value: "journal", label: "Journal" },
  { value: "calculators", label: "Calculators" }
];

function emptyTier(index: number): WorkspaceTier {
  return {
    tierId: `tier_plan_${index + 1}`,
    name: index === 0 ? "Starter" : `Tier ${index + 1}`,
    description: "",
    priceNgn: 15000,
    billingPeriod: "monthly",
    features: ["course", "signalAlerts"],
    featured: index === 0
  };
}

export function PricingStep({
  workspace,
  saving,
  onSave
}: {
  workspace: Workspace;
  saving: boolean;
  onSave: (payload: PricingStepPayload) => Promise<void>;
}) {
  const [singleTier, setSingleTier] = useState(workspace.settings.singleTier);
  const [tiers, setTiers] = useState<WorkspaceTier[]>(workspace.tiers);
  const [freeTrialDays, setFreeTrialDays] = useState(workspace.settings.freeTrialDays);
  const [noCardRequired, setNoCardRequired] = useState(workspace.settings.noCardRequired);
  const [refundPolicy, setRefundPolicy] = useState(workspace.settings.refundPolicy);

  useEffect(() => {
    setSingleTier(workspace.settings.singleTier);
    setTiers(workspace.tiers);
    setFreeTrialDays(workspace.settings.freeTrialDays);
    setNoCardRequired(workspace.settings.noCardRequired);
    setRefundPolicy(workspace.settings.refundPolicy);
  }, [workspace]);

  function updateTier(index: number, patch: Partial<WorkspaceTier>) {
    setTiers((current) =>
      current.map((tier, tierIndex) => (tierIndex === index ? { ...tier, ...patch } : tier))
    );
  }

  function toggleFeature(index: number, feature: WorkspaceFeatureKey) {
    setTiers((current) =>
      current.map((tier, tierIndex) => {
        if (tierIndex !== index) {
          return tier;
        }

        const features = tier.features.includes(feature)
          ? tier.features.filter((entry) => entry !== feature)
          : [...tier.features, feature];

        return { ...tier, features };
      })
    );
  }

  return (
    <GlassCard className="space-y-6">
      <StepHeader eyebrow="Step 4" title="Pricing and access tiers">
        Keep subscriptions simple enough to launch. Auto-Copy remains personal-account only where
        allowed; funded-account students receive Signal Alerts for manual review.
      </StepHeader>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--label2)]">
          <input
            type="checkbox"
            checked={singleTier}
            onChange={(event) => {
              setSingleTier(event.target.checked);
              if (event.target.checked) {
                setTiers((current) => current.slice(0, 1));
              }
            }}
          />
          Single-tier workspace
        </label>
        <label className="flex items-center gap-2 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--label2)]">
          <input
            type="checkbox"
            checked={noCardRequired}
            onChange={(event) => setNoCardRequired(event.target.checked)}
          />
          Trial does not require card
        </label>
      </div>

      <div className="space-y-4">
        {tiers.map((tier, index) => (
          <GlassCard key={`${tier.tierId}-${index}`} className="space-y-4" padding="sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[color:var(--label)]">Tier name</span>
                <input
                  value={tier.name}
                  onChange={(event) => updateTier(index, { name: event.target.value })}
                  className={`${fieldClasses} w-full`}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[color:var(--label)]">NGN price</span>
                <input
                  type="number"
                  value={tier.priceNgn}
                  onChange={(event) =>
                    updateTier(index, { priceNgn: Number(event.target.value) })
                  }
                  className={`${fieldClasses} w-full tabular-nums`}
                  min={1}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[color:var(--label)]">Billing</span>
                <select
                  value={tier.billingPeriod}
                  onChange={(event) =>
                    updateTier(index, {
                      billingPeriod: event.target.value as WorkspaceTier["billingPeriod"]
                    })
                  }
                  className={`${fieldClasses} w-full`}
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[color:var(--label)]">Featured</span>
                <select
                  value={tier.featured ? "yes" : "no"}
                  onChange={(event) => updateTier(index, { featured: event.target.value === "yes" })}
                  className={`${fieldClasses} w-full`}
                >
                  <option value="yes">Featured</option>
                  <option value="no">Standard</option>
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-[color:var(--label)]">Description</span>
                <textarea
                  value={tier.description}
                  onChange={(event) => updateTier(index, { description: event.target.value })}
                  className={`${fieldClasses} min-h-[5rem] w-full`}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {featureOptions.map((feature) => (
                <label
                  key={feature.value}
                  className="flex items-center gap-2 rounded-full border border-[color:var(--line)] px-3 py-2 text-xs text-[color:var(--label2)]"
                >
                  <input
                    type="checkbox"
                    checked={tier.features.includes(feature.value)}
                    onChange={() => toggleFeature(index, feature.value)}
                  />
                  {feature.label}
                </label>
              ))}
            </div>

            {tiers.length > 1 ? (
              <Button
                onClick={() => setTiers((current) => current.filter((_, tierIndex) => tierIndex !== index))}
                variant="ghost"
                size="sm"
              >
                Remove tier
              </Button>
            ) : null}
          </GlassCard>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setTiers((current) => [...current, emptyTier(current.length)].slice(0, 3))}
          variant="secondary"
          disabled={singleTier || tiers.length >= 3}
        >
          Add tier
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Free trial days</span>
          <select
            value={freeTrialDays}
            onChange={(event) =>
              setFreeTrialDays(Number(event.target.value) as Workspace["settings"]["freeTrialDays"])
            }
            className={`${fieldClasses} w-full`}
          >
            <option value={0}>0 days</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Refund policy</span>
          <textarea
            value={refundPolicy}
            onChange={(event) => setRefundPolicy(event.target.value)}
            className={`${fieldClasses} min-h-[5rem] w-full`}
          />
        </label>
      </div>

      <Button
        onClick={() =>
          onSave({
            singleTier,
            tiers,
            freeTrialDays,
            noCardRequired,
            refundPolicy
          })
        }
        variant="primary"
        disabled={saving}
      >
        {saving ? "Saving..." : "Save pricing"}
      </Button>
    </GlassCard>
  );
}
