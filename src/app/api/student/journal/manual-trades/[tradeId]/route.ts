import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  archiveStudentManualTrade,
  updateStudentManualTrade
} from "@/lib/journal/manual-trades-repository";

type RouteContext = {
  params: {
    tradeId: string;
  };
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentManualTrade(actor, context.params.tradeId, payload));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await archiveStudentManualTrade(actor, context.params.tradeId));
  } catch (error) {
    return apiError(error);
  }
}
