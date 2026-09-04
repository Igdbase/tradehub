"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { resolvePostLoginPath } from "@/lib/firebase/auth";
import { useAuthUser } from "@/lib/auth/use-auth-user";

type AccessPendingProps = {
  nextPath?: string | null;
};

export function AccessPending({ nextPath }: AccessPendingProps) {
  const router = useRouter();
  const { session, refreshClaims, signOut } = useAuthUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefreshClaims() {
    setIsRefreshing(true);

    try {
      const refreshedSession = await refreshClaims();

      if (refreshedSession.role) {
        router.replace(resolvePostLoginPath(refreshedSession.role, nextPath));
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10 sm:py-16">
      <GlassCard className="w-full space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="eyebrow">Access pending</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
            Your account exists, but TradeHub still needs to assign its role and workspace access.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[color:var(--label2)]">
            Sign-in worked, but this session does not have a ready TradeHub role claim yet. That
            usually means owner bootstrap or workspace membership still needs to be completed.
          </p>
        </div>

        <div className="rounded-[24px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_78%,transparent)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
            Current session
          </p>
          <p className="mt-2 text-base font-semibold text-[color:var(--label)]">
            {session.email ?? "Signed-in account"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Role: {session.role ?? "pending"} • Workspace: {session.workspaceId ?? "pending"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleRefreshClaims} variant="primary" disabled={isRefreshing}>
            {isRefreshing ? "Refreshing session..." : "Refresh session claims"}
          </Button>
          <Button href="/" variant="secondary">
            Back to landing
          </Button>
          <Button onClick={signOut} variant="ghost">
            Sign out
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
