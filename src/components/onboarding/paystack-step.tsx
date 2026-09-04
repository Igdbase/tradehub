"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fieldClasses, StepHeader } from "@/components/onboarding/step-utils";
import type { PaystackStepPayload } from "@/types/onboarding";
import type { PaymentRailStatus, Workspace } from "@/types/workspace";

export function PaystackStep({
  workspace,
  saving,
  onSave
}: {
  workspace: Workspace;
  saving: boolean;
  onSave: (payload: PaystackStepPayload) => Promise<void>;
}) {
  const paystackRail = useMemo(
    () => workspace.rails.find((rail) => rail.rail === "paystack"),
    [workspace.rails]
  );
  const [paystackSetupStatus, setPaystackSetupStatus] = useState<PaymentRailStatus>(
    paystackRail?.status ?? "pending_verification"
  );
  const [paystackSubaccountCode, setPaystackSubaccountCode] = useState(
    workspace.paystackSubaccountCode ?? ""
  );
  const [paystackSplitCode, setPaystackSplitCode] = useState(workspace.paystackSplitCode ?? "");
  const [settlementNote, setSettlementNote] = useState(paystackRail?.settlementNote ?? "");

  useEffect(() => {
    setPaystackSetupStatus(paystackRail?.status ?? "pending_verification");
    setPaystackSubaccountCode(workspace.paystackSubaccountCode ?? "");
    setPaystackSplitCode(workspace.paystackSplitCode ?? "");
    setSettlementNote(paystackRail?.settlementNote ?? "");
  }, [paystackRail, workspace.paystackSplitCode, workspace.paystackSubaccountCode]);

  return (
    <GlassCard className="space-y-6">
      <StepHeader eyebrow="Step 5" title="Paystack readiness" tone="green">
        Paystack remains the default checkout rail. TradeHub stores only the subaccount and split
        codes after the owner creates them in Paystack; bank details stay out of this wizard.
      </StepHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Setup status</span>
          <select
            value={paystackSetupStatus}
            onChange={(event) => setPaystackSetupStatus(event.target.value as PaymentRailStatus)}
            className={`${fieldClasses} w-full`}
          >
            <option value="pending_verification">Owner pending / not verified</option>
            <option value="enabled">Codes ready</option>
            <option value="disabled">Disabled for now</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Subaccount code</span>
          <input
            value={paystackSubaccountCode}
            onChange={(event) => setPaystackSubaccountCode(event.target.value)}
            className={`${fieldClasses} w-full`}
            placeholder="ACCT_..."
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Split code</span>
          <input
            value={paystackSplitCode}
            onChange={(event) => setPaystackSplitCode(event.target.value)}
            className={`${fieldClasses} w-full`}
            placeholder="SPL_..."
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Settlement note</span>
          <textarea
            value={settlementNote}
            onChange={(event) => setSettlementNote(event.target.value)}
            className={`${fieldClasses} min-h-[6rem] w-full`}
          />
        </label>
      </div>

      <GlassCard padding="sm">
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          The owner/operator still creates Paystack subaccounts and splits in Paystack. This step
          only records readiness codes and operational notes.
        </p>
      </GlassCard>

      <Button
        onClick={() =>
          onSave({
            paystackSetupStatus,
            paystackSubaccountCode,
            paystackSplitCode,
            settlementNote
          })
        }
        variant="primary"
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Paystack readiness"}
      </Button>
    </GlassCard>
  );
}
