"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StudentSurface = "home" | "courses" | "signals" | "copier" | "journal" | "practice" | "billing";

const navItems: Array<{ key: StudentSurface; label: string; href: string; short: string }> = [
  { key: "home", label: "Home", href: "/app", short: "H" },
  { key: "courses", label: "Courses", href: "/app/courses", short: "C" },
  { key: "signals", label: "Signals", href: "/app/signals", short: "S" },
  { key: "copier", label: "Copier", href: "/app/copier", short: "CP" },
  { key: "journal", label: "Journal", href: "/app/journal", short: "J" },
  { key: "practice", label: "Practice", href: "/app/practice", short: "P" },
  { key: "billing", label: "Billing", href: "/app/billing", short: "Pay" }
];

function StudentNav({ active }: { active: StudentSurface }) {
  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4 rounded-[30px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_74%,transparent)] p-4 backdrop-blur-2xl">
          <div className="rounded-[24px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_50%,transparent)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              TradeHub App
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              Courses, signals, copier status, and journal clarity in one student surface.
            </p>
          </div>
          <nav className="space-y-2" aria-label="Student navigation">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "focus-ring flex items-center justify-between rounded-[18px] border px-4 py-3 text-sm font-semibold transition",
                  active === item.key
                    ? "border-[color:color-mix(in_srgb,var(--accent)_62%,transparent)] bg-[color:var(--accent-bg)] text-[color:var(--label)]"
                    : "border-transparent text-[color:var(--label2)] hover:border-[color:var(--line)] hover:text-[color:var(--label)]"
                )}
              >
                <span>{item.label}</span>
                <span className="tabular-nums text-xs text-[color:var(--label3)]">{item.short}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <nav
        className="fixed inset-x-3 bottom-4 z-30 grid grid-cols-7 gap-1 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--tabbar)] p-2 shadow-[0_18px_44px_-26px_rgba(0,0,0,0.7)] backdrop-blur-2xl lg:hidden"
        aria-label="Student bottom navigation"
      >
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "focus-ring rounded-[18px] px-2 py-2 text-center text-[11px] font-semibold transition",
              active === item.key
                ? "bg-[color:var(--accent-bg)] text-[color:var(--label)]"
                : "text-[color:var(--label3)]"
            )}
          >
            <span className="block text-xs">{item.short}</span>
            <span className="mt-1 block">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export function StudentShell({
  active,
  eyebrow,
  title,
  subtitle,
  action,
  hero,
  side,
  children
}: {
  active: StudentSurface;
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  hero?: ReactNode;
  side?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-[96rem] pb-28 lg:pb-12" data-student-shell="wide">
      <div className="grid gap-6 lg:grid-cols-[minmax(14rem,16rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)]">
        <StudentNav active={active} />
        <main className="min-w-0 space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-[30px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-5 backdrop-blur-2xl sm:p-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--label)] sm:text-4xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="flow-copy mt-3 max-w-3xl text-sm leading-7 text-[color:var(--label2)]">{subtitle}</p>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>

          {hero ? <div>{hero}</div> : null}

          <div className={cn("grid gap-6", Boolean(side) && "2xl:grid-cols-[minmax(0,1fr)_360px]")}>
            <div className="min-w-0 space-y-6">{children}</div>
            {side ? <aside className="min-w-0 space-y-6">{side}</aside> : null}
          </div>
        </main>
      </div>
    </section>
  );
}
