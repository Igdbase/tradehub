import { Badge } from "@/components/ui/badge";
import type { AdminSourceMeta } from "@/types/admin-api";

export function AdminSourceBanner({ source, sourceLabel, sourceMessage, warnings }: AdminSourceMeta) {
  const isFirestore = source === "firestore";

  return (
    <section className="rounded-[24px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_76%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Admin data source</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--label)]">{sourceLabel}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--label2)]">
            {sourceMessage}
          </p>
        </div>
        <Badge tone={isFirestore ? "green" : "amber"} variant="outline">
          {isFirestore ? "Live" : "Development"}
        </Badge>
      </div>
      {warnings.length > 0 ? (
        <div className="mt-4 space-y-2">
          {warnings.map((warning) => (
            <p
              key={warning}
              className="rounded-[16px] border border-[color:color-mix(in_srgb,var(--amber)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--amber-bg)_76%,transparent)] px-3 py-2 text-sm leading-6 text-[color:var(--label2)]"
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
