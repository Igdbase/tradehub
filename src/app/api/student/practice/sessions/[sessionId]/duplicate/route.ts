import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { duplicateStudentPracticeSession } from "@/lib/practice/practice-repository";

export async function POST(request: Request, context: { params: { sessionId: string } }) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await duplicateStudentPracticeSession(actor, context.params.sessionId), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
