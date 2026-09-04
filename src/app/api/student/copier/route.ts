import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { getStudentCopier } from "@/lib/student-app/student-app-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await getStudentCopier(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
