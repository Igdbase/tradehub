"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { formatDateTime, formatNgn, formatStatusLabel } from "@/components/student-app/student-formatters";
import { StudentShell } from "@/components/student-app/student-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import {
  getStudentBillingOverviewClient,
  startStudentBillingCheckoutClient,
  startStudentSolanaCheckoutClient,
  verifyStudentSolanaCheckoutClient
} from "@/lib/billing/billing-api-client";
import type {
  BillingTier,
  StudentBillingOverviewResponse,
  StudentSubscription,
  StudentSolanaCheckoutResponse,
  StudentSolanaVerifyResponse
} from "@/types/payments";

function subscriptionLifecycleCopy(subscription: StudentSubscription | null) {
  if (!subscription) {
    return {
      tone: "amber" as const,
      title: "No active subscription yet",
      body: "Choose a tier and complete Paystack checkout. Browser redirects are not final proof; TradeHub verifies payment server-side before access changes."
    };
  }

  if (subscription.status === "active") {
    return {
      tone: "green" as const,
      title: "Subscription active",
      body: subscription.currentPeriodEnd
        ? `Access is active through ${formatDateTime(subscription.currentPeriodEnd)}. Renewal state is updated by Paystack verification and webhook events.`
        : "Access is active. TradeHub will keep renewal state synced from verified server-side payment events."
    };
  }

  if (subscription.status === "trialing") {
    return {
      tone: "accent" as const,
      title: "Trial access active",
      body: subscription.trialEndsAt
        ? `Trial access runs until ${formatDateTime(subscription.trialEndsAt)}. Payment access changes still happen through verified server routes.`
        : "Trial access is active. Payment access changes still happen through verified server routes."
    };
  }

  if (subscription.status === "past_due") {
    return {
      tone: "amber" as const,
      title: "Payment needs attention",
      body: subscription.graceEndsAt
        ? `Paystack reported a billing problem. Grace access is tracked until ${formatDateTime(subscription.graceEndsAt)} before stricter access rules apply.`
        : "Paystack reported a billing problem. Retry checkout or wait for the owner to reconcile the payment if it was completed."
    };
  }

  if (subscription.status === "non_renewing") {
    return {
      tone: "amber" as const,
      title: "Active but not renewing",
      body: subscription.currentPeriodEnd
        ? `Current access remains until ${formatDateTime(subscription.currentPeriodEnd)}, but future renewal is disabled.`
        : "Current access may remain for the paid period, but future renewal is disabled."
    };
  }

  if (subscription.status === "cancelled" || subscription.status === "expired") {
    return {
      tone: "red" as const,
      title: "Subscription not active",
      body: "Access may be limited until a fresh verified checkout succeeds. TradeHub does not trust stale redirects or expired quotes."
    };
  }

  return {
    tone: "amber" as const,
    title: "Subscription inactive",
    body: "Start a verified checkout to activate this student workspace access."
  };
}

function WarningStack({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <GlassCard className="space-y-2 border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amber)]">
        Billing notice
      </p>
      {warnings.map((warning) => (
        <p key={warning} className="text-sm leading-6 text-[color:var(--label2)]">
          {warning}
        </p>
      ))}
    </GlassCard>
  );
}

function TierCard({
  tier,
  currentTierId,
  isPaystackConfigured,
  isStarting,
  onCheckout
}: {
  tier: BillingTier;
  currentTierId: string;
  isPaystackConfigured: boolean;
  isStarting: boolean;
  onCheckout: (tierId: string) => void;
}) {
  const isCurrent = tier.tierId === currentTierId;
  const canCheckout = tier.checkoutReady && isPaystackConfigured && !isStarting;

  return (
    <GlassCard className="space-y-4" interactive={tier.checkoutReady}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--label3)]">
            {tier.billingPeriod}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
            {tier.name}
          </h2>
        </div>
        <Badge tone={tier.checkoutReady ? "green" : "amber"}>
          {tier.checkoutReady ? "Plan ready" : "Owner pending"}
        </Badge>
      </div>
      <p className="text-sm leading-6 text-[color:var(--label2)]">{tier.description}</p>
      <p className="text-3xl font-semibold tracking-[-0.05em] text-[color:var(--label)]">
        {formatNgn(tier.priceNgn)}
      </p>
      <div className="flex flex-wrap gap-2">
        {tier.features.map((feature) => (
          <span
            key={feature}
            className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-semibold text-[color:var(--label2)]"
          >
            {formatStatusLabel(feature)}
          </span>
        ))}
      </div>
      <p className="text-xs leading-5 text-[color:var(--label3)]">{tier.readinessMessage}</p>
      <Button
        onClick={() => onCheckout(tier.tierId)}
        variant={isCurrent ? "secondary" : "primary"}
        disabled={!canCheckout}
        fullWidth
      >
        {isStarting
          ? "Opening checkout..."
          : isCurrent
            ? "Renew current tier"
            : "Start Paystack checkout"}
      </Button>
    </GlassCard>
  );
}

function SolanaRailCard({
  tiers,
  quote,
  result,
  isStarting,
  isVerifying,
  manualSignature,
  onManualSignatureChange,
  onCreateQuote,
  onVerify
}: {
  tiers: BillingTier[];
  quote: StudentSolanaCheckoutResponse["checkout"] | null;
  result: StudentSolanaVerifyResponse | null;
  isStarting: string | null;
  isVerifying: boolean;
  manualSignature: string;
  onManualSignatureChange: (value: string) => void;
  onCreateQuote: (tierId: string) => void;
  onVerify: () => void;
}) {
  const quoteExpired = quote ? Date.now() > Date.parse(quote.quoteExpiresAt) : false;

  return (
    <GlassCard className="space-y-5 border-[color:color-mix(in_srgb,var(--accent)_28%,transparent)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--accent)]">
            Optional USDC rail
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--label)]">
            Solana Pay quote
          </h2>
        </div>
        <Badge tone="accent">Secondary</Badge>
      </div>
      <p className="text-sm leading-6 text-[color:var(--label2)]">
        Paystack remains the default. Solana Pay is available here because this workspace is approved
        for USDC checkout. TradeHub verifies payment server-side before subscription access changes.
      </p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier) => (
          <button
            key={tier.tierId}
            type="button"
            onClick={() => onCreateQuote(tier.tierId)}
            disabled={Boolean(isStarting)}
            className="focus-ring rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_62%,transparent)] p-4 text-left transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="block text-sm font-semibold text-[color:var(--label)]">{tier.name}</span>
            <span className="mt-1 block text-xs text-[color:var(--label2)]">
              {isStarting === tier.tierId ? "Creating quote..." : `${formatNgn(tier.priceNgn)} in USDC`}
            </span>
          </button>
        ))}
      </div>

      {quote ? (
        <div className="space-y-4 rounded-[24px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_42%,transparent)] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <StatChip label="USDC quote" value={quote.amountUsdc.toFixed(6)} tone="accent" />
            <StatChip label="NGN amount" value={formatNgn(quote.amountNgn)} />
            <StatChip label="Expires" value={formatDateTime(quote.quoteExpiresAt)} tone="amber" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--label3)]">
              Solana Pay URL
            </p>
            <p className="break-all rounded-[16px] border border-[color:var(--line)] p-3 text-xs leading-5 text-[color:var(--label2)]">
              {quote.solanaPayUrl}
            </p>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="manual-solana-signature"
              className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--label3)]"
            >
              Manual signature optional
            </label>
            <input
              id="manual-solana-signature"
              value={manualSignature}
              onChange={(event) => onManualSignatureChange(event.target.value)}
              placeholder="Paste a Solana transaction signature if auto-detect stays pending"
              className="focus-ring w-full rounded-[16px] border border-[color:var(--line)] bg-transparent px-4 py-3 text-sm text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              onClick={() => { window.location.href = quote.solanaPayUrl; }}
              variant="primary"
              fullWidth
              disabled={quoteExpired}
            >
              Open wallet request
            </Button>
            <Button onClick={onVerify} variant="secondary" disabled={isVerifying || quoteExpired} fullWidth>
              {isVerifying ? "Checking chain..." : "Verify payment"}
            </Button>
          </div>
          <p className="text-xs leading-5 text-[color:var(--label3)]">
            Reference: {quote.reference}. The platform wallet receives USDC in this MVP; verified
            payments create a settlement ledger entry for the influencer split.
          </p>
          {quoteExpired ? (
            <p className="text-xs leading-5 text-[color:var(--amber)]">
              This quote has expired. Create a fresh Solana quote before sending funds.
            </p>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <GlassCard className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[color:var(--label)]">{result.message}</p>
            <Badge tone={result.status === "verified" ? "green" : result.status === "failed" ? "red" : "amber"}>
              {formatStatusLabel(result.status)}
            </Badge>
          </div>
          {result.paymentIntent?.verifiedSignature ? (
            <p className="break-all text-xs leading-5 text-[color:var(--label3)]">
              Signature: {result.paymentIntent.verifiedSignature}
            </p>
          ) : null}
        </GlassCard>
      ) : null}
    </GlassCard>
  );
}

function StudentBillingBody() {
  const [overview, setOverview] = useState<StudentBillingOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startingTierId, setStartingTierId] = useState<string | null>(null);
  const [startingSolanaTierId, setStartingSolanaTierId] = useState<string | null>(null);
  const [solanaQuote, setSolanaQuote] = useState<StudentSolanaCheckoutResponse["checkout"] | null>(null);
  const [solanaResult, setSolanaResult] = useState<StudentSolanaVerifyResponse | null>(null);
  const [isVerifyingSolana, setIsVerifyingSolana] = useState(false);
  const [manualSolanaSignature, setManualSolanaSignature] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getStudentBillingOverviewClient();
      setOverview(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load billing.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const startCheckout = useCallback(async (tierId: string) => {
    setStartingTierId(tierId);
    setErrorMessage(null);

    try {
      const response = await startStudentBillingCheckoutClient(tierId);
      window.location.assign(response.checkout.authorizationUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not start checkout.");
      setStartingTierId(null);
    }
  }, []);

  const startSolanaCheckout = useCallback(async (tierId: string) => {
    setStartingSolanaTierId(tierId);
    setSolanaResult(null);
    setErrorMessage(null);

    try {
      const response = await startStudentSolanaCheckoutClient(tierId);
      setSolanaQuote(response.checkout);
      setManualSolanaSignature("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not create a Solana quote.");
    } finally {
      setStartingSolanaTierId(null);
    }
  }, []);

  const verifySolana = useCallback(async () => {
    if (!solanaQuote) {
      return;
    }

    setIsVerifyingSolana(true);
    setErrorMessage(null);

    try {
      const response = await verifyStudentSolanaCheckoutClient(
        solanaQuote.paymentIntentId,
        manualSolanaSignature.trim() || undefined
      );
      setSolanaResult(response);

      if (response.status === "verified") {
        await loadBilling();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not verify Solana payment.");
    } finally {
      setIsVerifyingSolana(false);
    }
  }, [loadBilling, manualSolanaSignature, solanaQuote]);

  if (isLoading) {
    return (
      <StudentShell
        active="billing"
        eyebrow="Billing"
        title="Loading subscription"
        subtitle="TradeHub is checking your scoped student billing record before showing checkout options."
      >
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading live billing state...</p>
        </GlassCard>
      </StudentShell>
    );
  }

  if (!overview) {
    return (
      <StudentShell
        active="billing"
        eyebrow="Billing"
        title="Billing unavailable"
        subtitle="Your account signed in, but TradeHub could not load the billing payload."
      >
        <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--red)]">
            {errorMessage ?? "This student billing record is not provisioned yet."}
          </p>
          <Button onClick={loadBilling} variant="secondary">
            Retry
          </Button>
        </GlassCard>
      </StudentShell>
    );
  }

  const subscription = overview.currentSubscription;
  const paystackTone = overview.paystack.configured ? "green" : "amber";
  const lifecycle = subscriptionLifecycleCopy(subscription);

  return (
    <StudentShell
      active="billing"
      eyebrow={`@${overview.workspace.handle}`}
      title="Billing and access"
      subtitle="Paystack remains the default. Approved workspaces can optionally accept Solana Pay / USDC, verified server-side before access changes."
      action={<Badge tone={paystackTone}>{overview.paystack.mode} mode</Badge>}
      side={
        <>
          <WarningStack warnings={overview.warnings} />
          <GlassCard className="space-y-4">
            <p className="text-sm font-semibold text-[color:var(--label)]">Payment safety</p>
            <p className="text-sm leading-6 text-[color:var(--label2)]">
              Checkout opens on Paystack by default. Optional Solana quotes use a platform-collect
              USDC flow and server-side RPC verification. TradeHub never collects card details,
              bank details, private keys, or seed phrases.
            </p>
          </GlassCard>
        </>
      }
    >
      {errorMessage ? (
        <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
          <Button onClick={loadBilling} variant="secondary">
            Refresh billing
          </Button>
        </GlassCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatChip label="Current tier" value={overview.student.tierLabel} detail={overview.student.tierId} tone="accent" />
        <StatChip
          label="Subscription"
          value={subscription ? formatStatusLabel(subscription.status) : "Not active"}
          tone={subscription?.status === "active" ? "green" : "amber"}
        />
        <StatChip
          label="Next payment"
          value={subscription?.nextPaymentDate ? formatDateTime(subscription.nextPaymentDate) : "Not set"}
        />
        <StatChip
          label="Paystack"
          value={overview.paystack.configured ? "Configured" : "Missing"}
          detail={overview.paystack.publicKeyConfigured ? "Public key present" : "Public key pending"}
          tone={paystackTone}
        />
      </div>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">{lifecycle.title}</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">{lifecycle.body}</p>
          </div>
          <Badge tone={lifecycle.tone}>
            {subscription ? formatStatusLabel(subscription.status) : "No subscription"}
          </Badge>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--label)]">
              {overview.workspace.name}
            </p>
            <p className="mt-1 text-sm text-[color:var(--label2)]">
              Paystack split ready: {overview.workspace.paystackSplitReady ? "yes" : "owner pending"}
            </p>
          </div>
          <Badge tone={overview.workspace.paystackSplitReady ? "green" : "amber"}>
            Local checkout
          </Badge>
        </div>
        <p className="text-sm leading-6 text-[color:var(--label2)]">
          {overview.paystack.message} Webhooks update the same subscription records after
          Paystack confirms renewal or failure events.
        </p>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {overview.tiers.map((tier) => (
          <TierCard
            key={tier.tierId}
            tier={tier}
            currentTierId={overview.student.tierId}
            isPaystackConfigured={overview.paystack.configured}
            isStarting={startingTierId === tier.tierId}
            onCheckout={startCheckout}
          />
        ))}
      </div>

      {overview.solana.eligible ? (
        <SolanaRailCard
          tiers={overview.tiers}
          quote={solanaQuote}
          result={solanaResult}
          isStarting={startingSolanaTierId}
          isVerifying={isVerifyingSolana}
          manualSignature={manualSolanaSignature}
          onManualSignatureChange={setManualSolanaSignature}
          onCreateQuote={startSolanaCheckout}
          onVerify={verifySolana}
        />
      ) : null}
    </StudentShell>
  );
}

export function StudentBillingClient() {
  return (
    <RoleGate allowedRole="student" nextPath="/app/billing">
      <StudentBillingBody />
    </RoleGate>
  );
}
