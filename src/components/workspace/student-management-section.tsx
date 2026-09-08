"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDate } from "@/components/workspace/workspace-formatters";
import type {
  WorkspaceStudentLifecycleStatus,
  WorkspaceStudentRecord,
  WorkspaceStudentStatus,
  WorkspaceStudentSupportPatchPayload
} from "@/types/workspace-dashboard";

const fieldClasses =
  "focus-ring min-h-11 rounded-[16px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-3 py-2 text-sm text-[color:var(--label)]";

function statusTone(status: WorkspaceStudentStatus) {
  if (status === "active") {
    return "green" as const;
  }

  if (status === "trial") {
    return "accent" as const;
  }

  if (status === "past_due" || status === "paused") {
    return "amber" as const;
  }

  return "neutral" as const;
}

function riskTone(riskPosture: WorkspaceStudentRecord["riskPosture"]) {
  if (riskPosture === "personal_account") {
    return "green" as const;
  }

  if (riskPosture === "funded_account") {
    return "amber" as const;
  }

  return "neutral" as const;
}

function lifecycleTone(status: WorkspaceStudentLifecycleStatus) {
  if (status === "active") {
    return "green" as const;
  }

  if (status === "needs_support" || status === "payment_access_issue") {
    return "amber" as const;
  }

  if (status === "pending_onboarding" || status === "paused") {
    return "accent" as const;
  }

  return "neutral" as const;
}

function billingOpsTone(status: WorkspaceStudentRecord["billingOpsStatus"]) {
  if (status === "active_subscription" || status === "payment_issue_resolved") {
    return "green" as const;
  }

  if (status === "payment_mismatch_needs_admin_review" || status === "verification_pending") {
    return "amber" as const;
  }

  if (status === "expired_cancelled_subscription") {
    return "red" as const;
  }

  return "neutral" as const;
}

function lifecycleLabel(status: WorkspaceStudentLifecycleStatus) {
  return status.replace(/_/g, " ");
}

function formatRail(rail: WorkspaceStudentRecord["paymentRail"]) {
  return rail === "unknown" ? "No verified rail" : rail.replace(/_/g, " ");
}

function formatRiskLabel(riskPosture: WorkspaceStudentRecord["riskPosture"]) {
  if (riskPosture === "personal_account") {
    return "Personal account";
  }

  if (riskPosture === "funded_account") {
    return "Funded account";
  }

  return "Risk unknown";
}

function readinessLabel(state: WorkspaceStudentRecord["courseAccessState"], enabledLabel: string, blockedLabel: string) {
  return state === "allowed" ? enabledLabel : blockedLabel;
}

function safeEventCount(student: WorkspaceStudentRecord) {
  return [
    student.lastSeenAt ? "recent activity seen" : "no recent activity",
    student.supportFollowUpNeeded ? "support follow-up open" : "no support follow-up",
    student.courseCompletionPercent > 0 ? "course progress recorded" : "no course progress yet"
  ];
}

export function StudentManagementSection({
  students,
  loading,
  query,
  status,
  warnings,
  onQueryChange,
  onStatusChange,
  onSupportAction,
  onRefresh
}: {
  students: WorkspaceStudentRecord[];
  loading: boolean;
  query: string;
  status: WorkspaceStudentStatus | "all";
  warnings: string[];
  onQueryChange: (value: string) => void;
  onStatusChange: (value: WorkspaceStudentStatus | "all") => void;
  onSupportAction: (student: WorkspaceStudentRecord, payload: WorkspaceStudentSupportPatchPayload) => Promise<void>;
  onRefresh: () => void;
}) {
  const [lifecycleFilter, setLifecycleFilter] = useState<WorkspaceStudentLifecycleStatus | "all">("all");
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [savingRef, setSavingRef] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const activeCount = students.filter((student) => student.status === "active").length;
  const pendingCount = students.filter((student) => student.lifecycleStatus === "pending_onboarding").length;
  const paidRailCount = students.filter(
    (student) => student.paymentRail === "paystack" || student.paymentRail === "solana"
  ).length;
  const paymentIssueCount = students.filter(
    (student) =>
      student.lifecycleStatus === "payment_access_issue" ||
      student.billingOpsStatus === "unpaid_pending_payment" ||
      student.billingOpsStatus === "verification_pending" ||
      student.billingOpsStatus === "payment_mismatch_needs_admin_review" ||
      student.billingOpsStatus === "expired_cancelled_subscription"
  ).length;
  const activeSubscriptionCount = students.filter((student) => student.billingOpsStatus === "active_subscription").length;
  const adminReviewCount = students.filter((student) => student.billingAdminReviewPending).length;
  const supportFollowUpCount = students.filter((student) => student.supportFollowUpNeeded).length;
  const courseReadyCount = students.filter((student) => student.courseAccessState === "allowed").length;
  const practiceReadyCount = students.filter((student) => student.journalAccessState === "allowed").length;
  const autoCopyBlockedCount = students.filter((student) => student.autoCopyAccessState !== "allowed").length;
  const averageProgress =
    students.length === 0
      ? 0
      : Math.round(
          students.reduce((total, student) => total + student.courseCompletionPercent, 0) / students.length
        );
  const visibleStudents = useMemo(
    () =>
      lifecycleFilter === "all"
        ? students
        : students.filter((student) => student.lifecycleStatus === lifecycleFilter),
    [lifecycleFilter, students]
  );

  async function runSupportAction(student: WorkspaceStudentRecord, payload: WorkspaceStudentSupportPatchPayload) {
    setSavingRef(student.practiceStudentRef);

    try {
      await onSupportAction(student, payload);
    } finally {
      setSavingRef(null);
    }
  }

  return (
    <GlassCard className="space-y-6" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow !text-[color:var(--label3)]">Student management</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--label)]">
            Workspace-scoped students
          </h2>
          <p className="break-safe mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Student rows come from this workspace only, with current access, billing posture,
            and lesson progress summarized safely. Private notes, trades, journal entries,
            payment details, and account data stay out of this view.
          </p>
        </div>
        <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
          {loading ? "Refreshing..." : "Refresh students"}
        </Button>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Loaded</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{students.length}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Active</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--green)]">{activeCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Verified rails</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--accent)]">{paidRailCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Onboarding</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--amber)]">{pendingCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Unpaid / expired</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{paymentIssueCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Access active</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--green)]">{activeSubscriptionCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Admin review</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--amber)]">{adminReviewCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Support needed</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--amber)]">{supportFollowUpCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Course ready</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--green)]">{courseReadyCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Practice ready</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--green)]">{practiceReadyCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">AutoCopy blocked</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{autoCopyBlockedCount}</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_44%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Avg progress</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{averageProgress}%</p>
        </div>
      </div>

      <div className="rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_48%,transparent)] p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(160px,220px)_minmax(180px,240px)_auto] lg:items-end">
          <label className="min-w-0 space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Search loaded page</span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className={`${fieldClasses} w-full`}
              placeholder="Name, email, support ref, tier, or rail"
            />
          </label>
          <label className="min-w-0 space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Status</span>
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value as WorkspaceStudentStatus | "all")}
              className={`${fieldClasses} w-full`}
            >
              <option value="all">All</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="past_due">Past due</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="min-w-0 space-y-2">
            <span className="text-sm font-medium text-[color:var(--label)]">Lifecycle</span>
            <select
              value={lifecycleFilter}
              onChange={(event) => setLifecycleFilter(event.target.value as WorkspaceStudentLifecycleStatus | "all")}
              className={`${fieldClasses} w-full`}
            >
              <option value="all">All lifecycle states</option>
              <option value="active">Active</option>
              <option value="pending_onboarding">Pending onboarding</option>
              <option value="payment_access_issue">Payment/access issue</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
              <option value="needs_support">Needs support</option>
            </select>
          </label>
          <Button onClick={onRefresh} variant="ghost" size="sm" disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {warnings.map((warning) => (
        <p key={warning} className="break-safe rounded-[16px] border border-[color:var(--line)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]">
          {warning}
        </p>
      ))}

      {students.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[color:var(--line)] p-6">
          <p className="text-sm font-semibold text-[color:var(--label)]">No students yet</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Once checkout and invites go live, real students from this workspace will appear here.
            No synthetic subscribers are shown.
          </p>
        </div>
      ) : visibleStudents.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[color:var(--line)] p-6">
          <p className="text-sm font-semibold text-[color:var(--label)]">No students match this lifecycle filter</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
            Adjust the lifecycle filter or search again. This view only filters the loaded workspace page.
          </p>
        </div>
      ) : (
        <div className="bounded-list-4 space-y-4">
          {visibleStudents.map((student) => {
            const isExpanded = expandedRef === student.practiceStudentRef;
            const noteDraft = noteDrafts[student.practiceStudentRef] ?? student.supportNoteSummary ?? "";
            const isSaving = savingRef === student.practiceStudentRef;

            return (
            <article
              key={student.practiceStudentRef}
              className="rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_58%,transparent)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[220px] flex-1">
                  <p className="break-safe text-base font-semibold text-[color:var(--label)]">{student.displayName}</p>
                  <p className="break-safe mt-1 text-sm leading-5 text-[color:var(--label2)]">{student.email ?? "No email shared"}</p>
                  <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label3)]">
                    Support ref {student.practiceStudentRef}
                  </p>
                </div>
                <div className="flex max-w-full flex-wrap justify-end gap-2">
                  <Badge tone={lifecycleTone(student.lifecycleStatus)}>{lifecycleLabel(student.lifecycleStatus)}</Badge>
                  <Badge tone={billingOpsTone(student.billingOpsStatus)}>{student.billingOpsLabel}</Badge>
                  {student.supportFollowUpNeeded ? <Badge tone="amber">Follow-up needed</Badge> : null}
                  <Badge tone={statusTone(student.status)}>{student.status.replace(/_/g, " ")}</Badge>
                  <Badge tone={student.paymentRail === "paystack" || student.paymentRail === "solana" ? "green" : "neutral"}>
                    {formatRail(student.paymentRail)}
                  </Badge>
                  <Badge tone={riskTone(student.riskPosture)}>
                    {formatRiskLabel(student.riskPosture)}
                  </Badge>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(180px,0.72fr)_minmax(280px,1.08fr)_minmax(260px,1fr)]">
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Tier</p>
                    <p className="break-safe mt-1 text-sm font-medium text-[color:var(--label)]">{student.tierLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Joined</p>
                    <p className="mt-1 text-sm text-[color:var(--label2)]">{formatDate(student.joinedAt)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                    Entitlements
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={student.courseAccessState === "allowed" ? "green" : "amber"}>
                      {student.courseAccessState === "allowed" ? "Courses enabled" : "Courses locked"}
                    </Badge>
                    <Badge tone={student.signalAccessState === "allowed" ? "green" : "amber"}>
                      {student.signalAccessState === "allowed" ? "Signals enabled" : "Signals locked"}
                    </Badge>
                    <Badge
                      tone={
                        student.autoCopyAccessState === "allowed"
                          ? "green"
                          : student.autoCopyAccessState === "alerts_only"
                            ? "amber"
                            : "neutral"
                      }
                    >
                      {student.autoCopyAccessState === "allowed"
                        ? "Auto-Copy tier"
                        : student.autoCopyAccessState === "alerts_only"
                          ? "Alerts only"
                          : "Copier locked"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {student.courseAccessState === "allowed" ? (
                    <ProgressBar
                      label="Course completion"
                      value={student.courseCompletionPercent}
                      showValue
                      tone={student.courseCompletionPercent > 70 ? "green" : "amber"}
                    />
                  ) : (
                    <div className="rounded-[16px] border border-[color:var(--line)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                        Course access
                      </p>
                      <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label2)]">
                        {student.courseAccessReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] pt-4">
                <p className="break-safe text-xs leading-5 text-[color:var(--label3)]">
                  Detail view is limited to operational summaries. It does not include private notes,
                  journal entries, trades, payment details, account data, or private Copier controls.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setExpandedRef(isExpanded ? null : student.practiceStudentRef)}
                >
                  {isExpanded ? "Hide details" : "View safe details"}
                </Button>
              </div>

              {isExpanded ? (
                <div className="mt-5 space-y-4 rounded-[20px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_36%,transparent)] p-4">
                  <div className="grid gap-3 xl:grid-cols-4">
                    <div className="rounded-[16px] border border-[color:var(--line)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Course readiness</p>
                      <p className="mt-2 text-sm font-semibold text-[color:var(--label)]">
                        {readinessLabel(student.courseAccessState, "Ready", "Blocked")}
                      </p>
                      <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label2)]">{student.courseAccessReason}</p>
                    </div>
                    <div className="rounded-[16px] border border-[color:var(--line)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Practice readiness</p>
                      <p className="mt-2 text-sm font-semibold text-[color:var(--label)]">
                        {readinessLabel(student.journalAccessState, "Ready", "Blocked")}
                      </p>
                      <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label2)]">{student.journalAccessReason}</p>
                    </div>
                    <div className="rounded-[16px] border border-[color:var(--line)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Billing / access</p>
                      <p className="mt-2 text-sm font-semibold text-[color:var(--label)]">{student.billingOpsLabel}</p>
                      <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label2)]">
                        {student.billingOpsDetail}
                      </p>
                      <p className="break-safe mt-2 text-xs leading-5 text-[color:var(--label3)]">
                        {formatRail(student.paymentRail)} · {student.status.replace(/_/g, " ")} · {student.tierLabel}
                      </p>
                    </div>
                    <div className="rounded-[16px] border border-[color:var(--line)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">AutoCopy readiness</p>
                      <p className="mt-2 text-sm font-semibold text-[color:var(--label)]">
                        {student.autoCopyEligible ? "Eligible" : "Blocked"}
                      </p>
                      <p className="break-safe mt-1 text-xs leading-5 text-[color:var(--label2)]">{student.autoCopyAccessReason}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(320px,1.1fr)]">
                    <div className="rounded-[16px] border border-[color:var(--line)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Safe operational events</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {safeEventCount(student).map((event) => (
                          <Badge key={event} tone="neutral">{event}</Badge>
                        ))}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-[color:var(--label3)]">
                        Last seen: {student.lastSeenAt ? formatDate(student.lastSeenAt) : "No recent timestamp"}
                      </p>
                    </div>

                    <div className="space-y-3 rounded-[16px] border border-[color:var(--line)] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">Internal support note</p>
                          <p className="mt-1 text-xs leading-5 text-[color:var(--label2)]">
                            Workspace-only, bounded summary. Students do not receive this note.
                          </p>
                        </div>
                        {student.supportUpdatedAt ? (
                          <Badge tone="neutral">Updated {formatDate(student.supportUpdatedAt)}</Badge>
                        ) : null}
                      </div>
                      <textarea
                        value={noteDraft}
                        onChange={(event) =>
                          setNoteDrafts((current) => ({
                            ...current,
                            [student.practiceStudentRef]: event.target.value.slice(0, 280)
                          }))
                        }
                        className={`${fieldClasses} min-h-[88px] w-full resize-y`}
                        placeholder="Short internal support summary, no secrets or payment refs"
                        disabled={isSaving}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isSaving}
                          onClick={() =>
                            runSupportAction(student, {
                              action: "save_support_note",
                              supportNoteSummary: noteDraft
                            })
                          }
                        >
                          {isSaving ? "Saving..." : "Save note"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isSaving}
                          onClick={() =>
                            runSupportAction(student, {
                              action: "mark_support_follow_up",
                              supportNoteSummary: noteDraft || undefined
                            })
                          }
                        >
                          Mark follow-up
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => runSupportAction(student, { action: "clear_support_follow_up" })}
                        >
                          Clear follow-up
                        </Button>
                      </div>
                    </div>
                  </div>

                  <label className="block max-w-sm space-y-2">
                    <span className="text-sm font-medium text-[color:var(--label)]">Operational status</span>
                    <select
                      value={student.lifecycleStatus}
                      className={`${fieldClasses} w-full`}
                      disabled={isSaving}
                      onChange={(event) =>
                        runSupportAction(student, {
                          action: "update_operational_status",
                          lifecycleStatus: event.target.value as WorkspaceStudentLifecycleStatus
                        })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="pending_onboarding">Pending onboarding</option>
                      <option value="payment_access_issue">Payment/access issue</option>
                      <option value="paused">Paused</option>
                      <option value="inactive">Inactive</option>
                      <option value="needs_support">Needs support</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </article>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
