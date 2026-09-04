import { WorkspacePageClient } from "@/app/(influencer)/workspace/workspace-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace",
  description: "Influencer control room for workspace revenue, students, courses, signals, and activation state.",
  pathname: "/workspace"
});

export default function WorkspacePage() {
  return <WorkspacePageClient />;
}
