import { apiError, apiJson } from "@/lib/admin/admin-api";
import { updateStudentAutoCopyPreferences } from "@/lib/crypto-execution/crypto-execution-repository";
import { requireStudent } from "@/lib/firebase/student-auth";
import { mapStudentCopierOverview } from "@/lib/student-copier/student-copier-dto";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();
    const response = await updateStudentAutoCopyPreferences(actor, payload);

    return apiJson(mapStudentCopierOverview(actor, response));
  } catch (error) {
    return apiError(error);
  }
}
