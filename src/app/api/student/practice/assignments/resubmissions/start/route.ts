import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { startStudentPracticeAssignmentResubmission } from "@/lib/practice/practice-repository";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await startStudentPracticeAssignmentResubmission(actor, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
