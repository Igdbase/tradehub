import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { evaluateStudentPracticeSessionOrders } from "@/lib/practice/practice-repository";

type StudentPracticeOrderEvaluationRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function POST(request: Request, context: StudentPracticeOrderEvaluationRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await evaluateStudentPracticeSessionOrders(actor, context.params.sessionId));
  } catch (error) {
    return apiError(error);
  }
}
