import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { finishStudentPracticeSession } from "@/lib/practice/practice-repository";

type StudentPracticeSessionFinishRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function POST(request: Request, context: StudentPracticeSessionFinishRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await finishStudentPracticeSession(actor, context.params.sessionId));
  } catch (error) {
    return apiError(error);
  }
}
