import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  level = 1,
  action,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  level?: 1 | 2 | 3;
  action?: ReactNode;
  className?: string;
}) {
  const HeadingTag = `h${level}` as "h1" | "h2" | "h3";

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className={cn("space-y-3", align === "center" && "max-w-3xl")}>
        <HeadingTag className="section-title text-[color:var(--label)]">{title}</HeadingTag>
        {description ? <p className="section-copy">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}
