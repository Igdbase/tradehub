"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type {
  MessagingChannel,
  MessagingPreferencePurpose,
  StudentMessagingPreferencesResponse
} from "@/types/messaging";

const CHANNEL_OPTIONS: Array<{ key: MessagingChannel; label: string; detail: string }> = [
  { key: "email", label: "Email", detail: "Future course and task reminders." },
  { key: "whatsapp", label: "WhatsApp", detail: "Future chat-style reminders." },
  { key: "sms", label: "SMS", detail: "Future short reminder texts." }
];

const PURPOSE_OPTIONS: Array<{ key: MessagingPreferencePurpose; label: string; detail: string }> = [
  { key: "practice_assignment", label: "Practice assignments", detail: "New, due, overdue, and closed drills." },
  { key: "course", label: "Course reminders", detail: "Learning nudges and course progress reminders." },
  { key: "billing_access", label: "Billing/access", detail: "Safe access issue reminders." },
  { key: "feedback_resubmission", label: "Feedback/resubmissions", detail: "Instructor feedback and retry reminders." }
];

function ToggleRow({
  checked,
  label,
  detail,
  onChange
}: {
  checked: boolean;
  label: string;
  detail: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--surface)] p-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[color:var(--label)]">{label}</span>
        <span className="break-safe mt-1 block text-xs leading-5 text-[color:var(--label3)]">{detail}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--green)]"
      />
    </label>
  );
}

export function StudentMessagingPreferencesCard() {
  const [payload, setPayload] = useState<StudentMessagingPreferencesResponse | null>(null);
  const [draft, setDraft] = useState<StudentMessagingPreferencesResponse["preferences"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await requestCourseHubApi<StudentMessagingPreferencesResponse>(
        "/api/student/messaging/preferences"
      );
      setPayload(response);
      setDraft(response.preferences);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reminder preferences could not load.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const disabledContactCount = useMemo(() => {
    if (!payload) {
      return 3;
    }

    return Object.values(payload.contactReadiness).filter((status) => status !== "ready").length;
  }, [payload]);

  const updateChannel = (channel: MessagingChannel, checked: boolean) => {
    setDraft((current) => current ? {
      ...current,
      channels: {
        ...current.channels,
        [channel]: checked
      }
    } : current);
  };

  const updatePurpose = (purpose: MessagingPreferencePurpose, checked: boolean) => {
    setDraft((current) => current ? {
      ...current,
      purposes: {
        ...current.purposes,
        [purpose]: checked
      }
    } : current);
  };

  const savePreferences = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await requestCourseHubApi<StudentMessagingPreferencesResponse>(
        "/api/student/messaging/preferences",
        {
          method: "PATCH",
          body: JSON.stringify({
            channels: draft.channels,
            purposes: draft.purposes
          })
        }
      );
      setPayload(response);
      setDraft(response.preferences);
      setSuccessMessage("Reminder preferences saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reminder preferences could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--label)]">Reminder preferences</p>
          <p className="break-safe mt-1 text-sm leading-6 text-[color:var(--label2)]">
            External email, WhatsApp, and SMS reminders are not enabled yet. These settings prepare
            future reminders to stay consent-aware; current reminders remain in-app and dry-run only.
          </p>
        </div>
        <Badge tone="amber">Dry-run only</Badge>
      </div>

      {isLoading ? (
        <p className="text-sm leading-6 text-[color:var(--label2)]">Loading reminder preferences...</p>
      ) : draft ? (
        <>
          <div className="rounded-[18px] border border-[color:var(--glass-border)] bg-[color:var(--surface)] p-3 text-xs leading-5 text-[color:var(--label3)]">
            {disabledContactCount > 0
              ? "No verified external contact route is available in this stage, so delivery remains fail-closed even if you opt in."
              : payload?.safeMessage}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--label3)]">Channels</p>
              {CHANNEL_OPTIONS.map((option) => (
                <ToggleRow
                  key={option.key}
                  checked={draft.channels[option.key]}
                  label={option.label}
                  detail={option.detail}
                  onChange={(checked) => updateChannel(option.key, checked)}
                />
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--label3)]">Reminder types</p>
              {PURPOSE_OPTIONS.map((option) => (
                <ToggleRow
                  key={option.key}
                  checked={draft.purposes[option.key]}
                  label={option.label}
                  detail={option.detail}
                  onChange={(checked) => updatePurpose(option.key, checked)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={savePreferences} variant="secondary" size="sm" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save preferences"}
            </Button>
            <Button onClick={loadPreferences} variant="secondary" size="sm" disabled={isSaving}>
              Refresh
            </Button>
          </div>
        </>
      ) : null}

      {successMessage ? (
        <p className="text-sm leading-6 text-[color:var(--green)]">{successMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="text-sm leading-6 text-[color:var(--red)]">{errorMessage}</p>
      ) : null}
    </GlassCard>
  );
}
