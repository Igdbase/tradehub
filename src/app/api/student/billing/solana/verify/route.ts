import { apiError, apiJson } from "@/lib/admin/admin-api";
import { verifyStudentSolanaCheckout } from "@/lib/billing/billing-repository";
import { parseSolanaVerifyParams } from "@/lib/billing/billing-validation";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const params = parseSolanaVerifyParams(request);
    const response = await verifyStudentSolanaCheckout({ actor, ...params });

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
