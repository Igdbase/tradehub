import { AdminPageClient } from "@/app/(super-admin)/admin/admin-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Super Admin",
  description: "Focused Super Admin overview for platform attention, demo posture, and safe next actions.",
  pathname: "/admin"
});

export default function AdminPage() {
  return <AdminPageClient />;
}
