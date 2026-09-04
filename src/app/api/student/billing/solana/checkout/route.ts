import { apiError, apiJson } from "@/lib/admin/admin-api";
import { createStudentSolanaCheckout } from "@/lib/billing/billing-repository";
import { parseCheckoutPayload } from "@/lib/billing/billing-validation";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json().catch(() => null);
    const values = parseCheckoutPayload(payload);
    const response = await createStudentSolanaCheckout(actor, values);

    return apiJson(response, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
