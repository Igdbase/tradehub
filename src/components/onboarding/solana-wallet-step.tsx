"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fieldClasses, StepHeader } from "@/components/onboarding/step-utils";
import type { SolanaWalletStepPayload } from "@/types/onboarding";
import type { Workspace } from "@/types/workspace";

export function SolanaWalletStep({
  workspace,
  saving,
  onSave
}: {
  workspace: Workspace;
  saving: boolean;
  onSave: (payload: SolanaWalletStepPayload) => Promise<void>;
}) {
  const [solanaPayInterest, setSolanaPayInterest] = useState(Boolean(workspace.solanaPayoutWallet));
  const [solanaPayoutWallet, setSolanaPayoutWallet] = useState(workspace.solanaPayoutWallet ?? "");
  const [solanaPartnerPlacementEnabled, setSolanaPartnerPlacementEnabled] = useState(
    workspace.solanaPartnerPlacementEnabled
  );

  useEffect(() => {
    setSolanaPayInterest(Boolean(workspace.solanaPayoutWallet));
    setSolanaPayoutWallet(workspace.solanaPayoutWallet ?? "");
    setSolanaPartnerPlacementEnabled(workspace.solanaPartnerPlacementEnabled);
  }, [workspace.solanaPartnerPlacementEnabled, workspace.solanaPayoutWallet]);

  return (
    <GlassCard className="space-y-6">
      <StepHeader eyebrow="Step 6" title="Optional Solana Pay / USDC wallet" tone="neutral">
        Solana is an optional approved rail, not the headline product. Store only a public payout
        address for owner verification; checkout stays disabled until later payment work.
      </StepHeader>

      <div className="space-y-4">
        <label className="flex items-start gap-3 rounded-[18px] border border-[color:var(--line)] px-4 py-3">
          <input
            type="checkbox"
            checked={solanaPayInterest}
            onChange={(event) => setSolanaPayInterest(event.target.checked)}
            className="focus-ring mt-1 h-4 w-4"
          />
          <span className="text-sm leading-6 text-[color:var(--label2)]">
            This workspace wants optional USDC checkout review.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-[18px] border border-[color:var(--line)] px-4 py-3">
          <input
            type="checkbox"
            checked={solanaPartnerPlacementEnabled}
            onChange={(event) => setSolanaPartnerPlacementEnabled(event.target.checked)}
            className="focus-ring mt-1 h-4 w-4"
          />
          <span className="text-sm leading-6 text-[color:var(--label2)]">
            Interested in a restrained &quot;Powered by Solana Pay&quot; partner placement if approved.
          </span>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[color:var(--label)]">Public Solana wallet address</span>
        <input
          value={solanaPayoutWallet}
          onChange={(event) => setSolanaPayoutWallet(event.target.value)}
          className={`${fieldClasses} w-full`}
          placeholder="Public address only"
        />
      </label>

      <GlassCard padding="sm">
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          Never paste secret recovery words, signing material, exchange credentials, or wallet export
          files. TradeHub only needs the public receiving address at this stage.
        </p>
      </GlassCard>

      <Button
        onClick={() =>
          onSave({
            solanaPayInterest,
            solanaPayoutWallet,
            solanaPartnerPlacementEnabled
          })
        }
        variant="primary"
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Solana readiness"}
      </Button>
    </GlassCard>
  );
}
