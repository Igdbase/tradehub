import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { getStudentManualTradeReview } from "@/lib/journal/manual-trades-repository";

type RouteContext = {
  params: {
    tradeId: string;
  };
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await getStudentManualTradeReview(actor, context.params.tradeId));
  } catch (error) {
    return apiError(error);
  }
}
