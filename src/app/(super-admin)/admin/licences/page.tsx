import { AdminPageClient } from "@/app/(super-admin)/admin/admin-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Admin Licences",
  description: "Focused Super Admin package licence and maintenance review.",
  pathname: "/admin/licences"
});

export default function AdminLicencesPage() {
  return <AdminPageClient activeView="licences" />;
}
