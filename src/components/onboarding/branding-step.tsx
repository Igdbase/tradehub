"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fieldClasses, StepHeader } from "@/components/onboarding/step-utils";
import type { BrandingStepPayload } from "@/types/onboarding";
import type { Workspace } from "@/types/workspace";

const accentOptions = [
  { value: "accent", label: "Champagne accent" },
  { value: "neutral", label: "Graphite neutral" },
  { value: "green", label: "Success green" },
  { value: "amber", label: "Caution amber" }
];

export function BrandingStep({
  workspace,
  saving,
  onSave
}: {
  workspace: Workspace;
  saving: boolean;
  onSave: (payload: BrandingStepPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<BrandingStepPayload>({
    name: workspace.name,
    handle: workspace.handle,
    ownerDisplayName: workspace.ownerDisplayName,
    summary: workspace.summary,
    marketFocus: workspace.marketFocus,
    logoMark: workspace.branding.logoMark,
    heroLabel: workspace.branding.heroLabel,
    accentColor: workspace.branding.accentColor
  });

  useEffect(() => {
    setForm({
      name: workspace.name,
      handle: workspace.handle,
      ownerDisplayName: workspace.ownerDisplayName,
      summary: workspace.summary,
      marketFocus: workspace.marketFocus,
      logoMark: workspace.branding.logoMark,
      heroLabel: workspace.branding.heroLabel,
      accentColor: workspace.branding.accentColor
    });
  }, [workspace]);

  return (
    <GlassCard className="space-y-6">
      <StepHeader eyebrow="Step 1" title="Workspace branding">
        Give students a workspace that feels like the educator&apos;s brand while staying inside the
        locked TradeHub material system. Logo upload comes later; for now we use a safe mark.
      </StepHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Workspace name</span>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className={`${fieldClasses} w-full`}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Handle / slug</span>
          <input
            value={form.handle}
            onChange={(event) => setForm((current) => ({ ...current, handle: event.target.value }))}
            className={`${fieldClasses} w-full`}
            placeholder="apexfx"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Owner display name</span>
          <input
            value={form.ownerDisplayName}
            onChange={(event) =>
              setForm((current) => ({ ...current, ownerDisplayName: event.target.value }))
            }
            className={`${fieldClasses} w-full`}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Market focus</span>
          <select
            value={form.marketFocus}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                marketFocus: event.target.value as BrandingStepPayload["marketFocus"]
              }))
            }
            className={`${fieldClasses} w-full`}
          >
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
            <option value="both">Forex and crypto</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Logo mark initials</span>
          <input
            value={form.logoMark}
            onChange={(event) => setForm((current) => ({ ...current, logoMark: event.target.value }))}
            className={`${fieldClasses} w-full uppercase`}
            maxLength={5}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Hero label</span>
          <input
            value={form.heroLabel}
            onChange={(event) => setForm((current) => ({ ...current, heroLabel: event.target.value }))}
            className={`${fieldClasses} w-full`}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Approved accent</span>
          <select
            value={form.accentColor}
            onChange={(event) => setForm((current) => ({ ...current, accentColor: event.target.value }))}
            className={`${fieldClasses} w-full`}
          >
            {accentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Short summary</span>
          <textarea
            value={form.summary}
            onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
            className={`${fieldClasses} min-h-[8rem] w-full`}
          />
        </label>
      </div>

      <Button onClick={() => onSave(form)} variant="primary" disabled={saving}>
        {saving ? "Saving..." : "Save branding"}
      </Button>
    </GlassCard>
  );
}
