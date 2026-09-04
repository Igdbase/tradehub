import { StudentPracticeTerminalClient } from "@/components/student-app/student-practice-terminal-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Practice Terminal",
  description: "TradeHub-native simulated practice terminal with server-bounded candle replay.",
  pathname: "/app/practice"
});

type StudentPracticeTerminalPageProps = {
  params: {
    sessionId: string;
  };
};

export default function StudentPracticeTerminalPage({ params }: StudentPracticeTerminalPageProps) {
  return <StudentPracticeTerminalClient sessionId={params.sessionId} />;
}
