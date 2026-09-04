import { StudentCourseListClient } from "@/components/student-courses/student-course-list-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Student Courses",
  description: "Published TradeHub courses for the signed-in student workspace.",
  pathname: "/app/courses"
});

export default function StudentCoursesPage() {
  return <StudentCourseListClient />;
}
