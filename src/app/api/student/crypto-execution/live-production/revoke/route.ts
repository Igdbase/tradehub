import { apiError, apiJson } from "@/lib/admin/admin-api";
import { updateStudentLiveProductionConsent } from "@/lib/crypto-execution/crypto-execution-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await updateStudentLiveProductionConsent(actor, "revoke");

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
