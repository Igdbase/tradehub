import { WorkspacePageClient } from "@/app/(influencer)/workspace/workspace-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Enterprise",
  description: "Enterprise deployment, SLA, and integration request readiness.",
  pathname: "/workspace/enterprise"
});

export default function WorkspaceEnterprisePage() {
  return <WorkspacePageClient activeView="enterprise" />;
}
