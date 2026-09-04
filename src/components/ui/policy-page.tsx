import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { footerNav } from "@/lib/routes";
import type { PolicySection } from "@/types/tradehub";

type PolicyPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: PolicySection[];
  note: string;
};

const scopePoints = [
  "Workspace and role access stay claim-scoped.",
  "Paystack remains the default rail; Solana stays optional and reviewed.",
  "Journal visibility is summary-first and private by default.",
  "Operator review can apply to onboarding, billing, disputes, and trust/safety handling."
] as const;

export function PolicyPage({
  eyebrow,
  title,
  summary,
  sections,
  note
}: PolicyPageProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <div className="hero-panel px-6 py-7 sm:px-8 sm:py-9">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={summary}
            action={
              <>
                <Button href="/" variant="secondary">
                  Back home
                </Button>
                <Button href="/#apply" variant="ghost">
                  Apply now
                </Button>
              </>
            }
          />
        </div>

        <GlassCard className="space-y-5">
          <p className="eyebrow !text-[color:var(--label3)]">Current MVP scope</p>
          <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">{note}</p>
          <div className="policy-meta-list">
            {scopePoints.map((point) => (
              <div key={point} className="policy-meta-item">
                <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">{point}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {footerNav.map((item) => (
              <Button key={item.href} href={item.href} variant="ghost" size="sm" className="px-3">
                {item.label}
              </Button>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="policy-grid md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <GlassCard key={section.title} className="policy-section-card">
            <h2 className="text-balance text-lg font-semibold tracking-[-0.03em] text-[color:var(--label)]">
              {section.title}
            </h2>
            <p className="mt-3 break-safe text-sm leading-6 text-[color:var(--label2)]">{section.body}</p>
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
