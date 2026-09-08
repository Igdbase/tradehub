import { WorkspacePageClient } from "@/app/(influencer)/workspace/workspace-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Copier",
  description: "Workspace-safe Trade Copier readiness summary for the influencer workspace.",
  pathname: "/workspace/copier"
});

export default function WorkspaceCopierPage() {
  return <WorkspacePageClient activeView="copier" />;
}
