import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";

function SafetyBullet({
  tone,
  children
}: {
  tone: "green" | "amber";
  children: string;
}) {
  return (
    <li className="flex items-start gap-3 text-sm leading-6 text-[color:var(--label2)]">
      <span
        aria-hidden="true"
        className={
          tone === "green"
            ? "mt-2 h-2.5 w-2.5 rounded-full bg-[color:var(--green)]"
            : "mt-2 h-2.5 w-2.5 rounded-full bg-[color:var(--amber)]"
        }
      />
      <span>{children}</span>
    </li>
  );
}

export function PropFirmSafety({
  activeSignalCount,
  propAwareApplications
}: {
  activeSignalCount: number;
  propAwareApplications: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard padding="lg" tone="high" className="rounded-[28px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge tone="green">Personal account pathway</Badge>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
                Auto-Copy can exist where it is actually appropriate.
              </h3>
            </div>
            <span className="rounded-full border border-[color:var(--green)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--green)]">
              Eligible
            </span>
          </div>

          <ul className="mt-6 space-y-3">
            <SafetyBullet tone="green">
              Personal live-account students can reach Auto-Copy only when the workspace and venue
              allow it.
            </SafetyBullet>
            <SafetyBullet tone="green">
              Signal Alerts still remain available for students who prefer manual execution.
            </SafetyBullet>
            <SafetyBullet tone="green">
              Routing keeps the experience trading-native instead of bolting signals onto a generic
              course page.
            </SafetyBullet>
          </ul>
        </GlassCard>

        <GlassCard padding="lg" tone="high" className="rounded-[28px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge tone="amber">Funded / prop-firm pathway</Badge>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
                Signal Alerts only, so the workflow respects prop-firm risk.
              </h3>
            </div>
            <span className="rounded-full border border-[color:var(--amber)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--amber)]">
              Guarded
            </span>
          </div>

          <ul className="mt-6 space-y-3">
            <SafetyBullet tone="amber">
              No automatic execution path is shown for funded-account students in this route.
            </SafetyBullet>
            <SafetyBullet tone="amber">
              Risk disclosure and account-type awareness stay visible instead of being treated as
              a legal afterthought.
            </SafetyBullet>
            <SafetyBullet tone="amber">
              This separation protects educators from onboarding students into the wrong flow by
              default.
            </SafetyBullet>
          </ul>
        </GlassCard>
      </div>

      <GlassCard padding="lg" className="rounded-[28px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Why this matters</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[color:var(--label)]">
              TradeHub does not treat every student account the same.
            </p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--label2)]">
              The live mock layer already carries {activeSignalCount} active signal stream
              {activeSignalCount === 1 ? "" : "s"} and {propAwareApplications} application
              {propAwareApplications === 1 ? "" : "s"} with mixed or prop-firm-heavy audiences.
              The landing page now explains that distinction publicly instead of hiding it for a
              later sales call.
            </p>
          </div>
          <Badge tone="accent" className="self-start lg:self-center">
            Safety is part of the product model
          </Badge>
        </div>
      </GlassCard>
    </div>
  );
}
