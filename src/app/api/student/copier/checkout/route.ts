import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { createStudentTradeCopierCheckout } from "@/lib/student-copier/student-copier-billing";
import type { StudentCopierCheckoutStartResponse } from "@/types/student-copier";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await createStudentTradeCopierCheckout(actor);
    const payload: StudentCopierCheckoutStartResponse = {
      ok: true,
      authorizationUrl: response.checkout.authorizationUrl
    };

    return apiJson(payload, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
