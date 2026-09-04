"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export const fieldClasses =
  "focus-ring min-h-11 rounded-[16px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-3 py-2 text-sm text-[color:var(--label)] placeholder:text-[color:var(--label3)]";

export function StepHeader({
  eyebrow,
  title,
  children,
  tone = "accent"
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  tone?: "neutral" | "accent" | "green" | "amber" | "red";
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="eyebrow !text-[color:var(--label3)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
          {title}
        </h2>
        <div className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--label2)]">
          {children}
        </div>
      </div>
      <Badge tone={tone}>Explicit save</Badge>
    </div>
  );
}
