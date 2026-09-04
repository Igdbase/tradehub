import { StatChip } from "@/components/ui/stat-chip";
import { formatCurrencyNgn, formatCurrencyUsd } from "@/lib/mock-selectors";
import type { PlatformSummary } from "@/types/admin-api";

export function AdminStatGrid({ summary }: { summary: PlatformSummary }) {
  const stats = [
    { label: "Active workspaces", value: String(summary.activeWorkspaceCount), tone: "green" as const },
    { label: "Active students", value: String(summary.activeStudentCount), tone: "accent" as const },
    { label: "Gross revenue", value: formatCurrencyNgn(summary.monthlyGrossRevenueNgn), tone: "green" as const },
    {
      label: "Platform revenue",
      value: formatCurrencyNgn(summary.monthlyPlatformRevenueNgn),
      tone: "accent" as const
    },
    { label: "Paystack volume", value: formatCurrencyNgn(summary.paystackVolumeNgn), tone: "green" as const },
    { label: "Solana volume", value: formatCurrencyUsd(summary.solanaVolumeUsdc), tone: "accent" as const },
    { label: "Pending apps", value: String(summary.pendingApplicationCount), tone: "amber" as const },
    { label: "Open disputes", value: String(summary.openDisputeCount), tone: "amber" as const },
    { label: "Risk flags", value: String(summary.riskFlagCount), tone: "amber" as const }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <StatChip key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />
      ))}
    </section>
  );
}
