import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassCardPadding = "sm" | "md" | "lg";
type GlassCardTone = "base" | "high";

const paddingClasses: Record<GlassCardPadding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6"
};

const toneClasses: Record<GlassCardTone, string> = {
  base: "bg-[color:var(--glass)]",
  high: "bg-[color:var(--glass-hi)]"
};

export function GlassCard({
  children,
  className,
  padding = "md",
  tone = "base",
  interactive = false,
  ...divProps
}: Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: ReactNode;
  padding?: GlassCardPadding;
  tone?: GlassCardTone;
  interactive?: boolean;
}) {
  return (
    <div
      {...divProps}
      className={cn(
        "min-w-0 overflow-hidden break-safe rounded-[24px] border border-[color:var(--line)] backdrop-blur-[20px] transition",
        toneClasses[tone],
        paddingClasses[padding],
        interactive &&
          "hover:-translate-y-[2px] hover:border-[color:var(--accent)] hover:shadow-[0_18px_36px_-30px_rgba(217,194,140,0.52)]",
        className
      )}
    >
      {children}
    </div>
  );
}
