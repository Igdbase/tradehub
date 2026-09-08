import { WorkspacePageClient } from "@/app/(influencer)/workspace/workspace-page-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Workspace Billing",
  description: "Workspace package, licence, support, and billing status.",
  pathname: "/workspace/billing"
});

export default function WorkspaceBillingPage() {
  return <WorkspacePageClient activeView="billing" />;
}
