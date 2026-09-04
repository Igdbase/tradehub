"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getMarketLabel,
  getPrimaryPlatformLabel,
  getProductOfferingLabels,
  getStudentAccountMixLabel,
  initialLandingApplicationValues,
  marketOptions,
  monetizationOptions,
  primaryPlatformOptions,
  productOfferingOptions,
  studentAccountMixOptions,
  type LandingApplicationErrors,
  type LandingApplicationValues,
  validateLandingApplication
} from "@/lib/application-validation";
import { cn } from "@/lib/utils";
import type {
  ApiErrorResponse,
  PublicApplicationReceipt,
  PublicApplicationResponse
} from "@/types/admin-api";

const sharedFieldClasses =
  "focus-ring w-full rounded-[18px] border bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-4 text-sm text-[color:var(--label)] placeholder:text-[color:var(--label3)] transition";

function getFieldClasses(hasError: boolean, type: "input" | "textarea" = "input") {
  return cn(
    sharedFieldClasses,
    type === "input" ? "h-12" : "min-h-[10rem] py-3",
    hasError
      ? "border-[color:var(--red)]"
      : "border-[color:var(--line)] hover:border-[color:var(--accent)] focus:border-[color:var(--accent)]"
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="text-sm text-[color:var(--red)]">
      {message}
    </p>
  );
}

function SummaryRow({
  label,
  value,
  wide = false
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={cn("space-y-1", wide && "sm:col-span-2")}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
        {label}
      </dt>
      <dd className="text-sm leading-6 text-[color:var(--label2)]">{value}</dd>
    </div>
  );
}

export function ApplicationForm() {
  const [values, setValues] = useState<LandingApplicationValues>(initialLandingApplicationValues);
  const [errors, setErrors] = useState<LandingApplicationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "This form validates locally, then sends a server-validated application to the onboarding queue."
  );
  const [submission, setSubmission] = useState<{
    application: PublicApplicationReceipt;
    persisted: boolean;
    source: PublicApplicationResponse["source"];
    message: string;
  } | null>(null);

  function updateValue<Key extends keyof LandingApplicationValues>(
    key: Key,
    value: LandingApplicationValues[Key]
  ) {
    setValues((current) => ({
      ...current,
      [key]: value
    }));

    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function resetForm() {
    setValues(initialLandingApplicationValues);
    setErrors({});
    setSubmission(null);
    setIsSubmitting(false);
    setStatusMessage("This form validates locally, then sends a server-validated application to the onboarding queue.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateLandingApplication(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatusMessage("Fix the highlighted fields before sending the application.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Sending your application to the TradeHub onboarding queue...");

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });
      const payload = (await response.json()) as PublicApplicationResponse | ApiErrorResponse;

      if (!response.ok || !("ok" in payload) || !payload.ok) {
        if ("error" in payload && payload.error.fields) {
          setErrors(payload.error.fields as LandingApplicationErrors);
        }

        setStatusMessage(
          "error" in payload
            ? payload.error.message
            : "TradeHub could not submit that application yet."
        );
        return;
      }

      setSubmission({
        application: payload.application,
        persisted: payload.persisted,
        source: payload.source,
        message: payload.message
      });
      setStatusMessage(payload.message);
    } catch {
      setStatusMessage("TradeHub could not reach the application endpoint. Try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submission) {
    const application = submission.application;
    const submittedAt = new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(application.createdAt));
    const productLabels = getProductOfferingLabels(application.productOfferings ?? []);

    return (
      <GlassCard padding="lg" tone="high" className="rounded-[30px]">
        <div className="space-y-6" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge tone={submission.persisted ? "green" : "amber"}>
                {submission.persisted ? "Application persisted" : "Development receipt"}
              </Badge>
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
                  Your application is ready for Super Admin review.
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--label2)]">
                  {submission.message} The next step is manual vetting before any workspace is created.
                </p>
              </div>
            </div>
            <Badge tone="accent">
              {submission.source === "firestore" ? "Firestore queue" : "Mock fallback"}
            </Badge>
          </div>

          <GlassCard padding="lg" className="rounded-[24px]">
            <dl className="grid gap-5 sm:grid-cols-2">
              <SummaryRow label="Application ref" value={application.applicationId} />
              <SummaryRow label="Full name" value={application.name} />
              <SummaryRow label="Email" value={application.email} />
              <SummaryRow
                label="Primary platform"
                value={getPrimaryPlatformLabel(application.primaryPlatform)}
              />
              <SummaryRow label="Handle" value={application.handleOrChannel} />
              <SummaryRow label="Audience size" value={application.audienceSize.toLocaleString("en-US")} />
              <SummaryRow label="Market" value={getMarketLabel(application.market)} />
              <SummaryRow
                label="Student account mix"
                value={getStudentAccountMixLabel(application.studentAccountMix)}
              />
              <SummaryRow label="Monetization" value={application.monetizationMethod} />
              <SummaryRow
                label="Offerings"
                value={productLabels.length > 0 ? productLabels.join(", ") : "Not shared"}
              />
              <SummaryRow
                label="Current students / customers"
                value={
                  application.currentCustomerCount !== undefined
                    ? application.currentCustomerCount.toLocaleString("en-US")
                    : "Not shared yet"
                }
              />
              <SummaryRow
                label="Solana interest"
                value={application.solanaPayInterest ? "Interested in optional Solana Pay / USDC" : "Paystack first"}
              />
              <SummaryRow label="Captured at" value={submittedAt} />
              <SummaryRow label="Notes" value={application.notes} wide />
            </dl>
          </GlassCard>

          <GlassCard padding="lg" className="rounded-[24px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Next steps
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="rounded-[18px] border border-[color:var(--line)] p-4 text-sm leading-6 text-[color:var(--label2)]">
                1. Vetting review for identity, audience quality, and account-type mix.
              </p>
              <p className="rounded-[18px] border border-[color:var(--line)] p-4 text-sm leading-6 text-[color:var(--label2)]">
                2. Short call to confirm launch scope, pricing model, and payment rail fit.
              </p>
              <p className="rounded-[18px] border border-[color:var(--line)] p-4 text-sm leading-6 text-[color:var(--label2)]">
                3. Setup fee or manual approval decision before workspace creation begins.
              </p>
              <p className="rounded-[18px] border border-[color:var(--line)] p-4 text-sm leading-6 text-[color:var(--label2)]">
                4. Workspace creation and guided onboarding land in the later admin flow.
              </p>
            </div>
          </GlassCard>

          <div className="flex flex-wrap gap-3">
            <Button href="/admin" variant="primary">
              Open admin queue
            </Button>
            <Button onClick={resetForm} variant="secondary">
              Submit another
            </Button>
            <Link href="/join/apexfx" className="nav-chip">
              Preview student invite route
            </Link>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="lg" tone="high" className="rounded-[30px]">
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          name="companyWebsite"
          value={values.companyWebsite}
          onChange={(event) => updateValue("companyWebsite", event.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge tone="accent">Workspace application</Badge>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
                Tell us about your audience and launch plan.
              </h3>
            </div>
            <Badge tone="neutral">Server validated</Badge>
          </div>
          <p
            className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_72%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]"
            aria-live="polite"
          >
            {statusMessage}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-[color:var(--label)]">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={values.fullName}
              onChange={(event) => updateValue("fullName", event.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              className={getFieldClasses(Boolean(errors.fullName))}
              placeholder="Maya Adeyemi"
            />
            <FieldError id="fullName-error" message={errors.fullName} />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-[color:var(--label)]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => updateValue("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={getFieldClasses(Boolean(errors.email))}
              placeholder="name@brand.com"
            />
            <FieldError id="email-error" message={errors.email} />
          </div>

          <div className="space-y-2">
            <label htmlFor="primaryPlatform" className="text-sm font-medium text-[color:var(--label)]">
              Primary platform
            </label>
            <select
              id="primaryPlatform"
              name="primaryPlatform"
              value={values.primaryPlatform}
              onChange={(event) =>
                updateValue("primaryPlatform", event.target.value as LandingApplicationValues["primaryPlatform"])
              }
              aria-invalid={Boolean(errors.primaryPlatform)}
              aria-describedby={errors.primaryPlatform ? "primaryPlatform-error" : undefined}
              className={getFieldClasses(Boolean(errors.primaryPlatform))}
            >
              <option value="">Select a platform</option>
              {primaryPlatformOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError id="primaryPlatform-error" message={errors.primaryPlatform} />
          </div>

          <div className="space-y-2">
            <label htmlFor="handle" className="text-sm font-medium text-[color:var(--label)]">
              Primary handle or channel
            </label>
            <input
              id="handle"
              name="handle"
              type="text"
              value={values.handle}
              onChange={(event) => updateValue("handle", event.target.value)}
              aria-invalid={Boolean(errors.handle)}
              aria-describedby={errors.handle ? "handle-error" : undefined}
              className={getFieldClasses(Boolean(errors.handle))}
              placeholder="@apexfx or Apex FX Community"
            />
            <FieldError id="handle-error" message={errors.handle} />
          </div>

          <div className="space-y-2">
            <label htmlFor="audienceSize" className="text-sm font-medium text-[color:var(--label)]">
              Audience size
            </label>
            <input
              id="audienceSize"
              name="audienceSize"
              type="number"
              min="1"
              inputMode="numeric"
              value={values.audienceSize}
              onChange={(event) => updateValue("audienceSize", event.target.value)}
              aria-invalid={Boolean(errors.audienceSize)}
              aria-describedby={errors.audienceSize ? "audienceSize-error" : undefined}
              className={getFieldClasses(Boolean(errors.audienceSize))}
              placeholder="18000"
            />
            <FieldError id="audienceSize-error" message={errors.audienceSize} />
          </div>

          <div className="space-y-2">
            <label htmlFor="market" className="text-sm font-medium text-[color:var(--label)]">
              Market traded
            </label>
            <select
              id="market"
              name="market"
              value={values.market}
              onChange={(event) => updateValue("market", event.target.value as LandingApplicationValues["market"])}
              aria-invalid={Boolean(errors.market)}
              aria-describedby={errors.market ? "market-error" : undefined}
              className={getFieldClasses(Boolean(errors.market))}
            >
              <option value="">Select market</option>
              {marketOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError id="market-error" message={errors.market} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label
              htmlFor="studentAccountMix"
              className="text-sm font-medium text-[color:var(--label)]"
            >
              How do your students mostly trade?
            </label>
            <select
              id="studentAccountMix"
              name="studentAccountMix"
              value={values.studentAccountMix}
              onChange={(event) =>
                updateValue(
                  "studentAccountMix",
                  event.target.value as LandingApplicationValues["studentAccountMix"]
                )
              }
              aria-invalid={Boolean(errors.studentAccountMix)}
              aria-describedby={errors.studentAccountMix ? "studentAccountMix-error" : undefined}
              className={getFieldClasses(Boolean(errors.studentAccountMix))}
            >
              <option value="">Select one</option>
              {studentAccountMixOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError id="studentAccountMix-error" message={errors.studentAccountMix} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label
              htmlFor="monetizationMethod"
              className="text-sm font-medium text-[color:var(--label)]"
            >
              Current monetization method
            </label>
            <select
              id="monetizationMethod"
              name="monetizationMethod"
              value={values.monetizationMethod}
              onChange={(event) => updateValue("monetizationMethod", event.target.value)}
              aria-invalid={Boolean(errors.monetizationMethod)}
              aria-describedby={errors.monetizationMethod ? "monetizationMethod-error" : undefined}
              className={getFieldClasses(Boolean(errors.monetizationMethod))}
            >
              <option value="">Select how you monetize today</option>
              {monetizationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError id="monetizationMethod-error" message={errors.monetizationMethod} />
          </div>

          <fieldset
            className="space-y-3 sm:col-span-2"
            aria-invalid={Boolean(errors.productOfferings)}
            aria-describedby={errors.productOfferings ? "productOfferings-error" : undefined}
          >
            <legend className="text-sm font-medium text-[color:var(--label)]">
              What do you want to launch?
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {productOfferingOptions.map((option) => {
                const checked = values.productOfferings.includes(option.value);

                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm transition",
                      checked
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-bg)] text-[color:var(--label)]"
                        : "border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_72%,transparent)] text-[color:var(--label2)] hover:border-[color:var(--accent)]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...values.productOfferings, option.value]
                          : values.productOfferings.filter((value) => value !== option.value);

                        updateValue("productOfferings", next);
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
            <FieldError id="productOfferings-error" message={errors.productOfferings} />
          </fieldset>

          <div className="space-y-2">
            <label
              htmlFor="currentCustomerCount"
              className="text-sm font-medium text-[color:var(--label)]"
            >
              Current students or customers
            </label>
            <input
              id="currentCustomerCount"
              name="currentCustomerCount"
              type="number"
              min="0"
              inputMode="numeric"
              value={values.currentCustomerCount}
              onChange={(event) => updateValue("currentCustomerCount", event.target.value)}
              aria-invalid={Boolean(errors.currentCustomerCount)}
              aria-describedby={errors.currentCustomerCount ? "currentCustomerCount-error" : undefined}
              className={getFieldClasses(Boolean(errors.currentCustomerCount))}
              placeholder="Optional"
            />
            <FieldError id="currentCustomerCount-error" message={errors.currentCustomerCount} />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">
              Solana Pay / USDC interest
            </span>
            <label className="flex h-12 items-center gap-3 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-4 text-sm text-[color:var(--label2)] hover:border-[color:var(--accent)]">
              <input
                type="checkbox"
                checked={values.solanaPayInterest}
                onChange={(event) => updateValue("solanaPayInterest", event.target.checked)}
              />
              <span>I want optional Solana Pay / USDC checkout for crypto-friendly students.</span>
            </label>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="notes" className="text-sm font-medium text-[color:var(--label)]">
              Audience notes and launch goals
            </label>
            <textarea
              id="notes"
              name="notes"
              value={values.notes}
              onChange={(event) => updateValue("notes", event.target.value)}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "notes-error" : undefined}
              className={getFieldClasses(Boolean(errors.notes), "textarea")}
              placeholder="Tell us what you sell today, what your students need, and how you want the platform to feel."
            />
            <FieldError id="notes-error" message={errors.notes} />
          </div>
        </div>

        <div className="space-y-3 rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_72%,transparent)] p-4">
          <label className="flex items-start gap-3 text-sm leading-6 text-[color:var(--label2)]">
            <input
              type="checkbox"
              checked={values.noResultsPromiseAccepted}
              onChange={(event) => updateValue("noResultsPromiseAccepted", event.target.checked)}
              aria-invalid={Boolean(errors.noResultsPromiseAccepted)}
              aria-describedby={
                errors.noResultsPromiseAccepted ? "noResultsPromiseAccepted-error" : undefined
              }
            />
            <span>
              I understand TradeHub does not promise trading results, guaranteed profit, or
              risk-free execution for my students.
            </span>
          </label>
          <FieldError
            id="noResultsPromiseAccepted-error"
            message={errors.noResultsPromiseAccepted}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit application"}
          </Button>
          <p className="text-sm leading-6 text-[color:var(--label3)]">
            Student invite links stay separate at{" "}
            <Link href="/join/apexfx" className="text-[color:var(--accent)] underline-offset-4 hover:underline">
              /join/[handle]
            </Link>
            .
          </p>
        </div>
      </form>
    </GlassCard>
  );
}
