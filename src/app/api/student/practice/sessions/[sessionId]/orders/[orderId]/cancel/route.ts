import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { cancelStudentPracticeOrder } from "@/lib/practice/practice-repository";

type StudentPracticeOrderCancelRouteContext = {
  params: {
    sessionId: string;
    orderId: string;
  };
};

export async function POST(request: Request, context: StudentPracticeOrderCancelRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await cancelStudentPracticeOrder(actor, context.params.sessionId, context.params.orderId));
  } catch (error) {
    return apiError(error);
  }
}
