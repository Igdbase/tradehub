import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "green" | "amber" | "red";
type BadgeVariant = "soft" | "outline";

const toneClasses: Record<BadgeTone, Record<BadgeVariant, string>> = {
  neutral: {
    soft: "border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_82%,transparent)] text-[color:var(--label2)]",
    outline: "border-[color:var(--line)] bg-transparent text-[color:var(--label2)]"
  },
  accent: {
    soft: "border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color:var(--accent-bg)] text-[color:var(--accent)]",
    outline: "border-[color:var(--accent)] bg-transparent text-[color:var(--accent)]"
  },
  green: {
    soft: "border-[color:color-mix(in_srgb,var(--green)_30%,transparent)] bg-[color:var(--green-bg)] text-[color:var(--green)]",
    outline: "border-[color:var(--green)] bg-transparent text-[color:var(--green)]"
  },
  amber: {
    soft: "border-[color:color-mix(in_srgb,var(--amber)_30%,transparent)] bg-[color:var(--amber-bg)] text-[color:var(--amber)]",
    outline: "border-[color:var(--amber)] bg-transparent text-[color:var(--amber)]"
  },
  red: {
    soft: "border-[color:color-mix(in_srgb,var(--red)_30%,transparent)] bg-[color:var(--red-bg)] text-[color:var(--red)]",
    outline: "border-[color:var(--red)] bg-transparent text-[color:var(--red)]"
  }
};

export function Badge({
  children,
  tone = "neutral",
  variant = "soft",
  uppercase = false,
  className
}: {
  children: ReactNode;
  tone?: BadgeTone;
  variant?: BadgeVariant;
  uppercase?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "break-safe inline-flex max-w-full min-w-0 items-center justify-center rounded-full border px-3 py-1 text-center text-[11px] font-semibold leading-5 tracking-[0.04em]",
        uppercase && "uppercase",
        toneClasses[tone][variant],
        className
      )}
    >
      {children}
    </span>
  );
}
