import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";

type StatTone = "neutral" | "accent" | "green" | "amber" | "red";

const valueToneClasses: Record<StatTone, string> = {
  neutral: "text-[color:var(--label)]",
  accent: "text-[color:var(--accent)]",
  green: "text-[color:var(--green)]",
  amber: "text-[color:var(--amber)]",
  red: "text-[color:var(--red)]"
};

export function StatChip({
  label,
  value,
  detail,
  tone = "neutral",
  className
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <GlassCard padding="sm" className={cn("min-w-0 rounded-[20px]", className)}>
      <p className="break-safe text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-[color:var(--label3)]">
        {label}
      </p>
      <p
        className={cn(
          "break-safe mt-3 tabular-nums text-[15px] font-semibold leading-5",
          valueToneClasses[tone]
        )}
      >
        {value}
      </p>
      {detail ? <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">{detail}</p> : null}
    </GlassCard>
  );
}
