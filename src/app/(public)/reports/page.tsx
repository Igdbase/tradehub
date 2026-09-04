import type { Metadata } from "next";
import { ReportsAdminClient } from "@/components/reports/reports-admin-client";

export const metadata: Metadata = {
  title: "Reports | TradeHub",
  description: "Report sharing operations for released parent report links."
};

export default function ReportsPage() {
  return <ReportsAdminClient />;
}
