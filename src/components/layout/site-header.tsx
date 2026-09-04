"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/lib/auth/use-auth-user";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { appConfig } from "@/config/app";
import { getRoleHome } from "@/lib/firebase/auth";
import { primaryNav } from "@/lib/routes";
import { cn } from "@/lib/utils";

const homeNav = [
  { label: "What you get", href: "/#what-you-get" },
  { label: "Safety", href: "/#safety" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Model", href: "/#model" },
  { label: "Apply", href: "/#apply" }
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isHome = pathname === "/";
  const isPracticeTerminal = /^\/app\/practice\/[^/]+\/terminal\/?$/.test(pathname);
  const isAppSurface =
    pathname.startsWith("/app") || pathname.startsWith("/workspace") || pathname.startsWith("/admin");
  const { session, signOut } = useAuthUser();
  const navItems = isHome ? homeNav : isAppSurface ? [] : primaryNav;
  const hasHeaderMenu = navItems.length > 0;
  const desktopNavClassName = isHome
    ? "hidden items-center gap-2 xl:flex"
    : "hidden items-center gap-2 2xl:flex";
  const mobileOnlyClassName = isHome ? "xl:hidden" : "2xl:hidden";
  const roleLabel =
    session.role === "super_admin"
      ? "Super Admin"
      : session.role === "influencer"
        ? "Workspace"
        : session.role === "student"
          ? "Student"
          : null;
  const roleHomeHref = session.role ? getRoleHome(session.role) : "/login";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
      router.replace("/");
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isPracticeTerminal) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40" data-testid="tradehub-site-header">
      <div className="mx-auto w-full max-w-[112rem] px-5 pt-5 sm:px-8 lg:px-12">
        <div className="glass-panel px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link
                href="/"
                className="inline-flex text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--label2)]"
              >
                {appConfig.shortName}
              </Link>
              <p className="flow-copy mt-1 max-w-xl text-xs leading-5 text-[color:var(--label3)]">
                {isHome
                  ? "White-label trading education, local checkout, and prop-firm-aware signal routing."
                  : appConfig.tagline}
              </p>
            </div>

            {hasHeaderMenu ? (
              <nav className={desktopNavClassName} aria-label="Primary navigation">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-chip">
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : null}

            <div className="flex items-center gap-2">
              {session.status === "signed_in" && roleLabel ? (
                <Link href={roleHomeHref} className="nav-chip hidden max-w-[11rem] truncate sm:inline-flex">
                  {roleLabel}
                </Link>
              ) : session.status === "signed_out" ? (
                <Button href="/login" variant="secondary" size="sm" className="hidden sm:inline-flex">
                  Log in
                </Button>
              ) : null}
              {isHome ? (
                <Button href="/#apply" variant="primary" size="sm" className="hidden sm:inline-flex">
                  Apply
                </Button>
              ) : !isAppSurface ? (
                <Button
                  href="/design-system"
                  variant="secondary"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  Preview
                </Button>
              ) : null}
              {session.status === "signed_in" ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="button-secondary focus-ring hidden px-3 py-2 text-xs sm:inline-flex sm:text-sm"
                  disabled={isSigningOut}
                >
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              ) : null}
              <ThemeToggle />
              {hasHeaderMenu ? (
                <button
                  type="button"
                  aria-expanded={isMenuOpen}
                  aria-controls="site-mobile-navigation"
                  aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                  className={cn(
                    "button-secondary focus-ring h-10 w-10 shrink-0 justify-center px-0",
                    mobileOnlyClassName
                  )}
                  onClick={() => setIsMenuOpen((open) => !open)}
                >
                  {isMenuOpen ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ) : null}
            </div>
          </div>

          {isMenuOpen && hasHeaderMenu ? (
            <div
              id="site-mobile-navigation"
              className={cn("mt-4 border-t border-[color:var(--line)] pt-4", mobileOnlyClassName)}
            >
              <nav
                className="flex flex-col gap-2"
                aria-label={isHome ? "Landing page section navigation" : "Primary navigation"}
              >
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-chip justify-between px-4 py-3 text-sm"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>{item.label}</span>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ))}
              </nav>
              <div className="mt-3 flex flex-wrap gap-2">
                {session.status === "signed_in" ? (
                  <>
                    {roleLabel ? (
                      <Button href={roleHomeHref} variant="secondary" size="sm">
                        Open {roleLabel}
                      </Button>
                    ) : null}
                    <Button onClick={handleSignOut} variant="ghost" size="sm" disabled={isSigningOut}>
                      {isSigningOut ? "Signing out..." : "Sign out"}
                    </Button>
                  </>
                ) : (
                  <Button href="/login" variant="secondary" size="sm">
                    Log in
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
