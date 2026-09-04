import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HeroTone = "green" | "red" | "accent" | "amber" | "neutral";

const toneClasses: Record<HeroTone, string> = {
  green: "text-[color:var(--green)]",
  red: "text-[color:var(--red)]",
  accent: "text-[color:var(--accent)]",
  amber: "text-[color:var(--amber)]",
  neutral: "text-[color:var(--label)]"
};

function buildSparklinePath(points: number[]) {
  if (points.length < 2) {
    return "";
  }

  const width = 180;
  const height = 54;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (width / (points.length - 1)) * index;
      const y = height - ((point - min) / range) * height;

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function HeroCard({
  label,
  value,
  badge,
  change,
  changeTone = "green",
  sparkline = [10, 18, 15, 24, 22, 27, 31],
  children,
  className,
  animated = true
}: {
  label: string;
  value: string;
  badge?: ReactNode;
  change?: string;
  changeTone?: HeroTone;
  sparkline?: number[];
  children?: ReactNode;
  className?: string;
  animated?: boolean;
}) {
  const path = buildSparklinePath(sparkline);

  return (
    <div
      className={cn(
        "tradehub-hero min-w-0 p-6 sm:p-7",
        animated && "tradehub-hero-sheen",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="h-[22px] w-[32px] rounded-[5px] bg-[linear-gradient(135deg,#e3d2a3,#a4905f)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
        {badge ? <div className="relative z-[1]">{badge}</div> : null}
      </div>

      {path ? (
        <svg
          viewBox="0 0 180 54"
          className="pointer-events-none absolute bottom-8 right-0 h-[54px] w-[62%] text-[color:var(--label)] opacity-[0.15]"
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}

      <p className="mt-7 break-words text-[11px] font-medium text-[color:var(--label2)]">{label}</p>
      <p className="tabular-nums mt-2 text-[clamp(2rem,4vw,2.45rem)] font-bold tracking-[-0.03em] text-[color:var(--label)]">
        {value}
      </p>

      {change ? (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center gap-2 break-words text-sm font-medium",
            toneClasses[changeTone]
          )}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]">
            {changeTone === "red" ? (
              <path d="m7 9 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="m7 15 5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          <span>{change}</span>
        </div>
      ) : null}

      {children ? <div className="relative z-[1] mt-5">{children}</div> : null}
    </div>
  );
}
