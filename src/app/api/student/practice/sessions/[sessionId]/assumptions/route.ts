import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { updateStudentPracticeSessionAssumptions } from "@/lib/practice/practice-repository";

type StudentPracticeAssumptionsRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function PATCH(request: Request, context: StudentPracticeAssumptionsRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentPracticeSessionAssumptions(actor, context.params.sessionId, payload));
  } catch (error) {
    return apiError(error);
  }
}
