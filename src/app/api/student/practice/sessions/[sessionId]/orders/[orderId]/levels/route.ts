import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { updateStudentPracticeOrderLevels } from "@/lib/practice/practice-repository";

type StudentPracticeOrderLevelsRouteContext = {
  params: {
    sessionId: string;
    orderId: string;
  };
};

export async function PATCH(request: Request, context: StudentPracticeOrderLevelsRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentPracticeOrderLevels(actor, context.params.sessionId, context.params.orderId, payload));
  } catch (error) {
    return apiError(error);
  }
}
