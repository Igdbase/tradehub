import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { listStudentPracticeAssignments } from "@/lib/practice/practice-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await listStudentPracticeAssignments(actor));
  } catch (error) {
    return apiError(error);
  }
}
