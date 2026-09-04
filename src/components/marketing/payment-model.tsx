import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { HeroCard } from "@/components/ui/hero-card";

function RailRow({
  label,
  detail,
  tone
}: {
  label: string;
  detail: string;
  tone: "green" | "accent" | "amber";
}) {
  const toneClasses = {
    green: {
      dot: "bg-[color:var(--green)]",
      text: "text-[color:var(--green)]"
    },
    accent: {
      dot: "bg-[color:var(--accent)]",
      text: "text-[color:var(--accent)]"
    },
    amber: {
      dot: "bg-[color:var(--amber)]",
      text: "text-[color:var(--amber)]"
    }
  } as const;

  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] p-4">
      <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 rounded-full ${toneClasses[tone].dot}`} />
      <div>
        <p className={`text-sm font-semibold ${toneClasses[tone].text}`}>{label}</p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">{detail}</p>
      </div>
    </div>
  );
}

export function PaymentModel({
  monthlyRevenueLabel,
  paystackEnabledWorkspaces,
  verifiedPaystackPayments,
  solanaApprovedWorkspaces,
  solanaInterestedApplications
}: {
  monthlyRevenueLabel: string;
  paystackEnabledWorkspaces: number;
  verifiedPaystackPayments: number;
  solanaApprovedWorkspaces: number;
  solanaInterestedApplications: number;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.02fr_0.98fr] lg:items-stretch">
      <HeroCard
        label="Default platform split"
        value="90 / 10"
        badge={<Badge tone="accent">Negotiable by agreement</Badge>}
        change="Pay only when students pay"
        className="min-h-[22rem]"
        sparkline={[10, 12, 17, 19, 25, 28, 32]}
      >
        <div className="space-y-3">
          <p className="max-w-xl text-sm leading-7 text-[color:var(--label2)]">
            The core model stays simple: educators keep the brand, checkout runs through local rails
            by default, and platform economics follow student revenue rather than an upfront SaaS
            subscription.
          </p>
          <GlassCard padding="sm" tone="high" className="rounded-[22px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Current mock pilot GMV
            </p>
            <p className="tabular-nums mt-3 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
              {monthlyRevenueLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              Public proof stays aggregate and non-sensitive, ready for real reporting later without
              leaking internal notes.
            </p>
          </GlassCard>
        </div>
      </HeroCard>

      <div className="grid gap-4">
        <GlassCard padding="lg" className="rounded-[28px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Checkout rails</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
                Nigeria-first by default, crypto-friendly when approved.
              </h3>
            </div>
            <Badge tone="green">Operator-reviewed</Badge>
          </div>

          <div className="mt-6 space-y-3">
            <RailRow
              label="Paystack local checkout"
              detail={`${paystackEnabledWorkspaces} mock workspace${paystackEnabledWorkspaces === 1 ? "" : "s"} use Paystack as the baseline rail, with ${verifiedPaystackPayments} verified local payment${verifiedPaystackPayments === 1 ? "" : "s"} already represented in the mock layer.`}
              tone="green"
            />
            <RailRow
              label="Solana Pay / USDC"
              detail={`${solanaApprovedWorkspaces} approved workspace${solanaApprovedWorkspaces === 1 ? "" : "s"} currently show the optional Solana rail, and ${solanaInterestedApplications} in-pipeline application${solanaInterestedApplications === 1 ? "" : "s"} explicitly asked about it.`}
              tone="accent"
            />
            <RailRow
              label="No bolted-on crypto theater"
              detail="Solana appears as an approved checkout option or partner cue, not as the headline promise or a mandatory rail."
              tone="amber"
            />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
