import { StudentBillingClient } from "@/components/billing/student-billing-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Student Billing",
  description: "Paystack subscription and access status for the signed-in TradeHub student.",
  pathname: "/app/billing"
});

export default function StudentBillingPage() {
  return <StudentBillingClient />;
}
