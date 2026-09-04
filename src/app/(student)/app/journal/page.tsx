import { StudentJournalClient } from "@/components/student-app/student-journal-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Student Journal",
  description: "Student journal summary and privacy-aware TradeHub shell.",
  pathname: "/app/journal"
});

export default function StudentJournalPage() {
  return <StudentJournalClient />;
}
