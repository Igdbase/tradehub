import { StudentAppPageClient } from "@/app/(student)/app/student-app-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Student App",
  description: "Live TradeHub student home for courses, signals, copier status, and journal summary.",
  pathname: "/app"
});

export default function StudentAppPage() {
  return <StudentAppPageClient />;
}
