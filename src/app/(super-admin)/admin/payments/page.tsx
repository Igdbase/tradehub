import { AdminPageClient } from "@/app/(super-admin)/admin/admin-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Admin Payments",
  description: "Focused Super Admin payment support and settlement review.",
  pathname: "/admin/payments"
});

export default function AdminPaymentsPage() {
  return <AdminPageClient activeView="payments" />;
}
