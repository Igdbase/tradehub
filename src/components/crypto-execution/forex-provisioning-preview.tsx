import { productSafeText } from "@/components/crypto-execution/display-safety";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { StatChip } from "@/components/ui/stat-chip";
import type {
  ForexAutoCopyPaymentIntentSummary,
  ForexProvisionedAccountSummary,
  ForexProvisioningAuditEventSummary,
  ForexProvisioningPreview,
  ForexProvisioningRequestSummary
} from "@/types/crypto-execution";

function statusTone(status: string): "green" | "amber" | "red" {
  if (status === "active_paid" || status === "verified" || status === "provisioning_dry_run_complete" || status === "ready_to_connect") {
    return "green";
  }

  if (status === "disabled" || status === "cancelled" || status === "cleanup_complete" || status === "failed" || status === "payment_failed" || status === "past_due" || status === "expired") {
    return "red";
  }

  return "amber";
}

function Money({ amount }: { amount: number }) {
  return (
    <>
      {new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
      }).format(amount)}
    </>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function shortRef(value?: string) {
  if (!value) {
    return "not recorded";
  }

  return value.length <= 16 ? value : `${value.slice(0, 7)}...${value.slice(-4)}`;
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="rounded-[18px] border border-dashed border-[color:var(--line)] px-4 py-5 text-sm leading-6 text-[color:var(--label2)]">
      {label}
    </p>
  );
}

function RequestRow({ request }: { request: ForexProvisioningRequestSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {request.label ? productSafeText(request.label) : `${request.platform.toUpperCase()} broker account`}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            {request.providerMode === "dry_run" ? "Mock dry-run" : "Provider"} / {request.brokerLoginRef}
          </p>
        </div>
        <Badge tone={statusTone(request.status)}>{request.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(request.safeMessage)}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(request.updatedAt)}</p>
    </div>
  );
}

function PaymentIntentRow({ intent }: { intent: ForexAutoCopyPaymentIntentSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            Forex AutoCopy checkout
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            {intent.referenceRef} / <Money amount={intent.amountNgn} />
          </p>
        </div>
        <Badge tone={statusTone(intent.status)}>{intent.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(intent.safeMessage)}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(intent.updatedAt)}</p>
    </div>
  );
}

function AccountRow({ account }: { account: ForexProvisionedAccountSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-safe text-sm font-semibold text-[color:var(--label)]">
            {account.label ? productSafeText(account.label) : `${account.platform.toUpperCase()} AutoCopy account`}
          </p>
          <p className="mt-1 break-safe text-xs leading-5 text-[color:var(--label3)]">
            Ref {shortRef(account.accountId)} / {account.brokerLoginRef}
          </p>
        </div>
        <Badge tone={statusTone(account.status)}>{account.status.replace(/_/g, " ")}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs leading-5 text-[color:var(--label2)] sm:grid-cols-2">
        <p className="break-safe">Provider: {account.provider} {account.providerMode}</p>
        <p className="break-safe">Cleanup: {account.cleanupStatus?.replace(/_/g, " ") ?? "not required"}</p>
      </div>
      <p className="mt-3 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(account.safeMessage)}
      </p>
      <p className="mt-1 text-xs text-[color:var(--label3)]">Updated {formatDate(account.updatedAt)}</p>
    </div>
  );
}

function AuditRow({ event }: { event: ForexProvisioningAuditEventSummary }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="break-safe text-sm font-semibold text-[color:var(--label)]">{event.action.replace(/_/g, " ")}</p>
        <Badge tone={statusTone(event.severity)}>{event.severity}</Badge>
      </div>
      <p className="mt-2 break-safe text-xs leading-5 text-[color:var(--label2)]">
        {productSafeText(event.safeMessage)}
      </p>
      <p className="mt-1 break-safe text-xs text-[color:var(--label3)]">
        {event.targetType.replace(/_/g, " ")} {shortRef(event.targetId)} / {formatDate(event.createdAt)}
      </p>
    </div>
  );
}

export function ForexProvisioningPreviewCard({
  title,
  subtitle,
  preview,
  showAudit = false
}: {
  title: string;
  subtitle: string;
  preview?: ForexProvisioningPreview;
  showAudit?: boolean;
}) {
  if (!preview) {
    return null;
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[color:var(--label3)]">Forex AutoCopy provisioning</p>
          <h2 className="mt-2 break-safe text-xl font-semibold text-[color:var(--label)]">{title}</h2>
          <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">{subtitle}</p>
        </div>
        <Badge tone={statusTone(preview.status)}>{preview.status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <StatChip label="Paid students" value={String(preview.paidStudentCount)} tone={preview.paidStudentCount > 0 ? "green" : "amber"} />
        <StatChip label="Payment pending" value={String(preview.subscriptionCounts.paymentPending)} tone={preview.subscriptionCounts.paymentPending > 0 ? "amber" : "green"} />
        <StatChip label="Payment failed" value={String(preview.subscriptionCounts.paymentFailed)} tone={preview.subscriptionCounts.paymentFailed > 0 ? "red" : "green"} />
        <StatChip label="Ready to connect" value={String(preview.readyToConnectCount)} tone="amber" />
        <StatChip label="Mock provisioned" value={String(preview.mockProvisionedCount)} tone={preview.mockProvisionedCount > 0 ? "green" : "amber"} />
        <StatChip label="Disabled or failed" value={String(preview.disabledCount + preview.failedCount)} tone={preview.disabledCount + preview.failedCount > 0 ? "red" : "green"} />
      </div>

      <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_42%,transparent)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Billing gate</p>
          <Badge tone={preview.billing.entitled ? "green" : "amber"}>
            {preview.billing.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="mt-2 break-safe text-sm leading-6 text-[color:var(--label2)]">
          {productSafeText(preview.billing.reason)}
        </p>
      </div>

      {preview.warnings.map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {productSafeText(warning)}
        </p>
      ))}

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Payment ops</p>
          <div className="bounded-list-4 space-y-3">
            {preview.paymentIntents.length > 0
              ? preview.paymentIntents.map((intent) => <PaymentIntentRow key={intent.paymentIntentId} intent={intent} />)
              : <EmptyRow label="No Forex AutoCopy checkout records are visible yet." />}
          </div>
        </section>
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Provisioned accounts</p>
          <div className="bounded-list-4 space-y-3">
            {preview.provisionedAccounts.length > 0
              ? preview.provisionedAccounts.map((account) => <AccountRow key={account.accountId} account={account} />)
              : <EmptyRow label="No mock provisioned Forex AutoCopy accounts are visible yet." />}
          </div>
        </section>
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Provisioning requests</p>
          <div className="bounded-list-4 space-y-3">
            {preview.requests.length > 0
              ? preview.requests.map((request) => <RequestRow key={request.requestId} request={request} />)
              : <EmptyRow label="No Forex AutoCopy provisioning requests are visible yet." />}
          </div>
        </section>
      </div>

      {showAudit ? (
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--label)]">Provisioning audit</p>
          <div className="bounded-list-4 space-y-3">
            {preview.auditEvents.length > 0
              ? preview.auditEvents.map((event) => <AuditRow key={event.eventId} event={event} />)
              : <EmptyRow label="No Forex AutoCopy provisioning audit events are visible yet." />}
          </div>
        </section>
      ) : null}
    </GlassCard>
  );
}
