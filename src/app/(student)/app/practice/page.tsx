import { StudentPracticeClient } from "@/components/student-app/student-practice-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Practice Backtesting",
  description: "Student practice and backtesting data foundation without chart replay or live execution.",
  pathname: "/app/practice"
});

export default function StudentPracticePage() {
  return <StudentPracticeClient />;
}
