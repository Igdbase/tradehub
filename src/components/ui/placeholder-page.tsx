import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatChip } from "@/components/ui/stat-chip";
import { appConfig } from "@/config/app";
import type { DetailItem, MetricItem, RoadmapItem } from "@/types/tradehub";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: MetricItem[];
  highlightsTitle: string;
  highlights: DetailItem[];
  roadmapTitle: string;
  roadmap: RoadmapItem[];
  asideTitle: string;
  asideBody: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  metrics,
  highlightsTitle,
  highlights,
  roadmapTitle,
  roadmap,
  asideTitle,
  asideBody,
  ctaHref,
  ctaLabel
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.82fr)]">
        <div className="hero-panel px-6 py-7 sm:px-8 sm:py-9">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
            action={
              ctaHref && ctaLabel ? (
                <>
                  <Button href={ctaHref} variant="primary">
                    {ctaLabel}
                  </Button>
                  <Button href="/design-system" variant="secondary">
                    Preview system
                  </Button>
                </>
              ) : undefined
            }
          />

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <StatChip
                key={metric.label}
                label={metric.label}
                value={metric.value}
                tone={metric.tone ?? "neutral"}
              />
            ))}
          </div>
        </div>

        <GlassCard className="h-full">
          <p className="eyebrow !text-[color:var(--label3)]">{asideTitle}</p>
          <p className="mt-4 text-sm leading-6 text-[color:var(--label2)]">{asideBody}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="accent" uppercase>
              {appConfig.stage}
            </Badge>
            <Badge tone="neutral">Reusable components active</Badge>
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <p className="eyebrow !text-[color:var(--label3)]">{highlightsTitle}</p>
          <div className="mt-5 space-y-5">
            {highlights.map((item) => (
              <div key={item.title}>
                <h2 className="text-base font-semibold tracking-[-0.02em] text-[color:var(--label)]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">{item.body}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="eyebrow !text-[color:var(--label3)]">{roadmapTitle}</p>
          <div className="mt-5 space-y-5">
            {roadmap.map((item) => (
              <div key={`${item.label}-${item.prompt}`}>
                <div className="flex items-center gap-3">
                  <Badge tone="neutral">{item.label}</Badge>
                  <span className="text-sm font-semibold text-[color:var(--accent)]">{item.prompt}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
