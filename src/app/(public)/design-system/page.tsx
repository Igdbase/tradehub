import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { HeroCard } from "@/components/ui/hero-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatChip } from "@/components/ui/stat-chip";
import { TabBar } from "@/components/ui/tab-bar";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Design System Preview",
  description: "Stage 02 visual proof route for the locked TradeHub design system.",
  pathname: "/design-system"
});

const previewTabs = [
  {
    label: "Home",
    active: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="m3 10.5 9-7 9 7v9a1.5 1.5 0 0 1-1.5 1.5h-3.75V14h-7.5v7H4.5A1.5 1.5 0 0 1 3 19.5Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    label: "Courses",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M4.5 6.5h15v11h-15ZM8 10l4 2.5L16 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    label: "Signals",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M5 18.5h14M7.5 15.5 12 5.5l4.5 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    label: "Journal",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M6 5.5h9a3 3 0 0 1 3 3v10h-9a3 3 0 0 0-3 3ZM6 5.5v16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
];

function ThemePreview({
  title,
  mode
}: {
  title: string;
  mode: "dark" | "light";
}) {
  return (
    <div
      data-theme-surface={mode}
      className="rounded-[32px] border border-[color:var(--line)] bg-[color:var(--bg)] p-5 text-[color:var(--label)] shadow-[0_24px_50px_-34px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{title}</p>
        <Badge tone="accent" variant="outline">
          {mode}
        </Badge>
      </div>
      <div className="mt-4 space-y-4">
        <HeroCard
          label="Portfolio balance"
          value="$18,420"
          change="+7.4% this month"
          badge={<Badge tone="accent">Elite</Badge>}
          animated={false}
        >
          <div className="grid grid-cols-2 gap-3">
            <StatChip label="Win rate" value="64%" tone="green" />
            <StatChip label="Signals" value="3 live" tone="accent" />
          </div>
        </HeroCard>

        <GlassCard className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">Accent</Badge>
            <Badge tone="green">Positive</Badge>
            <Badge tone="amber">Warning</Badge>
            <Badge tone="red">Risk</Badge>
          </div>
          <ProgressBar label="Course progress" value={72} showValue />
          <div className="grid grid-cols-2 gap-3">
            <StatChip label="Typography" value="Tabular nums" tone="accent" />
            <StatChip label="Glass depth" value="Locked" tone="green" />
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" fullWidth>
            Primary CTA
          </Button>
          <Button variant="secondary" fullWidth>
            Secondary
          </Button>
        </div>

        <TabBar items={previewTabs} />
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-7 sm:px-8 sm:py-9">
        <SectionHeading
          eyebrow="Visual proof route"
          title="This is the fastest place to confirm Stage 02 is working."
          description="Use the header theme toggle for live app-wide switching, or compare the dark and light locked-theme panels below side by side. This route intentionally exposes the primitives Prompt 03 will build on."
          action={
            <>
              <Button href="/" variant="primary">
                Back to landing
              </Button>
              <Button href="/app" variant="secondary">
                Open student shell
              </Button>
            </>
          }
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ThemePreview title="Dark theme proof" mode="dark" />
        <ThemePreview title="Light theme proof" mode="light" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <GlassCard className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow !text-[color:var(--label3)]">Component coverage</p>
            <Badge tone="green">Reusable</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatChip label="Hero card" value="Active" tone="accent" />
            <StatChip label="Glass card" value="Active" tone="green" />
            <StatChip label="Badges" value="Active" tone="accent" />
            <StatChip label="Tab bar" value="Active" tone="green" />
          </div>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            The route pages now consume these primitives instead of relying on one-off layout styling.
          </p>
        </GlassCard>

        <GlassCard className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow !text-[color:var(--label3)]">How to prove it</p>
            <Badge tone="accent">Live checks</Badge>
          </div>
          <div className="space-y-4 text-sm leading-6 text-[color:var(--label2)]">
            <p>1. Run `npm run dev`.</p>
            <p>2. Open `/design-system` and compare both preview panels.</p>
            <p>3. Toggle the header theme switch to see the live app chrome change.</p>
            <p>4. Refresh `/admin`, `/workspace`, `/workspace/onboarding`, and `/app` to confirm the system is shared across routes.</p>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
