import { StudentCopierClient } from "@/components/student-app/student-copier-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Student Copier",
  description: "Student Trade Copier purchase and Crypto or Forex account setup.",
  pathname: "/app/copier"
});

export default function StudentCopierPage() {
  return <StudentCopierClient />;
}
