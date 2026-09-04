"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fieldClasses, StepHeader } from "@/components/onboarding/step-utils";
import type { FirstCourseDraftPayload, WorkspaceCourseDraft } from "@/types/onboarding";
import type { Workspace } from "@/types/workspace";

export function FirstCourseStep({
  workspace,
  courseDraft,
  saving,
  onSave
}: {
  workspace: Workspace;
  courseDraft: WorkspaceCourseDraft | null;
  saving: boolean;
  onSave: (payload: FirstCourseDraftPayload) => Promise<void>;
}) {
  const [title, setTitle] = useState(courseDraft?.title ?? "");
  const [description, setDescription] = useState(courseDraft?.description ?? "");
  const [accessTier, setAccessTier] = useState(courseDraft?.accessTier ?? "all");
  const [sections, setSections] = useState(
    courseDraft?.sections.map((section) => section.title).join("\n") ??
      "Foundation and risk setup\nMarket structure and execution plan"
  );

  useEffect(() => {
    setTitle(courseDraft?.title ?? "");
    setDescription(courseDraft?.description ?? "");
    setAccessTier(courseDraft?.accessTier ?? "all");
    setSections(
      courseDraft?.sections.map((section) => section.title).join("\n") ??
        "Foundation and risk setup\nMarket structure and execution plan"
    );
  }, [courseDraft]);

  return (
    <GlassCard className="space-y-6">
      <StepHeader eyebrow="Step 7" title="First course draft" tone="green">
        Create one unpublished course shell so students land on structure, not an empty workspace.
        Lesson media, publishing, and full Course Hub tooling come later.
      </StepHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Course title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClasses} w-full`}
            placeholder={`${workspace.name} foundations`}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Access tier</span>
          <select
            value={accessTier}
            onChange={(event) => setAccessTier(event.target.value)}
            className={`${fieldClasses} w-full`}
          >
            <option value="all">All tiers</option>
            {workspace.tiers.map((tier) => (
              <option key={tier.tierId} value={tier.tierId}>
                {tier.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-[color:var(--label)]">Short description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${fieldClasses} min-h-[7rem] w-full`}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-[color:var(--label)]">
            Section titles, one per line
          </span>
          <textarea
            value={sections}
            onChange={(event) => setSections(event.target.value)}
            className={`${fieldClasses} min-h-[8rem] w-full`}
          />
          <span className="text-xs leading-5 text-[color:var(--label3)]">
            Add 2 to 5 sections. Do not add lesson links in this stage.
          </span>
        </label>
      </div>

      <Button
        onClick={() =>
          onSave({
            title,
            description,
            accessTier,
            sections: sections
              .split("\n")
              .map((section) => section.trim())
              .filter(Boolean)
          })
        }
        variant="primary"
        disabled={saving}
      >
        {saving ? "Saving..." : "Save draft course"}
      </Button>
    </GlassCard>
  );
}
