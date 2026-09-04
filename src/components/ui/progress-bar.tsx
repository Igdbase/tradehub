import { cn } from "@/lib/utils";

type ProgressTone = "accent" | "green" | "amber" | "red";

const toneClasses: Record<ProgressTone, string> = {
  accent: "bg-[color:var(--accent)]",
  green: "bg-[color:var(--green)]",
  amber: "bg-[color:var(--amber)]",
  red: "bg-[color:var(--red)]"
};

export function ProgressBar({
  value,
  tone = "accent",
  label,
  showValue = false,
  className
}: {
  value: number;
  tone?: ProgressTone;
  label?: string;
  showValue?: boolean;
  className?: string;
}) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("space-y-2", className)}>
      {label || showValue ? (
        <div className="flex items-center justify-between gap-3">
          {label ? (
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--label3)]">
              {label}
            </span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span className="tabular-nums text-xs font-semibold text-[color:var(--label2)]">
              {clampedValue}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="progress-track">
        <div
          className={cn("progress-fill transition-[width]", toneClasses[tone])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
