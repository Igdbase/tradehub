"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { StudentShell } from "@/components/student-app/student-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type {
  AutoCopyMarket,
  CrossAssetAutoCopyExecutionMode,
  CrossAssetAutoCopySizingMode,
  CrossAssetStaleSignalPolicy,
  CryptoExchangeEnvironment,
  CryptoExchangeId
} from "@/types/crypto-execution";
import type {
  StudentCopierCheckoutStartResponse,
  StudentCopierMutationResponse,
  StudentCopierOverviewResponse
} from "@/types/student-copier";

type ConnectionFormState = {
  exchange: CryptoExchangeId;
  environment: CryptoExchangeEnvironment;
  apiKey: string;
  apiSecret: string;
  riskAcknowledged: boolean;
  personalAccountAcknowledged: boolean;
};

type PreferenceFormState = {
  maxRiskPercentPerTrade: string;
  maxDailyLossPercent: string;
  maxOpenTrades: string;
  allowedSymbols: string;
};

type ForexProvisioningFormState = {
  platform: "mt4" | "mt5";
  brokerServer: string;
  brokerLogin: string;
  brokerPassword: string;
  label: string;
  billingAcknowledged: boolean;
  dryRunAcknowledged: boolean;
  noOrderAcknowledged: boolean;
  personalAccountAcknowledged: boolean;
};

type AutoCopyPreferenceFormState = {
  market: AutoCopyMarket;
  executionMode: CrossAssetAutoCopyExecutionMode;
  sizingMode: CrossAssetAutoCopySizingMode;
  maxRiskPercentPerTrade: string;
  maxFixedNotional: string;
  maxDailyLoss: string;
  maxOpenTrades: string;
  allowedSymbols: string;
  staleSignalPolicy: CrossAssetStaleSignalPolicy;
  staleSignalMaxAgeSeconds: string;
  studentPaused: boolean;
  consentStatus: "missing" | "accepted" | "paused" | "revoked";
  executionFairnessDisclosureAccepted: boolean;
  suitabilityAcknowledged: boolean;
};

const emptyConnectionForm: ConnectionFormState = {
  exchange: "binance",
  environment: "sandbox",
  apiKey: "",
  apiSecret: "",
  riskAcknowledged: false,
  personalAccountAcknowledged: false
};

const emptyForexProvisioningForm: ForexProvisioningFormState = {
  platform: "mt4",
  brokerServer: "",
  brokerLogin: "",
  brokerPassword: "",
  label: "",
  billingAcknowledged: false,
  dryRunAcknowledged: false,
  noOrderAcknowledged: false,
  personalAccountAcknowledged: false
};

const inputClass =
  "focus-ring min-h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-black px-4 py-3 text-sm text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)] disabled:cursor-not-allowed disabled:opacity-55";

function prettyLabel(value: string) {
  return value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function statusTone(value?: string): "green" | "amber" | "red" | "neutral" {
  if (!value) return "neutral";
  if (["active", "connected", "accepted", "ready_for_review"].includes(value)) {
    return "green";
  }
  if (value.includes("paused") || value === "disabled" || value === "needs_attention" || value === "revoked") {
    return "red";
  }
  return "amber";
}

function safeDate(value?: string) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function buildPreferenceForm(response: StudentCopierOverviewResponse): PreferenceFormState {
  const risk = response.products.crypto.setup.risk;

  return {
    maxRiskPercentPerTrade: String(risk.maxRiskPercentPerTrade),
    maxDailyLossPercent: String(risk.maxDailyLossPercent),
    maxOpenTrades: String(risk.maxOpenTrades),
    allowedSymbols: risk.allowedSymbols.join(", ")
  };
}

function buildAutoCopyPreferenceForm(
  response: StudentCopierOverviewResponse,
  market: AutoCopyMarket
): AutoCopyPreferenceFormState {
  const preferences = response.products[market].setup.controls;

  return {
    market,
    executionMode: preferences.copyMode,
    sizingMode: preferences.sizingMode,
    maxRiskPercentPerTrade: String(preferences.maxRiskPercentPerTrade),
    maxFixedNotional: String(preferences.maxFixedNotional),
    maxDailyLoss: String(preferences.maxDailyLoss),
    maxOpenTrades: String(preferences.maxOpenTrades),
    allowedSymbols: preferences.allowedSymbols.join(", "),
    staleSignalPolicy: preferences.staleSignalPolicy,
    staleSignalMaxAgeSeconds: String(preferences.staleSignalMaxAgeSeconds),
    studentPaused: preferences.paused,
    consentStatus: preferences.consentStatus,
    executionFairnessDisclosureAccepted: preferences.disclosureAccepted,
    suitabilityAcknowledged: preferences.suitabilityAccepted
  };
}

function FieldLabel({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
      {label}
      {children}
    </label>
  );
}

function SetupTabButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`focus-ring min-h-11 rounded-full border px-5 py-2 text-sm font-semibold transition ${
        active
          ? "border-[color:var(--accent)] bg-[color:var(--accent-bg)] text-[color:var(--accent)]"
          : "border-[color:var(--line)] bg-black text-[color:var(--label2)] hover:border-[color:var(--accent)] hover:text-[color:var(--label)]"
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SubscriptionTile({
  title,
  description,
  status,
  entitled,
  actionLabel,
  onAction,
  disabled,
  pendingCopy,
  reason
}: {
  title: string;
  description: string;
  status: string;
  entitled: boolean;
  actionLabel: string;
  onAction: () => void;
  disabled: boolean;
  pendingCopy?: string;
  reason?: string;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-black p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-safe text-lg font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{description}</p>
        </div>
        <Badge tone={entitled ? "green" : statusTone(status)}>
          {entitled ? "Active" : prettyLabel(status)}
        </Badge>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" variant={entitled ? "ghost" : "primary"} disabled={disabled} onClick={onAction}>
          {actionLabel}
        </Button>
        {pendingCopy ? <span className="break-safe text-xs leading-5 text-[color:var(--label3)]">{pendingCopy}</span> : null}
      </div>
      {!entitled ? (
        <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label3)]">
          {reason ?? "Purchase this add-on before starting setup."}
        </p>
      ) : null}
    </div>
  );
}

function ActionNotice({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" }) {
  const toneClass = tone === "green"
    ? "border-[color:color-mix(in_srgb,var(--green)_34%,transparent)] text-[color:var(--green)]"
    : tone === "red"
      ? "border-[color:color-mix(in_srgb,var(--red)_34%,transparent)] text-[color:var(--red)]"
      : tone === "amber"
        ? "border-[color:color-mix(in_srgb,var(--amber)_34%,transparent)] text-[color:var(--amber)]"
        : "border-[color:var(--line)] text-[color:var(--label2)]";

  return (
    <GlassCard className={toneClass}>
      <p className="break-safe text-sm leading-6">{children}</p>
    </GlassCard>
  );
}

function StudentCopierBody() {
  const [response, setResponse] = useState<StudentCopierOverviewResponse | null>(null);
  const [activeSetup, setActiveSetup] = useState<AutoCopyMarket>("crypto");
  const [connectionForm, setConnectionForm] = useState<ConnectionFormState>(emptyConnectionForm);
  const [forexProvisioningForm, setForexProvisioningForm] = useState<ForexProvisioningFormState>(
    emptyForexProvisioningForm
  );
  const [preferenceForm, setPreferenceForm] = useState<PreferenceFormState>({
    maxRiskPercentPerTrade: "1",
    maxDailyLossPercent: "3",
    maxOpenTrades: "3",
    allowedSymbols: ""
  });
  const [autoCopyForm, setAutoCopyForm] = useState<AutoCopyPreferenceFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncOverview = useCallback((payload: StudentCopierOverviewResponse, market?: AutoCopyMarket) => {
    const nextMarket = market ?? "crypto";
    setResponse(payload);
    setActiveSetup(nextMarket);
    setPreferenceForm(buildPreferenceForm(payload));
    setAutoCopyForm(buildAutoCopyPreferenceForm(payload, nextMarket));
  }, []);

  const loadExecution = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCopierOverviewResponse>("/api/student/copier");
      syncOverview(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not load your Copier setup.");
    } finally {
      setIsLoading(false);
    }
  }, [syncOverview]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const hasCheckoutReference =
        Boolean(url.searchParams.get("copierReference")?.trim()) ||
        Boolean(url.searchParams.get("cryptoReference")?.trim()) ||
        Boolean(url.searchParams.get("forexReference")?.trim());

      if (hasCheckoutReference) {
        return;
      }
    }

    void loadExecution();
  }, [loadExecution]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const reference = url.searchParams.get("copierReference")?.trim() ?? "";
    if (!reference) return;

    let cancelled = false;
    async function verifyReference() {
      setIsSaving(true);
      setMessage(null);
      setErrorMessage(null);

      try {
        const payload = await requestCourseHubApi<StudentCopierMutationResponse>(
          `/api/student/copier/verify?reference=${encodeURIComponent(reference)}`
        );
        if (!cancelled) {
          syncOverview(payload.overview, "crypto");
          setIsLoading(false);
          setMessage(payload.message ?? "Trade Copier checkout verified.");
          url.searchParams.delete("copierReference");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "TradeHub could not verify that Trade Copier checkout.");
          await loadExecution();
        }
      } finally {
        if (!cancelled) setIsSaving(false);
      }
    }

    void verifyReference();
    return () => {
      cancelled = true;
    };
  }, [loadExecution, syncOverview]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const cryptoReference = url.searchParams.get("cryptoReference")?.trim() ?? "";
    const forexReference = url.searchParams.get("forexReference")?.trim() ?? "";
    const reference = cryptoReference || forexReference;
    if (!reference) return;

    let cancelled = false;
    async function verifyReference() {
      setIsSaving(true);
      setMessage(null);
      setErrorMessage(null);

      try {
        const payload = await requestCourseHubApi<StudentCopierMutationResponse>(
          cryptoReference
            ? `/api/student/copier/crypto/verify?reference=${encodeURIComponent(reference)}`
            : `/api/student/copier/forex/verify?reference=${encodeURIComponent(reference)}`
        );
        if (!cancelled) {
          syncOverview(payload.overview, cryptoReference ? "crypto" : "forex");
          setIsLoading(false);
          setMessage(payload.message ?? "Trade Copier checkout verified.");
          url.searchParams.delete("cryptoReference");
          url.searchParams.delete("forexReference");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "TradeHub could not verify that Trade Copier checkout.");
          await loadExecution();
        }
      } finally {
        if (!cancelled) setIsSaving(false);
      }
    }

    void verifyReference();
    return () => {
      cancelled = true;
    };
  }, [loadExecution, syncOverview]);

  function chooseSetup(market: AutoCopyMarket) {
    if (!response) return;
    setActiveSetup(market);
    setAutoCopyForm(buildAutoCopyPreferenceForm(response, market));
  }

  async function submitConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCopierOverviewResponse>(
        "/api/student/copier/crypto/connections",
        {
          method: "POST",
          body: JSON.stringify(connectionForm)
        }
      );
      syncOverview(payload, "crypto");
      setMessage("Exchange permission check passed. Your Crypto Copier connection was saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not verify that exchange key.");
      await loadExecution();
    } finally {
      setConnectionForm(emptyConnectionForm);
      setIsSaving(false);
    }
  }

  async function savePreferences(nextPaused?: boolean) {
    if (!response) return;

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCopierOverviewResponse>(
        "/api/student/copier/crypto/preferences",
        {
          method: "POST",
          body: JSON.stringify({
            maxRiskPercentPerTrade: preferenceForm.maxRiskPercentPerTrade,
            maxDailyLossPercent: preferenceForm.maxDailyLossPercent,
            maxOpenTrades: preferenceForm.maxOpenTrades,
            allowedSymbols: preferenceForm.allowedSymbols,
            optInState: nextPaused === true ? "paused" : "opted_in_paper",
            studentPaused: nextPaused ?? response.products.crypto.setup.risk.paused
          })
        }
      );
      syncOverview(payload, "crypto");
      setMessage(nextPaused === true
        ? "Crypto Copier is paused."
        : nextPaused === false
          ? "Crypto Copier is resumed."
          : "Crypto risk limits saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save those risk limits.");
    } finally {
      setIsSaving(false);
    }
  }

  async function mutateConnection(actionRef: string, action: "refresh" | "disable") {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCopierOverviewResponse>(
        `/api/student/copier/crypto/connections/${actionRef}/${action}`,
        { method: "POST" }
      );
      syncOverview(payload, "crypto");
      setMessage(action === "refresh" ? "Connection check refreshed." : "Connection disabled.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update that connection.");
      await loadExecution();
    } finally {
      setIsSaving(false);
    }
  }

  async function submitForexProvisioning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCopierOverviewResponse>(
        "/api/student/copier/forex/provisioning",
        {
          method: "POST",
          body: JSON.stringify(forexProvisioningForm)
        }
      );
      syncOverview(payload, "forex");
      setMessage("Forex broker setup was received. TradeHub will show the next available safe setup state here.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save that Forex setup.");
      await loadExecution();
    } finally {
      setForexProvisioningForm(emptyForexProvisioningForm);
      setIsSaving(false);
    }
  }

  async function startTradeCopierCheckout() {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCopierCheckoutStartResponse>(
        "/api/student/copier/checkout",
        { method: "POST" }
      );
      setMessage("Trade Copier checkout opened. Crypto Setup and Forex Setup unlock after verified payment.");
      window.location.href = payload.authorizationUrl;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not open Trade Copier checkout.");
      await loadExecution();
      setIsSaving(false);
    }
  }

  async function cancelTradeCopierSubscription() {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCopierOverviewResponse>(
        "/api/student/copier/cancel",
        { method: "POST" }
      );
      syncOverview(payload, "crypto");
      setMessage("Trade Copier subscription cancelled. Crypto Setup and Forex Setup are locked.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not cancel Trade Copier.");
      await loadExecution();
    } finally {
      setIsSaving(false);
    }
  }

  async function disableForexProvisioning() {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCopierOverviewResponse>(
        "/api/student/copier/forex/provisioning/disable",
        { method: "POST" }
      );
      syncOverview(payload, "forex");
      setMessage("Forex Copier setup disabled.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not disable Forex Copier setup.");
      await loadExecution();
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAutoCopyPreferences() {
    if (!autoCopyForm) return;

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const nextConsentStatus =
        autoCopyForm.consentStatus === "paused" || autoCopyForm.consentStatus === "revoked"
          ? autoCopyForm.consentStatus
          : autoCopyForm.executionFairnessDisclosureAccepted && autoCopyForm.suitabilityAcknowledged
            ? "accepted"
            : "missing";
      const payload = await requestCourseHubApi<StudentCopierOverviewResponse>(
        "/api/student/copier/preferences",
        {
          method: "POST",
          body: JSON.stringify({
            market: autoCopyForm.market,
            executionMode: autoCopyForm.executionMode,
            sizingMode: autoCopyForm.sizingMode,
            maxRiskPercentPerTrade: autoCopyForm.maxRiskPercentPerTrade,
            maxFixedNotional: autoCopyForm.maxFixedNotional,
            maxDailyLoss: autoCopyForm.maxDailyLoss,
            maxOpenTrades: autoCopyForm.maxOpenTrades,
            allowedSymbols: autoCopyForm.market === "crypto" ? autoCopyForm.allowedSymbols : undefined,
            allowedPairs: autoCopyForm.market === "forex" ? autoCopyForm.allowedSymbols : undefined,
            staleSignalPolicy: autoCopyForm.staleSignalPolicy,
            staleSignalMaxAgeSeconds: autoCopyForm.staleSignalMaxAgeSeconds,
            studentPaused: autoCopyForm.studentPaused,
            consentStatus: nextConsentStatus,
            executionFairnessDisclosureAccepted: autoCopyForm.executionFairnessDisclosureAccepted,
            suitabilityAcknowledged: autoCopyForm.suitabilityAcknowledged
          })
        }
      );
      syncOverview(payload, autoCopyForm.market);
      setMessage(autoCopyForm.market === "forex" ? "Forex Copier controls saved." : "Crypto Copier controls saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save Copier controls.");
    } finally {
      setIsSaving(false);
    }
  }

  const subscription = response?.subscription;
  const cryptoSetup = response?.products.crypto.setup;
  const forexSetup = response?.products.forex.setup;
  const hasCopierEntitlement = Boolean(subscription?.entitled);
  const baseEligible = Boolean(response?.eligibility.eligible);
  const setupStatus = activeSetup === "crypto"
    ? hasCopierEntitlement ? cryptoSetup?.status ?? "not_started" : subscription?.status ?? "purchase_needed"
    : hasCopierEntitlement ? forexSetup?.status ?? "not_started" : subscription?.status ?? "purchase_needed";

  const side = (
    <GlassCard className="space-y-3">
      <p className="text-sm font-semibold text-[color:var(--label)]">Separate add-on</p>
      <p className="text-sm leading-6 text-[color:var(--label2)]">
        Trade Copier is purchased by the student separately. It is not included in workspace Launch, Pro, or Enterprise packages.
      </p>
    </GlassCard>
  );

  return (
    <StudentShell
      active="copier"
      eyebrow="Trade Copier"
      title="Purchase and account setup"
      subtitle="Purchase Trade Copier once, then complete Crypto Setup, Forex Setup, or both from the same add-on."
      action={<Badge tone={statusTone(setupStatus)}>{prettyLabel(setupStatus)}</Badge>}
      side={side}
    >
      {errorMessage ? (
        <ActionNotice tone="red">
          {errorMessage}
          <span className="mt-3 block">
            <Button onClick={loadExecution} variant="secondary">Refresh</Button>
          </span>
        </ActionNotice>
      ) : null}

      {message ? <ActionNotice tone="green">{message}</ActionNotice> : null}

      {isLoading ? (
        <ActionNotice>Loading your Trade Copier setup...</ActionNotice>
      ) : response ? (
        <div className="space-y-5" data-testid="student-copier-workspace">
          <GlassCard className="space-y-5" data-testid="copier-purchase-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow !text-[color:var(--accent)]">Student add-on</p>
                <h2 className="mt-2 break-safe text-2xl font-semibold text-[color:var(--label)]">
                  Trade Copier subscription
                </h2>
                <p className="mt-2 max-w-3xl break-safe text-sm leading-6 text-[color:var(--label2)]">
                  One Trade Copier payment unlocks both Crypto Setup and Forex Setup. Each setup keeps its own provider, consent, and risk controls.
                </p>
              </div>
              <Badge tone={hasCopierEntitlement ? "green" : "amber"}>
                {hasCopierEntitlement ? "Setup available" : "Purchase needed"}
              </Badge>
            </div>

            <div className="grid gap-4">
              <SubscriptionTile
                title="Trade Copier"
                description="A single student add-on for Binance/Bybit Crypto Setup and MT4/MT5 Forex Setup after verified payment."
                status={subscription?.status ?? "purchase_needed"}
                entitled={hasCopierEntitlement}
                actionLabel={hasCopierEntitlement ? "Cancel Trade Copier" : "Purchase Trade Copier"}
                disabled={isSaving || (!hasCopierEntitlement && !baseEligible)}
                onAction={hasCopierEntitlement ? cancelTradeCopierSubscription : startTradeCopierCheckout}
                pendingCopy={subscription?.status === "payment_pending" ? "Payment is pending. Return from checkout so TradeHub can verify it." : undefined}
                reason={subscription?.reason}
              />
            </div>

            {!baseEligible ? (
              <p className="break-safe rounded-[16px] border border-[color:var(--line)] bg-black px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                {response.eligibility.reason}
              </p>
            ) : null}
          </GlassCard>

          {hasCopierEntitlement ? (
            <>
              <div className="flex flex-wrap gap-3" role="tablist" aria-label="Copier setup choices">
                <SetupTabButton active={activeSetup === "crypto"} onClick={() => chooseSetup("crypto")}>
                  Crypto Setup
                </SetupTabButton>
                <SetupTabButton active={activeSetup === "forex"} onClick={() => chooseSetup("forex")}>
                  Forex Setup
                </SetupTabButton>
              </div>

              {activeSetup === "crypto" ? (
                <section className="space-y-5" data-testid="copier-crypto-setup-panel">
                  <div className="grid gap-4 md:grid-cols-3">
                    <StatChip label="Subscription" value={hasCopierEntitlement ? "Active" : "Purchase needed"} tone={hasCopierEntitlement ? "green" : "amber"} />
                    <StatChip label="Connection" value={(cryptoSetup?.connections.length ?? 0) > 0 ? "Saved" : "Not connected"} tone={(cryptoSetup?.connections.length ?? 0) > 0 ? "green" : "amber"} />
                    <StatChip label="Student pause" value={cryptoSetup?.risk.paused ? "Paused" : "Active"} tone={cryptoSetup?.risk.paused ? "red" : "green"} />
                  </div>

                  {!hasCopierEntitlement ? (
                    <ActionNotice tone="amber">Purchase Trade Copier before connecting Binance or Bybit.</ActionNotice>
                  ) : eligibleNotice(baseEligible) ?? (
                    <>
                      <GlassCard className="space-y-5" data-testid="copier-crypto-connection-card">
                        <div>
                          <h2 className="break-safe text-xl font-semibold text-[color:var(--label)]">Binance and Bybit connection</h2>
                          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                            Submit a Binance or Bybit key for permission checking. Use a personal account and keep withdrawals disabled.
                          </p>
                        </div>
                        <form className="space-y-4" onSubmit={submitConnection}>
                          <div className="grid gap-4 md:grid-cols-2">
                            <FieldLabel label="Exchange">
                              <select
                                className={inputClass}
                                value={connectionForm.exchange}
                                onChange={(event) => setConnectionForm((current) => ({ ...current, exchange: event.target.value as CryptoExchangeId }))}
                              >
                                <option value="binance">Binance</option>
                                <option value="bybit">Bybit</option>
                              </select>
                            </FieldLabel>
                            <FieldLabel label="Account type">
                              <select
                                className={inputClass}
                                value={connectionForm.environment}
                                onChange={(event) => setConnectionForm((current) => ({ ...current, environment: event.target.value as CryptoExchangeEnvironment }))}
                              >
                                <option value="sandbox">Test account</option>
                                <option value="production">Real account</option>
                              </select>
                            </FieldLabel>
                          </div>
                          <FieldLabel label="Exchange key">
                            <input
                              className={inputClass}
                              autoComplete="off"
                              spellCheck={false}
                              value={connectionForm.apiKey}
                              onChange={(event) => setConnectionForm((current) => ({ ...current, apiKey: event.target.value }))}
                            />
                          </FieldLabel>
                          <FieldLabel label="Exchange secret">
                            <input
                              className={inputClass}
                              autoComplete="off"
                              spellCheck={false}
                              type="password"
                              value={connectionForm.apiSecret}
                              onChange={(event) => setConnectionForm((current) => ({ ...current, apiSecret: event.target.value }))}
                            />
                          </FieldLabel>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                              <input
                                className="mt-1 h-4 w-4 shrink-0"
                                type="checkbox"
                                checked={connectionForm.personalAccountAcknowledged}
                                onChange={(event) => setConnectionForm((current) => ({ ...current, personalAccountAcknowledged: event.target.checked }))}
                              />
                              <span className="break-safe">This is my personal Binance/Bybit account.</span>
                            </label>
                            <label className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                              <input
                                className="mt-1 h-4 w-4 shrink-0"
                                type="checkbox"
                                checked={connectionForm.riskAcknowledged}
                                onChange={(event) => setConnectionForm((current) => ({ ...current, riskAcknowledged: event.target.checked }))}
                              />
                              <span className="break-safe">I understand copying trades can lose money.</span>
                            </label>
                          </div>
                          <Button type="submit" variant="primary" disabled={isSaving}>
                            Verify connection
                          </Button>
                        </form>
                      </GlassCard>

                      <GlassCard className="space-y-5" data-testid="copier-crypto-risk-card">
                        <div>
                          <h2 className="break-safe text-xl font-semibold text-[color:var(--label)]">Crypto risk limits</h2>
                          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                            Keep your maximum risk, daily loss, open trades, and allowed symbols under your control.
                          </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <FieldLabel label="Max risk per trade">
                            <input className={inputClass} inputMode="decimal" value={preferenceForm.maxRiskPercentPerTrade} onChange={(event) => setPreferenceForm((current) => ({ ...current, maxRiskPercentPerTrade: event.target.value }))} />
                          </FieldLabel>
                          <FieldLabel label="Max daily loss">
                            <input className={inputClass} inputMode="decimal" value={preferenceForm.maxDailyLossPercent} onChange={(event) => setPreferenceForm((current) => ({ ...current, maxDailyLossPercent: event.target.value }))} />
                          </FieldLabel>
                          <FieldLabel label="Max open trades">
                            <input className={inputClass} inputMode="numeric" value={preferenceForm.maxOpenTrades} onChange={(event) => setPreferenceForm((current) => ({ ...current, maxOpenTrades: event.target.value }))} />
                          </FieldLabel>
                        </div>
                        <FieldLabel label="Allowed symbols">
                          <input className={inputClass} placeholder="BTCUSDT, ETHUSDT" value={preferenceForm.allowedSymbols} onChange={(event) => setPreferenceForm((current) => ({ ...current, allowedSymbols: event.target.value }))} />
                        </FieldLabel>
                        <div className="flex flex-wrap gap-3">
                          <Button onClick={() => savePreferences()} variant="primary" disabled={isSaving}>Save risk limits</Button>
                          <Button onClick={() => savePreferences(!cryptoSetup?.risk.paused)} variant="secondary" disabled={isSaving}>
                            {cryptoSetup?.risk.paused ? "Resume Crypto Copier" : "Pause Crypto Copier"}
                          </Button>
                        </div>
                      </GlassCard>

                      <SetupControls form={autoCopyForm} isSaving={isSaving} onChange={setAutoCopyForm} onSave={saveAutoCopyPreferences} />

                      <div className="grid gap-4" data-testid="copier-crypto-connections">
                        {(cryptoSetup?.connections.length ?? 0) === 0 ? (
                          <ActionNotice tone="amber">No Binance or Bybit connection has been verified yet.</ActionNotice>
                        ) : (
                          cryptoSetup?.connections.map((connection) => (
                            <GlassCard key={connection.actionRef} className="space-y-4" data-testid="copier-connection-row">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
                                    {connection.connectionLabel}
                                  </p>
                                  <p className="mt-1 break-safe text-xs text-[color:var(--label3)]">
                                    Last checked {safeDate(connection.lastCheckedAt)}
                                  </p>
                                </div>
                                <Badge tone={statusTone(connection.status)}>{connection.statusLabel}</Badge>
                              </div>
                              <div className="grid gap-3 md:grid-cols-3">
                                <StatChip label="Account" value={connection.accountKind === "real_account" ? "Real account" : "Test account"} />
                                <StatChip label="Permissions" value={prettyLabel(connection.permissionCheck)} tone={statusTone(connection.permissionCheck)} />
                                <StatChip label="Withdrawals" value={connection.withdrawalAccess === "confirmed_disabled" ? "Disabled" : "Check needed"} tone={connection.withdrawalAccess === "confirmed_disabled" ? "green" : "amber"} />
                              </div>
                              <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
                                {connection.description}
                              </p>
                              <div className="flex flex-wrap gap-3">
                                <Button onClick={() => mutateConnection(connection.actionRef, "refresh")} variant="secondary" disabled={isSaving || connection.status === "disabled"}>
                                  Refresh check
                                </Button>
                                <Button onClick={() => mutateConnection(connection.actionRef, "disable")} variant="ghost" disabled={isSaving || connection.status === "disabled"}>
                                  Disable connection
                                </Button>
                              </div>
                            </GlassCard>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </section>
              ) : (
                <section className="space-y-5" data-testid="copier-forex-setup-panel">
                  <div className="grid gap-4 md:grid-cols-3">
                    <StatChip label="Subscription" value={hasCopierEntitlement ? "Active" : "Purchase needed"} tone={hasCopierEntitlement ? "green" : "amber"} />
                    <StatChip label="Broker setup" value={forexSetup?.statusLabel ?? "Not started"} tone={statusTone(forexSetup?.status)} />
                    <StatChip label="Account" value={forexSetup?.account?.active ? "Connected" : "Not connected"} tone={forexSetup?.account?.active ? "green" : "amber"} />
                  </div>

                  {!hasCopierEntitlement ? (
                    <ActionNotice tone="amber">Purchase Trade Copier before submitting MT4/MT5 setup.</ActionNotice>
                  ) : eligibleNotice(baseEligible) ?? (
                    <>
                      <GlassCard className="space-y-5" data-testid="copier-forex-broker-card">
                        <div>
                          <h2 className="break-safe text-xl font-semibold text-[color:var(--label)]">MT4/MT5 broker setup</h2>
                          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                            Submit your approved broker details for setup review. TradeHub does not custody your funds or need withdrawal access.
                          </p>
                        </div>
                        <form className="space-y-4" onSubmit={submitForexProvisioning}>
                          <div className="grid gap-4 md:grid-cols-2">
                            <FieldLabel label="Platform">
                              <select className={inputClass} value={forexProvisioningForm.platform} onChange={(event) => setForexProvisioningForm((current) => ({ ...current, platform: event.target.value as "mt4" | "mt5" }))}>
                                <option value="mt4">MT4</option>
                                <option value="mt5">MT5</option>
                              </select>
                            </FieldLabel>
                            <FieldLabel label="Optional label">
                              <input className={inputClass} placeholder="My personal broker account" value={forexProvisioningForm.label} onChange={(event) => setForexProvisioningForm((current) => ({ ...current, label: event.target.value }))} />
                            </FieldLabel>
                          </div>
                          <FieldLabel label="Broker name/server">
                            <input className={inputClass} autoComplete="off" spellCheck={false} placeholder="Your broker server name" value={forexProvisioningForm.brokerServer} onChange={(event) => setForexProvisioningForm((current) => ({ ...current, brokerServer: event.target.value }))} />
                          </FieldLabel>
                          <FieldLabel label="Broker login/account number">
                            <input className={inputClass} autoComplete="off" spellCheck={false} value={forexProvisioningForm.brokerLogin} onChange={(event) => setForexProvisioningForm((current) => ({ ...current, brokerLogin: event.target.value }))} />
                          </FieldLabel>
                          <FieldLabel label="Broker password">
                            <input className={inputClass} autoComplete="off" spellCheck={false} type="password" value={forexProvisioningForm.brokerPassword} onChange={(event) => setForexProvisioningForm((current) => ({ ...current, brokerPassword: event.target.value }))} />
                          </FieldLabel>
                          <div className="grid gap-3 md:grid-cols-2">
                            {[
                              ["personalAccountAcknowledged", "This is my personal MT4/MT5 broker account."],
                              ["billingAcknowledged", "I understand Trade Copier covers this Forex setup."],
                              ["dryRunAcknowledged", "I understand availability depends on TradeHub approval and account checks."],
                              ["noOrderAcknowledged", "I understand TradeHub does not custody my funds or need withdrawal access."]
                            ].map(([key, label]) => (
                              <label key={key} className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                                <input
                                  className="mt-1 h-4 w-4 shrink-0"
                                  type="checkbox"
                                  checked={forexProvisioningForm[key as keyof ForexProvisioningFormState] as boolean}
                                  onChange={(event) => setForexProvisioningForm((current) => ({ ...current, [key]: event.target.checked }))}
                                />
                                <span className="break-safe">{label}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button type="submit" variant="primary" disabled={isSaving}>Submit broker setup</Button>
                            <Button type="button" variant="ghost" disabled={isSaving || !forexSetup?.account?.active} onClick={disableForexProvisioning}>
                              Disable Forex setup
                            </Button>
                          </div>
                        </form>
                      </GlassCard>

                      <SetupControls form={autoCopyForm} isSaving={isSaving} onChange={setAutoCopyForm} onSave={saveAutoCopyPreferences} />

                      <GlassCard className="space-y-4" data-testid="copier-forex-status-card">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="break-safe text-xl font-semibold text-[color:var(--label)]">Current Forex setup</h2>
                            <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                              {forexSetup?.description ?? "No Forex broker setup has been completed yet."}
                            </p>
                          </div>
                          <Badge tone={statusTone(forexSetup?.status)}>
                            {forexSetup?.statusLabel ?? "Not started"}
                          </Badge>
                        </div>
                        {forexSetup?.account ? (
                          <div className="grid gap-3 md:grid-cols-3">
                            <StatChip label="Platform" value={forexSetup.account.platform.toUpperCase()} />
                            <StatChip label="Status" value={forexSetup.account.statusLabel} tone={statusTone(forexSetup.account.status)} />
                            <StatChip label="Updated" value={safeDate(forexSetup.account.updatedAt)} />
                          </div>
                        ) : null}
                      </GlassCard>
                    </>
                  )}
                </section>
              )}
            </>
          ) : (
            <GlassCard className="space-y-3" data-testid="copier-unpaid-empty-state">
              <h2 className="break-safe text-xl font-semibold text-[color:var(--label)]">Purchase Trade Copier to continue</h2>
              <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
                Courses, Journal, Practice, and Signals can remain available through your normal student access. Copier setup starts only after the Trade Copier payment is verified.
              </p>
            </GlassCard>
          )}
        </div>
      ) : null}
    </StudentShell>
  );
}

function eligibleNotice(baseEligible: boolean | undefined) {
  return baseEligible ? null : <ActionNotice tone="amber">Copier setup is unavailable for this student profile. Contact your instructor if you need help.</ActionNotice>;
}

function SetupControls({
  form,
  isSaving,
  onChange,
  onSave
}: {
  form: AutoCopyPreferenceFormState | null;
  isSaving: boolean;
  onChange: (updater: (current: AutoCopyPreferenceFormState | null) => AutoCopyPreferenceFormState | null) => void;
  onSave: () => void;
}) {
  if (!form) return null;

  const marketLabel = form.market === "crypto" ? "Crypto" : "Forex";

  return (
    <GlassCard className="space-y-5" data-testid={`copier-${form.market}-controls-card`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-safe text-xl font-semibold text-[color:var(--label)]">{marketLabel} Copier controls</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
            Choose how TradeHub should handle copied trade alerts for this market, then keep your risk limits current.
          </p>
        </div>
        <Badge tone={statusTone(form.consentStatus)}>{prettyLabel(form.consentStatus)}</Badge>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <FieldLabel label="Copy mode">
          <select className={inputClass} value={form.executionMode} onChange={(event) => onChange((current) => current ? { ...current, executionMode: event.target.value as CrossAssetAutoCopyExecutionMode } : current)}>
            <option value="full_auto">Auto copy</option>
            <option value="confirm_before_execute">Ask before copying</option>
            <option value="alerts_only">Alerts only</option>
          </select>
        </FieldLabel>
        <FieldLabel label="Sizing">
          <select className={inputClass} value={form.sizingMode} onChange={(event) => onChange((current) => current ? { ...current, sizingMode: event.target.value as CrossAssetAutoCopySizingMode } : current)}>
            <option value="fixed_notional">Fixed amount</option>
            <option value="risk_percent">Risk percent</option>
          </select>
        </FieldLabel>
        <FieldLabel label="Late signal handling">
          <select className={inputClass} value={form.staleSignalPolicy} onChange={(event) => onChange((current) => current ? { ...current, staleSignalPolicy: event.target.value as CrossAssetStaleSignalPolicy } : current)}>
            <option value="confirm_if_stale">Ask me first</option>
            <option value="expire_after_seconds">Skip after a time limit</option>
            <option value="allow_until_manual_cancel">Keep available until cancelled</option>
          </select>
        </FieldLabel>
        <FieldLabel label="Late signal window">
          <input className={inputClass} inputMode="numeric" value={form.staleSignalMaxAgeSeconds} onChange={(event) => onChange((current) => current ? { ...current, staleSignalMaxAgeSeconds: event.target.value } : current)} />
        </FieldLabel>
        <FieldLabel label="Max risk percent">
          <input className={inputClass} inputMode="decimal" value={form.maxRiskPercentPerTrade} onChange={(event) => onChange((current) => current ? { ...current, maxRiskPercentPerTrade: event.target.value } : current)} />
        </FieldLabel>
        <FieldLabel label="Fixed amount">
          <input className={inputClass} inputMode="decimal" value={form.maxFixedNotional} onChange={(event) => onChange((current) => current ? { ...current, maxFixedNotional: event.target.value } : current)} />
        </FieldLabel>
        <FieldLabel label="Max daily loss">
          <input className={inputClass} inputMode="decimal" value={form.maxDailyLoss} onChange={(event) => onChange((current) => current ? { ...current, maxDailyLoss: event.target.value } : current)} />
        </FieldLabel>
        <FieldLabel label="Max open trades">
          <input className={inputClass} inputMode="numeric" value={form.maxOpenTrades} onChange={(event) => onChange((current) => current ? { ...current, maxOpenTrades: event.target.value } : current)} />
        </FieldLabel>
      </div>

      <FieldLabel label={form.market === "crypto" ? "Allowed symbols" : "Allowed pairs"}>
        <input
          className={inputClass}
          placeholder={form.market === "crypto" ? "BTCUSDT, ETHUSDT" : "EURUSD, GBPUSD"}
          value={form.allowedSymbols}
          onChange={(event) => onChange((current) => current ? { ...current, allowedSymbols: event.target.value } : current)}
        />
      </FieldLabel>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          <input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={form.studentPaused} onChange={(event) => onChange((current) => current ? { ...current, studentPaused: event.target.checked } : current)} />
          <span className="break-safe">Pause {marketLabel} Copier.</span>
        </label>
        <label className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          <input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={form.executionFairnessDisclosureAccepted} onChange={(event) => onChange((current) => current ? { ...current, executionFairnessDisclosureAccepted: event.target.checked } : current)} />
          <span className="break-safe">I understand copied fills and timing may differ.</span>
        </label>
        <label className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          <input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={form.suitabilityAcknowledged} onChange={(event) => onChange((current) => current ? { ...current, suitabilityAcknowledged: event.target.checked } : current)} />
          <span className="break-safe">I understand TradeHub does not guarantee profit.</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onSave} variant="primary" disabled={isSaving}>Save {marketLabel} controls</Button>
        <Button
          onClick={() => onChange((current) => current ? { ...current, consentStatus: current.consentStatus === "revoked" ? "missing" : "revoked" } : current)}
          variant="ghost"
          disabled={isSaving}
        >
          {form.consentStatus === "revoked" ? "Reset consent" : "Revoke consent"}
        </Button>
      </div>
    </GlassCard>
  );
}

export function StudentCopierClient() {
  return (
    <RoleGate allowedRole="student" nextPath="/app/copier">
      <StudentCopierBody />
    </RoleGate>
  );
}
