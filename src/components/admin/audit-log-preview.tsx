import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import type { AdminAuditEvent } from "@/types/admin-api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatTargetLabel(value: string) {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AuditLogPreview({ events }: { events: AdminAuditEvent[] }) {
  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Audit preview</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
            Latest operator actions across onboarding, billing, and trust review.
          </h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            Audit events are shown as a bounded recent feed so launch QA can confirm real actions without loading an unbounded history.
          </p>
        </div>
        <Badge tone={events.length > 0 ? "accent" : "neutral"}>{events.length} events</Badge>
      </div>

      <div className="bounded-list-4 space-y-3">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.eventId}
              className="rounded-[18px] border border-[color:var(--line)] px-4 py-3 min-w-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{event.action}</p>
                <Badge tone="accent">{formatTargetLabel(event.targetType)}</Badge>
              </div>
              <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                {event.actorEmail ?? event.actorUid} updated {event.targetId}
              </p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--label3)]">
                {formatDate(event.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-[18px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
            No admin actions were returned in the current audit window yet.
          </p>
        )}
      </div>
    </GlassCard>
  );
}
