import { CourseListClient } from "@/components/course-hub/course-list-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Courses",
  description: "Influencer Course Hub for draft and published TradeHub lessons.",
  pathname: "/workspace/courses"
});

export default function WorkspaceCoursesPage() {
  return <CourseListClient />;
}
