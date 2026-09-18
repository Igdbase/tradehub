import { AdminPageClient } from "@/app/(super-admin)/admin/admin-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Admin Workspaces",
  description: "Focused Super Admin workspace application and shell review.",
  pathname: "/admin/workspaces"
});

export default function AdminWorkspacesPage() {
  return <AdminPageClient activeView="workspaces" />;
}
