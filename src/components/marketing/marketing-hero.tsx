import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { HeroCard } from "@/components/ui/hero-card";
import { StatChip } from "@/components/ui/stat-chip";

export function MarketingHero({
  activeWorkspaces,
  activeSubscribersLabel,
  monthlyRevenueLabel,
  paystackVerifiedCount,
  approvedSolanaWorkspaces,
  featuredWorkspaceName,
  featuredWorkspaceHandle,
  featuredWorkspaceSummary
}: {
  activeWorkspaces: number;
  activeSubscribersLabel: string;
  monthlyRevenueLabel: string;
  paystackVerifiedCount: number;
  approvedSolanaWorkspaces: number;
  featuredWorkspaceName: string;
  featuredWorkspaceHandle: string;
  featuredWorkspaceSummary: string;
}) {
  return (
    <section className="grid gap-8 pb-4 pt-2 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
      <div className="space-y-6">
        <Badge tone="accent" uppercase>
          Vetted onboarding for trading educators
        </Badge>

        <div className="space-y-5">
          <h1 className="section-title max-w-4xl text-[color:var(--label)]">
            Your platform.
            <br />
            Your brand.
            <br />
            Your students never see ours.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[color:var(--label2)] sm:text-[1.02rem]">
            TradeHub gives trading educators a fully branded course, signals, and journal platform
            they can launch in days, with Paystack and local checkout by default, optional Solana
            Pay / USDC support for approved workspaces, and prop-firm-safe signal routing built in.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button href="/#apply" variant="primary" size="lg">
            Apply for a workspace
          </Button>
          <Button href="/#how-it-works" variant="secondary" size="lg">
            See how it works
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <GlassCard padding="sm" className="rounded-[20px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Days, not months
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              Launch a serious branded workspace without hiring a product team first.
            </p>
          </GlassCard>
          <GlassCard padding="sm" className="rounded-[20px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Pay only when you earn
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              Paystack splits can settle automatically, with the default 90 / 10 model kept
              negotiable.
            </p>
          </GlassCard>
          <GlassCard padding="sm" className="rounded-[20px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Built around prop rules
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              Personal live accounts and funded students are not treated like the same risk.
            </p>
          </GlassCard>
        </div>
      </div>

      <div className="space-y-4">
        <HeroCard
          label="Mock pilot gross volume"
          value={monthlyRevenueLabel}
          badge={<Badge tone="accent">Live platform proof</Badge>}
          change={`${activeWorkspaces} vetted workspace${activeWorkspaces === 1 ? "" : "s"} active`}
          sparkline={[14, 18, 17, 24, 29, 31, 36]}
          className="min-h-[22rem]"
        >
          <div className="space-y-3">
            <GlassCard padding="sm" tone="high" className="rounded-[22px]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Featured workspace
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">
                    {featuredWorkspaceName}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--accent)]">@{featuredWorkspaceHandle}</p>
                </div>
                <Badge tone="green">Approved</Badge>
              </div>
              <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--label2)]">
                {featuredWorkspaceSummary}
              </p>
            </GlassCard>

            <div className="grid gap-3 sm:grid-cols-2">
              <GlassCard padding="sm" className="rounded-[20px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  Personal live accounts
                </p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--green)]">
                  Auto-Copy where allowed
                </p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                  Keep the convenience for eligible students without pushing it into every account
                  type.
                </p>
              </GlassCard>

              <GlassCard padding="sm" className="rounded-[20px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  Funded / prop-firm accounts
                </p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--amber)]">
                  Signal Alerts only
                </p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                  Routing stays aligned with prop-firm sensitivity instead of pretending every
                  student can auto-execute.
                </p>
              </GlassCard>
            </div>
          </div>
        </HeroCard>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatChip
            label="Active subscribers"
            value={activeSubscribersLabel}
            detail="Across the current mock workspaces"
          />
          <StatChip
            label="Verified local payments"
            value={String(paystackVerifiedCount)}
            detail="Paystack remains the default rail"
            tone="green"
          />
          <StatChip
            label="Approved Solana rails"
            value={String(approvedSolanaWorkspaces)}
            detail="Only enabled where the workspace is approved"
            tone="accent"
          />
        </div>
      </div>
    </section>
  );
}
