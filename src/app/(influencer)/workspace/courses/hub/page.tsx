import { CourseListClient } from "@/components/course-hub/course-list-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Course Hub",
  description: "Influencer Course Hub for draft and published TradeHub lessons.",
  pathname: "/workspace/courses/hub"
});

export default function WorkspaceCourseHubPage() {
  return <CourseListClient />;
}
