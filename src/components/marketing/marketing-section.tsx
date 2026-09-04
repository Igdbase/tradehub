import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

export function MarketingSection({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
  children
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-32 space-y-8 py-4 sm:py-6", className)}>
      {title ? (
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          align={align}
          action={action}
          level={2}
        />
      ) : null}
      {children}
    </section>
  );
}
