import { AdminPageClient } from "@/app/(super-admin)/admin/admin-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Admin Integrations",
  description: "Focused Super Admin branding, Enterprise, and signal-ingestion review.",
  pathname: "/admin/integrations"
});

export default function AdminIntegrationsPage() {
  return <AdminPageClient activeView="integrations" />;
}
