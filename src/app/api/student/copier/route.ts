import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { getStudentCopierOverview } from "@/lib/student-copier/student-copier-dto";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await getStudentCopierOverview(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
