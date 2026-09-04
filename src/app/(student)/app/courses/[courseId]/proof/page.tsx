import { StudentCourseProofClient } from "@/components/student-courses/student-course-proof-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Course completion proof",
  description: "Print a safe TradeHub course completion proof from student-owned progress.",
  pathname: "/app/courses"
});

export default function StudentCourseProofPage({
  params
}: {
  params: {
    courseId: string;
  };
}) {
  return <StudentCourseProofClient courseId={params.courseId} />;
}
