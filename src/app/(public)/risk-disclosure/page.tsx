import { PolicyPage } from "@/components/ui/policy-page";
import { buildMetadata } from "@/config/app";
import { policySections } from "@/lib/routes";

export const metadata = buildMetadata({
  title: "Risk Disclosure",
  description:
    "TradeHub risk disclosure for courses, signals, journal insights, funded-account posture, and optional Solana checkout.",
  pathname: "/risk-disclosure"
});

export default function RiskDisclosurePage() {
  return (
    <PolicyPage
      eyebrow="Risk disclosure"
      title="Trading education, signals, and optional crypto checkout carry real risk."
      summary="TradeHub helps educators deliver a serious product, but it does not remove market risk, execution risk, payment-rail risk, or the stricter posture required for prop-firm and funded-account students."
      sections={policySections.risk}
      note="This route intentionally stays product-honest: courses, journal summaries, signals, and optional Solana / USDC checkout are part of the MVP, but none of them are framed as guaranteed outcomes or universal execution rights."
    />
  );
}
