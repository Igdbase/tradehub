"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { sanitizeNextPath } from "@/lib/firebase/auth";
import { useAuthUser } from "@/lib/auth/use-auth-user";

type AuthGuardProps = {
  nextPath: string;
  children: ReactNode;
};

function buildLoginHref(nextPath: string) {
  const safeNextPath = sanitizeNextPath(nextPath);
  return safeNextPath ? `/login?next=${encodeURIComponent(safeNextPath)}` : "/login";
}

export function AuthGuard({ nextPath, children }: AuthGuardProps) {
  const { configError, session } = useAuthUser();

  if (configError && !session.uid) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10 sm:py-16">
        <GlassCard className="w-full space-y-5 p-6 sm:p-8">
          <p className="eyebrow">Firebase setup</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
            TradeHub auth still needs local Firebase configuration.
          </h1>
          <p className="text-sm leading-7 text-[color:var(--label2)]">{configError}</p>
          <div className="flex flex-wrap gap-3">
            <Button href="/" variant="secondary">
              Back to landing
            </Button>
            <Button href="/login" variant="ghost">
              Open login
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (session.status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10 sm:py-16">
        <GlassCard className="w-full space-y-4 p-6 sm:p-8">
          <p className="eyebrow">Checking access</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
            TradeHub is verifying your session.
          </h1>
          <p className="text-sm leading-7 text-[color:var(--label2)]">
            We are loading your account and route claims before protected content is shown.
          </p>
        </GlassCard>
      </div>
    );
  }

  if (session.status === "signed_out") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10 sm:py-16">
        <GlassCard className="w-full space-y-6 p-6 sm:p-8">
          <p className="eyebrow">Protected route</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
            Sign in to continue to this TradeHub surface.
          </h1>
          <p className="text-sm leading-7 text-[color:var(--label2)]">
            This route is gated by Firebase Authentication and TradeHub role claims, so the
            dashboard shell stays hidden until your session is verified.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href={buildLoginHref(nextPath)} variant="primary">
              Open login
            </Button>
            <Button href="/" variant="secondary">
              Back to landing
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return <>{children}</>;
}
