import { WorkspacePageClient } from "@/app/(influencer)/workspace/workspace-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Courses",
  description: "Focused course visibility and authoring navigation for the influencer workspace.",
  pathname: "/workspace/courses"
});

export default function WorkspaceCoursesPage() {
  return <WorkspacePageClient activeView="courses" />;
}
