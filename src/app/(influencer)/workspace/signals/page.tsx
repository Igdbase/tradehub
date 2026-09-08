import { WorkspacePageClient } from "@/app/(influencer)/workspace/workspace-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Signals",
  description: "Focused signal management and approved preview publication for the influencer workspace.",
  pathname: "/workspace/signals"
});

export default function WorkspaceSignalsPage() {
  return <WorkspacePageClient activeView="signals" />;
}
