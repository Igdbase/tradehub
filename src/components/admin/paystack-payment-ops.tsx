"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { maskOpsReference } from "@/components/workspace/workspace-formatters";
import type { AdminPaymentsOverviewResponse, PaymentIntent } from "@/types/payments";

function formatNgn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value);
}

function formatStatusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: PaymentIntent["status"]) {
  if (status === "verified") {
    return "green" as const;
  }

  if (status === "failed" || status === "cancelled" || status === "expired") {
    return "red" as const;
  }

  return "amber" as const;
}

export function PaystackPaymentOps({
  payments,
  reconcilingPaymentIntentId,
  onReconcile
}: {
  payments: AdminPaymentsOverviewResponse;
  reconcilingPaymentIntentId?: string | null;
  onReconcile: (paymentIntentId: string) => Promise<void>;
}) {
  const paystackIntents = payments.latestPaymentIntents.filter((intent) => intent.rail === "paystack");

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow !text-[color:var(--label3)]">Paystack operations</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--label)]">
            Subscription lifecycle window
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Reconcile only rechecks Paystack through the existing Super Admin route. It does not
            issue refunds, payouts, withdrawals, or workspace-side access grants.
          </p>
        </div>
        <Badge tone={payments.paystack.configured ? "green" : "amber"}>
          {payments.paystack.mode} mode
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatChip
          label="Recent intents"
          value={String(payments.opsSummary.latestIntentCount)}
          detail="bounded window"
          tone="accent"
        />
        <StatChip
          label="Verified Paystack"
          value={String(payments.opsSummary.verifiedPaystackCount)}
          detail="recent window"
          tone="green"
        />
        <StatChip
          label="Last amount"
          value={payments.opsSummary.latestAmountNgn ? formatNgn(payments.opsSummary.latestAmountNgn) : "No checkout"}
          detail={payments.opsSummary.latestRail ? formatStatusLabel(payments.opsSummary.latestRail) : undefined}
        />
      </div>

      {(payments.warnings ?? []).map((warning) => (
        <p key={warning} className="break-words text-sm leading-6 text-[color:var(--label2)]">
          {warning}
        </p>
      ))}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Recent payment intents</p>
          <Badge tone="neutral">{paystackIntents.length} Paystack</Badge>
        </div>
        {paystackIntents.length === 0 ? (
          <p className="rounded-[18px] border border-[color:var(--line)] p-4 text-sm leading-6 text-[color:var(--label2)]">
            No Paystack intents in the latest bounded feed yet.
          </p>
        ) : (
          <div className="bounded-list-4 space-y-3">
            {paystackIntents.slice(0, 6).map((intent) => (
              <div
                key={intent.paymentIntentId}
                className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_34%,transparent)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-semibold text-[color:var(--label)]">
                      {maskOpsReference(intent.paymentIntentId, "intent")}
                    </p>
                    <p className="mt-1 break-all text-xs leading-5 text-[color:var(--label3)]">
                      Ref: {maskOpsReference(intent.paystackReference, "payref")} · Workspace: {maskOpsReference(intent.workspaceId, "ws")} · Student: {maskOpsReference(intent.studentId, "student")}
                    </p>
                  </div>
                  <Badge tone={statusTone(intent.status)}>{formatStatusLabel(intent.status)}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[color:var(--label)]">{formatNgn(intent.amountNgn)}</p>
                  <Button
                    onClick={() => onReconcile(intent.paymentIntentId)}
                    variant={intent.status === "verified" ? "secondary" : "primary"}
                    size="sm"
                    disabled={reconcilingPaymentIntentId === intent.paymentIntentId}
                  >
                    {reconcilingPaymentIntentId === intent.paymentIntentId
                      ? "Rechecking..."
                      : intent.status === "verified"
                        ? "Audit recheck"
                        : "Request recheck"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-[color:var(--label)]">Recent webhook receipts</p>
        {payments.latestWebhookReceipts.length === 0 ? (
          <p className="rounded-[18px] border border-[color:var(--line)] p-4 text-sm leading-6 text-[color:var(--label2)]">
            No Paystack webhook receipts have been recorded yet. Localhost cannot receive live Paystack webhooks
            unless exposed through a public tunnel.
          </p>
        ) : (
          <div className="bounded-list-4 space-y-2">
            {payments.latestWebhookReceipts.slice(0, 5).map((receipt) => (
              <div
                key={receipt.eventId}
                className="rounded-[16px] border border-[color:var(--line)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all text-xs font-semibold text-[color:var(--label)]">
                    {receipt.event}
                  </p>
                  <Badge tone={receipt.processed ? "green" : receipt.duplicate ? "amber" : "neutral"}>
                    {receipt.processed ? "Processed" : receipt.duplicate ? "Duplicate" : "Recorded"}
                  </Badge>
                </div>
                <p className="mt-1 break-all text-xs leading-5 text-[color:var(--label3)]">
                  {maskOpsReference(receipt.reference ?? receipt.subscriptionCode ?? receipt.invoiceCode ?? receipt.eventId, "receipt")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
