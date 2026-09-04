"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { maskOpsReference } from "@/components/workspace/workspace-formatters";
import { formatCurrencyNgn } from "@/lib/mock-selectors";
import type { SolanaSettlementPatchPayload, SolanaSettlementRecord } from "@/types/payments";

function formatUsdc(value: number) {
  return `${value.toFixed(6)} USDC`;
}

function settlementTone(status: SolanaSettlementRecord["status"]) {
  if (status === "settled") {
    return "green" as const;
  }

  if (status === "cancelled") {
    return "red" as const;
  }

  return "amber" as const;
}

export function SolanaSettlementLedger({
  settlements,
  onPatchSettlement,
  updatingSettlementId
}: {
  settlements: SolanaSettlementRecord[];
  onPatchSettlement?: (settlementId: string, payload: SolanaSettlementPatchPayload) => Promise<void>;
  updatingSettlementId?: string | null;
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});
  const pending = settlements.filter((entry) => entry.status === "pending_payout");
  const pendingInfluencerAmount = pending.reduce(
    (total, entry) => total + (entry.split.influencerAmountUsdc ?? 0),
    0
  );

  return (
    <GlassCard className="space-y-6" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Solana settlement ledger</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--label)]">
            Verified USDC split records
          </h2>
        </div>
        <Badge tone={settlements.length ? "accent" : "neutral"}>
          {settlements.length ? "Ops ready" : "Awaiting first record"}
        </Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <StatChip label="Recent records" value={String(settlements.length)} tone="accent" />
        <StatChip label="Pending payout" value={String(pending.length)} tone="amber" />
        <StatChip label="Influencer due" value={formatUsdc(pendingInfluencerAmount)} tone="green" />
      </div>

      {settlements.length === 0 ? (
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
          No verified Solana settlements exist yet. Once a student pays through the optional USDC rail,
          TradeHub will write a payout-ready ledger record here while keeping the platform-collect MVP honest.
        </p>
      ) : (
        <div className="bounded-list-4 space-y-3">
          {settlements.slice(0, 5).map((settlement) => (
            <div
              key={settlement.settlementId}
              className="rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_34%,transparent)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                    {settlement.workspaceName} · {settlement.tierLabel}
                  </p>
                  <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                    @{settlement.workspaceHandle} · {settlement.studentDisplayName} · {maskOpsReference(settlement.reference, "solref")}
                  </p>
                </div>
                <Badge tone={settlementTone(settlement.status)}>
                  {settlement.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(145px,1fr))]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Gross
                  </p>
                  <p className="break-safe mt-2 text-sm font-semibold text-[color:var(--label)]">
                    {formatCurrencyNgn(settlement.amountNgn)}
                  </p>
                  <p className="break-safe text-xs text-[color:var(--label3)]">{formatUsdc(settlement.amountUsdc)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Platform share
                  </p>
                  <p className="break-safe mt-2 text-sm font-semibold text-[color:var(--accent)]">
                    {settlement.split.platformPercent}% · {formatUsdc(settlement.split.platformAmountUsdc ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Influencer share
                  </p>
                  <p className="break-safe mt-2 text-sm font-semibold text-[color:var(--green)]">
                    {settlement.split.influencerPercent}% · {formatUsdc(settlement.split.influencerAmountUsdc ?? 0)}
                  </p>
                </div>
              </div>

              {settlement.payoutNote || settlement.payoutSignature || settlement.payoutCompletedAt ? (
                <div className="mt-4 rounded-[18px] border border-[color:var(--line)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Ops note
                  </p>
                  {settlement.payoutNote ? (
                    <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label2)]">{settlement.payoutNote}</p>
                  ) : null}
                  {settlement.payoutSignature ? (
                    <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label3)]">
                      Reference: {maskOpsReference(settlement.payoutSignature, "payout")}
                    </p>
                  ) : null}
                  {settlement.payoutCompletedAt ? (
                    <p className="mt-2 text-xs leading-5 text-[color:var(--label3)]">
                      Completed: {new Intl.DateTimeFormat("en-NG", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      }).format(new Date(settlement.payoutCompletedAt))}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {onPatchSettlement ? (
                <div className="mt-4 space-y-3 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_48%,transparent)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Admin settlement ops
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={notes[settlement.settlementId] ?? settlement.payoutNote ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [settlement.settlementId]: event.target.value
                        }))
                      }
                      placeholder="Internal payout note"
                      className="focus-ring rounded-[14px] border border-[color:var(--line)] bg-transparent px-3 py-2 text-xs text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]"
                    />
                    <input
                      value={references[settlement.settlementId] ?? settlement.payoutSignature ?? ""}
                      onChange={(event) =>
                        setReferences((current) => ({
                          ...current,
                          [settlement.settlementId]: event.target.value
                        }))
                      }
                      placeholder="Transfer reference optional"
                      className="focus-ring rounded-[14px] border border-[color:var(--line)] bg-transparent px-3 py-2 text-xs text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        onPatchSettlement(settlement.settlementId, {
                          status: "pending_payout",
                          payoutNote: notes[settlement.settlementId],
                          payoutSignature: references[settlement.settlementId]
                        })
                      }
                      variant="secondary"
                      size="sm"
                      disabled={updatingSettlementId === settlement.settlementId}
                    >
                      Pending
                    </Button>
                    <Button
                      onClick={() =>
                        onPatchSettlement(settlement.settlementId, {
                          status: "settled",
                          payoutNote: notes[settlement.settlementId],
                          payoutSignature: references[settlement.settlementId]
                        })
                      }
                      variant="primary"
                      size="sm"
                      disabled={updatingSettlementId === settlement.settlementId}
                    >
                      Mark settled
                    </Button>
                    <Button
                      onClick={() =>
                        onPatchSettlement(settlement.settlementId, {
                          status: "cancelled",
                          payoutNote: notes[settlement.settlementId],
                          payoutSignature: references[settlement.settlementId]
                        })
                      }
                      variant="ghost"
                      size="sm"
                      disabled={updatingSettlementId === settlement.settlementId}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
        This ledger records what the influencer should receive after a verified Solana payment. It does not
        auto-send on-chain payout yet.
      </p>
    </GlassCard>
  );
}
