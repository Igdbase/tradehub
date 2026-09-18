import { AdminPageClient } from "@/app/(super-admin)/admin/admin-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Admin Audit",
  description: "Focused Super Admin trust, safety, and masked audit review.",
  pathname: "/admin/audit"
});

export default function AdminAuditPage() {
  return <AdminPageClient activeView="audit" />;
}
