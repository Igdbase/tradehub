import { apiError } from "@/lib/admin/admin-api";
import { AdminApiError } from "@/lib/firebase/admin-errors";

export async function POST() {
  try {
    throw new AdminApiError(
      403,
      "forex_live_canary_operator_only",
      "Production MetaAPI canary setup is operator-only. Normal students use MT4/MT5 broker setup."
    );
  } catch (error) {
    return apiError(error);
  }
}
