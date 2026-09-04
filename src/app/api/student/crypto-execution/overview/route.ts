import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await getStudentCryptoExecutionOverview(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
