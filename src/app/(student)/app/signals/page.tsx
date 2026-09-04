import { StudentSignalsClient } from "@/components/student-app/student-signals-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Student Signals",
  description: "Published TradeHub signals for the signed-in student workspace.",
  pathname: "/app/signals"
});

export default function StudentSignalsPage() {
  return <StudentSignalsClient />;
}
