"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StepHeader } from "@/components/onboarding/step-utils";
import type { CodeOfConductStepPayload } from "@/types/onboarding";

const conductItems = [
  "No guaranteed-return claims in workspace content, Telegram, social posts, or sales copy.",
  "Disclose conflicts before posting signals about instruments you already hold.",
  "No signal front-running or timing games that disadvantage students.",
  "Use structured signal formats so alerts route reliably and prop-firm students stay protected.",
  "Do not fabricate, cherry-pick, or misrepresent track records.",
  "Respect student autonomy: no coercion around subscriptions, trade-taking, or position size.",
  "Comply with applicable laws and treat workspace revenue as your own taxable income.",
  "TradeHub may suspend a workspace during credible conduct or compliance review."
];

export function CodeOfConductStep({
  acceptedAt,
  saving,
  onSave
}: {
  acceptedAt?: string;
  saving: boolean;
  onSave: (payload: CodeOfConductStepPayload) => Promise<void>;
}) {
  const [accepted, setAccepted] = useState(Boolean(acceptedAt));

  return (
    <GlassCard className="space-y-6">
      <StepHeader eyebrow="Step 2" title="Influencer Code of Conduct" tone="amber">
        This is version 1.0 of the influencer conduct standard. Acceptance is timestamped on the
        workspace and audited before students can be invited.
      </StepHeader>

      <div className="grid gap-3">
        {conductItems.map((item, index) => (
          <div
            key={item}
            className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_62%,transparent)] px-4 py-3"
          >
            <p className="text-sm leading-6 text-[color:var(--label2)]">
              <span className="font-semibold text-[color:var(--label)]">{index + 1}. </span>
              {item}
            </p>
          </div>
        ))}
      </div>

      {acceptedAt ? (
        <p className="rounded-[18px] border border-[color:color-mix(in_srgb,var(--green)_28%,transparent)] bg-[color:var(--green-bg)] px-4 py-3 text-sm text-[color:var(--green)]">
          Accepted at {new Date(acceptedAt).toLocaleString()}.
        </p>
      ) : null}

      <label className="flex items-start gap-3 rounded-[18px] border border-[color:var(--line)] px-4 py-3">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="focus-ring mt-1 h-4 w-4 rounded border-[color:var(--line)]"
        />
        <span className="text-sm leading-6 text-[color:var(--label2)]">
          I have read and accept the TradeHub Influencer Code of Conduct v1.0.
        </span>
      </label>

      <Button
        onClick={() => onSave({ accepted })}
        variant="primary"
        disabled={saving || !accepted}
      >
        {saving ? "Saving..." : "Accept and save"}
      </Button>
    </GlassCard>
  );
}
