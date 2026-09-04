import { AdminPageClient } from "@/app/(super-admin)/admin/admin-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Super Admin",
  description: "Stage 06 Super Admin CRM for applications, vetting, summaries, disputes, and audit visibility.",
  pathname: "/admin"
});

export default function AdminPage() {
  return <AdminPageClient />;
}
