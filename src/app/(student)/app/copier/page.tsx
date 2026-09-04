import { StudentCopierClient } from "@/components/student-app/student-copier-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Student Copier",
  description: "Student Binance and Bybit crypto execution setup with prop-firm-safe gating.",
  pathname: "/app/copier"
});

export default function StudentCopierPage() {
  return <StudentCopierClient />;
}
