import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { restoreStudentPracticeSession } from "@/lib/practice/practice-repository";

export async function POST(request: Request, context: { params: { sessionId: string } }) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await restoreStudentPracticeSession(actor, context.params.sessionId));
  } catch (error) {
    return apiError(error);
  }
}
