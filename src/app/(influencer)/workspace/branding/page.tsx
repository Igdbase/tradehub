import { WorkspacePageClient } from "@/app/(influencer)/workspace/workspace-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Branding",
  description: "Workspace brand and domain readiness.",
  pathname: "/workspace/branding"
});

export default function WorkspaceBrandingPage() {
  return <WorkspacePageClient activeView="branding" />;
}
