"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { productSafeText } from "@/components/crypto-execution/display-safety";
import { StudentBroadLiveAutoCopyStatusCard } from "@/components/crypto-execution/broad-live-autocopy-readiness";
import { ForexDemoExecutionPreviewCard } from "@/components/crypto-execution/forex-demo-execution-preview";
import { ForexPaperExecutionPreviewCard } from "@/components/crypto-execution/forex-paper-execution-preview";
import { ForexProvisioningPreviewCard } from "@/components/crypto-execution/forex-provisioning-preview";
import { LiveProductionExecutionPreviewCard } from "@/components/crypto-execution/live-production-execution-preview";
import { PaperExecutionPreview } from "@/components/crypto-execution/paper-execution-preview";
import { LiveSandboxExecutionPreviewCard } from "@/components/crypto-execution/live-sandbox-execution-preview";
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
  CryptoExchangeId,
  StudentCryptoAutoCopyCheckoutResponse,
  StudentCryptoAutoCopyVerifyResponse,
  StudentCryptoExecutionOverviewResponse,
  StudentForexAutoCopyCheckoutResponse,
  StudentForexAutoCopyVerifyResponse
} from "@/types/crypto-execution";

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

type ProductionConsentFormState = {
  personalExchangeConfirmed: boolean;
  notFundedOrPropFirmConfirmed: boolean;
  withdrawalsDisabledConfirmed: boolean;
  productionLiveLossRiskConfirmed: boolean;
  tradeHubNoCustodyConfirmed: boolean;
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

const emptyProductionConsentForm: ProductionConsentFormState = {
  personalExchangeConfirmed: false,
  notFundedOrPropFirmConfirmed: false,
  withdrawalsDisabledConfirmed: false,
  productionLiveLossRiskConfirmed: false,
  tradeHubNoCustodyConfirmed: false
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
  personalAccountAcknowledged: false,
};

function readinessLabel(state: string) {
  return state
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function badgeTone(state: string): "green" | "amber" | "red" {
  if (state === "paper_ready" || state === "live_ready") {
    return "green";
  }

  if (state.startsWith("paused") || state.includes("blocked") || state === "alerts_only") {
    return "red";
  }

  return "amber";
}

function consentTone(status: string): "green" | "amber" | "red" {
  if (status === "accepted") {
    return "green";
  }

  if (status === "paused" || status === "revoked") {
    return "red";
  }

  return "amber";
}

function safeDate(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function buildPreferenceForm(response: StudentCryptoExecutionOverviewResponse): PreferenceFormState {
  return {
    maxRiskPercentPerTrade: String(response.preferences.maxRiskPercentPerTrade),
    maxDailyLossPercent: String(response.preferences.maxDailyLossPercent),
    maxOpenTrades: String(response.preferences.maxOpenTrades),
    allowedSymbols: response.preferences.allowedSymbols.join(", ")
  };
}

function buildAutoCopyPreferenceForm(
  response: StudentCryptoExecutionOverviewResponse,
  market: AutoCopyMarket = "crypto"
): AutoCopyPreferenceFormState {
  const preferences = response.autoCopyPreferences[market];

  return {
    market,
    executionMode: preferences.executionMode,
    sizingMode: preferences.sizingMode,
    maxRiskPercentPerTrade: String(preferences.maxRiskPercentPerTrade),
    maxFixedNotional: String(preferences.maxFixedNotional),
    maxDailyLoss: String(preferences.maxDailyLoss),
    maxOpenTrades: String(preferences.maxOpenTrades),
    allowedSymbols: market === "crypto"
      ? preferences.allowedSymbols.join(", ")
      : preferences.allowedPairs.join(", "),
    staleSignalPolicy: preferences.staleSignalPolicy,
    staleSignalMaxAgeSeconds: String(preferences.staleSignalMaxAgeSeconds),
    studentPaused: preferences.studentPaused,
    consentStatus: preferences.consentStatus,
    executionFairnessDisclosureAccepted: Boolean(preferences.executionFairnessDisclosureAcceptedAt),
    suitabilityAcknowledged: Boolean(preferences.suitabilityAcknowledgedAt)
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

const inputClass =
  "focus-ring min-h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_80%,transparent)] px-4 py-3 text-sm text-[color:var(--label)] outline-none placeholder:text-[color:var(--label3)]";

function StudentCopierBody() {
  const [response, setResponse] = useState<StudentCryptoExecutionOverviewResponse | null>(null);
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
  const [productionConsentForm, setProductionConsentForm] = useState<ProductionConsentFormState>(
    emptyProductionConsentForm
  );
  const [autoCopyForm, setAutoCopyForm] = useState<AutoCopyPreferenceFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncOverview = useCallback((payload: StudentCryptoExecutionOverviewResponse, market?: AutoCopyMarket) => {
    setResponse(payload);
    setPreferenceForm(buildPreferenceForm(payload));
    setAutoCopyForm((current) => buildAutoCopyPreferenceForm(payload, market ?? current?.market ?? "crypto"));
  }, []);

  const loadExecution = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        "/api/student/crypto-execution/overview"
      );
      syncOverview(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "TradeHub could not load crypto execution setup."
      );
    } finally {
      setIsLoading(false);
    }
  }, [syncOverview]);

  useEffect(() => {
    void loadExecution();
  }, [loadExecution]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const reference = url.searchParams.get("forexReference")?.trim() ?? "";

    if (!reference) {
      return;
    }

    let cancelled = false;

    async function verifyReference() {
      setIsSaving(true);
      setMessage(null);
      setErrorMessage(null);

      try {
        const payload = await requestCourseHubApi<StudentForexAutoCopyVerifyResponse>(
          `/api/student/forex-execution/subscription/verify?reference=${encodeURIComponent(reference)}`
        );

        if (!cancelled) {
          syncOverview(payload.overview, "forex");
          setMessage(payload.message);
          url.searchParams.delete("forexReference");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "TradeHub could not verify that Forex AutoCopy checkout.");
          await loadExecution();
        }
      } finally {
        if (!cancelled) {
          setIsSaving(false);
        }
      }
    }

    void verifyReference();

    return () => {
      cancelled = true;
    };
  }, [loadExecution, syncOverview]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const reference = url.searchParams.get("cryptoReference")?.trim() ?? "";

    if (!reference) {
      return;
    }

    let cancelled = false;

    async function verifyReference() {
      setIsSaving(true);
      setMessage(null);
      setErrorMessage(null);

      try {
        const payload = await requestCourseHubApi<StudentCryptoAutoCopyVerifyResponse>(
          `/api/student/crypto-execution/subscription/verify?reference=${encodeURIComponent(reference)}`
        );

        if (!cancelled) {
          syncOverview(payload.overview, "crypto");
          setMessage(payload.message);
          url.searchParams.delete("cryptoReference");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "TradeHub could not verify that Crypto AutoCopy checkout.");
          await loadExecution();
        }
      } finally {
        if (!cancelled) {
          setIsSaving(false);
        }
      }
    }

    void verifyReference();

    return () => {
      cancelled = true;
    };
  }, [loadExecution, syncOverview]);

  async function submitConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        "/api/student/crypto-execution/connections",
        {
          method: "POST",
          body: JSON.stringify(connectionForm)
        }
      );
      syncOverview(payload);
      setMessage("Exchange permission check passed and encrypted connection metadata was saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not verify that key.");
      await loadExecution();
    } finally {
      setConnectionForm(emptyConnectionForm);
      setIsSaving(false);
    }
  }

  async function savePreferences(nextPaused?: boolean) {
    if (!response) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        "/api/student/crypto-execution/preferences",
        {
          method: "POST",
          body: JSON.stringify({
            maxRiskPercentPerTrade: preferenceForm.maxRiskPercentPerTrade,
            maxDailyLossPercent: preferenceForm.maxDailyLossPercent,
            maxOpenTrades: preferenceForm.maxOpenTrades,
            allowedSymbols: preferenceForm.allowedSymbols,
            optInState: nextPaused === true
              ? "paused"
              : nextPaused === false
                ? "opted_in_paper"
                : response.preferences.optInState === "not_started"
                  ? "opted_in_paper"
                  : response.preferences.optInState,
            studentPaused: nextPaused ?? response.preferences.studentPaused
          })
        }
      );
      syncOverview(payload);
      setMessage(nextPaused === true
        ? "Crypto Auto-Copy readiness is paused."
        : nextPaused === false
          ? "Crypto Auto-Copy readiness is resumed in paper mode."
          : "Paper-mode risk preferences saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  async function mutateConnection(connectionId: string, action: "refresh" | "disable") {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        `/api/student/crypto-execution/connections/${connectionId}/${action}`,
        { method: "POST" }
      );
      syncOverview(payload);
      setMessage(action === "refresh" ? "Connection permission check refreshed." : "Connection disabled.");
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
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        "/api/student/forex-execution/provisioning",
        {
          method: "POST",
          body: JSON.stringify(forexProvisioningForm)
        }
      );
      syncOverview(payload, "forex");
      setMessage("Forex AutoCopy provisioning dry-run completed. No provider resource, terminal, demo order, or live broker order was created.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not provision that Forex AutoCopy account.");
      await loadExecution();
    } finally {
      setForexProvisioningForm(emptyForexProvisioningForm);
      setIsSaving(false);
    }
  }

  async function startForexAutoCopyCheckout() {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentForexAutoCopyCheckoutResponse>(
        "/api/student/forex-execution/subscription/checkout",
        { method: "POST" }
      );

      setMessage("Forex AutoCopy checkout opened. Broker provisioning unlocks only after Paystack verifies payment.");
      window.location.href = payload.checkout.authorizationUrl;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not open Forex AutoCopy checkout.");
      await loadExecution();
      setIsSaving(false);
    }
  }

  async function startCryptoAutoCopyCheckout() {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCryptoAutoCopyCheckoutResponse>(
        "/api/student/crypto-execution/subscription/checkout",
        { method: "POST" }
      );

      setMessage("Crypto AutoCopy checkout opened. Binance/Bybit setup unlocks only after Paystack verifies payment.");
      window.location.href = payload.checkout.authorizationUrl;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not open Crypto AutoCopy checkout.");
      await loadExecution();
      setIsSaving(false);
    }
  }

  async function cancelCryptoAutoCopySubscription() {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        "/api/student/crypto-execution/subscription/cancel",
        { method: "POST" }
      );
      syncOverview(payload, "crypto");
      setMessage("Crypto AutoCopy subscription cancelled. Binance/Bybit setup and routing are locked.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not cancel Crypto AutoCopy.");
      await loadExecution();
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelForexAutoCopySubscription() {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        "/api/student/forex-execution/subscription/cancel",
        { method: "POST" }
      );
      syncOverview(payload, "forex");
      setMessage("Forex AutoCopy subscription cancelled. Broker provisioning is disabled and mock cleanup is complete when needed.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not cancel Forex AutoCopy.");
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
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        "/api/student/forex-execution/provisioning/disable",
        { method: "POST" }
      );
      syncOverview(payload, "forex");
      setMessage("Forex AutoCopy provisioning disabled. Mock cleanup completed without provider calls.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not disable Forex AutoCopy provisioning.");
      await loadExecution();
    } finally {
      setIsSaving(false);
    }
  }

  async function mutateProductionConsent(action: "consent" | "pause" | "resume" | "revoke") {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        `/api/student/crypto-execution/live-production/${action}`,
        {
          method: "POST",
          body: action === "consent" ? JSON.stringify(productionConsentForm) : undefined
        }
      );
      syncOverview(payload);
      setMessage(action === "consent"
        ? "Production live beta consent accepted. Real orders remain blocked by TradeHub production gates until explicitly approved."
        : action === "pause"
          ? "Production live beta routing is paused."
          : action === "resume"
            ? "Production live beta consent resumed. Production gates still control all order execution."
            : "Production live beta consent revoked.");
      if (action === "consent") {
        setProductionConsentForm(emptyProductionConsentForm);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not update production live beta consent.");
      await loadExecution();
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAutoCopyPreferences() {
    if (!autoCopyForm) {
      return;
    }

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
      const payload = await requestCourseHubApi<StudentCryptoExecutionOverviewResponse>(
        "/api/student/crypto-execution/auto-copy/preferences",
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
      setMessage(autoCopyForm.market === "forex"
        ? "Forex paper Auto-Copy preferences saved. Forex remains simulation-only with no broker connection."
        : "Shared Auto-Copy controls saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "TradeHub could not save Auto-Copy controls.");
    } finally {
      setIsSaving(false);
    }
  }

  const cryptoBilling = response?.cryptoAutoCopy.billing;
  const cryptoAutoCopyPaid = Boolean(cryptoBilling?.entitled);
  const baseEligible =
    response?.student.autoCopyAccess === "allowed" &&
    response.student.riskPosture === "personal_account";
  const eligible = Boolean(baseEligible && cryptoAutoCopyPaid);
  const state = response?.readiness.state ?? "needs_connection";
  const productionConsent = response?.liveProductionConsent;
  const productionConsentStatus = productionConsent?.status ?? "not_started";
  const canAcceptProductionConsent = Object.values(productionConsentForm).every(Boolean);

  return (
    <StudentShell
      active="copier"
      eyebrow="Crypto Auto-Copy"
      title="Binance and Bybit setup"
      subtitle="Connect a personal exchange account for Paper Auto-Copy readiness. Production Beta remains gated until every approval and vault control is ready."
      action={<Badge tone={badgeTone(state)}>{readinessLabel(state)}</Badge>}
      side={
        <GlassCard className="space-y-4">
          <p className="text-sm font-semibold text-[color:var(--label)]">Execution boundary</p>
          <p className="text-sm leading-6 text-[color:var(--label2)]">
            Paper Auto-Copy and Testnet Proof are available for visibility. Production Beta is gated by consent, allowlists, dry-run, order-env, vault, and Super Admin controls.
          </p>
        </GlassCard>
      }
    >
      {errorMessage ? (
        <GlassCard className="space-y-4 border-[color:color-mix(in_srgb,var(--red)_34%,transparent)]">
          <p className="break-words text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
          <Button onClick={loadExecution} variant="secondary">
            Refresh
          </Button>
        </GlassCard>
      ) : null}

      {message ? (
        <GlassCard className="border-[color:color-mix(in_srgb,var(--green)_34%,transparent)]">
          <p className="break-words text-sm leading-6 text-[color:var(--green)]">{message}</p>
        </GlassCard>
      ) : null}

      {isLoading ? (
        <GlassCard>
          <p className="text-sm leading-6 text-[color:var(--label2)]">Loading crypto execution setup...</p>
        </GlassCard>
      ) : response ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatChip label="Readiness" value={readinessLabel(response.readiness.state)} tone={badgeTone(state)} />
            <StatChip
              label="Mode"
              value={response.readiness.paperTradingOnly ? "Paper only" : "Live requested"}
              tone={response.readiness.paperTradingOnly ? "amber" : "green"}
            />
            <StatChip
              label="Pause"
              value={response.preferences.studentPaused ? "Paused" : "Active"}
              tone={response.preferences.studentPaused ? "red" : "green"}
            />
          </div>

          <StudentBroadLiveAutoCopyStatusCard status={response.broadLiveStatus} />

          <GlassCard className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[color:var(--label)]">Crypto AutoCopy billing</p>
                <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                  {productSafeText(cryptoBilling?.reason ?? "Purchase Crypto AutoCopy before connecting Binance or Bybit for AutoCopy.")}
                </p>
              </div>
              <Badge tone={cryptoAutoCopyPaid ? "green" : "amber"}>
                {(cryptoBilling?.status ?? "not_purchased").replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              {!cryptoAutoCopyPaid ? (
                <Button
                  type="button"
                  variant="primary"
                  disabled={isSaving || !baseEligible}
                  onClick={startCryptoAutoCopyCheckout}
                >
                  {cryptoBilling?.status === "cancelled" ||
                  cryptoBilling?.status === "expired" ||
                  cryptoBilling?.status === "past_due"
                    ? "Renew Crypto AutoCopy"
                    : "Purchase Crypto AutoCopy"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={cancelCryptoAutoCopySubscription}
                >
                  Cancel Crypto AutoCopy billing
                </Button>
              )}
              {!baseEligible ? (
                <span className="break-safe text-xs leading-5 text-[color:var(--label3)]">
                  Stage 16 Auto-Copy entitlement and personal-account posture are still required before purchase.
                </span>
              ) : cryptoBilling?.status === "payment_pending" ? (
                <span className="break-safe text-xs leading-5 text-[color:var(--label3)]">
                  Payment is pending. Return from Paystack to this page so TradeHub can verify the reference.
                </span>
              ) : null}
            </div>
            {response.cryptoAutoCopy.paymentIntents.length > 0 ? (
              <div className="grid gap-2">
                {response.cryptoAutoCopy.paymentIntents.map((intent) => (
                  <div key={intent.paymentIntentId} className="rounded-[14px] border border-[color:var(--line)] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="break-safe text-xs font-semibold text-[color:var(--label)]">
                        {intent.referenceRef} / ₦{intent.amountNgn.toLocaleString("en-NG")}
                      </p>
                      <Badge tone={intent.status === "verified" ? "green" : intent.status === "failed" ? "red" : "amber"}>
                        {intent.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                      {productSafeText(intent.safeMessage)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[color:var(--label)]">Current gate</p>
              <Badge tone={eligible ? "green" : "amber"}>
                {eligible ? "Eligible personal account" : "Setup locked"}
              </Badge>
            </div>
            <div className="grid gap-2">
              {response.readiness.reasons.map((reason) => (
                <p key={reason} className="break-words text-sm leading-6 text-[color:var(--label2)]">
                  {reason}
                </p>
              ))}
            </div>
          </GlassCard>

          {!baseEligible ? (
            <GlassCard className="space-y-4">
              <p className="text-sm font-semibold text-[color:var(--label)]">Connection unavailable</p>
              <p className="break-words text-sm leading-6 text-[color:var(--label2)]">
                {response.student.autoCopyAccessReason}
              </p>
              <p className="text-sm leading-6 text-[color:var(--label2)]">
                Funded-account and alerts-only students keep receiving Signal Alerts without credential collection.
              </p>
            </GlassCard>
          ) : (
            <>
              {autoCopyForm ? (
                <GlassCard className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="eyebrow !text-[color:var(--label3)]">Auto-Copy control center</p>
                      <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
                        Shared execution controls
                      </h2>
                      <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                        These settings apply before execution routing. Crypto can route through paper/testnet gates;
                        forex can route to paper simulation only until broker execution is approved later.
                      </p>
                    </div>
                    <Badge tone={autoCopyForm.market === "crypto" ? "green" : "amber"}>
                      {autoCopyForm.market === "crypto" ? "Crypto Auto-Copy" : "Forex paper"}
                    </Badge>
                  </div>

                  <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
                    <FieldLabel label="Market">
                      <select
                        className={inputClass}
                        value={autoCopyForm.market}
                        onChange={(event) => {
                          const market = event.target.value as AutoCopyMarket;
                          setAutoCopyForm(buildAutoCopyPreferenceForm(response, market));
                        }}
                      >
                        <option value="crypto">Crypto</option>
                        <option value="forex">Forex paper simulation</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Execution mode">
                      <select
                        className={inputClass}
                        value={autoCopyForm.executionMode}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, executionMode: event.target.value as CrossAssetAutoCopyExecutionMode }
                            : current)
                        }
                      >
                        <option value="full_auto">Full auto</option>
                        <option value="confirm_before_execute">Confirm before execute</option>
                        <option value="alerts_only">Alerts only</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Sizing mode">
                      <select
                        className={inputClass}
                        value={autoCopyForm.sizingMode}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, sizingMode: event.target.value as CrossAssetAutoCopySizingMode }
                            : current)
                        }
                      >
                        <option value="fixed_notional">Fixed notional</option>
                        <option value="risk_percent">Risk percent</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Stale signal policy">
                      <select
                        className={inputClass}
                        value={autoCopyForm.staleSignalPolicy}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, staleSignalPolicy: event.target.value as CrossAssetStaleSignalPolicy }
                            : current)
                        }
                      >
                        <option value="confirm_if_stale">Confirm if stale</option>
                        <option value="expire_after_seconds">Expire after window</option>
                        <option value="allow_until_manual_cancel">Allow until cancelled</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel label="Stale max age">
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        value={autoCopyForm.staleSignalMaxAgeSeconds}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, staleSignalMaxAgeSeconds: event.target.value }
                            : current)
                        }
                      />
                    </FieldLabel>
                    <FieldLabel label="Max risk percent">
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={autoCopyForm.maxRiskPercentPerTrade}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, maxRiskPercentPerTrade: event.target.value }
                            : current)
                        }
                      />
                    </FieldLabel>
                    <FieldLabel label="Fixed notional">
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={autoCopyForm.maxFixedNotional}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, maxFixedNotional: event.target.value }
                            : current)
                        }
                      />
                    </FieldLabel>
                    <FieldLabel label="Max daily loss">
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={autoCopyForm.maxDailyLoss}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, maxDailyLoss: event.target.value }
                            : current)
                        }
                      />
                    </FieldLabel>
                    <FieldLabel label="Max open trades">
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        value={autoCopyForm.maxOpenTrades}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, maxOpenTrades: event.target.value }
                            : current)
                        }
                      />
                    </FieldLabel>
                  </div>

                  <FieldLabel label={autoCopyForm.market === "crypto" ? "Allowed symbols" : "Allowed forex pairs"}>
                    <input
                      className={inputClass}
                      placeholder={autoCopyForm.market === "crypto" ? "BTCUSDT, ETHUSDT" : "EURUSD, GBPUSD"}
                      value={autoCopyForm.allowedSymbols}
                      onChange={(event) =>
                        setAutoCopyForm((current) => current
                          ? { ...current, allowedSymbols: event.target.value }
                          : current)
                      }
                    />
                  </FieldLabel>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                      <input
                        className="mt-1 h-4 w-4 shrink-0"
                        type="checkbox"
                        checked={autoCopyForm.studentPaused}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, studentPaused: event.target.checked }
                            : current)
                        }
                      />
                      <span className="break-safe">Pause this Auto-Copy market.</span>
                    </label>
                    <label className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                      <input
                        className="mt-1 h-4 w-4 shrink-0"
                        type="checkbox"
                        checked={autoCopyForm.executionFairnessDisclosureAccepted}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, executionFairnessDisclosureAccepted: event.target.checked }
                            : current)
                        }
                      />
                      <span className="break-safe">I understand TradeHub cannot guarantee identical fills, timing, or price.</span>
                    </label>
                    <label className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                      <input
                        className="mt-1 h-4 w-4 shrink-0"
                        type="checkbox"
                        checked={autoCopyForm.suitabilityAcknowledged}
                        onChange={(event) =>
                          setAutoCopyForm((current) => current
                            ? { ...current, suitabilityAcknowledged: event.target.checked }
                            : current)
                        }
                      />
                      <span className="break-safe">I understand TradeHub does not custody funds or guarantee outcomes.</span>
                    </label>
                  </div>

                  {autoCopyForm.market === "forex" ? (
                    <p className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                      Forex Auto-Copy is demo-proof only in this stage. Broker provisioning is billing-gated,
                      server-routed, and live forex orders are not enabled.
                    </p>
                  ) : (
                    <p className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
                      Confirm-before-execute creates a pending confirmation record instead of direct live routing.
                      Stale-signal rules are enforced server-side before any execution-facing intent is created.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={saveAutoCopyPreferences} variant="primary" disabled={isSaving}>
                      Save Auto-Copy controls
                    </Button>
                    <Button
                      onClick={() =>
                        setAutoCopyForm((current) => current
                          ? { ...current, consentStatus: current.consentStatus === "revoked" ? "missing" : "revoked" }
                          : current)
                      }
                      variant="ghost"
                      disabled={isSaving}
                    >
                      {autoCopyForm.consentStatus === "revoked" ? "Reset revoke state" : "Revoke market consent"}
                    </Button>
                  </div>
                </GlassCard>
              ) : null}

              {eligible ? (
                <>
                  <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <GlassCard>
                      <form className="space-y-5" onSubmit={submitConnection}>
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--label)]">Connection</p>
                          <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                            Submit a trade-only Binance or Bybit key for server-side permission verification. Use sandbox/testnet keys for Testnet Proof; production keys remain gated until Production Beta is explicitly approved.
                          </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldLabel label="Exchange">
                            <select
                              className={inputClass}
                              value={connectionForm.exchange}
                              onChange={(event) =>
                                setConnectionForm((current) => ({
                                  ...current,
                                  exchange: event.target.value as CryptoExchangeId
                                }))
                              }
                            >
                              <option value="binance">Binance</option>
                              <option value="bybit">Bybit</option>
                            </select>
                          </FieldLabel>
                          <FieldLabel label="Environment">
                            <select
                              className={inputClass}
                              value={connectionForm.environment}
                              onChange={(event) =>
                                setConnectionForm((current) => ({
                                  ...current,
                                  environment: event.target.value as CryptoExchangeEnvironment
                                }))
                              }
                            >
                              <option value="sandbox">Sandbox/testnet key</option>
                              <option value="production">Production key</option>
                            </select>
                          </FieldLabel>
                        </div>
                        <FieldLabel label="API key">
                          <input
                            className={inputClass}
                            autoComplete="off"
                            spellCheck={false}
                            value={connectionForm.apiKey}
                            onChange={(event) =>
                              setConnectionForm((current) => ({ ...current, apiKey: event.target.value }))
                            }
                          />
                        </FieldLabel>
                        <FieldLabel label="API secret">
                          <input
                            className={inputClass}
                            autoComplete="off"
                            spellCheck={false}
                            type="password"
                            value={connectionForm.apiSecret}
                            onChange={(event) =>
                              setConnectionForm((current) => ({ ...current, apiSecret: event.target.value }))
                            }
                          />
                        </FieldLabel>
                        <label className="flex gap-3 text-sm leading-6 text-[color:var(--label2)]">
                          <input
                            className="mt-1 h-4 w-4"
                            type="checkbox"
                            checked={connectionForm.personalAccountAcknowledged}
                            onChange={(event) =>
                              setConnectionForm((current) => ({
                                ...current,
                                personalAccountAcknowledged: event.target.checked
                              }))
                            }
                          />
                          This is my personal Binance/Bybit account, not a funded or prop-firm account.
                        </label>
                        <label className="flex gap-3 text-sm leading-6 text-[color:var(--label2)]">
                          <input
                            className="mt-1 h-4 w-4"
                            type="checkbox"
                            checked={connectionForm.riskAcknowledged}
                            onChange={(event) =>
                              setConnectionForm((current) => ({
                                ...current,
                                riskAcknowledged: event.target.checked
                              }))
                            }
                          />
                          I understand this only enables paper-mode readiness until TradeHub enables live execution later.
                        </label>
                        <Button type="submit" variant="primary" disabled={isSaving}>
                          Verify permissions
                        </Button>
                      </form>
                    </GlassCard>

                    <GlassCard className="space-y-5">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--label)]">Risk Preferences</p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--label2)]">
                          Preferences are bounded server-side and apply to Paper Auto-Copy while Production Beta remains gated.
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                        <FieldLabel label="Max risk per trade">
                          <input
                            className={inputClass}
                            inputMode="decimal"
                            value={preferenceForm.maxRiskPercentPerTrade}
                            onChange={(event) =>
                              setPreferenceForm((current) => ({
                                ...current,
                                maxRiskPercentPerTrade: event.target.value
                              }))
                            }
                          />
                        </FieldLabel>
                        <FieldLabel label="Max daily loss">
                          <input
                            className={inputClass}
                            inputMode="decimal"
                            value={preferenceForm.maxDailyLossPercent}
                            onChange={(event) =>
                              setPreferenceForm((current) => ({
                                ...current,
                                maxDailyLossPercent: event.target.value
                              }))
                            }
                          />
                        </FieldLabel>
                        <FieldLabel label="Max open trades">
                          <input
                            className={inputClass}
                            inputMode="numeric"
                            value={preferenceForm.maxOpenTrades}
                            onChange={(event) =>
                              setPreferenceForm((current) => ({ ...current, maxOpenTrades: event.target.value }))
                            }
                          />
                        </FieldLabel>
                      </div>
                      <FieldLabel label="Allowed symbols">
                        <input
                          className={inputClass}
                          placeholder="BTCUSDT, ETHUSDT"
                          value={preferenceForm.allowedSymbols}
                          onChange={(event) =>
                            setPreferenceForm((current) => ({ ...current, allowedSymbols: event.target.value }))
                          }
                        />
                      </FieldLabel>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={() => savePreferences()} variant="primary" disabled={isSaving}>
                          Save preferences
                        </Button>
                        <Button
                          onClick={() => savePreferences(!response.preferences.studentPaused)}
                          variant="secondary"
                          disabled={isSaving}
                        >
                          {response.preferences.studentPaused ? "Resume" : "Pause"}
                        </Button>
                      </div>
                    </GlassCard>
                  </div>

                  <PaperExecutionPreview
                    title="Paper Auto-Copy activity"
                    subtitle="Recent routing, risk decisions, and simulated paper activity for this account."
                    routing={response.paperRouting}
                    preview={response.paperExecution}
                  />
                </>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <GlassCard>
                  <form className="space-y-5" onSubmit={submitForexProvisioning}>
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--label)]">Forex AutoCopy broker setup</p>
                      <p className="mt-1 break-safe text-sm leading-6 text-[color:var(--label2)]">
                        Forex AutoCopy is billed separately from Crypto AutoCopy and courses. TradeHub uses MT4/MT5 broker details for server-managed setup only; TradeHub does not custody funds and does not need withdrawal access.
                      </p>
                    </div>
                    {response.forexProvisioning?.billing.entitled ? null : (
                      <div className="space-y-3 rounded-[16px] border border-[color:var(--line)] px-4 py-4">
                        <p className="break-safe text-sm leading-6 text-[color:var(--label2)]">
                          {productSafeText(response.forexProvisioning?.billing.reason ?? "Purchase Forex AutoCopy before connecting an MT4/MT5 broker account.")}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="button"
                            variant="primary"
                            disabled={isSaving}
                            onClick={startForexAutoCopyCheckout}
                          >
                            {response.forexProvisioning?.billing.status === "cancelled" ||
                            response.forexProvisioning?.billing.status === "expired" ||
                            response.forexProvisioning?.billing.status === "past_due"
                              ? "Renew Forex AutoCopy"
                              : "Purchase Forex AutoCopy"}
                          </Button>
                          {response.forexProvisioning?.billing.status === "payment_pending" ? (
                            <span className="break-safe text-xs leading-5 text-[color:var(--label3)]">
                              Payment is pending. Return from Paystack to this page so TradeHub can verify the reference.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldLabel label="Platform">
                        <select
                          className={inputClass}
                          value={forexProvisioningForm.platform}
                          disabled={!response.forexProvisioning?.billing.entitled}
                          onChange={(event) =>
                            setForexProvisioningForm((current) => ({
                              ...current,
                              platform: event.target.value as "mt4" | "mt5"
                            }))
                          }
                        >
                          <option value="mt4">MT4</option>
                          <option value="mt5">MT5</option>
                        </select>
                      </FieldLabel>
                      <FieldLabel label="Optional label">
                        <input
                          className={inputClass}
                          placeholder="My personal broker account"
                          disabled={!response.forexProvisioning?.billing.entitled}
                          value={forexProvisioningForm.label}
                          onChange={(event) =>
                            setForexProvisioningForm((current) => ({
                              ...current,
                              label: event.target.value
                            }))
                          }
                        />
                      </FieldLabel>
                    </div>
                    <FieldLabel label="Broker name/server">
                      <input
                        className={inputClass}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Broker-Live or Broker-Demo"
                        disabled={!response.forexProvisioning?.billing.entitled}
                        value={forexProvisioningForm.brokerServer}
                        onChange={(event) =>
                          setForexProvisioningForm((current) => ({ ...current, brokerServer: event.target.value }))
                        }
                      />
                    </FieldLabel>
                    <FieldLabel label="Broker login/account number">
                      <input
                        className={inputClass}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={!response.forexProvisioning?.billing.entitled}
                        value={forexProvisioningForm.brokerLogin}
                        onChange={(event) =>
                          setForexProvisioningForm((current) => ({ ...current, brokerLogin: event.target.value }))
                        }
                      />
                    </FieldLabel>
                    <FieldLabel label="Broker password">
                      <input
                        className={inputClass}
                        autoComplete="off"
                        spellCheck={false}
                        type="password"
                        disabled={!response.forexProvisioning?.billing.entitled}
                        value={forexProvisioningForm.brokerPassword}
                        onChange={(event) =>
                          setForexProvisioningForm((current) => ({ ...current, brokerPassword: event.target.value }))
                        }
                      />
                    </FieldLabel>
                    <label className="flex gap-3 text-sm leading-6 text-[color:var(--label2)]">
                      <input
                        className="mt-1 h-4 w-4"
                        type="checkbox"
                        disabled={!response.forexProvisioning?.billing.entitled}
                        checked={forexProvisioningForm.personalAccountAcknowledged}
                        onChange={(event) =>
                          setForexProvisioningForm((current) => ({
                            ...current,
                            personalAccountAcknowledged: event.target.checked
                          }))
                        }
                      />
                      This is my personal MT4/MT5 broker account, not funded-account or prop-firm capital.
                    </label>
                    <label className="flex gap-3 text-sm leading-6 text-[color:var(--label2)]">
                      <input
                        className="mt-1 h-4 w-4"
                        type="checkbox"
                        disabled={!response.forexProvisioning?.billing.entitled}
                        checked={forexProvisioningForm.billingAcknowledged}
                        onChange={(event) =>
                          setForexProvisioningForm((current) => ({
                            ...current,
                            billingAcknowledged: event.target.checked
                          }))
                        }
                      />
                      I understand Forex AutoCopy is billed separately from ordinary course access.
                    </label>
                    <label className="flex gap-3 text-sm leading-6 text-[color:var(--label2)]">
                      <input
                        className="mt-1 h-4 w-4"
                        type="checkbox"
                        disabled={!response.forexProvisioning?.billing.entitled}
                        checked={forexProvisioningForm.dryRunAcknowledged}
                        onChange={(event) =>
                          setForexProvisioningForm((current) => ({
                            ...current,
                            dryRunAcknowledged: event.target.checked
                          }))
                        }
                      />
                      I understand Forex AutoCopy can involve real-money risk if live execution is enabled later; today this setup remains server-side dry-run only.
                    </label>
                    <label className="flex gap-3 text-sm leading-6 text-[color:var(--label2)]">
                      <input
                        className="mt-1 h-4 w-4"
                        type="checkbox"
                        disabled={!response.forexProvisioning?.billing.entitled}
                        checked={forexProvisioningForm.noOrderAcknowledged}
                        onChange={(event) =>
                          setForexProvisioningForm((current) => ({
                            ...current,
                            noOrderAcknowledged: event.target.checked
                          }))
                        }
                      />
                      I understand TradeHub does not custody my funds, does not need withdrawal access, and will not place a demo or live broker order in this stage.
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isSaving || !response.forexProvisioning?.billing.entitled}
                      >
                        Submit broker setup
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isSaving || !response.forexProvisioning?.currentAccount?.active}
                        onClick={disableForexProvisioning}
                      >
                        Disable Forex AutoCopy
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isSaving || !response.forexProvisioning?.billing.entitled}
                        onClick={cancelForexAutoCopySubscription}
                      >
                        Cancel Forex AutoCopy billing
                      </Button>
                    </div>
                  </form>
                </GlassCard>

              <ForexProvisioningPreviewCard
                  title="Forex AutoCopy provisioning"
                  subtitle="Billing-gated MT4/MT5 setup status. Broker passwords are accepted only for one-time server submission and are never shown in previews."
                preview={response.forexProvisioning}
                showAudit={false}
              />
              </div>

              <ForexPaperExecutionPreviewCard
                title="Forex Paper Auto-Copy"
                subtitle="Recent forex paper routing, confirmation records, simulated attempts, and risk decisions. Broker provisioning does not enable demo or live execution."
                preview={response.forexPaper}
                showAudit={false}
              />

              <ForexDemoExecutionPreviewCard
                title="Forex Demo Proof"
                subtitle="Demo proof is server-gated and requires paid Forex AutoCopy provisioning. It can show dry-run or demo-account attempts without exposing provider credentials, account refs, broker payloads, or balances."
                preview={response.forexDemo}
                showAudit={false}
              />

              <LiveSandboxExecutionPreviewCard
                title="Testnet Proof"
                subtitle="Support-safe Binance/Bybit testnet lifecycle activity for this account. Real-money production remains gated."
                preview={response.liveSandbox}
              />

              <GlassCard className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow !text-[color:var(--label3)]">Production Beta consent</p>
                    <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">
                      Production Beta consent
                    </h2>
                    <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
                      This consent is separate from Paper Auto-Copy and Testnet Proof. Accepting it does not
                      enable real orders while dry-run, vault, order-env, allowlist, and Super Admin gates remain blocked.
                    </p>
                  </div>
                  <Badge tone={consentTone(productionConsentStatus)}>
                    {productionConsentStatus.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                  <StatChip
                    label="Consent"
                    value={readinessLabel(productionConsentStatus)}
                    tone={consentTone(productionConsentStatus)}
                  />
                  <StatChip
                    label="Dry run"
                    value={response.liveProduction?.env.productionDryRun ? "On" : "Unknown"}
                    tone="amber"
                  />
                  <StatChip
                    label="Order env"
                    value={response.liveProduction?.env.productionOrdersEnabled ? "Enabled" : "Disabled"}
                    tone={response.liveProduction?.env.productionOrdersEnabled ? "amber" : "green"}
                  />
                  <StatChip
                    label="Vault"
                    value={response.liveProduction?.env.productionVaultReady ? "Ready" : "Blocked"}
                    tone={response.liveProduction?.env.productionVaultReady ? "green" : "red"}
                  />
                </div>

                {response.liveProduction ? (
                  <div className="space-y-3 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_42%,transparent)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">Why production is gated</p>
                        <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label2)]">
                          Consent is only one gate. TradeHub still requires vault readiness, allowlists, dry-run/order controls, caps, and a server-side balance precheck before any canary order.
                        </p>
                      </div>
                      <Badge tone={response.liveProduction.preflightReady ? "green" : "amber"}>
                        {response.liveProduction.preflightReady ? "Preflight clear" : "Gated"}
                      </Badge>
                    </div>
                    <div className="bounded-list-4 space-y-2">
                      {response.liveProduction.preflightChecks
                        .filter((check) => check.status !== "ready")
                        .slice(0, 4)
                        .map((check) => (
                          <p key={check.key} className="break-safe rounded-[14px] border border-[color:var(--line)] px-3 py-2 text-xs leading-5 text-[color:var(--label2)]">
                            <span className="font-semibold text-[color:var(--label)]">{check.label}: </span>
                            {productSafeText(check.safeMessage)}
                          </p>
                        ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3">
                  {[
                    ["personalExchangeConfirmed", "This is my personal Binance/Bybit account."],
                    ["notFundedOrPropFirmConfirmed", "This is not funded-account or prop-firm capital."],
                    ["withdrawalsDisabledConfirmed", "My exchange API key has withdrawals disabled."],
                    ["productionLiveLossRiskConfirmed", "I understand production live orders can lose money."],
                    ["tradeHubNoCustodyConfirmed", "I understand TradeHub does not custody my exchange funds."]
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex gap-3 rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]"
                    >
                      <input
                        className="mt-1 h-4 w-4 shrink-0"
                        type="checkbox"
                        checked={productionConsentForm[key as keyof ProductionConsentFormState]}
                        onChange={(event) =>
                          setProductionConsentForm((current) => ({
                            ...current,
                            [key]: event.target.checked
                          }))
                        }
                      />
                      <span className="break-safe">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => mutateProductionConsent("consent")}
                    variant="primary"
                    disabled={isSaving || !canAcceptProductionConsent}
                  >
                    Accept live beta terms
                  </Button>
                  <Button
                    onClick={() => mutateProductionConsent("pause")}
                    variant="secondary"
                    disabled={isSaving || productionConsentStatus === "paused"}
                  >
                    Pause live beta
                  </Button>
                  <Button
                    onClick={() => mutateProductionConsent("resume")}
                    variant="secondary"
                    disabled={isSaving || productionConsentStatus !== "paused"}
                  >
                    Resume live beta
                  </Button>
                  <Button
                    onClick={() => mutateProductionConsent("revoke")}
                    variant="ghost"
                    disabled={isSaving || productionConsentStatus === "revoked"}
                  >
                    Revoke live consent
                  </Button>
                </div>

                {productionConsent?.acceptedAt ? (
                  <p className="break-safe text-xs leading-5 text-[color:var(--label3)]">
                    Accepted {safeDate(productionConsent.acceptedAt)}
                  </p>
                ) : null}
              </GlassCard>

              <LiveProductionExecutionPreviewCard
                title="Production Beta status"
                subtitle="Production Beta requires separate consent, Super Admin allowlists, active entitlement, a production credential vault, and dry-run/order-call gates. TradeHub does not custody funds."
                preview={response.liveProduction}
              />

              <div className="grid gap-4">
                {response.connections.length === 0 ? (
                  <GlassCard>
                    <p className="text-sm leading-6 text-[color:var(--label2)]">
                      No Binance or Bybit connection metadata has been verified yet.
                    </p>
                  </GlassCard>
                ) : (
                  response.connections.map((connection) => (
                    <GlassCard key={connection.connectionId} className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-[color:var(--label)]">
                            {productSafeText(connection.connectionLabel)}
                          </p>
                          <p className="mt-1 break-all text-xs text-[color:var(--label3)]">
                            {connection.keyFingerprint ?? "No fingerprint recorded"}
                          </p>
                        </div>
                        <Badge tone={connection.status === "verified" ? "green" : "amber"}>
                          {connection.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <StatChip label="Environment" value={connection.environment} />
                        <StatChip label="Permissions" value={connection.permissionVerification} />
                        <StatChip label="Withdrawals" value={connection.withdrawalPermission} />
                      </div>
                      <p className="break-words text-sm leading-6 text-[color:var(--label2)]">
                        {productSafeText(connection.supportSafeMessage)}
                      </p>
                      <p className="text-xs text-[color:var(--label3)]">
                        Last checked {safeDate(connection.lastHealthCheckAt)}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => mutateConnection(connection.connectionId, "refresh")}
                          variant="secondary"
                          disabled={isSaving || connection.status === "disabled"}
                        >
                          Refresh check
                        </Button>
                        <Button
                          onClick={() => mutateConnection(connection.connectionId, "disable")}
                          variant="ghost"
                          disabled={isSaving || connection.status === "disabled"}
                        >
                          Disable
                        </Button>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </>
          )}
        </>
      ) : null}
    </StudentShell>
  );
}

export function StudentCopierClient() {
  return (
    <RoleGate allowedRole="student" nextPath="/app/copier">
      <StudentCopierBody />
    </RoleGate>
  );
}
