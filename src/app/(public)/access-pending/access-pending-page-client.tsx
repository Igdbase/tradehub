"use client";

import { AccessPending } from "@/components/auth/access-pending";
import { AuthGuard } from "@/components/auth/auth-guard";

export function AccessPendingPageClient() {
  return (
    <AuthGuard nextPath="/access-pending">
      <AccessPending />
    </AuthGuard>
  );
}
