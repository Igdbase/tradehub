import { WorkspaceOnboardingPageClient } from "@/app/(influencer)/workspace/onboarding/workspace-onboarding-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Onboarding",
  description: "Guided influencer activation wizard for an approved TradeHub workspace.",
  pathname: "/workspace/onboarding"
});

export default function WorkspaceOnboardingPage() {
  return <WorkspaceOnboardingPageClient />;
}
