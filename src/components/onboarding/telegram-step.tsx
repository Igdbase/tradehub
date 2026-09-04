"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fieldClasses, StepHeader } from "@/components/onboarding/step-utils";
import type { TelegramStepPayload } from "@/types/onboarding";
import type { Workspace } from "@/types/workspace";

const botFatherSteps = [
  "Open Telegram and message @BotFather.",
  "Send /newbot.",
  "Choose a bot name your students will recognize.",
  "Choose a username that ends in bot.",
  "Keep the returned credential outside TradeHub until encrypted handling is added."
];

export function TelegramStep({
  workspace,
  saving,
  onSave
}: {
  workspace: Workspace;
  saving: boolean;
  onSave: (payload: TelegramStepPayload) => Promise<void>;
}) {
  const [telegramBotHandle, setTelegramBotHandle] = useState(
    workspace.branding.telegramBotHandle ?? ""
  );

  useEffect(() => {
    setTelegramBotHandle(workspace.branding.telegramBotHandle ?? "");
  }, [workspace.branding.telegramBotHandle]);

  return (
    <GlassCard className="space-y-6">
      <StepHeader eyebrow="Step 3" title="Telegram BotFather setup" tone="neutral">
        Telegram automation is not connected yet. This step stores only the public bot handle so
        the owner can verify naming and readiness without storing sensitive credentials.
      </StepHeader>

      <div className="grid gap-3 md:grid-cols-5">
        {botFatherSteps.map((step, index) => (
          <div
            key={step}
            className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_62%,transparent)] p-4"
          >
            <Badge tone={index === 4 ? "amber" : "accent"}>{index + 1}</Badge>
            <p className="mt-3 text-sm leading-6 text-[color:var(--label2)]">{step}</p>
          </div>
        ))}
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[color:var(--label)]">Public bot handle</span>
        <input
          value={telegramBotHandle}
          onChange={(event) => setTelegramBotHandle(event.target.value)}
          className={`${fieldClasses} w-full`}
          placeholder="@ApexFXSignalsBot"
        />
      </label>

      <GlassCard className="space-y-2" padding="sm">
        <p className="text-sm font-semibold text-[color:var(--label)]">Safe MVP boundary</p>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          The actual Telegram credential is deliberately not collected here. A later prompt will add
          encrypted storage and bot infrastructure.
        </p>
      </GlassCard>

      <Button
        onClick={() => onSave({ telegramBotHandle })}
        variant="primary"
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Telegram handle"}
      </Button>
    </GlassCard>
  );
}
