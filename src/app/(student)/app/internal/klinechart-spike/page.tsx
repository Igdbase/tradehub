import { StudentKLineChartSpikeClient } from "@/components/student-app/student-klinechart-spike-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "KLineChart Practice Spike",
  description: "Internal TradeHub chart-library feasibility proof using revealed practice candles only.",
  pathname: "/app/internal/klinechart-spike"
});

export default function KLineChartSpikePage() {
  return <StudentKLineChartSpikeClient />;
}
