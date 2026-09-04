import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentBillingOverview } from "@/lib/billing/billing-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await getStudentBillingOverview(actor);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
