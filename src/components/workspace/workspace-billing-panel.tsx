"use client";

import { SolanaSettlementLedger } from "@/components/admin/solana-settlement-ledger";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { formatDateTime, formatNgn, formatStatusLabel } from "@/components/student-app/student-formatters";
import { maskOpsReference } from "@/components/workspace/workspace-formatters";
import type { PaymentIntent, WorkspaceBillingOverviewResponse } from "@/types/payments";

function intentTone(intent: PaymentIntent) {
  if (intent.status === "verified") {
    return "green" as const;
  }

  if (intent.status === "failed" || intent.status === "expired" || intent.status === "cancelled") {
    return "red" as const;
  }

  return "amber" as const;
}

function intentDate(intent: PaymentIntent) {
  return intent.verifiedAt ?? intent.createdAt;
}

function intentReference(intent: PaymentIntent) {
  return intent.rail === "paystack" ? intent.paystackReference : intent.reference;
}

export function WorkspaceBillingPanel({
  overview,
  loading
}: {
  overview: WorkspaceBillingOverviewResponse | null;
  loading: boolean;
}) {
  if (loading && !overview) {
    return (
      <GlassCard>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          Loading workspace billing readiness through the verified API...
        </p>
      </GlassCard>
    );
  }

  if (!overview) {
    return (
      <GlassCard className="border-[color:color-mix(in_srgb,var(--amber)_26%,transparent)]">
        <p className="eyebrow !text-[color:var(--amber)]">Billing operations</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
          Billing overview is not available yet. The workspace dashboard still avoids direct client Firestore reads.
        </p>
      </GlassCard>
    );
  }

  const readyTierCount = overview.tiers.filter((tier) => tier.checkoutReady).length;
  const pendingSettlementCount = overview.latestSolanaSettlements.filter(
    (settlement) => settlement.status === "pending_payout"
  ).length;

  return (
    <section className="grid gap-6 2xl:grid-cols-[minmax(560px,0.95fr)_minmax(620px,1.05fr)]">
      <GlassCard className="space-y-6" padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-3xl">
            <p className="eyebrow !text-[color:var(--label3)]">Workspace billing</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--label)]">
              Checkout readiness and verified revenue
            </h2>
            <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
              Influencer revenue only shows successful Paystack payments and verified Solana
              payments. Pending, expired, failed, and abandoned intents stay in admin ops.
            </p>
          </div>
          <Badge tone={overview.workspace.paystackSplitReady ? "green" : "amber"}>
            {overview.workspace.paystackSplitReady ? "Paystack split ready" : "Owner pending"}
          </Badge>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          <StatChip
            label="Plan-coded tiers"
            value={`${readyTierCount}/${overview.tiers.length}`}
            tone={readyTierCount ? "green" : "amber"}
          />
          <StatChip
            label="Verified payments"
            value={String(overview.latestPaymentIntents.length)}
            detail="influencer-visible"
            tone="accent"
          />
          <StatChip
            label="Pending USDC ops"
            value={String(pendingSettlementCount)}
            detail="read-only"
            tone={pendingSettlementCount ? "amber" : "green"}
          />
        </div>

        {overview.warnings.map((warning) => (
          <p key={warning} className="break-safe text-sm leading-6 text-[color:var(--label2)]">
            {warning}
          </p>
        ))}

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {overview.tiers.map((tier) => (
            <div key={tier.tierId} className="rounded-[18px] border border-[color:var(--line)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{tier.name}</p>
                  <p className="mt-1 text-xs text-[color:var(--label3)]">{formatNgn(tier.priceNgn)}</p>
                </div>
                <Badge tone={tier.checkoutReady ? "green" : "amber"}>
                  {tier.checkoutReady ? "Plan code" : "Plan pending"}
                </Badge>
              </div>
              <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">
                {tier.paystackPlanCode ?? tier.readinessMessage}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Verified student payments</p>
          {overview.latestPaymentIntents.length === 0 ? (
            <p className="break-safe rounded-[18px] border border-[color:var(--line)] p-4 text-sm leading-6 text-[color:var(--label2)]">
              No successful student payments are visible to this workspace yet. Pending or expired
              checkout attempts stay out of influencer revenue.
            </p>
          ) : (
            <div className="bounded-list-4 space-y-3">
              {overview.latestPaymentIntents.slice(0, 5).map((intent) => (
              <div key={intent.paymentIntentId} className="rounded-[18px] border border-[color:var(--line)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                      {maskOpsReference(intent.paymentIntentId, "intent")}
                    </p>
                    <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                      {formatStatusLabel(intent.rail)} · {formatNgn(intent.amountNgn)} · {maskOpsReference(intentReference(intent), "payref")} · verified {formatDateTime(intentDate(intent))}
                    </p>
                  </div>
                  <Badge tone={intentTone(intent)}>{formatStatusLabel(intent.status)}</Badge>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      <SolanaSettlementLedger settlements={overview.latestSolanaSettlements} />
    </section>
  );
}
