"use client";

import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { formatCurrencyNgn } from "@/lib/mock-selectors";
import type { AdminPaymentSupportQueueItem, AdminPaymentsOverviewResponse } from "@/types/payments";

function formatUsdc(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(6)} USDC` : undefined;
}

function severityTone(severity: AdminPaymentSupportQueueItem["severity"]) {
  if (severity === "high") {
    return "red" as const;
  }

  if (severity === "medium") {
    return "amber" as const;
  }

  return "neutral" as const;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

export function PaymentSupportQueue({
  payments
}: {
  payments: AdminPaymentsOverviewResponse;
}) {
  const queue = payments.paymentSupportQueue;

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Stage 20C payment support</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            Reconciliation support queue
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Bounded, masked queue for payment support triage. It does not expose raw Paystack
            references, webhook payloads, Solana signatures, wallet addresses, customer IDs,
            authorization data, or provider metadata.
          </p>
        </div>
        <Badge tone={queue.length ? "amber" : "green"}>
          {queue.length ? "Review needed" : "No queue items"}
        </Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <StatChip label="Queue items" value={String(payments.opsSummary.paymentSupportQueueCount)} tone={queue.length ? "amber" : "green"} />
        <StatChip label="Paystack pending" value={String(payments.opsSummary.pendingPaystackVerificationCount)} tone="amber" />
        <StatChip label="Failed verify" value={String(payments.opsSummary.failedVerificationCount)} tone="red" />
        <StatChip label="Stale pending" value={String(payments.opsSummary.stalePendingIntentCount)} tone="amber" />
        <StatChip label="Mismatch" value={String(payments.opsSummary.subscriptionMismatchCount)} tone="red" />
      </div>

      {queue.length === 0 ? (
        <p className="rounded-[18px] border border-[color:var(--line)] p-4 text-sm leading-6 text-[color:var(--label2)]">
          No payment support queue items in the latest bounded admin window. Student checkout,
          verification, and entitlement behavior are unchanged.
        </p>
      ) : (
        <div className="bounded-list-4 space-y-3">
          {queue.map((item) => (
            <article
              key={item.queueItemId}
              className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_34%,transparent)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{item.issueLabel}</p>
                  <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                    {item.safePaymentRef} · Workspace {item.maskedWorkspaceRef}
                    {item.maskedStudentRef ? ` · Student ${item.maskedStudentRef}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Badge tone={severityTone(item.severity)}>{item.severity}</Badge>
                  <Badge tone="neutral">{item.rail}</Badge>
                  <Badge tone="neutral">{item.statusLabel}</Badge>
                </div>
              </div>

              <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(145px,1fr))]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Amount</p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--label)]">
                    {typeof item.amountNgn === "number" ? formatCurrencyNgn(item.amountNgn) : "N/A"}
                  </p>
                  {formatUsdc(item.amountUsdc) ? (
                    <p className="text-xs text-[color:var(--label3)]">{formatUsdc(item.amountUsdc)}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Created</p>
                  <p className="mt-1 text-sm text-[color:var(--label2)]">{formatDate(item.createdAt)}</p>
                </div>
              </div>

              <p className="break-safe mt-3 text-xs leading-5 text-[color:var(--label2)]">{item.supportCopy}</p>
              <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label3)]">{item.actionHint}</p>
            </article>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
