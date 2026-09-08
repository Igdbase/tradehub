import { WorkspacePageClient } from "@/app/(influencer)/workspace/workspace-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Students",
  description: "Focused student management for the influencer workspace.",
  pathname: "/workspace/students"
});

export default function WorkspaceStudentsPage() {
  return <WorkspacePageClient activeView="students" />;
}
