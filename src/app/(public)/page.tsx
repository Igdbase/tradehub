import Link from "next/link";
import { ApplicationForm } from "@/components/marketing/application-form";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { PaymentModel } from "@/components/marketing/payment-model";
import { PropFirmSafety } from "@/components/marketing/prop-firm-safety";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { buildMetadata } from "@/config/app";
import { mockApplications, mockWorkspaces } from "@/data";
import {
  formatCompactNumber,
  formatCurrencyNgn,
  getDefaultWorkspace,
  getHomeMetrics,
  getPlatformOverview
} from "@/lib/mock-selectors";

export const metadata = buildMetadata({
  title: "White-Label Platform for Trading Educators",
  description:
    "TradeHub is a premium influencer-facing landing page for a white-label course, signals, and journal platform with Paystack-first checkout and prop-firm-aware signal routing.",
  pathname: "/"
});

const problemCards = [
  {
    title: "Telegram and WhatsApp get fragile fast",
    body:
      "Manual transfers, screenshots, pirated forwards, and back-and-forth access requests make a paid audience feel messy long before the educator is actually ready to scale."
  },
  {
    title: "Generic course tools are not trading-native",
    body:
      "Most platforms can host lessons, but they do not understand signals, recurring paid communities, or the difference between a trading student and a normal content subscriber."
  },
  {
    title: "Generic signal bots can create prop-firm risk",
    body:
      "Treating every student account like it is safe to auto-execute is exactly how a serious educator inherits unnecessary trust, compliance, and reputation problems."
  }
] as const;

const offerCards = [
  {
    title: "Course Hub",
    body:
      "Structured lessons, tier-aware access, and premium student delivery that feels branded from the first lesson to the final replay.",
    proof: "Recurring memberships replace one-off link drops."
  },
  {
    title: "Trade Signals",
    body:
      "Signal Alerts and Auto-Copy live in one product, but they do not route every student into the same execution path.",
    proof: "Built to protect funded-account students from the wrong flow."
  },
  {
    title: "Trading Journal",
    body:
      "Students get a serious review surface with trade notes, patterns, and accountability instead of disappearing after the first purchase.",
    proof: "Journal and progress data later feed retention and coaching decisions."
  }
] as const;

const segmentCards = [
  {
    title: "Telegram signal seller",
    body:
      "Already charging for signals but still relying on manual collection, brittle channels, and zero recurring product structure."
  },
  {
    title: "Course-only educator",
    body:
      "Owns the audience and content already, but needs a recurring home that feels more serious than a standalone video checkout."
  },
  {
    title: "Prop-firm mentor",
    body:
      "Coaches funded-account students and needs a platform that respects the difference between alerts and automatic execution."
  },
  {
    title: "Crypto trader",
    body:
      "Wants local payments by default, with optional Solana Pay / USDC checkout when the audience and operator approval make it worthwhile."
  }
] as const;

const steps = [
  {
    step: "01",
    title: "Apply",
    body:
      "Share your audience, your market, how your students trade, and what you want to launch."
  },
  {
    step: "02",
    title: "Vetting call",
    body:
      "We review audience quality, account-type mix, launch fit, and whether the payment rails make sense for your market."
  },
  {
    step: "03",
    title: "Workspace setup",
    body:
      "Branding, code of conduct, pricing, local checkout, and optional approved crypto rail are configured in a guided flow."
  },
  {
    step: "04",
    title: "Launch to students",
    body:
      "Your student invite route stays handle-based and separate from your workspace controls so the brand stays clean."
  }
] as const;

const reviewItems = [
  "Identity and audience proof before activation",
  "Whether your students are mostly personal, prop-firm, or mixed",
  "Which of courses, signals, mentorship, and community you want live first",
  "Whether Paystack alone is enough or Solana Pay / USDC should be reviewed later"
] as const;

export default function HomePage() {
  const overview = getPlatformOverview();
  const homeMetrics = getHomeMetrics();
  const featuredWorkspace = getDefaultWorkspace();
  const paystackEnabledWorkspaces = mockWorkspaces.filter((workspace) =>
    workspace.rails.some((rail) => rail.rail === "paystack" && rail.status === "enabled")
  ).length;
  const approvedSolanaWorkspaces = mockWorkspaces.filter((workspace) => workspace.solanaPayEnabled).length;
  const solanaInterestedApplications = mockApplications.filter(
    (application) => application.solanaPayInterest
  ).length;
  const propAwareApplications = mockApplications.filter((application) =>
    ["prop_firm", "both"].includes(application.studentAccountMix)
  ).length;
  const audienceExamples = mockApplications
    .slice(0, 3)
    .map((application) => application.handleOrChannel)
    .join(", ");

  return (
    <div className="space-y-12 pb-4">
      <MarketingHero
        activeWorkspaces={overview.activeWorkspaces}
        activeSubscribersLabel={formatCompactNumber(overview.activeSubscribers)}
        monthlyRevenueLabel={formatCurrencyNgn(overview.monthlyRevenueNgn)}
        paystackVerifiedCount={overview.paymentTotals.paystack.verifiedCount}
        approvedSolanaWorkspaces={approvedSolanaWorkspaces}
        featuredWorkspaceName={featuredWorkspace.name}
        featuredWorkspaceHandle={featuredWorkspace.handle}
        featuredWorkspaceSummary={featuredWorkspace.summary}
      />

      <MarketingSection
        eyebrow="The problem"
        title="Manual trading businesses leak trust in all the places serious students can feel."
        description="TradeHub is built for educators who already know their content works, but want a branded operating system that does not fall apart at checkout, onboarding, or signal delivery."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {problemCards.map((card) => (
            <GlassCard key={card.title} padding="lg" interactive className="rounded-[28px]">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
                {card.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[color:var(--label2)]">{card.body}</p>
            </GlassCard>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        id="what-you-get"
        eyebrow="What you get"
        title="A trading-native platform that hides our brand and strengthens yours."
        description="Courses, signals, journal accountability, and checkout all live in one polished student experience instead of four disconnected tools."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {offerCards.map((card) => (
            <GlassCard key={card.title} padding="lg" interactive className="rounded-[28px]">
              <Badge tone="accent">{card.title}</Badge>
              <p className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
                {card.body}
              </p>
              <p className="mt-4 text-sm leading-7 text-[color:var(--label2)]">{card.proof}</p>
            </GlassCard>
          ))}
        </div>

        <GlassCard padding="lg" className="rounded-[28px]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow">Public proof points</p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[color:var(--label)]">
                The current mock layer already carries real-looking platform proof without exposing
                sensitive operator data.
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--label2)]">
                {overview.activeWorkspaces} active workspaces, {formatCompactNumber(homeMetrics.subscribers)} active
                subscribers, {homeMetrics.activeSignals} active signal stream
                {homeMetrics.activeSignals === 1 ? "" : "s"}, and {formatCurrencyNgn(overview.monthlyRevenueNgn)} in
                aggregate monthly GMV all stay publicly safe and ready for future backend wiring.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[24rem]">
              <StatChip label="Vetted workspaces" value={String(overview.activeWorkspaces)} tone="green" />
              <StatChip label="Open pipeline" value={String(overview.openApplications)} tone="amber" />
            </div>
          </div>
        </GlassCard>
      </MarketingSection>

      <MarketingSection
        id="safety"
        eyebrow="Safety"
        title="The biggest differentiator is understanding the funded-account edge case before it becomes a support disaster."
        description="Personal live-account students can look very different from funded-account students. TradeHub exposes that split clearly instead of burying it."
      >
        <PropFirmSafety
          activeSignalCount={homeMetrics.activeSignals}
          propAwareApplications={propAwareApplications}
        />
      </MarketingSection>

      <MarketingSection
        title="Built for the educator segments we actually expect to onboard."
        description="The platform promise stays the same, but the pain that convinces each segment is different."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {segmentCards.map((card) => (
            <GlassCard key={card.title} padding="lg" interactive className="rounded-[28px]">
              <p className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--label)]">
                {card.title}
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--label2)]">{card.body}</p>
            </GlassCard>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        id="model"
        eyebrow="Commercial model"
        title="Local rails first, optional crypto checkout second, and a revenue model that tracks student payments."
        description="Paystack is the default for local checkout. Solana Pay / USDC is optional for approved workspaces and crypto-friendly audiences, not the headline act."
      >
        <PaymentModel
          monthlyRevenueLabel={formatCurrencyNgn(overview.monthlyRevenueNgn)}
          paystackEnabledWorkspaces={paystackEnabledWorkspaces}
          verifiedPaystackPayments={overview.paymentTotals.paystack.verifiedCount}
          solanaApprovedWorkspaces={approvedSolanaWorkspaces}
          solanaInterestedApplications={solanaInterestedApplications}
        />
      </MarketingSection>

      <MarketingSection
        id="how-it-works"
        eyebrow="How it works"
        title="This is a high-touch launch path, not an instant self-serve signup."
        description="Every workspace is reviewed before it goes live. That is part of the trust model, not a growth bottleneck."
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {steps.map((item) => (
            <GlassCard key={item.step} padding="lg" interactive className="rounded-[28px]">
              <Badge tone="neutral">{item.step}</Badge>
              <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[color:var(--label2)]">{item.body}</p>
            </GlassCard>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        id="apply"
        eyebrow="Apply"
        title="Apply for a workspace"
        description="This form collects realistic Stage 04 onboarding data, validates locally, and shows the exact frontend-only handoff state Prompt 05 can later connect to auth and backend persistence."
      >
        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-5">
            <GlassCard padding="lg" className="rounded-[28px]">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow">What we review</p>
                <Badge tone="green">Manual approval first</Badge>
              </div>
              <div className="mt-5 space-y-3">
                {reviewItems.map((item) => (
                  <p
                    key={item}
                    className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_72%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </GlassCard>

            <GlassCard padding="lg" className="rounded-[28px]">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow">Route separation</p>
                <Badge tone="accent">Student-safe</Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-[color:var(--label2)]">
                The influencer application lives here on <span className="text-[color:var(--label)]">/</span>.
                Student entry still stays on the handle-based invite route so a learner never lands in
                the workspace owner flow by mistake.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button href="/join/apexfx" variant="secondary">
                  Preview /join/apexfx
                </Button>
                <Button href="/design-system" variant="ghost">
                  Design system proof
                </Button>
              </div>
            </GlassCard>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatChip
                label="Application examples"
                value={String(mockApplications.length)}
                detail={audienceExamples}
                tone="accent"
              />
              <StatChip
                label="Avg. audience proof"
                value={formatCompactNumber(
                  Math.round(
                    mockApplications.reduce((total, application) => total + application.audienceSize, 0) /
                      mockApplications.length
                  )
                )}
                detail="Across the current typed application set"
                tone="green"
              />
            </div>
          </div>

          <ApplicationForm />
        </div>
      </MarketingSection>

      <section className="scroll-mt-32 rounded-[32px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_74%,transparent)] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <Badge tone="neutral">Risk-aware positioning</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
              Serious trading education infrastructure, without promising trading results.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--label2)]">
              TradeHub helps vetted educators launch branded learning, signals, and journal workflows.
              It does not guarantee outcomes, bypass prop-firm rules, or replace student judgment.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/privacy" variant="secondary">
              Privacy
            </Button>
            <Button href="/risk-disclosure" variant="ghost">
              Risk disclosure
            </Button>
            <Link href="/terms" className="nav-chip">
              Terms
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
