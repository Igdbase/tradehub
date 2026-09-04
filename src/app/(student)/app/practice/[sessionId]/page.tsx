import { StudentPracticeReplayClient } from "@/components/student-app/student-practice-replay-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Practice Replay",
  description: "Student chart replay shell with server-bounded candle reveal.",
  pathname: "/app/practice"
});

type StudentPracticeReplayPageProps = {
  params: {
    sessionId: string;
  };
};

export default function StudentPracticeReplayPage({ params }: StudentPracticeReplayPageProps) {
  return <StudentPracticeReplayClient sessionId={params.sessionId} />;
}
