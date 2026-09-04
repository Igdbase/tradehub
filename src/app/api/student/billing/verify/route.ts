import { apiError, apiJson } from "@/lib/admin/admin-api";
import { verifyStudentBillingReference } from "@/lib/billing/billing-repository";
import { parseReferenceParam } from "@/lib/billing/billing-validation";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const reference = parseReferenceParam(request);
    const response = await verifyStudentBillingReference(actor, reference);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
