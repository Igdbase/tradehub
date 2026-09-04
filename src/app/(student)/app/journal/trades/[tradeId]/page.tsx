import { StudentManualTradeReviewClient } from "@/components/student-app/student-manual-trade-review-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Manual Trade Review",
  description: "Private manual trade review chart and journal notes.",
  pathname: "/app/journal/trades"
});

export default function StudentManualTradeReviewPage({
  params
}: {
  params: {
    tradeId: string;
  };
}) {
  return <StudentManualTradeReviewClient tradeId={params.tradeId} />;
}
