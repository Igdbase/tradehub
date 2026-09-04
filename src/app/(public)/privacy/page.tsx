import { PolicyPage } from "@/components/ui/policy-page";
import { buildMetadata } from "@/config/app";
import { policySections } from "@/lib/routes";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "TradeHub privacy commitments for identity, workspace membership, payments, billing review, and journal privacy posture.",
  pathname: "/privacy"
});

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy policy"
      title="How TradeHub handles identity, membership, payments, and journal privacy."
      summary="TradeHub is designed around verified access, scoped workspaces, and private-first student data. This page explains what is collected, what operators can see, and where privacy boundaries stay explicit."
      sections={policySections.privacy}
      note="Privacy in the MVP is shaped around server-side verification, locked Firestore client rules, bounded dashboard reads, payment-support records, and student summary documents rather than open raw-data browsing."
    />
  );
}
