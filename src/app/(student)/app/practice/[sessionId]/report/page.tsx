import { StudentPracticeReportClient } from "@/components/student-app/student-practice-report-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Practice Session Report",
  description: "Browser-printable student practice report built from simulated practice data only.",
  pathname: "/app/practice"
});

type StudentPracticeReportPageProps = {
  params: {
    sessionId: string;
  };
};

export default function StudentPracticeReportPage({ params }: StudentPracticeReportPageProps) {
  return <StudentPracticeReportClient sessionId={params.sessionId} />;
}
