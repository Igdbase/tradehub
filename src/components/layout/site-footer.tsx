"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { footerNav } from "@/lib/routes";
import { Button } from "@/components/ui/button";

export function SiteFooter() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isPracticeTerminal = /^\/app\/practice\/[^/]+\/terminal\/?$/.test(pathname);

  if (isPracticeTerminal) {
    return null;
  }

  return (
    <footer className="border-t border-[color:var(--line)]" data-testid="tradehub-site-footer">
      <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-4 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div>
          <p className="text-sm font-medium text-[color:var(--label2)]">
            {isHome
              ? "TradeHub is a vetted onboarding flow for trading educators, not a promise of trading results."
              : "TradeHub keeps public marketing, admin review, workspace controls, and student routes separate from day one."}
          </p>
          <p className="mt-1 text-xs text-[color:var(--label3)]">
            {isHome
              ? "Paystack/local checkout is the default rail, Solana Pay / USDC stays optional for approved workspaces, and funded-account students are not pushed into automatic execution."
              : "Use the student app, workspace tools, and admin review screens together to verify role-scoped demo flows."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHome ? (
            <Button href="/admin" variant="secondary" size="sm">
              Admin Demo
            </Button>
          ) : (
            <Button href="/" variant="secondary" size="sm">
              Back to landing
            </Button>
          )}
          <nav className="flex flex-wrap gap-2">
            {footerNav.map((item) => (
              <Link key={item.href} href={item.href} className="nav-chip">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
