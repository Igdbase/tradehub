import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { buildMetadata } from "@/config/app";
import { formatCurrencyNgn, getJoinWorkspaceContext } from "@/lib/mock-selectors";
import { normalizeWorkspaceHandle } from "@/lib/workspace-resolution";

type JoinPageProps = {
  params: {
    handle: string;
  };
};

function formatHandle(handle: string) {
  return handle
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function generateMetadata({ params }: JoinPageProps): Metadata {
  const handle = normalizeWorkspaceHandle(params.handle);

  return buildMetadata({
    title: `Join ${formatHandle(handle)}`,
    description: `Student invite route for the ${handle} workspace.`,
    pathname: `/join/${handle}`
  });
}

export default function JoinHandlePage({ params }: JoinPageProps) {
  const handle = normalizeWorkspaceHandle(params.handle);
  const context = getJoinWorkspaceContext(handle);

  if (!context) {
    notFound();
  }

  const { workspace, activeSubscribers, revenueByTier } = context;
  const workspaceName = workspace.name;
  const lowestTier = workspace.tiers.reduce((lowest, tier) =>
    tier.priceNgn < lowest.priceNgn ? tier : lowest
  );
  const highestTier = workspace.tiers.reduce((highest, tier) =>
    tier.priceNgn > highest.priceNgn ? tier : highest
  );

  return (
    <PlaceholderPage
      eyebrow="Invite Link Surface"
      title={`Students enter ${workspaceName} through a handle-scoped join flow.`}
      description={`${workspace.summary} This route stays student-facing and handle-aware while the influencer application flow now lives on the landing page at /. Prompt 05 still owns the real auth and redirect logic.`}
      metrics={[
        { label: "Workspace", value: `@${workspace.handle}`, tone: "accent" },
        { label: "Subscribers", value: String(activeSubscribers), tone: "green" },
        { label: "Auth", value: "Prompt 05", tone: "amber" }
      ]}
      highlightsTitle="What this route already knows"
      highlights={[
        {
          title: "Clean workspace assignment",
          body: "Students do not choose a workspace manually. The invite path now resolves tenant context from typed mock workspace data before account creation."
        },
        {
          title: "Real pricing context",
          body: `${workspace.tiers.length} workspace tiers are available, ranging from ${formatCurrencyNgn(lowestTier.priceNgn)} to ${formatCurrencyNgn(highestTier.priceNgn)}.`
        },
        {
          title: "Role-safe onboarding",
          body: `${Object.keys(revenueByTier).join(", ")} tiers can later route students into either Signal Alerts or Auto-Copy-eligible experiences without mixing them into the influencer dashboard.`
        }
      ]}
      roadmapTitle="Next route work"
      roadmap={[
        {
          label: "Prompt 04",
          prompt: "Landing and Application",
          detail:
            "Shipped. The public landing page now collects influencer applications without changing this student invite route."
        },
        {
          label: "Prompt 05",
          prompt: "Auth and Routing",
          detail:
            "Attach Firebase Auth, invite lookup, and workspace resolution while keeping Super Admin data protected server-side."
        },
        {
          label: "Prompt 07",
          prompt: "Onboarding Wizard",
          detail:
            "Influencer setup will populate branding, tiers, and compliance settings that this student entry path eventually consumes."
        }
      ]}
      asideTitle="Current Stage"
      asideBody="This is still intentionally pre-auth, but it no longer hardcodes display values. The route is now pulling handle-aware branding, tier, and payment-rail context from the Stage 03 mock domain."
      ctaHref="/app"
      ctaLabel="Preview student shell"
    />
  );
}
