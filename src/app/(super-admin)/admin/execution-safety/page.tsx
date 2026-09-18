import { AdminPageClient } from "@/app/(super-admin)/admin/admin-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Admin Execution Safety",
  description: "Focused Super Admin AutoCopy readiness, canary, incident, and rollback review.",
  pathname: "/admin/execution-safety"
});

export default function AdminExecutionSafetyPage() {
  return <AdminPageClient activeView="execution-safety" />;
}
