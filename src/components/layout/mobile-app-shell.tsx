import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MobileAppShell({
  eyebrow,
  title,
  subtitle,
  action,
  hero,
  children,
  tabBar,
  className
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  hero?: ReactNode;
  children: ReactNode;
  tabBar?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-[430px]", className)}>
      <div className="mobile-shell-scroll space-y-4 pb-24">
        <div className="flex items-start justify-between gap-4 px-1 pt-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--label3)]">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[14px] font-semibold tracking-[0.03em] text-[color:var(--label)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 max-w-[22rem] text-[12px] leading-5 text-[color:var(--label2)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        {hero ? <div>{hero}</div> : null}

        <div className="space-y-4">{children}</div>
      </div>

      {tabBar ? <div className="sticky bottom-4 mt-[-4.5rem]">{tabBar}</div> : null}
    </section>
  );
}
