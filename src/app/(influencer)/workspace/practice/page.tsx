import { WorkspacePageClient } from "@/app/(influencer)/workspace/workspace-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Practice",
  description: "Aggregate practice insights, assignments, cohorts, and feedback for the influencer workspace.",
  pathname: "/workspace/practice"
});

export default function WorkspacePracticePage() {
  return <WorkspacePageClient activeView="practice" />;
}
