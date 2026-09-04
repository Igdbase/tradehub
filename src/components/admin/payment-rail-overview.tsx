import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { formatCurrencyNgn, formatCurrencyUsd } from "@/lib/mock-selectors";
import type { AdminOverviewResponse } from "@/types/admin-api";

export function PaymentRailOverview({
  paymentRails
}: {
  paymentRails: AdminOverviewResponse["paymentRails"];
}) {
  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow !text-[color:var(--label3)]">Payment rail overview</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">
            Paystack first, Solana optional.
          </h2>
        </div>
        <Badge tone="neutral">View only</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatChip
          label={paymentRails.paystack.label}
          value={formatCurrencyNgn(paymentRails.paystack.volumeNgn)}
          tone="green"
        />
        <StatChip
          label={paymentRails.solana.label}
          value={formatCurrencyUsd(paymentRails.solana.volumeUsdc)}
          tone="accent"
        />
        <StatChip
          label="Verified Paystack records"
          value={String(paymentRails.paystack.verifiedCount)}
          tone="green"
        />
        <StatChip
          label="Verified Solana records"
          value={String(paymentRails.solana.verifiedCount)}
          tone="accent"
        />
      </div>

      <p className="text-sm leading-6 text-[color:var(--label2)]">
        Paystack remains the default rail. Verified Solana checkout can now create settlement-ledger
        records for admin payout ops without pretending automatic on-chain splits already exist.
      </p>
    </GlassCard>
  );
}
