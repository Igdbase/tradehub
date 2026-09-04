import { buildMetadata } from "@/config/app";
import { AccessPendingPageClient } from "@/app/(public)/access-pending/access-pending-page-client";

export const metadata = buildMetadata({
  title: "Access Pending",
  description: "TradeHub account exists, but role or workspace claims still need activation.",
  pathname: "/access-pending"
});

export default function AccessPendingPage() {
  return <AccessPendingPageClient />;
}
