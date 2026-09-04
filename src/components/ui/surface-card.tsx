import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { SurfaceCardItem } from "@/types/tradehub";

const surfaceLabelMap: Record<SurfaceCardItem["surface"], string> = {
  public: "Public",
  "super-admin": "Owner",
  influencer: "Workspace",
  student: "Student"
};

const surfaceProgressMap: Record<SurfaceCardItem["surface"], number> = {
  public: 48,
  "super-admin": 38,
  influencer: 44,
  student: 42
};

export function SurfaceCard({ item }: { item: SurfaceCardItem }) {
  return (
    <Link href={item.href} className="focus-ring group block rounded-[24px]">
      <GlassCard interactive className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{item.label}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
              {item.title}
            </h2>
          </div>
          <Badge tone="accent" variant="outline" uppercase>
            {surfaceLabelMap[item.surface]}
          </Badge>
        </div>

        <p className="mt-4 text-sm leading-6 text-[color:var(--label2)]">{item.description}</p>

        <div className="mt-6 space-y-4">
          <ProgressBar
            label="Design readiness"
            showValue
            value={surfaceProgressMap[item.surface]}
            tone="accent"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="max-w-md text-xs leading-5 text-[color:var(--label3)]">{item.prompt}</p>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] text-[color:var(--label2)] transition group-hover:border-[color:var(--accent)] group-hover:text-[color:var(--accent)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
