"use client";

import type { ReactNode } from "react";
import { AccessPending } from "@/components/auth/access-pending";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { getRoleHome } from "@/lib/firebase/auth";
import { useAuthUser } from "@/lib/auth/use-auth-user";
import type { TradeHubRole } from "@/types/auth";

type RoleGateProps = {
  allowedRole: TradeHubRole;
  nextPath: string;
  children: ReactNode;
};

function formatRole(role: TradeHubRole) {
  if (role === "super_admin") {
    return "Super Admin";
  }

  return role === "influencer" ? "Influencer workspace" : "Student app";
}

function RoleGateBody({ allowedRole, nextPath, children }: RoleGateProps) {
  const { session } = useAuthUser();

  if (session.status !== "signed_in" || !session.claimsLoaded) {
    return null;
  }

  const workspaceRequired = allowedRole !== "super_admin";

  if (!session.role || (workspaceRequired && !session.workspaceId)) {
    return <AccessPending nextPath={nextPath} />;
  }

  if (session.role !== allowedRole) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-10 sm:py-16">
        <GlassCard className="w-full space-y-6 p-6 sm:p-8">
          <p className="eyebrow">Wrong role</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
            This TradeHub route belongs to a different account type.
          </h1>
          <p className="text-sm leading-7 text-[color:var(--label2)]">
            You are signed in as {formatRole(session.role)}, but this route requires{" "}
            {formatRole(allowedRole)} access.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href={getRoleHome(session.role)} variant="primary">
              Open my surface
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

export function RoleGate(props: RoleGateProps) {
  return (
    <AuthGuard nextPath={props.nextPath}>
      <RoleGateBody {...props} />
    </AuthGuard>
  );
}
