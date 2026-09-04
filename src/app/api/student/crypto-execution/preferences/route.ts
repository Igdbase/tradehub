import { apiError, apiJson } from "@/lib/admin/admin-api";
import { updateStudentCryptoExecutionPreferences } from "@/lib/crypto-execution/crypto-execution-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();
    const response = await updateStudentCryptoExecutionPreferences(actor, payload);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
