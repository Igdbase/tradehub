"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { formatNgn, formatStatusLabel } from "@/components/student-app/student-formatters";
import { StudentShell } from "@/components/student-app/student-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { verifyStudentBillingReferenceClient } from "@/lib/billing/billing-api-client";
import type { StudentBillingVerifyResponse } from "@/types/payments";

function BillingCallbackBody({ reference }: { reference: string }) {
  const [response, setResponse] = useState<StudentBillingVerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(reference));
  const [errorMessage, setErrorMessage] = useState<string | null>(
    reference ? null : "Paystack did not return a transaction reference."
  );

  const verifyReference = useCallback(async () => {
    if (!reference) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = await verifyStudentBillingReferenceClient(reference);
      setResponse(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not verify this Paystack reference.");
    } finally {
      setIsLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    void verifyReference();
  }, [verifyReference]);

  const tone = response?.status === "verified" ? "green" : response?.status === "failed" ? "red" : "amber";

  return (
    <StudentShell
      active="billing"
      eyebrow="Billing callback"
      title="Payment verification"
      subtitle="TradeHub verifies the Paystack reference server-side before changing student subscription access."
      action={<Badge tone={tone}>{response ? formatStatusLabel(response.status) : "Checking"}</Badge>}
      side={
        <GlassCard className="space-y-4">
          <p className="text-sm font-semibold text-[color:var(--label)]">Why this page exists</p>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            Browser redirects are not trusted as proof of payment. This page asks the verified API
            to confirm the reference with Paystack before access is updated. If the webhook arrives
            later, it is processed idempotently against the same payment intent.
          </p>
        </GlassCard>
      }
    >
      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            Verifying Paystack reference {reference}...
          </p>
        </GlassCard>
      ) : null}

      {errorMessage ? (
        <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={verifyReference} variant="secondary" disabled={!reference}>
              Retry verification
            </Button>
            <Button href="/app/billing" variant="ghost">
              Back to billing
            </Button>
          </div>
        </GlassCard>
      ) : null}

      {response ? (
        <>
          <GlassCard className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--label)]">{response.message}</p>
                <p className="mt-1 text-sm text-[color:var(--label2)]">
                  Reference: {response.paymentIntent?.paystackReference ?? reference}
                </p>
                {response.status === "verified" ? (
                  <p className="mt-2 text-xs leading-5 text-[color:var(--label3)]">
                    Access was updated from server-side verification. A later Paystack webhook should not duplicate it.
                  </p>
                ) : null}
              </div>
              <Badge tone={tone}>{formatStatusLabel(response.status)}</Badge>
            </div>
          </GlassCard>

          <div className="grid gap-4 md:grid-cols-3">
            <StatChip
              label="Amount"
              value={response.paymentIntent ? formatNgn(response.paymentIntent.amountNgn) : "Unknown"}
              tone="accent"
            />
            <StatChip
              label="Tier"
              value={response.subscription?.tierLabel ?? response.paymentIntent?.tierId ?? "Pending"}
            />
            <StatChip
              label="Subscription"
              value={response.subscription ? formatStatusLabel(response.subscription.status) : "Not updated"}
              tone={response.subscription?.status === "active" ? "green" : "amber"}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button href="/app" variant="primary">
              Return home
            </Button>
            <Button href="/app/billing" variant="secondary">
              Billing details
            </Button>
          </div>
        </>
      ) : null}
    </StudentShell>
  );
}

export function BillingCallbackClient({ reference }: { reference: string }) {
  return (
    <RoleGate allowedRole="student" nextPath="/app/billing">
      <BillingCallbackBody reference={reference} />
    </RoleGate>
  );
}
