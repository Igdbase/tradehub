import { PolicyPage } from "@/components/ui/policy-page";
import { buildMetadata } from "@/config/app";
import { policySections } from "@/lib/routes";

export const metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "TradeHub terms covering workspace access, subscriptions, billing rails, suspensions, and acceptable use.",
  pathname: "/terms"
});

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Terms of service"
      title="TradeHub access, subscriptions, and workspace use."
      summary="These terms describe how TradeHub handles verified access, educator workspaces, paid student entry, billing review, suspensions, and core acceptable-use boundaries in the current MVP."
      sections={policySections.terms}
      note="This page reflects the MVP that exists now: protected role-based access, educator workspaces, Paystack-first subscriptions, optional reviewed Solana checkout, and manual operator intervention where billing or safety issues arise."
    />
  );
}
