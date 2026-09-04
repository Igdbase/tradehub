import { CourseEditorClient } from "@/components/course-hub/course-editor-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Course Editor",
  description: "Edit TradeHub course sections, lessons, YouTube IDs, notes, and publish state.",
  pathname: "/workspace/courses"
});

export default function WorkspaceCourseEditorPage({
  params
}: {
  params: {
    courseId: string;
  };
}) {
  return <CourseEditorClient courseId={params.courseId} />;
}
