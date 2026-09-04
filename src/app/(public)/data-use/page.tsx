import { PolicyPage } from "@/components/ui/policy-page";
import { buildMetadata } from "@/config/app";
import { policySections } from "@/lib/routes";

export const metadata = buildMetadata({
  title: "Data Use",
  description:
    "TradeHub data-use notice for onboarding review, billing support, trust and safety, and summary visibility.",
  pathname: "/data-use"
});

export default function DataUsePage() {
  return (
    <PolicyPage
      eyebrow="Data use"
      title="How TradeHub uses onboarding, billing, learning, and safety data."
      summary="TradeHub uses data to vet workspaces, verify payments, maintain scoped access, support students, and keep operator review auditable. This page explains the operational reasons behind that usage."
      sections={policySections.dataUse}
      note="The MVP favors bounded summaries and protected API routes over broad scans. That means TradeHub can stay launch-ready without pretending that every role should have direct access to every underlying record."
    />
  );
}
