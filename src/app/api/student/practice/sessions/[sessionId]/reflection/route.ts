import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { updateStudentPracticeSessionReflection } from "@/lib/practice/practice-repository";

type StudentPracticeSessionReflectionRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function PATCH(request: Request, context: StudentPracticeSessionReflectionRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentPracticeSessionReflection(actor, context.params.sessionId, payload));
  } catch (error) {
    return apiError(error);
  }
}
