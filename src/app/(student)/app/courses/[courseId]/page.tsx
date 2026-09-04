import { StudentCourseReaderClient } from "@/components/student-courses/student-course-reader-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Course Reader",
  description: "TradeHub student lesson reader with safe YouTube embeds and milestone progress.",
  pathname: "/app/courses"
});

export default function StudentCourseReaderPage({
  params
}: {
  params: {
    courseId: string;
  };
}) {
  return <StudentCourseReaderClient courseId={params.courseId} />;
}
